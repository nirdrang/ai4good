/**
 * The audited contact transfer and lost-access recovery (AT-001.25, .26, .27, .35).
 *
 * ONE ROUTE FOR BOTH: AT-001.27's words are "behaves as AT-001.25 (same audited flow)". The
 * difference between a planned handover and a recovery is the reason the administrator gives, and
 * the audit row carries it.
 *
 * The decision is `decideContactTransfer`'s, in `../_shared/admin-operations.ts`; who may call is
 * the inventory's (`WRITE_ROUTES['transfer-organization-contact']` admits `platform_admin` only).
 */

import { decideContactTransfer, subjectAccountIdField } from '../_shared/admin-operations.ts';
import { writeRoute } from '../_shared/edge.ts';
import { organizationIdField } from '../_shared/write-routes.ts';

Deno.serve(writeRoute({
  name: 'transfer-organization-contact',
  target: organizationIdField,
  subject: subjectAccountIdField,
  decide: decideContactTransfer,
  render: (value) => ({ organizationId: (value as { organization_id?: string } | null)?.organization_id ?? null }),
}));
