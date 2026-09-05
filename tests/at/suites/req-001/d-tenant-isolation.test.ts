/**
 * AT-REQ-001 section E — tenant isolation and visibility.
 *
 * Loop bodies grade shipped orchestration: the cores over injected reads, the fixture surface
 * that runs those cores over unfiltered Maps, the public projection, and the static catalog
 * scan. They do not grade SQL policies. AT-001.24 throws the named UI-rendering capability
 * at both tiers after the integration body asserts the API half.
 */

import { expect } from 'vitest';
import { atTest } from './_bind.ts';
import { at00121, at00122, at00123, at00124, at00140, INTEGRATION_TIMEOUT_MS } from './_integration.ts';
import { CapabilityPending } from '../../harness/registry.ts';
import { tenantCatalogProblems } from './_policy-scan.ts';
import { ACKNOWLEDGMENT_IDENTITY_COPY } from '../../../../supabase/functions/_shared/acknowledgment-copy.ts';
import {
  organizationDashboard,
  projectWorkspace,
  TENANT_NOT_FOUND,
  TENANT_READ_FAILED,
  type TenantReads,
} from '../../../../supabase/functions/_shared/tenant-reads.ts';
import {
  PROJECT_NOT_PUBLIC,
  publicProjectAnswer,
  publicProjectView,
} from '../../../../supabase/functions/_shared/public-project.ts';

const TEXT_VERSION = 'tos-2026-01+promise-2026-01';
const CLIENT_IP = '203.0.113.7';
const PASSWORD = 'correct horse battery staple';
const SIGNER = {
  signerName: 'Dana Okonkwo',
  signerTitle: 'Executive Director',
  authorityAttestation: ACKNOWLEDGMENT_IDENTITY_COPY.authorityStatement,
} as const;

const EMPTY_READS: TenantReads = {
  organization: async () => ({ ok: true, rows: [] }),
  seatsOf: async () => ({ ok: true, rows: [] }),
  projectsOf: async () => ({ ok: true, rows: [] }),
  project: async () => ({ ok: true, rows: [] }),
};

const FOREIGN_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const ABSENT_ID = '00000000-0000-4000-8000-000000000000';

atTest(
  'AT-001.21',
  'one NGO cannot reach another NGO non-public data by UI or by direct id probing',
  { surface: 'backend', timeoutMs: { integration: INTEGRATION_TIMEOUT_MS } },
  {
    default: async ({ open }) => {
      const { w, sut } = await open();

      const foreign = await organizationDashboard(EMPTY_READS, FOREIGN_ID);
      const absent = await organizationDashboard(EMPTY_READS, ABSENT_ID);
      expect(foreign, 'a foreign organisation did not answer the shared refusal').toBe(TENANT_NOT_FOUND);
      expect(absent, 'an absent organisation did not answer the shared refusal').toBe(TENANT_NOT_FOUND);
      expect(JSON.stringify(foreign), 'foreign and absent refusals differ as bytes').toBe(JSON.stringify(absent));

      const sessionA = await sut.registerWithEmailPassword(w.email('ngo-a-21'), PASSWORD);
      const completionA = await sut.completeSignup(
        sessionA,
        { accountType: 'ngo', organizationName: 'Riverside Shelter 21A', acknowledgmentTextVersion: TEXT_VERSION, ...SIGNER },
        CLIENT_IP,
      );
      expect(completionA, 'NGO A could not complete signup, so the positive control does not exist').toMatchObject({
        ok: true,
      });
      if (!completionA.ok || completionA.organizationId === null) return;

      const project = await sut.createProjectAsOperator(completionA.organizationId, 'Riverside Shelter Website 21');
      const own = await sut.organizationDashboard(sessionA, completionA.organizationId);
      expect(own.ok, "NGO A's own dashboard was refused, so the refusals below prove nothing").toBe(true);
      if (!own.ok) return;
      expect(own.value.organizationName).toBe('Riverside Shelter 21A');
      expect(own.value.seats).toEqual([{ accountId: completionA.accountId, role: 'admin' }]);
      expect(own.value.projects).toEqual([
        { projectId: project.id, projectName: 'Riverside Shelter Website 21', assignedVolunteerId: null },
      ]);

      const sessionB = await sut.registerWithEmailPassword(w.email('ngo-b-21'), PASSWORD);
      const completionB = await sut.completeSignup(
        sessionB,
        { accountType: 'ngo', organizationName: 'Northgate Foodbank 21B', acknowledgmentTextVersion: TEXT_VERSION, ...SIGNER },
        CLIENT_IP,
      );
      expect(completionB, 'NGO B could not complete signup').toMatchObject({ ok: true });
      if (!completionB.ok) return;

      const viaBAbsent = await sut.organizationDashboard(sessionB, ABSENT_ID);
      expect(viaBAbsent.ok, 'NGO B reached an organisation that is not in this world').toBe(false);
      if (viaBAbsent.ok) return;
      expect(viaBAbsent.answer.status).toBe(404);
      expect(viaBAbsent.answer.body).toBe(JSON.stringify(TENANT_NOT_FOUND.body));

      expect(tenantCatalogProblems(), 'the static catalog scan found a problem').toEqual([]);
    },
    integration: at00121,
  },
);

