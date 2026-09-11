/**
 * AT-REQ-002 · F. Public claims — AT-002.23
 * Source: .taskmaster/docs/acceptance/at-req-002.md
 *
 * The sweep covers listing screens this tree does not have. The id is declared red by shape in
 * `tests/at/expected/req-002.json`; the one public surface that exists today, the public project
 * page, is inspected by the unit that lands the pilot default.
 */

import { describe } from 'vitest';
import { atTest } from './_bind.ts';
import { AWAITED, awaiting } from './_pending.ts';

describe('AT-REQ-002 F — public claims', () => {
  atTest('AT-002.23', 'no public surface rendered for a vetted NGO carries a "verified" claim, and a surfaced trust flag is labelled exactly "founder-vetted"', awaiting(AWAITED.publicListingScreens));
});
