/**
 * AT-REQ-001 section F — the audited contact transfer, lost-access recovery, the escalation
 * contact, and who may run the transfer.
 *
 * ALL FIVE IDS ARE WRITTEN, at both tiers. The loop bodies below drive the shipped write pipeline —
 * the inventory, the lifecycle gate, `decideContactTransfer` and `decideEscalationContact` — over
 * the fixture's storage; the integration bodies in `_integration.ts` drive the deployed routes and
 * read the real audit and escalation tables as the operator. The Given, the read-backs and the
 * audit assertions have one home there and two callers, so the two tiers cannot drift apart.
 */

import { expect } from 'vitest';
import { atTest } from './_bind.ts';
import {
  at00125,
  at00126,
  at00127,
  at00128,
  at00135,
  expectNotTransferred,
  expectTransferAudited,
  expectTransferred,
  HANDOVER_REASON,
  INTEGRATION_TIMEOUT_MS,
  RECOVERY_REASON,
  transferGiven,
  transferSnapshot,
} from './_integration.ts';
import { ACKNOWLEDGMENT_IDENTITY_COPY } from '../../../../supabase/functions/_shared/acknowledgment-copy.ts';

const TEXT_VERSION = 'tos-2026-01+promise-2026-01';
const CLIENT_IP = '203.0.113.7';
const PASSWORD = 'correct horse battery staple';
const SIGNER = {
  signerName: 'Dana Okonkwo',
  signerTitle: 'Executive Director',
  authorityAttestation: ACKNOWLEDGMENT_IDENTITY_COPY.authorityStatement,
} as const;
/**
 * The instant the loop clock is frozen at BEFORE the Given is built, so the sessions it mints are
 * live and the audit row the fixture writes from the harness clock can be pinned to one instant.
 * The loop `Clock` reports no time of its own, on purpose; commanding it is the honest way to know
 * what "inside the test window" means at this tier.
 */
const AUDIT_INSTANT = '2026-03-01T09:00:00.000Z';

atTest(
  'AT-001.25',
  'contact transfer moves ownership, deactivates the old account and preserves all history',
  { surface: 'backend', timeoutMs: { integration: INTEGRATION_TIMEOUT_MS } },
  {
    default: async ({ open }) => {
      const { w, sut } = await open();
      const given = await transferGiven(sut, w, '25', (email) => sut.registerWithEmailPassword(email, PASSWORD));
      const before = await transferSnapshot(sut, given);
      const request = {
        organizationId: given.organizationId,
        fromAccountId: given.a.accountId,
        toAccountId: given.b.accountId,
        reason: HANDOVER_REASON,
      };

      const transfer = await sut.transferOrganizationContact(given.admin, request);
      expect(transfer, 'the platform administrator was refused the transfer').toMatchObject({ ok: true });
      if (!transfer.ok) return;
      await expectTransferred(sut, given, before);

      const again = await sut.transferOrganizationContact(given.admin, request);
      expect(again.ok, 'a second transfer of the same seat from the same account succeeded').toBe(false);
      if (again.ok) return;
      expect(again.kind, 'the retry was refused for a reason other than the seat having moved').toBe('not-the-current-contact');
      await expectTransferred(sut, given, before);
    },
    integration: at00125,
  },
);

atTest(
  'AT-001.26',
  'the completed transfer leaves an audit record of who, when and why',
  { surface: 'backend', timeoutMs: { integration: INTEGRATION_TIMEOUT_MS } },
  {
    default: async ({ open }) => {
      const { h, w, sut } = await open();
      await h.clock.freezeAt(AUDIT_INSTANT);
      const given = await transferGiven(sut, w, '26', (email) => sut.registerWithEmailPassword(email, PASSWORD));
      expect(await sut.auditEvents({ subjectOrgId: given.organizationId }), 'the organisation carries an audit row before anything happened to it').toEqual(
        [],
      );

      const transfer = await sut.transferOrganizationContact(given.admin, {
        organizationId: given.organizationId,
        fromAccountId: given.a.accountId,
        toAccountId: given.b.accountId,
        reason: HANDOVER_REASON,
      });
      expect(transfer, 'the platform administrator was refused the transfer, so there is nothing to audit').toMatchObject({ ok: true });
      if (!transfer.ok) return;

      const instantMs = Date.parse(AUDIT_INSTANT);
      await expectTransferAudited(sut, given, HANDOVER_REASON, { openedAtMs: instantMs, closedAtMs: instantMs, toleranceMs: 0 });
    },
    integration: at00126,
  },
);

