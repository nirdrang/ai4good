/**
 * What REQ-002 adds to the shared harness contract: the organisation system under test, the rows
 * its assertions read back, and what this requirement's fixture world can do.
 *
 * TYPE ALIASES, NOT INTERFACES, throughout — the rule `harness/contracts.ts` states. Nothing
 * reachable from the objects `open()` hands a test body may be an interface, because an interface
 * can be reopened and an optional member merged into it reads `undefined` at run time while every
 * type-check stays green.
 *
 * THE JUDGEMENT TYPES ARE IMPORTED FROM THE SHIPPED MODULES, not restated. `WriteRefusalKind`,
 * `Decision`, `OrganizationDashboard`, `PublicProjectView`, `NotificationEventRow`,
 * `DeliveryRow`, `Allowance` and `SpendRow` come from `supabase/functions/_shared/`, the same
 * modules the edge functions and the emitter import. The shapes below that no shipped module
 * states yet — the vetting record — are this suite's own, and the unit that ships each one moves
 * its vocabulary into the product module and imports it back here.
 *
 * THE DOMAIN OBJECTS, named before the operations on them:
 *   - the ORGANISATION PROFILE, five fields on `public.organizations`;
 *   - the VETTING RECORD, the one aggregate that says whether an organisation is founder-vetted and
 *     holds the complete evidence of the latest vet;
 *   - the VETTING AUDIT ROW, the append-only history of vet and unvet actions;
 *   - the ALLOWANCE, what an organisation may spend on Discovery today, computed from the vetting
 *     record and the SPEND ROW for the current UTC day;
 *   - the NOTIFICATION rows the emitter writes for a vetting outcome;
 *   - the two PURE POLICIES, publishing and funding, consulted with no route behind them.
 */

import type { WorldSeam } from '../../harness/contracts.ts';
import type { Decision } from '../../../../supabase/functions/_shared/accounts.ts';
import type { Allowance, SpendRow } from '../../../../supabase/functions/_shared/discovery-allowance.ts';
import type { DeliveryRow, NotificationEventRow } from '../../../../supabase/functions/_shared/notifications.ts';
import type { VettingOutcomeNotice } from '../../../../supabase/functions/_shared/org-vetting.ts';
import type { PublicProjectView } from '../../../../supabase/functions/_shared/public-project.ts';
import type { OrganizationDashboard } from '../../../../supabase/functions/_shared/tenant-reads.ts';
import type { WriteRefusalKind } from '../../../../supabase/functions/_shared/write-routes.ts';

export type {
  Clock,
  ConfigRegistry,
  Fixtures,
  Tier,
  WorldSeam,
} from '../../harness/contracts.ts';
export { TIERS } from '../../harness/contracts.ts';

export type { Allowance, Decision, DeliveryRow, NotificationEventRow, OrganizationDashboard, PublicProjectView, SpendRow, VettingOutcomeNotice, WriteRefusalKind };

/* ----------------------------------------------------------------------------- the actors */

/**
 * An authenticated session. `sessionId` names the `auth.sessions` row; the live adapter holds the
 * tokens against it, and a handle with no entry cannot act.
 */
export type Session = {
  accountId: string;
  email: string;
  sessionId: string;
};

/** An NGO account with its organisation, as signup leaves it. */
export type NgoActor = {
  session: Session;
  accountId: string;
  organizationId: string;
  email: string;
};

/* ----------------------------------------------------------------------- the refusal shape */

export type WriteRefusal = {
  ok: false;
  kind: WriteRefusalKind | 'unauthenticated';
  status: number;
  reason: string;
};

/* ------------------------------------------------------------------ the organisation profile */

/** The four fields the profile route adds to the name. All four or none: the schema says so. */
export type OrganizationProfileFields = {
  mission: string;
  country: string;
  website: string;
  logo: string;
};

/** One row of `public.organizations` with its profile. Nulls mean the profile is incomplete. */
export type OrganizationProfileRow = {
  id: string;
  name: string;
  mission: string | null;
  country: string | null;
  website: string | null;
  logo: string | null;
};