atTest(
  'AT-001.22',
  'an unassigned volunteer is denied a project non-public data while the public page stays visible',
  { surface: 'backend', timeoutMs: { integration: INTEGRATION_TIMEOUT_MS } },
  {
    default: async ({ open }) => {
      const { w, sut } = await open();

      const foreign = await projectWorkspace(EMPTY_READS, FOREIGN_ID);
      const absent = await projectWorkspace(EMPTY_READS, ABSENT_ID);
      expect(foreign, 'an unassigned volunteer against a project did not answer the shared refusal').toBe(
        TENANT_NOT_FOUND,
      );
      expect(absent, 'an unassigned volunteer against a random id did not answer the shared refusal').toBe(
        TENANT_NOT_FOUND,
      );
      expect(JSON.stringify(foreign), 'project and absent refusals differ as bytes').toBe(JSON.stringify(absent));

      const volunteer = await sut.registerWithEmailPassword(w.email('volunteer-22'), PASSWORD);
      await sut.linkGithubIdentity(volunteer, 'volunteer-22-handle');
      const volunteerCompletion = await sut.completeSignup(
        volunteer,
        { accountType: 'volunteer', acknowledgmentTextVersion: TEXT_VERSION, ...SIGNER },
        CLIENT_IP,
      );
      expect(volunteerCompletion, 'the unassigned volunteer could not complete signup').toMatchObject({ ok: true });
      if (!volunteerCompletion.ok) return;

      const viaVolunteer = await sut.projectWorkspace(volunteer, ABSENT_ID);
      expect(viaVolunteer.ok, 'an unassigned volunteer reached a project workspace that is not in this world').toBe(
        false,
      );
      if (viaVolunteer.ok) return;
      expect(viaVolunteer.answer.status).toBe(404);
      expect(viaVolunteer.answer.body).toBe(JSON.stringify(TENANT_NOT_FOUND.body));

      const source = {
        project_id: FOREIGN_ID,
        project_name: 'Website',
        organization_name: 'Riverside Shelter',
      };
      const view = publicProjectView(source);
      expect(view).toEqual({
        projectId: FOREIGN_ID,
        projectName: 'Website',
        organizationName: 'Riverside Shelter',
      });
      expect(Object.keys(view).sort()).toEqual(['organizationName', 'projectId', 'projectName']);
      expect('organizationId' in view).toBe(false);
      expect('assignedVolunteerId' in view).toBe(false);

      const missingPage = await publicProjectAnswer(ABSENT_ID, { source: async () => ({ ok: true, rows: [] }) });
      expect(missingPage).toBe(PROJECT_NOT_PUBLIC);

      const ngo = await sut.registerWithEmailPassword(w.email('ngo-22'), PASSWORD);
      const ngoCompletion = await sut.completeSignup(
        ngo,
        { accountType: 'ngo', organizationName: 'Riverside Shelter 22', acknowledgmentTextVersion: TEXT_VERSION, ...SIGNER },
        CLIENT_IP,
      );
      expect(ngoCompletion, 'the owning NGO could not complete signup').toMatchObject({ ok: true });
      if (!ngoCompletion.ok || ngoCompletion.organizationId === null) return;

      const project = await sut.createProjectAsOperator(ngoCompletion.organizationId, 'Riverside Shelter Website 22');
      const page = await sut.publicProjectPage(project.id);
      expect(page.ok, 'the public project page was refused for a project that exists').toBe(true);
      if (!page.ok) return;
      expect(page.page).toEqual({
        projectId: project.id,
        projectName: 'Riverside Shelter Website 22',
        organizationName: 'Riverside Shelter 22',
      });
      expect(JSON.stringify(page.page)).not.toContain('organizationId');
      expect(JSON.stringify(page.page)).not.toContain('assignedVolunteerId');

      expect(tenantCatalogProblems(), 'the static catalog scan found a problem').toEqual([]);
    },
    integration: at00122,
  },
);

