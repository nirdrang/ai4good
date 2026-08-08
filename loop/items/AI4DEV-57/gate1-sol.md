Severity scale: high = acceptance/security failure or required redesign; medium = material structural or verification gap; low = localized weakness.

[1] severity: high    loop/items/AI4DEV-57/plan.md:145
    claim: `validateCompleteSignup` permits a volunteer signup without a GitHub identity, contradicting AT-001.04’s mandatory GitHub-link gate.
    why it matters: An email- or Google-authenticated visitor can complete signup as `volunteer` using only an account type and acknowledgment version; this creates the typed account that the next leaf is supposed to block until GitHub is linked, leaving invalid accounts that require redesign or repair.
    unverified-runtime-claim: no

[2] severity: high    loop/items/AI4DEV-57/plan.md:261
    claim: The plan declares AT-001.03 and AT-001.07 green without any product-facing proof of a Google return sign-in or a provisioned platform-admin sign-in.
    why it matters: The loop adapter can simulate both outcomes while the shared module contains no provider authentication, and step 7 checks only that Google is enabled and never provisions or signs in an admin; broken OAuth callbacks or unusable admin authentication therefore survive the entire stated gate.
    unverified-runtime-claim: no

[3] severity: high    loop/items/AI4DEV-57/plan.md:166
    claim: `has_platform_acknowledgment(account_id)` merely reports acknowledgment state and does not enforce AT-001.01’s requirement that acknowledgment precede every project creation.
    why it matters: No project-creation boundary calls the predicate, and neither step 6 nor step 7 attempts creation without acknowledgment; a predicate that always returns true—or is never called—satisfies every planned check while the required gate remains absent.
    unverified-runtime-claim: no

[4] severity: high    loop/items/AI4DEV-57/plan.md:184
    claim: AT-001.06 has no product operation to test because the plan creates only `complete-signup`, while the acceptance criterion and step 7 require an existing account to perform an NGO-only action with a working NGO control.
    why it matters: Calling `ngoOnlyActionAllowed` directly proves only a helper, not an application boundary; producing step 7’s evidence requires adding another edge function or expanding `complete-signup`, which D6 explicitly rejects as a second operation hidden behind a switch.
    unverified-runtime-claim: no

[5] severity: high    loop/items/AI4DEV-57/plan.md:190
    claim: The plan promises four database writes in one transaction but specifies neither a transactional database RPC nor a direct transactional connection from the edge function.
    why it matters: Separate Data API operations can leave an account without its organization, membership, or acknowledgment after a partial failure; implementing the promised atomicity requires an unplanned migration function or a new edge-runtime database-access design.
    unverified-runtime-claim: no

[6] severity: medium    loop/items/AI4DEV-57/plan.md:179
    claim: The absence of an `accounts` insert policy is not an independent barrier against public platform-admin creation because the public edge function must write with authority that bypasses that policy.
    why it matters: If the edge path omits or regresses `parseAccountType`, an authenticated caller requesting `platform_admin` reaches a schema that permits the value; the alleged second guard does not stop the privilege escalation.
    unverified-runtime-claim: no

[7] severity: medium    loop/items/AI4DEV-57/plan.md:235
    claim: The suite-construction steps never mark the signup and public-option tests with `surface: 'ui'`, although the scope reduction depends on the later wiring leaf selecting the UI-marked IDs.
    why it matters: `atTest` defaults every omitted surface to `backend`; the later `--wired` driver would therefore have no committed selection for the screens, and AT-001.07 can be declared green from a server constant while no public signup surface exists.
    unverified-runtime-claim: no

[8] severity: medium    loop/items/AI4DEV-57/plan.md:245
    claim: Importing `_shared/accounts.ts` from the acceptance adapter does not prove that module compiles under both TypeScript projects, and the planned edge-function entry point is covered by neither project.
    why it matters: The root `tsconfig.json` includes only `src/**` and build configuration, while the adapter brings the shared file only into `tests/at/tsconfig.json`; `bun run typecheck` can therefore remain green with Deno-specific errors in `complete-signup/index.ts`.
    unverified-runtime-claim: no

[9] severity: low    loop/items/AI4DEV-57/plan.md:130
    claim: Step 2 has no oracle for the requirement that every pending stub’s detail name its owning manifest leaf.
    why it matters: `expected.ts` matches pending failures only through the `AtPending: <id> PENDING [sut-missing] — ` prefix and ignores the detail suffix, so generic, missing, or incorrect ownership text still satisfies both stated verification commands and weakens the proposed progress ledger.
    unverified-runtime-claim: no

PLAN REVIEW: 9 FINDINGS