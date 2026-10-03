import { bindSuite } from '../../harness/registry.ts';
import type { AtContext as HarnessAtContext, OpenWorld as HarnessOpenWorld } from '../../harness/registry.ts';

export { AtPending, TIER, TIERS } from '../../harness/registry.ts';
export type { PendingPhase } from '../../harness/registry.ts';

export type AtContext = HarnessAtContext<'req-001', 'accounts'>;
export type OpenWorld = HarnessOpenWorld<'req-001', 'accounts'>;

export const { atTest, defineEvidenceCapture } = bindSuite({
  requirement: 'req-001',
  sut: 'accounts',
  sutMissingDetail:
    `REQ-001's accounts implementation is not in the tree — harness.sut.accounts is absent ` +
    `(loop/decomp/req-001.md D1.L1 "email/password + Google signup and return sign-in" has not landed)`,
});
