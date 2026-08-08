/**
 * `create-organization` — the NGO-only action, and the reason it exists is worth stating.
 *
 * AT-001.06 says: "Given an existing account of type `volunteer`, When it attempts an NGO-only
 * action (create an org profile / project need), Then the action is rejected." Without an operation
 * to attempt, the acceptance test could only have called `ngoOnlyActionAllowed` directly — which
 * proves a helper behaves and says nothing about an application boundary. This function is the
 * boundary the test drives.
 *
 * TWO BOUNDARIES ON IT, because reading more into the criterion than it says would be inventing a
 * requirement:
 *   * The PROJECT-NEED half of the criterion's parenthesis is not built. No project or need table
 *     exists in the tree and creating one belongs to another requirement.
 *   * There is NO acknowledgment gate here. AT-001.01 requires the acknowledgment before PROJECT
 *     creation, not before organisation creation. `public.has_platform_acknowledgment` is the hook
 *     for the leaf that lands project creation; putting it in front of this operation would be a
 *     gate the acceptance text does not ask for.
 *
 * THE REFUSAL IS THE SHARED MODULE'S, not this file's — `ngoOnlyActionAllowed` in
 * `../_shared/accounts.ts`, the same function the acceptance suite drives. That is what keeps the
 * loop-tier test exercising shipped logic instead of a copy.
 */

import { ngoOnlyActionAllowed } from '../_shared/accounts.ts';
import {
  callDatabaseFunction,
  json,
  readJsonBody,
  refusal,
  requireEnv,
  resolveCaller,
} from '../_shared/edge.ts';

const SUPABASE_URL = requireEnv('SUPABASE_URL');
const ANON_KEY = requireEnv('SUPABASE_ANON_KEY', 'SUPABASE_PUBLISHABLE_KEY');
const SERVICE_ROLE_KEY = requireEnv('SUPABASE_SERVICE_ROLE_KEY', 'SUPABASE_SECRET_KEY');

/**
 * The caller's global account type, read from `public.accounts` with the service role.
 *
 * `null` means the row is absent, which is a real and distinct state: an authenticated user who has
 * not completed signup. It is not an error, and conflating it with "not an NGO" would give that
 * caller a refusal that told them the wrong thing to fix.
 */
async function accountTypeOf(accountId: string): Promise<string | null> {
  const response = await fetch(
    `${SUPABASE_URL}/rest/v1/accounts?id=eq.${encodeURIComponent(accountId)}&select=account_type`,
    {
      headers: {
        apikey: SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
        Accept: 'application/json',
      },
    },
  );
  if (!response.ok) return null;
  const rows = (await response.json()) as { account_type?: unknown }[];
  const type = rows[0]?.account_type;
  return typeof type === 'string' ? type : null;
}

Deno.serve(async (request: Request): Promise<Response> => {
  if (request.method !== 'POST') return refusal('create-organization accepts POST only', 405);

  const caller = await resolveCaller(request, SUPABASE_URL, ANON_KEY);
  if (!caller) return refusal('authenticate before creating an organisation', 401);

  const accountType = await accountTypeOf(caller.id);
  if (accountType === null) return refusal('complete signup before creating an organisation', 409);

  const allowed = ngoOnlyActionAllowed(accountType);
  if (!allowed.ok) return refusal(allowed.reason, 403);

  const body = await readJsonBody(request);
  if (!body.ok) return refusal(body.reason, 400);

  const rawName = body.value.name;
  if (typeof rawName !== 'string' || rawName.trim() === '') {
    return refusal('an organisation needs a non-empty name', 400);
  }

  // ONE ROUND TRIP, for the same reason `complete-signup` uses one: the organisation and its admin
  // membership are two writes, and issuing them as two Data API calls would be two transactions —
  // a failure between them leaves an organisation nobody is a member of, which no acceptance
  // criterion describes and nothing would repair.
  const outcome = await callDatabaseFunction(SUPABASE_URL, SERVICE_ROLE_KEY, 'create_organization', {
    p_account_id: caller.id,
    p_name: rawName,
  });

  if (!outcome.ok) {
    const status = outcome.status >= 400 && outcome.status < 500 ? 409 : 502;
    return refusal(outcome.message, status);
  }

  const result = outcome.value as { organization_id?: string } | null;
  return json({ ok: true, organizationId: result?.organization_id ?? null }, 200);
});
