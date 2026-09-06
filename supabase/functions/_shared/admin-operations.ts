/**
 * THE PLATFORM ADMINISTRATOR'S THREE OPERATIONS, as pure decisions: the audited contact transfer,
 * which lost-access recovery is the same operation as (AT-001.25, .26, .27, .35), the non-login
 * escalation contact (AT-001.28), and the account lifecycle setter (AT-001.29, .30, .31). The
 * routes under `supabase/functions/` register each one through `writeRoute`, and the acceptance
 * fixture runs the same decision over Maps, so the loop tier grades the judgement that ships.
 *
 * WHO MAY CALL IS NOT DECIDED HERE. The lifecycle gate and the platform-administrator check are the
 * inventory's — `WRITE_ROUTES` admits `platform_admin` only on these routes — and `writePipeline`
 * applies them before a decision runs. A deactivated administrator is refused by the gate before
 * `decideLifecycleChange` runs. What is decided here is whether THIS request is one the database
 * should perform, and the database re-checks every answer as a backstop.
 *
 * Same two constraints as `accounts.ts`: no non-relative import and no Deno global; no I/O, no
 * clock, no randomness.
 */

import { parseAccountLifecycle, type AccountLifecycle, type Decision } from './accounts.ts';
import {
  refuseWrite,
  stringField,
  type AccountWriteRouteInput,
  type WriteRouteDecision,
} from './write-routes.ts';

/**
 * The transferee is the SUBJECT whose standing the route loads: its type and lifecycle decide three
 * refusals below. The outgoing account is the organisation's seat holder and is read with the
 * organisation, so it needs no field of its own in the standing.
 */
export function subjectAccountIdField(body: Record<string, unknown>): string | null {
  return stringField(body.toAccountId);
}

/** The outgoing contact the transfer names — `writeRoute` shape-checks it like the other ids. */
export function fromAccountIdField(body: Record<string, unknown>): string | null {
  return stringField(body.fromAccountId);
}

/** The account whose lifecycle the setter changes — the standing's subject. */
export function accountIdField(body: Record<string, unknown>): string | null {
  return stringField(body.accountId);
}

/* ------------------------------------------------------------------------ the contact transfer */

export type ContactTransferArgs = {
  readonly p_account_id: string;
  readonly p_organization_id: string;
  readonly p_from_account_id: string;
  readonly p_to_account_id: string;
  readonly p_reason: string;
};

/**
 * THE TRANSFER NAMES THE OUTGOING ACCOUNT and refuses when that account no longer holds the seat, so
 * a retry after a timeout cannot move a seat from a state the caller never saw. Ruling R16: the
 * named seat moves, and the outgoing account is deactivated only when it then holds no other seat.
 * A transfer to the same account is refused: the seat would not move.
 */
export function decideContactTransfer(input: AccountWriteRouteInput): WriteRouteDecision<ContactTransferArgs> {
  const { standing } = input;
  const organizationId = input.target;
  const fromAccountId = stringField(input.body.fromAccountId);
  const toAccountId = input.subject;
  const reason = stringField(input.body.reason);
  if (organizationId === null) {
    return refuseWrite('invalid-request', 400, 'the transfer must name the organisation by id (organizationId)');
  }
  if (fromAccountId === null || toAccountId === null) {
    return refuseWrite(
      'invalid-request',
      400,
      'the transfer must name the outgoing account (fromAccountId) and the new contact (toAccountId)',
    );
  }
  if (reason === null) {
    return refuseWrite('invalid-request', 400, 'the transfer must carry a reason — the audit record is written with it');
  }
  if (fromAccountId === toAccountId) {
    return refuseWrite('invalid-request', 400, 'the new contact must be a different account from the outgoing one');
  }
  if (!standing.orgExists) {
    return refuseWrite('no-such-organisation', 409, `no organisation ${organizationId} exists`);
  }
  if (standing.orgSeatAccountId !== fromAccountId) {
    return refuseWrite(
      'not-the-current-contact',
      409,
      `account ${fromAccountId} does not hold the contact seat of organisation ${organizationId}, so there is nothing to transfer from it`,
    );
  }
  if (standing.subject === null) {
    return refuseWrite('transferee-no-account', 409, `account ${toAccountId} has not completed signup, so it cannot hold a contact seat`);
  }
  if (standing.subject.accountType !== 'ngo') {
    return refuseWrite(
      'transferee-not-ngo',
      409,
      `account ${toAccountId} is of type ${JSON.stringify(standing.subject.accountType)} — a contact seat is held by an NGO account only`,
    );
  }
  if (standing.subject.lifecycle === 'deactivated') {
    return refuseWrite('transferee-deactivated', 409, `account ${toAccountId} is deactivated, so it cannot take over a contact seat`);
  }
  return {
    ok: true,
    args: {
      p_account_id: input.caller.id,
      p_organization_id: organizationId,
      p_from_account_id: fromAccountId,
      p_to_account_id: toAccountId,
      p_reason: reason,
    },
  };
}

