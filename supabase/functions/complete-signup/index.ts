/**
 * `complete-signup` — turn an authenticated auth user into a typed account.
 *
 * THE CALLER HAS ALREADY AUTHENTICATED before it reaches here, and how is not this function's
 * business: an email and a password through `auth.signUp`, or a Google or GitHub consent round trip
 * through the OAuth redirect. Neither is a database call, so the standing rule that UI never touches
 * the database directly holds — and this is exactly why AT-001.01 (email), AT-001.03 (Google) and
 * AT-001.02 (GitHub) are the SAME code path. The difference between them is upstream, in how the
 * session was obtained.
 *
 * WHAT IS *NOT* UPSTREAM is whether a GitHub identity is LINKED to the caller. That is a fact Auth
 * reports about the user, this function reads it through `resolveCaller`, and a volunteer completion
 * turns on it — AT-001.04. Linking itself happens inside Supabase Auth and reaches no code here, so
 * the completion request is the only server-observable moment at which the mandatory link is
 * satisfied; that is why the onboarding import fires here and not at some link event nothing can
 * observe.
 *
 * WHAT IT DOES: sets the global account type once, and for an NGO creates the organisation, the
 * `admin` membership and the ToS + Platform Promise acknowledgment with the address the gateway
 * chain reported — NOT a verified source address; see `callerIp` in `../_shared/edge.ts` for the
 * trust boundary and the measurement behind it — and the version of the text that was accepted, and
 * WHO MADE IT: the person's name, their title, and the authority statement they affirmed (AT-001.19).
 * and for a volunteer writes the imported GitHub profile. All of it through ONE call to
 * `public.complete_signup`, which is one round trip and therefore one transaction — every row or
 * none.
 *
 * ONE JOB. A second operation is a second function, never a switch on an action name: see
 * `create-organization` beside this one.
 */

import { validateCompleteSignup } from '../_shared/accounts.ts';
import { stubGithubStatsFor } from '../_shared/github.ts';
import {
  callDatabaseFunction,
  callerIp,
  edgeHandler,
  json,
  readJsonBody,
  refusal,
  requireEnv,
  resolveCaller,
} from '../_shared/edge.ts';

const SUPABASE_URL = requireEnv('SUPABASE_URL');
const ANON_KEY = requireEnv('SUPABASE_ANON_KEY', 'SUPABASE_PUBLISHABLE_KEY');
const SERVICE_ROLE_KEY = requireEnv('SUPABASE_SERVICE_ROLE_KEY', 'SUPABASE_SECRET_KEY');

