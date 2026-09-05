/**
 * Caller-bound tenant reads and the two authenticated surfaces that project them.
 *
 * Pure: relative imports only, no Deno, no I/O. The database already filtered; this module
 * holds no tenant rule.
 */

export type ReadResult<Row> = { ok: true; rows: readonly Row[] } | { ok: false; detail: string };

/** THE ONE refusal for "no such thing" and "not yours". Returned, never thrown: edgeHandler turns a throw into a 502. */
export const TENANT_NOT_FOUND = {
  status: 404,
  body: { ok: false, reason: 'no such thing is visible to this caller' },
} as const;

/** THE ONE outage answer. It names no identifier, so a faulted read is the same bytes for every target. */
export const TENANT_READ_FAILED = {
  status: 502,
  body: { ok: false, reason: 'the read could not complete, so no decision was made' },
} as const;

export type TenantReadAnswer<T> = { status: 200; body: T } | typeof TENANT_NOT_FOUND | typeof TENANT_READ_FAILED;

export type TenantReads = {
  organization(organizationId: string): Promise<ReadResult<{ id: string; name: string }>>;
  seatsOf(organizationId: string): Promise<ReadResult<{ account_id: string; role: string }>>;
  projectsOf(organizationId: string): Promise<ReadResult<{ id: string; name: string; assigned_volunteer_id: string | null }>>;
  project(projectId: string): Promise<ReadResult<{ id: string; name: string; org_id: string; assigned_volunteer_id: string | null }>>;
};

export type OrganizationDashboard = {
  ok: true;
  organizationId: string;
  organizationName: string;
  seats: { accountId: string; role: string }[];
  projects: { projectId: string; projectName: string; assignedVolunteerId: string | null }[];
};

export type ProjectWorkspace = {
  ok: true;
  projectId: string;
  projectName: string;
  organizationId: string;
  assignedVolunteerId: string | null;
};

/**
 * Pure orchestration over caller-bound reads. It holds no tenant rule: the database already filtered.
 * Zero rows for the target is TENANT_NOT_FOUND; any failed read is TENANT_READ_FAILED; rows are projected field by field.
 */
export async function organizationDashboard(
  reads: TenantReads,
  organizationId: string,
): Promise<TenantReadAnswer<OrganizationDashboard>> {
  const organization = await reads.organization(organizationId);
  if (!organization.ok) return TENANT_READ_FAILED;
  const row = organization.rows[0];
  if (row === undefined) return TENANT_NOT_FOUND;

  const [seats, projects] = await Promise.all([reads.seatsOf(organizationId), reads.projectsOf(organizationId)]);
  if (!seats.ok || !projects.ok) return TENANT_READ_FAILED;

  return {
    status: 200,
    body: {
      ok: true,
      organizationId: row.id,
      organizationName: row.name,
      seats: seats.rows.map((seat) => ({ accountId: seat.account_id, role: seat.role })),
      projects: projects.rows.map((project) => ({
        projectId: project.id,
        projectName: project.name,
        assignedVolunteerId: project.assigned_volunteer_id,
      })),
    },
  };
}

export async function projectWorkspace(
  reads: TenantReads,
  projectId: string,
): Promise<TenantReadAnswer<ProjectWorkspace>> {
  const result = await reads.project(projectId);
  if (!result.ok) return TENANT_READ_FAILED;
  const row = result.rows[0];
  if (row === undefined) return TENANT_NOT_FOUND;
  return {
    status: 200,
    body: {
      ok: true,
      projectId: row.id,
      projectName: row.name,
      organizationId: row.org_id,
      assignedVolunteerId: row.assigned_volunteer_id,
    },
  };
}
