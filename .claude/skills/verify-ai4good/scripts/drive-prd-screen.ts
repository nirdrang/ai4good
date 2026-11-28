import { spawn, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { repoRoot } from './prepare-chat-page.ts';
import { preparePrd, type PreparedPrd } from './prepare-prd-screen.ts';
import { cleanupReposNamed, loadGithubTest } from '../../../../tests/at/harness/github.ts';
import { redactValue, sqlClient } from '../../../../tests/at/harness/live-stack.ts';

const outDir = resolve(repoRoot, process.argv[2] ?? `loop/verify-evidence/prd-screen-${Date.now()}`);
mkdirSync(outDir, { recursive: true });
const evidence: unknown[] = [];
const repos: string[] = [];
let app: ReturnType<typeof spawn> | null = null;

function whole(value: unknown): number {
  if (typeof value === 'bigint') return Number(value);
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && /^-?\d+$/.test(value)) return Number(value);
  throw new Error(`expected a whole number, got ${JSON.stringify(value)}`);
}

function readChecks(viewport: string): { availableBefore: number; availableAfter: number; draft: string } {
  const parsed = JSON.parse(readFileSync(join(outDir, `${viewport}-checks.json`), 'utf8')) as {
    availableBefore?: unknown;
    availableAfter?: unknown;
    draft?: unknown;
  };
  if (typeof parsed.draft !== 'string') throw new Error(`The ${viewport} drive wrote no draft.`);
  return { availableBefore: whole(parsed.availableBefore), availableAfter: whole(parsed.availableAfter), draft: parsed.draft };
}

async function providerMicros(setup: PreparedPrd): Promise<number> {
  const sql = sqlClient(setup.stack);
  try {
    const rows = await sql`select coalesce((sum(amount) filter (where input_tokens > 0) * 1000000)::bigint, 0) as micros
      from public.prd_ledger_entries where project_id = ${setup.projectId}::uuid and component = 'provider'` as { micros: unknown }[];
    return whole(rows[0]?.micros);
  } finally {
    await sql.close();
  }
}

async function discoveryCredits(setup: PreparedPrd): Promise<number> {
  const sql = sqlClient(setup.stack);
  try {
    const rows = await sql`select coalesce(sum(charged_credits), 0)::int as credits
      from public.discovery_turns where project_id = ${setup.projectId}::uuid` as { credits: unknown }[];
    return whole(rows[0]?.credits);
  } finally {
    await sql.close();
  }
}

async function verifyDesktop(setup: PreparedPrd): Promise<void> {
  const checks = readChecks('desktop');
  const sql = sqlClient(setup.stack);
  try {
    const turns = await sql`select id, state from public.prd_turns
      where project_id = ${setup.projectId}::uuid and kind = 'reply'` as { id: string; state: string }[];
    if (turns.length !== 1) throw new Error(`expected one reply turn, found ${turns.length}`);
    if (turns[0].state !== 'answered') throw new Error(`the reply turn is ${turns[0].state}`);
    const money = await sql`select
      coalesce((sum(amount) filter (where component = 'provider' and input_tokens > 0) * 1000000)::bigint, 0) as provider,
      coalesce((sum(amount) filter (where component in ('provider', 'fee')) * 1000000)::bigint, 0) as charge
      from public.prd_ledger_entries where turn_id = ${turns[0].id}::uuid` as { provider: unknown; charge: unknown }[];
    const provider = whole(money[0]?.provider);
    const charge = whole(money[0]?.charge);
    if (provider <= 0) throw new Error('the reply has no provider ledger entry with real tokens');
    const drop = checks.availableBefore - checks.availableAfter;
    if (drop !== charge) throw new Error(`available funds fell by ${drop} micros and the turn charge is ${charge}`);
    console.log('PASS desktop: the reply settled, spent real tokens, and available funds fell by the charge');
    const drafts = await sql`select body from public.prd_drafts
      where project_id = ${setup.projectId}::uuid and key = 'main'` as { body: string }[];
    if (drafts.length !== 1 || drafts[0].body !== checks.draft) throw new Error('the saved draft does not match the composer');
    console.log('PASS desktop: the draft row matches the composer');
    const closes = await sql`select revision, commit_sha, closed_anyway from public.prd_closes
      where project_id = ${setup.projectId}::uuid` as { revision: unknown; commit_sha: string; closed_anyway: boolean }[];
    if (closes.length !== 1 || closes[0].closed_anyway !== true) throw new Error('Close anyway did not record one close');
    const ops = await sql`select status, commit_sha from public.prd_git_ops
      where project_id = ${setup.projectId}::uuid and kind = 'close-tag'` as { status: string; commit_sha: string }[];
    if (ops.length !== 1 || ops[0].status !== 'published' || !closes[0].commit_sha || ops[0].commit_sha !== closes[0].commit_sha) {
      throw new Error(`the close tag is not published: ${JSON.stringify(ops)}`);
    }
    const loaded = loadGithubTest();
    if (!loaded.ok) throw new Error(loaded.reason);
    const tagged = await loaded.client.tag(setup.repoName, `prd-r${whole(closes[0].revision)}`, closes[0].commit_sha);
    if (!tagged.ok || tagged.result !== 'tagged') throw new Error(`the repository tag is missing: ${JSON.stringify(tagged)}`);
    console.log('PASS desktop: the close tag is published on the repository');
    evidence.push({
      viewport: 'desktop',
      rowsReadBack: {
        replyTurn: turns[0],
        replyMicros: { provider, charge, availableBefore: checks.availableBefore, availableAfter: checks.availableAfter },
        draft: drafts[0],
        close: { ...closes[0], revision: whole(closes[0].revision) },
        closeTag: { ...ops[0], tag: `prd-r${whole(closes[0].revision)}`, github: tagged.result },
      },
    });
  } finally {
    await sql.close();
  }
}

