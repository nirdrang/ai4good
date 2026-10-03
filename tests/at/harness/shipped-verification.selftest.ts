import { describe, expect, it } from 'vitest';

import {
  discoveryMessageAllowed,
  emailVerifiedFromUser,
} from '../../../supabase/functions/_shared/verification.ts';

describe('the shipped verification module fails closed', () => {
  it('reads a non-empty email_confirmed_at string as verified, and nothing else', () => {
    expect(emailVerifiedFromUser({ email_confirmed_at: '2026-08-09T12:00:00.000Z' })).toBe(true);
    expect(emailVerifiedFromUser({ email_confirmed_at: 'x' })).toBe(true);
  });

  it('reads every malformed email_confirmed_at as UNVERIFIED', () => {
    expect(emailVerifiedFromUser({}), 'a missing field must not read as verified').toBe(false);
    expect(emailVerifiedFromUser({ email: 'a@example.test' }), 'a user with other fields only').toBe(false);
    expect(emailVerifiedFromUser({ email_confirmed_at: null })).toBe(false);
    expect(emailVerifiedFromUser({ email_confirmed_at: undefined })).toBe(false);
    expect(emailVerifiedFromUser({ email_confirmed_at: '' })).toBe(false);
    expect(emailVerifiedFromUser({ email_confirmed_at: '   ' })).toBe(false);
    expect(emailVerifiedFromUser({ email_confirmed_at: 0 })).toBe(false);
    expect(emailVerifiedFromUser({ email_confirmed_at: 1754740800000 })).toBe(false);
    expect(emailVerifiedFromUser({ email_confirmed_at: true })).toBe(false);
    expect(emailVerifiedFromUser({ email_confirmed_at: {} })).toBe(false);
    expect(emailVerifiedFromUser({ email_confirmed_at: { value: '2026-08-09T12:00:00.000Z' } })).toBe(false);
    expect(emailVerifiedFromUser({ email_confirmed_at: ['2026-08-09T12:00:00.000Z'] })).toBe(false);
  });

  it('reads a user that is not an object as UNVERIFIED', () => {
    expect(emailVerifiedFromUser(null)).toBe(false);
    expect(emailVerifiedFromUser(undefined)).toBe(false);
    expect(emailVerifiedFromUser('2026-08-09T12:00:00.000Z')).toBe(false);
    expect(emailVerifiedFromUser(42)).toBe(false);
    expect(emailVerifiedFromUser(true)).toBe(false);
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
    expect(refused.reason).toMatch(/verif/i);
    expect(refused.reason).toMatch(/email/i);
  });

  it('refuses a missing or malformed caller, naming email verification as the remedy', () => {
    const call = (caller: unknown) =>
      discoveryMessageAllowed(caller as Parameters<typeof discoveryMessageAllowed>[0]);

    const refusesNamingVerification = (caller: unknown, why: string): void => {
      const decision = call(caller);
      expect(decision.ok, why).toBe(false);
      if (decision.ok) return;
      expect(decision.reason, `${why} — and the reason must name verification`).toMatch(/verif/i);
      expect(decision.reason, `${why} — and the reason must name email`).toMatch(/email/i);
    };

    refusesNamingVerification(undefined, 'a missing caller must be refused, never allowed');
    refusesNamingVerification(null, 'a null caller must be refused');
    refusesNamingVerification({}, 'a caller with no emailVerified field must be refused');
    refusesNamingVerification({ emailVerified: 'true' }, 'the string "true" must not open the gate');
    refusesNamingVerification({ emailVerified: 1 }, 'the number 1 must not open the gate');
    refusesNamingVerification({ emailVerified: 'yes' }, 'the string "yes" must not open the gate');
    refusesNamingVerification({ emailVerified: {} }, 'an object must not open the gate');
    refusesNamingVerification({ email_verified: true }, 'a near-miss field name must be refused');
    refusesNamingVerification('verified', 'a string caller must be refused');
  });
});
