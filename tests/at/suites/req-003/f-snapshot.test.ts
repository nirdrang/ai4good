import { atTest } from './_bind.ts';
import { AWAITED, awaiting } from './_pending.ts';

atTest('AT-003.14', 'submission retains an audit snapshot equal to the raw intake', awaiting(AWAITED.snapshot));
atTest('AT-003.16', 'later working edits leave the retained snapshot unchanged', awaiting(AWAITED.snapshot));