// `edgeHandler` answers the browser preflight and turns anything thrown into a shaped 502 — see its
// own comment for why both belong to every entry point here rather than to this one.
Deno.serve(edgeHandler('complete-signup', async (request: Request): Promise<Response> => {
  if (request.method !== 'POST') return refusal('complete-signup accepts POST only', 405);

  const caller = await resolveCaller(request, SUPABASE_URL, ANON_KEY);
  if (!caller) return refusal('authenticate before completing signup', 401);

  const body = await readJsonBody(request);
  if (!body.ok) return refusal(body.reason, 400);

  // EVERY JUDGEMENT IS THE SHARED MODULE'S. `validateCompleteSignup` decides the account type, the
  // organisation-name rule for each type, the acknowledgment text version and — since the GitHub
  // leaf — whether a volunteer may complete at all — and it is the same module the acceptance suite
  // drives, which is what makes that suite's green a statement about this code rather than about a
  // re-implementation living in a test fixture.
  //
  // THE SECOND ARGUMENT IS THE CALLER FACT, AND IT COMES FROM `resolveCaller`, which got it from
  // Auth. Note what is NOT here: no `body.value.githubHandle`. A handle taken from the request body
  // would be a client asserting its own identity, and a gate built on that gates nothing.
  const decision = validateCompleteSignup(
    {
      accountType: body.value.accountType,
      organizationName: body.value.organizationName,
      acknowledgmentTextVersion: body.value.acknowledgmentTextVersion,
      // WHO IS SIGNING — AT-001.19. These three ARE request fields, and that is right: unlike the
      // GitHub handle above, they are things the person states about themselves at the moment of
      // acknowledging, and no fact Auth holds could supply them. What keeps them honest is the
      // shared module: it refuses a missing or blank one, and it refuses an attestation that is not
      // the shipped authority statement, so a client cannot assert an authority nobody offered.
      signerName: body.value.signerName,
      signerTitle: body.value.signerTitle,
      authorityAttestation: body.value.authorityAttestation,
    },
    { githubHandle: caller.githubHandle },
  );
  if (!decision.ok) return refusal(decision.reason, 400);

  const {
    accountType,
    organizationName,
    acknowledgmentTextVersion,
    githubHandle,
    signerName,
    signerTitle,
    authorityAttestation,
  } = decision.value;

  // THE ONBOARDING IMPORT, FIRED HERE — AT-001.05. The handle is the JUDGED one, so the stats are
  // computed for the identity the gate actually accepted rather than for one this function re-derived.
  //
  // It is a STUB SOURCE and the module says so at length: no request leaves this process to reach
  // GitHub. What is real is that the stats travel into the same rpc call as the account, and
  // therefore into the same transaction — there is no queue and no second request, which is what
  // makes AT-001.05's "a queued-but-empty import fails this test" unrepresentable rather than merely
  // untested. `null` throughout for an NGO, which the database function requires.
  const githubStats = githubHandle === null ? null : stubGithubStatsFor(githubHandle);

  // THE FOUR GITHUB KEYS ARE OMITTED ENTIRELY WHEN THERE IS NO HANDLE, rather than sent as nulls,
  // and the difference is a DEPLOYMENT property rather than a stylistic one.
  //
  // The database plane and this plane deploy separately. `public.complete_signup` gives its four new
  // parameters `default null`, so a call carrying only the ORIGINAL FIVE named arguments resolves
  // against either version of the function — which means an NGO completion sent from here keeps
  // working while a migration is rolling, in either order. Sending `p_github_handle: null` instead
  // would name an argument the older function does not have, and PostgREST would fail to resolve the
  // call: same intent, and the NGO signup path broken for the length of the window.
  //
  // The database sees no difference in the new-plane case: an omitted argument arrives as the
  // default, which is null, which is exactly what the NGO branch requires.
  const githubArguments = githubHandle === null
    ? {}
    : {
      p_github_handle: githubHandle,
      p_github_top_languages: githubStats?.topLanguages ?? null,
      p_github_repository_count: githubStats?.repositoryCount ?? null,
      p_github_contribution_summary: githubStats?.contributionSummary ?? null,
    };

  const outcome = await callDatabaseFunction(SUPABASE_URL, SERVICE_ROLE_KEY, 'complete_signup', {
    p_account_id: caller.id,
    p_account_type: accountType,
    p_organization_name: organizationName,
    p_acknowledgment_text_version: acknowledgmentTextVersion,
    p_ip: callerIp(request),
    // THE JUDGED VALUES, NEVER THE RAW BODY ONES — the same posture `githubHandle` travels under.
    // `validateCompleteSignup` trimmed them and pinned the attestation to the shipped statement, so
    // what reaches the row is what the decision was made on rather than what the client typed.
    //
    // THEY ARE ALWAYS SENT, unlike the four github keys. Those are omitted when there is no handle
    // because the columns behind them are nullable and the omission is a real deployment bridge;
    // these three back `not null` columns, so an omitted argument would abort the whole transaction.
    // A completion that reaches this line has all three.
    p_signer_name: signerName,
    p_signer_title: signerTitle,
    p_authority_attestation: authorityAttestation,
    ...githubArguments,
  });

  if (!outcome.ok) {
    // The database's own sentence travels back. `complete_signup` refuses `platform_admin`, a
    // second completion, and a malformed organisation name with messages written to be read by a
    // caller — replacing them with "internal error" would throw away the only thing that says what
    // to do differently. The status is 409 for anything the database judged and 502 for a transport
    // failure, so a client can tell a refusal from an outage.
    const status = outcome.status >= 400 && outcome.status < 500 ? 409 : 502;
    return refusal(outcome.message, status);
  }

  const result = outcome.value as { account_id?: string; account_type?: string; organization_id?: string | null } | null;
  return json(
    {
      ok: true,
      accountId: result?.account_id ?? caller.id,
      accountType: result?.account_type ?? accountType,
      organizationId: result?.organization_id ?? null,
    },
    200,
  );
}));
