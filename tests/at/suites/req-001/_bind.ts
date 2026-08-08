/**
 * The ONE place this suite touches the AT harness.
 *
 * The AT id grammar, the tier contract, the harness handshake, per-test world and harness teardown,
 * and the `harness-missing` / `sut-missing` split all live in the harness registry, so every suite
 * gets the same contract from one implementation. This file supplies only what is REQ-001-specific:
 * which member of `harness.sut` the suite drives, and how it says "not landed yet".
 *
 * ID BINDING: every test is registered through `atTest(id, name, fn)`, the id is supplied ONCE at
 * that call site, and `at:check` reads those call sites.
 */

import { bindSuite } from '../../harness/registry.ts';
import type { AtContext as HarnessAtContext, OpenWorld as HarnessOpenWorld } from '../../harness/registry.ts';

export { AtPending, TIER, TIERS } from '../../harness/registry.ts';
export type { PendingPhase } from '../../harness/registry.ts';

// Re-exported ALREADY BOUND, so a body annotating one of them writes `AtContext` rather than naming
// a system-under-test shape. The harness types take a requirement and a sut key precisely so that
// annotating a body has no SHAPE to widen with.
export type AtContext = HarnessAtContext<'req-001', 'accounts'>;
export type OpenWorld = HarnessOpenWorld<'req-001', 'accounts'>;

/**
 * The suite names TWO STRINGS and no types at all. Both the system-under-test type and the fixture
 * world type are DERIVED from the adapter registered under 'req-001' in `harness/suite-adapters.ts`,
 * so there is no type argument here through which this suite could declare a seam nothing supplies.
 *
 * `sutMissingDetail` is the text the 33 not-yet-landed ids do NOT use — each of those names its own
 * manifest leaf at its own call site, because "REQ-001 is not implemented" is false: most of it is
 * simply owned by a different leaf, and one shared sentence could not say which.
 */
export const { atTest, defineEvidenceCapture } = bindSuite({
  requirement: 'req-001',
  sut: 'accounts',
  sutMissingDetail:
    `REQ-001's accounts implementation is not in the tree — harness.sut.accounts is absent ` +
    `(loop/decomp/req-001.md D1.L1 "email/password + Google signup and return sign-in" has not landed)`,
});
