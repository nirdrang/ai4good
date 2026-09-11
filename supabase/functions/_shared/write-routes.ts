/** The write-route inventory, the caller's standing, the lifecycle gate and the gate-then-decide pipeline. */

import {
  ACCOUNT_TYPES,
  ngoOnlyActionAllowed,
  parseAccountLifecycle,
  type AccountLifecycle,
  type AccountType,
} from './accounts.ts';
import { parseOrgRole, type OrgRole } from './memberships.ts';
import type { Caller } from './caller.ts';

/** Where a route lives. A stand-in has no deployed function; the fixture drives the gate over it. */
export type RouteSurface =
  | { readonly kind: 'edge'; readonly rpc: string }
  | { readonly kind: 'stand-in'; readonly reason: string };

/** What the caller must be. The exemption carries its reason IN THE TYPE, so nothing is a bare flag. */
export type RouteStanding =
  | { readonly kind: 'account-required'; readonly admits: readonly AccountType[] }
  | { readonly kind: 'account-absent-by-design'; readonly reason: string };

export const WRITE_ROUTES = {
  'complete-signup': {
    surface: { kind: 'edge', rpc: 'complete_signup' },
    standing: {
      kind: 'account-absent-by-design',
      reason: 'the account row is what this route creates; the lifecycle check still applies when a row already exists',
    },
  },
  'create-organization': {
    surface: { kind: 'edge', rpc: 'create_organization' },
    standing: { kind: 'account-required', admits: ['ngo'] },
  },
  'update-organization': {
    surface: { kind: 'edge', rpc: 'update_organization' },
    standing: { kind: 'account-required', admits: ['ngo'] },
  },
  'set-organization-profile': {
    surface: { kind: 'edge', rpc: 'set_organization_profile' },
    standing: { kind: 'account-required', admits: ['ngo'] },
  },
  'transfer-organization-contact': {
    surface: { kind: 'edge', rpc: 'transfer_organization_contact' },
    standing: { kind: 'account-required', admits: ['platform_admin'] },
  },
  'set-escalation-contact': {
    surface: { kind: 'edge', rpc: 'set_escalation_contact' },
    standing: { kind: 'account-required', admits: ['platform_admin'] },
  },
  'set-account-lifecycle': {
    surface: { kind: 'edge', rpc: 'set_account_lifecycle' },
    standing: { kind: 'account-required', admits: ['platform_admin'] },
  },
  'set-organization-vetting': {
    surface: { kind: 'edge', rpc: 'set_organization_vetting' },
    standing: { kind: 'account-required', admits: ['platform_admin'] },
  },
  'discovery-allowance': {
    surface: { kind: 'edge', rpc: 'discovery_allowance' },
    standing: { kind: 'account-required', admits: ['ngo'] },
  },
  'discovery-message': {
    surface: {
      kind: 'stand-in',
      reason: 'REQ-002/004 owns the Discovery route; this tree ships the decision it must consult',
    },
    standing: { kind: 'account-required', admits: ['ngo', 'volunteer', 'platform_admin'] },
  },
} as const satisfies Record<string, { surface: RouteSurface; standing: RouteStanding }>;

export type WriteRouteName = keyof typeof WRITE_ROUTES;

export const WRITE_REFUSAL_KINDS = [
  'refused',
  'account-deactivated',
  'no-account',
  'not-a-platform-admin',
  'not-an-ngo-account',
  'not-a-member',
  'not-an-admin',
  'invalid-request',
  'invalid-name',
  'invalid-contact',
  'invalid-evidence',
  'invalid-credit-amount',
  'daily-allowance-exhausted',
  'debit-exceeds-remaining',
  'email-unverified',
  'no-such-organisation',
  'not-the-current-contact',
  'transferee-no-account',
  'transferee-not-ngo',
  'transferee-deactivated',
  'subject-no-account',
] as const;

export type WriteRefusalKind = (typeof WRITE_REFUSAL_KINDS)[number];

export function parseWriteRefusalKind(raw: unknown): WriteRefusalKind {
  if (typeof raw !== 'string') return 'refused';
  const candidate = raw.trim();
  return (WRITE_REFUSAL_KINDS as readonly string[]).includes(candidate) ? (candidate as WriteRefusalKind) : 'refused';
}

