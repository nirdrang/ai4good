import { atTest } from './_bind.ts';
import { AWAITED, awaiting } from './_pending.ts';

atTest('AT-003.17', 'a draft carries zero cause labels before Discovery', awaiting(AWAITED.labels));
