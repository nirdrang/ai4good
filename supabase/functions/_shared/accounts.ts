/**
 * EVERY DECISION REQ-001's ACCOUNT deliverable makes, in ONE module that both the shipped edge
 * functions and the acceptance adapter import. It began as the first leaf's four judgements; the
 * second leaf added the volunteer GitHub-link gate to `validateCompleteSignup` rather than building
 * a second decision module beside this one, for the reason the next paragraph gives. (The plan named
 * four; there are five. The fifth —
 * `validateOrganizationName` — was written twice at its call sites instead, and moved here when a
 * code review found the duplicate. "Four" is left out of this sentence rather than corrected to
 * "five", because the count is not the property that matters: what matters is that a rule has one
 * home.)
 *
 * WHY THIS FILE EXISTS AT ALL, because the alternative is what most acceptance suites do and it is
 * worth naming: `adapterDerivedCapability()` in `tests/at/harness/capabilities.ts` stamps every
 * `sut.<key>` a STAND-IN unconditionally, so a suite whose fixture adapter re-implements the
 * requirement proves that the TEST is well-formed and nothing whatever about the code that ships.
 * `tests/at/suites/req-016/_fixture.ts` says so about itself in its own opening paragraph. Putting
 * the judgements here and importing them from both sides is what makes the loop-tier green a claim
 * about product code. The adapter still supplies storage — that half is a stand-in and stays one.
 *
 * TWO CONSTRAINTS THIS FILE IS UNDER, and both are real rather than stylistic:
 *
 *   1. ZERO NON-RELATIVE IMPORTS AND NO DENO GLOBAL. It is compiled by `tests/at/tsconfig.json`,
 *      which is `strict` with `skipLibCheck: false`, `types: ["node"]` and no DOM library — a bare
 *      `jsr:`/`npm:` specifier or a reference to `Deno` would not resolve there. It is also run by
 *      Deno inside the edge runtime, where a node-only import would not resolve either. The
 *      intersection of the two is plain TypeScript over plain data, which is all a decision needs.
 *   2. NO I/O, NO CLOCK, NO RANDOMNESS. Every function here is pure. Storage, time and identity are
 *      the caller's, so the same judgement can be replayed by a test without a database.
 *
 * WHICH PROGRAM ACTUALLY TYPE-CHECKS IT: the `tests/at` one, and ONLY that one. `bun run typecheck`
 * runs `tsc -p` over the root project too, but that project's `include` is
 * `["src/**\/*.ts", "src/**\/*.tsx", "vite.config.ts", "eslint.config.js"]`, so nothing under
 * `supabase/` is in its program. This module reaches the strict acceptance program by being imported
 * from `tests/at/suites/req-001/_fixture.ts`, and that import is the whole of its type coverage.
 */

import { ACKNOWLEDGMENT_IDENTITY_COPY } from './acknowledgment-copy.ts';

/* ------------------------------------------------------------------ the two closed vocabularies */

/**
 * The account types the PUBLIC signup surface offers — AT-001.07's second clause, as a value rather
 * than as a sentence in a document. `platform_admin` is deliberately absent: it is provisioned, not
 * signed up for, and `parseAccountType` below refuses it by construction rather than by a check
 * somebody has to remember to write.
 */
export const PUBLIC_SIGNUP_ACCOUNT_TYPES = ['ngo', 'volunteer'] as const;

export type PublicSignupAccountType = (typeof PUBLIC_SIGNUP_ACCOUNT_TYPES)[number];

/**
 * Every global type an account can hold, including the one no public path can produce. This mirrors
 * the `public.account_type` enum in the migration; the two are separate statements of one fact, and
 * the database is the one that wins — which is exactly why `public.complete_signup` re-checks the
 * type itself instead of trusting this module (see `ngoOnlyActionAllowed`'s note on defence in
 * depth, and the migration's own comment).
 */
export const ACCOUNT_TYPES = ['ngo', 'volunteer', 'platform_admin'] as const;

export type AccountType = (typeof ACCOUNT_TYPES)[number];

/* ---------------------------------------------------------------------------- the answer shape */

/**
 * A decision, and its refusal carries WHY.
 *
 * A bare boolean would make every refusal indistinguishable at the call site, and AT-001.04 and
 * AT-001.06 both assert that a refusal STATES its reason. Returning the reason rather than throwing
 * it is deliberate too: these are expected outcomes of well-formed requests, not faults, and an
 * exception would invite a caller to treat "a volunteer may not do this" the same way it treats a
 * dropped database connection.
 */
export type Decision<T> = { ok: true; value: T } | { ok: false; reason: string };