/** The account a route names beside the caller — the transferee, for the contact transfer. */
export type SubjectStanding = {
  readonly accountType: AccountType;
  readonly lifecycle: AccountLifecycle;
};

/** `unreadable` is a third state: a read that did not happen is not a judgement about the caller. */
export type WriteStanding =
  | { readonly kind: 'no-account' }
  | { readonly kind: 'unreadable'; readonly detail: string }
  | {
      readonly kind: 'account';
      readonly accountType: AccountType;
      readonly lifecycle: AccountLifecycle;
      /** the caller's role in the TARGET organisation, or null — never a role held elsewhere */
      readonly orgRole: OrgRole | null;
      readonly orgExists: boolean;
      /** the organisation's single seat holder, which the transfer compares against */
      readonly orgSeatAccountId: string | null;
      /** the subject account a route names; null when it names none or the account has no row */
      readonly subject: SubjectStanding | null;
    };

/** The `account` member of `WriteStanding`, after the gate has admitted an account-required route. */
export type AccountStanding = Extract<WriteStanding, { kind: 'account' }>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseKnownAccountType(raw: unknown): AccountType | null {
  if (typeof raw !== 'string') return null;
  const candidate = raw.trim();
  return (ACCOUNT_TYPES as readonly string[]).includes(candidate) ? (candidate as AccountType) : null;
}

function unreadable(detail: string): WriteStanding {
  return { kind: 'unreadable', detail };
}

/**
 * The answer of `public.write_standing`, judged. FAIL-CLOSED: every shape this function does not
 * recognise is `unreadable` — never `no-account`, and never an account with a guessed field.
 */
export function parseWriteStanding(raw: unknown): WriteStanding {
  if (!isRecord(raw)) return unreadable('the standing answer is not an object');
  if (raw.account === null) return { kind: 'no-account' };
  if (!isRecord(raw.account)) return unreadable('the standing answer carries no account field');

  const accountType = parseKnownAccountType(raw.account.account_type);
  if (accountType === null) return unreadable('the standing answer carries an unknown account type');
  const lifecycle = parseAccountLifecycle(raw.account.lifecycle);
  if (lifecycle === null) return unreadable('the standing answer carries an unknown lifecycle');

  if (typeof raw.org_exists !== 'boolean') {
    return unreadable('the standing answer does not say whether the organisation exists');
  }
  const rawRole = raw.org_role ?? null;
  const orgRole = rawRole === null ? null : parseOrgRole(rawRole);
  if (rawRole !== null && orgRole === null) return unreadable('the standing answer carries an unknown organisation role');

  const seat = raw.org_seat_account_id ?? null;
  if (seat !== null && typeof seat !== 'string') return unreadable('the standing answer carries a seat holder that is not an id');

  let subject: SubjectStanding | null = null;
  const rawSubject = raw.subject ?? null;
  if (rawSubject !== null) {
    if (!isRecord(rawSubject)) return unreadable('the standing answer carries a subject that is not an object');
    const subjectType = parseKnownAccountType(rawSubject.account_type);
    const subjectLifecycle = parseAccountLifecycle(rawSubject.lifecycle);
    if (subjectType === null || subjectLifecycle === null) {
      return unreadable('the standing answer carries a subject with an unknown type or lifecycle');
    }
    subject = { accountType: subjectType, lifecycle: subjectLifecycle };
  }

  return {
    kind: 'account',
    accountType,
    lifecycle,
    orgRole,
    orgExists: raw.org_exists,
    orgSeatAccountId: seat,
    subject,
  };
}

export type WriteRouteInput = {
  readonly caller: Caller;
  readonly standing: WriteStanding;
  readonly body: Record<string, unknown>;
  readonly target: string | null;
  readonly subject: string | null;
  readonly ip: string | null;
};

/** An account-required route's input: the gate has already proved the standing is the account variant. */
export type AccountWriteRouteInput = WriteRouteInput & { readonly standing: AccountStanding };

