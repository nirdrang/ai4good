/**
 * WHO IS CALLING, AS A DECISION — the judgement `resolveCaller` used to make inside `edge.ts`.
 *
 * AT-001.12's enforcement point at every deployed function is the caller resolution: Supabase Auth
 * refuses a dead token, and the function must then refuse the write. That judgement used to live in
 * `supabase/functions/_shared/edge.ts`, which NO TYPE-CHECKER COVERS (its own header states the
 * measurement) and which NO TEST CAN IMPORT (it is Deno-only). So the one rule the whole session
 * layer rests on had no oracle at all. This module is that rule, moved to where a test can reach it.
 *
 * THE SPLIT IS JUDGEMENT HERE, I/O THERE. `resolveCaller` keeps the `fetch` to `/auth/v1/user` and
 * hands the ANSWER — a status and a body — to `callerFromAuthAnswer` below. Nothing in this file
 * performs I/O, so the same judgement can be replayed by a test with no network and no database,
 * and by the acceptance fixture on every validated path.
 *
 * TWO CONSTRAINTS THIS FILE IS UNDER, the same two `accounts.ts`, `github.ts` and `verification.ts`
 * are under, and both are real rather than stylistic:
 *
 *   1. ZERO NON-RELATIVE IMPORTS AND NO DENO GLOBAL. It is compiled by `tests/at/tsconfig.json`
 *      (`strict`, `skipLibCheck: false`, `types: ["node"]`, no DOM library) and it is also run by
 *      Deno inside the edge runtime. A bare `jsr:`/`npm:` specifier or a `Deno` reference would
 *      resolve in neither. The intersection of the two is plain TypeScript over plain data.
 *   2. NO I/O, NO CLOCK, NO RANDOMNESS. The one function below is pure.
 *
 * WHICH PROGRAM TYPE-CHECKS IT: the `tests/at` one, and only that one. It reaches that strict
 * program by being imported from `tests/at/suites/req-001/_fixture.ts` and from
 * `tests/at/harness/shipped-caller.selftest.ts`, exactly as `verification.ts` does, and those two
 * imports are the whole of its type coverage.
 *
 * ============================================================================================
 * IT FAILS CLOSED, AND THE PROMISE HAS AN ORACLE RATHER THAN ONLY THIS PARAGRAPH.
 * ============================================================================================
 *
 * Every answer that is not a 2xx carrying a string `id` yields `null`, and a `null` caller is a
 * REFUSAL at every call site — both deployed functions return 401 on it, and the acceptance
 * fixture refuses the write without performing it. A non-2xx status, a missing `id`, an `id` that
 * is not a string, a `null` body, a body that is not an object at all: all `null`.
 * `tests/at/harness/shipped-caller.selftest.ts` drives every one of those shapes directly, for the
 * reason `shipped-verification.selftest.ts` gives: a promise with no oracle is an untrue stated
 * fact waiting to happen, and the fixture cannot reach these shapes because the fixture builds
 * well-formed ones.
 *
 * WHAT A LOOP-TIER GREEN OVER THIS FUNCTION CLAIMS: that the judgement every deployed function runs
 * on every authenticated request answers as this header says, byte for byte the same code. WHAT IT
 * DOES NOT CLAIM: that Supabase Auth really answers 401 for a revoked or expired token. That is a
 * prediction of the vendor, and it is measured on the live stack — `loop/items/AI4DEV-60/proof-local.ts`
 * checks (c) and (d) drive a DEPLOYED function with a revoked token and with an expired one.
 */

import { extractGithubHandle } from './github.ts';

/**
 * WHAT IS TRUE OF THE CALLER, as Supabase Auth answers it — never what the caller SAID.
 *
 * This type used to be declared in `edge.ts`. It moved here with the judgement that produces it,
 * because a type and the only function that constructs it belong in one file; `edge.ts` re-exports
 * it so neither deployed function changes an import.
 */
export type Caller = {
  /** the auth user's id, which is also the `public.accounts` primary key once signup completes */
  id: string;
  /**
   * The handle of a GitHub identity Auth has linked to this user, or `null` — the FACT the volunteer
   * signup gate turns on.
   *
   * It is a property of the user, not of the session: an email- or Google-established session whose
   * user later links GitHub carries a handle here while its establishing provider is unchanged.
   */
  githubHandle: string | null;
};

/**
 * Which HTTP statuses are an answer rather than a refusal — the same range `Response.ok` covers.
 *
 * It is spelled out rather than left to `response.ok` because this module never sees a `Response`:
 * it sees the status the caller read off one. The two must agree, and 200 to 299 is what `ok` is.
 */
function isSuccessStatus(status: number): boolean {
  return status >= 200 && status <= 299;
}

/**
 * The caller Supabase Auth's `/auth/v1/user` answer describes, or `null` — judged from the status
 * and the body, and from nothing else.
 *
 * IT TAKES `unknown` FOR THE BODY ON PURPOSE, exactly as `extractGithubHandle` and
 * `emailVerifiedFromUser` do. The argument is a JSON body that crossed a network; typing the
 * parameter as a tidy record would be a claim about somebody else's server, so every step down into
 * it is checked here instead.
 *
 * A NON-2xx IS THE WHOLE OF THE SESSION LAYER'S ENFORCEMENT at this boundary, and it is worth being
 * exact about why this function does not look at the token. Auth decides whether a token is live:
 * a revoked session, an expired access token, a signature that does not verify and a token for a
 * deleted user all come back as a refusal status. This module never parses a token, never reads an
 * expiry claim, and holds no clock — so there is no second opinion here to drift from Auth's.
 *
 * THE HANDLE IS DERIVED, NOT PASSED IN. `extractGithubHandle` is given the WHOLE body rather than a
 * pre-narrowed field, for the reason its own header gives: the judgement about what counts as a
 * linked GitHub identity has one home. This matters more since the extraction moved out of
 * `edge.ts`, because the bridge left behind is untyped — a delegation that handed this function
 * `{ id }` instead of the complete body would return a caller with `githubHandle: null` and refuse
 * every linked volunteer at the deployed edge. `loop/items/AI4DEV-60/proof-local.ts` check (g) is
 * the live control that fails on exactly that mistake.
 *
 * A BLANK `id` IS ACCEPTED, and that is stated rather than left to be discovered. `''` is a string,
 * so it passes — which is what `resolveCaller` did before this module existed, and this refactor
 * preserves the deployed behaviour rather than tightening it. Nothing turns on it: GoTrue answers a
 * uuid, and an empty id reaching `public.complete_signup` fails the database's own `uuid` cast. A
 * leaf that wants blank refused should say so as a decision, not acquire it as a side effect of
 * moving code.
 */
export function callerFromAuthAnswer(status: number, user: unknown): Caller | null {
  if (!isSuccessStatus(status)) return null;
  // `typeof null === 'object'`, so the null check is not decoration: without it the property read
  // below throws, and a throw on the write path is not a refusal.
  if (typeof user !== 'object' || user === null) return null;
  const id = (user as { id?: unknown }).id;
  if (typeof id !== 'string') return null;
  return { id, githubHandle: extractGithubHandle(user) };
}
