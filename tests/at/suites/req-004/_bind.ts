import { bindSuite } from '../../harness/registry.ts';
export { AtPending, CapabilityPending, TIER, TIERS } from '../../harness/registry.ts';
export const { atTest, defineEvidenceCapture } = bindSuite({ requirement: 'req-004', sut: 'discovery' });
