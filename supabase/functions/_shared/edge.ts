/**
 * The plumbing both edge functions need: read the environment, answer with JSON, establish WHO is
 * calling, and reach the database.
 *
 * It is deliberately separate from `accounts.ts`. That module holds the DECISIONS and is imported by
 * the acceptance adapter, which puts it inside a strict TypeScript program with `types: ["node"]`
 * and no Deno global — so it may contain no I/O and no `Deno` reference. This file is the opposite
 * half: nothing but I/O, Deno-only, and imported by no test. Merging the two would drag `Deno` into
 * the acceptance program and the whole shared-logic arrangement with it.
 *
 * NO TYPE-CHECKER COVERS THIS FILE, and that is stated rather than hoped. `bun run typecheck` runs
 * over the root project (whose `include` is `src/**` plus two config files) and the `tests/at`
 * project (whose `include` is `tests/at/**` plus whatever those files import). Neither reaches an
 * edge-function entry point or this module. What covers them instead is that they are served and
 * exercised against the live stack — weaker in some ways and stronger in others, and named honestly
 * either way. At this tree's head that evidence is `loop/items/AI4DEV-58/proof-local.txt`: 9 checks,
 * 8 passed, 0 failed, 1 skipped, driving `complete-signup` through the deployed function for both
 * account types. The one skip is the GitHub handshake, because no GitHub OAuth app exists for this
 * project; the Google handshake is unproved for the same reason. `loop/items/AI4DEV-57/proof-local.txt`
 * is retained for the ONE thing only it still covers: `create-organization`, which was exercised
 * there and is untouched by this leaf. Its completion-path and schema evidence is SUPERSEDED — it
 * predates this migration and called a `complete_signup` that no longer exists.
 *
 * ONE IMPORT CROSSES INTO THE PURE HALF: `callerFromAuthAnswer` from `./caller.ts`. That direction
 * is the safe one and the arrangement is unchanged by it — a Deno-only file may import a pure one,
 * while the reverse would drag `Deno` into the strict acceptance program. The judgement about WHO
 * is calling belongs on the pure side, where a test can reach it; this file keeps the round trip
 * that asks. (The import used to be `extractGithubHandle` from `./github.ts`; the caller module now
 * makes that call, so this file names one pure module instead of two.)
 */

import { callerFromAuthAnswer, type Caller } from './caller.ts';
import type { ReadResult, TenantReads } from './tenant-reads.ts';
import type { PublicProjectReads, PublicProjectSource } from './public-project.ts';

/**
 * A required environment variable, or a loud failure at first use.
 *
 * `SUPABASE_SERVICE_ROLE_KEY` is accepted under either of its two names because the CLI has been
 * renaming its key vocabulary — newer versions inject `SUPABASE_SECRET_KEY` — and a function that
 * boots and then 500s on its first database call because it read `undefined` is much harder to
 * diagnose than one that says which variable it wanted.
 */
export function requireEnv(...names: string[]): string {
  for (const name of names) {
    const value = Deno.env.get(name);
    if (value && value.trim() !== '') return value;
  }
  throw new Error(`none of ${names.join(', ')} is set in this function's environment`);
}

/**
 * WHAT A BROWSER IS ALLOWED TO SEND, and why this list is exactly this list.
 *
 * A signup from the app's own origin is a cross-origin authenticated JSON request, so the browser
 * sends a preflight first and refuses to make the real call unless the answer permits the method
 * and every header. `supabase-js`'s `functions.invoke` sends `authorization`, `apikey`,
 * `content-type` and `x-client-info`; omitting any one of them fails the preflight, and the failure
 * surfaces in the browser as a network error with no reason attached.
 *
 * THE ORIGIN IS `*` DELIBERATELY, and it is not a shortcut. An allow-list would need the deployed
 * app origins, which are not knowable from this tree — inventing one would be a guess wearing the
 * costume of a security control. It is safe here for a reason specific to these two endpoints:
 * BOTH AUTHENTICATE BY `Authorization` HEADER AND NEITHER READS A COOKIE, so a hostile page that
 * reaches them carries no ambient authority; it would have to already hold the user's access token,
 * and if it holds that it does not need a browser. This is the Supabase standard posture for edge
 * functions. A deployment that later authenticates by cookie must revisit this line first.
 */
