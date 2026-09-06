import { accountIdField, decideLifecycleChange } from '../_shared/admin-operations.ts';
import { writeRoute } from '../_shared/edge.ts';

Deno.serve(writeRoute({
  name: 'set-account-lifecycle',
  subject: accountIdField,
  decide: decideLifecycleChange,
  render: (value) => ({ changed: Boolean((value as { changed?: boolean } | null)?.changed) }),
}));