atTest(
  'AT-001.27',
  'lost-access recovery runs the same audited flow as contact transfer',
  { surface: 'backend', timeoutMs: { integration: INTEGRATION_TIMEOUT_MS } },
  {
    default: async ({ open }) => {
      const { h, w, sut } = await open();
      await h.clock.freezeAt(AUDIT_INSTANT);
      const given = await transferGiven(sut, w, '27', (email) => sut.registerWithEmailPassword(email, PASSWORD));

      await sut.signOut(given.a);
      const locked = await sut.signInWithEmailPassword(given.a.email, 'a password the contact no longer has');
      expect(locked.ok, 'the original contact can still sign in, so there is no lost access to recover from').toBe(false);
      const before = await transferSnapshot(sut, given);

      const recovery = await sut.transferOrganizationContact(given.admin, {
        organizationId: given.organizationId,
        fromAccountId: given.a.accountId,
        toAccountId: given.b.accountId,
        reason: RECOVERY_REASON,
      });
      expect(recovery, 'the administrator was refused the recovery').toMatchObject({ ok: true });
      if (!recovery.ok) return;

      await expectTransferred(sut, given, before);
      const instantMs = Date.parse(AUDIT_INSTANT);
      await expectTransferAudited(sut, given, RECOVERY_REASON, { openedAtMs: instantMs, closedAtMs: instantMs, toleranceMs: 0 });
    },
    integration: at00127,
  },
);

atTest(
  'AT-001.28',
  'concierge onboarding stores one non-login escalation contact for the NGO',
  { surface: 'backend', timeoutMs: { integration: INTEGRATION_TIMEOUT_MS } },
  {
    default: async ({ open }) => {
      const { w, sut } = await open();
      // R15 NARROWS THE GIVEN: concierge onboarding is the administrator acting on an organisation,
      // and the vetting act itself stays the NGO profile requirement's. What this body proves is the
      // capture, by a platform-admin operation on the same surface as the transfer, of a contact no
      // login can attach to.
      const admin = await sut.provisionPlatformAdmin(w.email('admin-28'), PASSWORD);
      const ngo = await sut.registerWithEmailPassword(w.email('ngo-28'), PASSWORD);
      const completion = await sut.completeSignup(
        ngo,
        { accountType: 'ngo', organizationName: 'Riverside Shelter 28', acknowledgmentTextVersion: TEXT_VERSION, ...SIGNER },
        CLIENT_IP,
      );
      expect(completion, 'the NGO could not complete signup, so there is no organisation to record a contact for').toMatchObject({ ok: true });
      if (!completion.ok || completion.organizationId === null) return;
      const organizationId = completion.organizationId;
      expect(await sut.escalationContact(organizationId), 'a fresh organisation already carries an escalation contact').toBeNull();

      const contactEmail = w.email('escalation-28');
      const recorded = await sut.setEscalationContact(admin, { organizationId, name: 'Maya Lindqvist', email: contactEmail, phone: '+1 555 0100' });
      expect(recorded, 'the administrator was refused the escalation contact').toMatchObject({ ok: true });
      if (!recorded.ok) return;
      expect(await sut.escalationContact(organizationId), 'the escalation contact was not stored as recorded').toMatchObject({
        organizationId,
        contactName: 'Maya Lindqvist',
        contactEmail,
        contactPhone: '+1 555 0100',
        recordedByAccountId: admin.accountId,
      });

      const signIn = await sut.signInWithEmailPassword(contactEmail, PASSWORD);
      expect(signIn.ok, 'the escalation contact can sign in, so it is an account rather than a non-login contact').toBe(false);

      const replaced = await sut.setEscalationContact(admin, { organizationId, name: 'Jonas Ekholm', email: w.email('escalation-28-second'), phone: null });
      expect(replaced, 'the administrator was refused a second capture').toMatchObject({ ok: true });
      expect(await sut.escalationContact(organizationId), 'the second capture did not replace the first').toMatchObject({
        contactName: 'Jonas Ekholm',
        contactPhone: null,
      });

      const refused = await sut.setEscalationContact(ngo, { organizationId, name: 'Self Appointed', email: w.email('escalation-28-self'), phone: null });
      expect(refused.ok, 'an NGO account recorded its own escalation contact').toBe(false);
      if (refused.ok) return;
      expect(refused.kind, 'the NGO was refused for a reason other than not being a platform administrator').toBe('not-a-platform-admin');
      expect(await sut.escalationContact(organizationId), 'the refused capture changed the contact').toMatchObject({ contactName: 'Jonas Ekholm' });
    },
    integration: at00128,
  },
);

