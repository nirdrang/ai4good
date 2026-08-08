/**
 * THE FOUR DECISIONS REQ-001's first leaf makes, in ONE module that both the shipped edge functions
 * and the acceptance adapter import.
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
};

/** The same request once it has been judged: narrow, and safe to hand to the database. */
export type ValidCompleteSignup = {
  accountType: PublicSignupAccountType;
  /** the NGO's organisation name; `null` for a volunteer, who has no organisation */
  organizationName: string | null;
  /** which version of the ToS + Platform Promise text was shown — AT-001.01 records it */
  acknowledgmentTextVersion: string;
};

/**
 * Judge a completion request in full.
 *
 * THE VOLUNTEER BRANCH DELIBERATELY HAS NO GITHUB-IDENTITY CONDITION, and this comment is the
 * reason it must stay that way rather than an apology for an omission. AT-001.04 — "completion is
 * blocked with the GitHub-link requirement stated" — belongs to the NEXT leaf of this deliverable
 * (`loop/decomp/req-001.md` D1.L2, which owns AT-001.02, .04 and .05), is declared red in
 * `tests/at/expected/req-001.json` by this leaf, and lands together with the GitHub OAuth path that
 * makes linking possible at all.
 *
 * Adding the gate here would ALSO make this leaf's own AT-001.06 unproducible: that test needs an
 * existing volunteer account to refuse an NGO-only action, and with a GitHub gate in place no
 * volunteer account could be created without OAuth work that is another leaf's. So this is a
 * sequencing decision, not an oversight — and no unused parameter is added in anticipation of it
 * either, because an unused parameter is a claim that the work is half done.
 */
export function validateCompleteSignup(request: CompleteSignupRequest): Decision<ValidCompleteSignup> {
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

  const rawVersion = request.acknowledgmentTextVersion;
  if (typeof rawVersion !== 'string' || rawVersion.trim() === '') {
    return refuse(
      'the ToS + Platform Promise acknowledgment text version is required — an acknowledgment that does not say which text was accepted records nothing',
    );
  }

  return accept({
    accountType,
    organizationName,
    acknowledgmentTextVersion: rawVersion.trim(),
  });
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
