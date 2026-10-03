import { bindSuite } from '../../harness/registry.ts';
import type { AtContext as HarnessAtContext, OpenWorld as HarnessOpenWorld } from '../../harness/registry.ts';

export { AtPending, CapabilityPending, TIER, TIERS } from '../../harness/registry.ts';
export type { PendingPhase } from '../../harness/registry.ts';

export type AtContext = HarnessAtContext<'req-002', 'organizations'>;
export type OpenWorld = HarnessOpenWorld<'req-002', 'organizations'>;

export const { atTest, defineEvidenceCapture } = bindSuite({
  requirement: 'req-002',
  sut: 'organizations',
  sutMissingDetail:
    `REQ-002's organisation implementation is not in the tree — harness.sut.organizations is absent ` +
    `(loop/decomp/req-002.md has landed no leaf yet)`,
});
