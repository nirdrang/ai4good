/**
 * `set-organization-profile` — all five profile fields in one write.
 *
 * Signup has already created the organisation with its name. This route is first completion and
 * every later edit. It overlaps `update-organization` on `name` on purpose: an edit of all five
 * fields has one door. `update-organization` stays a rename; do not fold this into it.
 */

import { decideOrganizationProfile, renderOrganizationProfile } from '../_shared/memberships.ts';
import { writeRoute } from '../_shared/edge.ts';
import { organizationIdField } from '../_shared/write-routes.ts';

Deno.serve(writeRoute({
  name: 'set-organization-profile',
  target: organizationIdField,
  decide: decideOrganizationProfile,
  render: renderOrganizationProfile,
}));
