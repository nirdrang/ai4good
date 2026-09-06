/**
 * AT-REQ-001 sections G and H — the lifecycle gate on every write, the single-dev invariant, the
 * append-only audit, and sign-in rate limiting.
 *
 * AT-001.29, .30, .31 and .33 ARE WRITTEN. AT-001.34 is declared red at both tiers with the
 * named vendor capability: the body opens a world and then refuses. AT-001.32 stays at this call
 * site because an id is registered once.
 */

import { expect } from 'vitest';
import { atTest } from './_bind.ts';
import {
  AUP_REASON,
  REENABLE_REASON,
  assertAppendOnlyAudit,
  assertDeactivationGatesEveryWrite,
  at00129,
  at00130,
  at00131,
  at00132,
  at00133,
  at00134,
  INTEGRATION_TIMEOUT_MS,
  provisionLifecycleActors,
} from './_integration.ts';
import { CapabilityPending } from '../../harness/pending.ts';
import { auditAppendOnlyProblems } from './_policy-scan.ts';
// THE SHIPPED AUTHORITY STATEMENT, imported rather than restated — the acknowledgment-identity leaf
// makes name, title and attestation mandatory on EVERY completion, and the deployed validation
// refuses any attestation that is not this statement word for word.
import { ACKNOWLEDGMENT_IDENTITY_COPY } from '../../../../supabase/functions/_shared/acknowledgment-copy.ts';

/** The version string of the ToS + Platform Promise text this file's one written body accepts. */
const TEXT_VERSION = 'tos-2026-01+promise-2026-01';
/** The address the acknowledgment records — every completion here carries one. */
const CLIENT_IP = '203.0.113.7';
/** The password every email/password registration in this file uses. */
const PASSWORD = 'correct horse battery staple';
/**
 * AT-001.19's three fields, carried by every completion here.
 *
 * All three completions in this file must SUCCEED — they are AT-001.32's Given, not its act — so
 * each one carries the identity the shared validation now requires. Nothing here grades the
 * identity fields; that is the acknowledgment-identity leaf's own three ids.
 */
const SIGNER = {
  signerName: 'Dana Okonkwo',
  signerTitle: 'Executive Director',
  authorityAttestation: ACKNOWLEDGMENT_IDENTITY_COPY.authorityStatement,
} as const;

atTest(
  'AT-001.29',
  'every enumerated write is rejected for a deactivated account while an active control succeeds',
  { surface: 'backend', timeoutMs: { integration: INTEGRATION_TIMEOUT_MS } },
  {
    default: async ({ open }) => {
      const { w, sut } = await open();
      await assertDeactivationGatesEveryWrite(sut, w, '29', (email) => sut.registerWithEmailPassword(email, PASSWORD), {
        skipStandIn: false,
      });
    },
    integration: at00129,
  },
);

atTest(
  'AT-001.30',
  'an AUP-deactivated volunteer is refused writes immediately and the project keys are revoked',
  { surface: 'backend', timeoutMs: { integration: INTEGRATION_TIMEOUT_MS } },
  {
    default: async ({ open }) => {
      const { w, sut } = await open();
      const admin = await sut.provisionPlatformAdmin(w.email('admin-30'), PASSWORD);
      const volunteer = await sut.registerWithEmailPassword(w.email('vol-30'), PASSWORD);
      const link = await sut.emailedVerificationLink(volunteer.email);
      expect(link, 'no verification link was emailed for the volunteer').not.toBeNull();
      await sut.useVerificationLink(link!);
      await sut.linkGithubIdentity(volunteer, 'vol-30-handle');
      const completion = await sut.completeSignup(
        volunteer,
        { accountType: 'volunteer', acknowledgmentTextVersion: TEXT_VERSION, ...SIGNER },
        CLIENT_IP,
      );
      expect(completion, 'the volunteer could not complete signup').toMatchObject({ ok: true });
      if (!completion.ok) return;

      const deactivated = await sut.setAccountLifecycle(admin, {
        accountId: volunteer.accountId,
        lifecycle: 'deactivated',
        reason: AUP_REASON,
      });
      expect(deactivated, 'the administrator could not deactivate the volunteer').toMatchObject({ ok: true, changed: true });

      const before = await sut.discoveryMessagesBy(volunteer.accountId);
      const refused = await sut.attemptWrite({ route: 'discovery-message', message: 'a message that must not land' }, volunteer);
      expect(refused.ok, 'the deactivated volunteer sent a Discovery message').toBe(false);
      if (refused.ok) return;
      expect(refused.kind, 'the volunteer was refused for a reason other than deactivation').toBe('account-deactivated');
      expect(await sut.discoveryMessagesBy(volunteer.accountId), 'the refused Discovery write still landed').toEqual(before);
      throw new CapabilityPending(['gateway.virtual-key-revocation']);
    },
    integration: at00130,
  },
);