const CORS_HEADERS: Record<string, string> = {
  'access-control-allow-origin': '*',
  'access-control-allow-headers': 'authorization, apikey, content-type, x-client-info',
  'access-control-allow-methods': 'POST, OPTIONS',
};

export function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'content-type': 'application/json' },
  });
}

/** A refusal a caller can act on: the reason travels, never a bare status. */
export function refusal(reason: string, status: number): Response {
  return json({ ok: false, reason }, status);
}

/**
 * The two conventions EVERY entry point here needs, applied once instead of twice.
 *
 *   * THE PREFLIGHT. Both functions refuse any method that is not POST, so without this an
 *     `OPTIONS` would be answered 405 and no browser would ever reach the real call.
 *   * NOTHING ESCAPES AS A BARE STATUS. A rejected `fetch` (Auth or the Data API unreachable) or a
 *     non-JSON success body throws, and an exception out of a `Deno.serve` handler becomes a 500
 *     with no body — precisely the case where a caller most needs to tell a refusal from an outage.
 *     Anything thrown becomes a shaped 502 carrying a sentence, which is this file's standing
 *     contract: the reason travels, never a bare status.
 */
export function edgeHandler(
  name: string,
  handler: (request: Request) => Promise<Response>,
): (request: Request) => Promise<Response> {
  return async (request: Request): Promise<Response> => {
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS_HEADERS });
    try {
      return await handler(request);
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      return refusal(`${name} could not complete the request: ${detail}`, 502);
    }
  };
}

/**
 * RE-EXPORTED, NOT DECLARED. `Caller` now lives in `./caller.ts` beside the only function that
 * constructs one. WHAT THE TWO DEPLOYED FUNCTIONS ACTUALLY IMPORT TODAY, grep-verified rather than
 * assumed: `complete-signup/index.ts` and `create-organization/index.ts` import VALUE names from
 * this file only — `resolveCaller`, `json`, `refusal` and the rest — and neither one imports the
 * `Caller` type at all. (An earlier version of this paragraph claimed both said
 * `import type { Caller } from '../_shared/edge.ts'`; that was a false stated fact, corrected here.)
 * The re-export therefore changes no import that exists. What it does is keep this module's surface
 * unchanged: either function may take the type from here, exactly as it took it before `caller.ts`
 * existed, without reaching into `caller.ts`.
 *
 * IT IS IMPORTED AT THE TOP AND RE-EXPORTED HERE, rather than written as
 * `export type { Caller } from './caller.ts'`, and the difference is load-bearing. That one-line
 * form creates NO LOCAL BINDING, so `resolveCaller`'s own `Promise<Caller | null>` annotation below
 * would name something this file does not have. NO TYPE-CHECKER COVERS THIS FILE — the header says
 * so — but Deno type-checks it when the function is served, so the mistake would surface as a
 * serving failure of both deployed functions and nowhere earlier.
 */
export type { Caller };

