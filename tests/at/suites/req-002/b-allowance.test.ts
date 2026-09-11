/**
 * AT-REQ-002 · B. Tiers and the daily Discovery allowance — AT-002.04 .. AT-002.08, AT-002.10,
 * AT-002.26, AT-002.27, AT-002.31
 * Source: .taskmaster/docs/acceptance/at-req-002.md
 *
 * Four ids here wait on surfaces this tree does not have and are declared red by shape in
 * `tests/at/expected/req-002.json`: the paid-continuation path (AT-002.10), the funded remedy
 * (AT-002.26) and fuel funding itself (AT-002.31) need the project-fuel checkout; AT-002.05 is
 * proved at loop through the allowance contract and waits, at integration only, on a Discovery
 * surface that shows the three remedies to somebody.
 */

import { describe, expect } from 'vitest';
import { utcDayOf } from '../../../../supabase/functions/_shared/discovery-allowance.ts';
import { createConfigRegistry } from '../../harness/config.ts';
import { atTest } from './_bind.ts';
import { AWAITED, awaiting, LEAF, notLanded } from './_pending.ts';
import { grantPinProblems, scanGrantPins } from './_source-scan.ts';
import type { OrganizationsSut, Session } from './_contract.ts';

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

function previousUtcDay(day: string): string {
  return utcDayOf(Date.parse(`${day}T00:00:00.000Z`) - 24 * 60 * 60 * 1000);
}

