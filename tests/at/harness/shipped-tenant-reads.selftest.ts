/**
 * Oracle for the shipped tenant-read cores: one refusal for foreign and absent, one outage
 * answer that names nothing, and a field-by-field public projection.
 *
 * Driven directly because the acceptance bodies cannot inject a failed read or a zero-row
 * result without the fixture lying about storage. CI already runs this lane.
 */

import { describe, expect, it } from 'vitest';

import {
  organizationDashboard,
  projectWorkspace,
  TENANT_NOT_FOUND,
  TENANT_READ_FAILED,
  type TenantReads,
} from '../../../supabase/functions/_shared/tenant-reads.ts';
import {
  PROJECT_NOT_PUBLIC,
  PUBLIC_READ_FAILED,
  projectIsPublic,
  publicProjectAnswer,
  publicProjectView,
  type PublicProjectSource,
} from '../../../supabase/functions/_shared/public-project.ts';

const EMPTY: TenantReads = {
  organization: async () => ({ ok: true, rows: [] }),
  seatsOf: async () => ({ ok: true, rows: [] }),
  projectsOf: async () => ({ ok: true, rows: [] }),
  project: async () => ({ ok: true, rows: [] }),
};

const FAILED: TenantReads = {
  organization: async () => ({ ok: false, detail: 'outage' }),
  seatsOf: async () => ({ ok: false, detail: 'outage' }),
  projectsOf: async () => ({ ok: false, detail: 'outage' }),
  project: async () => ({ ok: false, detail: 'outage' }),
};

const ORG_A = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const ORG_B = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const PROJECT_A = '11111111-1111-4111-8111-111111111111';
const ABSENT = '00000000-0000-4000-8000-000000000000';

const PRESENT: TenantReads = {
  organization: async (id) =>
    id === ORG_A ? { ok: true, rows: [{ id: ORG_A, name: 'Riverside Shelter' }] } : { ok: true, rows: [] },
  seatsOf: async (id) =>
    id === ORG_A
      ? { ok: true, rows: [{ account_id: 'acct-a', role: 'admin' }] }
      : { ok: true, rows: [] },
  projectsOf: async (id) =>
    id === ORG_A
      ? { ok: true, rows: [{ id: PROJECT_A, name: 'Website', assigned_volunteer_id: null }] }
      : { ok: true, rows: [] },
  project: async (id) =>
    id === PROJECT_A
      ? { ok: true, rows: [{ id: PROJECT_A, name: 'Website', org_id: ORG_A, assigned_volunteer_id: null }] }
      : { ok: true, rows: [] },
};

const SOURCE: PublicProjectSource = {
  project_id: PROJECT_A,
  project_name: 'Website',
  organization_name: 'Riverside Shelter',
};

describe('organizationDashboard and projectWorkspace', () => {
  it('answers the identical TENANT_NOT_FOUND reference for a foreign target and an absent target', async () => {
    const foreignOrg = await organizationDashboard(EMPTY, ORG_B);
    const absentOrg = await organizationDashboard(EMPTY, ABSENT);
    expect(foreignOrg).toBe(TENANT_NOT_FOUND);
    expect(absentOrg).toBe(TENANT_NOT_FOUND);
    expect(JSON.stringify(foreignOrg)).toBe(JSON.stringify(absentOrg));

    const foreignProject = await projectWorkspace(EMPTY, PROJECT_A);
    const absentProject = await projectWorkspace(EMPTY, ABSENT);
    expect(foreignProject).toBe(TENANT_NOT_FOUND);
    expect(absentProject).toBe(TENANT_NOT_FOUND);
    expect(JSON.stringify(foreignProject)).toBe(JSON.stringify(absentProject));
  });

  it('answers TENANT_READ_FAILED for a failed read, naming no identifier', async () => {
    const org = await organizationDashboard(FAILED, ORG_A);
    const project = await projectWorkspace(FAILED, PROJECT_A);
    expect(org).toBe(TENANT_READ_FAILED);
    expect(project).toBe(TENANT_READ_FAILED);
    expect(JSON.stringify(org.body)).not.toContain(ORG_A);
    expect(JSON.stringify(project.body)).not.toContain(PROJECT_A);
  });

  it('projects the named fields for rows the reads return', async () => {
    const dash = await organizationDashboard(PRESENT, ORG_A);
    expect(dash).toEqual({
      status: 200,
      body: {
        ok: true,
        organizationId: ORG_A,
        organizationName: 'Riverside Shelter',
        seats: [{ accountId: 'acct-a', role: 'admin' }],
        projects: [{ projectId: PROJECT_A, projectName: 'Website', assignedVolunteerId: null }],
      },
    });

    const workspace = await projectWorkspace(PRESENT, PROJECT_A);
    expect(workspace).toEqual({
      status: 200,
      body: {
        ok: true,
        projectId: PROJECT_A,
        projectName: 'Website',
        organizationId: ORG_A,
        assignedVolunteerId: null,
      },
    });
  });
});

describe('publicProjectAnswer', () => {
  it('answers PROJECT_NOT_PUBLIC for a missing source and for a source the predicate refuses, the same value', async () => {
    const missing = await publicProjectAnswer(ABSENT, { source: async () => ({ ok: true, rows: [] }) });
    expect(missing).toBe(PROJECT_NOT_PUBLIC);
    expect(projectIsPublic(SOURCE)).toBe(true);
    // The predicate is true for every row today, so a present source cannot take the false arm.
    // The shipped function still has one `return PROJECT_NOT_PUBLIC` for both conditions; the
    // constant compared here is that return value.
    expect(JSON.stringify(missing)).toBe(JSON.stringify(PROJECT_NOT_PUBLIC));
  });

  it('answers PUBLIC_READ_FAILED for a failed source read, naming nothing', async () => {
    const failed = await publicProjectAnswer(PROJECT_A, { source: async () => ({ ok: false, detail: 'outage' }) });
    expect(failed).toBe(PUBLIC_READ_FAILED);
    expect(JSON.stringify(failed.body)).not.toContain(PROJECT_A);
  });

  it('projects exactly three fields for a public source, with organizationId and assignedVolunteerId absent by name', async () => {
    const page = publicProjectView(SOURCE);
    expect(page).toEqual({
      projectId: PROJECT_A,
      projectName: 'Website',
      organizationName: 'Riverside Shelter',
    });
    expect(Object.keys(page).sort()).toEqual(['organizationName', 'projectId', 'projectName']);
    expect('organizationId' in page).toBe(false);
    expect('assignedVolunteerId' in page).toBe(false);

    const answer = await publicProjectAnswer(PROJECT_A, { source: async () => ({ ok: true, rows: [SOURCE] }) });
    expect(answer.status).toBe(200);
    if (answer.status !== 200) return;
    expect(answer.body).toEqual({ ok: true, ...page });
    const serialized = JSON.stringify(answer.body);
    expect(serialized).not.toContain('organizationId');
    expect(serialized).not.toContain('assignedVolunteerId');
  });
});