/**
 * WHO IS CALLING — answered by Supabase Auth, never by this function.
 *
 * `verify_jwt = true` in `config.toml` means the platform has already verified the token's
 * signature before this code runs. That still leaves the question of which user it belongs to, and
 * the cheap answer — decode the payload and read `sub` — would mean trusting a base64 blob because
 * something upstream is believed to have checked it. So the token is presented to `/auth/v1/user`
 * instead and Auth answers. One extra round trip, no cryptography in our code, and no dependency:
 * `fetch` is enough.
 *
 * ============================================================================================
 * THE ROUND TRIP IS HERE. THE JUDGEMENT IS IN `./caller.ts`, AND NONE OF IT IS LEFT IN THIS FILE.
 * ============================================================================================
 *
 * This function used to read the status, dig `id` out of the body, check its type and extract the
 * GitHub handle — four judgements about the ANSWER'S SHAPE, sitting in a file no type-checker
 * covers and no test can import. They are now one call to `callerFromAuthAnswer`, which the
 * acceptance fixture drives on every validated path and
 * `tests/at/harness/shipped-caller.selftest.ts` drives shape by shape. What is left below is I/O:
 * one header read, one `fetch`, one body parse.
 *
 * THE WHOLE BODY IS HANDED OVER, NEVER A NARROWED PIECE OF IT. `callerFromAuthAnswer` reads
 * `identities[]` to find the linked GitHub handle, so passing `{ id }` — or anything else this file
 * pre-selected — would return a caller with `githubHandle: null` and refuse every linked volunteer
 * at this edge, while every unit-level check stayed green. This bridge is untyped, so nothing here
 * would catch it. `loop/items/AI4DEV-60/proof-local.ts` check (g) is the live control that does:
 * it completes a linked volunteer through the DEPLOYED function.
 *
 * THE MISSING-HEADER RETURN STAYS HERE, and it is not a judgement about the answer — there is no
 * answer yet. It is this file declining to spend a round trip on a request that carries no
 * credential at all, exactly as before.
 */
export async function resolveCaller(request: Request, supabaseUrl: string, anonKey: string): Promise<Caller | null> {
  const authorization = request.headers.get('Authorization');
  if (!authorization) return null;

  const response = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: { Authorization: authorization, apikey: anonKey },
  });

  // THE PARSE NEVER THROWS, and that is deliberate rather than defensive habit. The old code
  // returned on `!response.ok` BEFORE touching the body, so a refusal was never parsed; reading the
  // body first with `response.json()` would make an Auth outage that answers HTML — a proxy's error
  // page — throw here and become a 502 where it used to be a 401. An unparseable body is handed
  // over as `null` instead, so the status still decides and the deployed refusal path is
  // byte-for-byte what it was.
  const text = await response.text();
  let user: unknown = null;
  try {
    user = JSON.parse(text) as unknown;
  } catch {
    // Left as `null`, which `callerFromAuthAnswer` reads as no caller. Nothing is judged here.
    //
    // TWO EDGES DO CHANGE, and both are named rather than glossed. The first is this one: a 2xx
    // whose body is UNPARSEABLE used to throw and surface as a 502; it now refuses as a 401. The
    // second belongs to the parse below and is named here so the pair reads together: a 2xx whose
    // body is the JSON literal `null` parsed cleanly, and the old unguarded `.id` read on `null`
    // threw a TypeError which `edgeHandler` turned into a 502; it now yields no caller and refuses
    // as a 401. (The old code is quoted from the committed history in
    // `loop/items/AI4DEV-60/gate2-rulings.md`, which is where that reading was done.)
    //
    // AND THE CLAIM IS EXHAUSTIVE, which is the part that took a second reader to establish. Every
    // OTHER parseable body behaves exactly as it did: a property read on a boxed primitive — a
    // number, a string, a boolean — yields `undefined`, and an array has no `id` either, so all of
    // them failed the string check then and fail it now. `null` is the one parseable body whose old
    // behaviour differed.
    //
    // Both edges are the fail-closed direction and both match this module's stated promise — a
    // malformed body yields no caller. GoTrue answers a JSON object on both the 200 and its
    // refusal (HTTP 403 measured live for a dead and for an expired token — the re-pin in
    // loop/items/AI4DEV-60/fix-rulings.md ruling 2), so neither case is reachable through Auth
    // itself; both are reachable through something in front of Auth.
  }
  return callerFromAuthAnswer(response.status, user);
}