export type ProfileRequest = OrganizationProfileFields & {
  organizationId: string;
  name: string;
};

export type ProfileOutcome = { ok: true; organizationId: string } | WriteRefusal;

/**
 * The outcome of an OPERATOR calling `public.set_organization_profile` with no TypeScript on the
 * path. AT-002.02's database arm reads its refusals: the definer refuses independently of the
 * decision module.
 */
export type ProfileDefinerAttempt = {
  accountId: string;
  request: ProfileRequest;
};

export type ProfileDefinerOutcome =
  | { ok: true; organizationId: string }
  | { ok: false; kind: WriteRefusalKind; reason: string };

/* --------------------------------------------------------------------- the vetting record */

/**
 * The metadata of emailed registration documents. Metadata only: no content, no storage key, no
 * download path exists anywhere in the product, which is AT-002.16's whole claim.
 */
export type RegistrationDocumentMetadata = {
  /** ISO-8601 instant the documents were received */
  registrationReceivedAt: string;
  registrationDocumentCount: number;
  /** the founder's attestation that the received copies were deleted before the vet was submitted */
  registrationCopiesDeleted: boolean;
};

/**
 * The evidence half of a vet: what the founder looked at, and the note.
 *
 * `evidenceType` is a plain string here, not the accepted vocabulary, because the refusal bodies
 * send values the product must reject — an identity-document type, an unknown token — and a type
 * that could not express them could not test the refusal. The vocabulary itself is the product
 * module's, and the stored record carries the accepted token unchanged.
 */
export type VetEvidence = {
  organizationName: string;
  publicReferenceUrl: string;
  contactName: string;
  contactTitle: string;
  authorityAttestation: string;
  evidenceType: string;
  note: string;
} & Partial<RegistrationDocumentMetadata>;

/**
 * One row of `public.org_vetting`, the aggregate. Absent before the first vet; present, with
 * `vetted` false and the latest evidence retained, after an unvet.
 */
export type VettingRecord = {
  organizationId: string;
  vetted: boolean;
  vettedByAccountId: string;
  /** ISO-8601 instant */
  vettedAt: string;
  organizationName: string;
  publicReferenceUrl: string;
  contactName: string;
  contactTitle: string;
  authorityAttestation: string;
  evidenceType: string;
  note: string;
  /** null for every evidence type other than emailed registration documents */
  registration: RegistrationDocumentMetadata | null;
};

/**
 * A vet request carries the complete evidence; an unvet carries the note and nothing else. Both
 * name the organisation. Actor and instant are server facts and have no field here.
 */
export type VetRequest = VetEvidence & { organizationId: string; action: 'vet' };
export type UnvetRequest = { organizationId: string; action: 'unvet'; note: string };
export type VettingRequest = VetRequest | UnvetRequest;

/**
 * `changed` is false for an unvet of an organisation that was never vetted; then no audit row and
 * no notification exist, and `notificationEventId` is null.
 */
export type VettingOutcome =
  | { ok: true; organizationId: string; vetted: boolean; changed: boolean; notificationEventId: string | null }
  | WriteRefusal;

/** The `org_vetting_changed` audit row, with its detail at the shape the definer writes. */
export type VettingAuditRow = {
  id: string;
  /** ISO-8601 instant */
  occurredAt: string;
  actorAccountId: string | null;
  actorLabel: string;
  subjectOrgId: string;
  reason: string;
  detail: {
    action: 'vet' | 'unvet';
    previousVetted: boolean;
    current: VettingRecord;
  };
};

/**
 * The outcome of an OPERATOR writing an aggregate row directly, with no TypeScript on the path.
 * AT-002.11b's schema arm reads its refusals: a row with a mandatory column null must be refused
 * by the database itself.
 */
export type OperatorWriteOutcome = { ok: true } | { ok: false; reason: string };

/**
 * A notice the operator can hand the definer. Channels are plain strings so a body can send a
 * value the channel enum will refuse — that is the late-failure arm, and a Channel-typed field
 * could not express it.
 */