atTest(
  'AT-001.31',
  're-enabling an account restores otherwise-authorized writes while independent gates stay enforced',
  { surface: 'backend', timeoutMs: { integration: INTEGRATION_TIMEOUT_MS } },
  {
    default: async ({ open }) => {
      const { w, sut } = await open();
      const actors = await provisionLifecycleActors(sut, w, '31', (email) => sut.registerWithEmailPassword(email, PASSWORD));

      const memberOrg = await sut.createOrganizationAsOperator('Member 31');
      const granted = await sut.grantMembershipAsOperator(memberOrg.id, actors.ngoOff.accountId, 'member');
      expect(granted, 'the operator could not seat the NGO as member').toMatchObject({ ok: true });

      const reNgo = await sut.setAccountLifecycle(actors.admin, {
        accountId: actors.ngoOff.accountId,
        lifecycle: 'active',
        reason: REENABLE_REASON,
      });
      expect(reNgo, 'the administrator could not re-enable the NGO').toMatchObject({ ok: true, changed: true });
      const reVol = await sut.setAccountLifecycle(actors.admin, {
        accountId: actors.volunteerOff.accountId,
        lifecycle: 'active',
        reason: REENABLE_REASON,
      });
      expect(reVol, 'the administrator could not re-enable the volunteer').toMatchObject({ ok: true, changed: true });

      const renamed = await sut.attemptWrite(
        { route: 'update-organization', organizationId: actors.ngoOffOrg, name: 'Riverside Re-enabled 31' },
        actors.ngoOff,
      );
      expect(renamed, 'the re-enabled NGO was refused an otherwise-authorized rename').toMatchObject({ ok: true });

      const sent = await sut.attemptWrite(
        { route: 'discovery-message', message: 're-enabled volunteer message' },
        actors.volunteerOff,
      );
      expect(sent, 'the re-enabled volunteer was refused an otherwise-authorized Discovery send').toMatchObject({ ok: true });
      expect(await sut.discoveryMessagesBy(actors.volunteerOff.accountId)).toContain('re-enabled volunteer message');

      const memberWrite = await sut.updateOrganization(actors.ngoOff, memberOrg.id, 'Member Rename 31');
      expect(memberWrite.ok, 'the re-enabled NGO renamed an organisation where it holds member').toBe(false);
      if (memberWrite.ok) return;
      expect(memberWrite.kind, 'the member-role refusal is not the independent gate').toBe('not-an-admin');

      const volunteerWrite = await sut.attemptWrite(
        { route: 'create-organization', name: 'Volunteer Org 31' },
        actors.volunteerOff,
      );
      expect(volunteerWrite.ok, 'the re-enabled volunteer created an organisation').toBe(false);
      if (volunteerWrite.ok) return;
      expect(volunteerWrite.kind, 'the volunteer NGO-only refusal is not the independent type gate').toBe('not-an-ngo-account');
      expect(await sut.organizationsNamed('Volunteer Org 31'), 'the refused volunteer write created an organisation').toEqual([]);

      const self = await sut.setAccountLifecycle(actors.adminOff, {
        accountId: actors.adminOff.accountId,
        lifecycle: 'active',
        reason: REENABLE_REASON,
      });
      expect(self.ok, 'a deactivated administrator re-enabled itself').toBe(false);
      if (self.ok) return;
      expect(self.kind, 'the self re-enable was refused for a reason other than deactivation').toBe('account-deactivated');
      expect(await sut.account(actors.adminOff.accountId)).toMatchObject({ lifecycle: 'deactivated' });

      const byOther = await sut.setAccountLifecycle(actors.adminOther, {
        accountId: actors.adminOff.accountId,
        lifecycle: 'active',
        reason: REENABLE_REASON,
      });
      expect(byOther, 'the second administrator could not re-enable the first').toMatchObject({ ok: true, changed: true });
      throw new CapabilityPending(['gateway.virtual-key-reissue']);
    },
    integration: at00131,
  },
);