function isIpv4(value: string): boolean {
  const parts = value.split('.');
  return parts.length === 4 && parts.every((part) => /^\d{1,3}$/.test(part) && Number(part) <= 255);
}

function isIpv6(value: string): boolean {
  if (value.split('::').length > 2) return false;
  const abbreviated = value.includes('::');
  const groups = value.split(':').filter((group) => group !== '');
  if (groups.length === 0) return abbreviated; // `::` itself
  const last = groups[groups.length - 1];
  // `::ffff:127.0.0.1` is a legal IPv6 address whose final element is a dotted IPv4 and occupies
  // two of the eight groups.
  const trailingIpv4 = last.includes('.');
  if (trailingIpv4 && !isIpv4(last)) return false;
  const hexGroups = trailingIpv4 ? groups.slice(0, -1) : groups;
  if (!hexGroups.every((group) => /^[0-9a-fA-F]{1,4}$/.test(group))) return false;
  const count = hexGroups.length + (trailingIpv4 ? 2 : 0);
  return abbreviated ? count < 8 : count === 8;
}

/**
 * The address the request came from — AT-001.01 records it on the acknowledgment.
 *
 * `x-forwarded-for` may carry a chain; the FIRST entry is the original client and the rest are
 * proxies. `null` rather than a placeholder when there is nothing to record:
 * `public.acknowledgments` permits a null `ip`, and inventing `0.0.0.0` would put a value in the
 * column that reads like a measurement and is not one.
 *
 * IT IS VALIDATED BEFORE IT LEAVES HERE, because `public.complete_signup`'s fifth parameter is
 * `p_ip inet` and the header is a client-supplied string. An unparseable value made PostgREST fail
 * the cast, which arrived as a 4xx, which `complete-signup` maps to 409 with the database's message
 * — so a perfectly well-formed signup was refused with something that read like a signup conflict.
 * Anything that is not a well-formed IPv4 or IPv6 address therefore records nothing at all, which
 * is honest, rather than breaking a signup.
 *
 * THE TRUST BOUNDARY, stated because the column looks like a measurement: this is what the gateway
 * chain REPORTED, and it is NOT authenticated. On any path where no trusted proxy overwrites the
 * header, a caller chooses it. Which entry of the chain a deployment should believe depends on the
 * proxies actually in front of it, which is not observable from this tree; whoever lands the hosted
 * deployment settles it with that chain in view. Until then the acknowledgment records AN address,
 * never a verified source address, and the plan's per-id table says so in those words.
 */
export function callerIp(request: Request): string | null {
  const forwarded = request.headers.get('x-forwarded-for');
  const first = forwarded?.split(',')[0]?.trim();
  if (!first || first === '') return null;
  const candidate = first.startsWith('[') && first.endsWith(']') ? first.slice(1, -1) : first;
  return isIpv4(candidate) || isIpv6(candidate) ? candidate : null;
}

/** The result of a database function call: its value, or the database's own refusal. */
export type RpcOutcome = { ok: true; value: unknown } | { ok: false; status: number; message: string };

/**
 * Call one `public.` function, with the service role, in ONE round trip.
 *
 * One round trip is one implicit transaction, which is the whole reason the signup writes live
 * inside a database function rather than being issued as separate Data API calls from here. Four
 * calls would be four transactions, and a failure partway would leave an account with no
 * organisation, membership or acknowledgment.
 *
 * The service role bypasses row-level security, which is why the database functions perform their
 * own checks: nothing else is standing on this path.
 */
