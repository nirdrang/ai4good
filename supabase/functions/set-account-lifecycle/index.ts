/**
 * The platform administrator's lifecycle setter (AT-001.29, .30, .31). A deactivated administrator
 * is refused by the gate before the decision; an administrator changing its own lifecycle is
 * `invalid-request`.
 *
 * The decision is `decideLifecycleChange`'s, in `../_shared/admin-operations.ts`; who may call is
 * the inventory's (`WRITE_ROUTES['set-account-lifecycle']` admits `platform_admin` only).
 */

import { accountIdField, decideLifecycleChange } from '../_shared/admin-operations.ts';
import { writeRoute } from '../_shared/edge.ts';

Deno.serve(writeRoute({
  name: 'set-account-lifecycle',
  subject: accountIdField,
  decide: decideLifecycleChange,
  render: (value) => ({ changed: Boolean((value as { changed?: boolean } | null)?.changed) }),
}));
