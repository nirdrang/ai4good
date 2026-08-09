/**
 * THE LOCAL PROOF for AI4DEV-60 — the only evidence in this item about the real Supabase Auth's
 * session layer: what a wrong password answers, what logging out does to a live access token, what
 * happens at and after the access token's expiry, whether a refresh re-establishes access with no
 * credentials, and what the emailed password-reset flow really looks like on this stack.
 *
 * IT RUNS IN TWO PHASES, because one of the checks needs a different `jwt_expiry` and a stack
 * restart, and a script that edited configuration and restarted a stack behind the operator's back
 * would make its own transcript unreadable (the predecessor's reasoning, kept):
 *
 *   bun loop/items/AI4DEV-60/proof-local.ts       — checks (a), (b), (c), (e), (f), (g)
 *   bun loop/items/AI4DEV-60/proof-local.ts d     — check (d) only, against a LOWERED jwt_expiry
 *
 * Preconditions, and the script refuses rather than guesses if any is missing:
 *   1. `bun run db:start` — the stack is up, WITH this item's `supabase/config.toml`.
 *   2. `bun run db:reset` — run it before the main phase. Some checks read row counts.
 *   3. `bunx supabase functions serve` — running, FROM THIS WORKTREE, WITHOUT --no-verify-jwt.
 *      The directory matters and is not pedantry: the edge runtime container mounts whichever
 *      project directory launched it, and this machine was once found serving a worktree that had
 *      since been deleted. THIS ITEM IS THE FIRST FOR WHICH THE MOUNT'S REVISION IS LOAD-BEARING:
 *      the branch changes `_shared/edge.ts`, which both deployed functions run on every
 *      authenticated request. A stale mount would answer the reachability probe below perfectly
 *      while running the pre-refactor judgement. `loop/items/AI4DEV-60/stack-up.txt` records the
 *      serve command, its working directory, its process id and its process command line, which is
 *      what binds the running binary to this worktree.
 *   4. For phase `d` only: `jwt_expiry` lowered in `supabase/config.toml` and the stack restarted,
 *      so the auth container really carries the lowered value. The check MEASURES the container's
 *      GOTRUE_JWT_EXP and fails if the restart did not take.
 *
 * IT LIVES IN THE ITEM RECORD AND NOT IN `tests/`, deliberately: it is evidence-gathering. It runs
 * once, on one machine, by hand, and its transcript is the artifact. Under `tests/` it would look
 * like something that guards the tree, and it guards nothing — nothing runs it again and continuous
 * integration has no database.
 *
 * WHAT THE LOOP-TIER SUITE ALREADY PROVES, so this does not duplicate it: that the shipped
 * `callerFromAuthAnswer` fails closed for every malformed answer shape
 * (`tests/at/harness/shipped-caller.selftest.ts`), and that a fixture whose session store mirrors
 * `jwt_expiry`, logout and refresh satisfies AT-001.12, .13, .14 and .38. WHAT NOTHING BUT THIS
 * SCRIPT TOUCHES: whether Supabase Auth really behaves the way that mirror predicts.
 *
 * NO KEY IS WRITTEN INTO THIS FILE AND NONE IS PRINTED BY IT. Everything is read from
 * `bunx supabase status -o json` at run time. Redaction is DESIGNED IN rather than applied
 * afterwards, and the three surfaces are the predecessor's, carried over unchanged because two
 * blind reviewers hardened them there:
 *
 *   1. BODIES. `redact()` walks every object body before it reaches the transcript and replaces the
 *      value under any credential-shaped key name.
 *   2. STRINGS, including a body that is not JSON at all. `redact()` also scrubs JWT-shaped
 *      substrings and `name=value` pairs whose name is credential-shaped.
 *   3. THE REDIRECT LOCATION. `redactedLocation()` cuts the URL fragment — that fragment is where
 *      GoTrue puts the access token it mints when a link is followed — AND replaces EVERY
 *      query-parameter VALUE, keeping the parameter names.
 *
 * AND THE CREDENTIAL GUARD IS WIDENED, per the predecessor's [L3]: a check that says "the refusal
 * carried no token" asserts the ABSENCE of `access_token`, `refresh_token` AND `session`, rather
 * than of an access token alone.
 *
 * GitHub push protection has already refused one push in this project for a transcript that
 * captured a status command verbatim. The transcript is ALSO inspected for credential residue by
 * hand before it is committed; that inspection is recorded in the item's report.
 */

import { readFileSync } from 'node:fs';
import { SQL } from 'bun';
// The stub import fixture, for the volunteer completion read-back in (g) — the same reason both
// predecessors import it: comparing the stored profile against the shipped judgement shows the
// values travelled from the edge function into the transaction unchanged, where "the row is
// non-empty" would pass over plausible-looking rubbish.
import { stubGithubStatsFor } from '../../../supabase/functions/_shared/github.ts';

/** Which phase this invocation is. `d` needs a lowered `jwt_expiry`; everything else does not. */
const PHASE: 'main' | 'd' = process.argv[2] === 'd' ? 'd' : 'main';

/* ------------------------------------------------------------------------ reporting machinery */

type Outcome = 'pass' | 'fail' | 'skip';
type Check = { id: string; title: string; outcome: Outcome; note: string };

const results: Check[] = [];

function record(id: string, title: string, passed: boolean, note: string): void {
  results.push({ id, title, outcome: passed ? 'pass' : 'fail', note });
  console.log(`${passed ? 'PASS' : 'FAIL'}  (${id}) ${title}\n        ${note}`);
}

/**
 * A check that could not be attempted. Never a pass and never a failure — a skip says the evidence
 * is MISSING, which is a different statement from the claim being false, and both differ from the
 * claim being proved.
 */
function skip(id: string, title: string, why: string): void {
  results.push({ id, title, outcome: 'skip', note: `SKIPPED — ${why}` });
  console.log(`SKIP  (${id}) ${title}\n        ${why}`);
}

function fail(message: string): never {
  console.error(`\nPRECONDITION FAILED: ${message}`);
  process.exit(2);
}

const SENSITIVE = /token|secret|password|apikey|api_key|jwt|nonce|otp|code$/i;

