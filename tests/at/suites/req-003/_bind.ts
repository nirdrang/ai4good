import { bindSuite } from '../../harness/registry.ts';
import type { AtContext as HarnessAtContext, OpenWorld as HarnessOpenWorld } from '../../harness/registry.ts';

export { AtPending, CapabilityPending, TIER, TIERS } from '../../harness/registry.ts';
export type AtContext = HarnessAtContext<'req-003', 'needs'>;
export type OpenWorld = HarnessOpenWorld<'req-003', 'needs'>;

export const { atTest, defineEvidenceCapture } = bindSuite({ requirement: 'req-003', sut: 'needs' });
