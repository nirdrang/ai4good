/**
 * AT-REQ-002 · C. The vetting action and its audit record — AT-002.11, AT-002.11b, AT-002.29,
 * AT-002.30, AT-002.12, AT-002.13, AT-002.14
 * Source: .taskmaster/docs/acceptance/at-req-002.md
 *
 * AT-002.12 waits on the publish flow and the checkout: publishing closing and funding staying
 * untouched both need a consumer this tree does not have. It is declared red by shape in
 * `tests/at/expected/req-002.json`; the unvet audit and the two pure policies are proved by the
 * neighbouring ids.
 */

import { describe } from 'vitest';
import { atTest } from './_bind.ts';
import { AWAITED, awaiting, LEAF, notLanded } from './_pending.ts';

describe('AT-REQ-002 C — the vetting action and its audit record', () => {
  atTest('AT-002.11', 'the recorded vet captures who vetted and when, the NGO name, a public reference link, the contact name, title and authority attestation, the evidence type and a note', notLanded(LEAF.D3_L1));

  atTest('AT-002.11b', 'a vet with any one required audit field absent does not commit and leaves no partial vetted state', notLanded(LEAF.D3_L1));

  atTest('AT-002.29', 'a vet or unvet from an NGO account, a volunteer or an unauthenticated caller is rejected with no tier change and no verification-outcome event', notLanded(LEAF.D3_L2));

  atTest('AT-002.30', 'only the manual founder vet and unvet path exists — no automated verification, KYC workflow or document-review status transition', notLanded(LEAF.D3_L2));

  atTest('AT-002.12', 'unvetting a vetted NGO closes publishing, is audit-recorded, and leaves project-fuel funding unblocked', awaiting(AWAITED.publishFlow, AWAITED.projectFuelCheckout));

  atTest('AT-002.13', 'a vet or unvet emits the verification-outcome notification to the NGO through the normal event path, never a side-channel email', notLanded(LEAF.D3_L3));

  atTest('AT-002.14', 'the vetting flow is a single audited admin action with no multi-step approval chain', notLanded(LEAF.D3_L3));
});
