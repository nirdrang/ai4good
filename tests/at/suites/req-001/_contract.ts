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
// THE PER-ORGANISATION ROLE VOCABULARY, imported for the reason the header gives about every other
// judgement type here: `OrgRole` is the shipped module's, the same one the rename edge function and
// the database enum state, so the operator grant below cannot name a role the product does not have.
import type { OrgAdminRefusalKind, OrgRole } from '../../../../supabase/functions/_shared/memberships.ts';
import type {
  OrganizationDashboard,
  ProjectWorkspace,
} from '../../../../supabase/functions/_shared/tenant-reads.ts';
import type { PublicProjectView } from '../../../../supabase/functions/_shared/public-project.ts';

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

export type { AccountType, CompleteSignupRequest, OrgAdminRefusalKind, OrgRole };
export type { OrganizationDashboard, ProjectWorkspace, PublicProjectView };

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
 * One row of `public.projects` — and the single developer seat IS the shape of it.
 *
 * `assignedVolunteerId` is ONE nullable field, so a project holds at most one developer and there is
 * no collaborator seat for a second to occupy. AT-001.32's "no collaborator seats" is therefore
 * unrepresentable here rather than merely refused: a join table would have made it a rule, a field
 * makes it a fact about the shape.
 *
 * PRODUCT PROJECT CREATION DOES NOT EXIST, at either tier, and this row does not imply it. Nothing
 * in the tree creates a project; the table and this shape land so the single-developer invariant can
 * be tested, and `hasPlatformAcknowledgment` is still the hook the leaf that lands project creation
 * must call.
 */
export type ProjectRow = {
  id: string;
  organizationId: string;
  name: string;
  /** the single developer's account id, or `null` while the seat is free */
  assignedVolunteerId: string | null;
};

/**
 * One row of `public.acknowledgments` — the three fields AT-001.01 names recorded and the three
 * AT-001.19 names, plus the account and kind that identify it.
 *
 * Name, title and authority attestation were deliberately absent here until the acknowledgment-
 * identity leaf (`loop/decomp/req-001.md` D4.L1) landed them; that leaf is this one, so they are
 * present now.
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
  /** who made the acknowledgment — AT-001.19's "name" */
  signerName: string;
  /** the title they held when they made it — AT-001.19's "title" */
  signerTitle: string;
  /**
   * AT-001.19's "authority attestation": the STATEMENT that was affirmed, verbatim, not a boolean.
   *
   * The shipped statement is `ACKNOWLEDGMENT_IDENTITY_COPY.authorityStatement` in
   * `supabase/functions/_shared/acknowledgment-copy.ts`, and `validateCompleteSignup` accepts no
   * other — so THROUGH THE DEPLOYED PATH exactly one value can appear here. That scope is the whole
   * claim: a `service_role` caller that bypasses the edge function can store a different nonblank
   * statement, because the database floors presence and nonblank only. That is the accepted
   * residual — see "WHERE THIS FILE'S AUTHORITY ENDS" in
   * `supabase/migrations/20260811120000_acknowledgment_signer_identity.sql` — and the column then
   * shows verbatim which statement was affirmed. It is stored anyway, because a later
   * statement version must stay distinguishable on rows already written.
   */
  authorityAttestation: string;
};

/**
 * One row of `public.volunteer_profiles` — AT-001.05's "profile", and every column of it.
 *
 * THE STATS ARE THE STUB IMPORT FIXTURE'S, NOT GITHUB'S. `stubGithubStatsFor` in
 * `supabase/functions/_shared/github.ts` produces them, the decomposition manifest's cross-contract
 * ratifies that stand-in ("stub import fixture until W3"), and no code in this item calls
 * api.github.com. What the row proves is that onboarding FIRED and landed POPULATED — the
 * criterion's "a queued-but-empty import fails this test" — and not that any statistic is real.
 */
