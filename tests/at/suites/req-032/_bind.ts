import { bindSuite } from '../../harness/registry.ts';
export { AtPending } from '../../harness/registry.ts';
export const { atTest } = bindSuite({ requirement: 'req-032', sut: 'needs' });
