/**
 * AT-REQ-002 · B. Tiers and the daily Discovery allowance — AT-002.04 .. AT-002.08, AT-002.10,
 * AT-002.26, AT-002.27, AT-002.31
 * Source: .taskmaster/docs/acceptance/at-req-002.md
 *
 * Three ids here wait on surfaces this tree does not have and are declared red by shape in
 * `tests/at/expected/req-002.json`: the paid-continuation path (AT-002.10), the funded remedy
 * (AT-002.26) and fuel funding itself (AT-002.31) need the project-fuel checkout. AT-002.05 is
 * proved at loop through the allowance contract and waits, at integration only, on a Discovery
 * surface that shows the three remedies to somebody.
 */

import { describe, expect } from 'vitest';
import { debitExceedsRemainingReason, utcDayOf } from '../../../../supabase/functions/_shared/discovery-allowance.ts';
import { createConfigRegistry } from '../../harness/config.ts';
import { atTest } from './_bind.ts';
import { AWAITED, awaiting } from './_pending.ts';
import { exhaustedSentenceProblems, grantPinProblems, scanGrantPins } from './_source-pins.ts';
import type { AllowanceOutcome, OrganizationsSut, Session, World } from './_contract.ts';

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

async function reachZeroCreditBlock(
  sut: OrganizationsSut,
  session: Session,
  organizationId: string,
  grant: number,
): Promise<Extract<AllowanceOutcome, { ok: false }> | null> {
  for (let n = 1; n <= grant; n += 1) {
    const debit = await debitOne(sut, session, organizationId, `debit ${n} of ${grant}`);
    if (!debit.ok) return null;
  }
  const blocked = await sut.debitAllowance(session, organizationId, 1);
  expect(blocked.ok, 'a debit past the grant was admitted').toBe(false);
  if (blocked.ok) return null;
  expect(blocked.kind, `the extra debit was refused as ${blocked.kind}: ${blocked.reason}`).toBe(
    'daily-allowance-exhausted',
  );
  return blocked;
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

async function persistSpendOnPreviousUtcDay(
  sut: OrganizationsSut,
  organizationId: string,
  today: string,
  spent: number,
  granted: number,
): Promise<void> {
  // Backdating the day row produces exactly the bytes the database holds one second after
  // midnight: a new day is a new key with no row, and the product has no midnight event to
  // observe. This body does not prove the crossing itself. No test in this tree can.
  await sut.writeSpendRowAsOperator({
    organizationId,
    utcDay: previousUtcDay(today),
    spent,
    granted,
  });
}

async function assertResetFromStartingRemaining(input: {
  sut: OrganizationsSut;
  session: Session;
  organizationId: string;
  grant: number;
  startingRemaining: number;
  today: string;
  processUtcDay: string | null;
  label: string;
}): Promise<void> {
  const { sut, session, organizationId, grant, startingRemaining, today, processUtcDay, label } = input;
  const spent = grant - startingRemaining;
  const yesterday = previousUtcDay(today);

  await persistSpendOnPreviousUtcDay(sut, organizationId, today, 0, grant);
  if (spent > 0) {
    const consumed = await sut.debitAllowance(session, organizationId, spent);
    expect(consumed.ok, `${label}: setting the starting spent was refused`).toBe(true);
    if (!consumed.ok) return;
  }

  const before = await sut.readAllowance(session, organizationId);
  expect(before.ok, `${label}: the pre-rollover allowance read was refused`).toBe(true);
  if (!before.ok) return;
  expect(before.allowance.remaining, `${label}: the starting remaining is not the parameterized remaining`).toBe(
    startingRemaining,
  );
  expect(before.allowance.spentToday).toBe(spent);
  expect(before.allowance.dailyGrant).toBe(grant);
  expect(before.allowance.utcDay).toBe(today);

  await persistSpendOnPreviousUtcDay(sut, organizationId, today, spent, grant);

  const rolled = await sut.readAllowance(session, organizationId);
  expect(rolled.ok, `${label}: the post-rollover allowance read was refused`).toBe(true);
  if (!rolled.ok) return;
  expect(rolled.allowance.utcDay).toBe(today);
  if (processUtcDay !== null) {
    expect(rolled.allowance.utcDay, `${label}: the product UTC day is not the test process's UTC day`).toBe(
      processUtcDay,
    );
  }
  expect(rolled.allowance.spentToday, `${label}: spend rolled over onto the new UTC day`).toBe(0);
  expect(rolled.allowance.remaining, `${label}: the new UTC day is not exactly the tier grant`).toBe(grant);
  expect(rolled.allowance.dailyGrant).toBe(grant);

  const rowsAfterRoll = await sut.spendRows(organizationId);
  expect(
    rowsAfterRoll.some((row) => row.utcDay === today),
    `${label}: the new UTC day already has a spend row after a read`,
  ).toBe(false);
  const yesterdayRow = rowsAfterRoll.find((row) => row.utcDay === yesterday);
  expect(yesterdayRow?.spent, `${label}: the previous day's spent did not stay on its own key`).toBe(spent);
  expect(yesterdayRow?.granted).toBe(grant);

  const firstOfDay = await debitOne(sut, session, organizationId, `${label}: the first debit of the new UTC day`);
  if (!firstOfDay.ok) return;
  expect(firstOfDay.allowance.spentToday).toBe(1);
  expect(firstOfDay.allowance.remaining).toBe(grant - 1);

  const secondRead = await sut.readAllowance(session, organizationId);
  expect(secondRead.ok, `${label}: the second same-day allowance read was refused`).toBe(true);
  if (!secondRead.ok) return;
  expect(secondRead.allowance.remaining, `${label}: a second reset occurred in the same UTC day`).toBe(grant - 1);
  expect(secondRead.allowance.spentToday).toBe(1);
  expect(secondRead.allowance.dailyGrant).toBe(grant);
}

async function proveUtcReset(
  open: () => Promise<{ w: World; sut: OrganizationsSut }>,
  processUtcDay: string | null,
): Promise<void> {
  const pins = createConfigRegistry();
  const unverifiedGrant = pins.get<number>(UNVERIFIED_PIN);
  const vettedGrant = pins.get<number>(VETTED_PIN);
  const partialUnverified = Math.floor(unverifiedGrant / 2);
  const partialVetted = Math.floor(vettedGrant / 2);
  expect(partialUnverified, 'the unverified partial remaining is not below the unverified pin').toBeLessThan(
    unverifiedGrant,
  );
  expect(partialUnverified, 'the unverified partial remaining is not above zero').toBeGreaterThan(0);
  expect(partialVetted, 'the vetted partial remaining is not below the vetted pin').toBeLessThan(vettedGrant);
  expect(partialVetted, 'the vetted partial remaining is not above zero').toBeGreaterThan(0);
  expect(vettedGrant, 'the vetted pin is not above the unverified pin').toBeGreaterThan(unverifiedGrant);

  const { w, sut } = await open();
  const admin = await sut.provisionPlatformAdmin(w.email('admin-06'));
  const unverified = await sut.provisionNgo(w.email('ngo-06-u'), { emailVerified: true });
  const vettedNgo = await sut.provisionNgo(w.email('ngo-06-v'), { emailVerified: true });

  const first = await sut.readAllowance(unverified.session, unverified.organizationId);
  expect(first.ok, 'the first unverified allowance read was refused').toBe(true);
  if (!first.ok) return;
  const today = first.allowance.utcDay;
  expect(today, 'the allowance day is not a UTC calendar day').toMatch(/^\d{4}-\d{2}-\d{2}$/);
  if (processUtcDay !== null) {
    expect(today, 'the product UTC day is not the test process UTC day').toBe(processUtcDay);
  }

  for (const remaining of [0, partialUnverified, unverifiedGrant]) {
    await assertResetFromStartingRemaining({
      sut,
      session: unverified.session,
      organizationId: unverified.organizationId,
      grant: unverifiedGrant,
      startingRemaining: remaining,
      today,
      processUtcDay,
      label: `unverified remaining ${remaining}`,
    });
  }

  const vetted = await vetOrganisation(sut, admin, vettedNgo.organizationId);
  if (!vetted.ok) return;

  const vettedRead = await sut.readAllowance(vettedNgo.session, vettedNgo.organizationId);
  expect(vettedRead.ok, 'the first vetted allowance read was refused').toBe(true);
  if (!vettedRead.ok) return;
  expect(vettedRead.allowance.utcDay).toBe(today);
  expect(vettedRead.allowance.dailyGrant).toBe(vettedGrant);

  for (const remaining of [0, partialVetted, vettedGrant]) {
    await assertResetFromStartingRemaining({
      sut,
      session: vettedNgo.session,
      organizationId: vettedNgo.organizationId,
      grant: vettedGrant,
      startingRemaining: remaining,
      today,
      processUtcDay,
      label: `vetted remaining ${remaining}`,
    });
  }

  // An organisation vetted on an earlier day, with no ledger row today. The unvet case is only
  // reachable across a UTC day boundary: a vet always writes that day's mark.
  await persistSpendOnPreviousUtcDay(sut, vettedNgo.organizationId, today, 0, vettedGrant);
  const rowsBeforeUnvet = await sut.spendRows(vettedNgo.organizationId);
  expect(
    rowsBeforeUnvet.some((row) => row.utcDay === today),
    'today already has a spend row before the unvet',
  ).toBe(false);

  const beforeUnvet = await sut.readAllowance(vettedNgo.session, vettedNgo.organizationId);
  expect(beforeUnvet.ok, 'the pre-unvet new-day allowance read was refused').toBe(true);
  if (!beforeUnvet.ok) return;
  expect(beforeUnvet.allowance.vetted).toBe(true);
  expect(beforeUnvet.allowance.remaining).toBe(vettedGrant);
  expect(beforeUnvet.allowance.spentToday).toBe(0);

  const unvet = await sut.setVetting(admin, {
    organizationId: vettedNgo.organizationId,
    action: 'unvet',
    note: 'Unvet on a UTC day with no ledger row.',
  });
  expect(unvet, 'the new-day unvet was refused').toMatchObject({
    ok: true,
    organizationId: vettedNgo.organizationId,
    vetted: false,
    changed: true,
  });
  if (!unvet.ok) return;

  const afterUnvet = await sut.readAllowance(vettedNgo.session, vettedNgo.organizationId);
  expect(afterUnvet.ok, 'the post-unvet allowance read was refused').toBe(true);
  if (!afterUnvet.ok) return;
  expect(afterUnvet.allowance.vetted).toBe(false);
  expect(
    afterUnvet.allowance.dailyGrant,
    'unvet on a day with no ledger row wrote the unverified grant and took the credits already held today',
  ).toBe(vettedGrant);
  expect(afterUnvet.allowance.remaining).toBe(vettedGrant);
  expect(afterUnvet.allowance.spentToday).toBe(0);

  const rowsAfterUnvet = await sut.spendRows(vettedNgo.organizationId);
  const todayAfterUnvet = rowsAfterUnvet.find((row) => row.utcDay === today);
  expect(todayAfterUnvet?.granted, 'the unvet mark did not keep the vetted grant for today').toBe(vettedGrant);
  expect(todayAfterUnvet?.spent).toBe(0);

  const keepCredits = await sut.debitAllowance(vettedNgo.session, vettedNgo.organizationId, unverifiedGrant + 1);
  expect(keepCredits.ok, 'spending past the unverified pin on the unvet day was refused').toBe(true);
  if (!keepCredits.ok) return;
  expect(keepCredits.allowance.remaining).toBe(vettedGrant - (unverifiedGrant + 1));
}

async function proveRolloverRemedy(
  open: () => Promise<{ w: World; sut: OrganizationsSut }>,
  processUtcDay: string | null,
): Promise<void> {
  const pins = createConfigRegistry();
  const unverifiedGrant = pins.get<number>(UNVERIFIED_PIN);

  const { w, sut } = await open();
  const ngo = await sut.provisionNgo(w.email('ngo-27'), { emailVerified: true });

  const blocked = await reachZeroCreditBlock(sut, ngo.session, ngo.organizationId, unverifiedGrant);
  if (blocked === null) return;

  const atBlock = await sut.readAllowance(ngo.session, ngo.organizationId);
  expect(atBlock.ok, 'the allowance read at the block was refused').toBe(true);
  if (!atBlock.ok) return;
  expect(atBlock.allowance.remaining).toBe(0);
  expect(atBlock.allowance.dailyGrant).toBe(unverifiedGrant);
  const today = atBlock.allowance.utcDay;
  if (processUtcDay !== null) {
    expect(today, 'the product UTC day is not the test process UTC day').toBe(processUtcDay);
  }

  await persistSpendOnPreviousUtcDay(sut, ngo.organizationId, today, unverifiedGrant, unverifiedGrant);

  const restored = await sut.debitAllowance(ngo.session, ngo.organizationId, 1);
  expect(restored.ok, 'the first free debit of the new UTC day was refused').toBe(true);
  if (!restored.ok) return;
  expect(restored.allowance.utcDay).toBe(today);
  if (processUtcDay !== null) {
    expect(restored.allowance.utcDay, 'the restored debit UTC day is not the test process UTC day').toBe(
      processUtcDay,
    );
  }
  expect(restored.allowance.dailyGrant, 'the rollover granted a number other than the unverified pin').toBe(
    unverifiedGrant,
  );
  expect(restored.allowance.spentToday).toBe(1);
  expect(restored.allowance.remaining, 'the restored remaining is not the unverified pin minus this debit').toBe(
    unverifiedGrant - 1,
  );
}

async function proveUnverifiedCeiling(
  open: () => Promise<{ w: World; sut: OrganizationsSut }>,
  proveIntegerOverflow: boolean,
): Promise<void> {
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
      'debit-exceeds-remaining',
    );
    expect(oversize.reason).toBe(debitExceedsRemainingReason(ngo.organizationId, unverifiedGrant));
  }
  expect(await sut.spendRows(ngo.organizationId), 'the refused oversize debit wrote a spend row').toEqual([]);

  if (proveIntegerOverflow) {
    // 2147483647 is integer max. Adding it to spent overflows Postgres. JavaScript numbers do not
    // overflow there, so the loop tier cannot prove this.
    const overflow = await sut.debitAllowance(ngo.session, ngo.organizationId, 2147483647);
    expect(overflow.ok, 'an integer-max debit was admitted or raised as a database error').toBe(false);
    if (!overflow.ok) {
      expect(overflow.kind, `the integer-max debit was refused as ${overflow.kind}: ${overflow.reason}`).toBe(
        'debit-exceeds-remaining',
      );
      expect(overflow.reason).toBe(debitExceedsRemainingReason(ngo.organizationId, unverifiedGrant));
    }
    expect(await sut.spendRows(ngo.organizationId), 'the integer-max debit wrote a spend row').toEqual([]);
  }

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
}

