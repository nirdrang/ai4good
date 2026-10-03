import type { Decision } from './accounts.ts';

export const EMAIL_CONFIRMED_AT_FIELD = 'email_confirmed_at';

export function emailVerifiedFromUser(user: unknown): boolean {
  if (typeof user !== 'object' || user === null) return false;
  const confirmedAt = (user as Record<string, unknown>)[EMAIL_CONFIRMED_AT_FIELD];
  return typeof confirmedAt === 'string' && confirmedAt.trim() !== '';
}

export type DiscoveryMessageCaller = {
  emailVerified: boolean;
};

export function discoveryMessageAllowed(caller: DiscoveryMessageCaller): Decision<'verified'> {
  if (caller?.emailVerified === true) {
    return { ok: true, value: 'verified' };
  }
  return {
    ok: false,
    reason:
      'a Discovery message needs a verified email address — this account is email-unverified. ' +
      'Use the verification link sent to the account address, then send the message again',
  };
}
