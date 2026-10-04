import { atTest } from './_bind.ts';
import { AtPending } from '../../harness/registry.ts';

atTest('AT-036.01', 'PRD workspace case 1 awaits its implementation', { default: async () => { throw new AtPending('AT-036.01', 'sut-missing', 'The PRD workspace has not shipped.'); } });
atTest('AT-036.02', 'PRD workspace case 2 awaits its implementation', { default: async () => { throw new AtPending('AT-036.02', 'sut-missing', 'The PRD workspace has not shipped.'); } });
atTest('AT-036.03', 'PRD workspace case 3 awaits its implementation', { default: async () => { throw new AtPending('AT-036.03', 'sut-missing', 'The PRD workspace has not shipped.'); } });
atTest('AT-036.04', 'PRD workspace case 4 awaits its implementation', { default: async () => { throw new AtPending('AT-036.04', 'sut-missing', 'The PRD workspace has not shipped.'); } });
atTest('AT-036.05', 'PRD workspace case 5 awaits its implementation', { default: async () => { throw new AtPending('AT-036.05', 'sut-missing', 'The PRD workspace has not shipped.'); } });
atTest('AT-036.06', 'PRD workspace case 6 awaits its implementation', { default: async () => { throw new AtPending('AT-036.06', 'sut-missing', 'The PRD workspace has not shipped.'); } });
atTest('AT-036.07', 'PRD workspace case 7 awaits its implementation', { default: async () => { throw new AtPending('AT-036.07', 'sut-missing', 'The PRD workspace has not shipped.'); } });
atTest('AT-036.08', 'PRD workspace case 8 awaits its implementation', { default: async () => { throw new AtPending('AT-036.08', 'sut-missing', 'The PRD workspace has not shipped.'); } });
atTest('AT-036.09', 'PRD workspace case 9 awaits its implementation', { default: async () => { throw new AtPending('AT-036.09', 'sut-missing', 'The PRD workspace has not shipped.'); } });
atTest('AT-036.10', 'PRD workspace case 10 awaits its implementation', { default: async () => { throw new AtPending('AT-036.10', 'sut-missing', 'The PRD workspace has not shipped.'); } });