function refuse<T>(reason: string): Decision<T> {
  return { ok: false, reason };
}

function accept<T>(value: T): Decision<T> {
  return { ok: true, value };
}

/* -------------------------------------------------------------- 1. what type is being asked for */

/**
 * The requested account type, or a refusal naming why — and `platform_admin` can never come out of
 * it, however it is spelled in the request.
 *
 * This is the only thing between an anonymous HTTP request and a minted platform administrator on
 * the TypeScript side of the write path, which is why the database refuses the same value again
 * (see the migration's `complete_signup`). One of the two being deleted or regressed must not be
 * enough.
 */
export function parseAccountType(raw: unknown): Decision<PublicSignupAccountType> {
  if (typeof raw !== 'string' || raw.trim() === '') {
    return refuse(
      `account type is required and must be one of ${PUBLIC_SIGNUP_ACCOUNT_TYPES.join(', ')}`,
    );
  }
  const candidate = raw.trim();
  if ((PUBLIC_SIGNUP_ACCOUNT_TYPES as readonly string[]).includes(candidate)) {
    return accept(candidate as PublicSignupAccountType);
  }
  // Named separately from an outright unknown string, because the two are different mistakes and a
  // caller that sees "unknown account type platform_admin" learns the wrong thing: the type is not
  // unknown, it is not available here.
  if (candidate === 'platform_admin') {
    return refuse(
      'platform_admin is not available through public signup — a platform administrator is provisioned, never self-signed-up',
    );
  }
  return refuse(
    `unknown account type ${JSON.stringify(candidate)} — public signup offers ${PUBLIC_SIGNUP_ACCOUNT_TYPES.join(', ')}`,
  );
}

/* ------------------------------------------------------ 2. is this completion request well-formed */

/** What arrives on the wire — every field `unknown`, because it came from a client. */
export type CompleteSignupRequest = {
  accountType?: unknown;
  organizationName?: unknown;
  acknowledgmentTextVersion?: unknown;
  /** who is making the acknowledgment — AT-001.19's "name" */
  signerName?: unknown;
  /** the title they hold — AT-001.19's "title" */
  signerTitle?: unknown;
  /** the authority statement they affirm — AT-001.19's "authority attestation" */
  authorityAttestation?: unknown;
};

/**
 * WHAT IS TRUE OF THE CALLER, as opposed to what the caller SAID — and the distinction is the whole
 * security property of the volunteer gate below.
 *
 * `githubHandle` is the handle on an identity Supabase Auth has linked to this authenticated user.
 * It arrives from `/auth/v1/user` by way of `extractGithubHandle` in `./github.ts`; it is NEVER a
 * field of the request body, because a request field is something a client asserts about itself and
 * a gate built on one gates nothing.
 */
export type CompleteSignupCaller = {
  /** the linked GitHub identity's handle, or `null` when no GitHub identity is linked */
  githubHandle: string | null;
};

/** The same request once it has been judged: narrow, and safe to hand to the database. */
export type ValidCompleteSignup = {
  accountType: PublicSignupAccountType;
  /** the NGO's organisation name; `null` for a volunteer, who has no organisation */
  organizationName: string | null;
  /** which version of the ToS + Platform Promise text was shown — AT-001.01 records it */
  acknowledgmentTextVersion: string;
  /**
   * The linked GitHub handle this completion is judged against: non-null for a volunteer (the gate
   * below refuses the completion otherwise), null for an NGO.
   *
   * It is CARRIED OUT rather than re-derived by the caller, so the value the write path uses is the
   * same value the decision was made on. A caller that re-read the identity itself could write a
   * profile under a handle the gate never saw.
   */
  githubHandle: string | null;
  /**
   * WHO SIGNED, AND UNDER WHAT AUTHORITY — AT-001.19's three fields, trimmed, carried out for the
   * same reason `organizationName` is: the write path stores the values this decision judged.
   *
   * `authorityAttestation` is the STATEMENT that was affirmed, not a boolean. A `true` in a column
   * records that something was clicked; the statement records WHAT was attested, exactly as
   * `acknowledgmentTextVersion` records which text was accepted. The check below accepts one
   * statement — `ACKNOWLEDGMENT_IDENTITY_COPY.authorityStatement` — so the stored value keeps
   * today's rows distinguishable from those of any later statement.
   */
  signerName: string;
  signerTitle: string;
  authorityAttestation: string;
};

