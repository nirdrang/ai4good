/**
 * `organization-dashboard` — AT-001.21's "NGO A's non-public data (… dashboard)", as a surface.
 *
 * IT IS NOT A GENERAL READER. It answers ONE projection about ONE organisation, the way
 * `update-organization` refuses to be a general organisation-profile editor. A general reader would
 * satisfy the criterion today and become the leak the criterion is about the moment a column is added
 * to a table it reads.
 *
 * THE DECISION IS THE SHARED MODULE'S — `tenantReadAllowed` in `../_shared/visibility.ts`, the same
 * function the acceptance suite drives at both tiers. That is what keeps a loop-tier green a claim
 * about shipped code rather than about a copy.
 *
 * ============================================================================================
 * THE READ ORDER IS THE NO-EXISTENCE-ORACLE PROPERTY. DO NOT MOVE THE TARGET READ.
 * ============================================================================================
 *
 * Four reads, and the organisation row — the TARGET — is the LAST of them. Every read a decision or a
 * projection needs is issued BEFORE it, and NOTHING is read after it.
 *
 *   1. the caller's account row              — keyed on the CALLER
 *   2. the target organisation's seat rows   — keyed on the organisation id, on a DIFFERENT table
 *   3. the target organisation's projects    — keyed on the organisation id, on a DIFFERENT table
 *   4. THE ORGANISATION ROW ITSELF           — the target, last
 *
 * WHY IT MATTERS. If a lookup came AFTER the target read, a fault in it would be reachable only on
 * the path where the target exists: a real foreign identifier would answer 502 while an identifier
 * that names nothing had already answered 404, and those two answers are an existence oracle sitting
 * outside `TENANT_NOT_FOUND`. With nothing after the target read, a fault answers the same 502 either
 * way, by construction rather than by care.
 *
 * IT DOES COST A READ THE ANSWER MAY NOT USE — the projects of an organisation this caller will be
 * refused. That is not waste, it IS the property: the work the surface does is the same whatever the
 * answer turns out to be.
 */

import type { AccountType } from '../_shared/accounts.ts';
import {
  edgeHandler,
  json,
  readJsonBody,
  readRows,
  refusal,
  requireEnv,
  resolveCaller,
} from '../_shared/edge.ts';
import { parseOrgRole } from '../_shared/memberships.ts';
import { TENANT_NOT_FOUND, tenantReadAllowed } from '../_shared/visibility.ts';

const SUPABASE_URL = requireEnv('SUPABASE_URL');
const ANON_KEY = requireEnv('SUPABASE_ANON_KEY', 'SUPABASE_PUBLISHABLE_KEY');
const SERVICE_ROLE_KEY = requireEnv('SUPABASE_SERVICE_ROLE_KEY', 'SUPABASE_SECRET_KEY');

/**
 * WHAT AN OUTAGE ANSWERS, and it names no identifier.
 *
 * The sentence is the SAME for every target, which is the half of the property this constant carries:
 * two faulted reads must be indistinguishable, and a reason that quoted the organisation id would
 * make them distinguishable while looking helpful.
 */
function readFailed(): Response {
  return json(
    { ok: false, reason: 'the organisation dashboard could not read what it needs, so no decision was made' },
    502,
  );
}

Deno.serve(edgeHandler('organization-dashboard', async (request: Request): Promise<Response> => {
  if (request.method !== 'POST') return refusal('organization-dashboard accepts POST only', 405);

  const caller = await resolveCaller(request, SUPABASE_URL, ANON_KEY);
  if (!caller) return refusal('authenticate before reading an organisation dashboard', 401);

  const body = await readJsonBody(request);
  if (!body.ok) return refusal(body.reason, 400);

  const rawId = body.value.organizationId;
  if (typeof rawId !== 'string' || rawId.trim() === '') {
    return refusal('an organisation dashboard read must name the organisation to read', 400);
  }
  const organizationId = rawId.trim();

  // READ 1 — the caller's own account row.
  const accountRead = await readRows(SUPABASE_URL, SERVICE_ROLE_KEY, `accounts?id=eq.${encodeURIComponent(caller.id)}&select=account_type`);
  if (!accountRead.ok) return readFailed();
  const accountType = accountRead.rows[0]?.account_type;

  // READ 2 — the target organisation's seat. It is keyed on the organisation id and reads a
  // DIFFERENT table, so it says nothing about whether the organisation row exists, and it is issued
  // before the target read for exactly that reason.
  const seatRead = await readRows(
    SUPABASE_URL,
    SERVICE_ROLE_KEY,
    `org_memberships?org_id=eq.${encodeURIComponent(organizationId)}&select=account_id,role`,
  );
  if (!seatRead.ok) return readFailed();
  const seatRow = seatRead.rows[0];
  // THE CALLER'S ROLE IN THE TARGET ORGANISATION — one value, found among that organisation's own
  // seats. A v1 NGO is single-seat, so there is at most one row here; the search is written out
  // anyway, because the rule is "the caller's row in THIS organisation" and not "the first row".
  const callerSeat = seatRead.rows.find((row) => row.account_id === caller.id);

  // READ 3 — the projection's projects, keyed on the organisation id, on a DIFFERENT table again.
  const projectRead = await readRows(
    SUPABASE_URL,
    SERVICE_ROLE_KEY,
    `projects?org_id=eq.${encodeURIComponent(organizationId)}&select=id,name,assigned_volunteer_id&order=name`,
  );
  if (!projectRead.ok) return readFailed();

  // READ 4 — THE TARGET, AND IT IS LAST. Nothing is read after this line.
  const organizationRead = await readRows(
    SUPABASE_URL,
    SERVICE_ROLE_KEY,
    `organizations?id=eq.${encodeURIComponent(organizationId)}&select=id,name`,
  );
  if (!organizationRead.ok) return readFailed();
  const organization = organizationRead.rows[0];

  // THE DECISION, COMPUTED FROM VALUES ALREADY IN HAND. `parseOrgRole` is the shipped narrowing, so
  // a role this product does not have cannot widen anything here.
  //
  // THE ACCOUNT TYPE IS CAST, NOT CHECKED, HERE — deliberately, and it is safe for one reason:
  // `tenantReadAllowed` narrows it again with its own fail-closed rule, so a value the product does
  // not have reaches the refusal rather than a branch. Checking it here as well would put a second
  // copy of that rule in a file no type-checker covers, which is the defect the shared module exists
  // to delete.
  const allowed = tenantReadAllowed(
    {
      accountType: typeof accountType === 'string' ? (accountType as AccountType) : null,
      roleInTargetOrganization: parseOrgRole(callerSeat?.role),
      assignedVolunteerOfTargetProject: false,
    },
    'organization',
  );

  // ONE ANSWER FOR BOTH CASES, and the `||` is the whole of the criterion's "no existence oracle"
  // clause: a caller that may not read and a target that is not there receive byte-identical answers,
  // because there is only one constant here to return.
  if (!allowed.ok || organization === undefined) return json(TENANT_NOT_FOUND.body, TENANT_NOT_FOUND.status);

  return json(
    {
      ok: true,
      organizationId: String(organization.id),
      organizationName: String(organization.name),
      seat: seatRow === undefined ? null : { accountId: String(seatRow.account_id), role: seatRow.role },
      projects: projectRead.rows.map((row) => ({
        projectId: String(row.id),
        projectName: String(row.name),
        assignedVolunteerId: row.assigned_volunteer_id === null || row.assigned_volunteer_id === undefined ? null : String(row.assigned_volunteer_id),
      })),
    },
    200,
  );
}));
