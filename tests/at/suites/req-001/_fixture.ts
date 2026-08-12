/**
 * REQ-001's fixture adapter — STORAGE ONLY. Every judgement is the shipped module's.
 *
 * READ THIS BEFORE TRUSTING A GREEN FROM THIS SUITE, because the honest claim is narrower than
 * "REQ-001 works" and wider than what most acceptance adapters can say.
 *
 * `adapterDerivedCapability()` in `tests/at/harness/capabilities.ts` stamps every `sut.<key>` a
 * STAND-IN unconditionally, and the registry refuses a stand-in above the loop tier. So nothing here
 * can reach the integration-tier run that is the evidence gate. What a loop-tier green from this
 * suite means is exactly this:
 *
 *   - PROVED: the decisions in `supabase/functions/_shared/accounts.ts`,
 *     `supabase/functions/_shared/github.ts`, `supabase/functions/_shared/caller.ts` and
 *     `supabase/functions/_shared/verification.ts`
 *     behave as the thirteen acceptance criteria this suite lands require. THE FOUR MODULES DO NOT
 *     HAVE THE SAME STANDING, and saying they do would be an untrue stated fact: `accounts.ts`,
 *     `github.ts` and `caller.ts` are imported by the deployed edge functions, byte for byte the
 *     code that ships — `caller.ts` through `resolveCaller` in `edge.ts`, which every authenticated
 *     request at both functions passes through.
 *     `verification.ts` is imported by NO deployed function — it is the module the FUTURE Discovery
 *     send route must import, and today only this suite and
 *     `tests/at/harness/shipped-verification.selftest.ts` import it. That is decision D-D of the
 *     verification leaf's plan and not an oversight; the module's own header says so too.
 *     Every PRODUCT judgement below — every accept and every refusal about account types, the
 *     GitHub precondition, WHO IS CALLING, the verified fact and the Discovery floor — comes from
 *     those modules, and so does the onboarding import's content. THE ONE EXCEPTION is the
 *     fixture's own BOOKKEEPING precondition refusals: `sendDiscoveryMessage` and
 *     `createOrganization` refuse an account that never completed signup, which is this storage
 *     checking that the world it was handed exists rather than any shipped rule judging anything.
 *     There is no second copy of the product rules in this file, deliberately: the moment there is
 *     one, this suite is grading a puppet and the green is worth nothing. THAT INCLUDES THE
 *     FAIL-CLOSED RULE ITSELF — this file decides WHICH sessions are live, which is vendor
 *     bookkeeping, and `callerFromAuthAnswer` decides what a dead answer means, which is the
 *     shipped judgement. The two are never both written here.
 *   - NOT PROVED: that the migration is correct, that either edge function works, that row-level
 *     security denies what it should, that Supabase Auth is configured, or that Google or GitHub
 *     sign-in works. None of that is reachable from here — the storage below is a Map. The evidence
 *     for that half at THIS tree's head is `loop/items/AI4DEV-58/proof-local.txt`, produced against
 *     the live local stack on one machine and EXISTS: 9 checks, 8 passed, 0 failed, 1 skipped. It
 *     covers the migration, the GitHub gate, the imported profile, the database's own backstops
 *     against a caller who never met TypeScript, atomicity, and the provider configuration. THE
 *     SKIP IS THE GITHUB HANDSHAKE: no GitHub OAuth app exists for this project, so "GitHub
 *     sign-in works" is not proved by the live tier either. The GOOGLE HANDSHAKE is unproved for
 *     the same reason and was never re-attempted here — no Google credential was in the
 *     environment when the predecessor measured it and none is now. No amount of green anywhere in
 *     this suite proves either handshake. A reviewer cannot reproduce that transcript; it is one
 *     machine's word.
 *
 *     `loop/items/AI4DEV-57/proof-local.txt` is retained for the ONE thing only it still covers:
 *     `create-organization`, which was exercised there and is untouched by this leaf. Its
 *     completion-path and schema evidence is SUPERSEDED — it predates this migration and called a
 *     `complete_signup` that no longer exists.
 *
 * WHAT THE STORAGE HALF DOES MIRROR, because a stand-in that mirrors nothing tests nothing: one
 * account row per auth user (so "one account holds exactly one global type" is structural here as it
 * is in the schema, not a rule the adapter remembers), and completion is all-or-nothing (so a body
 * asserting no partial state is asserting the same shape the database's `complete_signup` function
 * guarantees). It mirrors the SHAPE; the database's own guarantee is proved on the live stack.
 *
 * ============================================================================================
 * THE VENDOR MIRRORS, EACH WITH WHAT BINDS IT — named one by one, and never in a blanket claim.
 * ============================================================================================
 *
 * A MIRROR IS NOT A PRODUCT JUDGEMENT, and keeping the two apart is what this section is for. The
 * PRODUCT judgements on these paths — whether an address is verified, whether an unverified caller
 * may send a Discovery message, and WHO IS CALLING — come from the shipped
 * `supabase/functions/_shared/verification.ts` and `supabase/functions/_shared/caller.ts` and from
 * nowhere else; there is no second copy of any of those rules in this file. What is left is a
 * prediction of what Supabase Auth DOES, and a prediction has to say what would prove it wrong.
 *
 * EVERY ENTRY BELOW CARRIES EITHER A LIVE CHECK OR AN EXPLICIT UNBOUND LABEL. A blanket "all of
 * these are live-bound" was the shape a gate-1 reviewer rejected, and correctly: it would let a
 * mirror nothing measures sit under a label claiming something does. Where a check binds only part
 * of a mirror, the label says which part.
 *
 * The first four are the verification leaf's. The session and reset mirrors follow, and the live
 * checks they name are this item's own — `loop/items/AI4DEV-60/proof-local.ts`.
 *
 *   1. AN EMAIL/PASSWORD REGISTRATION STARTS UNCONFIRMED AND AN EMAIL CARRYING A VERIFICATION
 *      LINK IS SENT.
 *      BOUND — checks (a) and (b) of `loop/items/AI4DEV-59/proof-local.ts` on the live stack: the
 *      signup's own wire response, `auth.users.email_confirmed_at IS NULL` read on the database,
 *      and the confirmation email held by the local mail catcher.
 *   2. A LINK THAT WAS NEVER ISSUED CONFIRMS NOTHING.
 *      BOUND — check (b2) of `loop/items/AI4DEV-59/proof-local.ts`, and by that check alone. It
 *      follows a TAMPERED variant of the real link — the token mutated, so a token GoTrue never
 *      issued — BEFORE the real link is followed, and reads `auth.users.email_confirmed_at` still
 *      NULL afterwards. This entry used to cite checks (a)-(d), which measure only the POSITIVE
 *      half; two blind reviewers found that overstatement independently, so the check that
 *      measures the negative was added rather than the label softened. Note what this is NOT: it
 *      is not a claim about expiry, single use or resend. The token followed was never minted, so
 *      no lifetime and no use count is in play. AT-001.11 is retired and none of those semantics
 *      is modelled here.
 *   3. USING THE EMAILED LINK SETS `email_confirmed_at`.
 *      BOUND — checks (b) and (d): the link is followed by HTTP GET and the column flips to
 *      non-null, after which the real `/auth/v1/user` response is fed to the SHIPPED
 *      `emailVerifiedFromUser`, which answers true.
 *   4. A PROVIDER REGISTRATION (Google, GitHub) STARTS CONFIRMED, because the provider vouched for
 *      the address.
 *      **UNBOUND, AND SAID PLAINLY.** No OAuth app or credential exists in this environment, so no
 *      live provider session is obtainable — the same recorded gap that leaves the OAuth handshake
 *      itself unproved at every tier, stated in this header since the predecessor item. This item
 *      binds it nowhere and claims nothing about it. NO TEST IN THIS SUITE READS A PROVIDER USER'S
 *      VERIFIED STATE: both verification bodies register by email and password. If the prediction
 *      is wrong — a real provider user arriving unconfirmed — the shipped gate FAILS CLOSED: it
 *      refuses that caller, never allows one. The mirror is bound by the first item that ships a
 *      real provider-path consumer, and not before.
 *
 *   5. SIGNING IN MINTS A SESSION, WHICH IS A ROW IN `auth.sessions` WITH AN ACCESS TOKEN THAT
 *      EXPIRES ONE HOUR LATER.
 *      BOUND FOR SIGN-IN, AND FOR SIGN-IN ONLY — checks (a) and (b) of
 *      `loop/items/AI4DEV-60/proof-local.ts`: a password grant with the correct password answers
 *      200 with tokens and the `auth.sessions` row exists; a wrong-password attempt adds NO row —
 *      measured as an unchanged session-id set across the refused attempt, one row already
 *      standing from the confirmation-link implicit-flow sign-in (the re-pin in
 *      `loop/items/AI4DEV-60/fix-rulings.md` ruling 1).
 *      The one hour is `jwt_expiry = 3600` at `supabase/config.toml` line 165, and the constant
 *      below cites that line.
 *      WHAT THIS ENTRY DOES NOT COVER, said plainly because the earlier draft of it overreached:
 *        - REGISTRATION issuance. This fixture mints a session at registration and the live stack
 *          with confirmations on mints none. That is the DECLARED DIVERGENCE, written out in
 *          `_contract.ts` on `registerWithEmailPassword`, and it is never labelled bound.
 *        - PROVIDER issuance (Google, GitHub). **UNBOUND** — no OAuth app or credential exists in
 *          this environment, the same recorded gap that leaves mirror 4 unbound. Nothing in this
 *          suite asserts a provider session's expiry, revocation or refresh.
 *        - ADMINISTRATOR issuance. **UNBOUND** — the recipe this repository records creates the
 *          user through `POST /auth/v1/admin/users`, which issues NO session at all; the handle
 *          `provisionPlatformAdmin` returns is this fixture's convenience so AT-001.07 has
 *          something to act with. Nothing asserts an administrator's session layer.
 *   6. LOGGING OUT ENDS THAT SESSION'S ACCESS BEFORE THE ACCESS TOKEN'S OWN EXPIRY.
 *      BOUND — check (c): `POST /auth/v1/logout?scope=local` with a live token, then the SAME
 *      access token at `/auth/v1/user` and at a DEPLOYED edge function, with the refusal code
 *      captured verbatim. This is the load-bearing vendor claim of AT-001.12's revocation half — a
 *      stateless reading of a JWT would say the token still works — so it is MEASURED and pinned
 *      rather than assumed.
 *      THE SCOPE IS NAMED BECAUSE THE VENDOR'S DEFAULT IS THE OTHER ONE. A plain logout, with no
 *      scope, ends EVERY session the user holds (`global`); this mirror models one session ending
 *      (`local`), and check (c) binds it with a sibling session standing as the control. Both
 *      answers are in `proof-local.txt`, and no acceptance body asserts the difference.
 *   7. AN ACCESS TOKEN STOPS WORKING AT ITS EXPIRY, AND A REFRESH RE-ESTABLISHES ACCESS WITHOUT
 *      CREDENTIALS, INCLUDING AFTER THAT EXPIRY.
 *      BOUND — check (d), against a transiently lowered `jwt_expiry`: the expired token is refused
 *      at `/auth/v1/user` and at the deployed function, then the same session's refresh token
 *      answers 200 with a fresh access token that works at both. The transient config change is
 *      restored inside the same check and `git diff` proves `supabase/config.toml` unchanged.
 *   8. A REFRESH EXTENDS THE SAME SESSION ROW RATHER THAN OPENING A NEW ONE.
 *      BOUND BY A PROBE — check (d) reads `auth.sessions` for the user with operator authority
 *      before and after the refresh and asserts the same row id, no new row. This entry exists
 *      because check (d)'s main body proves refreshed ACCESS and says nothing about the row; a
 *      gate-1 reviewer caught the gap. If the vendor rotates the row instead, the fail-and-re-pin
 *      protocol applies and `refreshSession` below is corrected to the measurement.
 *      NOT MODELLED AND NOT ASSERTED: refresh-token rotation and `refresh_token_reuse_interval`.
 *      No criterion reads either.
 *   9. ASKING FOR A PASSWORD RESET EMAILS A LINK, AND COMPLETING THAT LINK'S FLOW CHANGES THE
 *      PASSWORD.
 *      BOUND — check (e): a registered address gets a recovery email in the local catcher, the
 *      link's flow shape is MEASURED before anything is asserted (token-in-fragment and a PKCE code
 *      differ across CLI versions), the new password is set through the measured flow, the old
 *      password is then refused with the code check (a) pinned, and the new one answers 200.
 *  10. ASKING FOR A RESET ON AN ADDRESS NOBODY REGISTERED ANSWERS THE SAME WAY.
 *      BOUND BY A PROBE — check (e) calls `/auth/v1/recover` once for a never-registered address
 *      and captures the answer, expecting the same 200 no-existence-oracle shape. One HTTP call,
 *      added because the rest of check (e) exercises an EXISTING address only.
 *  11. A RESET LINK THAT WAS NEVER ISSUED CHANGES NOTHING.
 *      BOUND — check (e)'s tampered probe, and by that alone: a mutated variant of the real link
 *      is followed FIRST and the old password still signs in. Note what this is NOT — the token
 *      followed was never minted, so no lifetime and no use count is in play. AT-001.15 is retired
 *      and no expiry, single-use or resend semantics are modelled here.
 *
 * NOT MIRRORED AT ALL, and therefore asserted nowhere: `[auth.sessions]`'s timebox and inactivity
 * timeout. Both sit COMMENTED OUT in `supabase/config.toml` (lines 304-308), no criterion reads
 * them, and a mirror of a setting that is off would be a prediction about a configuration this
 * repository does not run.
 *
 * THE PROVISIONED PLATFORM ADMINISTRATOR STARTS CONFIRMED, and it is a mirror of a RECIPE rather
 * than of a live measurement. `provisionPlatformAdmin` below marks its auth user confirmed and
 * mints no verification link, because creating an administrator sends no email. The recipe it
 * mirrors is the only one this repository records: the predecessor item's live-proof script creates
 * that user through `POST /auth/v1/admin/users` with `email_confirm: true`. The earlier version of
 * this fixture let the administrator start UNCONFIRMED by reusing the public email path, which
 * contradicted that record.
 * WHAT BINDS IT: nothing yet, and that is said plainly. NOTHING READS AN ADMINISTRATOR'S VERIFIED
 * STATE — not AT-001.07, not anything else in this suite. The predecessor's transcript ran with
 * confirmations OFF, so it does not measure the column under this leaf's flip either. So this
 * mirror is labelled by its recipe and is never called live-bound; the first item that reads an
 * administrator's verified state is the one that binds it.
 *
 * AND THE DISCOVERY SEND SURFACE IS NOT A MIRROR AT ALL — it mirrors nothing, because there is
 * nothing to mirror. No Discovery route exists in this repository at either tier; it is
 * REQ-002/004's. `sendDiscoveryMessage` below is a stand-in surface whose whole job is to put the
 * shipped gate on a tested path. No green over it says anything about enforcement anywhere.
 */

