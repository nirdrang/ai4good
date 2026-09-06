/**
 * The non-login escalation contact of an organisation (AT-001.28), recorded by a platform
 * administrator on the same admin surface as the contact transfer (R15).
 *
 * The decision is `decideEscalationContact`'s, in `../_shared/admin-operations.ts`; who may call is
 * the inventory's (`WRITE_ROUTES['set-escalation-contact']` admits `platform_admin` only).
 */

import { decideEscalationContact } from '../_shared/admin-operations.ts';
import { writeRoute } from '../_shared/edge.ts';
import { organizationIdField } from '../_shared/write-routes.ts';

Deno.serve(writeRoute({
  name: 'set-escalation-contact',
  target: organizationIdField,
  decide: decideEscalationContact,
  render: (value) => ({ organizationId: (value as { organization_id?: string } | null)?.organization_id ?? null }),
}));
