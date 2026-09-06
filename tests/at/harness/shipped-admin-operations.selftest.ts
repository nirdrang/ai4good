/**
 * THE ORACLE FOR THE PLATFORM ADMINISTRATOR'S TWO DECISIONS. The acceptance ids reach the admitted
 * path of `decideContactTransfer` and `decideEscalationContact` and one refusal each; every other
 * refusal branch is reachable here alone, with a hand-built `WriteRouteInput`. WHAT A GREEN HERE
 * CLAIMS: that each decision answers the kind, the status and the arguments its module states, for
 * every branch. WHAT IT DOES NOT CLAIM: that the definers behind them refuse the same way — the
 * integration tier is the oracle for that.
 */

import { describe, expect, it } from 'vitest';

import {
  decideContactTransfer,
  decideEscalationContact,
} from '../../../supabase/functions/_shared/admin-operations.ts';
import type { AccountStanding, AccountWriteRouteInput } from '../../../supabase/functions/_shared/write-routes.ts';

const ADMIN = '7c1e5a3b-2d4f-4e6a-8b9c-0d1e2f3a4b5c';
const ORG = '5f0c2f0e-4d4a-4b8e-9a4b-1f2e3d4c5b6a';
const OUTGOING = '0f1d6a2e-6d1c-4a3b-9a7e-2c5b8d4f1a90';
const TRANSFEREE = '3b2a1c0d-9e8f-4a7b-8c6d-5e4f3a2b1c0d';
const STRANGER = '6d5c4b3a-2f1e-4d0c-9b8a-7f6e5d4c3b2a';
const REASON = 'planned handover: the executive director changed';

const ADMIN_STANDING: AccountStanding = {
  kind: 'account',
  accountType: 'platform_admin',
  lifecycle: 'active',
  orgRole: null,
  orgExists: true,
  orgSeatAccountId: OUTGOING,
  subject: { accountType: 'ngo', lifecycle: 'active' },
};

function standing(overrides: Partial<AccountStanding>): AccountStanding {
  return { ...ADMIN_STANDING, ...overrides };
}

const TRANSFER_BODY = { organizationId: ORG, fromAccountId: OUTGOING, toAccountId: TRANSFEREE, reason: REASON };

function transferBody(overrides: Record<string, unknown>): Record<string, unknown> {
  return { ...TRANSFER_BODY, ...overrides };
}

function transferInput(overrides: Partial<AccountWriteRouteInput> = {}): AccountWriteRouteInput {
  return {
    caller: { id: ADMIN, githubHandle: null },
    standing: ADMIN_STANDING,
    body: TRANSFER_BODY,
    target: ORG,
    subject: TRANSFEREE,
    ip: '203.0.113.7',
    ...overrides,
  };
}

const ADMITTED_TRANSFER = {
  ok: true,
  args: {
    p_account_id: ADMIN,
    p_organization_id: ORG,
    p_from_account_id: OUTGOING,
    p_to_account_id: TRANSFEREE,
    p_reason: REASON,
  },
};