/* ---------------------------------------------------------------------- the escalation contact */

export type EscalationContact = {
  readonly name: string;
  readonly email: string;
  readonly phone: string | null;
};

/** A name and an address are what make the row a contact; a blank phone records nothing rather than ''. */
export function validateEscalationContact(raw: { name?: unknown; email?: unknown; phone?: unknown }): Decision<EscalationContact> {
  const name = stringField(raw.name);
  if (name === null) return { ok: false, reason: 'the escalation contact needs a name' };
  const email = stringField(raw.email);
  if (email === null || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, reason: 'the escalation contact needs an email address' };
  }
  return { ok: true, value: { name, email, phone: stringField(raw.phone) } };
}

export type EscalationContactArgs = {
  readonly p_account_id: string;
  readonly p_organization_id: string;
  readonly p_name: string;
  readonly p_email: string;
  readonly p_phone: string | null;
};

export function decideEscalationContact(input: AccountWriteRouteInput): WriteRouteDecision<EscalationContactArgs> {
  if (input.target === null) {
    return refuseWrite('invalid-request', 400, 'the escalation contact must name the organisation by id (organizationId)');
  }
  const contact = validateEscalationContact({ name: input.body.name, email: input.body.email, phone: input.body.phone });
  if (!contact.ok) return refuseWrite('invalid-contact', 400, contact.reason);
  if (!input.standing.orgExists) {
    return refuseWrite('no-such-organisation', 409, `no organisation ${input.target} exists`);
  }
  return {
    ok: true,
    args: {
      p_account_id: input.caller.id,
      p_organization_id: input.target,
      p_name: contact.value.name,
      p_email: contact.value.email,
      p_phone: contact.value.phone,
    },
  };
}

/* ---------------------------------------------------------------------- the lifecycle setter */

export type LifecycleChangeArgs = {
  readonly p_account_id: string;
  readonly p_subject_account_id: string;
  readonly p_lifecycle: AccountLifecycle;
  readonly p_reason: string;
};

/**
 * THE SUBJECT IS THE STANDING'S SUBJECT. An administrator changing its own lifecycle is
 * `invalid-request` — a second administrator is required. A deactivated administrator never
 * reaches this decision: the inventory gate refuses it first.
 */
export function decideLifecycleChange(input: AccountWriteRouteInput): WriteRouteDecision<LifecycleChangeArgs> {
  const subjectAccountId = input.subject;
  const lifecycle = parseAccountLifecycle(input.body.lifecycle);
  const reason = stringField(input.body.reason);
  if (subjectAccountId === null) {
    return refuseWrite('invalid-request', 400, 'the lifecycle change must name the account by id (accountId)');
  }
  if (lifecycle === null) {
    return refuseWrite('invalid-request', 400, 'the lifecycle change must name a lifecycle of active or deactivated');
  }
  if (reason === null) {
    return refuseWrite('invalid-request', 400, 'the lifecycle change must carry a reason — the audit record is written with it');
  }
  if (subjectAccountId === input.caller.id) {
    return refuseWrite('invalid-request', 400, 'an administrator cannot change its own lifecycle');
  }
  if (input.standing.subject === null) {
    return refuseWrite('subject-no-account', 409, `account ${subjectAccountId} has not completed signup, so it has no lifecycle to change`);
  }
  return {
    ok: true,
    args: {
      p_account_id: input.caller.id,
      p_subject_account_id: subjectAccountId,
      p_lifecycle: lifecycle,
      p_reason: reason,
    },
  };
}
