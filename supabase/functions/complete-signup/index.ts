import { decideSignupCompletion } from '../_shared/accounts.ts';
import { writeRoute } from '../_shared/edge.ts';

Deno.serve(writeRoute({
  name: 'complete-signup',
  decide: decideSignupCompletion,
  render: (value) => {
    const result = value as { account_id?: string; account_type?: string; organization_id?: string | null } | null;
    return {
      accountId: result?.account_id ?? null,
      accountType: result?.account_type ?? null,
      organizationId: result?.organization_id ?? null,
    };
  },
}));
