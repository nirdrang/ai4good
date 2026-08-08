/**
 * AT-REQ-001 sections B and C — email verification, the wrong-password path, sessions and reset.
 *
 * None of these is AI4DEV-57's. `supabase/config.toml` still carries
 * `[auth.email] enable_confirmations = false`, deliberately untouched by this leaf: turning
 * verification on is the verification leaf's own change, and flipping it here would break the four
 * ids this leaf does land while proving none of these six.
 */

import { atTest } from './_bind.ts';
import { LEAF, notLanded } from './_pending.ts';

atTest('AT-001.09', 'a fresh email/password signup of either account type is unverified until the link is used', notLanded(LEAF.D2_L1));

atTest('AT-001.10', 'an unverified NGO account is blocked from Discovery messages with verification named as the remedy', notLanded(LEAF.D2_L1));

atTest('AT-001.38', 'sign-in with the correct email and a wrong password is rejected and creates no session', notLanded(LEAF.D2_L2));

atTest('AT-001.12', 'an expired or revoked session ends access — the next request re-authenticates', notLanded(LEAF.D2_L2));

atTest('AT-001.13', 'a session in continuous use refreshes without a forced mid-work re-login', notLanded(LEAF.D2_L2));

atTest('AT-001.14', 'after the emailed reset flow the new password works and the old one does not', notLanded(LEAF.D2_L2));
