import { describe } from 'vitest';
import { atTest } from './_bind.ts';
import { AWAITED, awaiting } from './_pending.ts';

describe('AT-REQ-002 F — public claims', () => {
  atTest('AT-002.23', 'no public surface rendered for a vetted NGO carries a "verified" claim, and a surfaced trust flag is labelled exactly "founder-vetted"', awaiting(AWAITED.publicListingScreens));
});
