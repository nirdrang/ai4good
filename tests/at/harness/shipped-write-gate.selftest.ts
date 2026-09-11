/** The selftest of the write gate's check order and of the standing parser's fail-closed shapes. */

import { describe, expect, it } from 'vitest';

import {
  booleanField,
  integerField,
  isRecord,
  isoDay,
  parseWriteRefusalKind,
  parseWriteStanding,
  rpcRefusalStatus,
  stringField,
  timestampField,
  typeRefusalKind,
  WRITE_REFUSAL_KINDS,
  WRITE_ROUTES,
  writeGateDecision,
  writePipeline,
  type WriteRouteName,
  type WriteStanding,
} from '../../../supabase/functions/_shared/write-routes.ts';
import { ACCOUNT_TYPES, type AccountType } from '../../../supabase/functions/_shared/accounts.ts';

const SEAT = '0f1d6a2e-6d1c-4a3b-9a7e-2c5b8d4f1a90';

function accountOf(accountType: AccountType, lifecycle: 'active' | 'deactivated' = 'active'): WriteStanding {
  return {
    kind: 'account',
    accountType,
    lifecycle,
    orgRole: null,
    orgExists: false,
    orgSeatAccountId: null,
    subject: null,
  };
}

const RENDERED = {
  account: { account_type: 'ngo', lifecycle: 'active' },
  org_exists: true,
  org_role: 'admin',
  org_seat_account_id: SEAT,
  subject: { account_type: 'ngo', lifecycle: 'active' },
};

const ROUTES = Object.keys(WRITE_ROUTES) as WriteRouteName[];

describe('the shipped write gate checks in its stated order', () => {
  it('refuses an unreadable standing as `refused` 502 on every route, before any judgement about the caller', () => {
    for (const name of ROUTES) {
      const decision = writeGateDecision(name, { kind: 'unreadable', detail: 'the read did not happen' });
      expect(decision.ok, `${name} admitted a caller whose standing could not be read`).toBe(false);
      if (decision.ok) continue;
      expect(decision.kind, `${name} judged the caller on a read that did not happen`).toBe('refused');
      expect(decision.status).toBe(502);
      expect(decision.reason).toContain('the read did not happen');
    }
  });

  it('refuses a deactivated account as `account-deactivated` 403 on every route, whatever its type', () => {
    for (const name of ROUTES) {
      for (const accountType of ACCOUNT_TYPES) {
        const decision = writeGateDecision(name, accountOf(accountType, 'deactivated'));
        expect(decision.ok, `${name} admitted a deactivated ${accountType}`).toBe(false);
        if (decision.ok) continue;
        expect(decision.kind, `${name} refused a deactivated ${accountType} for a reason other than deactivation`).toBe('account-deactivated');
        expect(decision.status).toBe(403);
      }
    }
  });

  it('admits an absent account on the one route whose row says the account is what it creates', () => {
    expect(WRITE_ROUTES['complete-signup'].standing.kind).toBe('account-absent-by-design');
    expect(writeGateDecision('complete-signup', { kind: 'no-account' })).toEqual({ ok: true, args: 'admitted' });
    for (const accountType of ACCOUNT_TYPES) {
      expect(writeGateDecision('complete-signup', accountOf(accountType)), `complete-signup refused an active ${accountType}`).toEqual({
        ok: true,
        args: 'admitted',
      });
    }
  });

  it('refuses an absent account as `no-account` 409 on every route that requires one', () => {
    for (const name of ROUTES) {
      if (WRITE_ROUTES[name].standing.kind !== 'account-required') continue;
      const decision = writeGateDecision(name, { kind: 'no-account' });
      expect(decision.ok, `${name} admitted a caller with no account row`).toBe(false);
      if (decision.ok) continue;
      expect(decision.kind).toBe('no-account');
      expect(decision.status).toBe(409);
    }
  });

  it('admits exactly the types each row names and refuses the rest with the kind derived from the row', () => {
    for (const name of ROUTES) {
      const row = WRITE_ROUTES[name].standing;
      if (row.kind !== 'account-required') continue;
      for (const accountType of ACCOUNT_TYPES) {
        const decision = writeGateDecision(name, accountOf(accountType));
        if ((row.admits as readonly AccountType[]).includes(accountType)) {
          expect(decision, `${name} refused an active ${accountType}, which its row admits`).toEqual({ ok: true, args: 'admitted' });
        } else {
          expect(decision.ok, `${name} admitted an active ${accountType}, which its row does not name`).toBe(false);
          if (decision.ok) continue;
          expect(decision.kind).toBe(typeRefusalKind(row.admits));
          expect(decision.status).toBe(403);
        }
      }
    }
  });

  it('derives the two named kinds from the admitted list and fails closed to `refused` for any other list', () => {
    expect(typeRefusalKind(['platform_admin'])).toBe('not-a-platform-admin');
    expect(typeRefusalKind(['ngo'])).toBe('not-an-ngo-account');
    expect(typeRefusalKind(['ngo', 'volunteer'])).toBe('refused');
    expect(typeRefusalKind([])).toBe('refused');
  });

  it('carries the NGO-only sentence AT-001.06 reads when an NGO-only route refuses a volunteer', () => {
    const decision = writeGateDecision('create-organization', accountOf('volunteer'));
    expect(decision.ok).toBe(false);
    if (decision.ok) return;
    expect(decision.kind).toBe('not-an-ngo-account');
    expect(decision.reason).toMatch(/NGO accounts only/i);
    expect(decision.reason).toMatch(/volunteer/i);
  });

  it('runs the gate before the decision, so a refused caller never reaches a route decision', () => {
    let decided = 0;
    const spec = {
      name: 'transfer-organization-contact' as const,
      decide: () => {
        decided += 1;
        return { ok: true as const, args: { p_account_id: SEAT } };
      },
    };
    const input = { caller: { id: SEAT, githubHandle: null }, body: {}, target: null, subject: null, ip: null };
    const refused = writePipeline(spec, { ...input, standing: accountOf('ngo') });
    expect(refused.ok, 'the pipeline let an NGO through the platform-admin gate').toBe(false);
    expect(decided, 'the decision ran for a caller the gate refused').toBe(0);
    const admitted = writePipeline(spec, { ...input, standing: accountOf('platform_admin') });
    expect(admitted).toEqual({ ok: true, args: { p_account_id: SEAT } });
    expect(decided).toBe(1);
  });
});

