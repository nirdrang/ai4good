## Findings

### 1. [warning] Exhausted refusal fires whenever a debit does not fit, and the sentence claims the org has zero credits
**Location**: `public.discovery_allowance` in `supabase/migrations/20260916120000_discovery_allowance.sql:167-172`; `decideDiscoveryAllowance` never distinguishes the cases; AT-002.04 treats an oversize debit as `daily-allowance-exhausted`.

**Finding**: The zero-credit block and the “debit larger than remaining” block are the same raise. The sentence is “organisation % has no Discovery credits left today — get vetted …, fund project fuel …, or wait for the next UTC day”. That is only true when `remaining = 0`.

**Evidence**: The predicate is `v_spent + p_credits > v_granted`. A fresh unverified org with remaining 10 that debits 11 hits this path. AT-002.04 asserts that oversize debit is `daily-allowance-exhausted`. The route accepts any positive integer, not only 1. A Discovery agent that over-asks while credits remain will show the three remedies, including “get vetted (daily grant becomes 30)”, as if the day were already spent.

**Suggestion**: Refuse with this sentence only when `v_granted - v_spent = 0`. When remaining is positive but the requested debit is larger, use `invalid-credit-amount` (or a separate kind) and name the remaining count. Compare remaining first so the add cannot overflow (finding 6).

---

### 2. [warning] The email floor on the live spend path is a second implementation, a weaker sentence, and no acceptance body hits it
**Location**: `decideDiscoveryAllowance` (`supabase/functions/_shared/discovery-allowance.ts:128-177`) has no email check. SQL debit (`discovery_allowance.sql:148-152`). Loop fixture (`tests/at/suites/req-002/_fixture.ts:810-817`). AT-002.22 (`tests/at/suites/req-002/e-gates.test.ts:194-233`) only calls `discoveryMessageAllowed`.

**Finding**: Intent is “email verification is the floor under every Discovery message”. The debit route is documented as the contract the Discovery agent calls per turn. That floor is not in the TypeScript decision. It is re-stated in SQL and again in the loop adapter. The two product sentences are not the same, and the id that claims the floor never drives the spend path.

**Evidence**:
- `discoveryMessageAllowed` refuses with “Use the verification link sent to the account address, then send the message again”. AT-002.22 asserts `/link/i`.
- SQL debit raises only “the caller's email address is not verified”. No remedy, no link.
- The loop fixture copies the SQL sentence from a private `emailVerified` map, not from `accounts.emailVerified`.
- Live `provisionNgo({ emailVerified: false })` returns `sessionId: ''`, so `tokensOf` throws before any edge call. The integration adapter cannot drive an unverified debit through the deployed function.

A green AT-002.22 does not mean a debit of an unverified caller is blocked, or that the caller is told what to do.

**Suggestion**: Put the floor in one place. Either `decideDiscoveryAllowance` consults the same `discoveryMessageAllowed` decision (standing must then carry the Auth fact), or the SQL raise uses that module’s sentence. Add a debit body for an unverified NGO at both tiers. On the live adapter, complete signup without a session is not enough; the operator must be able to invoke the debit RPC as that account.

---

### 3. [warning] The vetting definer trusts caller-supplied channels and copy. That is not what the design of record required
**Location**: `vettingOutcomeNotice` in `org-vetting.ts:85-94`; `set_organization_vetting` in `discovery_allowance.sql:447-499`. Design graft G3 in `loop/items/AI4DEV-102/design/SYNTHESIS.md`.

**Finding**: G3 says TypeScript computes the notice, and the definer derives channels from the class default and refuses an empty delivery set. The implementation only does the second half. SQL takes `p_notice.channels` and `p_notice.copy` as given. It checks “non-empty array” and “subject/body present”. It does not bind channels to `DEFAULT_BY_CLASS['decision']` (`email` + `inapp`). It does not check that copy matches the outcome it later stamps on the payload.

**Evidence**: The HTTP route is safe: `decideOrganizationVetting` builds the notice and unknown keys are refused. `attemptVettingDefinerAsOperator` is the other door, and it is how C4 induces emit failure. The same door can pass `{ channels: ['inapp'], copy: { subject: 'Verified!', body: '…' } }` and commit a vet with no email and with the word “verified” in the copy. `trustWordingProblems` never sees that string; it only scans source.

The late empty-delivery guard after the `||` loop cannot catch a one-element `inapp` notice. Empty is refused. Wrong is accepted.

**Suggestion**: In SQL, ignore inbound channels. Resolve them from the same class default TypeScript uses, or pass only the outcome and have the definer call a small SQL mirror of `channelsFor`. Keep copy in TypeScript if you want, but reject a notice whose channels are not exactly the class default. Do not accept an inbound body as the email a person receives.

---

### 4. [warning] The allowance migration replaces the whole vetting definer to add ten lines. The first copy is a trap
**Location**: `supabase/migrations/20260914120000_org_vetting.sql:82-377` and `supabase/migrations/20260916120000_discovery_allowance.sql:199-508`.

**Finding**: The later file is a full `create or replace` of `set_organization_vetting`. The only live change is `v_utc_day` plus `apply_discovery_grant_mark(...)` before the audit row. The rest is the same authorisation, evidence checks, upsert, audit JSON, notice parsing, and emit. The comment says “Insertion, not a rewrite of the action.” The migration is a rewrite.

