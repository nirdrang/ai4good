import { bindSuite } from '../../harness/registry.ts';
import type { AtContext as HarnessAtContext, OpenWorld as HarnessOpenWorld } from '../../harness/registry.ts';

export { AtPending, TIER, TIERS } from '../../harness/registry.ts';
export type { PendingPhase } from '../../harness/registry.ts';

export type AtContext = HarnessAtContext<'req-016', 'notifications'>;
export type OpenWorld = HarnessOpenWorld<'req-016', 'notifications'>;

export const { atTest, defineEvidenceCapture } = bindSuite({
  requirement: 'req-016',
  sut: 'notifications',
  sutMissingDetail:
    `REQ-016's notification emitter is not implemented — harness.sut.notifications is absent ` +
    `(loop/decomp/req-016.md D1.L1 "one shared emitter is the sole writer" has not landed)`,
});
