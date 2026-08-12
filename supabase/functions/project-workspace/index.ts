/**
 * `project-workspace` — AT-001.22's "that project's non-public data" and AT-001.23's "that project's
 * working data", which are the denial and the grant of ONE rule.
 *
 * WHOSE SURFACE THIS IS. The workspace is the ASSIGNED DEVELOPER's, and the owning NGO reads its
 * projects through `organization-dashboard` instead. That split is the shared module's rule, not this
 * file's: `tenantReadAllowed(viewer, 'project')` admits the project's assigned developer and the
 * platform administrator, and `tenantReadAllowed(viewer, 'organization')` admits the organisation's
 * seat. Two scopes, two viewer kinds, one function.
 *
 * ============================================================================================
 * THE TARGET IS READ LAST HERE TOO, AND HERE IT IS ALSO A DECISION INPUT
 * ============================================================================================
 *
 * Two reads: the caller's account row, then the project. Whether the caller is the project's assigned
 * developer is a fact carried BY the project row, so the target read is both the last read and one of
 * the decision's inputs — which is consistent rather than an exception. The constraint is that
 * NOTHING is read after the target, so a fault answers the same 502 for a real foreign project and
 * for an identifier that names nothing. The decision is then computed from values already in hand.
 *
 * SO THERE IS NO MEMBERSHIP READ ON THIS PATH AT ALL, and that is worth saying because its absence
 * looks like an omission. A membership read would have to be keyed on the project's owning
 * organisation, which is only known AFTER the project row is read — and a read after the target read
 * is exactly what the ordering forbids. The rule this surface serves does not need one.
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
import { TENANT_NOT_FOUND, tenantReadAllowed } from '../_shared/visibility.ts';

const SUPABASE_URL = requireEnv('SUPABASE_URL');
const ANON_KEY = requireEnv('SUPABASE_ANON_KEY', 'SUPABASE_PUBLISHABLE_KEY');
const SERVICE_ROLE_KEY = requireEnv('SUPABASE_SERVICE_ROLE_KEY', 'SUPABASE_SECRET_KEY');

/** An outage, naming no identifier — see `organization-dashboard` for why the sentence is fixed. */
function readFailed(): Response {
  return json(
    { ok: false, reason: 'the project workspace could not read what it needs, so no decision was made' },
    502,
  );
}

Deno.serve(edgeHandler('project-workspace', async (request: Request): Promise<Response> => {
  if (request.method !== 'POST') return refusal('project-workspace accepts POST only', 405);

  const caller = await resolveCaller(request, SUPABASE_URL, ANON_KEY);
  if (!caller) return refusal('authenticate before reading a project workspace', 401);

  const body = await readJsonBody(request);
  if (!body.ok) return refusal(body.reason, 400);

  const rawId = body.value.projectId;
  if (typeof rawId !== 'string' || rawId.trim() === '') {
    return refusal('a project workspace read must name the project to read', 400);
  }
  const projectId = rawId.trim();

  // READ 1 — the caller's own account row, keyed on the caller.
  const accountRead = await readRows(SUPABASE_URL, SERVICE_ROLE_KEY, `accounts?id=eq.${encodeURIComponent(caller.id)}&select=account_type`);
  if (!accountRead.ok) return readFailed();
  const accountType = accountRead.rows[0]?.account_type;

  // READ 2 — THE TARGET, AND IT IS LAST. Nothing is read after this line.
  const projectRead = await readRows(
    SUPABASE_URL,
    SERVICE_ROLE_KEY,
    `projects?id=eq.${encodeURIComponent(projectId)}&select=id,org_id,name,assigned_volunteer_id`,
  );
  if (!projectRead.ok) return readFailed();
  const project = projectRead.rows[0];

  // THE DECISION, COMPUTED FROM VALUES ALREADY IN HAND. The seat comparison is `=== caller.id` — the
  // id Supabase Auth answered with, never one the request carried.
  const allowed = tenantReadAllowed(
    {
      accountType: typeof accountType === 'string' ? (accountType as AccountType) : null,
      roleInTargetOrganization: null,
      assignedVolunteerOfTargetProject: project !== undefined && project.assigned_volunteer_id === caller.id,
    },
    'project',
  );

  // ONE ANSWER FOR BOTH CASES — the unassigned volunteer and the project that is not there.
  if (!allowed.ok || project === undefined) return json(TENANT_NOT_FOUND.body, TENANT_NOT_FOUND.status);

  return json(
    {
      ok: true,
      projectId: String(project.id),
      projectName: String(project.name),
      organizationId: String(project.org_id),
      assignedVolunteerId: project.assigned_volunteer_id === null || project.assigned_volunteer_id === undefined ? null : String(project.assigned_volunteer_id),
    },
    200,
  );
}));
