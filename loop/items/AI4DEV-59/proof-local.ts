/**
 * THE LOCAL PROOF for AI4DEV-59 — the only evidence in this item about the real Supabase Auth
 * under `enable_confirmations = true`, the real confirmation email, and the real
 * `/auth/v1/user` serialisation the shipped extractor has to read.
 *
 *   bun loop/items/AI4DEV-59/proof-local.ts
 *
 * Preconditions, and the script refuses rather than guesses if any is missing:
 *   1. `bun run db:start` — the stack is up, WITH this item's `supabase/config.toml`. The flip to
 *      `enable_confirmations = true` is read at Auth start-up, so a stack started before the flip
 *      is running the old setting and every check below would measure the wrong system.
 *   2. `bun run db:reset` — run it immediately before this script. The checks assert row counts.
 *   3. `bunx supabase functions serve` — running in another terminal, FROM THIS WORKTREE, WITHOUT
 *      --no-verify-jwt. The directory matters and is not pedantry: the edge runtime container
 *      mounts whichever project directory launched it, and this machine was once found serving a
 *      worktree that had since been deleted. A stale mount answers preflights perfectly while
 *      running somebody else's code. The script probes the function before using it.
 *
 * IT LIVES IN THE ITEM RECORD AND NOT IN `tests/`, DELIBERATELY, for the reason the predecessor's
 * copy of this file gives: it is evidence-gathering. It runs once, on one machine, by hand, and
 * its transcript is the artifact. Under `tests/` it would look like something that guards the
 * tree, and it guards nothing — nothing runs it again and CI has no database.
 *
 * WHAT THE LOOP-TIER SUITE ALREADY PROVES, so this does not duplicate it: that the shipped
 * decisions in `_shared/verification.ts` behave as AT-001.09 and AT-001.10 require, including the
 * fail-closed answers, which `tests/at/harness/shipped-verification.selftest.ts` drives directly.
 * What NOTHING BUT THIS SCRIPT touches: that GoTrue issues no session at signup with confirmations
 * on, that it refuses sign-in until the address is confirmed, that a confirmation email really
 * arrives and its link really flips `email_confirmed_at`, and that the shipped extractor answers
 * true against GoTrue's REAL serialisation rather than against the fixture's prediction of it.
 *
 * ============================================================================================
 * NO CHECK HERE EXERCISES `discoveryMessageAllowed`, AND THAT IS NOT AN OVERSIGHT.
 * ============================================================================================
 *
 * There is no Discovery route on this stack or on any stack — it is REQ-002/004's, and this leaf
 * ships the decision that route must call rather than the route. So there is nothing live to send
 * a Discovery message to. The gate's oracle is the loop-tier body for AT-001.10 plus the direct
 * shape selftest, and this transcript says so instead of leaving a reader to assume a live check
 * happened. What this script DOES add on that subject is check (c): on the live stack an
 * unconfirmed user cannot authenticate at all, so the auth layer blocks upstream of the gate.
 *
 * NO KEY IS WRITTEN INTO THIS FILE AND NONE IS PRINTED BY IT. Everything is read from
 * `bunx supabase status -o json` at run time. Redaction is DESIGNED IN rather than applied
 * afterwards, and it covers THREE surfaces, because gate 2 found the first version covering only
 * one:
 *
 *   1. BODIES. `redact()` below walks every object body before it reaches the transcript and
 *      replaces the value under any credential-shaped key name.
 *   2. STRINGS, including a body that is not JSON at all. `redact()` also scrubs JWT-shaped
 *      substrings and `name=value` pairs whose name is credential-shaped, so a raw string answer
 *      cannot carry a token through verbatim.
 *   3. THE REDIRECT LOCATION. `redactedLocation()` cuts the URL fragment — that fragment is where
 *      GoTrue puts the access token it mints when a link is followed — AND replaces EVERY
 *      query-parameter VALUE, keeping the parameter names. A `?token=` or `?code=` redirect can
 *      therefore not land in a file that gets pushed.
 *
 * GitHub push protection has already refused one push in this project for a transcript that
 * captured a status command verbatim. The transcript is ALSO inspected for credential residue by
 * hand before it is committed; that inspection is recorded in the item's report.
 */

import { readFileSync } from 'node:fs';
import { SQL } from 'bun';
// THE SHIPPED EXTRACTOR, IMPORTED RATHER THAN MIRRORED — the whole point of check (d). The
// question this script exists to settle is whether the function that ships answers correctly
// about a REAL GoTrue response, so re-implementing the read here would settle nothing.
import { emailVerifiedFromUser } from '../../../supabase/functions/_shared/verification.ts';
// The stub import fixture, for the volunteer completion read-back in (e) — the same reason the
// predecessor imports it: comparing the stored profile against the shipped judgement shows the
// values travelled from the edge function into the transaction unchanged, where "the row is
// non-empty" would pass over plausible-looking rubbish.
import { stubGithubStatsFor } from '../../../supabase/functions/_shared/github.ts';

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

/**
 * EVERY BODY GOES THROUGH THIS BEFORE IT REACHES THE TRANSCRIPT.
 *
 * The fields that carry secrets are known and few — GoTrue answers with `access_token`,
 * `refresh_token`, `provider_token` and friends — but the rule here is by NAME PATTERN rather than
 * by a list, because a list is a thing to forget to extend. A value under any key whose name looks
 * like a credential is replaced; the KEY still appears, so the transcript still shows that the
 * field was present, which is usually the fact a check needs.
 *
 * It returns a STRING, not an object, so there is no path by which an unredacted value reaches the
 * output through some later `JSON.stringify`.
 */