function scrubString(text: string): string {
  return text
    .replace(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g, '<redacted-jwt>')
    .replace(/([A-Za-z0-9_.-]+)=([^&\s"'<>]+)/g, (whole, name: string) =>
      SENSITIVE.test(name) ? `${name}=<redacted>` : whole,
    );
}

function redact(value: unknown): string {
  const walk = (node: unknown): unknown => {
    if (Array.isArray(node)) return node.map(walk);
    if (node !== null && typeof node === 'object') {
      const out: Record<string, unknown> = {};
      for (const [key, inner] of Object.entries(node as Record<string, unknown>)) {
        out[key] = SENSITIVE.test(key) ? '<redacted>' : walk(inner);
      }
      return out;
    }
    if (typeof node === 'string') return scrubString(node);
    return node;
  };
  try {
    return JSON.stringify(walk(value));
  } catch {
    return '<unserialisable>';
  }
}

function redactedLocation(url: string): string {
  if (url === '') return '';
  const hash = url.indexOf('#');
  const fragmentNote = hash < 0 ? '' : '#<redacted-fragment>';
  const withoutHash = hash < 0 ? url : url.slice(0, hash);

  const question = withoutHash.indexOf('?');
  if (question < 0) return `${withoutHash}${fragmentNote}`;

  const query = withoutHash
    .slice(question + 1)
    .split('&')
    .map((pair) => {
      const equals = pair.indexOf('=');
      return equals < 0 ? pair : `${pair.slice(0, equals)}=<redacted>`;
    })
    .join('&');
  return `${withoutHash.slice(0, question)}?${query}${fragmentNote}`;
}

/**
 * WHICH CREDENTIAL-BEARING FIELDS A BODY CARRIES — the widened guard, stated as a list rather than
 * as "no access token".
 *
 * A refusal that carried a refresh token or a whole `session` object while carrying no
 * `access_token` would pass the narrow reading and be exactly as wrong. The names are returned so
 * the transcript can say WHICH field was present rather than only that something was.
 */
function credentialFieldsIn(body: unknown): string[] {
  if (body === null || typeof body !== 'object') return [];
  const record_ = body as Record<string, unknown>;
  return ['access_token', 'refresh_token', 'session', 'provider_token', 'provider_refresh_token']
    .filter((name) => record_[name] !== undefined && record_[name] !== null);
}

/* --------------------------------------------------------------------------- the environment */

const status = await (async () => {
  const proc = Bun.spawnSync(['bunx', 'supabase', 'status', '-o', 'json'], { stdout: 'pipe', stderr: 'pipe' });
  const text = new TextDecoder().decode(proc.stdout);
  const start = text.indexOf('{');
  // The raw text is NOT included in this message, deliberately: it is the whole status payload and
  // it carries key material. A failure here says what to do, not what it read.
  if (start < 0) fail('could not read `supabase status -o json` — is the stack up? (bun run db:start)');
  return JSON.parse(text.slice(start)) as Record<string, string>;
})();

const API_URL = status.API_URL ?? fail('supabase status reported no API_URL');
const DB_URL = status.DB_URL ?? fail('supabase status reported no DB_URL');
/** The browser's key. Everything a signed-out or signed-in visitor could do uses this and no other. */
const PUBLIC_KEY = status.ANON_KEY ?? status.PUBLISHABLE_KEY ?? fail('supabase status reported no client key');
/** The server's key. Used ONLY where the check is about an authority the public never holds. */
const SECRET_KEY = status.SERVICE_ROLE_KEY ?? status.SECRET_KEY ?? fail('supabase status reported no service key');
const MAIL_URL = status.MAILPIT_URL ?? status.INBUCKET_URL ?? 'http://127.0.0.1:54324';

const sql = new SQL(DB_URL);

const TEXT_VERSION = 'tos-2026-01+promise-2026-01';
const PASSWORD = 'correct horse battery staple';
const NEW_PASSWORD = 'a different correct horse battery staple';
const CLIENT_IP = '203.0.113.7';
const VOLUNTEER_HANDLE = 'octosessions';
/** Unique per run, so a second run against a database that was not reset still reads honestly. */
const RUN = Date.now().toString(36);
const address = (local: string) => `${local}+${RUN}@example.test`;

/** `jwt_expiry` as the checked-in file states it, read rather than remembered. */
const CONFIGURED_JWT_EXPIRY = (() => {
  try {
    const toml = readFileSync(new URL('../../../supabase/config.toml', import.meta.url), 'utf8');
    return /^\s*jwt_expiry\s*=\s*(\d+)/m.exec(toml)?.[1] ?? '<not found>';
  } catch {
    return '<unreadable>';
  }
})();

const CONFIGURED_EMAIL_RATE_LIMIT = (() => {
  try {
    const toml = readFileSync(new URL('../../../supabase/config.toml', import.meta.url), 'utf8');
    return /^\s*email_sent\s*=\s*(\d+)/m.exec(toml)?.[1] ?? '<not found>';
  } catch {
    return '<unreadable>';
  }
})();

/** What the auth CONTAINER carries, which is the value that actually binds. */
function containerEnv(name: string): string {
  const proc = Bun.spawnSync(
    ['docker', 'inspect', 'supabase_auth_poancmeitlmxejofwzuu', '--format', '{{range .Config.Env}}{{println .}}{{end}}'],
    { stdout: 'pipe', stderr: 'pipe' },
  );
  const text = new TextDecoder().decode(proc.stdout);
  const line = text.split('\n').find((entry) => entry.startsWith(`${name}=`));
  return line === undefined ? '<absent>' : line.slice(name.length + 1).trim();
}

const rateLimitEvidence: string[] = [];

function noteIfRateLimited(where: string, httpStatus: number, body: unknown): void {
  const text = typeof body === 'string' ? body : JSON.stringify(body ?? null);
  if (httpStatus === 429 || /rate.?limit|over_email_send/i.test(text)) {
    rateLimitEvidence.push(`${where}: HTTP ${httpStatus} ${redact(body)}`);
  }
}

/* --------------------------------------------------------------------------------- Auth calls */

type Wire = { status: number; body: unknown };

function parseBody(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    // A non-JSON answer is itself evidence; it is kept as the raw string.
    return text;
  }
}

async function authPost(path: string, body: unknown, key = PUBLIC_KEY): Promise<Wire> {
  const response = await fetch(`${API_URL}${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', apikey: key, Authorization: `Bearer ${key}` },
    body: JSON.stringify(body),
  });
  return { status: response.status, body: parseBody(await response.text()) };
}

/**
 * A call made AS A SIGNED-IN USER: the apikey stays the public key and the bearer is the user's own
 * access token. That difference is the whole subject of checks (c) and (d) — the bearer is the thing
 * that dies.
 */
async function authAs(method: 'GET' | 'POST' | 'PUT', path: string, bearer: string, body?: unknown): Promise<Wire> {
  const response = await fetch(`${API_URL}${path}`, {
    method,
    headers: {
      apikey: PUBLIC_KEY,
      Authorization: `Bearer ${bearer}`,
      ...(body === undefined ? {} : { 'content-type': 'application/json' }),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  return { status: response.status, body: parseBody(await response.text()) };
}

type SignIn = { wire: Wire; accessToken: string | null; refreshToken: string | null };

/** Sign in with a password. Returns the wire answer AND the tokens, which are never printed. */
async function signIn(email: string, password: string): Promise<SignIn> {
  const wire = await authPost('/auth/v1/token?grant_type=password', { email, password });
  const body = wire.body as { access_token?: unknown; refresh_token?: unknown } | null;
  const access = typeof body?.access_token === 'string' && body.access_token !== '' ? body.access_token : null;
  const refresh = typeof body?.refresh_token === 'string' && body.refresh_token !== '' ? body.refresh_token : null;
  return { wire, accessToken: access, refreshToken: refresh };
}

/**
 * GoTrue's error code for "that email and password pair is not right".
 *
 * It is the discriminator check (a) needs, pinned as a constant so the transcript states which value
 * was EXPECTED beside the one that was MEASURED. If the live stack answers a different code the
 * check FAILS, the operator pins the measured value and re-runs — the fail-and-re-pin protocol, and
 * both readings stay in the record.
 */
const CREDENTIAL_ERROR_CODE = 'invalid_credentials';

/**
 * GoTrue's error code for "that session is gone".
 *
 * THIS IS THE LOAD-BEARING VENDOR CLAIM OF AT-001.12's REVOCATION HALF. A stateless reading of a
 * JWT says a signed, unexpired token keeps working until its own expiry no matter what the server
 * did; the fixture's mirror 6 says logging out ends access immediately. Only a measurement settles
 * which is true here, so this code is pinned and captured rather than assumed.
 */
const REVOKED_ERROR_CODE = 'session_not_found';

/**
 * IS THIS THE REFUSAL WE NAMED, or merely A refusal — the distinction the predecessor's gate found
 * missing. A pass needs BOTH halves: a 4xx that is not 429 (a client refusal, not a throttle and not
 * a server fault), and a body naming the pinned error code.
 *
 * IT READS THE IN-MEMORY BODY, NOT THE PRINTED ONE, and that is load-bearing: the redactor's key
 * pattern ends with `code$`, so `error_code` is blanked in everything it prints. Judging the printed
 * text would judge `<redacted>`. An error code is an enum value, not a credential, so it is surfaced
 * separately through this safe extraction.
 */
function refusalNaming(wire: Wire, expected: string): { ok: boolean; discriminator: string } {
  const body = wire.body !== null && typeof wire.body === 'object' ? (wire.body as Record<string, unknown>) : {};
  const errorCode = typeof body.error_code === 'string' ? body.error_code : '';
  const message = [body.msg, body.message, body.error_description, body.error, wire.body]
    .filter((part): part is string => typeof part === 'string')
    .join(' | ');

  const statusIsClientRefusal = wire.status >= 400 && wire.status < 500 && wire.status !== 429;
  return {
    ok: statusIsClientRefusal && errorCode === expected,
    discriminator:
      `HTTP ${wire.status} · error_code=${errorCode === '' ? '<absent>' : errorCode}` +
      ` (expected ${expected}) · message=${JSON.stringify(scrubString(message) || '<absent>')}`,
  };
}

/**
 * THE SAME LINK WITH A TOKEN GOTRUE NEVER ISSUED — the instrument both the verification leaf and
 * this one use, carried over unchanged.
 *
 * The token this returns was never minted, so following it says nothing about expiry, about single
 * use, or about resend — retired AT-001.15 stays untouched. Every other part of the link is left
 * exactly as GoTrue wrote it, so the only difference between this request and the real one is the
 * token itself. The mutation shifts digits and letters inside their own alphabet, which keeps the
 * token the same length and shape: a token that changed shape could be refused for being malformed
 * rather than for being unissued, and the check would then measure input validation.
 */
function tamperLinkToken(link: string): { tampered: string; parameter: string } | null {
  let url: URL;
  try {
    url = new URL(link);
  } catch {
    return null;
  }
  const parameter = ['token', 'token_hash', 'confirmation_token'].find((name) => {
    const value = url.searchParams.get(name);
    return typeof value === 'string' && value !== '';
  });
  if (parameter === undefined) return null;

  const original = url.searchParams.get(parameter) as string;
  const mutated = original.replace(/[0-9a-zA-Z]/g, (character) => {
    if (character >= '0' && character <= '9') return String((Number(character) + 5) % 10);
    const base = character >= 'a' ? 'a'.charCodeAt(0) : 'A'.charCodeAt(0);
    return String.fromCharCode(base + ((character.charCodeAt(0) - base + 13) % 26));
  });
  if (mutated === original) return null;

  url.searchParams.set(parameter, mutated);
  return { tampered: url.toString(), parameter };
}

/* --------------------------------------------------------- operator reads, straight on port 54322 */

async function confirmedAt(userId: string): Promise<string | null> {
  const rows = await sql`select email_confirmed_at from auth.users where id = ${userId}::uuid`;
  const value = rows[0]?.email_confirmed_at ?? null;
  return value === null ? null : String(value instanceof Date ? value.toISOString() : value);
}

/**
 * THE OPERATOR'S READ OF `auth.sessions` — the live counterpart of the fixture's `sessionsOf`.
 *
 * Row ids are returned so check (d)'s probe can say the refresh EXTENDED a row rather than opening
 * a new one. A session id is an opaque identifier of a row this operator already owns, not a
 * credential: holding it grants nothing.
 */
async function sessionRows(userId: string): Promise<Array<{ id: string; not_after: string | null }>> {
  const rows = await sql`
    select id::text as id, not_after::text as not_after
      from auth.sessions
     where user_id = ${userId}::uuid
     order by created_at`;
  return rows as Array<{ id: string; not_after: string | null }>;
}

const sessionIds = (rows: Array<{ id: string }>): string[] => rows.map((row) => row.id).sort();

/**
 * THE POST-LINK AUTH STATE FOR GITHUB, FABRICATED BY OPERATOR AUTHORITY — the predecessor's recipe
 * carried over whole, including the correction that cost it real time.
 *
 * Linking a GitHub identity is an OAuth consent round trip: a person at github.com and a redirect no
 * script can drive. What linking LEAVES BEHIND is a row in `auth.identities`, and that row is what
 * the shipped code reads. So the row is written directly, as the operator.
 *
 * `created_at`, `updated_at` and `last_sign_in_at` are NULLABLE in the table, so a row without them
 * inserts happily; but GoTrue reads identities into a Go struct with non-pointer timestamps, so
 * `GET /auth/v1/user` then answers 500 for that user, and the whole thing looks exactly like an
 * expired token rather than like a malformed row three layers away. So they are filled here.
 */
async function fabricateGithubIdentity(userId: string, handle: string): Promise<void> {
  await sql`
    insert into auth.identities (id, user_id, provider, provider_id, identity_data,
                                 created_at, updated_at, last_sign_in_at)
    values (
      gen_random_uuid(),
      ${userId}::uuid,
      'github',
      ${`gh-${handle}-${RUN}`},
      -- The casts are explicit because jsonb_build_object takes "any", so PostgreSQL has nothing to
      -- infer a parameter's type from and refuses the statement outright rather than guessing.
      jsonb_build_object('sub', ${userId}::text, 'user_name', ${handle}::text, 'provider_id', ${`gh-${handle}-${RUN}`}::text),
      now(), now(), now()
    )`;
}

/* ------------------------------------------------------------------------ the edge function */

async function callFunction(name: string, accessToken: string, body: unknown): Promise<Wire> {
  const response = await fetch(`${API_URL}/functions/v1/${name}`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      apikey: PUBLIC_KEY,
      Authorization: `Bearer ${accessToken}`,
      'x-forwarded-for': CLIENT_IP,
    },
    body: JSON.stringify(body),
  });
  return { status: response.status, body: parseBody(await response.text()) };
}

// The stale-mount hazard the header names: probe the function before any check depends on it. An
// unauthenticated POST must be REFUSED by something, and a connection error is a different failure
// from a refusal. Only the second means the function is being served.
//
// THE PROBE GUARDS REACHABILITY, NOT REVISION, AND THIS TIME THE REVISION MATTERS. The predecessor
// could argue the mount's revision away — its branch changed nothing `complete-signup` imports.
// This branch changes `_shared/edge.ts` itself, so the argument is unavailable and the operator-side
// binding in `loop/items/AI4DEV-60/stack-up.txt` is what carries it: the serve process's own command
// line, read from the operating system, names this worktree's `supabase.exe` and this worktree as
// its working directory.
await (async () => {
  try {
    const probe = await fetch(`${API_URL}/functions/v1/complete-signup`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', apikey: PUBLIC_KEY },
      body: '{}',
    });
    if (probe.status === 404) {
      fail('the edge runtime answered 404 for complete-signup — `bunx supabase functions serve` is not serving THIS worktree');
    }
  } catch (error) {
    fail(
      'could not reach the edge runtime at all — run `bunx supabase functions serve` from THIS worktree ' +
        `(${error instanceof Error ? error.message : String(error)})`,
    );
  }
})();

/* ------------------------------------------------------------------- the mail catcher, MEASURED */

type CatcherKind = 'mailpit' | 'inbucket' | 'unknown';

/**
 * WHICH MAIL CATCHER IS BEHIND PORT 54324, established by asking it rather than by remembering.
 *
 * The Supabase CLI has shipped Inbucket and, more recently, Mailpit, and their APIs are not the same
 * shape. So both are probed, BOTH ANSWERS GO IN THE TRANSCRIPT, and the extraction below branches on
 * what actually replied. An assumption here would fail as "no email arrived", which is
 * indistinguishable from the mailer being rate-limited — the single most misleading way this script
 * could go wrong.
 */
async function discoverMailCatcher(): Promise<{ kind: CatcherKind; evidence: string }> {
  const probe = async (path: string): Promise<string> => {
    try {
      const response = await fetch(`${MAIL_URL}${path}`);
      const text = (await response.text()).slice(0, 200);
      return `GET ${path} -> HTTP ${response.status} ${JSON.stringify(scrubString(text))}`;
    } catch (error) {
      return `GET ${path} -> unreachable (${error instanceof Error ? error.message : String(error)})`;
    }
  };

  const mailpit = await probe('/api/v1/info');
  const inbucket = await probe('/api/v1/mailbox/probe');
  const evidence = `catcher at ${MAIL_URL} · ${mailpit} · ${inbucket}`;

  if (/HTTP 200/.test(mailpit)) return { kind: 'mailpit', evidence };
  if (/HTTP 200/.test(inbucket)) return { kind: 'inbucket', evidence };
  return { kind: 'unknown', evidence };
}

const catcher = await discoverMailCatcher();
console.log(`\nmail catcher shape, measured: ${catcher.kind}\n        ${catcher.evidence}\n`);

/**
 * Every URL in a message that looks like GoTrue's verify endpoint.
 *
 * `&amp;` IS DECODED FIRST, and that is not cosmetic: the email's HTML part escapes the ampersands,
 * so a link lifted straight out of it carries `&amp;type=signup` and GoTrue reads the parameter name
 * as `amp;type`. The failure looks like a rejected link rather than like a mangled one.
 */
function verifyLinksIn(text: string): string[] {
  const decoded = text.replace(/&amp;/g, '&');
  return decoded.match(/https?:\/\/[^\s"'<>)\]]+\/auth\/v1\/verify[^\s"'<>)\]]*/g) ?? [];
}

/** The `type` parameter of a verify link — `signup`, `recovery`, and so on. */
function linkType(link: string): string {
  try {
    return new URL(link).searchParams.get('type') ?? '';
  } catch {
    return '';
  }
}

/**
 * The link of a GIVEN TYPE emailed to an address.
 *
 * IT SEARCHES EVERY MESSAGE FOR THE ADDRESS AND FILTERS BY `type`, rather than taking the newest
 * message and hoping. This item's addresses receive TWO emails — a confirmation and then a recovery
 * — so "the first message" is an answer that is right half the time and wrong silently.
 */
async function emailedLink(email: string, wantedType: string): Promise<{ link: string | null; evidence: string }> {
  const local = email.split('@')[0];
  const pick = (links: string[]): string | null => links.find((link) => linkType(link) === wantedType) ?? null;
  try {
    if (catcher.kind === 'mailpit') {
      const list = await fetch(`${MAIL_URL}/api/v1/search?query=${encodeURIComponent(`to:${email}`)}&limit=20`);
      const listed = (await list.json()) as { messages?: Array<{ ID?: string }> };
      const ids = (listed.messages ?? []).map((message) => message.ID).filter((id): id is string => typeof id === 'string');
      const found: string[] = [];
      for (const id of ids) {
        const message = await fetch(`${MAIL_URL}/api/v1/message/${id}`);
        const parsed = (await message.json()) as { Text?: string; HTML?: string };
        found.push(...verifyLinksIn(`${parsed.Text ?? ''}\n${parsed.HTML ?? ''}`));
      }
      return {
        link: pick(found),
        evidence:
          `mailpit held ${ids.length} message(s) for ${email}; ${found.length} verify link(s) found;` +
          ` types=[${found.map(linkType).join(', ')}]; wanted "${wantedType}"`,
      };
    }
    if (catcher.kind === 'inbucket') {
      const list = await fetch(`${MAIL_URL}/api/v1/mailbox/${encodeURIComponent(local)}`);
      const listed = (await list.json()) as Array<{ id?: string }>;
      const ids = listed.map((message) => message.id).filter((id): id is string => typeof id === 'string');
      const found: string[] = [];
      for (const id of ids) {
        const message = await fetch(`${MAIL_URL}/api/v1/mailbox/${encodeURIComponent(local)}/${id}`);
        const parsed = (await message.json()) as { body?: { text?: string; html?: string } };
        found.push(...verifyLinksIn(`${parsed.body?.text ?? ''}\n${parsed.body?.html ?? ''}`));
      }
      return {
        link: pick(found),
        evidence:
          `inbucket mailbox ${local} held ${ids.length} message(s); ${found.length} verify link(s) found;` +
          ` types=[${found.map(linkType).join(', ')}]; wanted "${wantedType}"`,
      };
    }
    return { link: null, evidence: `the catcher at ${MAIL_URL} matched no known API shape` };
  } catch (error) {
    return { link: null, evidence: `reading the catcher failed: ${error instanceof Error ? error.message : String(error)}` };
  }
}

/* ------------------------------------------------------- a confirmed account, the live public way */

type Account = { email: string; userId: string; linkSource: 'emailed' | 'none'; linkEvidence: string };

/**
 * Register an address and confirm it through the EMAILED link — the live public order, and the same
 * order the four new acceptance bodies follow.
 *
 * IT IS A PRECONDITION HELPER, NOT A CHECK. The verification round trip is the predecessor item's
 * subject and its evidence stands; what this item needs is an account in the state a real visitor
 * reaches, so a failure here stops the run rather than being recorded as a session-layer finding.
 */
async function registerAndConfirm(email: string): Promise<Account> {
  const signup = await authPost('/auth/v1/signup', { email, password: PASSWORD });
  noteIfRateLimited(`signup ${email}`, signup.status, signup.body);
  if (signup.status >= 400) fail(`sign-up for ${email} failed (HTTP ${signup.status}): ${redact(signup.body)}`);

  const rows = await sql`select id from auth.users where email = ${email}`;
  if (rows.length !== 1) fail(`sign-up for ${email} left ${rows.length} rows in auth.users — expected exactly 1`);
  const userId = String(rows[0].id);

  const found = await emailedLink(email, 'signup');
  if (!found.link) fail(`no emailed confirmation link for ${email} — ${found.evidence}`);
  const followed = await fetch(found.link, { redirect: 'manual' });
  if (followed.status < 300 || followed.status >= 400) {
    fail(`following the confirmation link for ${email} answered HTTP ${followed.status}, not a redirect`);
  }
  const confirmed = await confirmedAt(userId);
  if (confirmed === null) fail(`the confirmation link for ${email} did not set email_confirmed_at`);

  return { email, userId, linkSource: 'emailed', linkEvidence: found.evidence };
}

/* =============================================================================================
 * PHASE `d` — EXPIRY AND REFRESH-AFTER-EXPIRY, against a LOWERED jwt_expiry.
 *
 * It is its own phase because it needs a configuration change and a stack restart, and because a
 * script that made those itself would leave a transcript nobody could audit. The operator lowers
 * `jwt_expiry`, restarts, runs this, then restores and restarts again — and `git diff` over
 * `supabase/config.toml` at the end of the item is what proves the change was transient.
 * ============================================================================================= */

if (PHASE === 'd') {
  const CONTAINER_JWT_EXP = containerEnv('GOTRUE_JWT_EXP');
  const lowered = Number(CONTAINER_JWT_EXP);
  if (!Number.isFinite(lowered) || lowered <= 0 || lowered > 60) {
    fail(
      `the auth container carries GOTRUE_JWT_EXP=${CONTAINER_JWT_EXP}, which is not a lowered value. ` +
        'Lower jwt_expiry in supabase/config.toml, restart the stack, and re-run this phase — ' +
        'a restart that did not take would make every measurement below describe the WRONG system.',
    );
  }

  const account = await registerAndConfirm(address('expiry-refresh'));
  const first = await signIn(account.email, PASSWORD);
  if (!first.accessToken || !first.refreshToken) {
    fail(`the confirmed account could not sign in (HTTP ${first.wire.status}): ${redact(first.wire.body)}`);
  }

  // THE LIVE HALF, MEASURED BEFORE ANYTHING EXPIRES. The completion also puts the account in the
  // "already completed" state, which is what makes the two refusals below distinguishable: an
  // accepted token gets the PRODUCT's 409, and a refused one gets the AUTH layer's 401.
  const liveUser = await authAs('GET', '/auth/v1/user', first.accessToken);
  const liveCompletion = await callFunction('complete-signup', first.accessToken, {
    accountType: 'ngo',
    organizationName: 'Riverside Shelter',
    acknowledgmentTextVersion: TEXT_VERSION,
  });

  const beforeRefreshRows = await sessionRows(account.userId);

  // PAST THE EXPIRY, with margin. The wait is the container's own value plus five seconds, so a
  // token that survived would have survived a real expiry rather than a mis-timed test.
  const waitMs = (lowered + 5) * 1000;
  console.log(`\nwaiting ${waitMs / 1000}s for the access token to pass its ${lowered}s expiry...\n`);
  await Bun.sleep(waitMs);

  const expiredUser = await authAs('GET', '/auth/v1/user', first.accessToken);
  const expiredCompletion = await callFunction('complete-signup', first.accessToken, {
    accountType: 'ngo',
    organizationName: 'Riverside Shelter Second',
    acknowledgmentTextVersion: TEXT_VERSION,
  });

  // THE REFRESH — no credentials pass through this call, which is AT-001.13's whole substance.
  const refreshed = await authPost('/auth/v1/token?grant_type=refresh_token', { refresh_token: first.refreshToken });
  const refreshedBody = refreshed.body as { access_token?: unknown } | null;
  const freshToken = typeof refreshedBody?.access_token === 'string' ? refreshedBody.access_token : null;

  const afterRefreshRows = await sessionRows(account.userId);

  // RE-PINNED, THE SAME WAY CHECK (c) WAS: the plan expected 401 from `/auth/v1/user` for a dead
  // token and GoTrue answers 403 — for the expired token here and for the revoked one there. So the
  // clause is "a client refusal that is not a throttle", with the measured status and the in-memory
  // error code both printed. The number was never load-bearing: the shipped `callerFromAuthAnswer`
  // accepts 2xx and refuses everything else, so 401 and 403 are the same answer to it.
  const expiredUserRefused = expiredUser.status >= 400 && expiredUser.status < 500 && expiredUser.status !== 429;
  const expiredErrorCode = (() => {
    const body = expiredUser.body !== null && typeof expiredUser.body === 'object' ? (expiredUser.body as Record<string, unknown>) : {};
    return typeof body.error_code === 'string' ? body.error_code : '<absent>';
  })();

  const freshUser = freshToken ? await authAs('GET', '/auth/v1/user', freshToken) : { status: 0, body: null };
  const freshCompletion = freshToken
    ? await callFunction('complete-signup', freshToken, {
        accountType: 'ngo',
        organizationName: 'Riverside Shelter Third',
        acknowledgmentTextVersion: TEXT_VERSION,
      })
    : { status: 0, body: 'no refreshed access token' };

  // THE PROBE'S PREDICATE IS THE SET OF ROWS, NOT THEIR NUMBER — corrected after the first run of
  // this phase, which required exactly one row and found two. The second row is the session GoTrue
  // minted when the emailed confirmation link was followed (an implicit-flow sign-in), which is the
  // same already-present session check (a) had to account for. What the probe claims is unchanged
  // by that: the refresh added NO row and moved none, so the set before equals the set after.
  const sameRow =
    beforeRefreshRows.length > 0 &&
    JSON.stringify(sessionIds(beforeRefreshRows)) === JSON.stringify(sessionIds(afterRefreshRows));

  record(
    'd',
    'an access token stops working at its expiry — at /auth/v1/user AND at a deployed function — and the SAME session\'s refresh token re-establishes access with no credentials, extending the same auth.sessions row',
    liveUser.status === 200 &&
      liveCompletion.status === 200 &&
      expiredUserRefused &&
      expiredCompletion.status === 401 &&
      refreshed.status === 200 &&
      freshToken !== null &&
      freshUser.status === 200 &&
      // 409 and not 200: the refreshed token was ACCEPTED by the auth layer and then refused by the
      // PRODUCT, because this account is already completed. A 401 here would mean the refreshed
      // token did not authenticate at all.
      freshCompletion.status === 409 &&
      sameRow,
    `container GOTRUE_JWT_EXP=${CONTAINER_JWT_EXP} · config.toml at the moment of this run says ${CONFIGURED_JWT_EXPIRY}` +
      ' · both are the TRANSIENT lowered value; the checked-in value is 3600 and is restored right after this phase\n        ' +
      `LIVE: /auth/v1/user HTTP ${liveUser.status} · deployed complete-signup HTTP ${liveCompletion.status} ${redact(liveCompletion.body)}\n        ` +
      `AFTER ${waitMs / 1000}s: /auth/v1/user HTTP ${expiredUser.status} (error_code=${expiredErrorCode}, read in memory` +
      ' because the redactor blanks it) — RE-PINNED: the plan expected 401, the MEASURED status is 403, the same' +
      ` number check (c) measured for a revoked token · ${redact(expiredUser.body)}` +
      ` · deployed complete-signup HTTP ${expiredCompletion.status} ${redact(expiredCompletion.body)}` +
      ' — 401 and not 409, so the token was refused BEFORE any product rule was consulted.\n        ' +
      'WHO REFUSED IT, said exactly rather than left to be assumed: the body is the PLATFORM\'s "Invalid JWT", not' +
      ' this repository\'s "authenticate before completing signup". `verify_jwt = true` means the edge runtime checks' +
      ' the token\'s own expiry before the function runs, so an EXPIRED token never reaches resolveCaller. Check (c)' +
      ' is the one that binds resolveCaller: a REVOKED token is still signed and unexpired, so it passes the platform' +
      ' and is refused by this repository\'s own sentence. The two checks cover the two layers, and only together.\n        ' +
      `REFRESH (no credentials in the call): HTTP ${refreshed.status}` +
      ` · fresh access token present: ${freshToken !== null}` +
      ` · credential fields the answer carried: [${credentialFieldsIn(refreshed.body).join(', ')}]` +
      ` · redacted body ${redact(refreshed.body)}\n        ` +
      `AFTER REFRESH: /auth/v1/user HTTP ${freshUser.status} · deployed complete-signup HTTP ${freshCompletion.status} ${redact(freshCompletion.body)}` +
      ' — 409 is the PRODUCT refusing an already-completed account, which is only reachable through a caller the auth layer accepted\n        ' +
      `SAME-SESSION-ROW PROBE (auth.sessions read with operator authority): before=${JSON.stringify(beforeRefreshRows)}` +
      ` after=${JSON.stringify(afterRefreshRows)} · the same set of rows, none added and none replaced: ${sameRow}` +
      ' — this is what binds the fixture\'s extend-the-same-row mirror; a vendor that opened a new session on refresh' +
      ' would show an id here that was not there before. The second row present throughout is the session the emailed' +
      ' confirmation link minted, not something the refresh did.',
  );
} else {
  /* ===========================================================================================
   * (a) A WRONG PASSWORD IS REFUSED, THE ANSWER CARRIES NO SESSION MATERIAL, AND NO SESSION ROW
   *     IS CREATED.
   *
   * AT-001.38's live half. The address is registered and CONFIRMED first, deliberately: an
   * unconfirmed address is refused for being unconfirmed whatever password is offered, and that
   * refusal would measure the predecessor item's subject instead of this one's.
   *
   * RE-PINNED AFTER THE FIRST RUN, and both readings are in the record because that is what the
   * fail-and-re-pin protocol is for. The plan's words for this check were "`auth.sessions` holds no
   * row for the user". THE FIRST RUN MEASURED ONE ROW ALREADY PRESENT — id 794595ae-…-ddfa41bbef27,
   * created before the wrong password was ever offered. Its cause is not the sign-in at all:
   * confirming the address through the emailed link is an implicit-flow sign-in, so GoTrue mints a
   * session at the moment the link is followed. That is the predecessor item's flow, not this
   * check's subject.
   *
   * SO THE PREDICATE IS NARROWED TO WHAT THE CRITERION ACTUALLY SAYS: "no authenticated session is
   * created" by the REFUSED attempt. It is now measured as an unchanged set of session ids across
   * the failed sign-in, which is precisely the shape AT-001.38's acceptance body asserts against the
   * fixture. The absolute reading is printed on both sides so a reader can see the confirmation
   * session sitting there and check the arithmetic. NOTHING IS WEAKENED BY THIS: a refusal that
   * minted a session would still fail, and it is the only thing this clause ever claimed.
   * =========================================================================================== */

  const wrongPasswordAccount = await registerAndConfirm(address('wrong-password'));
  const sessionsBeforeBad = await sessionRows(wrongPasswordAccount.userId);

  const bad = await signIn(wrongPasswordAccount.email, 'not the password');
  const badRefusal = refusalNaming(bad.wire, CREDENTIAL_ERROR_CODE);
  const sessionsAfterBad = await sessionRows(wrongPasswordAccount.userId);
  const badCredentialFields = credentialFieldsIn(bad.wire.body);

  const badMintedNothing =
    JSON.stringify(sessionIds(sessionsAfterBad)) === JSON.stringify(sessionIds(sessionsBeforeBad));

  record(
    'a',
    'a password grant with the WRONG password is refused with the credential error code, the answer carries no session material, and the refused attempt creates NO auth.sessions row',
    badRefusal.ok &&
      badCredentialFields.length === 0 &&
      bad.accessToken === null &&
      bad.refreshToken === null &&
      badMintedNothing,
    `sign-in ${badRefusal.discriminator}` +
      ` · redacted body: ${redact(bad.wire.body)} — captured, this is the refusal text` +
      ` · credential fields present in the answer: [${badCredentialFields.join(', ') || 'none'}]` +
      ` (the widened guard: access_token, refresh_token, session, provider_token, provider_refresh_token)` +
      ` · auth.sessions for this user before the attempt=${JSON.stringify(sessionsBeforeBad)}` +
      ` after=${JSON.stringify(sessionsAfterBad)} · unchanged: ${badMintedNothing}\n        ` +
      'RE-PINNED: the plan expected NO row at all here. The first run measured one already present, minted when the' +
      ' emailed confirmation link was followed — that link is an implicit-flow sign-in. The clause is now what the' +
      ' criterion says, that the REFUSED attempt creates none, and both readings are printed above.' +
      ' · the discriminator is read from the in-memory body, because the redactor blanks error_code',
  );

  /* ===========================================================================================
   * (b) THE CONTROL: the CORRECT password answers 200 with tokens, and a row appears in
   *     auth.sessions.
   *
   * Without it, (a) would be evidence of an account that cannot sign in at all rather than of a
   * password being checked.
   * =========================================================================================== */

  const good = await signIn(wrongPasswordAccount.email, PASSWORD);
  const sessionsAfterGood = await sessionRows(wrongPasswordAccount.userId);

  record(
    'b',
    'the CORRECT password answers 200 carrying session material, and exactly one auth.sessions row appears',
    good.wire.status === 200 &&
      good.accessToken !== null &&
      good.refreshToken !== null &&
      sessionsAfterGood.length === sessionsAfterBad.length + 1,
    `sign-in HTTP ${good.wire.status} · credential fields present: [${credentialFieldsIn(good.wire.body).join(', ')}]` +
      ` · redacted body ${redact(good.wire.body)}` +
      ` · auth.sessions before=${JSON.stringify(sessionsAfterBad)} after=${JSON.stringify(sessionsAfterGood)}` +
      ' — the count grew by exactly one, which is the live counterpart of the fixture mirror the acceptance body reads',
  );

  /* ===========================================================================================
   * (c) LOGGING OUT ENDS THAT SESSION'S ACCESS IMMEDIATELY — at /auth/v1/user, at the token
   *     endpoint, and at a DEPLOYED edge function.
   *
   * THE LOAD-BEARING VENDOR CLAIM OF AT-001.12's REVOCATION HALF. A stateless reading of a signed
   * JWT says the token keeps working until its own expiry; the fixture's mirror 6 says access ends
   * at logout. This is the measurement that settles it.
   *
   * AND THE TWO REFUSALS ARE TOLD APART RATHER THAN CONFLATED. A 401 from the deployed function
   * could be the auth layer OR could be almost anything, so the same function is called ONCE WITH A
   * LIVE TOKEN first: the account is already completed by then, so a caller the auth layer accepts
   * gets the PRODUCT's 409 with the database's own sentence. 409 for the live token and 401 for the
   * dead one is the pair that makes the second attributable to `resolveCaller` returning null.
   *
   * TWO THINGS WERE RE-PINNED AFTER THE FIRST RUN, and both original expectations stay in the record.
   *
   *   1. THE STATUS OF THE REVOKED-TOKEN REFUSAL IS 403, NOT 401. The plan expected 401 with a
   *      session-referencing code. The code is exactly the pinned `session_not_found`; the status is
   *      403 with the message "Session from session_id claim in JWT does not exist". So the vendor
   *      claim the fixture's mirror 6 rests on is CONFIRMED — a signed, unexpired token stops working
   *      the moment its session is gone — and only the number beside it was wrong. Nothing in the
   *      suite reads this status: the fixture renders 401 for every dead session, and the shipped
   *      `callerFromAuthAnswer` treats 401 and 403 identically, because it accepts 2xx and refuses
   *      everything else.
   *   2. A PLAIN `/auth/v1/logout` ENDS EVERY SESSION THE USER HAS, not only the one whose token was
   *      presented — the first run measured `auth.sessions` going from two rows to zero. That is
   *      GoTrue's DEFAULT SCOPE, which is `global`. The fixture's `signOut(session)` models ONE
   *      session ending, which is the `local` scope. So this check now calls BOTH, in an order that
   *      binds the mirror and then measures the default:
   *        - `?scope=local` on the first session, with a SECOND live session standing beside it as
   *          the control. One row disappears, the other stays, and the second session still works —
   *          which is the fixture's mirror 6 and is also AT-001.12's clause that revoking a session
   *          must not end the account's access.
   *        - the DEFAULT scope on the second session afterwards, recorded as what a plain logout
   *          does. No acceptance body asserts either shape, so nothing green depends on the
   *          difference; it is written down because an unrecorded vendor default is how a mirror
   *          quietly stops matching.
   * =========================================================================================== */

  const liveToken = good.accessToken ?? '';
  const completion = liveToken
    ? await callFunction('complete-signup', liveToken, {
        accountType: 'ngo',
        organizationName: 'Riverside Shelter',
        acknowledgmentTextVersion: TEXT_VERSION,
      })
    : { status: 0, body: 'no live access token' };

  // THE LIVE-TOKEN CONTROL: the same call again, still authenticated, now refused by the product.
  const liveSecondCompletion = liveToken
    ? await callFunction('complete-signup', liveToken, {
        accountType: 'ngo',
        organizationName: 'Riverside Shelter Again',
        acknowledgmentTextVersion: TEXT_VERSION,
      })
    : { status: 0, body: 'no live access token' };

  // THE SECOND LIVE SESSION — the control that makes the scoped logout below attributable. Without
  // it, "this session ended" and "the account's access ended" are the same observation.
  const sibling = await signIn(wrongPasswordAccount.email, PASSWORD);
  const sessionsWithSibling = await sessionRows(wrongPasswordAccount.userId);

  const logout = liveToken
    ? await authAs('POST', '/auth/v1/logout?scope=local', liveToken, {})
    : { status: 0, body: null };
  const sessionsAfterLogout = await sessionRows(wrongPasswordAccount.userId);

  const deadUser = liveToken ? await authAs('GET', '/auth/v1/user', liveToken) : { status: 0, body: null };
  const deadRefusal = refusalNaming(deadUser, REVOKED_ERROR_CODE);
  const deadRefresh = good.refreshToken
    ? await authPost('/auth/v1/token?grant_type=refresh_token', { refresh_token: good.refreshToken })
    : { status: 0, body: null };
  const deadCompletion = liveToken
    ? await callFunction('complete-signup', liveToken, {
        accountType: 'ngo',
        organizationName: 'Riverside Shelter After Logout',
        acknowledgmentTextVersion: TEXT_VERSION,
      })
    : { status: 0, body: 'no live access token' };

  // THE SIBLING IS STILL ALIVE — AT-001.12's clause that revoking one session is not a wall.
  const siblingAfterLogout = sibling.accessToken
    ? await authAs('GET', '/auth/v1/user', sibling.accessToken)
    : { status: 0, body: null };

  // AND NOW THE DEFAULT SCOPE, measured rather than assumed, on the session that is left.
  const globalLogout = sibling.accessToken
    ? await authAs('POST', '/auth/v1/logout', sibling.accessToken, {})
    : { status: 0, body: null };
  const sessionsAfterGlobalLogout = await sessionRows(wrongPasswordAccount.userId);

  // WHICH ROW BELONGS TO THE SIGNED-OUT SESSION: the one (b)'s sign-in added. Naming it by
  // subtraction rather than by position is what lets this check say "exactly that row disappeared"
  // instead of "one fewer row is present".
  const signedOutRowId =
    sessionIds(sessionsAfterGood).find((id) => !sessionIds(sessionsAfterBad).includes(id)) ?? '<not identified>';
  const localScopeEndedExactlyOne =
    sessionsAfterLogout.length === sessionsWithSibling.length - 1 &&
    !sessionIds(sessionsAfterLogout).includes(signedOutRowId);

  record(
    'c',
    'logging out ends that session\'s access at once: the SAME access token is refused at /auth/v1/user and at the DEPLOYED complete-signup, its refresh token is refused too, and a SIBLING session opened by the same account keeps working',
    completion.status === 200 &&
      liveSecondCompletion.status === 409 &&
      (logout.status === 204 || logout.status === 200) &&
      localScopeEndedExactlyOne &&
      deadRefusal.ok &&
      deadRefresh.status >= 400 &&
      deadCompletion.status === 401 &&
      siblingAfterLogout.status === 200 &&
      sessionsAfterGlobalLogout.length === 0,
    `first completion with the LIVE token: HTTP ${completion.status} ${redact(completion.body)}\n        ` +
      `LIVE-TOKEN CONTROL — the same call again: HTTP ${liveSecondCompletion.status} ${redact(liveSecondCompletion.body)}` +
      ' — 409 with the database\'s own sentence, which only a caller the auth layer ACCEPTED can reach\n        ' +
      `a SECOND session was opened before the logout: auth.sessions=${JSON.stringify(sessionsWithSibling)}\n        ` +
      `logout ?scope=local HTTP ${logout.status} · the signed-out session's row is ${signedOutRowId}` +
      ` · auth.sessions afterwards=${JSON.stringify(sessionsAfterLogout)}` +
      ` · exactly that row disappeared and no other: ${localScopeEndedExactlyOne}\n        ` +
      `the SAME access token at /auth/v1/user: ${deadRefusal.discriminator} · redacted body ${redact(deadUser.body)}` +
      ' — RE-PINNED: the plan expected HTTP 401; the MEASURED status is 403 carrying the pinned error code.' +
      ' The vendor claim itself is confirmed, and neither the fixture nor the shipped judgement reads this number:' +
      ' callerFromAuthAnswer accepts 2xx and refuses everything else\n        ' +
      `the revoked session's refresh token at the token endpoint: HTTP ${deadRefresh.status} ${redact(deadRefresh.body)}` +
      ` · credential fields it carried: [${credentialFieldsIn(deadRefresh.body).join(', ') || 'none'}]\n        ` +
      `the SAME access token at the DEPLOYED complete-signup: HTTP ${deadCompletion.status} ${redact(deadCompletion.body)}` +
      ' — 401 where the live token got 409, so this refusal is the auth layer\'s and it is the refactored resolveCaller returning null\n        ' +
      `THE SIBLING SESSION, untouched: /auth/v1/user HTTP ${siblingAfterLogout.status}` +
      ' — revoking one session did not end the account\'s access, which is what makes re-authentication a remedy rather than a wall\n        ' +
      `THE DEFAULT SCOPE, measured afterwards: a plain /auth/v1/logout HTTP ${globalLogout.status} left` +
      ` auth.sessions=${JSON.stringify(sessionsAfterGlobalLogout)} — every row, not one.` +
      ' RE-PINNED: the first run used the default and read two rows going to zero. GoTrue\'s default scope is global;' +
      ' the fixture\'s signOut models the local scope. No acceptance body asserts either shape.',
  );

  /* ===========================================================================================
   * (e) THE EMAILED PASSWORD RESET, END TO END, WITH THE FLOW SHAPE MEASURED BEFORE IT IS USED.
   *
   * AT-001.14's live half. Four things happen in an order that is itself the design:
   *   1. the UNKNOWN-ADDRESS PROBE (gate-1 ruling 4) — `/auth/v1/recover` for an address nobody
   *      registered, expected to answer exactly as it does for a real one. That single answer is
   *      the no-existence-oracle shape the fixture's mirror 10 predicts.
   *   2. a TAMPERED link is followed FIRST, and the old password still signs in. The token followed
   *      was never minted, so this says nothing about expiry, single use or resend — retired
   *      AT-001.15 stays untouched. It guards the oracle: a link-shaped string that reset an account
   *      would make "the emailed link is what does it" mean nothing.
   *   3. the REAL link's flow shape is MEASURED — a token in the redirect fragment (the implicit
   *      flow) and a `code` in the query (PKCE) differ across CLI versions, and asserting either
   *      without looking would be a prediction wearing a measurement's clothes.
   *   4. only then is the new password set, through whatever shape was measured.
   * =========================================================================================== */

  const resetAccount = await registerAndConfirm(address('password-reset'));

  const unknownRecover = await authPost('/auth/v1/recover', { email: address('never-registered') });
  noteIfRateLimited('recover unknown address', unknownRecover.status, unknownRecover.body);
  const knownRecover = await authPost('/auth/v1/recover', { email: resetAccount.email });
  noteIfRateLimited(`recover ${resetAccount.email}`, knownRecover.status, knownRecover.body);

  const recoveryLink = await emailedLink(resetAccount.email, 'recovery');

  // (2) THE TAMPERED VARIANT, FOLLOWED FIRST.
  let tamperedNote = 'no recovery link was obtained, so there was nothing to tamper with';
  let tamperedAttempted = false;
  let tamperedStatus = 0;
  let tamperedLocation = '';
  let oldPasswordAfterTampered: Wire = { status: 0, body: null };
  if (recoveryLink.link) {
    const mutation = tamperLinkToken(recoveryLink.link);
    if (mutation === null) {
      tamperedNote = 'the recovery link carries no non-empty token parameter this script knows how to mutate';
    } else {
      const followed = await fetch(mutation.tampered, { redirect: 'manual' });
      tamperedAttempted = true;
      tamperedStatus = followed.status;
      tamperedLocation = redactedLocation(followed.headers.get('location') ?? '');
      oldPasswordAfterTampered = (await signIn(resetAccount.email, PASSWORD)).wire;
      tamperedNote = `the "${mutation.parameter}" parameter was mutated inside its own alphabet`;
    }
  }

  // (3) THE REAL LINK, AND ITS SHAPE READ BEFORE IT IS USED.
  let flowShape: 'implicit-fragment' | 'pkce-code' | 'none' | 'unrecognised' = 'none';
  let followStatus = 0;
  let followLocation = '';
  let recoveryToken: string | null = null;
  if (recoveryLink.link) {
    const followed = await fetch(recoveryLink.link, { redirect: 'manual' });
    followStatus = followed.status;
    const location = followed.headers.get('location') ?? '';
    followLocation = redactedLocation(location);
    const fragment = location.includes('#') ? location.slice(location.indexOf('#') + 1) : '';
    const fragmentParameters = new URLSearchParams(fragment);
    const fromFragment = fragmentParameters.get('access_token');
    const queryCode = (() => {
      try {
        return new URL(location).searchParams.get('code');
      } catch {
        return null;
      }
    })();
    if (typeof fromFragment === 'string' && fromFragment !== '') {
      flowShape = 'implicit-fragment';
      recoveryToken = fromFragment;
    } else if (typeof queryCode === 'string' && queryCode !== '') {
      flowShape = 'pkce-code';
    } else {
      flowShape = 'unrecognised';
    }
  }

  // (4) THE PASSWORD CHANGE, through the measured shape.
  let passwordChange: Wire = { status: 0, body: 'the measured flow yielded nothing to act with' };
  if (flowShape === 'implicit-fragment' && recoveryToken) {
    passwordChange = await authAs('PUT', '/auth/v1/user', recoveryToken, { password: NEW_PASSWORD });
  }

  const withOld = await signIn(resetAccount.email, PASSWORD);
  const withOldRefusal = refusalNaming(withOld.wire, CREDENTIAL_ERROR_CODE);
  const withNew = await signIn(resetAccount.email, NEW_PASSWORD);

  if (recoveryLink.link === null) {
    skip(
      'e',
      'the emailed reset link changes the password: the new one signs in and the old one is refused',
      `no recovery link came out of the catcher — ${recoveryLink.evidence}. This is NOT evidence that the reset flow is broken: ` +
        'a broken reader and an absent email look the same from here.',
    );
  } else {
    record(
      'e',
      'the emailed reset link changes the password: a tampered variant changes nothing, the real link\'s flow shape is measured, the new password signs in and the old one is refused with the code (a) pinned',
      unknownRecover.status === 200 &&
        knownRecover.status === 200 &&
        tamperedAttempted &&
        oldPasswordAfterTampered.status === 200 &&
        flowShape === 'implicit-fragment' &&
        passwordChange.status === 200 &&
        withOldRefusal.ok &&
        withNew.wire.status === 200 &&
        withNew.accessToken !== null,
      `UNKNOWN-ADDRESS PROBE: /auth/v1/recover for an address nobody registered -> HTTP ${unknownRecover.status} ${redact(unknownRecover.body)}` +
        ` · for the registered address -> HTTP ${knownRecover.status} ${redact(knownRecover.body)}` +
        ' — the same answer either way, which is the no-existence-oracle shape the fixture mirrors\n        ' +
        `link source: emailed (${recoveryLink.evidence})\n        ` +
        `TAMPERED FIRST: ${tamperedNote} · following it answered HTTP ${tamperedStatus} -> ${tamperedLocation || '<no location header>'}` +
        ` · the OLD password still signed in afterwards: HTTP ${oldPasswordAfterTampered.status}` +
        ' · this says nothing about expiry, single use or resend: the token followed was never issued\n        ' +
        `REAL LINK: HTTP ${followStatus} -> ${followLocation || '<no location header>'} · MEASURED flow shape: ${flowShape}` +
        ' (the fragment is cut before printing, so the shape is read in memory)\n        ' +
        `PASSWORD CHANGE through that shape: PUT /auth/v1/user HTTP ${passwordChange.status} ${redact(passwordChange.body)}\n        ` +
        `OLD password afterwards: ${withOldRefusal.discriminator} · redacted body ${redact(withOld.wire.body)}\n        ` +
        `NEW password afterwards: HTTP ${withNew.wire.status} · credential fields present: [${credentialFieldsIn(withNew.wire.body).join(', ')}]`,
    );
  }

  /* ===========================================================================================
   * (g) THE LINKED-VOLUNTEER CONTROL ACROSS THE REFACTORED EDGE (gate-1 ruling 2).
   *
   * THE ONE CHECK THAT FAILS ON A PRE-NARROWED BRIDGE. The refactor moved the caller judgement into
   * `_shared/caller.ts` and left an UNTYPED delegation in `edge.ts`. A delegation that handed over
   * `{ id }` instead of the whole Auth body would lose `identities[]`, resolve a perfectly usable
   * caller, pass every other check in this file, and refuse every linked volunteer at the deployed
   * edge. Nothing in the type system would catch it, because that bridge has no types.
   *
   * It also re-establishes the predecessor item's deployed-linked-volunteer evidence, which this
   * refactor supersedes: that evidence was gathered against the pre-refactor `resolveCaller`.
   * =========================================================================================== */

  const volunteerAccount = await registerAndConfirm(address('linked-volunteer'));
  await fabricateGithubIdentity(volunteerAccount.userId, VOLUNTEER_HANDLE);
  const volunteerSignIn = await signIn(volunteerAccount.email, PASSWORD);

  const volunteerCompletion = volunteerSignIn.accessToken
    ? await callFunction('complete-signup', volunteerSignIn.accessToken, {
        accountType: 'volunteer',
        acknowledgmentTextVersion: TEXT_VERSION,
      })
    : { status: 0, body: 'no access token — the volunteer never signed in' };

  const volunteerAccountRows = await sql`select account_type from public.accounts where id = ${volunteerAccount.userId}::uuid`;
  const volunteerProfileRows = await sql`
    select github_handle, top_languages, repository_count, contribution_summary
      from public.volunteer_profiles where account_id = ${volunteerAccount.userId}::uuid`;
  const expectedStats = stubGithubStatsFor(VOLUNTEER_HANDLE);
  const volunteerProfile = volunteerProfileRows[0] as
    | { github_handle: string; top_languages: string[]; repository_count: number; contribution_summary: string }
    | undefined;

  record(
    'g',
    'a LINKED volunteer completes through the DEPLOYED function across the refactored edge, and the stored profile carries the handle and the shipped stub\'s exact statistics',
    volunteerCompletion.status === 200 &&
      volunteerAccountRows.length === 1 &&
      volunteerAccountRows[0].account_type === 'volunteer' &&
      volunteerProfileRows.length === 1 &&
      volunteerProfile?.github_handle === VOLUNTEER_HANDLE &&
      JSON.stringify(volunteerProfile?.top_languages) === JSON.stringify(expectedStats.topLanguages) &&
      Number(volunteerProfile?.repository_count) === expectedStats.repositoryCount &&
      volunteerProfile?.contribution_summary === expectedStats.contributionSummary,
    `volunteer completion HTTP ${volunteerCompletion.status} ${redact(volunteerCompletion.body)}` +
      ` · account=${JSON.stringify(volunteerAccountRows)} · stored profile=${JSON.stringify(volunteerProfileRows)}` +
      ` · the shipped stub's judgement for "${VOLUNTEER_HANDLE}"=${JSON.stringify(expectedStats)}` +
      ' · a delegation in edge.ts that pre-narrowed the Auth body to { id } would lose identities[] and fail exactly here',
  );

  /* ===========================================================================================
   * (f) THE MAILER RATE LIMIT — reported either way, so a starved run can never look like a clean
   *     one.
   * =========================================================================================== */

  record(
    'f',
    'the mailer rate limit did not starve this proof',
    rateLimitEvidence.length === 0,
    rateLimitEvidence.length === 0
      ? `configured [auth.rate_limit] email_sent = ${CONFIGURED_EMAIL_RATE_LIMIT} per hour, but the auth CONTAINER carries ` +
        `GOTRUE_RATE_LIMIT_EMAIL_SENT=${containerEnv('GOTRUE_RATE_LIMIT_EMAIL_SENT')} — the CLI does not push the file's value in, ` +
        'measured again this run and recorded in stack-up.txt. This run sent 3 confirmation emails and 1 recovery email and saw ' +
        'no rate-limit answer. The pre-authorized relief valve did NOT fire.'
      : `STARVED. configured [auth.rate_limit] email_sent = ${CONFIGURED_EMAIL_RATE_LIMIT} per hour; container carries ` +
        `GOTRUE_RATE_LIMIT_EMAIL_SENT=${containerEnv('GOTRUE_RATE_LIMIT_EMAIL_SENT')}. Evidence: ${rateLimitEvidence.join(' | ')}. ` +
        'THE RELIEF VALVE MUST FIRE: raise email_sent, restart the stack, re-run this script, and record the raise in the transcript.',
  );
}

/* ----------------------------------------------------------------------------------- verdict */

await sql.end();

const passed = results.filter((check) => check.outcome === 'pass');
const failed = results.filter((check) => check.outcome === 'fail');
const skipped = results.filter((check) => check.outcome === 'skip');

console.log(`\nphase ${PHASE} · ${results.length} checks · ${passed.length} passed · ${failed.length} failed · ${skipped.length} skipped`);
if (skipped.length) console.log(`SKIPPED: ${skipped.map((check) => `(${check.id})`).join(' ')}`);
if (failed.length) {
  console.log(`FAILED: ${failed.map((check) => `(${check.id})`).join(' ')}`);
  process.exit(1);
}
if (skipped.length) {
  // NOT `ALL CHECKS PASSED`, deliberately: a verdict that says "all passed" over a check nobody
  // performed is the false certificate this wording exists to prevent.
  console.log(`EVERY CHECK THAT RAN PASSED — ${skipped.length} DID NOT RUN, so this run does not certify them`);
  process.exit(0);
}
console.log('ALL CHECKS PASSED');
