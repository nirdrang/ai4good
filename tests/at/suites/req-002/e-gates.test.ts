/**
 * AT-REQ-002 · E. What vetting gates, and what it never gates — AT-002.19, AT-002.20, AT-002.28,
 * AT-002.21, AT-002.22
 * Source: .taskmaster/docs/acceptance/at-req-002.md
 *
 * AT-002.19 and AT-002.20 wait on the publish flow, and AT-002.20 on the triage queue as well.
 * Neither exists in this tree. Both are declared red by shape in `tests/at/expected/req-002.json`;
 * the publishing decision they will consult ships as a pure module with no route behind it.
 */

import { describe, expect } from 'vitest';
import { createConfigRegistry } from '../../harness/config.ts';
import { atTest } from './_bind.ts';
import { AWAITED, awaiting } from './_pending.ts';
import {
  orgVettingWriterProblems,
  scheduledVettingProblems,
  vettingRouteProblems,
} from './_source-scan.ts';
import type { AllowanceOutcome, OrganizationsSut, Session, WriteRefusal } from './_contract.ts';

const EVIDENCE = {
  organizationName: 'Riverside Shelter',
  publicReferenceUrl: 'https://example.org/riverside-shelter',
  contactName: 'Dana Okonkwo',
  contactTitle: 'Executive Director',
  authorityAttestation: 'The named contact attests they have authority to bind the organisation.',
  evidenceType: 'organization_website',
  note: 'Public website matches the registry listing and the named contact.',
} as const;

const UNVERIFIED_PIN = 'req-002.discovery.daily_credits.unverified';
const VETTED_PIN = 'req-002.discovery.daily_credits.vetted';

function discoveryRefusalReasons(outcomes: Array<{ ok: true } | WriteRefusal>): string[] {
  return outcomes.filter((outcome): outcome is WriteRefusal => outcome.ok === false).map((outcome) => outcome.reason);
}

async function vetOrganisation(sut: OrganizationsSut, admin: Session, organizationId: string) {
  const outcome = await sut.setVetting(admin, {
    organizationId,
    action: 'vet',
    ...EVIDENCE,
  });
  expect(outcome, 'the platform admin vet was refused').toMatchObject({
    ok: true,
    organizationId,
    vetted: true,
    changed: true,
  });
  return outcome;
}

