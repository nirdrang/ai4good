import { spawn, spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { prepareDiscovery, repoRoot } from './prepare-chat-page.ts';
import { redactValue, sqlClient } from '../../../../tests/at/harness/live-stack.ts';

const outDir = resolve(repoRoot, process.argv[2] ?? `loop/verify-evidence/discovery-screen-${Date.now()}`);
mkdirSync(outDir, { recursive: true });
const evidence: unknown[] = [];
let app: ReturnType<typeof spawn> | null = null;
try {
  const desktop = await prepareDiscovery(join(outDir, 'desktop'));
  const phone = await prepareDiscovery(join(outDir, 'phone'));
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
    const run = spawnSync('node', [fileURLToPath(new URL('./drive-discovery-screen.mjs', import.meta.url))], {
      cwd: repoRoot, windowsHide: true, encoding: 'utf8', timeout: 600_000,
      input: JSON.stringify({ ...setup, viewport, baseUrl, outDir }),
    });
    const stdout = run.stdout.replaceAll(setup.password, '[REDACTED]');
    const stderr = run.stderr.replaceAll(setup.password, '[REDACTED]');
    evidence.push({ viewport, exitCode: run.status, stdout, stderr });
    console.log(stdout);
    if (run.status !== 0) throw new Error(`The ${viewport} screen drive failed: ${stderr}`);
    const sql = sqlClient(setup.stack);
    try {
      const rows = await sql`select document from public.brief_revisions where project_id = ${setup.projectId}::uuid order by revision desc limit 1` as { document: { fileFacts?: unknown[] } }[];
      if (!rows[0]?.document.fileFacts?.length) throw new Error('The file facts did not reach the stored brief.');
      console.log(`PASS ${viewport}: file facts saved in the brief`);
    } finally { await sql.close(); }
  }
} catch (error) {
  evidence.push({ error: error instanceof Error ? error.message : String(error) });
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
} finally {
  app?.kill();
  writeFileSync(join(outDir, 'transcript.json'), JSON.stringify(redactValue(evidence), null, 2));
}