const SENSITIVE = /token|secret|password|apikey|api_key|jwt|nonce|otp|code$/i;

/**
 * A STRING SCRUBBED OF CREDENTIALS, for the surface `redact()`'s key walk cannot see.
 *
 * A key walk protects `{"access_token": "..."}`. It protects nothing inside a value — and GoTrue
 * answers with raw strings on some paths, while any body at all can carry a link with a token in
 * its query. So two shapes are replaced here:
 *
 *   - A JWT. Three base64url runs separated by dots, beginning `eyJ`, which is what a JSON header
 *     always encodes to. Every access token, refresh token and service key in this stack is one.
 *   - A `name=value` pair whose NAME is credential-shaped by the same pattern the key walk uses.
 *     The name survives, so the transcript still shows which parameter was present.
 */
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
    // A STRING VALUE IS SCRUBBED TOO. This is the half gate 2 found missing: a body that is not
    // JSON reaches here as one long string, and a key walk never looks inside it.
    if (typeof node === 'string') return scrubString(node);
    return node;
  };
  try {
    return JSON.stringify(walk(value));
  } catch {
    return '<unserialisable>';
  }
}

/**
 * A URL SAFE TO PRINT: no fragment, and no query-parameter VALUES.
 *
 * The fragment is where GoTrue puts the minted access token. The QUERY is where it puts the
 * token hash, the `code`, and the error description — and printing those unchanged was the defect
 * two blind reviewers found independently. Parameter NAMES are kept, because which parameters a
 * redirect carried is usually the fact a check needs, and a name is not a credential.
 */
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
      // A bare flag has no value to redact.
      return equals < 0 ? pair : `${pair.slice(0, equals)}=<redacted>`;
    })
    .join('&');
  return `${withoutHash.slice(0, question)}?${query}${fragmentNote}`;
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
/**
 * The local mail catcher. Its port is 54324 in `supabase/config.toml`, and its API SHAPE is
 * measured below rather than assumed — see `discoverMailCatcher`.
 */
const MAIL_URL = status.MAILPIT_URL ?? status.INBUCKET_URL ?? 'http://127.0.0.1:54324';

const sql = new SQL(DB_URL);

const TEXT_VERSION = 'tos-2026-01+promise-2026-01';
const PASSWORD = 'correct horse battery staple';
const CLIENT_IP = '203.0.113.7';
const VOLUNTEER_HANDLE = 'octoverifier';
/** Unique per run, so a second run against a database that was not reset still reads honestly. */
const RUN = Date.now().toString(36);
const address = (local: string) => `${local}+${RUN}@example.test`;

/**
 * The configured per-hour cap on auth emails, read from the file rather than remembered.
 *
 * This run sends TWO confirmation emails — one per email-capable account type — and the checked-in
 * value is 2, so the file's cap sits EXACTLY on what this run sends — which is why check (f)
 * exists and why the plan pre-authorized raising it.
 *
 * MEASURED ON THE FIRST RUN: the CLI did NOT push this file value into the auth container — the
 * container carried GOTRUE_RATE_LIMIT_EMAIL_SENT=360000, recorded in stack-up.txt beside the
 * reading — so the file's cap did not bind that run. Check (f) still reports the file's value AND
 * whether any mailer refusal appeared, which together are the honest pair: the transcript shows
 * what the file claims and what the mailer actually did.
 */
const CONFIGURED_EMAIL_RATE_LIMIT = (() => {
  try {
    const toml = readFileSync(new URL('../../../supabase/config.toml', import.meta.url), 'utf8');
    return /^\s*email_sent\s*=\s*(\d+)/m.exec(toml)?.[1] ?? '<not found>';
  } catch {
    return '<unreadable>';
  }
})();

/**
 * Anything that looks like the mailer refusing to send. Check (f) reports on this, so a starved
 * run can never look like a clean one.
 */
const rateLimitEvidence: string[] = [];

function noteIfRateLimited(where: string, httpStatus: number, body: unknown): void {
  const text = typeof body === 'string' ? body : JSON.stringify(body ?? null);
  if (httpStatus === 429 || /rate.?limit|over_email_send/i.test(text)) {
    rateLimitEvidence.push(`${where}: HTTP ${httpStatus} ${redact(body)}`);
  }
}

/* --------------------------------------------------------------------------------- Auth calls */

type Wire = { status: number; body: unknown };

