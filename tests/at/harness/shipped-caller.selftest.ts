/**
 * THE ORACLE FOR `caller.ts`'s FAIL-CLOSED PROMISE.
 *
 * `supabase/functions/_shared/caller.ts` promises that every answer which is not a 2xx carrying a
 * string `id` yields NO CALLER, and a null caller is a refusal at every call site. That promise is
 * the whole of the session layer's enforcement at the deployed edge — AT-001.12's "the next request
 * requires re-authentication" is this function returning null — so it needs an oracle rather than a
 * paragraph.
 *
 * WHY IT CANNOT ARISE THROUGH THE FIXTURE, which is the same reason
 * `shipped-verification.selftest.ts` gives for its own existence. The acceptance fixture renders
 * WELL-FORMED GoTrue shapes: a 200 with a whole user, or a 401 with no user. So no acceptance body
 * can hand this module a number, an array, or a body whose `id` is an object without first making
 * the fixture lie about what Auth sends. Driving the module DIRECTLY is the only way to reach those
 * inputs, and a direct call from an acceptance body would be the thing the suite forbids — a test
 * of a helper rather than of an application boundary. The harness selftest lane is where direct
 * shape checks already live, and CI already runs it.
 *
 * IT NEEDS NO SCRIPT OR CI CHANGE, and that was verified before this file was written rather than
 * hoped for afterwards: `tests/at/vitest.config.ts` includes `harness/**\/*.selftest.ts`, and the
 * `at:selftest` script filters to `harness/`. `at:verify` filters to one suite directory, so this
 * file never joins an acceptance run and cannot affect any id's colour.
 *
 * WHAT A GREEN HERE CLAIMS: that the judgement every deployed function runs on every authenticated
 * request answers as its header says, for every shape named. WHAT IT DOES NOT CLAIM: that Supabase
 * Auth sends any of these shapes, or that Auth really refuses a revoked or expired token. Those are
 * predictions of the vendor, measured on the live stack in `loop/items/AI4DEV-60/proof-local.ts`
 * checks (c) and (d).
 */

import { describe, expect, it } from 'vitest';

import { callerFromAuthAnswer } from '../../../supabase/functions/_shared/caller.ts';

/** The canonical `/auth/v1/user` body for a user with nothing linked — what GoTrue answers on 200. */
const PLAIN_USER = {
  id: '0f1d6a2e-6d1c-4a3b-9a7e-2c5b8d4f1a90',
  email: 'ngo@example.test',
  email_confirmed_at: '2026-01-01T00:00:00.000Z',
  identities: [],
};

/** The same user with a GitHub identity linked — the shape the volunteer gate turns on. */
const LINKED_USER = {
  ...PLAIN_USER,
  identities: [{ provider: 'github', identity_data: { user_name: 'riverside-dev' } }],
};