describe('the shipped standing parser fails closed', () => {
  it('parses the canonical answer of public.write_standing', () => {
    expect(parseWriteStanding(RENDERED)).toEqual({
      kind: 'account',
      accountType: 'ngo',
      lifecycle: 'active',
      orgRole: 'admin',
      orgExists: true,
      orgSeatAccountId: SEAT,
      subject: { accountType: 'ngo', lifecycle: 'active' },
    });
  });

  it('reads a null account as no account, and null organisation fields as an organisation not named', () => {
    expect(parseWriteStanding({ ...RENDERED, account: null })).toEqual({ kind: 'no-account' });
    const standing = parseWriteStanding({
      account: { account_type: 'volunteer', lifecycle: 'deactivated' },
      org_exists: false,
      org_role: null,
      org_seat_account_id: null,
      subject: null,
    });
    expect(standing).toEqual({
      kind: 'account',
      accountType: 'volunteer',
      lifecycle: 'deactivated',
      orgRole: null,
      orgExists: false,
      orgSeatAccountId: null,
      subject: null,
    });
  });

  it('answers `unreadable` for every shape it does not recognise, never a guessed account', () => {
    const unreadable = (raw: unknown, why: string): void => {
      const standing = parseWriteStanding(raw);
      expect(standing.kind, why).toBe('unreadable');
    };
    unreadable(null, 'a null answer');
    unreadable(undefined, 'an undefined answer');
    unreadable('{}', 'a string answer');
    unreadable([], 'an array answer');
    unreadable({}, 'an object with no account field');
    unreadable({ ...RENDERED, account: 'ngo' }, 'an account that is not an object');
    unreadable({ ...RENDERED, account: { account_type: 'owner', lifecycle: 'active' } }, 'an unknown account type');
    unreadable({ ...RENDERED, account: { account_type: 'ngo', lifecycle: 'suspended' } }, 'an unknown lifecycle');
    unreadable({ ...RENDERED, account: { account_type: 'ngo' } }, 'a missing lifecycle');
    unreadable({ ...RENDERED, org_exists: 'true' }, 'an org_exists that is not a boolean');
    unreadable({ ...RENDERED, org_role: 'owner' }, 'an unknown organisation role');
    unreadable({ ...RENDERED, org_seat_account_id: 42 }, 'a seat holder that is not an id');
    unreadable({ ...RENDERED, subject: 'ngo' }, 'a subject that is not an object');
    unreadable({ ...RENDERED, subject: { account_type: 'ngo', lifecycle: 'gone' } }, 'a subject with an unknown lifecycle');
  });

  it('refuses through the gate when the standing is unreadable, so a malformed answer widens nothing', () => {
    const decision = writeGateDecision('create-organization', parseWriteStanding({ ...RENDERED, org_exists: 'true' }));
    expect(decision.ok).toBe(false);
    if (decision.ok) return;
    expect(decision.kind).toBe('refused');
  });
});