export type WriteRouteDecision<Args> =
  | { readonly ok: true; readonly args: Args }
  | {
      readonly ok: false;
      readonly kind: WriteRefusalKind;
      readonly reason: string;
      readonly status: number;
    };

export type WriteRouteSpec<Args, Input extends WriteRouteInput = WriteRouteInput> = {
  readonly name: WriteRouteName;
  readonly target?: (body: Record<string, unknown>) => string | null;
  readonly subject?: (body: Record<string, unknown>) => string | null;
  /** the outgoing account id, when a route names one; `writeRoute` shape-checks it like target and subject */
  readonly from?: (body: Record<string, unknown>) => string | null;
  readonly decide: (input: Input) => WriteRouteDecision<Args>;
  readonly render?: (value: unknown) => Record<string, unknown>;
};

export function refuseWrite<Args>(kind: WriteRefusalKind, status: number, reason: string): WriteRouteDecision<Args> {
  return { ok: false, kind, reason, status };
}

/**
 * A PostgREST refusal is a raised exception when `code` is a five-character SQLSTATE; anything else
 * is transport or a gateway page, not a judgement, and answers 502.
 */
export function rpcRefusalStatus(outcome: { code: string | null }): 409 | 502 {
  return typeof outcome.code === 'string' && /^[0-9A-Z]{5}$/.test(outcome.code) ? 409 : 502;
}

/** A request field as a trimmed non-empty string, or null — the shape every selector answers with. */
export function stringField(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
}

/** The organisation a request targets, read from the one field every organisation-scoped route uses. */
export function organizationIdField(body: Record<string, unknown>): string | null {
  return stringField(body.organizationId);
}

/** The kind a type mismatch carries, DERIVED from `admits` so there is no second field to sync. */
export function typeRefusalKind(admits: readonly AccountType[]): WriteRefusalKind {
  if (admits.length === 1 && admits[0] === 'platform_admin') return 'not-a-platform-admin';
  if (admits.length === 1 && admits[0] === 'ngo') return 'not-an-ngo-account';
  return 'refused';
}

function typeRefusalReason(admits: readonly AccountType[], accountType: AccountType): string {
  if (admits.length === 1 && admits[0] === 'ngo') {
    const decision = ngoOnlyActionAllowed(accountType);
    if (!decision.ok) return decision.reason;
  }
  const who = admits.length === 1 && admits[0] === 'platform_admin' ? 'platform administrators' : `${admits.join(', ')} accounts`;
  return `this action is available to ${who} only — the caller's account is of type ${JSON.stringify(accountType)}`;
}

/** Deactivation is judged before type and before presence, so a deactivated caller is told it is deactivated and nothing else. */
export function writeGateDecision(name: WriteRouteName, standing: WriteStanding): WriteRouteDecision<'admitted'> {
  const route = WRITE_ROUTES[name];
  if (standing.kind === 'unreadable') {
    return refuseWrite('refused', 502, `the caller's standing could not be read, so no decision was made: ${standing.detail}`);
  }
  if (standing.kind === 'account' && standing.lifecycle === 'deactivated') {
    return refuseWrite('account-deactivated', 403, 'this account is deactivated, so it may perform no write');
  }
  if (route.standing.kind === 'account-absent-by-design') return { ok: true, args: 'admitted' };
  if (standing.kind === 'no-account') {
    return refuseWrite('no-account', 409, 'complete signup before this action — the caller holds no account yet');
  }
  const admits: readonly AccountType[] = route.standing.admits;
  if (!admits.includes(standing.accountType)) {
    return refuseWrite(typeRefusalKind(admits), 403, typeRefusalReason(admits, standing.accountType));
  }
  return { ok: true, args: 'admitted' };
}

export function writePipeline<Args, Input extends WriteRouteInput = WriteRouteInput>(
  spec: WriteRouteSpec<Args, Input>,
  input: WriteRouteInput,
): WriteRouteDecision<Args> {
  const gate = writeGateDecision(spec.name, input.standing);
  if (!gate.ok) return gate;
  if (WRITE_ROUTES[spec.name].standing.kind === 'account-required' && input.standing.kind === 'account') {
    return spec.decide({ ...input, standing: input.standing } as Input);
  }
  return spec.decide(input as Input);
}
