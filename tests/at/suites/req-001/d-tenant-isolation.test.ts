/**
 * AT-REQ-001 section E — tenant isolation and visibility.
 *
 * Unit 1 lands AT-001.21 and AT-001.22. The remaining three ids stay declared until unit 2.
 *
 * Loop bodies grade shipped orchestration: the cores over injected reads, the fixture surface
 * that runs those cores over unfiltered Maps, the public projection, and the static catalog
 * scan. They do not grade SQL policies.
 */

import { expect } from 'vitest';
import { atTest } from './_bind.ts';
import { at00121, at00122, INTEGRATION_TIMEOUT_MS } from './_integration.ts';
import { LEAF, notLanded } from './_pending.ts';
import { tenantCatalogProblems } from './_policy-scan.ts';
import { ACKNOWLEDGMENT_IDENTITY_COPY } from '../../../../supabase/functions/_shared/acknowledgment-copy.ts';
import {
  organizationDashboard,
  projectWorkspace,
  TENANT_NOT_FOUND,
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

atTest('AT-001.23', 'the assigned volunteer reaches that project working data, scoped to that project only', notLanded(LEAF.D5_L2));

atTest('AT-001.40', 'a platform admin reaches any NGO or project data — the admin role spans all accounts', notLanded(LEAF.D5_L2));

atTest('AT-001.24', 'a logged-out visitor renders public surfaces only; authenticated surfaces redirect to sign-in', notLanded(LEAF.D5_L2));
