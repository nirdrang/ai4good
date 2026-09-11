/**
 * AT-REQ-002 · E. What vetting gates, and what it never gates — AT-002.19, AT-002.20, AT-002.28,
 * AT-002.21, AT-002.22
 * Source: .taskmaster/docs/acceptance/at-req-002.md
 *
 * AT-002.19 and AT-002.20 wait on the publish flow, and AT-002.20 on the triage queue as well.
 * Neither exists in this tree. Both are declared red by shape in `tests/at/expected/req-002.json`;
 * the publishing decision they will consult ships as a pure module with no route behind it.
 */

import { describe } from 'vitest';
import { atTest } from './_bind.ts';
import { AWAITED, awaiting, LEAF, notLanded } from './_pending.ts';

describe('AT-REQ-002 E — what vetting gates, and what it never gates', () => {
  atTest('AT-002.19', 'an unvetted NGO with a completed scope is blocked from publishing in the UI and at the API while the project may sit at scoped indefinitely', awaiting(AWAITED.publishFlow));

  atTest('AT-002.20', 'a vetted NGO with a completed scope publishes and the project enters triage', awaiting(AWAITED.publishFlow, AWAITED.triageQueue));

  atTest('AT-002.28', 'when concierge onboarding of an admitted pilot NGO completes, the audited vet action has run and the NGO is founder-vetted on the vetted-tier grant', notLanded(LEAF.D5_L3));

  atTest('AT-002.21', 'an unvetted NGO running Discovery within its allowance is never blocked by vetting status', notLanded(LEAF.D5_L2));

  atTest('AT-002.22', 'an email-unverified NGO is blocked from any Discovery message at every tier', notLanded(LEAF.D5_L2));
});
