import { atTest } from './_bind.ts';
import { AWAITED, awaiting } from './_pending.ts';

atTest('AT-003.07', 'an optional reference upload attaches to the draft', { surface: 'ui' }, awaiting(AWAITED.referenceFiles));
atTest('AT-003.09', 'the upload surface shows the base data-responsibility disclosure', { surface: 'ui' }, awaiting(AWAITED.referenceFiles));
atTest('AT-003.10', 'classification hardens the disclosure before another upload', { surface: 'ui' }, awaiting(AWAITED.tier2Disclosure));
