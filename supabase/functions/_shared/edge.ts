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
 * edge-function entry point or this module. What covers them instead is that both functions are
 * served and exercised against the live stack in `loop/items/AI4DEV-57/proof-local.ts` — weaker in
 * some ways and stronger in others, and named honestly either way.
 */

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

export function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

/** A refusal a caller can act on: the reason travels, never a bare status. */
export function refusal(reason: string, status: number): Response {
  return json({ ok: false, reason }, status);
}

export type Caller = {
  /** the auth user's id, which is also the `public.accounts` primary key once signup completes */
  id: string;
  email: string;
  /** how the session was established, as Supabase Auth recorded it: `email`, `google`, … */
  provider: string;
};

/**
 * WHO IS CALLING — answered by Supabase Auth, never by this function.
 *
 * `verify_jwt = true` in `config.toml` means the platform has already verified the token's
 * signature before this code runs. That still leaves the question of which user it belongs to, and
 * the cheap answer — decode the payload and read `sub` — would mean trusting a base64 blob because
 * something upstream is believed to have checked it. So the token is presented to `/auth/v1/user`
 * instead and Auth answers. One extra round trip, no cryptography in our code, and no dependency:
 * `fetch` is enough.
 */
export async function resolveCaller(request: Request, supabaseUrl: string, anonKey: string): Promise<Caller | null> {
  const authorization = request.headers.get('Authorization');
  if (!authorization) return null;

  const response = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: { Authorization: authorization, apikey: anonKey },
  });
  if (!response.ok) return null;

  const user = (await response.json()) as {
    id?: unknown;
    email?: unknown;
    app_metadata?: { provider?: unknown } | null;
  };
  if (typeof user.id !== 'string') return null;

  return {
    id: user.id,
    email: typeof user.email === 'string' ? user.email : '',
    provider: typeof user.app_metadata?.provider === 'string' ? user.app_metadata.provider : 'email',
  };
}

/**
 * The address the request came from — AT-001.01 records it on the acknowledgment.
 *
 * `x-forwarded-for` may carry a chain; the FIRST entry is the original client and the rest are
 * proxies. `null` rather than a placeholder when there is nothing to record: `public.acknowledgments`
 * permits a null `ip`, and inventing `0.0.0.0` would put a value in the column that reads like a
 * measurement and is not one.
 */
export function callerIp(request: Request): string | null {
  const forwarded = request.headers.get('x-forwarded-for');
  const first = forwarded?.split(',')[0]?.trim();
  return first && first !== '' ? first : null;
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
