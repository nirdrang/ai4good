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
 * reports about the user, `writeRoute` reads it through `resolveCaller`, and a volunteer completion
 * turns on it — AT-001.04. Linking itself happens inside Supabase Auth and reaches no code here, so
 * the completion request is the only server-observable moment at which the mandatory link is
 * satisfied; that is why the onboarding import fires here and not at some link event nothing can
 * observe.
 */

import { decideSignupCompletion } from '../_shared/accounts.ts';
import { writeRoute } from '../_shared/edge.ts';

Deno.serve(writeRoute({
  name: 'complete-signup',
  decide: decideSignupCompletion,
  render: (value) => {
    const result = value as { account_id?: string; account_type?: string; organization_id?: string | null } | null;
    return {
      accountId: result?.account_id ?? null,
      accountType: result?.account_type ?? null,
      organizationId: result?.organization_id ?? null,
    };
  },
}));
