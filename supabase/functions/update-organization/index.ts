/**
 * `update-organization` — the ADMIN-ONLY NGO-side action, and the operation AT-001.16 and
 * AT-001.36 are both graded through.
 *
 * WHY A RENAME. AT-001.36 says: "Given an account that is `admin` in NGO A and `member` in NGO B,
 * When it performs an admin-only NGO-side action, Then it succeeds in A but is rejected in B."
 * That needs an action whose TARGET is an organisation the caller is already in — so the same
 * account can attempt it twice and get two different answers. `create-organization` cannot serve:
 * its caller is never already a member of the thing being created. Renaming the organisation is the
 * smallest such action this tree can carry.
 *
 * WHAT IT DELIBERATELY IS NOT. It is not a general organisation-profile editor: one field, one
 * write. Columns nothing enforces and fields no criterion reads would look like a requirement being
 * met and would not be one.
 *
 * THE TWO DECISIONS ARE THE SHARED MODULES', not this file's — `orgAdminActionAllowed` in
 * `../_shared/memberships.ts` and `validateOrganizationName` in `../_shared/accounts.ts`, the same
 * two functions the acceptance suite drives. That is what keeps the loop-tier green a claim about
 * shipped code instead of about a copy.
 *
 * THE REFUSAL CARRIES A `kind` ON THE WIRE, which the other two functions do not. It is not
 * decoration: AT-001.16's refusal must be the not-a-member one and AT-001.36's must be the
 * not-an-admin one, and a caller that could only read a sentence would have to pattern-match
 * English to tell them apart. The kind is the shipped decision's own field, passed through
 * unchanged.
 */

import { validateOrganizationName } from '../_shared/accounts.ts';
import { orgAdminActionAllowed, parseOrgRole } from '../_shared/memberships.ts';
import {
  callDatabaseFunction,
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

/**
 * The caller's role IN THE TARGET ORGANISATION, read from `public.org_memberships` with the service
 * role — the grant this leaf's migration adds, and the only new table privilege it adds.
 *
 * THREE OUTCOMES, NOT TWO, for the reason `create-organization`'s account read gives: `absent` is a
 * real and distinct state (the caller holds no membership in this organisation, which is exactly
 * what AT-001.16's refusal is about), while `failed` means the read did not happen and this
 * function knows nothing either way. Collapsing the second into the first would answer "you are not
 * a member" to a caller whose database was unreachable — a refusal naming the wrong thing to fix,
 * and one that an acceptance test would read as the isolation property holding.
 */
type RoleLookup =
  | { kind: 'found'; role: 'admin' | 'member' }
  | { kind: 'absent' }
  | { kind: 'failed'; detail: string };

async function roleIn(organizationId: string, accountId: string): Promise<RoleLookup> {
  const response = await fetch(
    `${SUPABASE_URL}/rest/v1/org_memberships` +
      `?org_id=eq.${encodeURIComponent(organizationId)}` +
      `&account_id=eq.${encodeURIComponent(accountId)}` +
      `&select=role`,
    {
      headers: {
        apikey: SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
        Accept: 'application/json',
      },
    },
  );
  if (!response.ok) return { kind: 'failed', detail: `the membership read answered ${response.status}` };
  const rows = (await response.json()) as { role?: unknown }[];
  // THE NARROWING IS THE SHARED MODULE'S. No type-checker covers this file, so a comparison written
  // here against a string literal is a rule nothing checks; `parseOrgRole` is in the strict
  // acceptance program and fails closed on every value it does not recognise.
  const role = parseOrgRole(rows[0]?.role);
  return role === null ? { kind: 'absent' } : { kind: 'found', role };
}

Deno.serve(edgeHandler('update-organization', async (request: Request): Promise<Response> => {
  if (request.method !== 'POST') return refusal('update-organization accepts POST only', 405);

  const caller = await resolveCaller(request, SUPABASE_URL, ANON_KEY);
  if (!caller) return refusal('authenticate before renaming an organisation', 401);

  const body = await readJsonBody(request);
  if (!body.ok) return refusal(body.reason, 400);

  const organizationId = body.value.organizationId;
  if (typeof organizationId !== 'string' || organizationId.trim() === '') {
    return json({ ok: false, kind: 'refused', reason: 'an organisation rename must name the organisation to rename' }, 400);
  }

  const lookup = await roleIn(organizationId.trim(), caller.id);
  // A failed read is an outage, not a judgement about this caller's standing, so it answers 502 and
  // says so — and it carries `refused` rather than either meaningful kind, so no acceptance body can
  // read an outage as the isolation property holding.
  if (lookup.kind === 'failed') {
    return json(
      { ok: false, kind: 'refused', reason: `the caller's membership could not be read, so no decision was made: ${lookup.detail}` },
      502,
    );
  }

  // THE DECISION, AND IT IS THE SHARED MODULE'S. `absent` becomes `null`, which is the argument that
  // produces the not-a-member refusal; a found `member` produces the not-an-admin one. Both kinds
  // travel to the caller unchanged.
  const allowed = orgAdminActionAllowed(lookup.kind === 'found' ? lookup.role : null);
  if (!allowed.ok) return json({ ok: false, kind: allowed.kind, reason: allowed.reason }, 403);

  // THE NAME RULE IS THE SHARED MODULE'S TOO, and it is consulted AFTER authorisation for the same
  // reason `create-organization` consults it last: a caller with no standing in this organisation
  // learns nothing about whether its name would have been accepted.
  const name = validateOrganizationName(body.value.name);
  if (!name.ok) return json({ ok: false, kind: 'invalid-name', reason: name.reason }, 400);

  const outcome = await callDatabaseFunction(SUPABASE_URL, SERVICE_ROLE_KEY, 'update_organization', {
    p_account_id: caller.id,
    p_organization_id: organizationId.trim(),
    p_name: name.value,
  });

  if (!outcome.ok) {
    const status = outcome.status >= 400 && outcome.status < 500 ? 409 : 502;
    // The database's backstop fired, which means something reached it that the decisions above
    // permitted — a disagreement between this function and the database. It is `refused` rather
    // than a meaningful kind precisely so that disagreement cannot be read as either criterion's
    // refusal.
    return json({ ok: false, kind: 'refused', reason: outcome.message }, status);
  }

  const result = outcome.value as { organization_id?: string; name?: string } | null;
  return json({ ok: true, organizationId: result?.organization_id ?? organizationId.trim(), name: result?.name ?? name.value }, 200);
}));
