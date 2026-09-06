/**
 * `update-organization` — the ADMIN-ONLY NGO-side action, and the operation AT-001.16 and
 * AT-001.36 are both graded through.
 *
 * WHY A RENAME. AT-001.36 says: "Given an account that is `admin` in NGO A and `member` in NGO B,
 * When it performs an admin-only NGO-side action, Then it succeeds in A but is rejected in B."
 * That needs an action whose TARGET is an organisation the caller is already in — so the same
 * account can attempt it twice and get two different answers. `create-organization` cannot serve:
 * its caller is never already a member of the thing being created. Renaming the organisation is the
 * smallest such action this tree can carry.
 *
 * WHAT IT DELIBERATELY IS NOT. It is not a general organisation-profile editor: one field, one
 * write. Columns nothing enforces and fields no criterion reads would look like a requirement being
 * met and would not be one.
 *
 * THE DECISION IS `decideOrganizationRename`'s, in `../_shared/memberships.ts` — the same two
 * shared rules the acceptance suite drives, and the refusal's `kind` on the wire is that decision's
 * own field, passed through unchanged.
 */

import { writeRoute } from '../_shared/edge.ts';
import { decideOrganizationRename } from '../_shared/memberships.ts';
import { organizationIdField } from '../_shared/write-routes.ts';

Deno.serve(writeRoute({
  name: 'update-organization',
  target: organizationIdField,
  decide: decideOrganizationRename,
  render: (value) => {
    const result = value as { organization_id?: string; name?: string } | null;
    return { organizationId: result?.organization_id ?? null, name: result?.name ?? null };
  },
}));