atTest(
  'AT-001.23',
  'the assigned volunteer reaches that project working data, scoped to that project only',
  { surface: 'backend', timeoutMs: { integration: INTEGRATION_TIMEOUT_MS } },
  {
    default: async ({ open }) => {
      const { w, sut } = await open();

      const P1 = '11111111-1111-4111-8111-111111111111';
      const P2 = '22222222-2222-4222-8222-222222222222';
      const ORG = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
      const VOL = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
      const assignedReads: TenantReads = {
        organization: async () => ({ ok: true, rows: [] }),
        seatsOf: async () => ({ ok: true, rows: [] }),
        projectsOf: async () => ({ ok: true, rows: [] }),
        project: async (id) =>
          id === P1
            ? {
                ok: true,
                rows: [{ id: P1, name: 'Website', org_id: ORG, assigned_volunteer_id: VOL }],
              }
            : { ok: true, rows: [] },
      };

      const own = await projectWorkspace(assignedReads, P1);
      expect(own, 'an injected present project did not project').toEqual({
        status: 200,
        body: {
          ok: true,
          projectId: P1,
          projectName: 'Website',
          organizationId: ORG,
          assignedVolunteerId: VOL,
        },
      });

      const sibling = await projectWorkspace(assignedReads, P2);
      expect(sibling, 'a sibling project id did not answer the shared refusal').toBe(TENANT_NOT_FOUND);
      const owningDash = await organizationDashboard(assignedReads, ORG);
      expect(owningDash, 'the owning dashboard did not answer the shared refusal').toBe(TENANT_NOT_FOUND);
      expect(JSON.stringify(sibling), 'sibling and owning-dashboard refusals differ as bytes').toBe(
        JSON.stringify(owningDash),
      );

      const ngo = await sut.registerWithEmailPassword(w.email('ngo-23'), PASSWORD);
      const ngoCompletion = await sut.completeSignup(
        ngo,
        { accountType: 'ngo', organizationName: 'Riverside Shelter 23', acknowledgmentTextVersion: TEXT_VERSION, ...SIGNER },
        CLIENT_IP,
      );
      expect(ngoCompletion, 'the owning NGO could not complete signup').toMatchObject({ ok: true });
      if (!ngoCompletion.ok || ngoCompletion.organizationId === null) return;

      const volunteer = await sut.registerWithEmailPassword(w.email('volunteer-23'), PASSWORD);
      await sut.linkGithubIdentity(volunteer, 'volunteer-23-handle');
      const volunteerCompletion = await sut.completeSignup(
        volunteer,
        { accountType: 'volunteer', acknowledgmentTextVersion: TEXT_VERSION, ...SIGNER },
        CLIENT_IP,
      );
      expect(volunteerCompletion, 'the assigned volunteer could not complete signup').toMatchObject({ ok: true });
      if (!volunteerCompletion.ok) return;

      const project = await sut.createProjectAsOperator(ngoCompletion.organizationId, 'Riverside Shelter Website 23');
      const seated = await sut.assignVolunteerAsOperator(project.id, volunteerCompletion.accountId);
      expect(seated, 'the operator could not seat the volunteer on the project').toMatchObject({ ok: true });

      const workspace = await sut.projectWorkspace(volunteer, project.id);
      expect(workspace.ok, 'the assigned volunteer was refused the project workspace').toBe(true);
      if (!workspace.ok) return;
      expect(workspace.value).toEqual({
        ok: true,
        projectId: project.id,
        projectName: 'Riverside Shelter Website 23',
        organizationId: ngoCompletion.organizationId,
        assignedVolunteerId: volunteerCompletion.accountId,
      });

      const free = await sut.createProjectAsOperator(ngoCompletion.organizationId, 'Riverside Shelter Sibling 23');
      const ngoSeat = await sut.assignVolunteerAsOperator(free.id, ngoCompletion.accountId);
      expect(ngoSeat.ok, 'an operator seated an NGO account in a developer seat').toBe(false);
      if (ngoSeat.ok) return;
      expect(ngoSeat.kind, 'the NGO seating was refused for a reason other than the account type').toBe(
        'not-a-volunteer-account',
      );

      expect(tenantCatalogProblems(), 'the static catalog scan found a problem').toEqual([]);
    },
    integration: at00123,
  },
);

