import { decideOrganizationProfile, renderOrganizationProfile } from '../_shared/memberships.ts';
import { writeRoute } from '../_shared/edge.ts';
import { organizationIdField } from '../_shared/write-routes.ts';

Deno.serve(writeRoute({
  name: 'set-organization-profile',
  target: organizationIdField,
  decide: decideOrganizationProfile,
  render: renderOrganizationProfile,
}));
