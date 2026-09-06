/**
 * THE ORACLE FOR THE LIFECYCLE SETTER. The acceptance ids reach the admitted path of
 * `decideLifecycleChange`; every other branch is reachable here with a hand-built
 * `AccountWriteRouteInput`. WHAT A GREEN HERE CLAIMS: that the decision answers the kind, the
 * status and the arguments its module states. WHAT IT DOES NOT CLAIM: that the definer refuses
 * the same way — the integration tier names that.
 */

import { describe, expect, it } from 'vitest';

import { decideLifecycleChange } from '../../../supabase/functions/_shared/admin-operations.ts';
import type { AccountStanding, AccountWriteRouteInput } from '../../../supabase/functions/_shared/write-routes.ts';

const ADMIN = '7c1e5a3b-2d4f-4e6a-8b9c-0d1e2f3a4b5c';
const SUBJECT = '0f1d6a2e-6d1c-4a3b-9a7e-2c5b8d4f1a90';
const REASON = 'AUP';

const ADMIN_STANDING: AccountStanding = {
  kind: 'account',
  accountType: 'platform_admin',
  lifecycle: 'active',
  orgRole: null,
  orgExists: false,
  orgSeatAccountId: null,
  subject: { accountType: 'volunteer', lifecycle: 'active' },
};

function lifecycleInput(overrides: Partial<AccountWriteRouteInput> = {}): AccountWriteRouteInput {
  return {
    caller: { id: ADMIN, githubHandle: null },
    standing: ADMIN_STANDING,
    body: { accountId: SUBJECT, lifecycle: 'deactivated', reason: REASON },
    target: null,
    subject: SUBJECT,
    ip: '203.0.113.7',
    ...overrides,
  };
}

describe('the shipped lifecycle-change decision', () => {
  it('admits the change with exactly the four arguments the definer takes', () => {
    expect(decideLifecycleChange(lifecycleInput())).toEqual({
      ok: true,
      args: {
        p_account_id: ADMIN,
        p_subject_account_id: SUBJECT,
        p_lifecycle: 'deactivated',
        p_reason: REASON,
      },
    });
  });

  it('refuses `invalid-request` 400 when the subject account is not named', () => {
    expect(decideLifecycleChange(lifecycleInput({ subject: null, body: { lifecycle: 'deactivated', reason: REASON } }))).toEqual({
      ok: false,
      kind: 'invalid-request',
      status: 400,
      reason: expect.stringContaining('accountId'),
    });
  });

  it('refuses `invalid-request` 400 when the lifecycle is missing or not a known value', () => {
    for (const lifecycle of [undefined, null, '', 'suspended', 42]) {
      expect(
        decideLifecycleChange(lifecycleInput({ body: { accountId: SUBJECT, lifecycle, reason: REASON } })),
        `lifecycle ${JSON.stringify(lifecycle)} was accepted`,
      ).toEqual({
        ok: false,
        kind: 'invalid-request',
        status: 400,
        reason: expect.stringContaining('lifecycle'),
      });
    }
  });

  it('refuses `invalid-request` 400 when the reason is missing or blank', () => {
    for (const reason of [undefined, null, '', '   ']) {
      expect(
        decideLifecycleChange(lifecycleInput({ body: { accountId: SUBJECT, lifecycle: 'deactivated', reason } })),
        `reason ${JSON.stringify(reason)} was accepted`,
      ).toEqual({
        ok: false,
        kind: 'invalid-request',
        status: 400,
        reason: expect.stringContaining('reason'),
      });
    }
  });

  it('refuses `invalid-request` 400 when the administrator changes its own lifecycle', () => {
    expect(decideLifecycleChange(lifecycleInput({ subject: ADMIN, body: { accountId: ADMIN, lifecycle: 'deactivated', reason: REASON } }))).toEqual({
      ok: false,
      kind: 'invalid-request',
      status: 400,
      reason: expect.stringContaining('own lifecycle'),
    });
  });

  it('refuses `subject-no-account` 409 when the standing carries no subject', () => {
    expect(decideLifecycleChange(lifecycleInput({ standing: { ...ADMIN_STANDING, subject: null } }))).toEqual({
      ok: false,
      kind: 'subject-no-account',
      status: 409,
      reason: expect.stringContaining(SUBJECT),
    });
  });

  it('trims the reason it hands to the definer', () => {
    expect(decideLifecycleChange(lifecycleInput({ body: { accountId: SUBJECT, lifecycle: 'active', reason: `  ${REASON}\n` } }))).toEqual({
      ok: true,
      args: {
        p_account_id: ADMIN,
        p_subject_account_id: SUBJECT,
        p_lifecycle: 'active',
        p_reason: REASON,
      },
    });
  });
});