describe('AT-REQ-002 E — what vetting gates, and what it never gates', () => {
  atTest('AT-002.19', 'an unvetted NGO with a completed scope is blocked from publishing in the UI and at the API while the project may sit at scoped indefinitely', awaiting(AWAITED.publishFlow));

  atTest('AT-002.20', 'a vetted NGO with a completed scope publishes and the project enters triage', awaiting(AWAITED.publishFlow, AWAITED.triageQueue));

  atTest(
    'AT-002.28',
    'when concierge onboarding of an admitted pilot NGO completes, the audited vet action has run and the NGO is founder-vetted on the vetted-tier grant',
    async ({ open }) => {
      // Concierge onboarding is not a route. It is the pilot operator running the ordinary
      // audited vet action by hand. That is the whole content of "vetted is the pilot default":
      // the default is a value the operator sets through the audited path, never a bypass that
      // sets it for them.

      // scanVettingRoutes: exactly one write route reaches the definer, and it admits only the
      // platform administrator — there is no concierge-onboarding route beside it.
      expect(
        vettingRouteProblems(),
        'the write-route inventory does not admit exactly one platform-admin path to the vetting definer',
      ).toEqual([]);
      // scanOrgVettingWriters: no statement outside the definer writes org_vetting — there is no
      // second writer and no auto-vet path.
      expect(
        orgVettingWriterProblems(),
        'a statement outside public.set_organization_vetting writes public.org_vetting',
      ).toEqual([]);
      // scanScheduledVetting: no cron job that vets, and no writer of the vetted column outside the definer.
      expect(scheduledVettingProblems(), 'a scheduled job or a writer of the vetted column outside the definer touches vetting').toEqual(
        [],
      );

      const pins = createConfigRegistry();
      const vettedGrant = pins.get<number>(VETTED_PIN);

      const { w, sut } = await open();
      const ngo = await sut.provisionNgo(w.email('ngo-28'), { emailVerified: true });
      const admin = await sut.provisionPlatformAdmin(w.email('admin-28'));

      expect(
        await sut.vettingRecord(ngo.organizationId),
        'signup left the organisation founder-vetted without an operator vet',
      ).toBeNull();

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
      expect(record.vetted, 'concierge onboarding did not leave the organisation founder-vetted').toBe(true);
      expect(record, 'the vetting record does not carry the evidence the operator gave').toMatchObject(EVIDENCE);

      const audits = await sut.vettingAuditEvents(ngo.organizationId);
      expect(audits, 'the vet wrote no audit row').toHaveLength(1);
      expect(
        audits[0].actorAccountId,
        'the vet action is not attributed to the platform administrator who ran it',
      ).toBe(admin.accountId);
      expect(audits[0].detail.action).toBe('vet');

      const allowance = await sut.readAllowance(ngo.session, ngo.organizationId);
      expect(
        allowance.ok,
        allowance.ok
          ? 'the allowance read was refused'
          : `the allowance read was refused as ${allowance.kind}: ${allowance.reason}`,
      ).toBe(true);
      if (!allowance.ok) return;
      expect(allowance.allowance.vetted).toBe(true);
      expect(allowance.allowance.dailyGrant, 'the daily grant is not the vetted pin').toBe(vettedGrant);
      expect(allowance.allowance.remaining, 'the remaining credits are not the vetted pin').toBe(vettedGrant);
      expect(allowance.allowance.spentToday).toBe(0);
    },
  );

  atTest(
    'AT-002.21',
    'an unvetted NGO running Discovery within its allowance is never blocked by vetting status',
    async ({ open }) => {
      const pins = createConfigRegistry();
      const unverifiedGrant = pins.get<number>(UNVERIFIED_PIN);

      const { w, sut } = await open();
      const ngo = await sut.provisionNgo(w.email('ngo-21'), { emailVerified: true });

      const first = await sut.readAllowance(ngo.session, ngo.organizationId);
      expect(
        first.ok,
        first.ok ? 'the first allowance read was refused' : `the first allowance read was refused as ${first.kind}: ${first.reason}`,
      ).toBe(true);
      if (!first.ok) return;
      expect(first.allowance.vetted, 'this body is about an UNVETTED organisation').toBe(false);
      expect(first.allowance.dailyGrant, 'the unvetted daily grant is not the unverified pin').toBe(unverifiedGrant);
      expect(first.allowance.spentToday).toBe(0);
      expect(first.allowance.remaining).toBe(unverifiedGrant);

      const debits: AllowanceOutcome[] = [];
      for (let n = 1; n <= unverifiedGrant; n += 1) {
        const debit = await sut.debitAllowance(ngo.session, ngo.organizationId, 1);
        expect(
          debit.ok,
          debit.ok
            ? `debit ${n} of ${unverifiedGrant} was refused`
            : `debit ${n} of ${unverifiedGrant} was refused as ${debit.kind}: ${debit.reason}`,
        ).toBe(true);
        if (!debit.ok) return;
        expect(debit.allowance.vetted).toBe(false);
        expect(debit.allowance.dailyGrant).toBe(unverifiedGrant);
        expect(debit.allowance.spentToday).toBe(n);
        expect(debit.allowance.remaining).toBe(unverifiedGrant - n);
        debits.push(debit);
      }

      const publishing = await sut.publishingAllowed(ngo.organizationId);
      expect(publishing.ok, 'publishing was allowed for the same unvetted organisation that just spent its Discovery grant').toBe(
        false,
      );

      const exhausted = await sut.debitAllowance(ngo.session, ngo.organizationId, 1);
      expect(exhausted.ok, 'a debit past the unverified grant was admitted').toBe(false);
      if (exhausted.ok) return;
      expect(exhausted.kind, `the extra debit was refused as ${exhausted.kind}: ${exhausted.reason}`).toBe(
        'daily-allowance-exhausted',
      );

      // Debits inside the grant must not be refused at all. The exhausted sentence names
      // get-vetted as a remedy; that is the zero-credit block, not a vetting gate.
      const inAllowanceRefusals = discoveryRefusalReasons([first, ...debits]);
      expect(inAllowanceRefusals, 'Discovery within the allowance was refused').toEqual([]);
    },
  );

  atTest(
    'AT-002.22',
    'an email-unverified NGO is blocked from any Discovery message at every tier',
    async ({ open }) => {
      const { w, sut } = await open();
      const unverified = await sut.provisionNgo(w.email('ngo-22-unverified'), { emailVerified: false });
      const verified = await sut.provisionNgo(w.email('ngo-22-verified'), { emailVerified: true });
      const admin = await sut.provisionPlatformAdmin(w.email('admin-22'));

      // No Discovery send route exists in this repository. A green here says the shipped
      // discoveryMessageAllowed decision answers correctly. It does not say any deployed
      // Discovery surface consults it.
      const blockedUnvetted = await sut.discoveryMessageAllowed(unverified.session);
      expect(blockedUnvetted.ok, 'an email-unverified NGO was allowed a Discovery message at the unvetted tier').toBe(false);
      if (blockedUnvetted.ok) return;
      expect(blockedUnvetted.reason, 'the refusal does not name verification').toMatch(/verif/i);
      expect(blockedUnvetted.reason, 'the refusal does not name the email address as what needs verifying').toMatch(/email/i);
      expect(blockedUnvetted.reason, 'the refusal names the fault and not the remedy').toMatch(/link/i);

      const allowedUnvetted = await sut.discoveryMessageAllowed(verified.session);
      expect(allowedUnvetted.ok, 'an email-verified NGO at the same unvetted tier was refused a Discovery message').toBe(true);
      if (allowedUnvetted.ok) expect(allowedUnvetted.value).toBe('verified');

      const vetted = await vetOrganisation(sut, admin, unverified.organizationId);
      if (!vetted.ok) return;
      const record = await sut.vettingRecord(unverified.organizationId);
      expect(record?.vetted, 'the email-unverified organisation was not vetted, so the second refusal is not at the vetted tier').toBe(
        true,
      );

      const blockedVetted = await sut.discoveryMessageAllowed(unverified.session);
      expect(blockedVetted.ok, 'vetting the same email-unverified NGO opened Discovery').toBe(false);
      if (blockedVetted.ok) return;
      expect(blockedVetted.reason, 'the post-vet refusal is not the same email-verification refusal').toBe(blockedUnvetted.reason);

      const controlVetted = await vetOrganisation(sut, admin, verified.organizationId);
      if (!controlVetted.ok) return;
      const allowedVetted = await sut.discoveryMessageAllowed(verified.session);
      expect(allowedVetted.ok, 'an email-verified NGO at the vetted tier was refused a Discovery message').toBe(true);
    },
  );
});