/**
 * Judge a completion request in full — the request, and the one FACT about the caller the volunteer
 * branch turns on.
 *
 * THE VOLUNTEER BRANCH IS GATED ON A LINKED GITHUB IDENTITY. AT-001.04: "completion is blocked with
 * the GitHub-link requirement stated; linking completes signup". The gate reads `caller.githubHandle`
 * — a fact Supabase Auth reports about the authenticated user — and never a request field, so no
 * client can assert its way past it. An NGO completion never reads the fact at all: AT-001.04's own
 * scope is volunteer signup, and a gate that leaked onto NGOs would refuse a signup no criterion
 * says anything about.
 *
 * IT FAILS CLOSED, AND THAT IS STATED BECAUSE THE EDGE ENTRY POINT HAS NO TYPE-CHECKER. Measured, not
 * assumed: `bun run typecheck` covers the root project (`src/**`) and the `tests/at` program, and
 * neither reaches an edge-function entry point (`supabase/functions/<name>/index.ts`). So a call
 * site that forgets the second argument is
 * a real possibility, and the reading below — `caller?.githubHandle`, absent or blank meaning "no
 * linked identity" — makes that mistake BLOCK every volunteer completion loudly instead of waiving
 * the gate silently. A gate that disappears when a caller is careless is not a gate.
 *
 * WHY THE JUDGED VALUE TRAVELS BACK OUT in `ValidCompleteSignup.githubHandle`: so the write path uses
 * the handle this decision was made on rather than deriving its own, which is the same reason the
 * organisation name comes back trimmed instead of being re-trimmed downstream.
 *
 * THE FOUR IDENTITY CHECKS COME LAST, AND THEIR PLACE IN THE ORDER IS LOAD-BEARING. AT-001.19 puts
 * the acting person's name, title and authority attestation on every acknowledgment, and AT-001.39
 * makes an omission a refusal. They are checked AFTER the acknowledgment text version, so every
 * refusal an earlier criterion pins keeps firing first: `platform_admin` refuses at
 * `parseAccountType`, an unlinked volunteer refuses at the GitHub gate, and a completion with no
 * acknowledgment refuses at the text version. A request that omits the identity fields for one of
 * those reasons never reaches these checks and its stated reason is unchanged.
 *
 * ONE REFUSAL PER CONDITION, EACH NAMING ITS OWN FIELD, because a caller told only that "something
 * is missing" has nothing to correct. The fourth check is the one that makes the attestation mean
 * anything: a non-blank string is not an attestation of authority — `'I am not authorized'` is a
 * non-blank string — so the trimmed value must equal the SHIPPED statement in
 * `./acknowledgment-copy.ts`, and anything else is refused as not matching it.
 */
export function validateCompleteSignup(
  request: CompleteSignupRequest,
  caller: CompleteSignupCaller,
): Decision<ValidCompleteSignup> {
  const parsedType = parseAccountType(request.accountType);
  if (!parsedType.ok) return refuse(parsedType.reason);
  const accountType = parsedType.value;

  const rawName = request.organizationName;
  let organizationName: string | null = null;

  if (accountType === 'ngo') {
    if (typeof rawName !== 'string' || rawName.trim() === '') {
      return refuse('an NGO signup must carry a non-empty organisation name');
    }
    organizationName = rawName.trim();
  } else if (rawName !== undefined && rawName !== null) {
    // Refused rather than ignored. A volunteer has no organisation, so a name arriving on a
    // volunteer request means the caller and the server disagree about what is being created, and
    // silently dropping it would let that disagreement reach the database as a missing row instead
    // of surfacing as a refusal.
    return refuse('a volunteer signup carries no organisation name — one account holds exactly one global type');
  }

  // THE CALLER FACT, read defensively — see the fail-closed paragraph above. A missing argument, a
  // null, or a blank string all mean the same thing here: no GitHub identity is linked.
  const linkedGithubHandle =
    typeof caller?.githubHandle === 'string' && caller.githubHandle.trim() !== '' ? caller.githubHandle.trim() : null;

  if (accountType === 'volunteer' && linkedGithubHandle === null) {
    return refuse(
      'a volunteer signup cannot be completed without a linked GitHub account — link GitHub to this account, then complete signup',
    );
  }

  const rawVersion = request.acknowledgmentTextVersion;
  if (typeof rawVersion !== 'string' || rawVersion.trim() === '') {
    return refuse(
      'the ToS + Platform Promise acknowledgment text version is required — an acknowledgment that does not say which text was accepted records nothing',
    );
  }

  // (1) WHO SIGNED. A name is the field that makes the record about a person at all, and an
  // acknowledgment that names nobody records nobody.
  const rawSignerName = request.signerName;
  if (typeof rawSignerName !== 'string' || rawSignerName.trim() === '') {
    return refuse(
      'the signer name is required — an acknowledgment records the person who made it, and one with no name records nobody',
    );
  }

  // (2) IN WHAT CAPACITY. The title is what makes the attestation of authority meaningful: a person
  // binds an organisation in a role, and the record has to say which one.
  const rawSignerTitle = request.signerTitle;
  if (typeof rawSignerTitle !== 'string' || rawSignerTitle.trim() === '') {
    return refuse(
      'the signer title is required — an acknowledgment records the title the person held when they made it',
    );
  }

  // (3) AND THAT SOMETHING WAS ATTESTED AT ALL.
  const rawAttestation = request.authorityAttestation;
  if (typeof rawAttestation !== 'string' || rawAttestation.trim() === '') {
    return refuse(
      'the authority attestation is required — an acknowledgment with none records that nobody claimed the authority to make it',
    );
  }

  // (4) AND THAT WHAT WAS ATTESTED IS THE STATEMENT THIS PLATFORM SHIPS. See the header: a non-blank
  // string is not an attestation of authority. The comparison is exact and against the trimmed
  // value, so leading or trailing space is forgiven and content is not.
  const authorityAttestation = rawAttestation.trim();
  if (authorityAttestation !== ACKNOWLEDGMENT_IDENTITY_COPY.authorityStatement) {
    return refuse(
      'the authority attestation does not match the shipped authority statement — an acknowledgment records the statement that was affirmed, and it must be affirmed as shipped, word for word',
    );
  }

  return accept({
    accountType,
    organizationName,
    acknowledgmentTextVersion: rawVersion.trim(),
    signerName: rawSignerName.trim(),
    signerTitle: rawSignerTitle.trim(),
    authorityAttestation,
    // NULL FOR AN NGO EVEN WHEN ONE IS LINKED. An NGO's account may well carry a GitHub identity —
    // nothing forbids it — but the GitHub link and the onboarding import it fires are volunteer
    // signup's, so an NGO completion carries no handle onward and writes no volunteer profile.
    githubHandle: accountType === 'volunteer' ? linkedGithubHandle : null,
  });
}