async function verifyPhone(setup: PreparedPrd): Promise<void> {
  const sql = sqlClient(setup.stack);
  try {
    const turns = await sql`select count(*)::int as n from public.prd_turns
      where project_id = ${setup.projectId}::uuid` as { n: unknown }[];
    const spend = await sql`select coalesce((sum(amount) filter (where input_tokens > 0) * 1000000)::bigint, 0) as micros
      from public.prd_ledger_entries where project_id = ${setup.projectId}::uuid and component = 'provider'` as { micros: unknown }[];
    if (whole(turns[0]?.n) !== 0 || whole(spend[0]?.micros) !== 0) throw new Error('the phone pass called the model');
    console.log('PASS phone: no turn and no provider tokens');
    evidence.push({ viewport: 'phone', rowsReadBack: { turns: whole(turns[0]?.n), providerMicros: whole(spend[0]?.micros) } });
  } finally {
    await sql.close();
  }
}

try {
  const desktop = await preparePrd(join(outDir, 'desktop'), repos);
  const phone = await preparePrd(join(outDir, 'phone'), repos);
  app = spawn('node', [join(repoRoot, 'node_modules/vite/bin/vite.js'), '--host', '127.0.0.1', '--port', '0'], {
    cwd: repoRoot, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env, VITE_SUPABASE_URL: desktop.stack.apiUrl, VITE_SUPABASE_PUBLISHABLE_KEY: desktop.stack.anonKey },
  });
  const baseUrl = await new Promise<string>((resolveStarted, reject) => {
    let output = '';
    const timer = setTimeout(() => reject(new Error('The app did not start within 60 seconds.')), 60_000);
    app!.on('error', (error) => { clearTimeout(timer); reject(error); });
    app!.on('exit', (code) => { clearTimeout(timer); reject(new Error(`App exited ${code}.`)); });
    const read = (chunk: Buffer) => {
      output += chunk.toString().replace(/\x1b\[[0-9;]*m/g, '');
      const url = /http:\/\/127\.0\.0\.1:\d+/.exec(output)?.[0];
      if (url) { clearTimeout(timer); resolveStarted(url); }
    };
    app!.stdout!.on('data', read);
    app!.stderr!.on('data', read);
  });
  for (const [viewport, setup] of [['desktop', desktop], ['phone', phone]] as const) {
    const run = spawnSync('node', [fileURLToPath(new URL('./drive-prd-screen.mjs', import.meta.url))], {
      cwd: repoRoot, windowsHide: true, encoding: 'utf8', timeout: 600_000,
      input: JSON.stringify({
        viewport, baseUrl, outDir,
        apiUrl: setup.stack.apiUrl,
        anonKey: setup.stack.anonKey,
        organizationId: setup.organizationId,
        projectId: setup.projectId,
        ngo: { email: setup.email, password: setup.password },
        dev: { email: setup.devEmail, password: setup.devPassword },
      }),
    });
    const stdout = (run.stdout ?? '').replaceAll(setup.password, '[REDACTED]').replaceAll(setup.devPassword, '[REDACTED]');
    const stderr = (run.stderr ?? '').replaceAll(setup.password, '[REDACTED]').replaceAll(setup.devPassword, '[REDACTED]');
    const httpFile = join(outDir, `${viewport}-http.json`);
    const http = existsSync(httpFile) ? JSON.parse(readFileSync(httpFile, 'utf8')) as unknown : null;
    evidence.push({ viewport, exit: run.status, stdout, stderr, http });
    console.log(stdout);
    if (run.status !== 0) throw new Error(`The ${viewport} screen drive failed: ${stderr}`);
    if (viewport === 'desktop') await verifyDesktop(setup);
    else await verifyPhone(setup);
  }
  const prdMicros = await providerMicros(desktop) + await providerMicros(phone);
  const credits = await discoveryCredits(desktop) + await discoveryCredits(phone);
  console.log(`PRD provider spend: ${prdMicros} micros`);
  console.log(`Discovery credits used: ${credits}`);
  evidence.push({ prdProviderMicros: prdMicros, discoveryCredits: credits });
  if (prdMicros > 250_000) throw new Error(`PRD provider spend ${prdMicros} micros passed 250000`);
} catch (error) {
  evidence.push({ error: error instanceof Error ? error.message : String(error) });
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
} finally {
  app?.kill();
  try {
    await cleanupReposNamed(repos);
  } catch (error) {
    evidence.push({ cleanupError: error instanceof Error ? error.message : String(error) });
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
  writeFileSync(join(outDir, 'transcript.json'), JSON.stringify(redactValue(evidence), null, 2));
}
