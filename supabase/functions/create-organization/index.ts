/**
 * `create-organization` — the NGO-only action, and the reason it exists is worth stating.
 *
 * AT-001.06 says: "Given an existing account of type `volunteer`, When it attempts an NGO-only
 * action (create an org profile / project need), Then the action is rejected." Without an operation
 * to attempt, the acceptance test could only have called `ngoOnlyActionAllowed` directly — which
 * proves a helper behaves and says nothing about an application boundary. This function is the
 * boundary the test drives.
 *
 * TWO BOUNDARIES ON IT, because reading more into the criterion than it says would be inventing a
 * requirement:
 *   * The PROJECT-NEED half of the criterion's parenthesis is not built. No project or need table
 *     exists in the tree and creating one belongs to another requirement.
 *   * There is NO acknowledgment gate here. AT-001.01 requires the acknowledgment before PROJECT
 *     creation, not before organisation creation. `public.has_platform_acknowledgment` is the hook
 *     for the leaf that lands project creation; putting it in front of this operation would be a
 *     gate the acceptance text does not ask for.
 */

import { decideOrganizationCreation } from '../_shared/accounts.ts';
import { writeRoute } from '../_shared/edge.ts';

Deno.serve(writeRoute({
  name: 'create-organization',
  decide: decideOrganizationCreation,
  render: (value) => ({ organizationId: (value as { organization_id?: string } | null)?.organization_id ?? null }),
}));