/* --------------------------------------------------------- 2b. is this organisation name usable */

/**
 * An organisation's name, trimmed, or a refusal naming why — the SAME rule `validateCompleteSignup`
 * applies to the name arriving on an NGO signup, stated once.
 *
 * WHY IT IS HERE AND NOT AT ITS TWO CALL SITES, because that is where it used to be. The rule was
 * written twice — once in `create-organization/index.ts`, a file no type-checker covers, and once
 * in `tests/at/suites/req-001/_fixture.ts` — so the acceptance suite graded the adapter's copy and
 * said nothing about the shipped one. Two independent statements of one rule with nothing able to
 * notice them diverging is the exact defect this module exists to delete; it does not get an
 * exception for being three lines long.
 */
export function validateOrganizationName(raw: unknown): Decision<string> {
  if (typeof raw !== 'string' || raw.trim() === '') {
    return refuse('an organisation needs a non-empty name');
  }
  return accept(raw.trim());
}

/* ---------------------------------------------------------------- 3. may this account do NGO work */

/**
 * AT-001.06, as a decision: an NGO-only action is permitted to an `ngo` account and to nothing else.
 *
 * A `platform_admin` is refused here too, and that is a deliberate reading of the criterion rather
 * than an accident of the implementation. AT-001.06's clause is "one account holds exactly one
 * global type; the NGO path requires a separate account", and creating an organisation as an NGO is
 * the NGO path. The administrator's cross-account reach is AT-001.40, a different deliverable's id,
 * declared red here — so granting it now would be building an untested requirement.
 */
export function ngoOnlyActionAllowed(accountType: unknown): Decision<'ngo'> {
  if (accountType === 'ngo') return accept('ngo');
  if (typeof accountType !== 'string' || !(ACCOUNT_TYPES as readonly string[]).includes(accountType)) {
    return refuse('this action is available to NGO accounts only, and the caller holds no recognised account type');
  }
  return refuse(
    `this action is available to NGO accounts only — the caller's account is of type ${JSON.stringify(accountType)}, ` +
      'and one account holds exactly one global type, so the NGO path requires a separate account',
  );
}

/* -------------------------------------------------------------------- 4. what signup itself writes */

/**
 * The one acknowledgment kind this leaf records: the ToS plus the Platform Promise, accepted once at
 * signup by whoever completed it.
 *
 * It is a PLATFORM-level acknowledgment, not an organisation-level one, which is why
 * `public.acknowledgments` keys on the account and not on the organisation, and why
 * `public.has_platform_acknowledgment(account_id)` reads it back by account.
 */
export const PLATFORM_ACKNOWLEDGMENT_KIND = 'platform_tos_and_promise';
