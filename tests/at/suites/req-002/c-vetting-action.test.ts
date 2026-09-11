/**
 * AT-REQ-002 · C. The vetting action and its audit record — AT-002.11, AT-002.11b, AT-002.29,
 * AT-002.30, AT-002.12, AT-002.13, AT-002.14
 * Source: .taskmaster/docs/acceptance/at-req-002.md
 *
 * AT-002.12 waits on the publish flow and the checkout: publishing closing and funding staying
 * untouched both need a consumer this tree does not have. It is declared red by shape in
 * `tests/at/expected/req-002.json`; the unvet audit and the two pure policies are proved by the
 * neighbouring ids.
 */

import { describe, expect } from 'vitest';
import { EMITTER_COMPONENT } from '../../../../supabase/functions/_shared/notifications.ts';
import { channelsFor, taxonomyRow } from '../../../../supabase/functions/_shared/notification-taxonomy.ts';
import { vettingOutcomeNotice } from '../../../../supabase/functions/_shared/org-vetting.ts';
import { atTest } from './_bind.ts';
import { AWAITED, awaiting } from './_pending.ts';
import {
  kycSurfaceProblems,
  orgVettingWriterProblems,
  scheduledVettingProblems,
  vettedStateProblems,
  vettingRouteProblems,
} from './_source-scan.ts';
import { countPairs, expectedPairs, pairProblems } from '../req-016/_oracles.ts';
import { providerClientImporters, strayNotificationWriters } from '../req-016/_source-scan.ts';
import type { OrganizationsSut, Session, VettingRecord, VettingRequest } from './_contract.ts';

const VETTING_OUTCOME = 'vetting.outcome';
const VETTING_TAXONOMY = taxonomyRow(VETTING_OUTCOME);
if (VETTING_TAXONOMY === undefined) {
  throw new Error('vetting.outcome is missing from the notification taxonomy');
}
const VETTING_CHANNELS = channelsFor(VETTING_TAXONOMY);

const EVIDENCE = {
  organizationName: 'Riverside Shelter',
  publicReferenceUrl: 'https://example.org/riverside-shelter',
  contactName: 'Dana Okonkwo',
  contactTitle: 'Executive Director',
  authorityAttestation: 'The named contact attests they have authority to bind the organisation.',
  evidenceType: 'organization_website',
  note: 'Public website matches the registry listing and the named contact.',
} as const;

const REQUEST_FIELDS = [
  'organizationName',
  'publicReferenceUrl',
  'contactName',
  'contactTitle',
  'authorityAttestation',
  'evidenceType',
  'note',
] as const;

const SCHEMA_FIELDS: ReadonlyArray<keyof Omit<VettingRecord, 'registration'>> = [
  'organizationId',
  'vetted',
  'vettedByAccountId',
  'vettedAt',
  'organizationName',
  'publicReferenceUrl',
  'contactName',
  'contactTitle',
  'authorityAttestation',
  'evidenceType',
  'note',
];

