import { atTest } from './_bind.ts';
import { AWAITED, awaiting } from './_pending.ts';

atTest('AT-003.18', 'the intake form warns the description is public, and submission makes the intake card public with files private', { default: awaiting(AWAITED.publishFlow) });
