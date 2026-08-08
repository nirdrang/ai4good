/**
 * What REQ-001 adds to the shared harness contract.
 *
 * The generic seams — tier, clock, fixture worlds, sentinels, faults, static scan, config, vendor
 * sims, the harness shape itself — live in `tests/at/harness/contracts.ts` and are re-exported here
 * so a test body imports one file. What is genuinely REQ-001's is below: the accounts system under
 * test, the row shapes its assertions read back, and what this requirement's fixture world can do.
 *
 * TYPE ALIASES, NOT INTERFACES, throughout — the rule `harness/contracts.ts` states and gives its
 * reasons for. Nothing reachable from the objects `open()` hands a test body may be an interface,
 * because an interface can be reopened with `declare module` and an OPTIONAL member merged into it
 * reads `undefined` at run time while every type-check stays green.
 *
 * THE JUDGEMENT TYPES ARE IMPORTED FROM THE SHIPPED MODULE, not restated here. `AccountType`,
 * `CompleteSignupRequest` and the rest come from `supabase/functions/_shared/accounts.ts`, which is
 * the same module the two edge functions import. Restating them would be two independent statements
 * about one thing with nothing able to notice them diverging — and that is the defect this whole
 * harness exists to delete, not a shape to reproduce inside it.
 */

import type { WorldSeam } from '../../harness/contracts.ts';
import type {
  AccountType,
  CompleteSignupRequest,
} from '../../../../supabase/functions/_shared/accounts.ts';

export type {
  Clock,
  ConfigRegistry,
  FaultHandle,
  Faults,
  Fixtures,
  ProviderOutcome,
  Sentinel,
  Sentinels,
  StaticScan,
  Tier,
  WorldSeam,
} from '../../harness/contracts.ts';
export { TIERS } from '../../harness/contracts.ts';

export type { AccountType, CompleteSignupRequest };

/* ------------------------------------------------------------------------- what gets read back */

/** One row of `public.accounts` — one per authenticated user, holding exactly one global type. */
export type AccountRow = {
  id: string;
  accountType: AccountType;
};

/** One row of `public.organizations`. */
export type OrganizationRow = {
  id: string;
  name: string;
};

/** One row of `public.org_memberships` — the per-NGO role, which is NOT the global account type. */
export type MembershipRow = {
  organizationId: string;
  accountId: string;
  role: 'admin' | 'member';
};

/**
 * One row of `public.acknowledgments` — EXACTLY the three fields AT-001.01 names recorded, plus the
 * account and kind that identify it.
 *
 * Name, title and authority attestation are AT-001.19's fields and belong to the acknowledgment-
 * identity deliverable (`loop/decomp/req-001.md` D4.L1), which is declared red by this leaf. They
 * are deliberately absent here: adding columns for a criterion this leaf does not test would be
 * speculation, and a reader would have no way to tell it from work that had been done.
 */
export type AcknowledgmentRow = {
  accountId: string;
  kind: string;
  /** ISO-8601 instant — AT-001.01's "timestamp" */
  acknowledgedAt: string;
  /**
   * AT-001.01's "IP": the address the gateway chain REPORTED, never a verified source address.
   * Measured on the live local stack — a spoofed `x-forwarded-for` is stored verbatim, and with no
   * header at all the stored value is the gateway's own hop. See `callerIp` in
   * `supabase/functions/_shared/edge.ts`.
   */
  ip: string;
  /** which version of the ToS + Platform Promise text was accepted — AT-001.01's "text version" */
  textVersion: string;
};

/* --------------------------------------------------------------------------------- the session */

/**
 * An authenticated session, and WHICH PROVIDER ESTABLISHED IT.
 *
 * `provider` is recorded, never simulated. Supabase Auth records the provider that produced a
 * session; how the session was obtained — an email and a password, or a completed Google consent
 * round trip — happens entirely upstream of anything this requirement's leaf ships. AT-001.03's
 * body asserts that `completeSignup` behaves identically for `'google'` and `'email'`, which is a
 * real property of the shipped decision module (it never reads this field). It is NOT a claim that a
 * Google round trip works: see the suite's own note on AT-001.03, and the plan's per-id table.
 */
export type SessionProvider = 'email' | 'google';

export type Session = {
  /** the auth user id, which is also the `public.accounts` primary key once signup completes */
  accountId: string;
  email: string;
  provider: SessionProvider;
};

/* -------------------------------------------------------------------------------- the outcomes */

export type SignInOutcome = { ok: true; session: Session } | { ok: false; reason: string };

export type CompleteSignupOutcome =
  | { ok: true; accountId: string; organizationId: string | null }
  | { ok: false; reason: string };

export type CreateOrganizationOutcome = { ok: true; organizationId: string } | { ok: false; reason: string };

/* ------------------------------------------------------------------------------------ the SUT */