describe('rpcRefusalStatus classifies a raised exception from transport', () => {
  it('answers 409 for a five-character SQLSTATE and 502 for every other code', () => {
    expect(rpcRefusalStatus({ code: '42501' })).toBe(409);
    expect(rpcRefusalStatus({ code: '23503' })).toBe(409);
    expect(rpcRefusalStatus({ code: 'PGRST202' })).toBe(502);
    expect(rpcRefusalStatus({ code: null })).toBe(502);
    expect(rpcRefusalStatus({ code: '404' })).toBe(502);
  });
});

describe('the shipped refusal-kind parser fails closed', () => {
  it('accepts every kind of the closed set and nothing else', () => {
    for (const kind of WRITE_REFUSAL_KINDS) {
      expect(parseWriteRefusalKind(kind), `${kind} is a closed kind`).toBe(kind);
    }
    expect(parseWriteRefusalKind(' account-deactivated ')).toBe('account-deactivated');
    expect(parseWriteRefusalKind('not-an-admin-anywhere')).toBe('refused');
    expect(parseWriteRefusalKind('')).toBe('refused');
    expect(parseWriteRefusalKind(null)).toBe('refused');
    expect(parseWriteRefusalKind(undefined)).toBe('refused');
    expect(parseWriteRefusalKind(42)).toBe('refused');
    expect(parseWriteRefusalKind({ kind: 'no-account' })).toBe('refused');
  });
});

describe('the shipped field parsers', () => {
  it('narrows an object as a record and refuses arrays and null', () => {
    expect(isRecord({ a: 1 })).toBe(true);
    expect(isRecord(null)).toBe(false);
    expect(isRecord([])).toBe(false);
  });

  it('accepts a whole number and refuses a missing or fractional value', () => {
    expect(integerField(0)).toBe(0);
    expect(integerField(7)).toBe(7);
    expect(integerField(null)).toBeNull();
    expect(integerField(1.5)).toBeNull();
  });

  it('accepts a boolean and refuses a string', () => {
    expect(booleanField(true)).toBe(true);
    expect(booleanField(false)).toBe(false);
    expect(booleanField('true')).toBeNull();
  });

  it('accepts an ISO timestamp and a UTC day, and trims a string', () => {
    expect(timestampField('2026-09-11T12:00:00.000Z')).toBe('2026-09-11T12:00:00.000Z');
    expect(timestampField('not-a-time')).toBeNull();
    expect(isoDay('2026-09-11')).toBe('2026-09-11');
    expect(isoDay('2026-09-11T12:00:00.000Z')).toBe('2026-09-11');
    expect(isoDay(null)).toBeNull();
    expect(stringField('  Riverside  ')).toBe('Riverside');
    expect(stringField('\u00A0')).toBeNull();
  });
});
