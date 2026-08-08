/**
 * AT-REQ-001 section D — two-layer authorization, multi-NGO membership, the single seat, and
 * acknowledgment identity capture.
 *
 * None of these is AI4DEV-57's. The schema this leaf lands carries `public.org_memberships` with an
 * `org_role` of `admin` or `member`, which is the table these ids will assert over — but the ROLE
 * SEMANTICS (what a member may do, what happens across two NGOs, that a volunteer can never hold a
 * per-NGO role) are the membership leaf's, and none of them is enforced by anything this leaf ships.
 * The table existing is not the requirement being met.
 */

import { atTest } from './_bind.ts';
import { LEAF, notLanded } from './_pending.ts';

atTest('AT-001.16', 'membership and role are held per-NGO — acting in one never grants access to the other', notLanded(LEAF.D3_L1));

atTest('AT-001.36', 'an admin in one NGO and a member in another succeeds only where it is the admin', notLanded(LEAF.D3_L1));

atTest('AT-001.37', 'granting a per-NGO role to a volunteer account is rejected on every path', notLanded(LEAF.D3_L1));

atTest('AT-001.17', 'no capability exists to invite or add a second member to an org', notLanded(LEAF.D3_L2));

atTest('AT-001.18', 'every NGO-side action succeeds under the one account with its own preconditions met', notLanded(LEAF.D3_L3));

atTest('AT-001.19', 'every acknowledgment records the acting person name, title and authority attestation', notLanded(LEAF.D4_L1));

atTest('AT-001.39', 'an acknowledgment missing any of name, title or attestation is rejected and records nothing', notLanded(LEAF.D4_L1));

atTest('AT-001.20', 'acknowledgment copy prohibits shared credentials and recommends an org email', notLanded(LEAF.D4_L1));
