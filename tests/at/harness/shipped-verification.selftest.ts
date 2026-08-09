/**
 * THE ORACLE FOR `verification.ts`'s FAIL-CLOSED PROMISE.
 *
 * `supabase/functions/_shared/verification.ts` promises that every unrecognised shape reads as
 * UNVERIFIED and every malformed caller is REFUSED. The two acceptance bodies that drive that
 * module through the fixture exercise exactly two shapes — a `null` and a valid timestamp string
 * — because those are the two states a real Auth user passes through. So the promise about
 * missing fields, non-strings and malformed callers would have had NO oracle at all, and a
 * promise with no oracle is an untrue stated fact waiting to happen. This file is that oracle.
 *
 * WHY A SHIPPED MODULE'S SHAPE TEST RIDES THE SELFTEST LANE. The promise cannot arise through the
 * fixture: the fixture builds well-formed user shapes, so no acceptance body can hand this module
 * a number or an array without first making the fixture lie about what Auth sends. Driving the
 * module DIRECTLY is the only way to reach those inputs, and a direct call from an acceptance
 * body would be the thing the suite forbids — a test of a helper rather than of an application
 * boundary. The harness selftest lane is where direct unit-shaped checks already live, and CI
 * already runs it.
 *
 * IT NEEDED NO SCRIPT OR CI CHANGE, and that was verified before the file was written rather than
 * hoped for afterwards: `tests/at/vitest.config.ts` line 16 includes `harness/**\/*.selftest.ts`,
 * and the `at:selftest` script filters to `harness/`. `at:verify` filters to one suite directory,
 * so this file never joins an acceptance run and cannot affect any id's colour.
 *
 * WHAT A GREEN HERE CLAIMS: that the shipped module answers as its header says for every shape
 * named. WHAT IT DOES NOT CLAIM: that GoTrue sends any of these shapes. The one real
 * `/auth/v1/user` response this repository has judged is in the live proof,
 * `loop/items/AI4DEV-59/proof-local.ts` check (d).
 */

import { describe, expect, it } from 'vitest';

import {
  discoveryMessageAllowed,
  emailVerifiedFromUser,
} from '../../../supabase/functions/_shared/verification.ts';

describe('the shipped verification module fails closed', () => {
  it('reads a non-empty email_confirmed_at string as verified, and nothing else', () => {
    expect(emailVerifiedFromUser({ email_confirmed_at: '2026-08-09T12:00:00.000Z' })).toBe(true);
    // A different non-empty string is still verified: this module judges PRESENCE of an instant,
    // and parsing the instant is nobody's job here — GoTrue wrote it.
    expect(emailVerifiedFromUser({ email_confirmed_at: 'x' })).toBe(true);
  });

  it('reads every malformed email_confirmed_at as UNVERIFIED', () => {
    // The field is absent altogether — the shape an unconfirmed user has on some GoTrue versions,
    // and also the shape of a response body a caller read from the wrong endpoint.
    expect(emailVerifiedFromUser({}), 'a missing field must not read as verified').toBe(false);
    expect(emailVerifiedFromUser({ email: 'a@example.test' }), 'a user with other fields only').toBe(false);
    // `null` — the shape an unconfirmed user has, and the one the acceptance bodies exercise.
    expect(emailVerifiedFromUser({ email_confirmed_at: null })).toBe(false);
    expect(emailVerifiedFromUser({ email_confirmed_at: undefined })).toBe(false);
    // An empty string, and a blank one. Blank is the value most likely to arrive from a broken
    // serialiser, and three spaces are not an instant.
    expect(emailVerifiedFromUser({ email_confirmed_at: '' })).toBe(false);
    expect(emailVerifiedFromUser({ email_confirmed_at: '   ' })).toBe(false);
    // Non-strings. A number is what a timestamp becomes if somebody "helpfully" converts it, and
    // `true` is what it becomes if somebody stores the answer instead of the instant.
    expect(emailVerifiedFromUser({ email_confirmed_at: 0 })).toBe(false);
    expect(emailVerifiedFromUser({ email_confirmed_at: 1754740800000 })).toBe(false);
    expect(emailVerifiedFromUser({ email_confirmed_at: true })).toBe(false);
    // An object value and an array value — the shapes a nested or repeated field produces.
    expect(emailVerifiedFromUser({ email_confirmed_at: {} })).toBe(false);
    expect(emailVerifiedFromUser({ email_confirmed_at: { value: '2026-08-09T12:00:00.000Z' } })).toBe(false);
    expect(emailVerifiedFromUser({ email_confirmed_at: ['2026-08-09T12:00:00.000Z'] })).toBe(false);
  });

  it('reads a user that is not an object as UNVERIFIED', () => {
    // `null` is the one that matters most: `typeof null === 'object'`, so a check that forgot it
    // would throw here instead of answering, and a throw on the write path is not a refusal.
    expect(emailVerifiedFromUser(null)).toBe(false);
    expect(emailVerifiedFromUser(undefined)).toBe(false);
    expect(emailVerifiedFromUser('2026-08-09T12:00:00.000Z')).toBe(false);
    expect(emailVerifiedFromUser(42)).toBe(false);
    expect(emailVerifiedFromUser(true)).toBe(false);
    // An array has no `email_confirmed_at`, so it reads unverified rather than throwing.
    expect(emailVerifiedFromUser([])).toBe(false);
  });

  it('allows a Discovery message only on emailVerified === true', () => {
    const allowed = discoveryMessageAllowed({ emailVerified: true });
    expect(allowed.ok).toBe(true);
    if (allowed.ok) expect(allowed.value).toBe('verified');
  });

  it('refuses a Discovery message from an unverified caller, naming verification as the remedy', () => {
    const refused = discoveryMessageAllowed({ emailVerified: false });
    expect(refused.ok).toBe(false);
    if (refused.ok) return;
    // The same two patterns AT-001.10's body matches. Asserted here as well, so a reason that
    // stopped naming the remedy fails at the module rather than only inside one acceptance body.
    expect(refused.reason).toMatch(/verif/i);
    expect(refused.reason).toMatch(/email/i);
  });

  it('refuses a missing or malformed caller', () => {
    // Every call below is a shape the type-checker would reject at a checked call site. The edge
    // entry point is NOT type-checked — measured, and stated in `accounts.ts`'s header — so these
    // are the mistakes a real caller can make, and the casts are how the test reaches them.
    const call = (caller: unknown) =>
      discoveryMessageAllowed(caller as Parameters<typeof discoveryMessageAllowed>[0]);

    expect(call(undefined).ok, 'a missing caller must be refused, never allowed').toBe(false);
    expect(call(null).ok).toBe(false);
    expect(call({}).ok, 'a caller with no emailVerified field must be refused').toBe(false);
    // The truthy non-`true` values. A truthiness test would have allowed all four.
    expect(call({ emailVerified: 'true' }).ok).toBe(false);
    expect(call({ emailVerified: 1 }).ok).toBe(false);
    expect(call({ emailVerified: 'yes' }).ok).toBe(false);
    expect(call({ emailVerified: {} }).ok).toBe(false);
    // A near-miss field name, which is what a rename leaves behind.
    expect(call({ email_verified: true }).ok).toBe(false);
    expect(call('verified').ok).toBe(false);
  });
});
