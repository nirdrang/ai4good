/**
 * The ONE place this suite touches the AT harness.
 *
 * The AT id grammar, the tier contract, the harness handshake, per-test world and harness teardown,
 * and the `harness-missing` / `sut-missing` split all live in the harness registry. This file
 * supplies only what is REQ-002-specific: which member of `harness.sut` the suite drives, and how
 * it says "not landed yet".
 */

import { bindSuite } from '../../harness/registry.ts';
import type { AtContext as HarnessAtContext, OpenWorld as HarnessOpenWorld } from '../../harness/registry.ts';

export { AtPending, CapabilityPending, TIER, TIERS } from '../../harness/registry.ts';
export type { PendingPhase } from '../../harness/registry.ts';

// Re-exported ALREADY BOUND, so a body annotating one of them writes `AtContext` rather than naming
// a system-under-test shape. Both types derive from the adapter registered under 'req-002' in
// `harness/suite-adapters.ts`.
export type AtContext = HarnessAtContext<'req-002', 'organizations'>;
export type OpenWorld = HarnessOpenWorld<'req-002', 'organizations'>;

export const { atTest, defineEvidenceCapture } = bindSuite({
  requirement: 'req-002',
  sut: 'organizations',
  sutMissingDetail:
    `REQ-002's organisation implementation is not in the tree — harness.sut.organizations is absent ` +
    `(loop/decomp/req-002.md has landed no leaf yet)`,
});