import type { ControlledClock } from '../../harness/clock.ts';
import type { FixtureWorld, FixtureWorldStore } from '../../harness/fixtures.ts';
import {
  PLATFORM_ACKNOWLEDGMENT_KIND,
  PUBLIC_SIGNUP_ACCOUNT_TYPES,
  ngoOnlyActionAllowed,
  validateCompleteSignup,
  validateOrganizationName,
  type AccountType,
  type CompleteSignupRequest,
} from '../../../../supabase/functions/_shared/accounts.ts';
// THE SHIPPED CALLER JUDGEMENT — the ONE thing that decides whether a session's answer yields a
// caller, on every session-taking operation below. It is the same function `resolveCaller` calls in
// `edge.ts`, so a loop-tier green over an expired or revoked session grades byte for byte the code
// both deployed functions run on every authenticated request. This file decides WHICH sessions are
// live, which is vendor bookkeeping; it never decides what a dead answer means.
import { callerFromAuthAnswer, type Caller } from '../../../../supabase/functions/_shared/caller.ts';
// THE SHIPPED PER-ORGANISATION ROLE JUDGEMENT — the ONE thing that decides whether an admin-only
// NGO-side action is permitted in the target organisation. `update-organization` imports the same
// function, so a loop-tier green over AT-001.16 and AT-001.36 grades the code that ships. This file
// supplies the membership ROW it judges, which is storage; it never decides what a role means.
import { orgAdminActionAllowed } from '../../../../supabase/functions/_shared/memberships.ts';
// THE SHIPPED IMPORT STUB. The IMPORT SOURCE is the shipped stub, not a copy living in this file —
// AT-001.05 compares the profile it reads back against `stubGithubStatsFor`, so if the two were
// separate implementations the test would grade the fixture's copy and say nothing about what the
// edge function writes.
//
// `extractGithubHandle` USED TO BE IMPORTED HERE TOO and is not any more, and that is a narrowing
// rather than a loss. It is still on the tested path — `callerFromAuthAnswer` calls it, on the
// whole rendered response, exactly as the deployed edge does — so the caller fact is derived by
// one shipped chain instead of being assembled here from two. A regression in the extractor still
// fails this suite, and it now fails it at the same place it would fail a deployed request.
import { stubGithubStatsFor } from '../../../../supabase/functions/_shared/github.ts';
// BOTH shipped verification judgements, for the same reason both GitHub ones are imported above.
// `emailVerifiedFromUser` is how the verified fact is DERIVED from the rendered GoTrue user shape
// on every read — never read straight off storage — and `discoveryMessageAllowed` is the ONLY thing
// that decides whether a Discovery send is refused. Between them there is no rule about
// verification left in this file to drift.
import {
  discoveryMessageAllowed,
  emailVerifiedFromUser,
} from '../../../../supabase/functions/_shared/verification.ts';
// THE SHIPPED TENANT-READ JUDGEMENT — the ONE thing that decides whether a caller may read an
// organisation's or a project's non-public data, and the ONE refusal a denied read answers with. The
// three deployed read functions import the same three names, so a loop-tier green over AT-001.21 and
// AT-001.22 grades the code that ships. This file supplies the ROWS it judges, which is storage; it
// never decides what a role or a seat means.
import {
  TENANT_NOT_FOUND,
  publicProjectView,
  tenantReadAllowed,
} from '../../../../supabase/functions/_shared/visibility.ts';
import type {
  AccountRow,
  AccountsSut,
  AcknowledgmentRow,
  AssignVolunteerOutcome,
  CatalogTable,
  CompleteSignupOutcome,
  CreateOrganizationOutcome,
  DataApiReadOutcome,
  GrantMembershipOutcome,
  MembershipRow,
  OrganizationDashboardOutcome,
  OrganizationRow,
  ProjectRow,
  ProjectWorkspaceOutcome,
  PublicProjectPageOutcome,
  RefreshSessionOutcome,
  RepointMembershipOutcome,
  SendDiscoveryMessageOutcome,
  Session,
  SessionProvider,
  SignInOutcome,
  TenantReadStore,
  UpdateOrganizationOutcome,
  VolunteerProfileRow,
  World,
} from './_contract.ts';

/**
 * WHICH REQUIREMENT THIS ADAPTER IS, declared by the adapter itself.
 *
 * `harness/suite-adapters.ts` constrains its map entry to match this literal, and `loadAdapter()` in
 * `harness/index.ts` re-checks it against the requirement it was asked for. Without it the
 * type-check could describe one suite while the run drove another.
 */
export const requirement = 'req-001' as const;

interface AdapterOptions {
  /**
   * The harness's controlled clock — READ, not merely accepted.
   *
   * The harness has always handed it to this adapter and this adapter used to ignore it, which was
   * honest while nothing here had a lifetime. Sessions have one, so `clock.now()` is what stamps a
   * session's expiry at issuance and what decides at every validation whether it has passed. A body
   * that advances the clock therefore changes what this fixture answers, which is exactly what
   * AT-001.12 and AT-001.13 need.
   */
  clock: ControlledClock;
  worlds: FixtureWorldStore;
}

/** An auth user as Supabase Auth holds one: credentials and the provider that established them. */
interface AuthUser {
  id: string;
  email: string;
  password: string | null;
  provider: SessionProvider;
  /**
   * The handle of a LINKED GitHub identity, or null — Auth's `identities[]` narrowed to the one
   * field anything here reads.
   *
   * It is stored on the auth user and NOT on the session, which is the whole reason the gate is a
   * caller fact: linking happens after a session exists, changes nothing about how that session was
   * established, and is a property of the user Auth answers for.
   */
  githubHandle: string | null;
  /**
   * GoTrue's `email_confirmed_at`, or null while the address is unconfirmed — vendor mirror 1 and
   * 4 in this file's header.
   *
   * IT IS STORED AS THE VENDOR'S OWN FIELD VALUE, a nullable instant, and never as a boolean. The
   * shipped `emailVerifiedFromUser` is what turns it into an answer, and it does so from the
   * rendered `/auth/v1/user` shape rather than from this field directly. Storing a boolean here
   * would put the judgement in storage, which is the one thing this file's opening paragraph
   * promises it does not do.
   */
  emailConfirmedAt: string | null;
  /**
   * The verification link Auth emailed for this address, or null when no confirmation email was
   * sent — the fixture's stand-in for the message the local mail catcher holds on the live stack.
   *
   * IT IS NOT CLEARED WHEN IT IS USED, deliberately. Clearing it would model SINGLE USE, and
   * single-use semantics are retired AT-001.11's — "not stated in REQ-001". The fixture models
   * what the criterion states and no more.
   */
  verificationLink: string | null;
  /**
   * The password-reset link Auth emailed for this address, or null when none was emailed — the
   * fixture's stand-in for the recovery message the local mail catcher holds on the live stack.
   *
   * IT IS NOT CLEARED WHEN IT IS USED, deliberately and for the same reason `verificationLink` is
   * not: clearing it would model SINGLE USE, and single-use semantics are retired AT-001.15's —
   * "not stated in REQ-001". The fixture models what the criterion states and no more.
   */
  passwordResetLink: string | null;
}