async function authPost(path: string, body: unknown, key = PUBLIC_KEY): Promise<Wire> {
  const response = await fetch(`${API_URL}${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', apikey: key, Authorization: `Bearer ${key}` },
    body: JSON.stringify(body),
  });
  const text = await response.text();
  let parsed: unknown = text;
  try {
    parsed = JSON.parse(text);
  } catch {
    // A non-JSON answer is itself evidence; it is kept as the raw string.
  }
  return { status: response.status, body: parsed };
}

/**
 * Register an email/password user. WITH CONFIRMATIONS ON THIS MUST RETURN NO SESSION, which is
 * check (a)'s first half, so the caller inspects the wire response rather than being handed a
 * tidy session object.
 *
 * THE USER ID IS TAKEN FROM THE RESPONSE WHEN IT IS THERE, AND FROM THE DATABASE WHEN IT IS NOT.
 * GoTrue's confirmations-on signup response has varied across versions — some return the full user
 * record, some return an obfuscated one to avoid leaking whether an address already exists. Which
 * one this stack does is recorded rather than assumed, and neither answer is a failure: the id is
 * an operator read either way.
 */
async function signUp(email: string): Promise<{ wire: Wire; userId: string; idFrom: 'response' | 'database' }> {
  const wire = await authPost('/auth/v1/signup', { email, password: PASSWORD });
  noteIfRateLimited(`signup ${email}`, wire.status, wire.body);
  if (wire.status >= 400) fail(`sign-up for ${email} failed (HTTP ${wire.status}): ${redact(wire.body)}`);

  const body = wire.body as { id?: string; user?: { id?: string } } | null;
  const fromResponse = body?.user?.id ?? body?.id;
  if (typeof fromResponse === 'string' && fromResponse !== '') {
    return { wire, userId: fromResponse, idFrom: 'response' };
  }
  const rows = await sql`select id from auth.users where email = ${email}`;
  if (rows.length !== 1) fail(`sign-up for ${email} left ${rows.length} rows in auth.users — expected exactly 1`);
  return { wire, userId: String(rows[0].id), idFrom: 'database' };
}

/** Sign in with a password. Returns the wire answer AND the token, which is never printed. */
async function signIn(email: string): Promise<{ wire: Wire; accessToken: string | null }> {
  const wire = await authPost('/auth/v1/token?grant_type=password', { email, password: PASSWORD });
  const token = (wire.body as { access_token?: string } | null)?.access_token;
  return { wire, accessToken: typeof token === 'string' && token !== '' ? token : null };
}

/**
 * GoTrue's error code for "this address is not confirmed yet".
 *
 * It is the DISCRIMINATOR check (c) needs, and it is pinned as a constant so the transcript states
 * which value was expected. If the live stack answers a different code, the check FAILS and the
 * verbatim capture beside it shows the real one — measurement, never assumption.
 */
const CONFIRMATION_ERROR_CODE = 'email_not_confirmed';

/**
 * IS THIS THE CONFIRMATION REFUSAL, or merely A refusal — the distinction gate 2 found missing.
 *
 * `status >= 400` alone passes on a 429 from the mailer's rate limiter and on a 500 from a broken
 * stack, and either would record "confirmation is enforced" while confirmation enforced nothing.
 * So a pass needs BOTH halves:
 *
 *   - a 4xx that is NOT 429 — a client refusal, not a throttle and not a server fault;
 *   - a body that NAMES the unconfirmed state through the pinned error code
 *     `email_not_confirmed`, exactly. If the live refusal carries a different discriminator, the
 *     check FAILS, the verbatim capture beside it shows the real discriminator, and the operator
 *     pins that measured value and re-runs — measurement, never assumption.
 *
 * IT READS THE IN-MEMORY BODY, NOT THE PRINTED ONE, and that is load-bearing: the transcript
 * redactor's key pattern ends with `code$`, so `error_code` is blanked in everything it prints.
 * Judging the printed text would judge `<redacted>`. The discriminator is surfaced separately
 * below through a safe extraction — an error code is an enum value, not a credential.
 */
function unconfirmedSignInRefusal(wire: Wire): { ok: boolean; discriminator: string } {
  const body =
    wire.body !== null && typeof wire.body === 'object'
      ? (wire.body as Record<string, unknown>)
      : {};
  const errorCode = typeof body.error_code === 'string' ? body.error_code : '';
  const message = [body.msg, body.message, body.error_description, body.error, wire.body]
    .filter((part): part is string => typeof part === 'string')
    .join(' | ');

  const statusIsClientRefusal = wire.status >= 400 && wire.status < 500 && wire.status !== 429;
  const bodyNamesTheState = errorCode === CONFIRMATION_ERROR_CODE;

  return {
    ok: statusIsClientRefusal && bodyNamesTheState,
    discriminator:
      `HTTP ${wire.status} · error_code=${errorCode === '' ? '<absent>' : errorCode}` +
      ` (expected ${CONFIRMATION_ERROR_CODE}) · message=${JSON.stringify(scrubString(message) || '<absent>')}`,
  };
}

/**
 * THE SAME LINK WITH A TOKEN GOTRUE NEVER ISSUED — check (b2)'s instrument.
 *
 * The mirror under test says a link that was never issued confirms nothing, and following a
 * MUTATED token is how that is measured without touching any semantics REQ-001 does not state.
 * The token this returns was never minted, so following it says nothing about expiry, about single
 * use, or about resend — retired AT-001.11 stays untouched. Every other part of the link, the
 * `type` and the redirect included, is left exactly as GoTrue wrote it, so the only difference
 * between this request and the real one is the token itself.
 *
 * The mutation shifts digits and letters inside their own alphabet, which keeps the token the same
 * length and shape. A token that changed shape could be refused for being malformed rather than
 * for being unissued, and the check would then measure input validation instead of the mirror.
 */
function tamperVerificationToken(link: string): { tampered: string; parameter: string } | null {
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

/** `auth.users.email_confirmed_at` read as the operator, on port 54322 — not through any API. */
async function confirmedAt(userId: string): Promise<string | null> {
  const rows = await sql`select email_confirmed_at from auth.users where id = ${userId}::uuid`;
  const value = rows[0]?.email_confirmed_at ?? null;
  return value === null ? null : String(value instanceof Date ? value.toISOString() : value);
}

/**
 * THE POST-LINK AUTH STATE FOR GITHUB, FABRICATED BY OPERATOR AUTHORITY — carried over from the
 * predecessor item unchanged, including the correction that cost it real time.
 *
 * Linking a GitHub identity is an OAuth consent round trip: a person at github.com and a redirect
 * no script can drive. What linking LEAVES BEHIND is a row in `auth.identities`, and that row is
 * what the shipped code reads. So the row is written directly, as the operator. IT IS
 * FLIP-INDEPENDENT — a database write, not an auth flow — which is why (e) can reuse it under the
 * new setting without re-proving it.
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
  const text = await response.text();
  let parsed: unknown = text;
  try {
    parsed = JSON.parse(text);
  } catch {
    /* kept raw */
  }
  return { status: response.status, body: parsed };
}

// The stale-mount hazard the header names: probe the function before any check depends on it. An
// unauthenticated POST must be REFUSED by something, and a connection error is a different failure
// from a refusal. Only the second means the function is being served.
//
// THE PROBE GUARDS REACHABILITY, NOT REVISION, AND (e)'s EVIDENCE DOES NOT NEED IT TO.
// A reviewer read this as a hole: a stale mount serving an older worktree answers 401, so any
// non-404 passes and the probe cannot tell which REVISION of `complete-signup` replied. The fact is
// right; the consequence is not, and the reason was verified in the tree before this comment was
// written. This branch changes NOTHING under `supabase/functions/` except the NEW
// `_shared/verification.ts` (`git diff main...HEAD --stat -- supabase/functions/`: one file, 167
// insertions), and `complete-signup/index.ts` imports only `_shared/accounts.ts`,
// `_shared/github.ts` and `_shared/edge.ts` — never `verification.ts`. So every revision of
// `complete-signup` this branch could be compared against is byte for byte the same code, and the
// mount's revision is not load-bearing for anything (e) claims.
// The operator side of the binding is recorded rather than inferred:
// `loop/items/AI4DEV-59/stack-up.txt` carries the exact `bunx supabase functions serve` command and
// the directory it ran in.
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
 * The Supabase CLI has shipped Inbucket and, more recently, Mailpit, and their APIs are not the
 * same shape. The plan's risk 2 is exactly this. So both are probed, BOTH ANSWERS GO IN THE
 * TRANSCRIPT, and the extraction below branches on what actually replied. An assumption here would
 * fail as "no confirmation email arrived", which is indistinguishable from the mailer being
 * rate-limited — the single most misleading way this script could go wrong.
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
 * Every URL in the message that looks like GoTrue's verify endpoint.
 *
 * `&amp;` IS DECODED FIRST, and that is not cosmetic: the confirmation email's HTML part escapes
 * the ampersands, so a link lifted straight out of it carries `&amp;type=signup` and GoTrue reads
 * the parameter name as `amp;type`. The failure looks like a rejected link rather than like a
 * mangled one.
 */
function verifyLinksIn(text: string): string[] {
  const decoded = text.replace(/&amp;/g, '&');
  return decoded.match(/https?:\/\/[^\s"'<>)\]]+\/auth\/v1\/verify[^\s"'<>)\]]*/g) ?? [];
}

async function emailedVerificationLink(email: string): Promise<{ link: string | null; evidence: string }> {
  const local = email.split('@')[0];
  try {
    if (catcher.kind === 'mailpit') {
      const list = await fetch(`${MAIL_URL}/api/v1/search?query=${encodeURIComponent(`to:${email}`)}&limit=20`);
      const listed = (await list.json()) as { messages?: Array<{ ID?: string }> };
      const id = listed.messages?.[0]?.ID;
      if (!id) return { link: null, evidence: `mailpit search for ${email} returned no message` };
      const message = await fetch(`${MAIL_URL}/api/v1/message/${id}`);
      const parsed = (await message.json()) as { Text?: string; HTML?: string };
      const links = verifyLinksIn(`${parsed.Text ?? ''}\n${parsed.HTML ?? ''}`);
      return {
        link: links[0] ?? null,
        evidence: `mailpit held ${listed.messages?.length ?? 0} message(s) for ${email}; ${links.length} verify link(s) found`,
      };
    }
    if (catcher.kind === 'inbucket') {
      const list = await fetch(`${MAIL_URL}/api/v1/mailbox/${encodeURIComponent(local)}`);
      const listed = (await list.json()) as Array<{ id?: string }>;
      const id = listed[0]?.id;
      if (!id) return { link: null, evidence: `inbucket mailbox ${local} was empty` };
      const message = await fetch(`${MAIL_URL}/api/v1/mailbox/${encodeURIComponent(local)}/${id}`);
      const parsed = (await message.json()) as { body?: { text?: string; html?: string } };
      const links = verifyLinksIn(`${parsed.body?.text ?? ''}\n${parsed.body?.html ?? ''}`);
      return {
        link: links[0] ?? null,
        evidence: `inbucket mailbox ${local} held ${listed.length} message(s); ${links.length} verify link(s) found`,
      };
    }
    return { link: null, evidence: `the catcher at ${MAIL_URL} matched no known API shape` };
  } catch (error) {
    return { link: null, evidence: `reading the catcher failed: ${error instanceof Error ? error.message : String(error)}` };
  }
}

/**
 * THE FALLBACK THE PLAN'S RISK 2 PRE-AUTHORIZES, and it NARROWS the claim rather than rescuing it.
 *
 * GoTrue's admin endpoint mints a verification link with operator authority. If the catcher cannot
 * yield the emailed link, this is what gets followed — and the transcript then says, in the check's
 * own note, that the link followed was NOT the emailed one. That is a smaller claim, stated as a
 * smaller claim. It is never used when the catcher works.
 */
async function adminGeneratedLink(email: string): Promise<{ link: string | null; evidence: string }> {
  const wire = await authPost('/auth/v1/admin/generate_link', { type: 'signup', email, password: PASSWORD }, SECRET_KEY);
  const link = (wire.body as { action_link?: string } | null)?.action_link ?? null;
  return {
    link: typeof link === 'string' && link !== '' ? link : null,
    evidence: `admin generate_link -> HTTP ${wire.status} (action_link ${link ? 'present' : 'absent'})`,
  };
}

/* ============================================================================================
 * THE VERIFICATION ROUND TRIP — (a) through (d), as one function so the SECOND address in (e)
 * repeats exactly the same measurement rather than an abbreviated version of it.
 * ============================================================================================ */

/**
 * What following a tampered link did — or why it could not be followed at all.
 *
 * `attempted: false` is never a pass. Check (b2) SKIPS on it, because a check that could not run
 * is a missing measurement rather than a satisfied one.
 */
type TamperedFollow = {
  attempted: boolean;
  why: string;
  parameter: string;
  status: number;
  location: string;
  confirmedAfter: string | null;
};

type RoundTrip = {
  email: string;
  userId: string;
  idFrom: 'response' | 'database';
  signupWire: Wire;
  /** the whole point of (a): with confirmations on there must be NO token in the signup answer */
  signupCarriedSession: boolean;
  confirmedBefore: string | null;
  linkSource: 'emailed' | 'admin-generated' | 'none';
  linkEvidence: string;
  signInBefore: Wire;
  /** check (b2): the never-issued-token negative, measured BEFORE the real link is followed */
  tampered: TamperedFollow;
  followStatus: number;
  followLocation: string;
  confirmedAfter: string | null;
  signInAfter: Wire;
  accessToken: string | null;
  rawUserWire: Wire;
  shippedVerdict: boolean;
};

async function verificationRoundTrip(email: string): Promise<RoundTrip> {
  const { wire: signupWire, userId, idFrom } = await signUp(email);
  const signupBody = signupWire.body as { access_token?: unknown; refresh_token?: unknown; session?: unknown } | null;
  const signupCarriedSession =
    typeof signupBody?.access_token === 'string' ||
    typeof signupBody?.refresh_token === 'string' ||
    (signupBody?.session !== null && signupBody?.session !== undefined);

  const confirmedBefore = await confirmedAt(userId);

  // (c) is measured BEFORE the link is followed, because afterwards the same call succeeds and the
  // refusal would be unobtainable.
  const signInBefore = (await signIn(email)).wire;

  const fromCatcher = await emailedVerificationLink(email);
  let link = fromCatcher.link;
  let linkSource: RoundTrip['linkSource'] = link ? 'emailed' : 'none';
  let linkEvidence = fromCatcher.evidence;
  if (!link) {
    const fallback = await adminGeneratedLink(email);
    if (fallback.link) {
      link = fallback.link;
      linkSource = 'admin-generated';
    }
    linkEvidence = `${fromCatcher.evidence} · FALLBACK: ${fallback.evidence}`;
  }

  // (b2) THE NEVER-ISSUED TOKEN, FOLLOWED BEFORE THE REAL LINK.
  //
  // The order matters and is the whole design of this block: once the real link has confirmed the
  // address, `email_confirmed_at` is non-null for every later read, and the negative becomes
  // unmeasurable. So the tampered variant goes first, and the column is read straight afterwards.
  const tampered: TamperedFollow = {
    attempted: false,
    why: '',
    parameter: '',
    status: 0,
    location: '',
    confirmedAfter: null,
  };
  if (!link) {
    tampered.why = 'no verification link was obtained at all, so there was nothing to tamper with';
  } else {
    const mutation = tamperVerificationToken(link);
    if (mutation === null) {
      tampered.why = 'the link carries no non-empty token parameter this script knows how to mutate';
    } else {
      const followed = await fetch(mutation.tampered, { redirect: 'manual' });
      tampered.attempted = true;
      tampered.parameter = mutation.parameter;
      tampered.status = followed.status;
      tampered.location = redactedLocation(followed.headers.get('location') ?? '');
      tampered.confirmedAfter = await confirmedAt(userId);
    }
  }

  let followStatus = 0;
  let followLocation = '';
  if (link) {
    const followed = await fetch(link, { redirect: 'manual' });
    followStatus = followed.status;
    // THE FRAGMENT IS CUT AND EVERY QUERY VALUE IS REPLACED. GoTrue redirects to the site URL with
    // the freshly minted access token in the URL fragment, and this string goes into a file that
    // gets pushed.
    followLocation = redactedLocation(followed.headers.get('location') ?? '');
  }

  const confirmedAfter = await confirmedAt(userId);
  const after = await signIn(email);
  const rawUserWire: Wire = after.accessToken
    ? await (async () => {
        const response = await fetch(`${API_URL}/auth/v1/user`, {
          headers: { apikey: PUBLIC_KEY, Authorization: `Bearer ${after.accessToken}` },
        });
        const text = await response.text();
        let parsed: unknown = text;
        try {
          parsed = JSON.parse(text);
        } catch {
          /* kept raw */
        }
        return { status: response.status, body: parsed };
      })()
    : { status: 0, body: null };

  return {
    email,
    userId,
    idFrom,
    signupWire,
    signupCarriedSession,
    confirmedBefore,
    linkSource,
    linkEvidence,
    signInBefore,
    tampered,
    followStatus,
    followLocation,
    confirmedAfter,
    signInAfter: after.wire,
    accessToken: after.accessToken,
    rawUserWire,
    // THE SHIPPED FUNCTION, ON THE REAL BODY. This single line is what binds the extractor to
    // GoTrue's actual serialisation; everything else in this script is the setup that makes it
    // meaningful.
    shippedVerdict: emailVerifiedFromUser(rawUserWire.body),
  };
}

const ngoEmail = address('ngo-verify');
const ngoTrip = await verificationRoundTrip(ngoEmail);

/* =============================================================================================
 * (a) SIGNUP UNDER THE FLIPPED CONFIG ISSUES NO SESSION, AND THE ADDRESS IS UNCONFIRMED.
 *
 * The first of the plan's three unverified-runtime-claims, measured rather than expected. Both
 * halves matter: no token on the wire, AND `email_confirmed_at IS NULL` read as the operator on
 * port 54322. The wire answer alone could be a client-library convention; the column is the fact.
 * ============================================================================================= */

record(
  'a',
  'an email/password signup under enable_confirmations = true returns NO session, and auth.users.email_confirmed_at is NULL',
  ngoTrip.signupWire.status < 400 && ngoTrip.signupCarriedSession === false && ngoTrip.confirmedBefore === null,
  `signup HTTP ${ngoTrip.signupWire.status} ${redact(ngoTrip.signupWire.body)}` +
    ` · carried a session: ${ngoTrip.signupCarriedSession}` +
    ` · user id read from the ${ngoTrip.idFrom}` +
    ` · auth.users.email_confirmed_at = ${ngoTrip.confirmedBefore ?? 'NULL'}`,
);

/* =============================================================================================
 * (b) THE CONFIRMATION EMAIL EXISTS IN THE CATCHER, AND THE LINK COMES OUT OF IT.
 *
 * The catcher's API shape was measured above, not assumed — the evidence line says which shape
 * answered. If the link came from the admin endpoint instead, this check says so IN ITS OWN NOTE
 * and the claim is narrower: an equivalent link was followed, but not the emailed one.
 *
 * AN UNRECOGNISED CATCHER SKIPS RATHER THAN FAILS, and the distinction is the shared invariant
 * about re-measuring a negative: a broken instrument and a true absence produce identical output.
 * "The mailbox reads empty" is not evidence that no email was sent when the thing being asked is
 * not the thing that answers. A skip says the evidence is missing, which is what is true.
 * ============================================================================================= */

if (catcher.kind === 'unknown') {
  skip(
    'b',
    'the local mail catcher holds a confirmation email for the address, and the verification link is extracted from it',
    `the catcher at ${MAIL_URL} matched no known API shape, so this check has no working instrument. ` +
      `It is NOT evidence that no confirmation email was sent — a broken reader and an empty mailbox look the same. ` +
      `Probe results: ${catcher.evidence}. Fix the reader, or note which catcher this CLI version ships, then re-run.`,
  );
} else {
  record(
    'b',
    'the local mail catcher holds a confirmation email for the address, and the verification link is extracted from it',
    ngoTrip.linkSource === 'emailed',
    `catcher shape: ${catcher.kind} · ${ngoTrip.linkEvidence} · link source: ${ngoTrip.linkSource}` +
      (ngoTrip.linkSource === 'admin-generated'
        ? ' — NARROWED: the EMAILED link was not what was followed; an operator-minted equivalent was.'
        : ''),
  );
}

/* =============================================================================================
 * (b2) A TOKEN GOTRUE NEVER ISSUED CONFIRMS NOTHING.
 *
 * The fixture's mirror 2 says a link that was never issued has no confirming effect. Two blind
 * reviewers found the same defect: that mirror was labelled BOUND by checks (a)–(d), and none of
 * those checks ever follows an unissued link — the named evidence measured only the positive half.
 * This check is the negative, measured.
 *
 * The instrument is the REAL link with its token mutated inside its own alphabet, followed BEFORE
 * the real one. What it asserts is exactly one thing: `auth.users.email_confirmed_at` is still
 * NULL afterwards. It asserts NOTHING about expiry, single use or resend — the token followed was
 * never minted, so no lifetime and no use count is in play, and retired AT-001.11's semantics stay
 * untouched.
 *
 * THE RESPONSE STATUS IS RECORDED BUT NOT ASSERTED ON. GoTrue may answer a redirect carrying an
 * error, or a 4xx, and which one it picks is its own business. The column is the fact.
 * ============================================================================================= */

if (!ngoTrip.tampered.attempted) {
  skip(
    'b2',
    'a verification link carrying a token GoTrue never issued confirms nothing',
    `${ngoTrip.tampered.why}. Link source was "${ngoTrip.linkSource}" (${ngoTrip.linkEvidence}). ` +
      'This is NOT evidence that a never-issued token confirms an address — it is evidence that the ' +
      'negative could not be measured on this run.',
  );
} else {
  record(
    'b2',
    'a verification link carrying a token GoTrue never issued confirms nothing',
    ngoTrip.tampered.confirmedAfter === null,
    `the "${ngoTrip.tampered.parameter}" parameter of the ${ngoTrip.linkSource} link was mutated inside its own alphabet` +
      ` · following the tampered link answered HTTP ${ngoTrip.tampered.status} -> ${ngoTrip.tampered.location || '<no location header>'}` +
      ` · auth.users.email_confirmed_at immediately afterwards = ${ngoTrip.tampered.confirmedAfter ?? 'NULL'}` +
      ' · this says nothing about expiry, single use or resend: the token followed was never issued' +
      (ngoTrip.linkSource === 'admin-generated'
        ? ' · NARROWED: the link mutated was the operator-minted one, because the catcher yielded none.'
        : ''),
  );
}

/* =============================================================================================
 * (c) SIGN-IN BEFORE CONFIRMATION IS REFUSED, WITH THE REFUSAL TEXT CAPTURED VERBATIM.
 *
 * The second unverified-runtime-claim. On the live stack this block sits UPSTREAM of the shipped
 * gate: an unconfirmed user cannot authenticate at all, so it never reaches a write path. That is
 * why the gate is not redundant rather than why it is — decision-8 makes verification the write
 * path's own floor, and non-public paths do not pass through this refusal.
 *
 * THE REFUSAL MUST BE THE CONFIRMATION ONE, not any refusal. `status >= 400` was the first
 * version's predicate and a reviewer showed what it accepts: a 429 from the mailer's rate limiter
 * and a 500 from a broken stack both record as PASS while confirmation enforces nothing. See
 * `unconfirmedSignInRefusal` above for the two halves a pass now needs.
 * ============================================================================================= */

const ngoRefusal = unconfirmedSignInRefusal(ngoTrip.signInBefore);

record(
  'c',
  'sign-in BEFORE confirmation is refused by Auth itself, with a CONFIRMATION-SPECIFIC refusal (a 4xx that is not 429, naming the unconfirmed state)',
  ngoRefusal.ok,
  `sign-in ${ngoRefusal.discriminator}` +
    ` · redacted body: ${redact(ngoTrip.signInBefore.body)} — captured verbatim, this is the refusal text` +
    ' · the discriminator above is read from the in-memory body, because the redactor blanks error_code',
);

/* =============================================================================================
 * (d) USING THE LINK FLIPS THE COLUMN, SIGN-IN THEN SUCCEEDS, AND THE SHIPPED EXTRACTOR AGREES
 *     WITH GOTRUE'S REAL SERIALISATION.
 *
 * The third unverified-runtime-claim and the one this whole script exists for. `emailVerifiedFromUser`
 * is fed the RAW `/auth/v1/user` body — not a shape this script built — and must answer true.
 *
 * ITS FALSE HALF IS NOT EXERCISED HERE, and the transcript says so rather than dressing it up: an
 * unconfirmed user holds no session, so there is no token with which to read `/auth/v1/user` for
 * one. The false half is exercised at the loop tier and in the direct shape selftest.
 * ============================================================================================= */

record(
  'd',
  'following the verification link flips email_confirmed_at, sign-in then succeeds, and the SHIPPED emailVerifiedFromUser answers true on the real /auth/v1/user body',
  ngoTrip.followStatus >= 300 &&
    ngoTrip.followStatus < 400 &&
    ngoTrip.confirmedAfter !== null &&
    ngoTrip.signInAfter.status === 200 &&
    ngoTrip.accessToken !== null &&
    ngoTrip.rawUserWire.status === 200 &&
    ngoTrip.shippedVerdict === true,
  `link follow HTTP ${ngoTrip.followStatus} -> ${ngoTrip.followLocation || '<no location header>'}` +
    ` · email_confirmed_at before=${ngoTrip.confirmedBefore ?? 'NULL'} after=${ngoTrip.confirmedAfter ?? 'NULL'}` +
    ` · sign-in after HTTP ${ngoTrip.signInAfter.status} (access token present: ${ngoTrip.accessToken !== null})` +
    ` · /auth/v1/user HTTP ${ngoTrip.rawUserWire.status} ${redact(ngoTrip.rawUserWire.body)}` +
    ` · the SHIPPED emailVerifiedFromUser says: ${ngoTrip.shippedVerdict}` +
    ' · the extractor\'s FALSE half is NOT exercised here: an unconfirmed user holds no session to read /auth/v1/user with',
);

/* =============================================================================================
 * (e) BOTH EMAIL-CAPABLE ACCOUNT TYPES FLOW END TO END UNDER THE FLIPPED CONFIG.
 *
 * WHY THE PREDECESSOR'S COMPLETION EVIDENCE IS NOT CITED HERE, which is gate-1 ruling [2] adopted
 * whole: the flip changes the auth context beneath BOTH completion paths. That evidence was
 * produced with confirmations OFF, so it predates this change and no longer covers it. Both paths
 * are therefore re-proved rather than referenced.
 *
 * The NGO address, already confirmed by (a)–(d), completes through the DEPLOYED complete-signup
 * edge function. The volunteer address repeats the whole round trip on its own, then gains a
 * GitHub identity by the operator insert above — flip-independent, because it is a database write
 * and not an auth flow — and completes as a volunteer through the same deployed function.
 * ============================================================================================= */

const ngoCompletion = ngoTrip.accessToken
  ? await callFunction('complete-signup', ngoTrip.accessToken, {
      accountType: 'ngo',
      organizationName: 'Riverside Shelter',
      acknowledgmentTextVersion: TEXT_VERSION,
    })
  : { status: 0, body: 'no access token — the NGO never signed in' };

const ngoRows = await sql`
  select a.account_type, o.name, m.role
    from public.accounts a
    left join public.org_memberships m on m.account_id = a.id
    left join public.organizations o on o.id = m.org_id
   where a.id = ${ngoTrip.userId}::uuid`;

const volunteerEmail = address('volunteer-verify');
const volunteerTrip = await verificationRoundTrip(volunteerEmail);

if (volunteerTrip.accessToken) await fabricateGithubIdentity(volunteerTrip.userId, VOLUNTEER_HANDLE);

const volunteerCompletion = volunteerTrip.accessToken
  ? await callFunction('complete-signup', volunteerTrip.accessToken, {
      accountType: 'volunteer',
      acknowledgmentTextVersion: TEXT_VERSION,
    })
  : { status: 0, body: 'no access token — the volunteer never signed in' };

const volunteerAccountRows = await sql`select account_type from public.accounts where id = ${volunteerTrip.userId}::uuid`;
const volunteerProfileRows = await sql`
  select github_handle, top_languages, repository_count, contribution_summary, imported_at
    from public.volunteer_profiles where account_id = ${volunteerTrip.userId}::uuid`;
const expectedStats = stubGithubStatsFor(VOLUNTEER_HANDLE);
const volunteerProfile = volunteerProfileRows[0] as
  | { github_handle: string; top_languages: string[]; repository_count: number; contribution_summary: string; imported_at: Date }
  | undefined;

// THE VOLUNTEER'S PRE-CONFIRMATION REFUSAL GETS THE SAME TEETH AS (c)'s, per the same ruling: a
// claim that the volunteer "repeats (a)-(d)" is only true if it is measured the same way.
const volunteerRefusal = unconfirmedSignInRefusal(volunteerTrip.signInBefore);

record(
  'e',
  'both email-capable types flow end to end under the flipped config: the NGO completes after confirmation, and the volunteer confirms, links GitHub and completes with its profile populated',
  // The NGO half.
  ngoCompletion.status === 200 &&
    ngoRows.length === 1 &&
    ngoRows[0].account_type === 'ngo' &&
    ngoRows[0].name === 'Riverside Shelter' &&
    ngoRows[0].role === 'admin' &&
    // The volunteer half: its OWN round trip repeated (a)-(d), then completion.
    volunteerTrip.signupCarriedSession === false &&
    volunteerTrip.confirmedBefore === null &&
    // THE REFUSAL IS THE CONFIRMATION ONE, not merely a 4xx — the same predicate (c) uses.
    volunteerRefusal.ok &&
    // AND THE LINK CAME FROM THE CATCHER. Without this, the admin-minted fallback could carry the
    // volunteer half while the claim "repeats (b)" quietly narrowed to something smaller. The NGO
    // half already cannot do that, because (b) fails with a NARROWED note on the fallback.
    volunteerTrip.linkSource === 'emailed' &&
    volunteerTrip.confirmedAfter !== null &&
    volunteerTrip.shippedVerdict === true &&
    volunteerCompletion.status === 200 &&
    volunteerAccountRows.length === 1 &&
    volunteerAccountRows[0].account_type === 'volunteer' &&
    volunteerProfileRows.length === 1 &&
    volunteerProfile?.github_handle === VOLUNTEER_HANDLE &&
    JSON.stringify(volunteerProfile?.top_languages) === JSON.stringify(expectedStats.topLanguages) &&
    Number(volunteerProfile?.repository_count) === expectedStats.repositoryCount &&
    volunteerProfile?.contribution_summary === expectedStats.contributionSummary,
  `NGO completion HTTP ${ngoCompletion.status} ${redact(ngoCompletion.body)} · rows=${JSON.stringify(ngoRows)}\n        ` +
    `volunteer round trip: signup carried a session=${volunteerTrip.signupCarriedSession}` +
    ` · confirmed before=${volunteerTrip.confirmedBefore ?? 'NULL'} after=${volunteerTrip.confirmedAfter ?? 'NULL'}` +
    ` · sign-in before confirmation ${volunteerRefusal.discriminator}, redacted body ${redact(volunteerTrip.signInBefore.body)}` +
    ` · link source ${volunteerTrip.linkSource} (${volunteerTrip.linkEvidence})` +
    ` · its own tampered-token probe: attempted=${volunteerTrip.tampered.attempted}` +
    ` email_confirmed_at afterwards=${volunteerTrip.tampered.confirmedAfter ?? 'NULL'}` +
    ` · shipped emailVerifiedFromUser says ${volunteerTrip.shippedVerdict}\n        ` +
    `volunteer completion HTTP ${volunteerCompletion.status} ${redact(volunteerCompletion.body)}` +
    ` · account=${JSON.stringify(volunteerAccountRows)} · stored profile=${JSON.stringify(volunteerProfileRows)}` +
    ` · the shipped stub's judgement for "${VOLUNTEER_HANDLE}"=${JSON.stringify(expectedStats)}`,
);

/* =============================================================================================
 * (f) THE MAILER RATE LIMIT — reported either way, so a starved run can never look like a clean
 *     one.
 *
 * `[auth.rate_limit] email_sent` caps auth emails per hour, and this run sends exactly TWO
 * confirmation emails against a checked-in cap of 2. The plan's decision D-B pre-authorizes
 * raising that value on the local stack if the proof starves. The RAISE IS AN OPERATOR ACTION, not
 * something this script does behind the operator's back — a script that edited configuration and
 * restarted a stack mid-run would make its own transcript unreadable. So this check reports, in
 * words, whether the valve is needed.
 * ============================================================================================= */

record(
  'f',
  'the mailer rate limit did not starve this proof',
  rateLimitEvidence.length === 0,
  rateLimitEvidence.length === 0
    ? `configured [auth.rate_limit] email_sent = ${CONFIGURED_EMAIL_RATE_LIMIT} per hour; this run sent 2 confirmation emails and saw no rate-limit answer. The D-B relief valve did NOT fire.`
    : `STARVED. configured [auth.rate_limit] email_sent = ${CONFIGURED_EMAIL_RATE_LIMIT} per hour. Evidence: ${rateLimitEvidence.join(' | ')}. ` +
      'THE D-B RELIEF VALVE MUST FIRE: raise email_sent in supabase/config.toml, restart the stack, re-run this script, and record the raise in the transcript.',
);

/* ----------------------------------------------------------------------------------- verdict */

await sql.end();

const passed = results.filter((check) => check.outcome === 'pass');
const failed = results.filter((check) => check.outcome === 'fail');
const skipped = results.filter((check) => check.outcome === 'skip');

console.log(`\n${results.length} checks · ${passed.length} passed · ${failed.length} failed · ${skipped.length} skipped`);
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