describe('the shipped contact-transfer decision', () => {
  it('admits the transfer with exactly the five arguments the definer takes', () => {
    expect(decideContactTransfer(transferInput()), 'the canonical transfer was not admitted with the definer arguments').toEqual(
      ADMITTED_TRANSFER,
    );
  });

  it('trims the outgoing account id and the reason it hands to the definer', () => {
    const input = transferInput({ body: transferBody({ fromAccountId: `  ${OUTGOING}  `, reason: `  ${REASON}\n` }) });
    expect(decideContactTransfer(input), 'padded fields reached the definer padded, or were refused').toEqual(ADMITTED_TRANSFER);
  });

  it('refuses `invalid-request` 400 when the organisation is not named, naming the field', () => {
    const input = transferInput({ target: null, body: transferBody({ organizationId: undefined }) });
    expect(decideContactTransfer(input), 'a transfer with no organisation was decided').toEqual({
      ok: false,
      kind: 'invalid-request',
      status: 400,
      reason: expect.stringContaining('organizationId'),
    });
  });

  it('refuses `invalid-request` 400 when the outgoing account is missing, blank or not a string, naming the field', () => {
    for (const fromAccountId of [undefined, null, '', '   ', 42]) {
      const input = transferInput({ body: transferBody({ fromAccountId }) });
      expect(decideContactTransfer(input), `fromAccountId ${JSON.stringify(fromAccountId)} was accepted`).toEqual({
        ok: false,
        kind: 'invalid-request',
        status: 400,
        reason: expect.stringContaining('fromAccountId'),
      });
    }
  });

  it('refuses `invalid-request` 400 when the new contact is not named, naming the field', () => {
    const input = transferInput({ subject: null, body: transferBody({ toAccountId: undefined }) });
    expect(decideContactTransfer(input), 'a transfer with no new contact was decided').toEqual({
      ok: false,
      kind: 'invalid-request',
      status: 400,
      reason: expect.stringContaining('toAccountId'),
    });
  });

  it('refuses `invalid-request` 400 when the reason is missing, blank or not a string, because the audit row carries it', () => {
    for (const reason of [undefined, null, '', ' \t ', 7]) {
      const input = transferInput({ body: transferBody({ reason }) });
      expect(decideContactTransfer(input), `reason ${JSON.stringify(reason)} was accepted`).toEqual({
        ok: false,
        kind: 'invalid-request',
        status: 400,
        reason: expect.stringContaining('reason'),
      });
    }
  });

  it('refuses a transfer from an account to itself as `invalid-request` 400', () => {
    const input = transferInput({ subject: OUTGOING, body: transferBody({ toAccountId: OUTGOING }) });
    expect(decideContactTransfer(input), 'a transfer to the outgoing account itself was decided').toEqual({
      ok: false,
      kind: 'invalid-request',
      status: 400,
      reason: expect.stringContaining('different account'),
    });
  });

  it('refuses `no-such-organisation` 409 when the standing says the organisation does not exist', () => {
    const input = transferInput({ standing: standing({ orgExists: false, orgSeatAccountId: null }) });
    expect(decideContactTransfer(input), 'a transfer in an organisation that does not exist was decided').toEqual({
      ok: false,
      kind: 'no-such-organisation',
      status: 409,
      reason: expect.stringContaining(ORG),
    });
  });

  it('refuses `not-the-current-contact` 409 when the named outgoing account does not hold the seat', () => {
    for (const orgSeatAccountId of [STRANGER, null]) {
      const input = transferInput({ standing: standing({ orgSeatAccountId }) });
      expect(decideContactTransfer(input), `seat holder ${JSON.stringify(orgSeatAccountId)} let another account transfer the seat`).toEqual({
        ok: false,
        kind: 'not-the-current-contact',
        status: 409,
        reason: expect.stringContaining(OUTGOING),
      });
    }
  });

  it('refuses `transferee-no-account` 409 when the new contact has no account row', () => {
    const input = transferInput({ standing: standing({ subject: null }) });
    expect(decideContactTransfer(input), 'a new contact with no account row was given the seat').toEqual({
      ok: false,
      kind: 'transferee-no-account',
      status: 409,
      reason: expect.stringContaining(TRANSFEREE),
    });
  });

  it('refuses `transferee-not-ngo` 409 for a volunteer or a platform administrator as the new contact', () => {
    for (const accountType of ['volunteer', 'platform_admin'] as const) {
      const input = transferInput({ standing: standing({ subject: { accountType, lifecycle: 'active' } }) });
      expect(decideContactTransfer(input), `a ${accountType} was given the seat`).toEqual({
        ok: false,
        kind: 'transferee-not-ngo',
        status: 409,
        reason: expect.stringContaining(accountType),
      });
    }
  });

  it('refuses `transferee-deactivated` 409 when the new contact is a deactivated NGO account', () => {
    const input = transferInput({ standing: standing({ subject: { accountType: 'ngo', lifecycle: 'deactivated' } }) });
    expect(decideContactTransfer(input), 'a deactivated account was given the seat').toEqual({
      ok: false,
      kind: 'transferee-deactivated',
      status: 409,
      reason: expect.stringContaining(TRANSFEREE),
    });
  });

  it('judges the request shape before the organisation, the seat before the new contact', () => {
    const shapeFirst = transferInput({
      subject: OUTGOING,
      body: transferBody({ toAccountId: OUTGOING }),
      standing: standing({ orgExists: false, subject: null }),
    });
    expect(decideContactTransfer(shapeFirst), 'a malformed request was judged on the standing').toMatchObject({ ok: false, kind: 'invalid-request' });
    const organisationFirst = transferInput({ standing: standing({ orgExists: false, orgSeatAccountId: STRANGER, subject: null }) });
    expect(decideContactTransfer(organisationFirst), 'a missing organisation was judged on its seat').toMatchObject({
      ok: false,
      kind: 'no-such-organisation',
    });
    const seatFirst = transferInput({ standing: standing({ orgSeatAccountId: STRANGER, subject: null }) });
    expect(decideContactTransfer(seatFirst), 'a wrong outgoing account was judged on the new contact').toMatchObject({
      ok: false,
      kind: 'not-the-current-contact',
    });
  });
});