/**
 * One row of `auth.sessions`, reduced to the three facts anything here reads.
 *
 * IT IS A ROW, NOT A TOKEN. There is no JWT, no signature and no expiry claim to parse; the
 * validity of a session is looked up, exactly as GoTrue looks it up when `/auth/v1/user` is asked
 * about a token. What a real token does is measured on the live stack, never here.
 */
interface StoredSession {
  userId: string;
  /**
   * When this session's access stops working, in milliseconds on the harness clock — the mirror of
   * `jwt_expiry`.
   *
   * A REFRESH MOVES THIS VALUE AND NOTHING ELSE, which is what makes `refreshSession` an extension
   * of one session rather than the opening of another.
   */
  expiresAtMs: number;
  /**
   * Whether `signOut` ended this session — the mirror of `POST /auth/v1/logout` deleting the row.
   *
   * A FLAG RATHER THAN A DELETE, so that a revoked session is told apart from one that never
   * existed while the code is being read. Neither is a caller, so nothing observable turns on the
   * difference.
   */
  revoked: boolean;
}

interface StoredAcknowledgment extends AcknowledgmentRow {}

interface State {
  authUsers: Map<string, AuthUser>;
  /** email -> auth user id, because sign-in arrives with an address rather than an id */
  byEmail: Map<string, string>;
  /**
   * verification link -> auth user id, because a link arrives on its own with no address beside it
   * — which is exactly the situation on the live stack, where the link is followed from an inbox.
   *
   * A link this map does not hold was never issued, and confirms nothing.
   */
  byVerificationLink: Map<string, string>;
  /**
   * reset link -> auth user id, for the reason `byVerificationLink` gives: a link arrives on its
   * own with no address beside it, which is the situation on the live stack where it is followed
   * from an inbox.
   *
   * A link this map does not hold was never issued, and resets nothing.
   */
  byPasswordResetLink: Map<string, string>;
  /**
   * session id -> the session row — the mirror of `auth.sessions`.
   *
   * KEYED BY SESSION, NOT BY ACCOUNT, because one account holds many at once. AT-001.13's whole
   * discriminator is two sessions of one account ending at different instants, and a store keyed by
   * account could not hold that state at all.
   */
  sessions: Map<string, StoredSession>;
  accounts: Map<string, AccountRow>;
  organizations: Map<string, OrganizationRow>;
  /** `${organizationId}:${accountId}` -> row */
  memberships: Map<string, MembershipRow>;
  /** project id -> row, mirroring `public.projects`'s primary key */
  projects: Map<string, ProjectRow>;
  acknowledgments: StoredAcknowledgment[];
  /** account id -> the imported volunteer profile, mirroring `public.volunteer_profiles`'s primary key */
  volunteerProfiles: Map<string, VolunteerProfileRow>;
  /**
   * account id -> the Discovery message bodies that account has sent.
   *
   * There is NO table behind this and no route that writes one; see the header's closing paragraph.
   * It exists so AT-001.10 can assert that a refused send wrote NOTHING, which the refusal's own
   * return value cannot show.
   */
  discoveryMessages: Map<string, string[]>;
  /**
   * THE STORES WHOSE NEXT READ MUST FAIL — the loop tier's only fault seam, and the proof of the
   * read-ordering half of the no-existence-oracle property (gate-1 ruling 4).
   *
   * A store in this set makes the next read of it fail ONCE and removes itself, so a body arms one
   * fault per call rather than poisoning the world. It is cleared in `teardown` with everything else:
   * a fault surviving into the next id would look exactly like an outage the product caused.
   *
   * THERE IS NO COUNTERPART AT THE INTEGRATION TIER. `_live.ts` does not back `failNextReadOf`, so an
   * integration body reaching for it refuses by name rather than faulting a real database.
   */
  readFaults: Set<TenantReadStore>;
  nextId: number;
}

function membershipKey(organizationId: string, accountId: string): string {
  return `${organizationId}:${accountId}`;
}

function clone<T>(value: T): T {
  return structuredClone(value);
}

class AccountsFixtureWorld implements World {
  constructor(
    private readonly base: FixtureWorld,
    private readonly serial: number,
  ) {}

  email(local: string): string {
    return `${local}+w${this.serial}@example.test`;
  }

  async teardown(): Promise<void> {
    await this.base.teardown();
  }
}

