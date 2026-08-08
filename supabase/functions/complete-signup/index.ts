/**
 * `complete-signup` — turn an authenticated auth user into a typed account.
 *
 * THE CALLER HAS ALREADY AUTHENTICATED before it reaches here, and how is not this function's
 * business: an email and a password through `auth.signUp`, or a Google consent round trip through
 * the OAuth redirect. Neither is a database call, so the standing rule that UI never touches the
 * database directly holds — and this is exactly why AT-001.01 (email) and AT-001.03 (Google) are the
 * SAME code path. The difference between them is upstream, in how the session was obtained.
 *
 * WHAT IT DOES: sets the global account type once, and for an NGO creates the organisation, the
 * `admin` membership and the ToS + Platform Promise acknowledgment with the request's source address
 * and the version of the text that was accepted. All of it through ONE call to
 * `public.complete_signup`, which is one round trip and therefore one transaction — all four rows or
 * none.
 *
 * ONE JOB. A second operation is a second function, never a switch on an action name: see
 * `create-organization` beside this one.
 */

import { validateCompleteSignup } from '../_shared/accounts.ts';
import {
  callDatabaseFunction,
  callerIp,
  json,
  readJsonBody,
  refusal,
  requireEnv,
  resolveCaller,
} from '../_shared/edge.ts';

const SUPABASE_URL = requireEnv('SUPABASE_URL');
const ANON_KEY = requireEnv('SUPABASE_ANON_KEY', 'SUPABASE_PUBLISHABLE_KEY');
const SERVICE_ROLE_KEY = requireEnv('SUPABASE_SERVICE_ROLE_KEY', 'SUPABASE_SECRET_KEY');

Deno.serve(async (request: Request): Promise<Response> => {
  if (request.method !== 'POST') return refusal('complete-signup accepts POST only', 405);

  const caller = await resolveCaller(request, SUPABASE_URL, ANON_KEY);
  if (!caller) return refusal('authenticate before completing signup', 401);

  const body = await readJsonBody(request);
  if (!body.ok) return refusal(body.reason, 400);

  // EVERY JUDGEMENT IS THE SHARED MODULE'S. `validateCompleteSignup` decides the account type, the
  // organisation-name rule for each type and the acknowledgment text version — and it is the same
  // module the acceptance suite drives, which is what makes that suite's green a statement about
  // this code rather than about a re-implementation living in a test fixture.
  const decision = validateCompleteSignup({
    accountType: body.value.accountType,
    organizationName: body.value.organizationName,
    acknowledgmentTextVersion: body.value.acknowledgmentTextVersion,
  });
  if (!decision.ok) return refusal(decision.reason, 400);

  const { accountType, organizationName, acknowledgmentTextVersion } = decision.value;

  const outcome = await callDatabaseFunction(SUPABASE_URL, SERVICE_ROLE_KEY, 'complete_signup', {
    p_account_id: caller.id,
    p_account_type: accountType,
    p_organization_name: organizationName,
    p_acknowledgment_text_version: acknowledgmentTextVersion,
    p_ip: callerIp(request),
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
});
