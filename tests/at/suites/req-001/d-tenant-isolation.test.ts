/**
 * AT-REQ-001 section E — tenant isolation and visibility.
 *
 * None of these is AI4DEV-57's, and the distance is worth stating exactly because this leaf DOES
 * enable row-level security on all four of its tables. It adds no policies beyond what its own four
 * ids need, so everything else stays denied — which is the safe default, not the requirement. These
 * five ids are about a policy SET that grants the right access to the right tenant, and the full set
 * belongs to the tenant-isolation deliverable.
 */

import { atTest } from './_bind.ts';
import { LEAF, notLanded } from './_pending.ts';

atTest('AT-001.21', 'one NGO cannot reach another NGO non-public data by UI or by direct id probing', notLanded(LEAF.D5_L1));

atTest('AT-001.22', 'an unassigned volunteer is denied a project non-public data while the public page stays visible', notLanded(LEAF.D5_L1));

atTest('AT-001.23', 'the assigned volunteer reaches that project working data, scoped to that project only', notLanded(LEAF.D5_L2));

atTest('AT-001.40', 'a platform admin reaches any NGO or project data — the admin role spans all accounts', notLanded(LEAF.D5_L2));

atTest('AT-001.24', 'a logged-out visitor renders public surfaces only; authenticated surfaces redirect to sign-in', notLanded(LEAF.D5_L2));
