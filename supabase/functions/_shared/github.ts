/**
 * The two GitHub-shaped judgements REQ-001's second leaf needs, in ONE module both the shipped edge
 * function and the acceptance adapter import.
 *
 * IT IS UNDER THE SAME TWO CONSTRAINTS AS `accounts.ts`, for the same reasons, and they are real
 * rather than stylistic:
 *
 *   1. ZERO NON-RELATIVE IMPORTS AND NO DENO GLOBAL. It is compiled by `tests/at/tsconfig.json`
 *      (`strict`, `skipLibCheck: false`, `types: ["node"]`, no DOM library) and it is also run by
 *      Deno inside the edge runtime. The intersection of the two is plain TypeScript over plain
 *      data.
 *   2. NO I/O, NO CLOCK, NO RANDOMNESS. Both functions below are pure, so the same judgement can be
 *      replayed by a test with no network and no database.
 *
 * WHICH PROGRAM TYPE-CHECKS IT: the `tests/at` one, and only that one — it reaches the strict
 * acceptance program by being imported from `tests/at/suites/req-001/_fixture.ts`, exactly as
 * `accounts.ts` does, and that import is the whole of its type coverage.
 *
 * ============================================================================================
 * NO REAL GITHUB CALL EXISTS ANYWHERE IN THIS ITEM, AND NO GREEN MAY BE READ AS PROVING ONE.
 * ============================================================================================
 *
 * `stubGithubStatsFor` below is the STUB IMPORT FIXTURE the decomposition manifest's cross-contract
 * calls for in so many words — `loop/decomp/req-001.md` header: "REQ-007's GitHub-onboarding import
 * is asserted here as observable firing only (stub import fixture until W3)". The IMPORT SOURCE is
 * a stand-in by ratified design. What this leaf owns and proves is the FIRING and the populated
 * profile: that completing a linked volunteer signup writes handle and stats, in the same
 * transaction, with nothing queued and nothing empty. When the volunteer-profile requirement lands
 * the real import in W3, `stubGithubStatsFor` is replaced in place and every caller keeps working,
 * because the shape is the contract and the values are not.
 */

/* --------------------------------------------------- 1. which GitHub identity is linked, if any */

/**
 * The GitHub handle on the caller's linked identities, or `null` — judged from the `/auth/v1/user`
 * response shape and from nothing else.
 *
 * IT TAKES `unknown` ON PURPOSE. The argument is a JSON body that crossed a network; typing the
 * parameter as a nice record would be a claim about somebody else's server, so every step down into
 * it is checked here instead. A shape this does not recognise reads as "no GitHub identity is
 * linked", which is the safe direction: `validateCompleteSignup` refuses a volunteer completion on
 * a null handle, so a misread response BLOCKS a signup loudly rather than waiving the gate quietly.
 *
 * `identity_data.user_name` is GoTrue's field for the GitHub login. It is read in exactly TWO places
 * in this repository — here, and in the handle-binding check inside `public.complete_signup` — and
 * the plan's risk 3 names both, because if that field ever turns out to be spelled differently when
 * a real OAuth app first arrives, the change is a two-place change and not a one-line one.
 */
export function extractGithubHandle(user: unknown): string | null {
  if (typeof user !== 'object' || user === null) return null;
  const identities = (user as { identities?: unknown }).identities;
  if (!Array.isArray(identities)) return null;

  for (const identity of identities) {
    if (typeof identity !== 'object' || identity === null) continue;
    const record = identity as { provider?: unknown; identity_data?: unknown };
    if (record.provider !== 'github') continue;
    const data = record.identity_data;
    if (typeof data !== 'object' || data === null) continue;
    const handle = (data as { user_name?: unknown }).user_name;
    if (typeof handle === 'string' && handle.trim() !== '') return handle.trim();
  }
  return null;
}

/* ------------------------------------------------------------- 2. what the onboarding import is */

/** The three public statistics AT-001.05 names: top languages, repository count, contribution summary. */
export type GithubStats = {
  topLanguages: string[];
  repositoryCount: number;
  contributionSummary: string;
};

/**
 * The pool the stub draws its languages from. A fixed list rather than a generated string, so the
 * values look like languages to a reader of the transcript and a wrong one is obvious.
 */
const STUB_LANGUAGE_POOL = [
  'TypeScript',
  'Python',
  'Go',
  'Rust',
  'Ruby',
  'Java',
  'Elixir',
  'C',
] as const;

/**
 * A 32-bit fingerprint of the handle — FNV-1a, chosen because it is four lines of arithmetic with no
 * dependency and no platform variation. It is NOT a security primitive and nothing here treats it
 * as one; its only job is to make the stub's answer differ between handles while staying identical
 * for one handle on every machine that computes it.
 */
function handleFingerprint(handle: string): number {
  let hash = 2166136261;
  for (let index = 0; index < handle.length; index += 1) {
    hash ^= handle.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

/**
 * The stand-in for REQ-007's GitHub onboarding import — DETERMINISTIC AND NON-EMPTY BY
 * CONSTRUCTION, and it is a stand-in, not an import.
 *
 * DETERMINISTIC, because a random or clock-derived answer would make AT-001.05's assertion either
 * untestable or reduced to "something is there", and "something is there" is what the criterion's
 * own words — "a queued-but-empty import fails this test" — exist to refuse.
 *
 * NON-EMPTY BY CONSTRUCTION: at least one language always, a repository count that is always at
 * least one, and a summary sentence that always mentions the handle. Note the asymmetry with the
 * schema, which permits `repository_count = 0`: a REAL import may legitimately find a volunteer with
 * no public repositories, so the column allows it; the STUB never produces it, so a zero read back
 * in a test would mean the value did not come from here.
 *
 * WHAT A GREEN OVER THIS FUNCTION CLAIMS: that the import fires at completion and lands populated in
 * the same transaction as the account. WHAT IT DOES NOT CLAIM: that any statistic here was ever
 * fetched from GitHub. Nothing in this item reaches api.github.com.
 */
export function stubGithubStatsFor(handle: string): GithubStats {
  const fingerprint = handleFingerprint(handle);

  // One, two or three languages — never zero, which is the whole point of the `cardinality(...) >= 1`
  // constraint this value has to satisfy on the way into `public.volunteer_profiles`.
  const languageCount = 1 + (fingerprint % 3);
  const firstLanguage = fingerprint % STUB_LANGUAGE_POOL.length;
  const topLanguages: string[] = [];
  for (let offset = 0; offset < languageCount; offset += 1) {
    topLanguages.push(STUB_LANGUAGE_POOL[(firstLanguage + offset) % STUB_LANGUAGE_POOL.length]);
  }

  const repositoryCount = 1 + (fingerprint % 240);

  return {
    topLanguages,
    repositoryCount,
    contributionSummary:
      `stub import fixture: ${handle} has ${repositoryCount} public repositories, ` +
      `most recently in ${topLanguages[0]} — no GitHub API was called to produce this`,
  };
}