describe('the shipped caller module fails closed', () => {
  it('resolves a caller from a 2xx whose body carries a string id', () => {
    const caller = callerFromAuthAnswer(200, PLAIN_USER);
    expect(caller, 'a well-formed 200 must resolve a caller').not.toBeNull();
    expect(caller?.id).toBe(PLAIN_USER.id);
    // No linked identity, so no handle. `null` here is a real answer, not the empty case: the
    // volunteer gate refuses on it.
    expect(caller?.githubHandle).toBeNull();
  });

  it('accepts a BLANK string id, because the shipped module says it does', () => {
    // THE PRESERVED EDGE, AND IT IS PRESERVED ON PURPOSE. `caller.ts`'s "A BLANK `id` IS ACCEPTED"
    // paragraph records the decision: the pre-refactor `edge.ts` checked `typeof id === 'string'`
    // and nothing else, so `''` resolved a caller there, and the refactor preserved that rather
    // than tightening it — a tightening would be a behaviour change wearing the costume of a
    // refactor (draft ruling 2). A decision recorded in a comment with no test is a promise with no
    // oracle, which this file's header calls an untrue stated fact waiting to happen. This is the
    // oracle: tightening the judgement to reject `''` fails here.
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

    // THE PRE-NARROWED-BODY MISTAKE, asserted rather than only warned about in a comment. The
    // bridge in `edge.ts` is untyped, so a delegation that handed over `{ id }` would compile,
    // would resolve a usable caller, and would refuse every linked volunteer at the deployed edge.
    // Here that mistake is visible: same id, no handle.
    const narrowed = callerFromAuthAnswer(200, { id: LINKED_USER.id });
    expect(narrowed?.id, 'a pre-narrowed body still resolves an id — which is why it is dangerous').toBe(LINKED_USER.id);
    expect(
      narrowed?.githubHandle,
      'a pre-narrowed body loses the handle; the live control for this is proof check (g)',
    ).toBeNull();
  });

  it('accepts the whole 2xx range and refuses everything outside it', () => {
    // 200 is what GoTrue answers. The rest of the range is accepted because `Response.ok` — what
    // this function replaced — is exactly 200 to 299, and the two must agree.
    for (const status of [200, 201, 204, 299]) {
      expect(callerFromAuthAnswer(status, PLAIN_USER), `status ${status} is a success`).not.toBeNull();
    }
    // THE REFUSALS THAT MATTER MOST. 403 is what the live Auth answered for a revoked session and
    // for an expired access token (`session_not_found` and `bad_jwt` — the re-pin in
    // loop/items/AI4DEV-60/fix-rulings.md ruling 2) — AT-001.12's whole subject — and a caller
    // must not come back from any such refusal even though its body is perfectly well-formed JSON.
    for (const status of [400, 401, 403, 404, 429, 500, 502, 503]) {
      expect(callerFromAuthAnswer(status, PLAIN_USER), `status ${status} must resolve no caller`).toBeNull();
    }
    // The below-range and nonsense statuses. `0` is what a failed fetch reports in some runtimes,
    // and a negative or non-finite number is what arithmetic on a missing status produces.
    for (const status of [0, -1, 100, 199, 300, 302, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(callerFromAuthAnswer(status, PLAIN_USER), `status ${status} must resolve no caller`).toBeNull();
    }
  });

  it('refuses a 2xx whose body carries no usable id', () => {
    const refuses = (user: unknown, why: string): void => {
      expect(callerFromAuthAnswer(200, user), why).toBeNull();
    };

    // The field is absent altogether — the shape of a body read from the wrong endpoint, and the
    // shape of an error object that arrived with a success status.
    refuses({}, 'a body with no id must resolve no caller');
    refuses({ email: 'ngo@example.test' }, 'a body with other fields only must resolve no caller');
    refuses({ user: { id: PLAIN_USER.id } }, 'an id nested one level deeper must not be found');
    // Non-strings. A number is what an id becomes if somebody "helpfully" converts it; `true` is
    // what it becomes if somebody stores whether one was found.
    refuses({ id: null }, 'a null id must resolve no caller');
    refuses({ id: undefined }, 'an undefined id must resolve no caller');
    refuses({ id: 42 }, 'a numeric id must resolve no caller');
    refuses({ id: true }, 'a boolean id must resolve no caller');
    // An object value and an array value — the shapes a nested or repeated field produces.
    refuses({ id: {} }, 'an object id must resolve no caller');
    refuses({ id: { value: PLAIN_USER.id } }, 'a wrapped id must resolve no caller');
    refuses({ id: [PLAIN_USER.id] }, 'an array id must resolve no caller');
  });

  it('refuses a body that is not an object at all', () => {
    const refuses = (user: unknown, why: string): void => {
      expect(callerFromAuthAnswer(200, user), why).toBeNull();
    };

    // `null` is the one that matters most: `typeof null === 'object'`, so a check that forgot it
    // would THROW here instead of answering, and a throw on the write path is not a refusal. It is
    // also the value `edge.ts` hands over when the response body will not parse.
    refuses(null, 'a null body must resolve no caller, and must not throw');
    refuses(undefined, 'an undefined body must resolve no caller');
    refuses('unauthorized', 'a string body must resolve no caller');
    refuses(42, 'a numeric body must resolve no caller');
    refuses(true, 'a boolean body must resolve no caller');
    // An array has no `id`, so it reads as no caller rather than throwing.
    refuses([], 'an empty array body must resolve no caller');
    refuses([PLAIN_USER], 'a list of users is not a user');
  });

  it('reads a linked handle out of a messy identities[] without throwing', () => {
    // These are `extractGithubHandle`'s own edges, driven THROUGH this function because that is how
    // the deployed path reaches them: `caller.ts` hands the whole body over, so a shape that made
    // the extractor throw would take the whole caller resolution down with it.
    const handleOf = (identities: unknown): string | null =>
      callerFromAuthAnswer(200, { id: PLAIN_USER.id, identities })?.githubHandle ?? null;

    expect(handleOf(undefined), 'a body with no identities[] has no handle').toBeNull();
    expect(handleOf(null), 'a null identities[] has no handle').toBeNull();
    expect(handleOf('github'), 'a string identities[] has no handle').toBeNull();
    expect(handleOf([null, 42, 'x']), 'junk entries must be skipped, not thrown on').toBeNull();
    expect(handleOf([{ provider: 'google', identity_data: { user_name: 'someone' } }]), 'another provider is not GitHub').toBeNull();
    expect(handleOf([{ provider: 'github' }]), 'a GitHub identity with no identity_data has no handle').toBeNull();
    expect(handleOf([{ provider: 'github', identity_data: { user_name: '   ' } }]), 'a blank handle is no handle').toBeNull();
    // The one that must still work after all the refusals above: a real linked identity sitting
    // behind junk entries.
    expect(
      handleOf([null, { provider: 'google', identity_data: {} }, { provider: 'github', identity_data: { user_name: 'riverside-dev' } }]),
      'a real GitHub identity behind junk entries must still be found',
    ).toBe('riverside-dev');
  });
});