/**
 * REQ-001's accounts system under test.
 *
 * The split is the point. `completeSignup` and `createOrganization` are the two PRODUCT OPERATIONS
 * — at loop tier the adapter runs them over its own storage but delegates every judgement to
 * `supabase/functions/_shared/accounts.ts`, the module the edge functions import; at integration
 * tier they would be the deployed edge functions. Everything else here is either Supabase Auth's
 * half (registration and sign-in, which are not this leaf's code) or read-back.
 */
export type AccountsSut = {
  /** AT-001.07's second clause: which types the PUBLIC signup surface offers. */
  publicSignupAccountTypes(): Promise<readonly string[]>;

  /* --- Supabase Auth's half. Not this leaf's code; it is what produces a session to complete. --- */

  /** Register an auth user with an email and a password, and return the resulting session. */
  registerWithEmailPassword(email: string, password: string): Promise<Session>;
  /**
   * A session Auth recorded as having come from an external provider.
   *
   * It performs NO handshake and fabricates no authorization code or token exchange: it is the state
   * Auth is in AFTER a consent round trip, which is the only part of the story any agent can reach.
   */
  registerWithProvider(provider: SessionProvider, email: string): Promise<Session>;
  /** Return sign-in with the same credentials — AT-001.01's final clause. */
  signInWithEmailPassword(email: string, password: string): Promise<SignInOutcome>;

  /* ----------------------------------- the two product operations ----------------------------- */

  /** `supabase/functions/complete-signup` — turns an authenticated auth user into a typed account. */
  completeSignup(session: Session, request: CompleteSignupRequest, ip: string): Promise<CompleteSignupOutcome>;
  /** `supabase/functions/create-organization` — the NGO-only action AT-001.06 drives. */
  createOrganization(session: Session, organizationName: string): Promise<CreateOrganizationOutcome>;

  /* ------------------------------------------- read-back -------------------------------------- */

  account(accountId: string): Promise<AccountRow | null>;
  organization(organizationId: string): Promise<OrganizationRow | null>;
  membership(organizationId: string, accountId: string): Promise<MembershipRow | null>;
  acknowledgments(accountId: string): Promise<AcknowledgmentRow[]>;

  /**
   * The two read-backs a REFUSED action needs, which the keyed ones above cannot serve.
   *
   * Asserting that a rejection wrote nothing means looking for rows whose identifiers were never
   * handed out — a refused `createOrganization` returns no organisation id. So one search by the
   * name that was attempted, and one listing of everything an account is a member of. Without them
   * the strongest statement available is "the call said no", and an implementation that writes both
   * rows and then says no would satisfy it.
   */
  organizationsNamed(name: string): Promise<OrganizationRow[]>;
  membershipsOf(accountId: string): Promise<MembershipRow[]>;
  /**
   * `public.has_platform_acknowledgment(account_id)` — the observable form of AT-001.01's "before
   * any project creation is possible".
   *
   * It MUST DISCRIMINATE: false for an authenticated user who has not completed signup, true after.
   * The body asserts both halves for exactly that reason.
   *
   * WHICH IMPLEMENTATION THAT ASSERTION REACHES depends on the tier, and the difference matters. At
   * loop tier it reaches the fixture adapter's storage query, so what goes green is the RULE and the
   * adapter's storage — the shipped SQL function could return true unconditionally and the loop tier
   * would not notice. `public.has_platform_acknowledgment` itself is proved by step 7(h) of the
   * plan, against the live database, and by nothing else in this item.
   *
   * What this leaf cannot do at either tier is ENFORCE the clause — nothing in the tree creates a
   * project, and building project creation belongs to another requirement. This is the hook the leaf
   * that lands project creation must call.
   */
  hasPlatformAcknowledgment(accountId: string): Promise<boolean>;

  /* ------------------------------------ the provisioned admin --------------------------------- */

  /**
   * Provision a `platform_admin` — the ONLY legal way one exists, because the public path refuses
   * the type. It sits apart from `completeSignup` rather than being one of its options for that
   * reason.
   *
   * ON THE LIVE STACK THIS IS **NOT** A SERVICE-ROLE WRITE, and the correction matters more than
   * most: this comment used to say it was, and a later reader following it would have granted the
   * service role an INSERT on `public.accounts` — a write path straight past `complete_signup`'s
   * `platform_admin` refusal, which is the one guard that sits on the only write path. The service
   * role holds no INSERT anywhere in this schema, by measurement and by decision. Provisioning is a
   * direct database operation by an operator: a NARROWER authority than the service role, not a
   * wider one, and not one any running service holds.
   */
  provisionPlatformAdmin(email: string, password: string): Promise<Session>;
};

/* -------------------------------------------------------------------------------- the world */

/**
 * What REQ-001's fixture world adds to the shared seam.
 *
 * An INTERSECTION, not `interface World extends WorldSeam`, for the alias reason above.
 *
 * One member, and it earns its place: every test in this suite registers auth users, and two tests
 * that happened to pick the same address would interfere in a way that looks like a product defect.
 * `email()` namespaces an address to the world that issued it, so isolation is structural rather
 * than a convention each body has to remember.
 */
export type World = WorldSeam & {
  /** a mail address unique to THIS world, e.g. `email('ngo')` */
  email(local: string): string;
};
