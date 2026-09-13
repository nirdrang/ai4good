import { atTest } from './_bind.ts';
import { AWAITED, awaiting } from './_pending.ts';

atTest('AT-003.11', 'a complete intake starts Discovery without a reference file', awaiting(AWAITED.submission));
atTest('AT-003.12', 'submission moves the draft to discovery_in_progress', awaiting(AWAITED.submission));