export type VettingDefinerNotice = {
  channels: string[];
  copy: { subject: string; body: string };
};

export type VettingDefinerAttempt = {
  accountId: string;
  request: VettingRequest;
  notice: VettingDefinerNotice;
};

/** The event row plus the actor and payload AT-002.13 reads. */
export type VettingNotificationEvent = NotificationEventRow & {
  actorAccountId: string | null;
  payload: Record<string, unknown>;
};

/* -------------------------------------------------------------------------- the allowance */

export type AllowanceOutcome = { ok: true; allowance: Allowance } | WriteRefusal;

/* ------------------------------------------------------------------- the two pure policies */

/** Publishing requires the vetted condition; the value names the condition that was met. */
export type PublishingDecision = Decision<'vetted'>;
/** Funding is never vetting-gated; the value says so, whichever tier the organisation holds. */
export type FundingDecision = Decision<'not-vetting-gated'>;

/* ------------------------------------------------------------------------------- read-back */

export type ViewerAnswer = { status: number; body: string };
export type TenantReadOutcome<T> = { ok: true; value: T; answer: ViewerAnswer } | { ok: false; answer: ViewerAnswer };
export type PublicProjectOutcome = { ok: true; page: PublicProjectView; answer: ViewerAnswer } | { ok: false; answer: ViewerAnswer };

/* ------------------------------------------------------------------------------------ the SUT */

/**
 * REQ-002's organisation system under test.
 *
 * FOUR KINDS OF MEMBER. The PROVISIONING members build a Given and are operator acts, except the
 * NGO, which takes the public path so the account is what signup really leaves. The PRODUCT
 * OPERATIONS are the deployed routes: at loop tier the adapter runs them over its own storage and
 * delegates every judgement to the shipped modules; at integration they are the edge functions.
 * The OPERATOR members read rows back or write a Given no product path can reach, and they never
 * perform the action being graded. The POLICY members consult a pure decision with no route behind
 * it, and a green over one says the decision is right and nothing about enforcement.
 */