atTest(
  'AT-001.40',
  'a platform admin reaches any NGO or project data — the admin role spans all accounts',
  { surface: 'backend', timeoutMs: { integration: INTEGRATION_TIMEOUT_MS } },
  {
    default: async ({ open }) => {
      const { w, sut } = await open();

      const ORG_A = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
      const ORG_B = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
      const P_A = '11111111-1111-4111-8111-111111111111';
      const P_B = '22222222-2222-4222-8222-222222222222';
      const twoTenants: TenantReads = {
        organization: async (id) => {
          if (id === ORG_A) return { ok: true, rows: [{ id: ORG_A, name: 'Riverside Shelter 40A' }] };
          if (id === ORG_B) return { ok: true, rows: [{ id: ORG_B, name: 'Northgate Foodbank 40B' }] };
          return { ok: true, rows: [] };
        },
        seatsOf: async (id) => {
          if (id === ORG_A) return { ok: true, rows: [{ account_id: 'acct-a', role: 'admin' }] };
          if (id === ORG_B) return { ok: true, rows: [{ account_id: 'acct-b', role: 'admin' }] };
          return { ok: true, rows: [] };
        },
        projectsOf: async (id) => {
          if (id === ORG_A) {
            return { ok: true, rows: [{ id: P_A, name: 'Website A', assigned_volunteer_id: null }] };
          }
          if (id === ORG_B) {
            return { ok: true, rows: [{ id: P_B, name: 'Website B', assigned_volunteer_id: null }] };
          }
          return { ok: true, rows: [] };
        },
        project: async (id) => {
          if (id === P_A) {
            return {
              ok: true,
              rows: [{ id: P_A, name: 'Website A', org_id: ORG_A, assigned_volunteer_id: null }],
            };
          }
          if (id === P_B) {
            return {
              ok: true,
              rows: [{ id: P_B, name: 'Website B', org_id: ORG_B, assigned_volunteer_id: null }],
            };
          }
          return { ok: true, rows: [] };
        },
      };

      const dashA = await organizationDashboard(twoTenants, ORG_A);
      const dashB = await organizationDashboard(twoTenants, ORG_B);
      expect(dashA, "tenant A's dashboard did not project").toMatchObject({
        status: 200,
        body: { ok: true, organizationId: ORG_A, organizationName: 'Riverside Shelter 40A' },
      });
      expect(dashB, "tenant B's dashboard did not project").toMatchObject({
        status: 200,
        body: { ok: true, organizationId: ORG_B, organizationName: 'Northgate Foodbank 40B' },
      });
      const wsA = await projectWorkspace(twoTenants, P_A);
      const wsB = await projectWorkspace(twoTenants, P_B);
      expect(wsA, "tenant A's workspace did not project").toMatchObject({
        status: 200,
        body: { ok: true, projectId: P_A, organizationId: ORG_A },
      });
      expect(wsB, "tenant B's workspace did not project").toMatchObject({
        status: 200,
        body: { ok: true, projectId: P_B, organizationId: ORG_B },
      });

      const failed: TenantReads = {
        ...twoTenants,
        organization: async () => ({ ok: false, detail: 'outage' }),
      };
      expect(
        await organizationDashboard(failed, ORG_A),
        'a refused read did not answer the shared outage constant',
      ).toBe(TENANT_READ_FAILED);

      const ngoA = await sut.registerWithEmailPassword(w.email('ngo-a-40'), PASSWORD);
      const completionA = await sut.completeSignup(
        ngoA,
        { accountType: 'ngo', organizationName: 'Riverside Shelter 40A', acknowledgmentTextVersion: TEXT_VERSION, ...SIGNER },
        CLIENT_IP,
      );
      expect(completionA, 'NGO A could not complete signup').toMatchObject({ ok: true });
      if (!completionA.ok || completionA.organizationId === null) return;
      const ngoB = await sut.registerWithEmailPassword(w.email('ngo-b-40'), PASSWORD);
      const completionB = await sut.completeSignup(
        ngoB,
        { accountType: 'ngo', organizationName: 'Northgate Foodbank 40B', acknowledgmentTextVersion: TEXT_VERSION, ...SIGNER },
        CLIENT_IP,
      );
      expect(completionB, 'NGO B could not complete signup').toMatchObject({ ok: true });
      if (!completionB.ok || completionB.organizationId === null) return;
      const projectA = await sut.createProjectAsOperator(completionA.organizationId, 'Website 40A');
      const projectB = await sut.createProjectAsOperator(completionB.organizationId, 'Website 40B');

      const admin = await sut.provisionPlatformAdmin(w.email('platform-admin-40'), PASSWORD);
      const viaA = await sut.organizationDashboard(admin, completionA.organizationId);
      const viaB = await sut.organizationDashboard(admin, completionB.organizationId);
      expect(viaA.ok, "the fixture dashboard for NGO A was refused").toBe(true);
      expect(viaB.ok, "the fixture dashboard for NGO B was refused").toBe(true);
      if (!viaA.ok || !viaB.ok) return;
      expect(viaA.value.organizationName).toBe('Riverside Shelter 40A');
      expect(viaB.value.organizationName).toBe('Northgate Foodbank 40B');
      const workspaceA = await sut.projectWorkspace(admin, projectA.id);
      const workspaceB = await sut.projectWorkspace(admin, projectB.id);
      expect(workspaceA.ok, "the fixture workspace for project A was refused").toBe(true);
      expect(workspaceB.ok, "the fixture workspace for project B was refused").toBe(true);

      expect(tenantCatalogProblems(), 'the static catalog scan found a problem').toEqual([]);
    },
    integration: at00140,
  },
);

atTest(
  'AT-001.24',
  'a logged-out visitor renders public surfaces only; authenticated surfaces redirect to sign-in',
  { surface: 'ui', timeoutMs: { integration: INTEGRATION_TIMEOUT_MS } },
  {
    default: async () => {
      throw new CapabilityPending(['ui.authenticated-surface-rendering']);
    },
    integration: at00124,
  },
);
