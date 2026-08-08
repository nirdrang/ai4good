/**
 * AT-REQ-001 sections G and H — the lifecycle gate on every write, the single-dev invariant, the
 * append-only audit, and sign-in rate limiting.
 *
 * None of these is AI4DEV-57's. `public.accounts` as this leaf lands it carries no lifecycle column
 * at all: an account is created by a completed signup and that is the whole of its state. Adding a
 * deactivation flag now, with no gate that reads it and no route registered through one, would be a
 * column that looks like the requirement and enforces nothing.
 */

import { atTest } from './_bind.ts';
import { LEAF, notLanded } from './_pending.ts';

atTest('AT-001.29', 'every enumerated write is rejected for a deactivated account while an active control succeeds', notLanded(LEAF.D6_L2));

atTest('AT-001.30', 'an AUP-deactivated volunteer is refused writes immediately and the project keys are revoked', notLanded(LEAF.D6_L2));

atTest('AT-001.31', 're-enabling an account restores otherwise-authorized writes while independent gates stay enforced', notLanded(LEAF.D6_L2));

atTest('AT-001.32', 'attaching a second volunteer to a project is rejected — single-dev projects', notLanded(LEAF.D3_L2));

atTest('AT-001.33', 'role changes and contact transfer leave an append-only audit record that cannot be altered', notLanded(LEAF.D6_L3));

atTest('AT-001.34', 'sign-in attempts past the configured rate limit are throttled while legitimate use continues', notLanded(LEAF.D6_L3));