describe('AT-REQ-002 C — the vetting action and its audit record', () => {
  atTest(
    'AT-002.11',
    'the recorded vet captures who vetted and when, the NGO name, a public reference link, the contact name, title and authority attestation, the evidence type and a note',
    async ({ open }) => {
      const { w, sut } = await open();
      const ngo = await sut.provisionNgo(w.email('ngo-11'), { emailVerified: true });
      const admin = await sut.provisionPlatformAdmin(w.email('admin-11'));

      const outcome = await sut.setVetting(admin, {
        organizationId: ngo.organizationId,
        action: 'vet',
        ...EVIDENCE,
      });
      expect(outcome, 'the platform admin vet was refused').toMatchObject({
        ok: true,
        organizationId: ngo.organizationId,
        vetted: true,
        changed: true,
      });
      if (!outcome.ok) return;

      const record = await sut.vettingRecord(ngo.organizationId);
      expect(record, 'the vet wrote no aggregate row').not.toBeNull();
      if (record === null) return;
      expect(record.organizationId).toBe(ngo.organizationId);
      expect(record.vetted).toBe(true);
      expect(record.vettedByAccountId, 'the aggregate does not name who vetted').toBe(admin.accountId);
      expect(Number.isNaN(Date.parse(record.vettedAt)), 'the aggregate does not name when the vet happened').toBe(false);
      expect(record.organizationName).toBe(EVIDENCE.organizationName);
      expect(record.publicReferenceUrl).toBe(EVIDENCE.publicReferenceUrl);
      expect(record.contactName).toBe(EVIDENCE.contactName);
      expect(record.contactTitle).toBe(EVIDENCE.contactTitle);
      expect(record.authorityAttestation).toBe(EVIDENCE.authorityAttestation);
      expect(record.evidenceType).toBe(EVIDENCE.evidenceType);
      expect(record.note).toBe(EVIDENCE.note);
      expect(record.registration).toBeNull();

      const audits = await sut.vettingAuditEvents(ngo.organizationId);
      expect(audits, 'the vet wrote no audit row').toHaveLength(1);
      const audit = audits[0];
      expect(audit.actorAccountId, 'the audit row does not name who vetted').toBe(admin.accountId);
      expect(Number.isNaN(Date.parse(audit.occurredAt)), 'the audit row does not name when the vet happened').toBe(false);
      expect(audit.subjectOrgId).toBe(ngo.organizationId);
      expect(audit.reason).toBe(EVIDENCE.note);
      expect(audit.detail.action).toBe('vet');
      expect(audit.detail.previousVetted).toBe(false);
      expect(audit.detail.current.organizationId).toBe(ngo.organizationId);
      expect(audit.detail.current.vetted).toBe(true);
      expect(audit.detail.current.vettedByAccountId).toBe(admin.accountId);
      expect(audit.detail.current.organizationName).toBe(EVIDENCE.organizationName);
      expect(audit.detail.current.publicReferenceUrl).toBe(EVIDENCE.publicReferenceUrl);
      expect(audit.detail.current.contactName).toBe(EVIDENCE.contactName);
      expect(audit.detail.current.contactTitle).toBe(EVIDENCE.contactTitle);
      expect(audit.detail.current.authorityAttestation).toBe(EVIDENCE.authorityAttestation);
      expect(audit.detail.current.evidenceType).toBe(EVIDENCE.evidenceType);
      expect(audit.detail.current.note).toBe(EVIDENCE.note);
    },
  );

  atTest(
    'AT-002.11b',
    'a vet with any one required audit field absent does not commit and leaves no partial vetted state',
    async ({ open }) => {
      const { w, sut } = await open();
      const ngo = await sut.provisionNgo(w.email('ngo-11b'), { emailVerified: true });
      const admin = await sut.provisionPlatformAdmin(w.email('admin-11b'));
      const complete: VettingRequest = {
        organizationId: ngo.organizationId,
        action: 'vet',
        ...EVIDENCE,
      };

      for (const field of REQUEST_FIELDS) {
        const { [field]: _omitted, ...rest } = complete;
        const outcome = await sut.setVetting(admin, rest as VettingRequest & Record<string, unknown>);
        expect(outcome.ok, `a vet with ${field} absent still committed`).toBe(false);
        if (outcome.ok) return;
        expect(outcome.kind, `a vet with ${field} absent was refused as ${outcome.kind}: ${outcome.reason}`).toBe(
          'invalid-request',
        );
        expect(await sut.vettingRecord(ngo.organizationId), `a vet with ${field} absent left an aggregate row`).toBeNull();
        expect(await sut.vettingAuditEvents(ngo.organizationId), `a vet with ${field} absent wrote an audit row`).toEqual([]);
      }

      const validRow = {
        organizationId: ngo.organizationId,
        vetted: true,
        vettedByAccountId: admin.accountId,
        vettedAt: new Date().toISOString(),
        organizationName: EVIDENCE.organizationName,
        publicReferenceUrl: EVIDENCE.publicReferenceUrl,
        contactName: EVIDENCE.contactName,
        contactTitle: EVIDENCE.contactTitle,
        authorityAttestation: EVIDENCE.authorityAttestation,
        evidenceType: EVIDENCE.evidenceType,
        note: EVIDENCE.note,
      };

      for (const field of SCHEMA_FIELDS) {
        const outcome = await sut.attemptVettingRowAsOperator({ ...validRow, [field]: null });
        expect(outcome.ok, `the schema accepted a row with ${field} null`).toBe(false);
        if (outcome.ok) return;
        expect(
          outcome.reason,
          `a null ${field} was refused for a reason other than a not-null constraint: ${outcome.reason}`,
        ).toMatch(/not-null constraint/i);
        expect(await sut.vettingRecord(ngo.organizationId), `a null ${field} left an aggregate row`).toBeNull();
      }
    },
  );

  atTest(
    'AT-002.29',
    'a vet or unvet from an NGO account, a volunteer or an unauthenticated caller is rejected with no tier change and no verification-outcome event',
    async ({ open }) => {
      const { w, sut } = await open();
      const ngo = await sut.provisionNgo(w.email('ngo-29'), { emailVerified: true });
      const volunteer = await sut.provisionVolunteer(w.email('vol-29'));
      const admin = await sut.provisionPlatformAdmin(w.email('admin-29'));
      const deactivatedAdmin = await sut.provisionPlatformAdmin(w.email('admin-29-off'));
      await sut.deactivateAccountAsOperator(deactivatedAdmin.accountId);

      const vetRequest: VettingRequest = { organizationId: ngo.organizationId, action: 'vet', ...EVIDENCE };
      const unvetRequest: VettingRequest = { organizationId: ngo.organizationId, action: 'unvet', note: EVIDENCE.note };
      const outcomeEvents = () => sut.notificationEvents({ event: 'vetting.outcome', recipientId: ngo.accountId });

      const callers: ReadonlyArray<{
        label: string;
        session: Session | null;
        kind: 'not-a-platform-admin' | 'unauthenticated' | 'account-deactivated';
        status: number;
      }> = [
        { label: "the NGO's own admin", session: ngo.session, kind: 'not-a-platform-admin', status: 403 },
        { label: 'a volunteer', session: volunteer, kind: 'not-a-platform-admin', status: 403 },
        { label: 'an unauthenticated caller', session: null, kind: 'unauthenticated', status: 401 },
        { label: 'a deactivated platform admin', session: deactivatedAdmin, kind: 'account-deactivated', status: 403 },
      ];

      expect(await outcomeEvents(), 'a verification-outcome event already existed for this NGO').toEqual([]);

      const assertRefused = async (label: string, session: Session | null, request: VettingRequest, kind: string, status: number) => {
        const beforeRecord = await sut.vettingRecord(ngo.organizationId);
        const beforeAudits = await sut.vettingAuditEvents(ngo.organizationId);
        const beforeEvents = await outcomeEvents();

        const outcome = await sut.setVetting(session, request);
        expect(outcome.ok, `${label} was admitted`).toBe(false);
        if (outcome.ok) return;
        expect(outcome.kind, `${label} was refused as ${outcome.kind}: ${outcome.reason}`).toBe(kind);
        expect(outcome.status, `${label} was refused with status ${outcome.status}`).toBe(status);

        expect(await sut.vettingRecord(ngo.organizationId), `${label} changed the vetting record`).toEqual(beforeRecord);
        expect(await sut.vettingAuditEvents(ngo.organizationId), `${label} wrote an audit row`).toEqual(beforeAudits);
        expect(await outcomeEvents(), `${label} wrote a verification-outcome event`).toEqual(beforeEvents);
      };

      for (const caller of callers) {
        await assertRefused(`${caller.label} vetting an unvetted NGO`, caller.session, vetRequest, caller.kind, caller.status);
        await assertRefused(`${caller.label} unvetting an unvetted NGO`, caller.session, unvetRequest, caller.kind, caller.status);
      }

      const given = await sut.setVetting(admin, vetRequest);
      expect(given, 'the Given platform admin vet was refused').toMatchObject({
        ok: true,
        organizationId: ngo.organizationId,
        vetted: true,
        changed: true,
      });
      if (!given.ok) return;

      for (const caller of callers) {
        await assertRefused(`${caller.label} vetting a vetted NGO`, caller.session, vetRequest, caller.kind, caller.status);
        await assertRefused(`${caller.label} unvetting a vetted NGO`, caller.session, unvetRequest, caller.kind, caller.status);
      }
    },
  );

  atTest(
    'AT-002.30',
    'only the manual founder vet and unvet path exists — no automated verification, KYC workflow or document-review status transition',
    async ({ open }) => {
      expect(vettingRouteProblems(), 'the write-route inventory does not admit exactly one platform-admin path to the vetting definer').toEqual(
        [],
      );
      expect(orgVettingWriterProblems(), 'a statement outside public.set_organization_vetting writes public.org_vetting').toEqual([]);
      expect(scheduledVettingProblems(), 'a scheduled job or a trigger on org_vetting touches vetting').toEqual([]);
      expect(kycSurfaceProblems(), 'a route folder, write-route row or shared module names a KYC or automated-verification surface').toEqual(
        [],
      );
      expect(vettedStateProblems(), 'the vetted state is not a two-value boolean, or names a third pending or under-review state').toEqual(
        [],
      );

      const { w, sut } = await open();
      const ngo = await sut.provisionNgo(w.email('ngo-30'), { emailVerified: true });
      const admin = await sut.provisionPlatformAdmin(w.email('admin-30'));

      expect(await sut.vettingRecord(ngo.organizationId), 'no organisation is vetted without an admin action').toBeNull();

      const vetOutcome = await sut.setVetting(admin, {
        organizationId: ngo.organizationId,
        action: 'vet',
        ...EVIDENCE,
      });
      expect(vetOutcome.ok, 'the platform admin vet was refused').toBe(true);
      if (!vetOutcome.ok) return;

      const vettedRecord = await sut.vettingRecord(ngo.organizationId);
      expect(vettedRecord?.vetted, 'a vet is what makes an organisation vetted').toBe(true);

      const unvetOutcome = await sut.setVetting(admin, {
        organizationId: ngo.organizationId,
        action: 'unvet',
        note: EVIDENCE.note,
      });
      expect(unvetOutcome.ok, 'the platform admin unvet was refused').toBe(true);
      if (!unvetOutcome.ok) return;

      const unvettedRecord = await sut.vettingRecord(ngo.organizationId);
      expect(unvettedRecord?.vetted, 'an unvet is what makes an organisation unvetted').toBe(false);

      expect(
        Object.keys(unvettedRecord ?? {}).some((key) => /status|review|pending|kyc|workflow/i.test(key)),
        'the vetting record carries no document-review or approval-workflow state',
      ).toBe(false);
    },
  );

  atTest('AT-002.12', 'unvetting a vetted NGO closes publishing, is audit-recorded, and leaves project-fuel funding unblocked', awaiting(AWAITED.publishFlow, AWAITED.projectFuelCheckout));

  atTest(
    'AT-002.13',
    'a vet or unvet emits the verification-outcome notification to the NGO through the normal event path, never a side-channel email',
    async ({ open }) => {
      expect(
        providerClientImporters().sort(),
        'a component other than the emitter imports a comms-provider client or holds its credential',
      ).toEqual(['notifications.emitter']);
      expect(strayNotificationWriters(), 'something other than the emitter inserts into the notification outbox').toEqual([]);

      const { w, sut } = await open();
      const ngo = await sut.provisionNgo(w.email('ngo-13'), { emailVerified: true });
      const admin = await sut.provisionPlatformAdmin(w.email('admin-13'));
      const outcomeEvents = () => sut.notificationEvents({ event: VETTING_OUTCOME, recipientId: ngo.accountId });

      const assertOutcome = async (action: 'vet' | 'unvet', eventId: string | null) => {
        expect(eventId, `${action} returned no notification event id`).toEqual(expect.any(String));
        if (eventId === null) return;
        const events = await outcomeEvents();
        const matching = events.filter((event) => event.id === eventId);
        expect(matching, `${action} did not write exactly one ${VETTING_OUTCOME} event`).toHaveLength(1);
        const event = matching[0];
        expect(event.actorAccountId, `${action} did not name the administrator as actor`).toBe(admin.accountId);
        expect(event.payload.outcome, `${action} payload does not tell the outcome apart`).toBe(
          action === 'vet' ? 'vetted' : 'unvetted',
        );
        expect(event.payload.organizationId, `${action} payload does not name the organisation`).toBe(ngo.organizationId);
        const deliveries = await sut.notificationDeliveries({ eventId, recipientId: ngo.accountId });
        expect(
          pairProblems(expectedPairs({ ngo: ngo.accountId }, ['ngo'], VETTING_CHANNELS), countPairs(deliveries)),
          `${action} deliveries were not the class default channels to the seat holder`,
        ).toEqual([]);
        for (const delivery of deliveries) {
          expect(delivery.emittedBy, `${action} ${delivery.channel} delivery was not stamped by the emitter`).toBe(
            EMITTER_COMPONENT,
          );
          expect(delivery.payload.outcome, `${action} ${delivery.channel} payload disagrees with the event`).toBe(
            event.payload.outcome,
          );
          expect(delivery.state, `${action} ${delivery.channel} delivery was not left pending`).toBe('pending');
        }
      };

      const vet = await sut.setVetting(admin, { organizationId: ngo.organizationId, action: 'vet', ...EVIDENCE });
      expect(vet, 'the platform admin vet was refused').toMatchObject({
        ok: true,
        organizationId: ngo.organizationId,
        vetted: true,
        changed: true,
      });
      if (!vet.ok) return;
      await assertOutcome('vet', vet.notificationEventId);
      expect(await outcomeEvents(), 'a vet wrote more than one verification-outcome event').toHaveLength(1);

      const unvet = await sut.setVetting(admin, {
        organizationId: ngo.organizationId,
        action: 'unvet',
        note: EVIDENCE.note,
      });
      expect(unvet, 'the platform admin unvet was refused').toMatchObject({
        ok: true,
        organizationId: ngo.organizationId,
        vetted: false,
        changed: true,
      });
      if (!unvet.ok) return;
      await assertOutcome('unvet', unvet.notificationEventId);
      expect(await outcomeEvents(), 'vet then unvet did not write exactly one event each').toHaveLength(2);

      const noSeat = await sut.provisionNgo(w.email('ngo-13-noseat'), { emailVerified: true });
      await sut.removeOrganizationSeatAsOperator(noSeat.organizationId);
      const noSeatVet = await sut.setVetting(admin, {
        organizationId: noSeat.organizationId,
        action: 'vet',
        ...EVIDENCE,
      });
      expect(noSeatVet.ok, 'a vet of an organisation with no seat holder still committed').toBe(false);
      if (noSeatVet.ok) return;
      expect(noSeatVet.kind, `no-seat vet was refused as ${noSeatVet.kind}: ${noSeatVet.reason}`).toBe('refused');
      expect(await sut.vettingRecord(noSeat.organizationId), 'no-seat vet left an aggregate row').toBeNull();
      expect(await sut.vettingAuditEvents(noSeat.organizationId), 'no-seat vet wrote an audit row').toEqual([]);
      expect(
        await sut.notificationEvents({ event: VETTING_OUTCOME, recipientId: noSeat.accountId }),
        'no-seat vet wrote a verification-outcome event',
      ).toEqual([]);

      const noEmail = await sut.provisionNgo(w.email('ngo-13-noemail'), { emailVerified: true });
      await sut.clearAccountEmailAsOperator(noEmail.accountId);
      const noEmailVet = await sut.setVetting(admin, {
        organizationId: noEmail.organizationId,
        action: 'vet',
        ...EVIDENCE,
      });
      expect(noEmailVet.ok, 'a vet of a seat holder with no email address still committed').toBe(false);
      if (noEmailVet.ok) return;
      expect(noEmailVet.kind, `no-email vet was refused as ${noEmailVet.kind}: ${noEmailVet.reason}`).toBe('refused');
      expect(await sut.vettingRecord(noEmail.organizationId), 'no-email vet left an aggregate row').toBeNull();
      expect(await sut.vettingAuditEvents(noEmail.organizationId), 'no-email vet wrote an audit row').toEqual([]);
      expect(
        await sut.notificationEvents({ event: VETTING_OUTCOME, recipientId: noEmail.accountId }),
        'no-email vet wrote a verification-outcome event',
      ).toEqual([]);

      const twoSeat = await sut.provisionNgo(w.email('ngo-13-twoseat'), { emailVerified: true });
      const extraSeat = await sut.provisionNgo(w.email('ngo-13-extra'), { emailVerified: true });
      await sut.addOrganizationSeatAsOperator(twoSeat.organizationId, extraSeat.accountId);
      const twoSeatNotice = vettingOutcomeNotice('vetted');
      const twoSeatVet = await sut.attemptVettingDefinerAsOperator({
        accountId: admin.accountId,
        request: { organizationId: twoSeat.organizationId, action: 'vet', ...EVIDENCE },
        notice: { channels: [...twoSeatNotice.channels], copy: twoSeatNotice.copy },
      });
      expect(twoSeatVet.ok, 'a vet of an organisation with two seat holders still committed').toBe(false);
      if (!twoSeatVet.ok) {
        expect(twoSeatVet.reason, `two-seat vet reason was ${twoSeatVet.reason}`).toMatch(/more than one seat holder/);
      }
      expect(await sut.vettingRecord(twoSeat.organizationId), 'two-seat vet left an aggregate row').toBeNull();
      expect(await sut.vettingAuditEvents(twoSeat.organizationId), 'two-seat vet wrote an audit row').toEqual([]);
      expect(
        await sut.notificationEvents({ event: VETTING_OUTCOME, recipientId: twoSeat.accountId }),
        'two-seat vet wrote a verification-outcome event',
      ).toEqual([]);
      expect(await sut.spendRows(twoSeat.organizationId), 'two-seat vet wrote a spend row').toEqual([]);
      await sut.removeOrganizationSeatAsOperator(twoSeat.organizationId);
      if (twoSeatVet.ok) return;

      const late = await sut.provisionNgo(w.email('ngo-13-late'), { emailVerified: true });
      const copy = vettingOutcomeNotice('vetted').copy;
      const lateOutcome = await sut.attemptVettingDefinerAsOperator({
        accountId: admin.accountId,
        request: { organizationId: late.organizationId, action: 'vet', ...EVIDENCE },
        notice: { channels: ['not-a-channel'], copy },
      });
      expect(lateOutcome.ok, 'an unauthorised channel list still committed').toBe(false);
      if (!lateOutcome.ok) {
        expect(lateOutcome.reason, `unauthorised channels were refused as ${lateOutcome.reason}`).toMatch(
          /channels are not the class default/,
        );
        expect(lateOutcome.reason, 'unauthorised channels reached the emitter enum cast').not.toMatch(/notification_channel/);
      }
      await assertAbsentAfterLateFailure(sut, late.organizationId, late.accountId);
    },
  );

  atTest(
    'AT-002.14',
    'the vetting flow is a single audited admin action with no multi-step approval chain',
    async ({ open }) => {
      expect(vettingRouteProblems(), 'more than one write route reaches the vetting definer').toEqual([]);
      expect(orgVettingWriterProblems(), 'a statement outside public.set_organization_vetting writes public.org_vetting').toEqual(
        [],
      );
      expect(scheduledVettingProblems(), 'a scheduled job or a trigger on org_vetting touches vetting').toEqual([]);
      expect(kycSurfaceProblems(), 'a route folder, write-route row or shared module names a KYC or automated-verification surface').toEqual(
        [],
      );
      expect(vettedStateProblems(), 'the vetted state is not a two-value boolean, or names a third pending or under-review state').toEqual(
        [],
      );

      const { w, sut } = await open();
      const ngo = await sut.provisionNgo(w.email('ngo-14'), { emailVerified: true });
      const admin = await sut.provisionPlatformAdmin(w.email('admin-14'));

      expect(await sut.vettingRecord(ngo.organizationId), 'the organisation was vetted before the one admin call').toBeNull();
      expect(await sut.vettingAuditEvents(ngo.organizationId), 'an audit row existed before the one admin call').toEqual([]);
      expect(
        await sut.notificationEvents({ event: VETTING_OUTCOME, recipientId: ngo.accountId }),
        'a verification-outcome event existed before the one admin call',
      ).toEqual([]);

      const outcome = await sut.setVetting(admin, {
        organizationId: ngo.organizationId,
        action: 'vet',
        ...EVIDENCE,
      });
      expect(outcome, 'the one platform admin vet was refused').toMatchObject({
        ok: true,
        organizationId: ngo.organizationId,
        vetted: true,
        changed: true,
      });
      if (!outcome.ok) return;

      const record = await sut.vettingRecord(ngo.organizationId);
      expect(record?.vetted, 'the one call did not leave a vetted record').toBe(true);
      expect(
        Object.keys(record ?? {}).some((key) => /status|review|pending|kyc|workflow|approval/i.test(key)),
        'the record carries an intermediate approval or review state',
      ).toBe(false);
      expect(await sut.vettingAuditEvents(ngo.organizationId), 'the one vet did not write exactly one audit row').toHaveLength(1);
      expect(
        await sut.notificationEvents({ event: VETTING_OUTCOME, recipientId: ngo.accountId }),
        'the one vet did not write exactly one verification-outcome event',
      ).toHaveLength(1);
    },
  );
});

async function assertAbsentAfterLateFailure(
  sut: OrganizationsSut,
  organizationId: string,
  recipientId: string,
): Promise<void> {
  expect(await sut.vettingRecord(organizationId), 'the late failure left an aggregate row').toBeNull();
  expect(await sut.vettingAuditEvents(organizationId), 'the late failure left an audit row').toEqual([]);
  expect(
    await sut.notificationEvents({ event: VETTING_OUTCOME, recipientId }),
    'the late failure left a verification-outcome event',
  ).toEqual([]);
  expect(await sut.notificationDeliveries({ recipientId }), 'the late failure left a delivery').toEqual([]);
  expect(await sut.spendRows(organizationId), 'the late failure left a spend row').toEqual([]);
}