describe('AT-REQ-002 B — tiers and the daily Discovery allowance', () => {
  atTest(
    'AT-002.04',
    'an unverified-tier NGO reads a daily grant of exactly the unverified pin, can consume up to it and never past it, may draft and cannot publish',
    {
      default: async ({ open }) => {
        await proveUnverifiedCeiling(open, false);
      },
      integration: async ({ open }) => {
        await proveUnverifiedCeiling(open, true);
      },
    },
  );

  atTest('AT-002.05', 'at zero remaining credits on an unfunded project the next Discovery message is blocked and the remedies shown are get vetted, fund fuel, or wait for the next day', {
    default: async ({ open }) => {
      const pins = createConfigRegistry();
      const unverifiedGrant = pins.get<number>(UNVERIFIED_PIN);
      const vettedGrant = pins.get<number>(VETTED_PIN);
      // The sentence a caller reads comes from the database at one tier and from the shipped
      // renderer at the other, so the two must agree word for word. That the arm itself can fail
      // is proved in `tests/at/harness/req002-pins-oracles.selftest.ts`, not here.
      expect(exhaustedSentenceProblems(), 'the TypeScript exhausted renderer and the SQL debit raise disagree').toEqual(
        [],
      );

      const { w, sut } = await open();
      const ngo = await sut.provisionNgo(w.email('ngo-05'), { emailVerified: true });

      const blocked = await reachZeroCreditBlock(sut, ngo.session, ngo.organizationId, unverifiedGrant);
      if (blocked === null) return;
      expect(blocked.reason, 'the get-vetted remedy is missing').toMatch(/get vetted/i);
      expect(
        blocked.reason,
        'the vetted grant the first remedy names is not the pinned vetted grant',
      ).toMatch(new RegExp(`daily grant becomes ${vettedGrant}(?!\\d)`));
      expect(blocked.reason, 'the fund-fuel remedy is missing').toMatch(/fund project fuel/i);
      expect(blocked.reason, 'the wait-for-the-next-day remedy is missing').toMatch(/wait for the next UTC day/i);
    },
    integration: awaiting(AWAITED.discoverySurface),
  });

  atTest('AT-002.26', 'after the zero-credit block, funding project fuel makes the very next Discovery turn succeed, billed to fuel', awaiting(AWAITED.projectFuelCheckout, AWAITED.fundedTurnBilling));

  atTest(
    'AT-002.27',
    'after the zero-credit block, the day rollover makes the next free Discovery turn succeed on the reset allowance',
    {
      default: async ({ open }) => {
        await proveRolloverRemedy(open, null);
      },
      integration: async ({ open }) => {
        await proveRolloverRemedy(open, utcDayOf(Date.now()));
      },
    },
  );

  atTest(
    'AT-002.06',
    'from any starting balance the UTC day rollover hard-resets the allowance to exactly the tier grant with no rollover, and a second reset does not occur in the same UTC day',
    {
      default: async ({ open }) => {
        await proveUtcReset(open, null);
      },
      integration: async ({ open }) => {
        await proveUtcReset(open, utcDayOf(Date.now()));
      },
    },
  );

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