atTest(
  'AT-001.35',
  'an NGO user, a volunteer or an unauthenticated caller is refused the transfer flow',
  { surface: 'backend', timeoutMs: { integration: INTEGRATION_TIMEOUT_MS } },
  {
    default: async ({ open }) => {
      const { w, sut } = await open();
      const given = await transferGiven(sut, w, '35', (email) => sut.registerWithEmailPassword(email, PASSWORD));
      const volunteer = await sut.registerWithEmailPassword(w.email('volunteer-35'), PASSWORD);
      await sut.linkGithubIdentity(volunteer, 'volunteer-35-handle');
      const volunteerCompletion = await sut.completeSignup(
        volunteer,
        { accountType: 'volunteer', acknowledgmentTextVersion: TEXT_VERSION, ...SIGNER },
        CLIENT_IP,
      );
      expect(volunteerCompletion, 'the volunteer could not complete signup, so its refusal below is not the one under test').toMatchObject({
        ok: true,
      });
      if (!volunteerCompletion.ok) return;
      const before = await transferSnapshot(sut, given);
      const request = {
        organizationId: given.organizationId,
        fromAccountId: given.a.accountId,
        toAccountId: given.b.accountId,
        reason: HANDOVER_REASON,
      };

      const asNgo = await sut.transferOrganizationContact(given.a, request);
      expect(asNgo.ok, 'an NGO account ran the transfer').toBe(false);
      if (asNgo.ok) return;
      expect(asNgo.status, 'the NGO refusal is not a 403').toBe(403);
      expect(asNgo.kind, 'the NGO refusal is not the not-a-platform-admin one').toBe('not-a-platform-admin');
      await expectNotTransferred(sut, given, 'NGO');

      const asVolunteer = await sut.transferOrganizationContact(volunteer, request);
      expect(asVolunteer.ok, 'a volunteer account ran the transfer').toBe(false);
      if (asVolunteer.ok) return;
      expect(asVolunteer.status, 'the volunteer refusal is not a 403').toBe(403);
      expect(asVolunteer.kind, 'the volunteer refusal is not the not-a-platform-admin one').toBe('not-a-platform-admin');
      await expectNotTransferred(sut, given, 'volunteer');

      const anonymous = await sut.transferOrganizationContact(null, request);
      expect(anonymous.ok, 'an unauthenticated caller ran the transfer').toBe(false);
      if (anonymous.ok) return;
      expect(anonymous.status, 'the unauthenticated refusal is not a 401').toBe(401);
      expect(anonymous.kind, 'the unauthenticated refusal was classified as a decision').toBe('unauthenticated');
      await expectNotTransferred(sut, given, 'unauthenticated');

      const asAdmin = await sut.transferOrganizationContact(given.admin, request);
      expect(asAdmin, 'the platform administrator was refused the transfer, so the refusals above prove nothing').toMatchObject({ ok: true });
      if (!asAdmin.ok) return;
      await expectTransferred(sut, given, before);
    },
    integration: at00135,
  },
);