export function createFixtureAdapter({ clock, worlds }: AdapterOptions) {
  const state: State = {
    authUsers: new Map(),
    byEmail: new Map(),
    byVerificationLink: new Map(),
    byPasswordResetLink: new Map(),
    sessions: new Map(),
    accounts: new Map(),
    organizations: new Map(),
    memberships: new Map(),
    projects: new Map(),
    acknowledgments: [],
    volunteerProfiles: new Map(),
    discoveryMessages: new Map(),
    readFaults: new Set(),
    nextId: 1,
  };
  const openedWorlds = new Set<AccountsFixtureWorld>();
  let worldSerial = 0;

  const nextId = (prefix: string): string => `${prefix}-${state.nextId++}`;

  /**
   * The instant a confirmation is recorded at.
   *
   * Fixed rather than read from a clock, for the same reason the acknowledgment's instant is: no
   * criterion here depends on WHICH instant, only on whether one is present, and a real timestamp
   * would make the capture non-deterministic for no gain. The shipped `emailVerifiedFromUser`
   * judges presence and never parses the value, so this is the whole of what the field has to be.
   */
  const CONFIRMED_AT = '2026-01-01T00:00:00.000Z';

  /**
   * How long a session's access lasts — VENDOR MIRROR 5, and the number is the configuration's.
   *
   * `jwt_expiry = 3600` sits at `supabase/config.toml` line 165, in seconds; this is that value in
   * milliseconds, because the harness clock counts milliseconds. It is written as the arithmetic
   * rather than as `3_600_000` so that a reader can see the config value inside it, and so that
   * changing the configuration is a one-line change here with the citation beside it.
   *
   * NOTHING ELSE ABOUT THE TOKEN'S LIFETIME IS MODELLED. `[auth.sessions]`'s timebox and inactivity
   * timeout are commented out in that file (lines 304-308) and no criterion reads them.
   */
  const ACCESS_TOKEN_TTL_MS = 3600 * 1000;

  /**
   * Mint a session — VENDOR MIRROR 5. One `auth.sessions` row, expiring one hour from now.
   *
   * `now` IS THE HARNESS CLOCK, which is what makes expiry reachable from a test body: a body that
   * advances the clock past this instant makes the session dead, and no other lever does.
   *
   * THE PROVIDER IS AN ARGUMENT rather than being read off the user, because `signInWithProvider`
   * records the provider that established THIS session, which need not be the one that created the
   * user — a GitHub identity linked later signs the user in through GitHub.
   */
  const issueSession = (user: AuthUser, provider: SessionProvider = user.provider): Session => {
    const sessionId = nextId('session');
    state.sessions.set(sessionId, {
      userId: user.id,
      expiresAtMs: clock.now() + ACCESS_TOKEN_TTL_MS,
      revoked: false,
    });
    return { accountId: user.id, email: user.email, provider, sessionId };
  };

  const register = (
    email: string,
    password: string | null,
    provider: SessionProvider,
    githubHandle: string | null = null,
    /**
     * Whether the CREATOR already confirmed the address, which only an operator can do.
     *
     * It exists for `provisionPlatformAdmin` and for nothing else. See the header: the recipe this
     * repository records creates an administrator through `POST /auth/v1/admin/users` with
     * `email_confirm: true`, so that user never receives a confirmation email and never has a link.
     */
    confirmedByTheCreator = false,
  ): Session => {
    // Supabase Auth's own uniqueness, mirrored: a second registration on one address is not a new
    // user. Left out, a body could accidentally create two auth users for one address and then read
    // back "one account per user" from a situation the real system cannot be in.
    const existing = state.byEmail.get(email);
    if (existing) throw new Error(`fixture: ${email} is already registered — Supabase Auth would refuse this`);

    // VENDOR MIRRORS 1 AND 4, and the header names what binds each. A public email/password
    // registration starts UNCONFIRMED and Auth emails a confirmation link. A registration a
    // provider vouched for, and one an operator created with the address already confirmed, both
    // start CONFIRMED and receive no confirmation email, so neither has a link. The provider half
    // is declared UNBOUND in the header — no OAuth credential exists here — and nothing in this
    // suite reads a provider user's verified state.
    const id = nextId('user');
    const confirmedAtCreation = provider !== 'email' || confirmedByTheCreator;
    const emailConfirmedAt = confirmedAtCreation ? CONFIRMED_AT : null;
    // Derived from the user id rather than from a second counter, so the link is unique by
    // construction and a link read in a failure message says which user it belongs to.
    const verificationLink = confirmedAtCreation ? null : `verify-${id}`;

    const user: AuthUser = {
      id,
      email,
      password,
      provider,
      githubHandle,
      emailConfirmedAt,
      verificationLink,
      passwordResetLink: null,
    };
    state.authUsers.set(user.id, user);
    state.byEmail.set(email, user.id);
    if (verificationLink !== null) state.byVerificationLink.set(verificationLink, user.id);
    // A SESSION AT REGISTRATION IS THE DECLARED DIVERGENCE, not a bound mirror. The live stack with
    // confirmations on issues none; this mints one because every body written before this leaf
    // takes its session from here. `_contract.ts`'s `registerWithEmailPassword` paragraph is where
    // that divergence is written out, and the header's mirror 5 binds SIGN-IN issuance only.
    return issueSession(user);
  };

  /**
   * The stored auth state rendered as the canonical GoTrue `/auth/v1/user` response shape.
   *
   * ONE RENDERER FOR EVERY SHIPPED READER OF THIS SHAPE. `callerFromAuthAnswer` reads `id` and,
   * through `extractGithubHandle`, `identities[]`; `emailVerifiedFromUser` reads
   * `email_confirmed_at`. All of them read off the SAME object here — which is the point: on the
   * live stack they read one response body, so rendering two different shapes for them would be a
   * divergence this suite could never notice.
   *
   * WHAT IS STILL NOT PROVED by anything that calls this: that this shape is the shape GoTrue really
   * sends. That is a prediction of the vendor. The live proof is what binds it.
   */
  const renderAuthUser = (user: AuthUser): Record<string, unknown> => ({
    id: user.id,
    email: user.email,
    email_confirmed_at: user.emailConfirmedAt,
    identities:
      user.githubHandle === null
        ? []
        : [{ provider: 'github', identity_data: { user_name: user.githubHandle } }],
  });

  /**
   * Whether this session row is one Auth would still answer for — known, not revoked, not expired.
   *
   * IT IS VENDOR BOOKKEEPING AND NOTHING ELSE. It decides WHICH sessions are live, which is a
   * prediction about Supabase Auth (mirrors 5 to 8 in the header, each with what binds it). It does
   * NOT decide what a dead session means for a caller — that is the shipped judgement, one function
   * below, and the two are deliberately never written in the same place.
   *
   * EXPIRY IS STRICT: at exactly `expiresAtMs` the session is already dead. AT-001.12's body is the
   * oracle for that boundary — it advances the clock by EXACTLY the one-hour TTL and requires the
   * write to be refused, so turning this `<` into an inclusive `<=` fails there. Before that
   * advance was pinned to the boundary instant, the inclusive mutation was an off-by-one no test
   * body could see.
   */
  const sessionIsLive = (stored: StoredSession | undefined): stored is StoredSession =>
    stored !== undefined && !stored.revoked && clock.now() < stored.expiresAtMs;

  /**
   * WHO IS CALLING — resolved exactly as the deployed edge functions resolve it, on every
   * session-taking operation in this file.
   *
   * THE TWO HALVES, AND WHY THE SPLIT IS THE WHOLE POINT. This function renders what Supabase Auth
   * WOULD ANSWER for the handle it was given: a live session renders the canonical `/auth/v1/user`
   * shape with status 200, and anything else — an unknown handle, a revoked session, an expired one
   * — renders status 401 with no user. Then the SHIPPED `callerFromAuthAnswer` judges that answer.
   * So the rendering is this fixture's vendor mirror, and the verdict is byte for byte the code
   * `resolveCaller` runs at the deployed edge. There is no second copy of the fail-closed rule in
   * this file: a null caller here is null because the shipped module said so.
   *
   * THE 401'S BODY IS NOT MODELLED, and `null` is passed rather than an invented error shape. The
   * shipped judgement never reads the body of a non-2xx — the status decides — so rendering
   * GoTrue's error object here would be a prediction about the vendor that nothing in this suite
   * reads and no live check binds. The real refusal bodies ARE captured, verbatim, in
   * `loop/items/AI4DEV-60/proof-local.ts` checks (c) and (d).
   *
   * THE WHOLE RENDERED USER IS HANDED OVER, never a narrowed piece of it — the same discipline
   * `edge.ts` is now under. `callerFromAuthAnswer` reads `identities[]` to find the linked GitHub
   * handle, so pre-selecting fields here would silently strip every linked volunteer's handle.
   */
  const resolveCaller = (session: Session): Caller | null => {
    const stored = state.sessions.get(session.sessionId);
    const user = sessionIsLive(stored) ? state.authUsers.get(stored.userId) : undefined;
    return user === undefined
      ? callerFromAuthAnswer(401, null)
      : callerFromAuthAnswer(200, renderAuthUser(user));
  };

  /**
   * What a refused caller is told — FIXTURE BOOKKEEPING WORDING, and no body matches it.
   *
   * AT-001.12's criterion is that "the next request requires re-authentication", and this sentence
   * says that in words. It is deliberately NOT asserted verbatim anywhere: the criterion is about
   * the refusal and about the write not happening, and pinning a sentence would make a reword of
   * this file fail a test that is supposed to be about the session layer. The refusals a body DOES
   * match on are the shipped modules' own, which is the opposite case.
   */
  const DEAD_SESSION_REASON = 'this session is no longer valid — sign in again';

  /**
   * Which providers can sign this user back in — Auth's `identities[]`, reduced to what AT-001.02
   * asks about.
   *
   * A GitHub signup and a later GitHub LINK produce the same answer here, deliberately: after either,
   * the account carries a GitHub identity, and "a later sign-in via GitHub returns to the same
   * account" is a statement about the identity, not about which provider happened to create the user.
   */
  const reachableThroughProvider = (user: AuthUser, provider: SessionProvider): boolean =>
    provider === 'github' ? user.githubHandle !== null : user.provider === provider;

  /**
   * The `complete-signup` operation, at the loop tier.
   *
   * EVERY DECISION ON THIS PATH COMES FROM THE SHIPPED MODULE. What is left here is the four writes,
   * performed together or not at all — which is the shape `public.complete_signup` guarantees inside
   * one transaction on the real database, and which step 7 of the plan proves there.
   */
  const completeSignup = async (
    session: Session,
    request: CompleteSignupRequest,
    ip: string,
  ): Promise<CompleteSignupOutcome> => {
    // WHO IS CALLING, FIRST AND THROUGH THE SHIPPED JUDGEMENT — before any product rule is
    // consulted, exactly as the deployed function does it. An expired or revoked session yields no
    // caller and this returns here, having written nothing, which is the shape AT-001.12 reads.
    //
    // THE CALLER FACT COMES FROM AUTH'S ANSWER, never from the request. A client cannot assert it
    // in either place, which is the whole security property of the volunteer gate. It is DERIVED,
    // not read: the stored state is rendered as the canonical GoTrue `/auth/v1/user` shape and
    // `callerFromAuthAnswer` judges the whole of it — the id and, through `extractGithubHandle`
    // inside that module, the linked handle. Reading `authUser.githubHandle` straight, as this file
    // once did, pre-narrowed the fact and left the shipped extractor unexecuted by any test.
    //
    // What is still NOT proved here is GoTrue's real serialisation — that this shape is the shape
    // Auth sends. Only the live proof touches that.
    const caller = resolveCaller(session);
    if (caller === null) return { ok: false, reason: DEAD_SESSION_REASON };

    const decision = validateCompleteSignup(request, { githubHandle: caller.githubHandle });
    if (!decision.ok) return { ok: false, reason: decision.reason };
    const {
      accountType,
      organizationName,
      acknowledgmentTextVersion,
      githubHandle,
      signerName,
      signerTitle,
      authorityAttestation,
    } = decision.value;

    // ONE ROW PER AUTH USER is what makes "one account holds exactly one global type" structural
    // rather than remembered — the schema states it as a primary key, and this states it as a
    // refusal at the same point.
    //
    // THE ID IS THE CALLER'S, not the handle's. They are the same value, and taking it from the
    // answer Auth gave rather than from the handle the client passed is the same posture the
    // deployed function has — there, the two are genuinely different sources.
    if (state.accounts.has(caller.id)) {
      return { ok: false, reason: 'this account has already completed signup — one account holds exactly one global type' };
    }

    const account: AccountRow = { id: caller.id, accountType };
    let organization: OrganizationRow | null = null;
    let membership: MembershipRow | null = null;

    if (organizationName !== null) {
      organization = { id: nextId('org'), name: organizationName };
      membership = { organizationId: organization.id, accountId: account.id, role: 'admin' };
    }

    // THE ONBOARDING IMPORT, COMPUTED HERE AND WRITTEN BELOW WITH EVERYTHING ELSE — which is the
    // shape `public.complete_signup` guarantees inside one transaction on the real database. There
    // is no queue and no deferred job: a volunteer completion either lands the account AND the
    // populated profile, or lands nothing. AT-001.05's "a queued-but-empty import fails this test"
    // is unrepresentable rather than merely untested.
    let volunteerProfile: VolunteerProfileRow | null = null;
    if (githubHandle !== null) {
      const stats = stubGithubStatsFor(githubHandle);
      volunteerProfile = {
        accountId: caller.id,
        githubHandle,
        topLanguages: stats.topLanguages,
        repositoryCount: stats.repositoryCount,
        contributionSummary: stats.contributionSummary,
        // Fixed rather than read from a clock, for the same reason the acknowledgment's instant is:
        // nothing in these criteria depends on WHICH instant, and the live-stack proof reads the
        // database's own `now()`.
        importedAt: '2026-01-01T00:00:00.000Z',
      };
    }

    const acknowledgment: StoredAcknowledgment = {
      accountId: account.id,
      kind: PLATFORM_ACKNOWLEDGMENT_KIND,
      // Fixed rather than read from a clock: nothing in this leaf's four criteria depends on WHICH
      // instant it is, only that one is recorded, and a real timestamp would make the capture
      // non-deterministic for no gain. The live-stack proof reads `now()` from the database.
      acknowledgedAt: '2026-01-01T00:00:00.000Z',
      ip,
      textVersion: acknowledgmentTextVersion,
      // WHO SIGNED — AT-001.19, and taken from `decision.value` rather than from `request`. The
      // shipped module trimmed them and pinned the attestation to the shipped statement, so this
      // row holds what the decision was made on, exactly as the deployed function's row does.
      signerName,
      signerTitle,
      authorityAttestation,
    };

    // All of them, together. Nothing above this line has mutated `state`.
    state.accounts.set(account.id, account);
    if (organization) state.organizations.set(organization.id, organization);
    if (membership) state.memberships.set(membershipKey(membership.organizationId, membership.accountId), membership);
    if (volunteerProfile) state.volunteerProfiles.set(volunteerProfile.accountId, volunteerProfile);
    state.acknowledgments.push(acknowledgment);

    return { ok: true, accountId: account.id, organizationId: organization?.id ?? null };
  };

  /* ------------------------------------------------------- the three tenant-read surfaces' storage */

  /**
   * ONE STORAGE READ, AND THE FAULT THAT CAN MAKE IT FAIL.
   *
   * Every read the three read surfaces make goes through here, which is what lets a body arm a fault
   * against a NAMED store and see the answer change. The fault is ONE-SHOT: it is consumed by the
   * read it fails, so one `failNextReadOf` call fails one read.
   */
  const readStore = <T>(store: TenantReadStore, read: () => T): { ok: true; value: T } | { ok: false } =>
    state.readFaults.delete(store) ? { ok: false } : { ok: true, value: read() };

  /**
   * THE REFUSAL, AND IT IS THE SHIPPED CONSTANT — never a shape this file chose.
   *
   * `TENANT_NOT_FOUND` is what the deployed functions return for BOTH "no such row" and "exists, and
   * is not yours". Restating it here would give the loop tier a second refusal to drift from the one
   * that ships, which is the whole property AT-001.21 is about.
   */
  const tenantNotFound = () => ({ ok: false as const, status: TENANT_NOT_FOUND.status, body: clone(TENANT_NOT_FOUND.body) });

  /**
   * AN OUTAGE, AND THE SENTENCE NAMES NO IDENTIFIER.
   *
   * That is the half of the no-oracle property the fault arm measures: two faulted reads must be
   * indistinguishable, and a reason quoting the organisation or project id would make them
   * distinguishable while looking helpful. The deployed functions answer the same shape and say the
   * same thing about it.
   */
  const tenantReadFailed = (surface: string) => ({
    ok: false as const,
    status: 502,
    body: { ok: false, reason: `${surface} could not read what it needs, so no decision was made` },
  });

  /** A dead session at a read surface — the session layer refusing, before any tenant rule is consulted. */
  const tenantUnauthenticated = () => ({ ok: false as const, status: 401, body: { ok: false, reason: DEAD_SESSION_REASON } });

  const sut: AccountsSut = {
    // Read straight off the shipped constant. A literal here would be a second statement of the same
    // fact, and AT-001.07 would then be asserting what this file says rather than what ships.
    publicSignupAccountTypes: async () => [...PUBLIC_SIGNUP_ACCOUNT_TYPES],

    registerWithEmailPassword: async (email, password) => register(email, password, 'email'),
    registerWithProvider: async (provider, email) => register(email, null, provider),
    // A GitHub signup links the GitHub identity it signed up with — that is what makes it a GitHub
    // signup rather than a session that merely says 'github'. Both halves are recorded here in one
    // step because Auth performs them in one round trip.
    registerWithGithub: async (email, githubHandle) => register(email, null, 'github', githubHandle),

    linkGithubIdentity: async (session, githubHandle) => {
      // THE SAME UNIFORM VALIDATION every session-taking operation uses, through the shipped
      // judgement — a dead session links nothing. It THROWS rather than refusing politely, because
      // this member returns nothing and has no refusal to return: a body linking an identity under
      // a session Auth would not answer for has a bug in the TEST, and a silent no-op would let
      // that bug read as a product refusal further down. A throw writes nothing either way, which
      // is the property that matters.
      const caller = resolveCaller(session);
      if (caller === null) {
        throw new Error(`fixture: session ${session.sessionId} is not one Auth would answer for — nothing to link an identity to`);
      }
      const user = state.authUsers.get(caller.id);
      if (!user) throw new Error(`fixture: no auth user ${caller.id} to link a GitHub identity to`);
      user.githubHandle = githubHandle;
    },

    signInWithEmailPassword: async (email, password): Promise<SignInOutcome> => {
      const userId = state.byEmail.get(email);
      const user = userId ? state.authUsers.get(userId) : undefined;
      // One reason for both branches: telling "no such account" apart from "wrong password" is an
      // existence oracle, and REQ-001 spends AT-001.21 forbidding exactly that shape elsewhere.
      if (!user || user.password === null || user.password !== password) {
        return { ok: false, reason: 'the email or password is incorrect' };
      }
      // VENDOR MIRROR 5, AND THIS IS THE HALF THE LIVE CHECKS BIND: a successful password grant
      // mints a session. A REFUSED one mints none — which is AT-001.38's second clause, and it is
      // structural here rather than remembered, because the only call to `issueSession` on this
      // path sits after the refusal above.
      return { ok: true, session: issueSession(user) };
    },

    signInWithProvider: async (provider, email): Promise<SignInOutcome> => {
      const userId = state.byEmail.get(email);
      const user = userId ? state.authUsers.get(userId) : undefined;
      // One reason again, for the AT-001.21 reason above: "no such account" and "that provider is
      // not linked to it" must not be distinguishable to a caller.
      if (!user || !reachableThroughProvider(user, provider)) {
        return { ok: false, reason: `no account of this address is reachable through ${provider}` };
      }
      // THE SAME ACCOUNT, which is the clause under test. The id comes from the stored user, so a
      // second identity minted per sign-in would show up as a different `accountId` rather than
      // being invisible. The session's provider is the one that established THIS session, which is
      // why it is passed rather than read off the user.
      //
      // PROVIDER ISSUANCE IS UNBOUND — the header's mirror 5 says so. No OAuth credential exists in
      // this environment, and nothing in this suite asserts a provider session's expiry, revocation
      // or refresh.
      return { ok: true, session: issueSession(user, provider) };
    },

    // VENDOR MIRROR 6 — `POST /auth/v1/logout` deletes the session row, and access under that
    // session ends before the access token's own expiry. That is the load-bearing claim of
    // AT-001.12's revocation half, and check (c) is what measures it live.
    //
    // ONE SESSION, NOT THE ACCOUNT. Nothing else about the user changes, which is what lets the
    // body prove re-authentication is the remedy: a fresh sign-in works immediately.
    //
    // WHICH SCOPE THIS MIRRORS, said because the vendor's DEFAULT is the other one. MEASURED on the
    // live stack and recorded in `loop/items/AI4DEV-60/proof-local.txt`: a plain `POST
    // /auth/v1/logout` ends EVERY session the user holds — it emptied `auth.sessions` — because
    // GoTrue's default scope is `global`. This member models the `?scope=local` shape, one session
    // ending, and check (c) binds exactly that: it logs out with `?scope=local` while a SIBLING
    // session opened by the same account stands as the control, and the sibling still works
    // afterwards. NO ACCEPTANCE BODY ASSERTS THE DIFFERENCE — every body signs in afresh after a
    // sign-out, which both scopes permit — so nothing green depends on which one is modelled. It is
    // written down because an unrecorded vendor default is how a mirror quietly stops matching.
    signOut: async (session) => {
      const stored = state.sessions.get(session.sessionId);
      // A throw, not a silent no-op, for the reason `linkGithubIdentity` gives: a body signing out
      // a handle Auth never issued has a bug in the TEST.
      if (!stored) throw new Error(`fixture: no session ${session.sessionId} to sign out`);
      stored.revoked = true;
    },

    // VENDOR MIRRORS 7 AND 8 — a refresh re-establishes access with NO credentials, works after the
    // access token has expired, and extends the SAME session row. Checks (d) and its
    // same-session-row probe are what bind them.
    //
    // THERE IS NO PASSWORD PARAMETER, and that is the substance rather than a convenience: "the
    // session refreshes without forced re-login" is exactly the claim that no credential passes
    // through this call. A body cannot accidentally satisfy AT-001.13 by signing in again, because
    // this member has nowhere to put a password.
    //
    // REVOCATION STOPS IT, EXPIRY DOES NOT. A revoked session is gone, so nothing is left to
    // extend; an expired one still exists, and outliving the access token is the entire point of a
    // refresh token. Getting these two the same way round is what makes AT-001.12 and AT-001.13
    // different tests.
    refreshSession: async (session): Promise<RefreshSessionOutcome> => {
      const stored = state.sessions.get(session.sessionId);
      if (!stored || stored.revoked) {
        return { ok: false, reason: 'this session has ended — sign in again' };
      }
      const user = state.authUsers.get(stored.userId);
      if (!user) return { ok: false, reason: 'this session has ended — sign in again' };

      // THE SAME ROW, MOVED — no new session id, no second entry in the store. `sessionsOf` is what
      // a body reads to see that, and check (d)'s probe is what binds it against the live vendor.
      stored.expiresAtMs = clock.now() + ACCESS_TOKEN_TTL_MS;
      return { ok: true, session: { accountId: user.id, email: user.email, provider: session.provider, sessionId: session.sessionId } };
    },

    // THE OPERATOR'S READ OF `auth.sessions` — live sessions only, so a session that has ended is
    // absent rather than present-and-flagged.
    //
    // AT-001.38's SECOND CLAUSE NEEDS IT: "no authenticated session is created" cannot be shown by
    // a refusal's own return value, only by a count taken across the refusal. Same reason
    // `organizationsNamed` and `discoveryMessagesBy` exist.
    sessionsOf: async (accountId) =>
      [...state.sessions.entries()]
        .filter(([, stored]) => stored.userId === accountId && sessionIsLive(stored))
        .map(([sessionId]) => ({ sessionId })),

    // VENDOR MIRROR 9 AND 10 — `/auth/v1/recover` answers the same way whatever the address is, and
    // emails a link where there is a password to reset.
    //
    // IT ALWAYS SUCCEEDS, and the single answer is the point: a different answer for an unregistered
    // address would be an existence oracle, which is the shape AT-001.21 forbids elsewhere and which
    // the sign-in refusal in this same file avoids for the same reason. Check (e)'s unknown-address
    // probe is what binds it.
    //
    // A SECOND REQUEST MINTS A NEW LINK AND LEAVES THE FIRST ONE ALIVE in `byPasswordResetLink`,
    // and that retention is DELIBERATELY UNMODELLED AND UNASSERTED rather than accidental. Clearing
    // the earlier entry would model resend invalidation, which is retired AT-001.15's ground
    // (`.taskmaster/docs/acceptance/at-req-001.md` line 30 — "reset-link expiry/single-use
    // semantics are not stated in REQ-001"; the plan's own binding extends the ban to resend,
    // plan.md lines 42-43). No body here requests a reset twice, and none may
    // assert either retention or invalidation without re-entering that retired ground, so the
    // behaviour is unobservable inside this suite's rules. It is written down because an unstated
    // behaviour on retired ground is the thing a reader would otherwise have to guess about.
    requestPasswordReset: async (email) => {
      const userId = state.byEmail.get(email);
      const user = userId ? state.authUsers.get(userId) : undefined;
      // A LINK ONLY WHERE THERE IS A PASSWORD. A provider-established account has none, so nothing
      // is emailed — and the answer below does not change, which is the whole shape.
      if (user && user.password !== null) {
        const link = `reset-${user.id}-${state.nextId++}`;
        user.passwordResetLink = link;
        state.byPasswordResetLink.set(link, user.id);
      }
      return { ok: true };
    },

    emailedPasswordResetLink: async (email) => {
      const userId = state.byEmail.get(email);
      const user = userId ? state.authUsers.get(userId) : undefined;
      return user?.passwordResetLink ?? null;
    },

    // VENDOR MIRROR 9 AND 11 — the emailed link changes the password; a link that was never issued
    // changes nothing and says so.
    //
    // NOTHING HERE MODELS EXPIRY, SINGLE USE OR RESEND. The link is NOT removed from the map after
    // it is used, exactly as a verification link is not, because removing it would be single-use
    // semantics and AT-001.15 — where those semantics lived — is retired as unstated in REQ-001.
    //
    // AND NOTHING HERE REVOKES THE ACCOUNT'S OTHER SESSIONS. No criterion reads that, and
    // `secure_password_change` sits false in `supabase/config.toml` (line 260). A mirror of a
    // behaviour nothing asserts is how retired ground creeps back in.
    completePasswordReset: async (link, newPassword) => {
      const userId = state.byPasswordResetLink.get(link);
      const user = userId ? state.authUsers.get(userId) : undefined;
      if (!user) return { ok: false };
      user.password = newPassword;
      return { ok: true };
    },

    // DERIVED THROUGH THE SHIPPED EXTRACTOR, never read off storage. `user.emailConfirmedAt` is
    // rendered into the canonical `/auth/v1/user` shape and `emailVerifiedFromUser` judges it —
    // the same R3 pattern `completeSignup` uses for the GitHub handle, and for the same reason:
    // the extractor is what the future Discovery route will run, so it has to sit on the tested
    // path rather than being a function no test ever executes.
    emailVerified: async (accountId) => {
      const user = state.authUsers.get(accountId);
      // A throw, not `false`. `false` is the answer for an unverified user, so returning it here
      // would make a body that read a user Auth never registered look like a correct negative —
      // and the whole discriminating pair in AT-001.09 turns on telling those two apart.
      if (!user) throw new Error(`fixture: no auth user ${accountId} whose verified state could be read`);
      return emailVerifiedFromUser(renderAuthUser(user));
    },

    emailedVerificationLink: async (email) => {
      const userId = state.byEmail.get(email);
      const user = userId ? state.authUsers.get(userId) : undefined;
      return user?.verificationLink ?? null;
    },

    // VENDOR MIRRORS 2 AND 3 — the header names what binds each. Using the link Auth emailed
    // confirms that address; a link that was never issued flips nothing and says so.
    //
    // NOTHING HERE MODELS EXPIRY, SINGLE USE OR RESEND. The link is NOT removed from the map after
    // it is used, because removing it would be single-use semantics, and AT-001.11 — which is
    // where those semantics lived — is retired as unstated in REQ-001.
    useVerificationLink: async (link) => {
      const userId = state.byVerificationLink.get(link);
      const user = userId ? state.authUsers.get(userId) : undefined;
      if (!user) return { ok: false };
      user.emailConfirmedAt = CONFIRMED_AT;
      return { ok: true };
    },

    completeSignup,

    // THE STAND-IN SURFACE FOR A ROUTE THAT DOES NOT EXIST — see the header's closing paragraph
    // and `AccountsSut`'s fourth kind. Every judgement below is the shipped module's; what is left
    // here is one refusal about bookkeeping and one write.
    sendDiscoveryMessage: async (session, body): Promise<SendDiscoveryMessageOutcome> => {
      // WHO IS CALLING, FIRST AND THROUGH THE SHIPPED JUDGEMENT — the same uniform validation
      // `completeSignup` and `createOrganization` use. A dead session is refused here, before the
      // Discovery floor is consulted, and writes nothing.
      const caller = resolveCaller(session);
      if (caller === null) return { ok: false, reason: DEAD_SESSION_REASON };
      const authUser = state.authUsers.get(caller.id);
      if (!authUser) return { ok: false, reason: DEAD_SESSION_REASON };
      // The same bookkeeping refusal `createOrganization` gives, and it is THIS FILE'S, not a
      // product rule: an account that has not completed signup has no sender to record against.
      // It is checked FIRST so that AT-001.10's refusal is unambiguously the gate's own — the
      // account there has completed signup, so this branch cannot be what answers.
      if (!state.accounts.has(caller.id)) {
        return { ok: false, reason: 'complete signup before sending a Discovery message' };
      }

      // THE VERIFIED FACT IS A CALLER FACT, derived exactly as `emailVerified` derives it: from the
      // rendered response shape, through the shipped extractor. It is never a request field —
      // a request field is something a client asserts about itself, and a floor built on one is no
      // floor at all.
      const emailVerified = emailVerifiedFromUser(renderAuthUser(authUser));

      // THE ONLY DECISION ON THIS PATH, and it is the shipped one. The refusal text is the GATE's,
      // carried through unchanged — AT-001.10 matches the reason, so restating it here would make
      // the test grade this file instead of the module that ships.
      const allowed = discoveryMessageAllowed({ emailVerified });
      if (!allowed.ok) return { ok: false, reason: allowed.reason };

      // ONLY REACHED ON ALLOW, so a refusal writes nothing — which is what `discoveryMessagesBy`
      // is read for. The body is stored opaquely: recipients, threads and message state are
      // REQ-002/004's semantics and none of them is invented here.
      const sent = state.discoveryMessages.get(caller.id) ?? [];
      sent.push(body);
      state.discoveryMessages.set(caller.id, sent);
      return { ok: true };
    },

    discoveryMessagesBy: async (accountId) => clone(state.discoveryMessages.get(accountId) ?? []),

    createOrganization: async (session, organizationName): Promise<CreateOrganizationOutcome> => {
      // WHO IS CALLING, FIRST AND THROUGH THE SHIPPED JUDGEMENT. This is AT-001.12's write: an
      // expired session and a revoked one are both refused HERE, before any product rule, and
      // nothing is written — which `organizationsNamed` is then read to prove.
      //
      // NO VERIFICATION GATE SITS ON THIS OPERATION, which is why AT-001.12 uses it: a refusal is
      // unambiguously the session layer's rather than the Discovery floor's.
      const caller = resolveCaller(session);
      if (caller === null) return { ok: false, reason: DEAD_SESSION_REASON };

      const account = state.accounts.get(caller.id);
      if (!account) return { ok: false, reason: 'complete signup before creating an organisation' };

      // THE REFUSAL IS THE SHIPPED MODULE'S, not this file's. That is what makes AT-001.06 a test of
      // an application boundary rather than of a helper called directly from a test body.
      const allowed = ngoOnlyActionAllowed(account.accountType);
      if (!allowed.ok) return { ok: false, reason: allowed.reason };

      // The name rule is the shipped module's too. It used to be spelled out here, which made this
      // file hold a second copy of a rule — the one thing its opening paragraph promises it does
      // not do.
      const name = validateOrganizationName(organizationName);
      if (!name.ok) return { ok: false, reason: name.reason };

      const organization: OrganizationRow = { id: nextId('org'), name: name.value };
      const membership: MembershipRow = { organizationId: organization.id, accountId: account.id, role: 'admin' };
      state.organizations.set(organization.id, organization);
      state.memberships.set(membershipKey(organization.id, account.id), membership);
      return { ok: true, organizationId: organization.id };
    },

    /**
     * THE ADMIN-ONLY NGO-SIDE ACTION, at the loop tier — and every judgement on this path is the
     * shipped module's.
     *
     * WHO IS CALLING comes from `callerFromAuthAnswer`, the role comes from the membership row IN
     * THE TARGET ORGANISATION, and whether that role may act comes from `orgAdminActionAllowed`.
     * The refusal's KIND and its sentence are carried through unchanged, because the bodies assert
     * the kind — restating it here would make the tests grade this file instead of the module the
     * deployed function imports.
     *
     * THE ORDER MIRRORS THE DEPLOYED FUNCTION: caller, then the role in the target organisation,
     * then the name. Authorisation before validation, exactly as `create-organization` has it, so a
     * caller with no standing learns nothing about whether its name would have been accepted.
     *
     * AN UNKNOWN ORGANISATION IS NOT A CASE OF ITS OWN, and that is the deployed function's own
     * behaviour rather than a simplification. Its membership read finds no row for an organisation
     * that does not exist, so the decision it consults is `orgAdminActionAllowed(null)` and the
     * answer is the not-a-member refusal. This file used to answer `refused` here, which no live
     * surface produces; gate-2 ruling R2c removed the pre-check, and its removal condition (v1) was
     * measured on slot 2 first — the deployed function answered HTTP 403 kind `not-a-member` for a
     * well-formed random uuid, recorded in `artifacts/gate2-verify-answers.md`.
     */
    updateOrganization: async (session, organizationId, name): Promise<UpdateOrganizationOutcome> => {
      const caller = resolveCaller(session);
      // `refused` rather than a meaningful kind: a dead session is not a statement about roles at
      // all, and no body drives this path. Classifying it as one of the two role kinds would put a
      // refusal the session layer produced under a label two acceptance criteria read.
      if (caller === null) return { ok: false, kind: 'refused', reason: DEAD_SESSION_REASON };

      const membership = state.memberships.get(membershipKey(organizationId, caller.id));
      const allowed = orgAdminActionAllowed(membership?.role ?? null);
      // NOTHING ABOVE THIS LINE HAS MUTATED STATE, which is what makes the bodies' read-backs after a
      // refusal measure a real property rather than this file's good intentions.
      if (!allowed.ok) return { ok: false, kind: allowed.kind, reason: allowed.reason };

      const validated = validateOrganizationName(name);
      if (!validated.ok) return { ok: false, kind: 'invalid-name', reason: validated.reason };

      state.organizations.set(organizationId, { id: organizationId, name: validated.value });
      return { ok: true, organizationId, name: validated.value };
    },

    /**
     * THE OPERATOR'S UNSEATED ORGANISATION — the one thing no product path can produce.
     *
     * It writes an organisation row and NO membership row. See `_contract.ts` for why the Given
     * AT-001.16 and AT-001.36 need is unreachable without it: every product path seats its creator,
     * and the one-seat index then refuses a second row.
     */
    createOrganizationAsOperator: async (name) => {
      const validated = validateOrganizationName(name);
      // A THROW, not an outcome: a Given that could not be provisioned is a bug in the TEST, and a
      // polite refusal would read as a product answer several assertions later.
      if (!validated.ok) throw new Error(`fixture: an operator cannot create an organisation named ${JSON.stringify(name)} — ${validated.reason}`);
      const organization: OrganizationRow = { id: nextId('org'), name: validated.value };
      state.organizations.set(organization.id, organization);
      return clone(organization);
    },

    /**
     * THE OPERATOR'S DIRECT MEMBERSHIP GRANT — and the two refusals below MIRROR THE DATABASE, which
     * is this file's whole exposure on this leaf.
     *
     * There is no shipped module to defer to here: the rules are a BEFORE trigger and a unique
     * index, and a TypeScript module cannot supply either. So these two branches are a hand-written
     * PREDICTION of `public.org_memberships`'s constraints, and the plan says so openly. The
     * integration tier is what grades the prediction — both tiers run at the goal step, so a
     * divergence between this file and the database fails there rather than shipping.
     *
     * THE ORDER IS THE DATABASE'S ORDER, and it is load-bearing rather than arbitrary. The BEFORE
     * trigger's own two branches come FIRST — before the organisation foreign key and before the
     * one-seat index — because a BEFORE ROW trigger runs before any constraint is consulted. So a
     * grant into a nonexistent organisation with a non-NGO grantee is refused for the GRANTEE, and a
     * non-NGO grantee offered into an already-seated organisation is refused for being non-NGO.
     * Getting the order any other way round would make the two surfaces answer different kinds for
     * the same input — the divergence gate 2 found (ruling R2a), where the organisation check used
     * to run first.
     */
    grantMembershipAsOperator: async (organizationId, accountId, role): Promise<GrantMembershipOutcome> => {
      // THE NGO-ONLY TRIGGER, mirrored, and it is FIRST because the trigger is. AT-001.37: per-NGO
      // roles are NGO accounts only, on every path — a volunteer and a platform administrator are
      // both refused, and an account that never completed signup has no type to be NGO with.
      const account = state.accounts.get(accountId);
      if (!account) {
        // `refused` rather than `not-an-ngo-account`: no account row is a different fact from an
        // account of the wrong type, and no criterion reads it. The database's own refusal for this
        // case is the trigger's other branch, measured in the item's verify-first answers (b).
        return { ok: false, kind: 'refused', reason: `no account ${accountId} has completed signup` };
      }
      if (account.accountType !== 'ngo') {
        return {
          ok: false,
          kind: 'not-an-ngo-account',
          reason:
            `a per-organisation role may be granted to NGO accounts only — account ${accountId} is of type ` +
            `${JSON.stringify(account.accountType)}`,
        };
      }

      // THE ORGANISATION FOREIGN KEY, mirrored, and it comes after the trigger for the reason above.
      if (!state.organizations.has(organizationId)) {
        return { ok: false, kind: 'refused', reason: `no organisation ${organizationId} exists` };
      }

      // THE ONE-SEAT INDEX, mirrored: a unique index on `org_id` alone, which is strictly stronger
      // than the composite primary key. One organisation holds at most one membership row, whoever
      // it belongs to, so there is no second seat to invite anybody into. Its order against the
      // organisation check above cannot diverge — a seated organisation exists.
      const seated = [...state.memberships.values()].find((row) => row.organizationId === organizationId);
      if (seated) {
        return {
          ok: false,
          kind: 'org-already-seated',
          reason:
            `organisation ${organizationId} already holds its single seat (account ${seated.accountId}) — ` +
            'a v1 NGO is single-seat, so no second member can be added',
        };
      }

      const membership: MembershipRow = { organizationId, accountId, role };
      state.memberships.set(membershipKey(organizationId, accountId), membership);
      return { ok: true, membership: clone(membership) };
    },

    /**
     * THE SAME GRANT REACHED IN TWO STATEMENTS — and this branch MIRRORS THE DATABASE too, for the
     * same reason `grantMembershipAsOperator` does: the rule is a trigger, not a module.
     *
     * THE TRIGGER IS BOUND TO UPDATE AS WELL AS INSERT, which is what refuses here. Re-pointing does
     * not change the organisation's row COUNT, so the one-seat index never sees this write and the
     * trigger's UPDATE half is the only guard on it (gate-2 ruling R5).
     *
     * THE ORDER IS THE DATABASE'S ORDER. An update aimed at an organisation with no membership row
     * matches nothing, so it fires no trigger and refuses; the BEFORE trigger then runs before the
     * account foreign key, so a new account that never completed signup is refused for having no
     * account type, and a new account of the wrong type is refused for being non-NGO.
     */
    repointMembershipAsOperator: async (organizationId, accountId): Promise<RepointMembershipOutcome> => {
      const seated = [...state.memberships.values()].find((row) => row.organizationId === organizationId);
      if (!seated) {
        return { ok: false, kind: 'refused', reason: `no membership row exists in organisation ${organizationId} to re-point` };
      }

      const account = state.accounts.get(accountId);
      if (!account) {
        // `refused`, not `not-an-ngo-account`, for the reason the grant above gives: no account row
        // is a different fact from an account of the wrong type, and the database says so in its own
        // sentence.
        return { ok: false, kind: 'refused', reason: `no account ${accountId} has completed signup` };
      }
      if (account.accountType !== 'ngo') {
        return {
          ok: false,
          kind: 'not-an-ngo-account',
          reason:
            `a per-organisation role may be granted to NGO accounts only — account ${accountId} is of type ` +
            `${JSON.stringify(account.accountType)}`,
        };
      }

      // THE ROW IS RE-KEYED, NOT DUPLICATED: the role travels with it, and the old key goes.
      const repointed: MembershipRow = { organizationId, accountId, role: seated.role };
      state.memberships.delete(membershipKey(organizationId, seated.accountId));
      state.memberships.set(membershipKey(organizationId, accountId), repointed);
      return { ok: true, membership: clone(repointed) };
    },

    /**
     * A PROJECT, PROVISIONED BY THE OPERATOR — with its seat free, which is the only state a
     * created project can be in.
     *
     * Nothing in this tree creates a project through a product path, at either tier. This is the
     * Given AT-001.32 needs and nothing more; it does not validate the organisation's own state and
     * it does not check who is asking, because there is no caller.
     */
    createProjectAsOperator: async (organizationId, name) => {
      if (!state.organizations.has(organizationId)) {
        throw new Error(`fixture: no organisation ${organizationId} to create a project in`);
      }
      const trimmed = name.trim();
      if (trimmed === '') throw new Error('fixture: a project needs a non-empty name');
      const project: ProjectRow = { id: nextId('project'), organizationId, name: trimmed, assignedVolunteerId: null };
      state.projects.set(project.id, project);
      return clone(project);
    },

    /**
     * ATTACH A VOLUNTEER — and the refusal below MIRRORS THE DATABASE's guard trigger, which is the
     * same exposure `grantMembershipAsOperator` carries and is stated in the plan for the same
     * reason: there is no shipped module to defer to, because the rule is a trigger and a column.
     *
     * WHAT IS REFUSED IS A REPLACEMENT, AND NOTHING ELSE. Attaching the first volunteer is the
     * assignment; re-writing the SAME account id is a no-op and stays allowed, because refusing an
     * idempotent write would make it look like a second developer; releasing the seat to null is
     * offboarding's, which belongs to another leaf. Measured on the slot stack — the release to null
     * is recorded ALLOWED in the item's verify-first answers, answer (d).
     *
     * NO ACCOUNT-TYPE CHECK, deliberately. Whether the attached account is of type `volunteer` and
     * whether it was matched to this project is the matching requirement's concern; AT-001.32 is
     * about the SECOND volunteer, and a check here would be an untested requirement.
     *
     * THE ORDER IS THE DATABASE'S ORDER (gate-2 ruling R2b). An update aimed at a project that does
     * not exist matches no row, so it fires nothing and refuses; the guard trigger then runs BEFORE
     * the account foreign key, so an occupied seat re-pointed at an account that does not exist is
     * refused for the SEAT. The account check used to run first, which answered `refused` where the
     * database answers `seat-occupied`.
     */
    assignVolunteerAsOperator: async (projectId, accountId): Promise<AssignVolunteerOutcome> => {
      const project = state.projects.get(projectId);
      if (!project) return { ok: false, kind: 'refused', reason: `no project ${projectId} exists` };
      if (project.assignedVolunteerId !== null && project.assignedVolunteerId !== accountId) {
        return {
          ok: false,
          kind: 'seat-occupied',
          reason:
            `project ${projectId} refuses a second volunteer: its single developer seat is held by account ` +
            `${project.assignedVolunteerId}`,
        };
      }
      if (!state.accounts.has(accountId)) {
        return { ok: false, kind: 'refused', reason: `no account ${accountId} has completed signup` };
      }
      const assigned: ProjectRow = { ...project, assignedVolunteerId: accountId };
      state.projects.set(projectId, assigned);
      return { ok: true, project: clone(assigned) };
    },

    projectAssignment: async (projectId) => clone(state.projects.get(projectId) ?? null),

    /* ------------------------------------------------- the three tenant-read surfaces ----------- */

    /**
     * `organization-dashboard`, at the loop tier — and the READ ORDER below is the deployed
     * function's own, statement for statement.
     *
     * FOUR READS, AND THE ORGANISATION ROW IS THE LAST OF THEM. Every read the decision or the
     * projection needs is issued before it, and nothing is read after it. That ordering is what makes
     * a faulted read answer the SAME 502 for a real foreign organisation and for an identifier that
     * names nothing — the property gate-1 ruling 4 dictated, and the property the fault arm measures.
     *
     * THE DECISION IS THE SHIPPED MODULE'S. What is left here is storage: which rows exist, and in
     * what order they are looked at.
     */
    organizationDashboard: async (session, organizationId): Promise<OrganizationDashboardOutcome> => {
      const caller = resolveCaller(session);
      if (caller === null) return tenantUnauthenticated();

      // READ 1 — the caller's own account row.
      const accountRead = readStore('accounts', () => state.accounts.get(caller.id) ?? null);
      if (!accountRead.ok) return tenantReadFailed('the organisation dashboard');

      // READ 2 — the target organisation's seats, on a DIFFERENT store from the target.
      const seatRead = readStore('memberships', () =>
        [...state.memberships.values()].filter((row) => row.organizationId === organizationId),
      );
      if (!seatRead.ok) return tenantReadFailed('the organisation dashboard');

      // READ 3 — the projection's projects, on a DIFFERENT store again.
      const projectRead = readStore('projects', () =>
        [...state.projects.values()].filter((row) => row.organizationId === organizationId),
      );
      if (!projectRead.ok) return tenantReadFailed('the organisation dashboard');

      // READ 4 — THE TARGET, AND IT IS LAST. Nothing is read after this line.
      const targetRead = readStore('organizations', () => state.organizations.get(organizationId) ?? null);
      if (!targetRead.ok) return tenantReadFailed('the organisation dashboard');

      const callerSeat = seatRead.value.find((row) => row.accountId === caller.id) ?? null;
      const allowed = tenantReadAllowed(
        {
          accountType: accountRead.value?.accountType ?? null,
          roleInTargetOrganization: callerSeat?.role ?? null,
          assignedVolunteerOfTargetProject: false,
        },
        'organization',
      );

      const organization = targetRead.value;
      // ONE ANSWER FOR BOTH CASES — the caller that may not read, and the organisation that is not
      // there. There is one constant to return and no second refusal to reach.
      if (!allowed.ok || organization === null) return tenantNotFound();

      const seat = seatRead.value[0] ?? null;
      return {
        ok: true,
        status: 200,
        value: {
          organizationId: organization.id,
          organizationName: organization.name,
          seat: seat === null ? null : { accountId: seat.accountId, role: seat.role },
          projects: [...projectRead.value]
            .sort((left, right) => left.name.localeCompare(right.name))
            .map((row) => ({ projectId: row.id, projectName: row.name, assignedVolunteerId: row.assignedVolunteerId })),
        },
      };
    },

    /**
     * `project-workspace`, at the loop tier — two reads, and the project is the second of them.
     *
     * WHETHER THE CALLER HOLDS THE SEAT IS A FACT THE TARGET ROW CARRIES, so the target read is both
     * the last read and one of the decision's inputs. That is consistent with the ordering rather
     * than an exception to it: the constraint is that NOTHING is read after the target, and nothing
     * is.
     */
    projectWorkspace: async (session, projectId): Promise<ProjectWorkspaceOutcome> => {
      const caller = resolveCaller(session);
      if (caller === null) return tenantUnauthenticated();

      // READ 1 — the caller's own account row.
      const accountRead = readStore('accounts', () => state.accounts.get(caller.id) ?? null);
      if (!accountRead.ok) return tenantReadFailed('the project workspace');

      // READ 2 — THE TARGET, AND IT IS LAST.
      const targetRead = readStore('projects', () => state.projects.get(projectId) ?? null);
      if (!targetRead.ok) return tenantReadFailed('the project workspace');

      const project = targetRead.value;
      const allowed = tenantReadAllowed(
        {
          accountType: accountRead.value?.accountType ?? null,
          roleInTargetOrganization: null,
          assignedVolunteerOfTargetProject: project !== null && project.assignedVolunteerId === caller.id,
        },
        'project',
      );

      if (!allowed.ok || project === null) return tenantNotFound();
      return {
        ok: true,
        status: 200,
        value: {
          projectId: project.id,
          projectName: project.name,
          organizationId: project.organizationId,
          assignedVolunteerId: project.assignedVolunteerId,
        },
      };
    },

    /**
     * `public-project-page`, at the loop tier — and THE SESSION IS NOT A PARAMETER OF THIS FUNCTION.
     *
     * That omission is the criterion in structural form. AT-001.22 says the public page remains
     * visible, and AT-001.24 says a logged-out visitor renders public surfaces; a page whose answer
     * could depend on who is asking would satisfy neither honestly. The contract's member takes a
     * session so a body can pass one and see that it changes nothing — this implementation has
     * nowhere to read it.
     *
     * THE PROJECTION IS THE SHIPPED MODULE'S. `publicProjectView` builds it field by field, so a
     * field added to the workspace projection cannot arrive here by accident.
     */
    publicProjectPage: async (projectId): Promise<PublicProjectPageOutcome> => {
      const projectRead = readStore('projects', () => state.projects.get(projectId) ?? null);
      if (!projectRead.ok) return tenantReadFailed('the public project page');
      const project = projectRead.value;
      if (project === null) return tenantNotFound();

      const organizationRead = readStore('organizations', () => state.organizations.get(project.organizationId) ?? null);
      if (!organizationRead.ok) return tenantReadFailed('the public project page');
      const organization = organizationRead.value;
      if (organization === null) return tenantNotFound();

      return {
        ok: true,
        status: 200,
        value: publicProjectView({ id: project.id, name: project.name }, { name: organization.name }),
      };
    },

    /**
     * ONE DIRECT DATA API READ — and this member MIRRORS THE POLICY SET, which is this file's whole
     * exposure on this leaf.
     *
     * There is no shipped module to defer to here: the rules are `select` policies and two `security
     * definer` helpers, and a TypeScript module cannot supply either. So the filtering below is a
     * hand-written PREDICTION of `20260812120000_tenant_isolation_policy_set.sql` and
     * `20260813120000_tenant_visibility_volunteer_and_admin.sql`, exactly as
     * `grantMembershipAsOperator`'s two refusals are a prediction of a trigger and an index. The
     * integration tier is the ONLY thing that grades the prediction, because nothing in this file
     * can ask a database anything.
     *
     * IT MIRRORS THE SQL STATEMENT BY STATEMENT AND DOES NOT DELEGATE TO `tenantReadAllowed`, and
     * gate-2 ruling 2 is why. The two rules genuinely differ: `viewer_is_org_member` admits ANY
     * account holding a membership row, while `tenantReadAllowed`'s organisation branch additionally
     * requires an NGO account type, so a volunteer holding a membership row is admitted by the policy
     * and refused by the module. A delegate would be a WRONG mirror wearing the word "shipped". Each
     * branch below is therefore mirrored on its own, and the three are OR'd exactly as several
     * permissive `select` policies on one table are OR'd.
     *
     * AND AT THIS HEAD THE PREDICTION IS UNGRADED. THE INTEGRATION TIER HAS NOT RUN — not at this
     * head and not at any head of this branch. It was attempted once, and the runner refused before
     * a single test executed because the database slot's local stack was down; the attempt is
     * recorded in `loop/items/AI4DEV-66/artifacts/integration-attempt.txt`. So a reader must not take
     * a loop-tier green over these probe arms as a statement about the policy set: at this head it
     * grades THIS FILE'S MIRROR of the migration and nothing else. That is the item's named merge
     * blocker, and it is a fact about this head rather than a property of the design — the moment the
     * integration tier runs, a divergence between this file and the database fails there.
     *
     * THE ORDER IS POSTGREST'S ORDER — the policy decides which rows exist for this caller, and the
     * query's own filter is applied WITHIN that set. Filtering first and then applying the policy
     * would produce the same answer here and a different one the first time a filter names a column
     * the policy reads.
     *
     * ACKNOWLEDGMENTS ARE KEYED ON THE ACCOUNT, not on an organisation, so their branch does not
     * consult the caller's memberships at all — the same split the migrations' policies make.
     *
     * THE SESSION MAY BE `null`, AND THAT IS AT-001.24'S CALLER. A visitor who never signed in sends
     * the publishable key and no bearer token, so PostgREST resolves the request to `anon`, which the
     * migrations grant nothing at all — the refusal is the PRIVILEGE layer and never a policy. It is
     * the same answer a caller whose session has ended receives, for the same reason, and AT-001.24
     * asserts that the two agree.
     */
    dataApiRead: async (session, probe): Promise<DataApiReadOutcome> => {
      // NO SESSION AND A DEAD SESSION ANSWER ALIKE, and the reason is one layer below the policy set:
      // neither carries a user, so PostgREST resolves the request to `anon`, and `anon` holds no
      // `select` grant on any of these four tables. `rows: null` is the privilege layer refusing
      // before any row was considered, which `_contract.ts` keeps distinct from an empty array.
      const caller = session === null ? null : resolveCaller(session);
      if (caller === null) return { status: 401, rows: null };

      const seatedIn = new Set(
        [...state.memberships.values()].filter((row) => row.accountId === caller.id).map((row) => row.organizationId),
      );
      // BRANCH: `public.viewer_is_platform_admin()`. It reads the CALLER'S ACCOUNT TYPE out of
      // `public.accounts`, exactly as the helper does, and admits every row of all four tables. An
      // administrator is seated in no organisation, so without this branch its unfiltered listing
      // would be empty and AT-001.40 could not pass at this tier.
      const platformAdmin = state.accounts.get(caller.id)?.accountType === 'platform_admin';

      let visible: Record<string, unknown>[];
      switch (probe.table) {
        case 'organizations':
          visible = [...state.organizations.values()]
            .filter((row) => platformAdmin || seatedIn.has(row.id))
            .map((row) => ({ id: row.id, name: row.name }));
          break;
        case 'org_memberships':
          visible = [...state.memberships.values()]
            .filter((row) => platformAdmin || seatedIn.has(row.organizationId))
            .map((row) => ({ org_id: row.organizationId, account_id: row.accountId, role: row.role }));
          break;
        case 'projects':
          // THREE BRANCHES, OR'D. The organisation-member one is the first migration's; the
          // assigned-developer one is `assigned_volunteer_id = auth.uid()`, which is what admits the
          // volunteer AT-001.23 grants and is why a volunteer seated in no organisation still reads
          // its own project; the administrator one admits every row.
          visible = [...state.projects.values()]
            .filter((row) => platformAdmin || seatedIn.has(row.organizationId) || row.assignedVolunteerId === caller.id)
            .map((row) => ({ id: row.id, org_id: row.organizationId, name: row.name, assigned_volunteer_id: row.assignedVolunteerId }));
          break;
        case 'acknowledgments':
          visible = state.acknowledgments
            .filter((row) => platformAdmin || row.accountId === caller.id)
            .map((row) => ({ account_id: row.accountId, kind: row.kind, text_version: row.textVersion }));
          break;
      }

      const keyedBy = probe.keyedBy;
      const rows = keyedBy === null ? visible : visible.filter((row) => row[keyedBy] === probe.value);
      return { status: 200, rows: clone(rows) };
    },

    /**
     * THERE IS NO CATALOG AT THE LOOP TIER, and this THROWS rather than answering with an invented
     * one.
     *
     * An empty list would be the false green this whole arrangement exists to remove: the conformance
     * arm's job is to fail when a table exists and is undeclared, and a witness that reported no
     * tables would report that every declaration is complete. Same posture `_source-scan.ts` takes
     * when it cannot read `src/routes/`.
     */
    publicSchemaCatalog: async (): Promise<CatalogTable[]> => {
      throw new Error(
        'fixture: there is no database catalog at the loop tier — the conformance arm reads the live one, ' +
          'and an empty answer here would report every table as declared',
      );
    },

    /** ARM A READ FAULT against the named store — consumed by the next read of it. */
    failNextReadOf: async (store) => {
      state.readFaults.add(store);
    },

    account: async (accountId) => clone(state.accounts.get(accountId) ?? null),
    organization: async (organizationId) => clone(state.organizations.get(organizationId) ?? null),
    membership: async (organizationId, accountId) => clone(state.memberships.get(membershipKey(organizationId, accountId)) ?? null),
    acknowledgments: async (accountId) => clone(state.acknowledgments.filter((row) => row.accountId === accountId)),
    volunteerProfile: async (accountId) => clone(state.volunteerProfiles.get(accountId) ?? null),

    // The two searches a refused action needs: it hands back no identifier, so the rows it must NOT
    // have written can only be looked for by the name that was attempted and by who holds what.
    organizationsNamed: async (name) => clone([...state.organizations.values()].filter((row) => row.name === name.trim())),
    membershipsOf: async (accountId) => clone([...state.memberships.values()].filter((row) => row.accountId === accountId)),

    // DISCRIMINATING — and WHICH predicate that green grades is worth being exact about, because
    // this one is not the shipped one. `public.has_platform_acknowledgment` is SQL, and a
    // TypeScript module cannot supply a SQL predicate; the one judgement inside it — which
    // acknowledgment kind counts — is shared, which is why the constant below is imported rather
    // than spelled. So AT-001.01's loop-tier green proves THE RULE and THIS storage: a completion
    // writes the row, and the answer is false before and true after. The shipped SQL predicate
    // could still return true unconditionally and this would stay green. What proves that one is
    // step 7(h) of the plan, against the live database, and nothing else in this item.
    hasPlatformAcknowledgment: async (accountId) =>
      state.acknowledgments.some((row) => row.accountId === accountId && row.kind === PLATFORM_ACKNOWLEDGMENT_KIND),

    provisionPlatformAdmin: async (email, password) => {
      // CONFIRMED AT PROVISIONING, AND NO VERIFICATION LINK — the header's administrator paragraph
      // says why: the only provisioning recipe this repository records creates the user with
      // `email_confirm: true`, and creating an administrator sends no email.
      //
      // THE SESSION IT RETURNS IS THIS FIXTURE'S CONVENIENCE, AND IS UNBOUND — mirror 5 says so.
      // `POST /auth/v1/admin/users` issues no session at all; the handle exists so AT-001.07 has
      // something to act with, and nothing in this suite asserts an administrator's expiry,
      // revocation or refresh.
      const session = register(email, password, 'email', null, true);
      // Written directly, bypassing `completeSignup` — which is not a shortcut but the point:
      // `parseAccountType` refuses this type, so the public path CANNOT produce it, and the only way
      // an administrator exists is an authority the public never holds. The type is still taken from
      // the shipped vocabulary rather than spelled as a literal.
      const accountType: AccountType = 'platform_admin';
      state.accounts.set(session.accountId, { id: session.accountId, accountType });
      return session;
    },
  };

  return {
    sut: { accounts: sut },
    fixtures: {
      world: async (name: string) => {
        const base = await worlds.world(name);
        const world = new AccountsFixtureWorld(base, ++worldSerial);
        openedWorlds.add(world);
        return world;
      },
    },
    teardown: async () => {
      await Promise.all([...openedWorlds].map((world) => world.teardown()));
      openedWorlds.clear();
      state.authUsers.clear();
      state.byEmail.clear();
      state.byVerificationLink.clear();
      state.byPasswordResetLink.clear();
      state.sessions.clear();
      state.accounts.clear();
      state.organizations.clear();
      state.memberships.clear();
      state.projects.clear();
      state.acknowledgments.length = 0;
      state.volunteerProfiles.clear();
      state.discoveryMessages.clear();
      state.readFaults.clear();
      state.nextId = 1;
    },
  };
}