export type VolunteerProfileRow = {
  accountId: string;
  /** the handle of the GitHub identity linked to the account — AT-001.05's "linked handle" */
  githubHandle: string;
  /** AT-001.05's "top languages"; never empty, in the schema by CHECK and here by assertion */
  topLanguages: string[];
  /** AT-001.05's "repository count" */
  repositoryCount: number;
  /** AT-001.05's "contribution summary" */
  contributionSummary: string;
  /** ISO-8601 instant the import landed */
  importedAt: string;
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
 *
 * `'github'` joins the two for AT-001.02 and carries exactly the same caveat: a github-established
 * session is the state Auth is in AFTER a consent round trip, and no handshake is simulated to reach
 * it. The establishing provider still participates in NO decision the shipped modules make — the
 * volunteer gate reads a LINKED IDENTITY, which is a different fact (see `linkGithubIdentity`).
 */
export type SessionProvider = 'email' | 'google' | 'github';

export type Session = {
  /** the auth user id, which is also the `public.accounts` primary key once signup completes */
  accountId: string;
  email: string;
  provider: SessionProvider;
  /**
   * WHICH session this handle is — the mirror of one `auth.sessions` row, and the thing expiry and
   * revocation happen to.
   *
   * It is separate from `accountId` because one account holds MANY sessions at once, which is the
   * whole substance of AT-001.12 and AT-001.13: a revoked session must end access while the account
   * lives on, and a refreshed session must outlive an unrefreshed sibling of the same instant. A
   * handle keyed only by account could express neither.
   *
   * IT IS STILL NOT AN ACCESS TOKEN. Nothing here is signed, nothing is decoded, and no expiry claim
   * is parsed; the fixture holds the session's validity in its own store and the SHIPPED
   * `callerFromAuthAnswer` judges the answer that store renders. What a real access token does is
   * measured on the live stack, in `loop/items/AI4DEV-60/proof-local.ts` checks (c) and (d).
   */
  sessionId: string;
};

/* -------------------------------------------------------------------------------- the outcomes */

export type SignInOutcome = { ok: true; session: Session } | { ok: false; reason: string };

/**
 * The outcome of refreshing a session — a HANDLE back, or a reason.
 *
 * It is its own type rather than a reuse of `SignInOutcome`, and the reason is the one thing
 * AT-001.13 is about: a sign-in takes credentials and a refresh does not. Two names for two
 * different acts keeps that difference readable at every call site, and the returned handle carries
 * the SAME `sessionId` — a refresh extends a session, it does not open another one.
 */
export type RefreshSessionOutcome = { ok: true; session: Session } | { ok: false; reason: string };

export type CompleteSignupOutcome =
  | { ok: true; accountId: string; organizationId: string | null }
  | { ok: false; reason: string };

export type CreateOrganizationOutcome = { ok: true; organizationId: string } | { ok: false; reason: string };

/**
 * The outcome of the admin-only NGO-side action — renaming an organisation — and its refusal
 * carries a KIND, not only a sentence.
 *
 * THE KIND IS THE ORACLE. AT-001.16 needs the refusal that says the caller is not in that
 * organisation at all; AT-001.36 needs the refusal that says the caller IS in it and holds
 * `member`. A single boolean, or a single reason string, would let one implementation satisfy both
 * criteria while authorising from the wrong organisation's row. `OrgAdminRefusalKind` is imported
 * from the shipped decision module rather than restated, so the two kinds a body asserts are the
 * two kinds the product can produce.
 *
 * TWO KINDS THE SHIPPED DECISION DOES NOT PRODUCE ARE STILL HERE, and both are the adapter's
 * honesty rather than product surface:
 *   * `invalid-name` — the shared `validateOrganizationName` refused, before any role was consulted.
 *   * `refused` — the adapter could not classify the refusal it received. It exists so a live
 *     adapter facing an unexpected status reports "something refused and I do not know what" rather
 *     than picking whichever meaningful kind happens to make a test pass.
 */
export type UpdateOrganizationOutcome =
  | { ok: true; organizationId: string; name: string }
  | { ok: false; kind: OrgAdminRefusalKind | 'invalid-name' | 'refused'; reason: string };

/**
 * The outcome of an OPERATOR granting a membership directly — used both to provision a Given and as
 * the refusal probe two criteria read.
 *
 * THE THREE KINDS ARE THE DATABASE'S, not a decision module's, and that is the point of this method
 * existing at all:
 *   * `not-an-ngo-account` — the NGO-only membership trigger refused the grantee. AT-001.37's
 *     "on every path" clause is about exactly this path: the operator's, with no TypeScript on it.
 *   * `org-already-seated` — the one-seat unique index refused a second membership row in that
 *     organisation. AT-001.17's structural arm.
 *   * `refused` — anything else, unclassified, for the reason `UpdateOrganizationOutcome` gives.
 */
export type GrantMembershipOutcome =
  | { ok: true; membership: MembershipRow }
  | { ok: false; kind: 'not-an-ngo-account' | 'org-already-seated' | 'refused'; reason: string };

/**
 * The outcome of an OPERATOR re-pointing an existing membership row at a DIFFERENT account — the
 * grant reached in two statements rather than one.
 *
 * IT EXISTS BECAUSE THE NGO-ONLY TRIGGER IS BOUND TO UPDATE AS WELL AS INSERT, and that binding is
 * the only guard on this path: a row inserted for an NGO account and then re-keyed to a volunteer
 * changes no row COUNT, so the one-seat index never sees it. AT-001.37 says "on every path", and an
 * unexercised trigger binding is a path nobody drives. Gate-2 ruling R5 added it.
 *
 * TWO KINDS ONLY, and the missing one is deliberate:
 *   * `not-an-ngo-account` — the trigger refused the new account, which is the arm under test.
 *   * `refused` — anything else, unclassified: no membership row in that organisation to re-point,
 *     an account that never completed signup, or a refusal this adapter cannot name.
 * `org-already-seated` cannot arise here — re-pointing keeps the organisation's row count at one.
 */
export type RepointMembershipOutcome =
  | { ok: true; membership: MembershipRow }
  | { ok: false; kind: 'not-an-ngo-account' | 'refused'; reason: string };

/**
 * The outcome of an OPERATOR attaching a volunteer to a project — AT-001.32's act.
 *
 * `seat-occupied` is the database guard refusing to re-point a seat that is already held at a
 * DIFFERENT account, which is what "attaching a second volunteer" means. Releasing the seat to null
 * is not refused and is not tested here: offboarding belongs to another leaf, and a guard that
 * refused it would be building that leaf's requirement early. `refused` is the unclassified case,
 * for the reason `UpdateOrganizationOutcome` gives.
 */
export type AssignVolunteerOutcome =
  | { ok: true; project: ProjectRow }
  | { ok: false; kind: 'seat-occupied' | 'refused'; reason: string };

/**
 * The outcome of an attempted Discovery message — and the refusal carries WHY, for the reason
 * `Decision` in the shipped module gives: AT-001.10 asserts that the block NAMES verification as
 * the remedy, so a bare boolean would make the criterion untestable.
 */
export type SendDiscoveryMessageOutcome = { ok: true } | { ok: false; reason: string };

export type ViewerAnswer = { status: number; body: string };
/** privilege-denied: the privilege layer; session-refused: the token, a broken test not a verdict; refused: anything else. */
export type ViewerRefusalKind = 'privilege-denied' | 'session-refused' | 'refused';
export type ViewerRead<Row> =
  | { ok: true; rows: readonly Row[]; answer: ViewerAnswer }
  | { ok: false; kind: ViewerRefusalKind; reason: string; answer: ViewerAnswer };
export type TenantReadOutcome<T> = { ok: true; value: T; answer: ViewerAnswer } | { ok: false; answer: ViewerAnswer };
export type PublicProjectOutcome = { ok: true; page: PublicProjectView; answer: ViewerAnswer } | { ok: false; answer: ViewerAnswer };
export type TenantTableFacts = {
  table: string;
  rowLevelSecurity: boolean;
  anonSelect: boolean;
  authenticatedSelect: boolean;
  policies: readonly { name: string; using: string }[];
};

/* ------------------------------------------------------------------------------------ the SUT */

/**
 * REQ-001's accounts system under test.
 *
 * The split is the point, and there are now FOUR kinds of member here rather than three:
 *
 *   1. THE TWO PRODUCT OPERATIONS — `completeSignup` and `createOrganization`. At loop tier the
 *      adapter runs them over its own storage but delegates every judgement to
 *      `supabase/functions/_shared/accounts.ts`, the module the edge functions import; at
 *      integration tier they would be the deployed edge functions.
 *   2. SUPABASE AUTH'S HALF — registration, sign-in, identity linking, the session layer
 *      (`signOut`, `refreshSession`, `sessionsOf`), password reset (`requestPasswordReset`,
 *      `emailedPasswordResetLink`, `completePasswordReset`) and the verification state
 *      (`emailVerified`, `emailedVerificationLink`, `useVerificationLink`). None of it is this
 *      requirement's code. It is what produces the states the product operations judge.
 *
 *      THE SESSION AND RESET MEMBERS ARE VENDOR MIRRORS, and every one of them is named in
 *      `_fixture.ts`'s mirror section with what binds it live or an explicit unbound label. What is
 *      NOT a mirror is the judgement that reads them: every session-taking operation resolves its
 *      caller through the SHIPPED `callerFromAuthAnswer`, so a dead session is refused by the same
 *      code the deployed functions run.
 *   3. READ-BACK — the row shapes an assertion reads after the fact.
 *   4. ONE STAND-IN SURFACE, AND IT IS THE ONLY ONE — `sendDiscoveryMessage`, with
 *      `discoveryMessagesBy` reading it back.
 *
 * THE FOURTH KIND NEEDS ITS OWN SENTENCE, because it is the one that could be misread. NO
 * DISCOVERY ROUTE EXISTS IN THIS TREE. The Discovery message route is REQ-002/004's, and what
 * this requirement's leaf ships is the DECISION that route must consult —
 * `discoveryMessageAllowed` in `supabase/functions/_shared/verification.ts`. So
 * `sendDiscoveryMessage` is not a deployed operation being tested; it is a stand-in surface whose
 * only job is to put the shipped decision on a tested path, exactly as
 * `hasPlatformAcknowledgment` below is the hook a project-creation leaf must call. A green over
 * it says the DECISION is right. It says nothing about enforcement anywhere, because there is
 * nowhere yet to enforce it.
 */
export type AccountsSut = {
  /** AT-001.07's second clause: which types the PUBLIC signup surface offers. */
  publicSignupAccountTypes(): Promise<readonly string[]>;

  /* --- Supabase Auth's half. Not this leaf's code; it is what produces a session to complete. --- */

  /**
   * Register an auth user with an email and a password, and return the resulting session.
   *
   * ============================================================================================
   * IT STILL RETURNS A SESSION, AND THE LIVE STACK ISSUES NONE. THIS IS THE DECLARED DIVERGENCE.
   * ============================================================================================
   *
   * With `enable_confirmations = true` the live GoTrue issues NO session at signup: it creates the
   * user, sends the confirmation email, and answers with no tokens. This fixture mints one anyway,
   * because every body written before this leaf takes its session from here and rewriting them all
   * would be a change to nine green ids for no criterion's sake.
   *
   * SO REGISTRATION ISSUANCE IS NEVER LABELLED LIVE-BOUND, anywhere. `_fixture.ts`'s mirror section
   * binds SIGN-IN issuance — the live checks (a) and (b) measure a password grant and the
   * `auth.sessions` row it creates — and says of registration issuance only that it diverges. A
   * label claiming otherwise would be an untrue stated fact, and this paragraph is where the truth
   * is kept.
   *
   * WHAT THE NEW BODIES DO ABOUT IT: they narrow it. AT-001.12, .13, .14 and .38 all follow the
   * LIVE PUBLIC ORDER — register, use the emailed verification link, sign in, and only then play
   * the session and password games — so the registration-minted handle plays no part in any
   * assertion they make. The older bodies still use it, and AT-001.10's body relies on it
   * deliberately: it builds a completed-but-unverified account, which the live public path cannot
   * reach, because decision-8 makes verification the WRITE PATH's own floor rather than a property
   * borrowed from the session layer. The live-stack behaviour is measured in
   * `loop/items/AI4DEV-59/proof-local.ts` checks (a) and (c), and in this item's own proof.
   */
  registerWithEmailPassword(email: string, password: string): Promise<Session>;
  /**
   * A session Auth recorded as having come from an external provider.
   *
   * It performs NO handshake and fabricates no authorization code or token exchange: it is the state
   * Auth is in AFTER a consent round trip, which is the only part of the story any agent can reach.
   */
  registerWithProvider(provider: SessionProvider, email: string): Promise<Session>;
  /**
   * A GitHub OAuth signup, as Auth records it: a session established by GitHub whose account already
   * carries the linked GitHub identity — AT-001.02's "signs up via GitHub OAuth".
   *
   * Like `registerWithProvider` it performs NO handshake. It is `registerWithProvider('github', …)`
   * plus the fact that a GitHub signup necessarily links the GitHub identity it signed up with, and
   * it is a separate member rather than an argument because that second half is what AT-001.02's
   * "the GitHub identity is linked to it" clause is about.
   */
  registerWithGithub(email: string, githubHandle: string): Promise<Session>;
  /**
   * The state Auth is in after a `linkIdentity` round trip — AT-001.04's "linking completes signup".
   *
   * A LINKED IDENTITY IS NOT THE ESTABLISHING PROVIDER, and keeping the two apart is the point of
   * this member existing at all: an email- or Google-established volunteer links GitHub and their
   * session's `provider` does not change. The gate in
   * `supabase/functions/_shared/accounts.ts` reads the link; nothing shipped reads the provider.
   *
   * Same posture as every other Auth member here — no handshake, no fabricated authorization code.
   */
  linkGithubIdentity(session: Session, githubHandle: string): Promise<void>;
  /** Return sign-in with the same credentials — AT-001.01's final clause. */
  signInWithEmailPassword(email: string, password: string): Promise<SignInOutcome>;
  /**
   * The return visit through an external provider — AT-001.02's "a later sign-in via GitHub returns
   * to the same account".
   *
   * What it asserts is IDENTITY CONTINUITY, which is the half of that clause reachable without a
   * person: an existing user whose account carries that provider's identity signs in to the SAME
   * account rather than to a second one. The consent round trip itself is not performed and is named
   * unproved in the plan's per-id table.
   */
  signInWithProvider(provider: SessionProvider, email: string): Promise<SignInOutcome>;

  /* ----------------------------- Supabase Auth's session layer -------------------------------- */

  /**
   * End this session — the mirror of `POST /auth/v1/logout`, which deletes the `auth.sessions` row.
   *
   * IT ENDS ONE SESSION, NOT THE ACCOUNT'S ACCESS. That is the distinction AT-001.12's revocation
   * half turns on: after it, work under this handle is refused and the account is otherwise
   * untouched — a fresh sign-in works immediately, which is what makes re-authentication the
   * REMEDY rather than a coincidence.
   *
   * SO IT MIRRORS THE `?scope=local` SHAPE, AND THE VENDOR'S DEFAULT IS THE OTHER ONE. Measured on
   * the live stack and recorded in `loop/items/AI4DEV-60/proof-local.txt`: a plain
   * `POST /auth/v1/logout` carries the `global` scope and ends EVERY session the user holds. The
   * live counterpart of THIS member is therefore the scoped call, which is what check (c) makes —
   * with a sibling session as the control, so "this session ended" and "the account's access ended"
   * cannot be confused. No body in this suite asserts the difference: every one of them signs in
   * afresh after a sign-out, which both scopes permit.
   *
   * It returns nothing, and a handle Auth never issued THROWS rather than answering politely: a
   * body signing out a session that does not exist has a bug in the TEST, and a polite outcome
   * would let that bug read as a product refusal further down. Same posture as
   * `linkGithubIdentity`.
   */
  signOut(session: Session): Promise<void>;
  /**
   * Refresh a session — AT-001.13's act, and the whole point of it is what it does NOT take.
   *
   * NO CREDENTIALS PASS THROUGH THIS CALL, and that is structural rather than asserted: there is no
   * parameter for a password. On the live stack the refresh token does this, which is why a client
   * can keep a session alive while the user works and never ask them to sign in again.
   *
   * IT WORKS AFTER THE ACCESS TOKEN HAS EXPIRED, which is the mirror that matters — a refresh token
   * outliving the access token is the entire mechanism. It stops working once the session is
   * revoked, because revocation removes the session itself.
   *
   * IT EXTENDS THE SAME SESSION, and the returned handle carries the same `sessionId`. Whether the
   * live vendor extends the row or rotates it is MEASURED rather than assumed —
   * `loop/items/AI4DEV-60/proof-local.ts` check (d) reads `auth.sessions` before and after a real
   * refresh. If the vendor rotates, this mirror is corrected to the measurement.
   *
   * ROTATION OF THE REFRESH TOKEN AND THE REUSE INTERVAL ARE NOT MODELLED. No criterion reads
   * either, and modelling vendor semantics nothing asserts is how retired ground creeps back in.
   */
  refreshSession(session: Session): Promise<RefreshSessionOutcome>;
  /**
   * The account's live sessions — the mirror of reading `auth.sessions` with operator authority.
   *
   * "LIVE" MEANS NEITHER REVOKED NOR EXPIRED, so a session that has ended is absent rather than
   * present-and-flagged. That is what the read is for: AT-001.38's second clause is "no
   * authenticated session is created", and a refusal's own return value cannot show that nothing
   * was minted — only a count taken before and after can. Same reason `organizationsNamed` and
   * `discoveryMessagesBy` exist.
   *
   * IT IS AN OPERATOR'S READ, not a caller's, so it takes an account id rather than a session. No
   * product surface in this tree exposes it and none is implied by it.
   */
  sessionsOf(accountId: string): Promise<{ sessionId: string }[]>;

  /* --------------------------- Supabase Auth's password reset --------------------------------- */

  /**
   * Ask for a password reset — the mirror of `POST /auth/v1/recover`.
   *
   * IT ALWAYS SUCCEEDS, INCLUDING FOR AN ADDRESS NOBODY REGISTERED, and that is a security shape
   * rather than laziness: an answer that differed would tell an anonymous caller which addresses
   * hold accounts. REQ-001 spends AT-001.21 forbidding exactly that shape elsewhere, and the
   * sign-in refusal in this same fixture gives one reason for both of its branches for the same
   * reason. The live behaviour is measured — `loop/items/AI4DEV-60/proof-local.ts` check (e)
   * calls `/auth/v1/recover` for a never-registered address and captures the answer.
   *
   * A LINK IS EMAILED ONLY WHERE THERE IS A PASSWORD TO RESET: a registered email/password user.
   * A provider-established account has no password, so nothing is sent, and the answer is the same.
   */
  requestPasswordReset(email: string): Promise<{ ok: true }>;
  /**
   * The reset link emailed to this address, or `null` when none was emailed — the stand-in for the
   * message the local mail catcher holds on the live stack.
   *
   * `null` is a real answer rather than only the empty case: no reset was requested, or the address
   * has no password to reset.
   */
  emailedPasswordResetLink(email: string): Promise<string | null>;
  /**
   * Complete the emailed reset flow with a new password — AT-001.14's act.
   *
   * NO EXPIRY, NO SINGLE USE AND NO RESEND IS MODELLED OR ASSERTED. AT-001.15 is retired — the
   * acceptance file's own words are that "reset-link expiry/single-use semantics are not stated in
   * REQ-001" — so building any of them here would be asserting a criterion that was deliberately
   * withdrawn. The link is NOT cleared when it is used, exactly as a verification link is not.
   *
   * THE NEVER-ISSUED NEGATIVE IS NOT AT-001.15 GROUND, and the difference is worth being exact
   * about — it is the same difference `useVerificationLink` draws. It is not a claim about a link's
   * lifetime; it guards this test's own oracle. A link-shaped string that reset an account it never
   * belonged to would make "completing the emailed flow is what changes the password" mean nothing,
   * because any string would change anything.
   *
   * WHETHER A LIVE RESET REVOKES THE ACCOUNT'S OTHER SESSIONS IS NEITHER MODELLED NOR ASSERTED. No
   * criterion reads it, and `secure_password_change` sits false in `supabase/config.toml`.
   */
  completePasswordReset(link: string, newPassword: string): Promise<{ ok: boolean }>;

  /* ------------------------- Supabase Auth's verification state ------------------------------- */

  /**
   * Whether Supabase Auth reports this account's email address confirmed — AT-001.09's observable.
   *
   * IT IS DERIVED, NOT STORED-AND-READ. The adapter renders the account's stored Auth state as the
   * canonical GoTrue `/auth/v1/user` shape and judges the answer out of it with the SHIPPED
   * `emailVerifiedFromUser`. That is the same pattern `completeSignup` uses for the GitHub handle
   * (the GitHub leaf's gate-2 ruling R3), and it exists so the shipped extractor sits on the tested
   * path rather than being a function no test ever runs — which is exactly how the future Discovery
   * route will resolve the same fact from the same response.
   *
   * WHAT NO LOOP-TIER GREEN OVER IT PROVES: that the rendered shape is the shape GoTrue really
   * sends. Only `loop/items/AI4DEV-59/proof-local.ts` check (d) touches that, by feeding a real
   * response to the same shipped function.
   */
  emailVerified(accountId: string): Promise<boolean>;
  /**
   * The verification link emailed to this address, or `null` when none was emailed.
   *
   * `null` is a real answer rather than only the empty case: a provider registration is confirmed
   * by the provider and no confirmation email is sent for it.
   */
  emailedVerificationLink(email: string): Promise<string | null>;
  /**
   * Use a verification link. Using the link Auth emailed for an address confirms that address; a
   * link that was never issued returns `ok: false` and flips nothing.
   *
   * NO EXPIRY, NO SINGLE USE AND NO RESEND IS MODELLED OR ASSERTED. AT-001.11 is retired — the
   * acceptance file's own words are that "verification-link expiry/single-use/resend semantics are
   * not stated in REQ-001" — so building any of them here would be asserting a criterion that was
   * deliberately withdrawn.
   *
   * THE NEVER-ISSUED NEGATIVE IS NOT AT-001.11 GROUND, and the difference is worth being exact
   * about. It is not a claim about a link's lifetime; it guards this test's own oracle. A
   * link-shaped string that verified an account it never belonged to would make "using the emailed
   * link is what flips it" mean nothing at all, because any string would flip anything.
   */
  useVerificationLink(link: string): Promise<{ ok: boolean }>;

  /* ----------------------------------- the two product operations ----------------------------- */

  /**
   * `supabase/functions/complete-signup` — turns an authenticated auth user into a typed account.
   *
   * IT RESOLVES ITS CALLER FIRST, through the shipped `callerFromAuthAnswer`, exactly as the
   * deployed function does. An expired or revoked session therefore refuses BEFORE any product rule
   * is consulted and writes nothing — which is the shape AT-001.12 reads.
   */
  completeSignup(session: Session, request: CompleteSignupRequest, ip: string): Promise<CompleteSignupOutcome>;
  /**
   * `supabase/functions/create-organization` — the NGO-only action AT-001.06 drives, and the write
   * AT-001.12 uses as its stale-session oracle.
   *
   * IT IS AT-001.12'S WRITE FOR A REASON: no verification gate sits on it, so a refusal here is
   * unambiguously the session layer's rather than the Discovery floor's. It resolves its caller the
   * same way `completeSignup` does.
   */
  createOrganization(session: Session, organizationName: string): Promise<CreateOrganizationOutcome>;

  /**
   * `supabase/functions/update-organization` — THE ADMIN-ONLY NGO-SIDE ACTION, and the operation
   * AT-001.16 and AT-001.36 are both graded through.
   *
   * IT TAKES THE ORGANISATION AS AN ARGUMENT, which is what makes it usable as an isolation oracle:
   * one caller, three targets, three different answers. The same session renames the organisation it
   * administers, is refused in the organisation where it holds `member`, and is refused in an
   * organisation it holds no membership in — and the two refusals carry DIFFERENT kinds.
   *
   * WHAT A GREEN OVER IT CLAIMS, said narrowly because the criterion's words are wider. It claims
   * OPERATION-SURFACE isolation: authority does not cross organisations on this action. It does NOT
   * claim read isolation — "acting in NGO A never grants access to NGO B's data" over drafts,
   * ledgers and files is proved by the viewer-shaped reads and the organisation dashboard, not by
   * this rename. `org_memberships` is granted SELECT to `authenticated` and filtered by policy.
   */
  updateOrganization(session: Session, organizationId: string, name: string): Promise<UpdateOrganizationOutcome>;

  /* ------------------------------------ the operator's surface -------------------------------- */

  /**
   * Create an organisation WITH NO MEMBERSHIP ROW — an authority no product path holds, and the
   * reason it exists is exact.
   *
   * EVERY PRODUCT PATH SEATS ITS CREATOR AS ADMIN: `complete_signup` does it for an NGO signup and
   * `create_organization` does it for a second organisation. The single-seat invariant then refuses
   * a second membership row in that organisation. So the Given AT-001.16 and AT-001.36 both need —
   * one account holding DIFFERENT roles in two organisations — is unconstructible through product
   * paths alone, not because the product is wrong but because the product is right. This method
   * creates the unseated organisation the operator then seats the actor into as `member`, and mints
   * the third organisation AT-001.16's not-a-member arm targets.
   *
   * IT IS AN OPERATOR ACT, exactly as `provisionPlatformAdmin` is: a direct database operation, not
   * a service-role write, and no running service holds it. It THROWS on failure rather than
   * returning an outcome, because a Given that could not be provisioned is a bug in the TEST and a
   * polite refusal would read as a product answer three assertions later.
   */
  createOrganizationAsOperator(name: string): Promise<OrganizationRow>;

  /**
   * Grant a membership directly, as the operator — the provisioning act AND the refusal probe.
   *
   * IT IS BOTH, deliberately, and that is why it returns an outcome where
   * `createOrganizationAsOperator` throws. Two criteria read its REFUSALS as the thing under test:
   * AT-001.37 needs a direct grant to a volunteer account to be rejected on a path with no
   * TypeScript on it, and AT-001.17 needs a second seat in an already-seated organisation to be
   * rejected. Its successes are Givens; its refusals are evidence.
   *
   * NOTHING IN THE PRODUCT WRITES `'member'`, and that is by design rather than by omission — the
   * single-seat invariant forbids invites, so no product path can mint a second member. The
   * `member` half of the `org_role` enum exists for AT-001.36, and this is how that criterion's
   * Given is reached. The body that uses it says so in its own evidence.
   */
  grantMembershipAsOperator(organizationId: string, accountId: string, role: OrgRole): Promise<GrantMembershipOutcome>;

  /**
   * Re-point an organisation's EXISTING membership row at a different account, as the operator —
   * the refusal probe for the trigger's UPDATE half.
   *
   * THE ROLE IS NOT AN ARGUMENT, because the role is not what moves: the row keeps whatever role it
   * holds and only its account changes. That is exactly the attack the migration names in its own
   * prose — a row inserted for an NGO account and then re-keyed to a volunteer — and the read-back a
   * body makes afterwards is that the row still holds the ORIGINAL account with its ORIGINAL role.
   *
   * IT IS A REFUSAL PROBE AND NOTHING ELSE, so it returns an outcome rather than throwing: no Given
   * in this suite is reached by re-pointing a seat, and every body that calls it is asserting that
   * the database said no.
   */
  repointMembershipAsOperator(organizationId: string, accountId: string): Promise<RepointMembershipOutcome>;

  /**
   * Create a project, as the operator — a GIVEN, never an act under test.
   *
   * NO PRODUCT PATH CREATES A PROJECT, at either tier, and this method does not pretend otherwise.
   * AT-001.32's Given is "a project with an assigned volunteer", and the criterion is about the
   * SECOND volunteer; reaching that state needs a project, and building product project creation to
   * get one would be landing another requirement's surface early. It throws on failure, for the
   * reason `createOrganizationAsOperator` throws.
   */
  createProjectAsOperator(organizationId: string, name: string): Promise<ProjectRow>;

  /**
   * Attach a volunteer to a project, as the operator — the Given AND the refusal probe, exactly as
   * `grantMembershipAsOperator` is both.
   *
   * THE FIRST ATTACH IS THE GIVEN; THE SECOND IS THE ACT UNDER TEST. AT-001.32 says attaching a
   * second volunteer is rejected, and the path this method drives is the one with no product code on
   * it at all — which is what makes the refusal a property of the database rather than of a writer
   * somebody could change.
   */
  assignVolunteerAsOperator(projectId: string, accountId: string): Promise<AssignVolunteerOutcome>;

  /**
   * The project as it stands, or `null` when there is no such project — the read-back a refused
   * attach needs.
   *
   * IT RETURNS THE WHOLE ROW rather than the assigned id alone, and the difference is not cosmetic:
   * a bare `string | null` cannot tell "the seat is free" from "there is no such project", and a
   * body asserting the seat still holds the FIRST volunteer would then pass over a project that had
   * been deleted.
   */
  projectAssignment(projectId: string): Promise<ProjectRow | null>;

  /* --------------------------- the Discovery gate's stand-in surface -------------------------- */

  /**
   * Attempt to send a Discovery message — AT-001.10's action.
   *
   * THERE IS NO DEPLOYED ROUTE BEHIND THIS, at either tier. See the fourth kind in this type's own
   * header: the Discovery route is REQ-002/004's and does not exist, so this member is a stand-in
   * surface that exists to put the SHIPPED `discoveryMessageAllowed` on a tested path. At loop
   * tier the adapter derives the caller's verified fact through the shipped
   * `emailVerifiedFromUser`, consults the shipped gate, and refuses with the GATE's own reason.
   *
   * THE BODY IS AN OPAQUE STRING AND NOTHING ELSE. Recipients, threads, attachments and message
   * state are REQ-002/004's semantics; inventing any of them here to make this member look real
   * would be building another requirement's surface early. What AT-001.10 needs is an attempted
   * write and a way to see whether it happened, and one string supplies both.
   */
  sendDiscoveryMessage(session: Session, body: string): Promise<SendDiscoveryMessageOutcome>;
  /**
   * The Discovery message bodies this account has sent — read-back, and it is not optional.
   *
   * A BLOCK WHOSE WRITE HAPPENED ANYWAY IS NOT A BLOCK. The refusal's own return value cannot show
   * that nothing was written, for the same reason `organizationsNamed` exists: a refusal hands
   * back no identifier, so the row that must NOT be there can only be looked for by who would have
   * written it.
   */
  discoveryMessagesBy(accountId: string): Promise<string[]>;

  /* ------------------------------------------- read-back -------------------------------------- */

  account(accountId: string): Promise<AccountRow | null>;
  organization(organizationId: string): Promise<OrganizationRow | null>;
  membership(organizationId: string, accountId: string): Promise<MembershipRow | null>;
  acknowledgments(accountId: string): Promise<AcknowledgmentRow[]>;
  /**
   * The volunteer's imported GitHub profile, or `null` — AT-001.05's observable.
   *
   * `null` is a real and asserted answer, not merely the empty case: AT-001.05's pre-completion
   * negative reads it AFTER the identity is linked and BEFORE the signup completes, and requires
   * null there. That is what proves the population is CAUSED by completion rather than sitting in a
   * queue somewhere waiting to be drained.
   */
  volunteerProfile(accountId: string): Promise<VolunteerProfileRow | null>;

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

  /* ---- reads AS THE CALLER. The operator reads beside them are the existence control. ---- */

  organizationAsViewer(session: Session, organizationId: string): Promise<ViewerRead<OrganizationRow>>;
  membershipsAsViewer(session: Session, organizationId: string): Promise<ViewerRead<MembershipRow>>;
  projectAsViewer(session: Session, projectId: string): Promise<ViewerRead<ProjectRow>>;
  acknowledgmentsAsViewer(session: Session, accountId: string): Promise<ViewerRead<AcknowledgmentRow>>;
  organizationDashboard(session: Session, organizationId: string): Promise<TenantReadOutcome<OrganizationDashboard>>;
  projectWorkspace(session: Session, projectId: string): Promise<TenantReadOutcome<ProjectWorkspace>>;
  /** no session: a visitor has none */
  publicProjectPage(projectId: string): Promise<PublicProjectOutcome>;
  /** the live half of the guard, read as the operator */
  tenantTableFacts(): Promise<readonly TenantTableFacts[]>;
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
