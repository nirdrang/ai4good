import { atTest } from './_bind.ts';
import { AWAITED, awaiting } from './_pending.ts';

atTest('AT-003.03', 'submission is blocked on the missing description alone', awaiting(AWAITED.gateAndAutosave));
atTest('AT-003.05', 'typed intake persists when the admin leaves and returns without an explicit save', { surface: 'ui' }, awaiting(AWAITED.gateAndAutosave));
