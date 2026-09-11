/**
 * AT-REQ-002 · A. Org profile — AT-002.01, AT-002.02
 * Source: .taskmaster/docs/acceptance/at-req-002.md
 */

import { describe } from 'vitest';
import { atTest } from './_bind.ts';
import { LEAF, notLanded } from './_pending.ts';

describe('AT-REQ-002 A — org profile', () => {
  atTest('AT-002.01', 'an email-verified NGO creates the profile with name, mission, country, website and logo, and every field persists and renders', notLanded(LEAF.D1_L1));

  atTest('AT-002.02', "the NGO's admin edits all five profile fields and every value persists; another NGO, a volunteer and a visitor are refused", notLanded(LEAF.D1_L2));
});