**Evidence**: Two ~280-line function bodies now exist in the tree. After migrate, only the second is live. A later fix applied to the first file compiles, migrates, and does nothing. `scanScheduledVetting` treats any trigger on `org_vetting` as automated vetting (`_source-scan.ts:61, 240-241`), so an `after insert or update` grant-mark trigger — the obvious small insertion — is forbidden by the oracle that was meant to block KYC jobs.

**Suggestion**: If the function must be replaced, replace it from one source, not two copies. A trigger that applies `greatest(old.vetted, new.vetted)` on `org_vetting` is the mark; narrow the scheduled-vetting oracle to cron jobs and writers that set `vetted`, not “any trigger on this table”. Do not leave a dead 280-line body as the thing a later reader will edit.

---

### 5. [warning] `_source-scan.ts` is 1365 lines of overlapping naming oracles in one file
**Location**: `tests/at/suites/req-002/_source-scan.ts` (new file, 1365 lines).

**Finding**: The quality bar is not to grow a file past 1000 lines without a strong reason. This file is not one oracle. It is KYC surfaces, org_vetting writers, scheduled vetting, document sinks, trust wording, grant-pin drift, exhausted-sentence pin, Discovery-wallet names, and absent publish flow. Several oracles re-walk the same product tree with their own tokenisers.

**Evidence**: `scanScheduledVetting` forbids every trigger on `org_vetting` (finding 4). `scanTrustWording` is a quoted-string regex with exemptions for email verification. `scanAbsentPublishFlow` and `scanDiscoveryWallet` each reimplement “words of a name”. The selftest for these oracles is another 942-line file. The product modules this requirement added are 177, 393, and ~50 lines. The scan layer is larger than the product it guards, and its coarsest rule already forced a worse SQL shape.

**Suggestion**: Split by oracle (`vetting-writers.ts`, `grant-pins.ts`, `trust-wording.ts`, …). Tighten “manual only” to “no writer of `vetted` outside the definer, no cron that vets”, not “no trigger”. Keep the grant-pin and exhausted-sentence scans; those check a real bijection.

---

### 6. [warning] `v_spent + p_credits` can overflow a 32-bit integer and become a 409 with a Postgres overflow message
**Location**: `discovery_allowance.sql:167`; `integerField` in `discovery-allowance.ts:101-104`.

**Finding**: TypeScript accepts any positive `Number.isInteger` value. PostgreSQL `integer` tops out at 2,147,483,647. After any successful debit (`spent >= 1`), a debit of `2147483647` overflows on `v_spent + p_credits` before the remaining check. The transaction rolls back. The caller does not get `daily-allowance-exhausted`. They get SQLSTATE `22003` mapped to 409 `refused` with the database overflow text.

**Evidence**: `integerField` has no upper bound. `0 + 2147483647` fits and correctly exhausts. `1 + 2147483647` does not. The edge JSON number 2147483647 is exact in IEEE-754, so the value reaches SQL.

**Suggestion**: Compare with remaining, not with a sum: `if p_credits > v_granted - v_spent`. Remaining is at most 30. Also reject `credits > dailyGrantFor('vetted')` (or `> v_granted`) in `decideDiscoveryAllowance` so the HTTP path never sends a value that cannot fit.

---

### 7. [warning] The loop adapter keeps three shadow maps that are not the inner account state
**Location**: `tests/at/suites/req-002/_fixture.ts`: `deactivated` (345, 590-594, 524), `emailVerified` (348, 565, 810), `roleOverrides` (346, 662-668, 601-628).

**Finding**: Deactivation, email verification, and membership role each have a second store beside the accounts fixture the adapter otherwise delegates to. Current tests happen to hit the shadow. A later body that mixes the two stores will green on loop and fail on the live stack, or the reverse.

**Evidence**:
- `deactivateAccountAsOperator` only adds to `deactivated`. `setVetting` reads that set. `setProfile` without an override calls `inner.sut.accounts.attemptWrite`, which still sees `lifecycle: 'active'`.
- Debit reads `emailVerified.get(caller.id)`. `discoveryMessageAllowed` reads `accounts.emailVerified`. A verification after provision updates one and not the other.
- `setMembershipRoleAsOperator` does not update the inner membership row. It only sets `roleOverrides`. Live SQL updates `org_memberships.role`.

The live adapter has one store for each fact: `accounts.lifecycle`, `auth.users.email_confirmed_at`, `org_memberships.role`.

**Suggestion**: Delete the maps. Drive deactivation through the accounts lifecycle write, verification through the existing link helper, and role through the inner membership row (or the same operator SQL the live adapter uses). Loop must not invent a second lifecycle.

---

### 8. [warning] Profile success rendering is an untyped cast in a file no typechecker covers
**Location**: `supabase/functions/set-organization-profile/index.ts:17-34`. Contrast `renderOrganizationVetting` and `renderDiscoveryAllowance` in the shared modules.

**Finding**: Vetting and allowance project the RPC result in `_shared/`, inside the strict `tests/at` program. The profile route does the same job inline in the Deno entry point, with `value as { organization_id?: string; … } | null` and `?? null` on every field. `edge.ts` states that no typechecker covers this file. A renamed SQL key becomes a 200 with nulls. AT-002.01 would still pass on `sut.profile()` because that path reads the table, not the route body.

**Suggestion**: Add `renderOrganizationProfile` next to `decideOrganizationProfile` in `memberships.ts`, in the same shape as `renderDiscoveryAllowance`. Keep the entry point to `writeRoute({ name, target, decide, render })`.