const CONTACT_BODY = { organizationId: ORG, name: 'Maya Lindqvist', email: 'maya@example.org', phone: '+1 555 0100' };

function contactBody(overrides: Record<string, unknown>): Record<string, unknown> {
  return { ...CONTACT_BODY, ...overrides };
}

function contactInput(overrides: Partial<AccountWriteRouteInput> = {}): AccountWriteRouteInput {
  return {
    caller: { id: ADMIN, githubHandle: null },
    standing: ADMIN_STANDING,
    body: CONTACT_BODY,
    target: ORG,
    subject: null,
    ip: '203.0.113.7',
    ...overrides,
  };
}

const ADMITTED_CONTACT = {
  ok: true,
  args: {
    p_account_id: ADMIN,
    p_organization_id: ORG,
    p_name: 'Maya Lindqvist',
    p_email: 'maya@example.org',
    p_phone: '+1 555 0100',
  },
};

describe('the shipped escalation-contact decision', () => {
  it('admits the contact with exactly the five arguments the definer takes', () => {
    expect(decideEscalationContact(contactInput()), 'the canonical contact was not admitted with the definer arguments').toEqual(
      ADMITTED_CONTACT,
    );
  });

  it('records no phone as null, whether the field is absent, blank or not a string', () => {
    for (const phone of [undefined, null, '', '   ', 5550100]) {
      expect(decideEscalationContact(contactInput({ body: contactBody({ phone }) })), `phone ${JSON.stringify(phone)} was not recorded as null`).toEqual({
        ...ADMITTED_CONTACT,
        args: { ...ADMITTED_CONTACT.args, p_phone: null },
      });
    }
  });

  it('trims the name, the email and the phone it hands to the definer', () => {
    const input = contactInput({ body: contactBody({ name: '  Maya Lindqvist ', email: ' maya@example.org\n', phone: ' +1 555 0100 ' }) });
    expect(decideEscalationContact(input), 'padded fields reached the definer padded, or were refused').toEqual(ADMITTED_CONTACT);
  });

  it('refuses `invalid-request` 400 when the organisation is not named, naming the field', () => {
    const input = contactInput({ target: null, body: contactBody({ organizationId: undefined }) });
    expect(decideEscalationContact(input), 'a contact with no organisation was decided').toEqual({
      ok: false,
      kind: 'invalid-request',
      status: 400,
      reason: expect.stringContaining('organizationId'),
    });
  });

  it('refuses `invalid-contact` 400 for a blank, missing or non-string name', () => {
    for (const name of ['', '   ', undefined, null, 42]) {
      expect(decideEscalationContact(contactInput({ body: contactBody({ name }) })), `name ${JSON.stringify(name)} was accepted`).toEqual({
        ok: false,
        kind: 'invalid-contact',
        status: 400,
        reason: expect.stringContaining('name'),
      });
    }
  });

  it('refuses `invalid-contact` 400 for an email that is not one character, an @, a domain and a dot', () => {
    for (const email of ['maya.example.org', 'Maya Lindqvist', '@', 'a@', '@b', 'a@b', '', '   ', undefined, null, 7]) {
      expect(decideEscalationContact(contactInput({ body: contactBody({ email }) })), `email ${JSON.stringify(email)} was accepted`).toEqual({
        ok: false,
        kind: 'invalid-contact',
        status: 400,
        reason: expect.stringContaining('email'),
      });
    }
  });

  it('refuses `no-such-organisation` 409 when the standing says the organisation does not exist', () => {
    const input = contactInput({ standing: standing({ orgExists: false, orgSeatAccountId: null }) });
    expect(decideEscalationContact(input), 'a contact for an organisation that does not exist was decided').toEqual({
      ok: false,
      kind: 'no-such-organisation',
      status: 409,
      reason: expect.stringContaining(ORG),
    });
  });

  it('judges the organisation id, then the contact, then whether the organisation exists', () => {
    const idFirst = contactInput({
      target: null,
      body: contactBody({ organizationId: undefined, name: '' }),
      standing: standing({ orgExists: false }),
    });
    expect(decideEscalationContact(idFirst), 'a missing organisation id was judged on the contact').toMatchObject({ ok: false, kind: 'invalid-request' });
    const contactFirst = contactInput({ body: contactBody({ name: '' }), standing: standing({ orgExists: false }) });
    expect(decideEscalationContact(contactFirst), 'a blank contact was judged on the organisation').toMatchObject({ ok: false, kind: 'invalid-contact' });
  });
});
