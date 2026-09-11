/**
 * AT-REQ-002 · D. Evidence rule — AT-002.16, AT-002.17, AT-002.18
 * Source: .taskmaster/docs/acceptance/at-req-002.md
 */

import { describe } from 'vitest';
import { atTest } from './_bind.ts';
import { LEAF, notLanded } from './_pending.ts';

describe('AT-REQ-002 D — evidence rule', () => {
  atTest('AT-002.16', 'for registration documents received by email, only their metadata is recorded and no document content is retrievable afterwards', notLanded(LEAF.D4_L1));

  atTest('AT-002.17', 'an attempt to record a sensitive personal identity document as evidence is refused', notLanded(LEAF.D4_L1));

  atTest('AT-002.18', 'a vet with evidence type X stores exactly X in the audit record, and no NGO-facing or public surface implies a document review occurred', notLanded(LEAF.D4_L1));
});