atTest(
  'AT-001.32',
  'attaching a second volunteer to a project is rejected — single-dev projects',
  { surface: 'backend', timeoutMs: { integration: INTEGRATION_TIMEOUT_MS } },
  {
    default: async ({ open }) => {
      const { w, sut } = await open();

      // THE GIVEN IS OPERATOR-PROVISIONED, AND THAT IS STATED RATHER THAN HIDDEN. No product path
      // creates a project or attaches a volunteer in this tree, at either tier; building one to
      // reach this criterion's Given would be landing another requirement's surface early. What is
      // under test is the REFUSAL of the second attach.
      const ngo = await sut.registerWithEmailPassword(w.email('project-owner-32'), PASSWORD);
      const ngoCompletion = await sut.completeSignup(
        ngo,
        { accountType: 'ngo', organizationName: 'Riverside Shelter 32', acknowledgmentTextVersion: TEXT_VERSION, ...SIGNER },
        CLIENT_IP,
      );
      expect(ngoCompletion, 'the NGO could not complete signup, so there is no organisation to hold a project').toMatchObject({ ok: true });
      if (!ngoCompletion.ok || ngoCompletion.organizationId === null) return;

      const first = await sut.registerWithEmailPassword(w.email('first-volunteer-32'), PASSWORD);
      await sut.linkGithubIdentity(first, 'first-volunteer-32-handle');
      const firstCompletion = await sut.completeSignup(
        first,
        { accountType: 'volunteer', acknowledgmentTextVersion: TEXT_VERSION, ...SIGNER },
        CLIENT_IP,
      );
      expect(firstCompletion, 'the first volunteer could not complete signup').toMatchObject({ ok: true });
      if (!firstCompletion.ok) return;

      const second = await sut.registerWithEmailPassword(w.email('second-volunteer-32'), PASSWORD);
      await sut.linkGithubIdentity(second, 'second-volunteer-32-handle');
      const secondCompletion = await sut.completeSignup(
        second,
        { accountType: 'volunteer', acknowledgmentTextVersion: TEXT_VERSION, ...SIGNER },
        CLIENT_IP,
      );
      expect(secondCompletion, 'the second volunteer could not complete signup').toMatchObject({ ok: true });
      if (!secondCompletion.ok) return;

      // A project with an assigned volunteer — the criterion's Given, in two steps so that the
      // freshly created project is seen with its seat FREE. One nullable field holds the developer,
      // so there is no collaborator seat for a second one to occupy.
      const project = await sut.createProjectAsOperator(ngoCompletion.organizationId, 'Riverside Shelter Website 32');
      expect(project.assignedVolunteerId, 'a freshly created project already carries a developer').toBeNull();
      const assigned = await sut.assignVolunteerAsOperator(project.id, firstCompletion.accountId);
      expect(assigned, 'the first volunteer could not be attached, so this criterion has no Given').toMatchObject({ ok: true });
      expect(await sut.projectAssignment(project.id), 'the seat does not hold the first volunteer').toMatchObject({
        assignedVolunteerId: firstCompletion.accountId,
      });

      // THE ACT UNDER TEST.
      const secondAttach = await sut.assignVolunteerAsOperator(project.id, secondCompletion.accountId);
      expect(secondAttach.ok, 'a second volunteer was attached to a project that already has one').toBe(false);
      if (secondAttach.ok) return;
      expect(secondAttach.kind, 'the second attach was refused for a reason other than the seat being taken').toBe('seat-occupied');

      // AND IT WROTE NOTHING: the seat still holds the FIRST volunteer.
      expect(await sut.projectAssignment(project.id), 'the refused attach changed the project seat').toMatchObject({
        id: project.id,
        assignedVolunteerId: firstCompletion.accountId,
      });

      // THE CONTROL — the same call with the SAME volunteer is not refused, so the guard is about a
      // second developer rather than about writing to the column at all.
      const again = await sut.assignVolunteerAsOperator(project.id, firstCompletion.accountId);
      expect(
        again,
        'attaching the volunteer that already holds the seat was refused, so the refusal above is not about a SECOND one',
      ).toMatchObject({ ok: true });
      expect(await sut.projectAssignment(project.id)).toMatchObject({ assignedVolunteerId: firstCompletion.accountId });
    },
    integration: at00132,
  },
);

atTest(
  'AT-001.33',
  'role changes and contact transfer leave an append-only audit record that cannot be altered',
  { surface: 'backend', timeoutMs: { integration: INTEGRATION_TIMEOUT_MS } },
  {
    default: async ({ open }) => {
      expect(auditAppendOnlyProblems(), 'the audit append-only scan found a problem').toEqual([]);
      const { w, sut } = await open();
      await assertAppendOnlyAudit(sut, w, '33', (email) => sut.registerWithEmailPassword(email, PASSWORD));
    },
    integration: at00133,
  },
);

atTest(
  'AT-001.34',
  'sign-in attempts past the configured rate limit are throttled while legitimate use continues',
  { surface: 'backend' },
  at00134,
);
