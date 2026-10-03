import { describe, expect, it } from 'vitest';

import { callerFromAuthAnswer } from '../../../supabase/functions/_shared/caller.ts';

const PLAIN_USER = {
  id: '0f1d6a2e-6d1c-4a3b-9a7e-2c5b8d4f1a90',
  email: 'ngo@example.test',
  email_confirmed_at: '2026-01-01T00:00:00.000Z',
  identities: [],
};

const LINKED_USER = {
  ...PLAIN_USER,
  identities: [{ provider: 'github', identity_data: { user_name: 'riverside-dev' } }],
};

describe('the shipped caller module fails closed', () => {
  it('resolves a caller from a 2xx whose body carries a string id', () => {
    const caller = callerFromAuthAnswer(200, PLAIN_USER);
    expect(caller, 'a well-formed 200 must resolve a caller').not.toBeNull();
    expect(caller?.id).toBe(PLAIN_USER.id);
    expect(caller?.githubHandle).toBeNull();
    expect(caller?.emailVerified, 'a confirmed GoTrue body must carry emailVerified true').toBe(true);
  });

  it('accepts a BLANK string id, because the shipped module says it does', () => {
    const caller = callerFromAuthAnswer(200, { ...PLAIN_USER, id: '' });
    expect(caller, 'a blank string id is a string, and this module accepts it').not.toBeNull();
    expect(caller?.id, 'the blank id must be carried through unchanged, not replaced').toBe('');
  });

  it('carries the linked GitHub handle through, judged from the WHOLE body', () => {
    const caller = callerFromAuthAnswer(200, LINKED_USER);
    expect(caller?.id).toBe(LINKED_USER.id);
    expect(
      caller?.githubHandle,
      'the handle must be extracted from identities[] on the body this function was given',
    ).toBe('riverside-dev');

    const narrowed = callerFromAuthAnswer(200, { id: LINKED_USER.id });
    expect(narrowed?.id, 'a pre-narrowed body still resolves an id — which is why it is dangerous').toBe(LINKED_USER.id);
    expect(
      narrowed?.githubHandle,
      'a pre-narrowed body loses the handle; the live control for this is proof check (g)',
    ).toBeNull();
    expect(narrowed?.emailVerified, 'a pre-narrowed body has no confirmation field, so it is unverified').toBe(false);
  });

  it('accepts the whole 2xx range and refuses everything outside it', () => {
    for (const status of [200, 201, 204, 299]) {
      expect(callerFromAuthAnswer(status, PLAIN_USER), `status ${status} is a success`).not.toBeNull();
    }
    for (const status of [400, 401, 403, 404, 429, 500, 502, 503]) {
      expect(callerFromAuthAnswer(status, PLAIN_USER), `status ${status} must resolve no caller`).toBeNull();
    }
    for (const status of [0, -1, 100, 199, 300, 302, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(callerFromAuthAnswer(status, PLAIN_USER), `status ${status} must resolve no caller`).toBeNull();
    }
  });

  it('refuses a 2xx whose body carries no usable id', () => {
    const refuses = (user: unknown, why: string): void => {
      expect(callerFromAuthAnswer(200, user), why).toBeNull();
    };

    refuses({}, 'a body with no id must resolve no caller');
    refuses({ email: 'ngo@example.test' }, 'a body with other fields only must resolve no caller');
    refuses({ user: { id: PLAIN_USER.id } }, 'an id nested one level deeper must not be found');
    refuses({ id: null }, 'a null id must resolve no caller');
    refuses({ id: undefined }, 'an undefined id must resolve no caller');
    refuses({ id: 42 }, 'a numeric id must resolve no caller');
    refuses({ id: true }, 'a boolean id must resolve no caller');
    refuses({ id: {} }, 'an object id must resolve no caller');
    refuses({ id: { value: PLAIN_USER.id } }, 'a wrapped id must resolve no caller');
    refuses({ id: [PLAIN_USER.id] }, 'an array id must resolve no caller');
  });

  it('refuses a body that is not an object at all', () => {
    const refuses = (user: unknown, why: string): void => {
      expect(callerFromAuthAnswer(200, user), why).toBeNull();
    };

    refuses(null, 'a null body must resolve no caller, and must not throw');
    refuses(undefined, 'an undefined body must resolve no caller');
    refuses('unauthorized', 'a string body must resolve no caller');
    refuses(42, 'a numeric body must resolve no caller');
    refuses(true, 'a boolean body must resolve no caller');
    refuses([], 'an empty array body must resolve no caller');
    refuses([PLAIN_USER], 'a list of users is not a user');
  });

  it('reads a linked handle out of a messy identities[] without throwing', () => {
    const handleOf = (identities: unknown): string | null =>
      callerFromAuthAnswer(200, { id: PLAIN_USER.id, identities })?.githubHandle ?? null;

    expect(handleOf(undefined), 'a body with no identities[] has no handle').toBeNull();
    expect(handleOf(null), 'a null identities[] has no handle').toBeNull();
    expect(handleOf('github'), 'a string identities[] has no handle').toBeNull();
    expect(handleOf([null, 42, 'x']), 'junk entries must be skipped, not thrown on').toBeNull();
    expect(handleOf([{ provider: 'google', identity_data: { user_name: 'someone' } }]), 'another provider is not GitHub').toBeNull();
    expect(handleOf([{ provider: 'github' }]), 'a GitHub identity with no identity_data has no handle').toBeNull();
    expect(handleOf([{ provider: 'github', identity_data: { user_name: '   ' } }]), 'a blank handle is no handle').toBeNull();
    expect(
      handleOf([null, { provider: 'google', identity_data: {} }, { provider: 'github', identity_data: { user_name: 'riverside-dev' } }]),
      'a real GitHub identity behind junk entries must still be found',
    ).toBe('riverside-dev');
  });
});