export async function callDatabaseFunction(
  supabaseUrl: string,
  serviceRoleKey: string,
  name: string,
  args: Record<string, unknown>,
): Promise<RpcOutcome> {
  const response = await fetch(`${supabaseUrl}/rest/v1/rpc/${name}`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
    },
    body: JSON.stringify(args),
  });

  const text = await response.text();
  if (!response.ok) {
    // PostgREST wraps a raised exception as `{ message, code, details, hint }`. The message is the
    // sentence the database function chose, so it is passed through rather than replaced with a
    // generic one — those functions raise sentences precisely so a caller can act on them.
    let message = text;
    try {
      const body = JSON.parse(text) as { message?: unknown };
      if (typeof body.message === 'string') message = body.message;
    } catch {
      // A non-JSON body from PostgREST means something other than a raised exception went wrong;
      // the raw text is then the most informative thing available.
    }
    return { ok: false, status: response.status, message };
  }

  return { ok: true, value: text === '' ? null : (JSON.parse(text) as unknown) };
}

async function restJson<Row>(url: string, init: RequestInit): Promise<ReadResult<Row>> {
  const response = await fetch(url, init);
  const text = await response.text();
  if (!response.ok) return { ok: false, detail: text };
  try {
    const parsed: unknown = JSON.parse(text);
    if (!Array.isArray(parsed)) return { ok: false, detail: text };
    return { ok: true, rows: parsed as Row[] };
  } catch {
    return { ok: false, detail: text };
  }
}

/** Caller-bound Data API GETs. A non-2xx answer is `{ ok: false, detail }`, never a throw. */
export function callerReads(supabaseUrl: string, anonKey: string, authorization: string): TenantReads {
  const headers = { apikey: anonKey, Authorization: authorization, Accept: 'application/json' };
  const base = `${supabaseUrl.replace(/\/$/, '')}/rest/v1`;
  return {
    organization: (organizationId) =>
      restJson(`${base}/organizations?id=eq.${encodeURIComponent(organizationId)}&select=id,name`, { headers }),
    seatsOf: (organizationId) =>
      restJson(
        `${base}/org_memberships?org_id=eq.${encodeURIComponent(organizationId)}&select=account_id,role`,
        { headers },
      ),
    projectsOf: (organizationId) =>
      restJson(
        `${base}/projects?org_id=eq.${encodeURIComponent(organizationId)}&select=id,name,assigned_volunteer_id`,
        { headers },
      ),
    project: (projectId) =>
      restJson(
        `${base}/projects?id=eq.${encodeURIComponent(projectId)}&select=id,name,org_id,assigned_volunteer_id`,
        { headers },
      ),
  };
}

/** The public page's source: one RPC as the service role, never a table grant. */
export function publicProjectReads(supabaseUrl: string, serviceRoleKey: string): PublicProjectReads {
  const url = `${supabaseUrl.replace(/\/$/, '')}/rest/v1/rpc/read_public_project`;
  return {
    source: async (projectId): Promise<ReadResult<PublicProjectSource>> => {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          apikey: serviceRoleKey,
          Authorization: `Bearer ${serviceRoleKey}`,
        },
        body: JSON.stringify({ p_project_id: projectId }),
      });
      const text = await response.text();
      if (!response.ok) return { ok: false, detail: text };
      try {
        const parsed: unknown = JSON.parse(text);
        if (!Array.isArray(parsed)) return { ok: false, detail: text };
        return { ok: true, rows: parsed as PublicProjectSource[] };
      } catch {
        return { ok: false, detail: text };
      }
    },
  };
}

/** Read a JSON request body, or refuse — a malformed body must not read as an empty one. */
export async function readJsonBody(request: Request): Promise<{ ok: true; value: Record<string, unknown> } | { ok: false; reason: string }> {
  let text: string;
  try {
    text = await request.text();
  } catch {
    return { ok: false, reason: 'the request body could not be read' };
  }
  if (text.trim() === '') return { ok: true, value: {} };
  try {
    const parsed = JSON.parse(text) as unknown;
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      return { ok: false, reason: 'the request body must be a JSON object' };
    }
    return { ok: true, value: parsed as Record<string, unknown> };
  } catch {
    return { ok: false, reason: 'the request body is not valid JSON' };
  }
}