async function debitOne(sut: OrganizationsSut, session: Session, organizationId: string, label: string) {
  const outcome = await sut.debitAllowance(session, organizationId, 1);
  expect(outcome.ok, `${label} was refused`).toBe(true);
  return outcome;
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

describe('AT-REQ-002 B — tiers and the daily Discovery allowance', () => {
  atTest(
    'AT-002.04',
    'an unverified-tier NGO reads a daily grant of exactly the unverified pin, can consume up to it and never past it, may draft and cannot publish',
    async ({ open }) => {
      const pins = createConfigRegistry();
      const unverifiedGrant = pins.get<number>(UNVERIFIED_PIN);
      const vettedGrant = pins.get<number>(VETTED_PIN);
      expect(
        scanGrantPins({
          unverifiedPin: unverifiedGrant,
          vettedPin: vettedGrant,
          typescriptUnverified: unverifiedGrant,
          typescriptVetted: vettedGrant,
          grantFunctionSql:
            'create function public.discovery_daily_grant(p_vetted boolean)\n' +
            `as $$ select case when p_vetted then ${vettedGrant + 1} else ${unverifiedGrant + 1} end; $$;`,
        }).length,
        'the grant-drift scan reported no disagreement when both SQL arms differed from the pins',
      ).toBeGreaterThan(0);
      expect(grantPinProblems(), 'the pinned registry, TypeScript constants and SQL grant disagree').toEqual([]);

      const { w, sut } = await open();
      const ngo = await sut.provisionNgo(w.email('ngo-04'), { emailVerified: true });

      const first = await sut.readAllowance(ngo.session, ngo.organizationId);
      expect(
        first.ok,
        first.ok ? 'the first allowance read was refused' : `the first allowance read was refused as ${first.kind}: ${first.reason}`,
      ).toBe(true);
      if (!first.ok) return;
      expect(first.allowance.organizationId).toBe(ngo.organizationId);
      expect(first.allowance.vetted).toBe(false);
      expect(first.allowance.dailyGrant, 'the unverified daily grant is not the unverified pin').toBe(unverifiedGrant);
      expect(first.allowance.spentToday).toBe(0);
      expect(first.allowance.remaining).toBe(unverifiedGrant);
      expect(first.allowance.utcDay, 'the allowance day is not a UTC calendar day').toMatch(/^\d{4}-\d{2}-\d{2}$/);

      const oversize = await sut.debitAllowance(ngo.session, ngo.organizationId, unverifiedGrant + 1);
      expect(oversize.ok, 'a debit larger than the unverified grant was admitted').toBe(false);
      if (!oversize.ok) {
        expect(oversize.kind, `the oversize debit was refused as ${oversize.kind}: ${oversize.reason}`).toBe(
          'daily-allowance-exhausted',
        );
      }
      expect(await sut.spendRows(ngo.organizationId), 'the refused oversize debit wrote a spend row').toEqual([]);

      for (let n = 1; n <= unverifiedGrant; n += 1) {
        const debit = await debitOne(sut, ngo.session, ngo.organizationId, `debit ${n} of ${unverifiedGrant}`);
        if (!debit.ok) return;
        expect(debit.allowance.dailyGrant).toBe(unverifiedGrant);
        expect(debit.allowance.spentToday).toBe(n);
        expect(debit.allowance.remaining).toBe(unverifiedGrant - n);
        expect(debit.allowance.vetted).toBe(false);
      }

      const blocked = await sut.debitAllowance(ngo.session, ngo.organizationId, 1);
      expect(blocked.ok, 'a debit past the unverified grant was admitted').toBe(false);
      if (!blocked.ok) {
        expect(blocked.kind, `the extra debit was refused as ${blocked.kind}: ${blocked.reason}`).toBe(
          'daily-allowance-exhausted',
        );
      }

      const after = await sut.readAllowance(ngo.session, ngo.organizationId);
      expect(after.ok, 'the allowance read after exhaustion was refused').toBe(true);
      if (!after.ok) return;
      expect(after.allowance.spentToday).toBe(unverifiedGrant);
      expect(after.allowance.remaining).toBe(0);
      expect(after.allowance.dailyGrant).toBe(unverifiedGrant);

      const project = await sut.createProjectAsOperator(ngo.organizationId, 'Shelter intake draft');
      expect(project.id, 'the unverified NGO could not hold a draft project').toBeTruthy();
      const page = await sut.publicProjectPage(project.id, ngo.session);
      expect(page.ok, 'the draft project did not render on the public project page').toBe(true);

      // The criterion also says this NGO cannot publish. No publish route exists in this tree, and
      // the design of record keeps those ids red for that reason. This body does not treat that
      // absence as proof.
    },
  );

  atTest('AT-002.05', 'at zero remaining credits on an unfunded project the next Discovery message is blocked and the remedies shown are get vetted, fund fuel, or wait for the next day', {
    default: notLanded(LEAF.D2_L2),
    integration: awaiting(AWAITED.discoverySurface),
  });

  atTest('AT-002.26', 'after the zero-credit block, funding project fuel makes the very next Discovery turn succeed, billed to fuel', awaiting(AWAITED.projectFuelCheckout, AWAITED.fundedTurnBilling));

  atTest('AT-002.27', 'after the zero-credit block, the day rollover makes the next free Discovery turn succeed on the reset allowance', notLanded(LEAF.D2_L2));

  atTest('AT-002.06', 'from any starting balance the UTC day rollover hard-resets the allowance to exactly the tier grant with no rollover, and a second reset does not occur in the same UTC day', notLanded(LEAF.D2_L3));

  atTest(
    'AT-002.07',
    'vetting an unverified NGO that has consumed k credits mid-day raises the cap to the vetted pin at once with remaining equal to the vetted pin minus k, and later days grant the vetted pin',
    async ({ open }) => {
      const pins = createConfigRegistry();
      const unverifiedGrant = pins.get<number>(UNVERIFIED_PIN);
      const vettedGrant = pins.get<number>(VETTED_PIN);
      const consumed = 4;
      expect(consumed, 'the mid-day consumption is not below the unverified pin').toBeLessThan(unverifiedGrant);

      const { w, sut } = await open();
      const ngo = await sut.provisionNgo(w.email('ngo-07'), { emailVerified: true });
      const admin = await sut.provisionPlatformAdmin(w.email('admin-07'));

      for (let n = 1; n <= consumed; n += 1) {
        const debit = await debitOne(sut, ngo.session, ngo.organizationId, `pre-vet debit ${n}`);
        if (!debit.ok) return;
      }

      const before = await sut.readAllowance(ngo.session, ngo.organizationId);
      expect(before.ok, 'the pre-vet allowance read was refused').toBe(true);
      if (!before.ok) return;
      expect(before.allowance.spentToday).toBe(consumed);
      expect(before.allowance.remaining).toBe(unverifiedGrant - consumed);

      const vetted = await vetOrganisation(sut, admin, ngo.organizationId);
      if (!vetted.ok) return;

      const raised = await sut.readAllowance(ngo.session, ngo.organizationId);
      expect(raised.ok, 'the post-vet allowance read was refused').toBe(true);
      if (!raised.ok) return;
      expect(raised.allowance.vetted).toBe(true);
      expect(raised.allowance.dailyGrant).toBe(vettedGrant);
      expect(raised.allowance.spentToday).toBe(consumed);
      expect(raised.allowance.remaining, 'the post-vet remaining is not the vetted pin minus spent').toBe(
        vettedGrant - consumed,
      );

      const rows = await sut.spendRows(ngo.organizationId);
      expect(rows, 'the mid-day spend did not write one day row').toHaveLength(1);
      const todayRow = rows[0];
      const yesterday = previousUtcDay(todayRow.utcDay);
      await sut.writeSpendRowAsOperator({
        organizationId: ngo.organizationId,
        utcDay: yesterday,
        spent: todayRow.spent,
        granted: todayRow.granted,
      });

      const nextDay = await sut.readAllowance(ngo.session, ngo.organizationId);
      expect(nextDay.ok, 'the following-day allowance read was refused').toBe(true);
      if (!nextDay.ok) return;
      expect(nextDay.allowance.utcDay).toBe(todayRow.utcDay);
      expect(nextDay.allowance.vetted).toBe(true);
      expect(nextDay.allowance.dailyGrant).toBe(vettedGrant);
      expect(nextDay.allowance.spentToday).toBe(0);
      expect(nextDay.allowance.remaining).toBe(vettedGrant);

      const firstOfDay = await debitOne(sut, ngo.session, ngo.organizationId, 'the first debit of the following day');
      if (!firstOfDay.ok) return;
      expect(firstOfDay.allowance.spentToday).toBe(1);
      expect(firstOfDay.allowance.remaining).toBe(vettedGrant - 1);

      const afterRows = await sut.spendRows(ngo.organizationId);
      expect(
        afterRows.map((row) => row.utcDay).sort(),
        'the following day did not write a new key beside yesterday',
      ).toEqual([yesterday, todayRow.utcDay].sort());
    },
  );

  atTest(
    'AT-002.08',
    're-vetting an unvetted NGO mid-day restores the vetted cap and mints no additional same-day credits',
    async ({ open }) => {
      const pins = createConfigRegistry();
      const unverifiedGrant = pins.get<number>(UNVERIFIED_PIN);
      const vettedGrant = pins.get<number>(VETTED_PIN);
      const consumed = 4;
      expect(consumed, 'the mid-day consumption is not below the unverified pin').toBeLessThan(unverifiedGrant);

      const { w, sut } = await open();
      const ngo = await sut.provisionNgo(w.email('ngo-08'), { emailVerified: true });
      const admin = await sut.provisionPlatformAdmin(w.email('admin-08'));

      for (let n = 1; n <= consumed; n += 1) {
        const debit = await debitOne(sut, ngo.session, ngo.organizationId, `pre-vet debit ${n}`);
        if (!debit.ok) return;
      }

      const firstVet = await vetOrganisation(sut, admin, ngo.organizationId);
      if (!firstVet.ok) return;

      const afterVet = await sut.readAllowance(ngo.session, ngo.organizationId);
      expect(afterVet.ok, 'the post-vet allowance read was refused').toBe(true);
      if (!afterVet.ok) return;
      expect(afterVet.allowance.dailyGrant).toBe(vettedGrant);
      expect(afterVet.allowance.remaining).toBe(vettedGrant - consumed);

      const unvet = await sut.setVetting(admin, {
        organizationId: ngo.organizationId,
        action: 'unvet',
        note: 'Unvet for the same-day re-vet arithmetic.',
      });
      expect(unvet, 'the unvet was refused').toMatchObject({
        ok: true,
        organizationId: ngo.organizationId,
        vetted: false,
        changed: true,
      });
      if (!unvet.ok) return;

      const afterUnvet = await sut.readAllowance(ngo.session, ngo.organizationId);
      expect(afterUnvet.ok, 'the post-unvet allowance read was refused').toBe(true);
      if (!afterUnvet.ok) return;
      expect(afterUnvet.allowance.vetted).toBe(false);
      expect(afterUnvet.allowance.dailyGrant, 'unvet lowered the same-day high-water mark').toBe(vettedGrant);
      expect(afterUnvet.allowance.spentToday).toBe(consumed);
      expect(afterUnvet.allowance.remaining).toBe(vettedGrant - consumed);

      const reVet = await vetOrganisation(sut, admin, ngo.organizationId);
      if (!reVet.ok) return;

      const afterReVet = await sut.readAllowance(ngo.session, ngo.organizationId);
      expect(afterReVet.ok, 'the post-re-vet allowance read was refused').toBe(true);
      if (!afterReVet.ok) return;
      expect(afterReVet.allowance.vetted).toBe(true);
      expect(afterReVet.allowance.dailyGrant).toBe(vettedGrant);
      expect(afterReVet.allowance.spentToday).toBe(consumed);
      expect(afterReVet.allowance.remaining, 're-vet minted additional same-day credits').toBe(vettedGrant - consumed);
      expect(afterReVet.allowance.remaining).toBe(afterUnvet.allowance.remaining);

      const rows = await sut.spendRows(ngo.organizationId);
      expect(rows, 're-vet stacked a second spend row').toHaveLength(1);
      expect(rows[0].spent).toBe(consumed);
      expect(rows[0].granted).toBe(vettedGrant);
    },
  );

  atTest('AT-002.10', 'the paid-continuation path routes to the ordinary project-fuel checkout and no Discovery-credit SKU, wallet or Discovery-only balance exists', awaiting(AWAITED.projectFuelCheckout));

  atTest('AT-002.31', 'an NGO of either tier funds ordinary project fuel and succeeds — funding is not vetting-gated', awaiting(AWAITED.projectFuelCheckout));
});