export type OrganizationsSut = {
  /* --------------------------------------------------------------- provisioning the actors */

  /**
   * An NGO account seated as admin of its own organisation. `emailVerified: false` leaves the
   * address unconfirmed in Auth, which is AT-002.22's Given and a state the live public path cannot
   * reach, so the live adapter provisions it as the operator.
   */
  provisionNgo(email: string, opts: { emailVerified: boolean }): Promise<NgoActor>;
  provisionVolunteer(email: string): Promise<Session>;
  provisionPlatformAdmin(email: string): Promise<Session>;
  /** Deactivate an account without touching any seat — the deactivated-admin arm of AT-002.29. */
  deactivateAccountAsOperator(accountId: string): Promise<void>;

  /* --------------------------------------------------------------------- the profile route */

  /** The profile route: first completion and every later edit, all five fields at once. */
  setProfile(session: Session | null, request: ProfileRequest): Promise<ProfileOutcome>;
  /** The row as the operator reads it, or null when there is no such organisation. */
  profile(organizationId: string): Promise<OrganizationProfileRow | null>;
  /** The caller-bound dashboard, which is where "render" is observable in this tree. */
  organizationDashboard(session: Session | null, organizationId: string): Promise<TenantReadOutcome<OrganizationDashboard>>;
  /**
   * Call `public.set_organization_profile` as the operator, bypassing every TypeScript decision, so
   * the definer's own refusal of a non-admin caller is observable.
   */
  attemptProfileDefinerAsOperator(input: ProfileDefinerAttempt): Promise<ProfileDefinerOutcome>;
  /**
   * Change the role on an organisation's existing membership row. The unique seat forbids a second
   * member, so a member of this organisation is this write, not a second grant. No product path
   * writes `member`.
   */
  setMembershipRoleAsOperator(organizationId: string, accountId: string, role: 'admin' | 'member'): Promise<void>;

  /* --------------------------------------------------------------------- the vetting route */

  /**
   * `POST /functions/v1/set-organization-vetting`. The request may carry keys the type does not
   * name — an attachment, a document body, a storage key — because the product must refuse them
   * rather than drop them, and a body that could not send one could not prove the refusal.
   */
  setVetting(session: Session | null, request: VettingRequest & Record<string, unknown>): Promise<VettingOutcome>;
  /** The aggregate as the operator reads it, or null before the first vet. */
  vettingRecord(organizationId: string): Promise<VettingRecord | null>;
  /**
   * Write an aggregate row as the operator, bypassing every TypeScript validator, so the schema's
   * own refusal of a partial record is observable. `vettedByAccountId` and `vettedAt` are supplied
   * because the operator is not the definer; any field may be null to probe its constraint.
   */
  attemptVettingRowAsOperator(
    row: { [K in keyof Omit<VettingRecord, 'registration'>]: VettingRecord[K] | null } & Partial<RegistrationDocumentMetadata>,
  ): Promise<OperatorWriteOutcome>;
  vettingAuditEvents(organizationId: string): Promise<VettingAuditRow[]>;
  /** Delete the organisation's one seat so a vet cannot resolve an NGO recipient. */
  removeOrganizationSeatAsOperator(organizationId: string): Promise<void>;
  /** Clear the Auth email on a seat holder so an email delivery cannot be addressed. */
  clearAccountEmailAsOperator(accountId: string): Promise<void>;
  /**
   * Call the vetting definer as the operator, with a notice the TypeScript route would never
   * compute. The late-failure body uses this to fail inside emit_notification after the aggregate
   * and the audit row have been written.
   */
  attemptVettingDefinerAsOperator(input: VettingDefinerAttempt): Promise<OperatorWriteOutcome>;

  /* --------------------------------------------------------- the notification rows it wrote */

  notificationEvents(filter: { event?: string; recipientId?: string }): Promise<VettingNotificationEvent[]>;
  notificationDeliveries(filter: { eventId?: string; recipientId?: string }): Promise<DeliveryRow[]>;

  /* ------------------------------------------------------------------- the allowance route */

  /** `POST /functions/v1/discovery-allowance` with `action: 'read'`. Writes nothing. */
  readAllowance(session: Session | null, organizationId: string): Promise<AllowanceOutcome>;
  /**
   * The same route with `action: 'debit'` — the contract the Discovery agent calls per turn. This
   * is not a Discovery message: it creates no conversation, no agent response and no funded turn.
   */
  debitAllowance(session: Session | null, organizationId: string, credits: number): Promise<AllowanceOutcome>;
  /** Every spend row of the organisation, as the operator reads them, oldest day first. */
  spendRows(organizationId: string): Promise<SpendRow[]>;
  /**
   * Write a spend row as the operator — the Given for the UTC reset at the integration tier, where
   * no clock can be commanded. A row on a previous day is exactly the bytes the database holds one
   * second after midnight; the product has no midnight event to observe.
   *
   * A row on a day that is not today MOVES the ledger: it deletes today's row as well as writing
   * the given one. Without that the organisation would hold two days at once, which no clock can
   * produce and which would make the reset assertion meaningless.
   */
  writeSpendRowAsOperator(row: SpendRow): Promise<void>;

  /* ------------------------------------------------------------------ the two pure policies */

  /** The publishing trust condition, consulted. No publish route exists behind it. */
  publishingAllowed(organizationId: string): Promise<PublishingDecision>;
  /** The funding permissibility, consulted. No checkout exists behind it. */
  fundingAllowed(organizationId: string): Promise<FundingDecision>;

  /* ------------------------------------------------------------------- the public surface */

  createProjectAsOperator(organizationId: string, name: string): Promise<{ id: string }>;
  /** The one public surface that exists today; a null or omitted session is a visitor. */
  publicProjectPage(projectId: string, session?: Session | null): Promise<PublicProjectOutcome>;
};

/* -------------------------------------------------------------------------------- the world */

/**
 * What REQ-002's fixture world adds to the shared seam: an address unique to this world, so two
 * tests that pick the same local part never interfere in a way that looks like a product defect.
 */
export type World = WorldSeam & {
  email(local: string): string;
};
