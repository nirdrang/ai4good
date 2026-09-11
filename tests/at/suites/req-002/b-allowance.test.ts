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

import { describe } from 'vitest';
import { atTest } from './_bind.ts';
import { AWAITED, awaiting, LEAF, notLanded } from './_pending.ts';

describe('AT-REQ-002 B — tiers and the daily Discovery allowance', () => {
  atTest('AT-002.04', 'an unverified-tier NGO reads a daily grant of exactly the unverified pin, can consume up to it and never past it, may draft and cannot publish', notLanded(LEAF.D2_L1));

  atTest('AT-002.05', 'at zero remaining credits on an unfunded project the next Discovery message is blocked and the remedies shown are get vetted, fund fuel, or wait for the next day', {
    default: notLanded(LEAF.D2_L2),
    integration: awaiting(AWAITED.discoverySurface),
  });

  atTest('AT-002.26', 'after the zero-credit block, funding project fuel makes the very next Discovery turn succeed, billed to fuel', awaiting(AWAITED.projectFuelCheckout, AWAITED.fundedTurnBilling));

  atTest('AT-002.27', 'after the zero-credit block, the day rollover makes the next free Discovery turn succeed on the reset allowance', notLanded(LEAF.D2_L2));

  atTest('AT-002.06', 'from any starting balance the UTC day rollover hard-resets the allowance to exactly the tier grant with no rollover, and a second reset does not occur in the same UTC day', notLanded(LEAF.D2_L3));

  atTest('AT-002.07', 'vetting an unverified NGO that has consumed k credits mid-day raises the cap to the vetted pin at once with remaining equal to the vetted pin minus k, and later days grant the vetted pin', notLanded(LEAF.D2_L1));

  atTest('AT-002.08', 're-vetting an unvetted NGO mid-day restores the vetted cap and mints no additional same-day credits', notLanded(LEAF.D2_L1));

  atTest('AT-002.10', 'the paid-continuation path routes to the ordinary project-fuel checkout and no Discovery-credit SKU, wallet or Discovery-only balance exists', awaiting(AWAITED.projectFuelCheckout));

  atTest('AT-002.31', 'an NGO of either tier funds ordinary project fuel and succeeds — funding is not vetting-gated', awaiting(AWAITED.projectFuelCheckout));
});
