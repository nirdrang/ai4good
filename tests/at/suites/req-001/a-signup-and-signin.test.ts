/**
 * AT-REQ-001 section A — signup and sign-in.
 *
 * Four of this file's seven ids are the ones AI4DEV-57 owns and lands: AT-001.01, .03, .06 and .07.
 * The other three belong to the GitHub leaf and are declared, not written.
 */

import { AtPending, atTest } from './_bind.ts';
import { LEAF, notLanded } from './_pending.ts';

atTest('AT-001.01', 'NGO email/password signup creates the account, org, admin membership and acknowledgment; sign-in returns', async (ctx) => {
  throw new AtPending(ctx.atId, 'sut-missing', 'REQ-001 D1.L1 (email/password and Google signup) has not landed');
});

atTest('AT-001.02', 'GitHub OAuth volunteer signup links the identity and returns to the same account', notLanded(LEAF.D1_L2));

atTest('AT-001.03', 'a signup whose session came from Google completes through the same path as email', async (ctx) => {
  throw new AtPending(ctx.atId, 'sut-missing', 'REQ-001 D1.L1 (email/password and Google signup) has not landed');
});

atTest('AT-001.04', 'volunteer signup cannot complete without a linked GitHub account', notLanded(LEAF.D1_L2));

atTest('AT-001.05', 'linking GitHub fires volunteer onboarding with the public stats observably imported', notLanded(LEAF.D1_L2));

atTest('AT-001.06', 'a volunteer account is refused an NGO-only action while an NGO account succeeds', async (ctx) => {
  throw new AtPending(ctx.atId, 'sut-missing', 'REQ-001 D1.L1 (email/password and Google signup) has not landed');
});

atTest('AT-001.07', 'a provisioned platform admin authenticates and carries the type; public signup offers only two', async (ctx) => {
  throw new AtPending(ctx.atId, 'sut-missing', 'REQ-001 D1.L1 (email/password and Google signup) has not landed');
});
