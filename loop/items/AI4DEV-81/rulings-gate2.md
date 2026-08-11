# Gate 2 rulings — AI4DEV-81 (per-item integration verification)

Ruler: the FIX orchestrator sitting (fable). Subject: the draft at head d112367. Sources:
`artifacts/gate2-slice1-terra.distilled.md` (6 findings), `artifacts/gate2-slice2-terra.distilled.md`
(6 findings, one out-of-scope observation), `artifacts/gate2-slice2-flash.distilled.md` (5 findings).
17 findings, 17 rulings. Every claim below is quoted verbatim from the distillate. Every
load-bearing code fact was re-verified against this tree before ruling.

## Panel disposition, slice 1 — the gate stands on terra's single seat

The slice-1 flash seat terminated abnormally twice (vendor-side, zero-token telemetry both
times; no distillate exists — re-measured against the artifacts directory, which holds no
`gate2-slice1-flash.*` file). Ruling: **no third retry; the slice-1 code gate proceeds on
terra's landed seat.** Reasons, recorded in full:

1. The seat is recorded FAILED-TO-LAND, never clean. The invariant "never treat an empty
   reviewer output as a clean gate" is honored by naming the failure, not by retrying until
   the failure disappears.
2. Two identical attempts failed the same vendor-side way at this slot. The mechanical retry
   budget was already spent by the conductor's contract; a third identical attempt has weak
   prospects, and a varied attempt would change what the review covers.
3. The landed seat produced six substantive findings — the gate produced signal, and each
   finding is ruled on its merits below. Fixes will change this exact code, so a late second
   read of the pre-fix draft has diminished value.
4. The flash reader is one of the two AUDIT seats. It reads this same harness machinery at the
   audit, post-fix, where its measured value on a prior item was two real findings. The audit
   brief states explicitly that flash's gate-2 slice-1 seat never landed, so the audit sitting
   weighs its harness findings knowing they are a first read.
5. A concurrent re-run while the executor writes would violate one-writer; a serial re-run
   would cost a full sitting cycle for a seat that failed twice.

## Slice 1 (harness machinery) — reader terra, 6 findings

### S1-1 — ACCEPT (critical, attestation.ts:67)

> "`writeAttestation` deletes and writes the attestation table for any supplied database URL
> without applying the slot identity, port, or project-ID safety checks."

Verified: `writeAttestation(dbUrl, nonce)` is exported and writes on whatever URL it is handed.
The real path is guarded — `prepare()` proves the slot first (`proveSlotTarget` at
db-pool.ts:1267 runs `localStackProblems`) and passes the same proven `status.dbUrl` at :1284 —
but the tree's own doctrine says exported destructive entry points carry their own guard
(`resetSlotDatabase`'s comment; the "proof travels in" idiom of `resetLocalDatabase`, audit
ruling B2 on the slot-pool item).

**Remedy:** the proof travels in. `writeAttestation` takes the proven identity read (or an
equivalent proven-status parameter) rather than a bare URL, mirroring `resetLocalDatabase`, so
no importer can aim it at an unproven database. A selftest proves the unproven path is refused.

### S1-2 — ACCEPT (high, clock.ts:30; live-email.ts:82)

> "`createAttestedRealClock` trusts the structural `LiveAttestation` type instead of validating
> a branded slot attestation; `createLiveEmail` has the same flaw at `live-email.ts:82`."

Verified: `liveSutCapability` and `liveFixturesCapability` both validate the brand
(`attestationOf(attestation, SLOT_ATTESTATION_BRAND)`, capabilities.ts:509 and :531) and refuse
a plain structural object. The clock and email constructors do not — a plain object literal
`{ evidence, constructedFor }` mints a real clock or a live email capability. The threat model
this tree names is the honest mistake nothing notices, and this is one.

**Remedy:** both constructors validate the brand the same way and refuse an unbranded object;
selftests prove the refusal.

### S1-3 — ACCEPT IN PART (high, capabilities.ts:473)

> "`liveSutCapability` admits any `sut.*` capability name and accepts inherited methods through
> `surface[method]`, rather than using a closed, own-method enumeration."

**The inherited-method half is ACCEPTED.** Verified: the admission check at capabilities.ts:501
(`typeof surface[method] !== 'function'`) walks the prototype chain, so an enumeration naming
`toString`, `constructor` or `hasOwnProperty` passes the existence check — a real grant covering
a member the adapter never wrote. Remedy: a member counts only if found before
`Object.prototype` (the live adapter is a plain object literal; authored prototypes stay
admissible). Selftest: an enumeration naming `toString` is refused.

**The any-name half is REJECTED.** The name scoping is the caller's by design: `buildLiveLedger`
derives keys from the live adapter module, whose factory return type is the suite's SUT contract
(`_live.ts` is typed `{ sut: { accounts: AccountsSut } }`), so a rogue key fails typecheck at the
adapter, and a runtime bypass requires a deliberate cast — outside the stated threat model
(capabilities.ts:74-77: an author "has to write something at least as deliberate as a cast").
The constructor cannot know the suite's key set without importing the suite, which would invert
the dependency.

### S1-4 — ACCEPT (high, capabilities.ts:621)

> "The pending-method proxy's `has` trap returns false for an omitted unbacked method, rather
> than making the method observably pending."

Verified: the trap is `Reflect.has(target, property)`, and its own comment claims the opposite
behaviour ("an unbacked method is present and refuses rather than being absent and skippable").
For a contract method the raw adapter omits entirely, `'method' in sut` answers false — the
skippable path the comment says cannot exist.

**Remedy:** `has` answers true for string properties (symbols keep `Reflect.has`), so an
omitted unbacked method is present and its read throws `CapabilityPending` naming it. Selftest:
an omitted contract method is `in`-present and pending on read. Failure direction stays
false-red.

### S1-5 — REJECT (high, registry.ts:702)

> "A bare test body or `default` body is typed as a loop-tier body but is also executed at
> integration tier."

The claim is factually accurate, and the behaviour is the deliberate, documented design — not an
oversight. registry.ts:822-832 states the exact tradeoff: the single-body form runs at every
tier and is typed at the richest tier; the per-tier form is the opt-in protection at exactly the
ids whose procedures differ; "an id that needs it and does not take it fails at run time rather
than at compile time." The failure direction is false-red (a loop-typed body reaching `freezeAt`
at integration hits a runtime absence and the test goes red), never false-green. Refusing bare
bodies above loop would break the tier-agnostic single-body form every existing suite uses —
req-016's and the 24 pending ids' bare bodies run at integration by design and are covered by
the pending/refusal machinery. Risk accepted as designed; no change.

### S1-6 — ACCEPT (high, runner.ts:711)

> "The runner forwards an unvalidated Mailpit URL from stack status, and the live-email probe
> grants identity after any HTTP 200 response."

Verified, both halves: `localStackProblems` checks apiUrl and dbUrl against the slot's own
config ports (runner.ts:754-755) but never `mailUrl`, which flows unchecked from
`supabase status` into the child (db-pool.ts:1332, :1335); and the probe in `createLiveEmail`
accepts any HTTP 200 — the version regex falls back to "an unstated version", so any answering
endpoint passes identification.

**Remedy:** (a) the mail URL joins `localStackProblems` — loopback host and the slot config's
own mail-catcher port; (b) the probe requires the Mailpit identification shape (parseable JSON
carrying a string `Version`), refusing any other 200. Failure direction stays false-red.

## Slice 2 (suite, declarations, process text) — reader terra, 6 findings

### S2-1 — ACCEPT, CONVERGED with flash F2 (critical, _integration.ts:399)

> "AT-001.12 unconditionally waits 135 seconds despite the suite's 30-second Vitest timeout."

Verified: `testTimeout: 30_000` (vitest.config.ts:18); the runner passes exactly that config
with no override (runner.ts:1344-1363); at00112 waits `SLOT_JWT_EXPIRY_MS + 15_000` = 135 s,
and at00113 waits up to 150 s (flash's extension of the same defect, F2). Both declared-green
time-based bodies would time out red — the declared integration green cannot occur.

**Remedy:** a scoped timeout raise for the integration bodies that wait out real time — either a
per-body timeout at registration or a tier-scoped `testTimeout` the runner passes only at
integration. Two constraints: the loop tier stays at 30 s, and the raised value still bounds a
runaway. The goal-phase `--expect` run is the proof.

### S2-2 — ACCEPT, CONVERGED with flash F1 (critical, _live.ts:338)

> "Logout deletes the cached token before AT-001.12 sends its revoked-session write."

Verified: `signOut` ends with `sessions.delete(session.sessionId)` (_live.ts:338); at00112 then
calls `createOrganization(session, …)`, which throws client-side in `tokensOf` (_live.ts:151-162)
before any HTTP request. The revocation clause is never measured against the live stack, and the
body cannot reach green.

**Remedy:** `signOut` keeps the cached tokens; the post-logout write sends the revoked token to
the live stack, and the stack's refusal is the measured fact. R-D3's divergence handle is
untouched — it covers handles that never held a session, which is a different case from a
session that existed and was revoked. If the live stack ACCEPTS the revoked-but-unexpired
bearer token, the body goes red and that red is a true product signal: investigated as a defect
first, per the plan's step-7 doctrine, never a declaration bent to the run.

### S2-3 — ACCEPT, with a verify-first arm (high, _integration.ts:190)

> "AT-001.01's \"atomicity\" arm omits `acknowledgmentTextVersion`, which the edge validator
> rejects before the database transaction starts."

Verified: the arm at _integration.ts:190 sends no `acknowledgmentTextVersion`; a validator
refusal precedes the transaction, so "zero rows left" is trivially true and mid-transaction
atomicity is unproved.

**Remedy, in order:** the executor inspects the deployed complete-signup function. If an input
exists that passes upfront validation and fails inside the transaction after earlier writes,
the arm drives that input and asserts zero rows. If no such input is drivable from outside,
the arm stays, its comment is rewritten to claim exactly what it proves (the deployed path
refuses a completion without acknowledgment and leaves no rows), and the item record plus the
audit claim checklist state that in-transaction rollback is not externally drivable on the
deployed surface. The green then rests on the full-outcome positive oracle plus the refusal
arm, which is the migrated transcript check gate-1 ruling 9 conditioned the green on. No
fault-injection seam is added to shipped code for this.

### S2-4 — ACCEPT (high, _integration.ts:312)

> "AT-001.09 labels two iterations NGO and volunteer but never creates or reads either global
> account type."

Verified: the two iterations differ only in the email label; neither completes signup as a type
nor asserts one, so the parameterization gate-1 finding 8 required is nominal.

**Remedy:** each iteration completes signup as its type after verification — NGO with
organization and acknowledgment, volunteer with linked GitHub identity and acknowledgment — and
asserts the account row carries that global type, so a type-specific verification regression
fails the body.

### S2-5 — ACCEPT, CONVERGED with flash F3 (high, _integration.ts:469)

> "AT-001.13 does not verify that the rotated token remains for the signed-in user."

Verified: `account === null || account.id.length > 0` is a tautology — every possible value
satisfies it (flash F3 says the same: the assertion "always passes").

**Remedy:** capture the account id at sign-in; after rotation assert `client.auth.getUser()`
returns THAT id, and assert the `sut.account` row is non-null with the same id — session
continuity for the same user, not for some user.

### S2-6 — REJECT (medium, pr-body.md:1)

> "The diff displays board identifiers other than AI4DEV-81, including `Closes AI4DEV-45`."

The `Closes` line is the ONE sanctioned batch closes-line (founder batching mode, 2026-08-11):
exact shape, alone on its line, at most one per pull request, declared in the merge ruling. The
CI reference guard verifies exactly this shape and permits exactly this id (ci.yml:351-370).
This item is a declared batch with the partner it closes; the reviewer was deliberately not told
a batch exists — the gate's blindness working as designed — so the finding correctly applies a
rule whose one exception it could not know. The "other added files" half is ruled at flash F4.
No change.

## Slice 2 — reader flash, 5 findings

### F1 — ACCEPT, converged: ruled at S2-2

> "AT-001.12's revocation arm always throws client-side, so the declared green for AT-001.12 is
> unachievable and the revocation clause is never measured against the live stack."

Same defect as S2-2, found independently by both seats — the strongest signal a panel gives.
One ruling, recorded there.

### F2 — ACCEPT, converged: ruled at S2-1

> "The two declared-green time-based bodies wait far past the 30-second vitest testTimeout, so
> both AT-001.12 and AT-001.13 time out and report red, contradicting their declared green."

Same defect as S2-1, and it extends the reach to AT-001.13's 150-second wait, which the remedy
covers. One ruling, recorded there.

### F3 — ACCEPT, converged: ruled at S2-5

> "AT-001.13's 'same account' assertion is vacuous — it always passes — and its comment claims
> a fact the code does not establish."

Same defect as S2-5. One ruling, recorded there. The comment is corrected together with the
assertion.

### F4 — REJECT (low, foreign ids in files the diff displays)

> "The board-item hygiene rule — 'no board item id other than AI4DEV-81 may appear in any file a
> pull request displays' — is violated by foreign ids in files this branch authored and the PR
> displays."

The enforced rule covers the pull request's TITLE and BODY only. The CI reference guard reads
them through the API (ci.yml:326) and never reads diff contents; the Linear linkback hazard the
rule exists for likewise triggers on pull-request text, not on committed files. Ids inside
committed files — the suite comments citing the finished items' proofs, this item's own plan
naming its batch partner, `verify-first.md` — are the repository's record-keeping convention
(the harness itself does it, e.g. contracts.ts citing the item that landed the email provider).
The finding correctly applied the rule the gate prompt handed it: the prompt's hygiene box
overstated the real rule ("any file a pull request displays"), and that prompt defect is
recorded here so the audit brief does not repeat it. The code is unchanged.

### F5 — VERIFY FIRST, settled by this sitting: both constraints CONFIRMED

> "The two diff-level constraints — ci.yml 'comment-only, zero behaviour change' and 'loop tier
> declarations and loop body meaning unchanged' — cannot be confirmed with my read-only tools;
> the content checks that I can do all pass."

Settled with the exact instrument the finding named. `git diff 466880d...HEAD --
.github/workflows/ci.yml` shows a comment-only hunk — `timeout-minutes: 30` appears as
unchanged context, no behaviour line touched. `git diff --stat 466880d...HEAD` over both
expected manifests shows insertions only (43 and 17 added lines, zero deletions), so every
loop-tier declaration line is byte-unchanged. Both constraints hold.

## Out-of-scope observation (terra, slice 2, unnumbered) — answered by the instrument

Terra observed the orchestrator twins "already had different post-frontmatter bodies at 466880d"
and "the required whole-body identity remains unmet." The identity the process requires is the
one `loop/work/twin-check.ps1` defines — the check plan step 8 names — and it passes on this
tree: "twin-check: SYNCED - 251 body lines identical apart from the declared differences." The
divergences terra saw are the declared ones the check excludes, and they pre-date this branch.
No action; recorded for the audit.

## Disposition summary

| finding | severity | ruling |
|---|---|---|
| slice1 panel | — | terra's single seat stands; flash seat FAILED-TO-LAND, named in the audit brief |
| S1-1 | critical | accept — the proof travels into `writeAttestation` |
| S1-2 | high | accept — brand validation in the clock and email constructors |
| S1-3 | high | accept in part — inherited-method check tightened; any-name half rejected (typecheck + cast threat model) |
| S1-4 | high | accept — `has` answers true for string properties; omitted methods observably pending |
| S1-5 | high | reject — documented deliberate design; failure direction false-red |
| S1-6 | high | accept — mail URL validated; probe requires the Mailpit shape |
| S2-1 / F2 | critical | accept, converged — scoped timeout raise for the two time-based integration bodies |
| S2-2 / F1 | critical | accept, converged — signOut keeps tokens; the live stack judges the revoked write |
| S2-3 | high | accept — verify-first: drivable in-transaction failure, else narrow the arm's claim in words |
| S2-4 | high | accept — each .09 iteration completes signup as its type and asserts it |
| S2-5 / F3 | high | accept, converged — same-account assertion made real |
| S2-6 | medium | reject — the sanctioned batch closes-line, verified by the guard itself |
| F4 | low | reject — the enforced rule covers PR title and body only; prompt overstated it |
| F5 | verify-first | settled — both diff constraints confirmed by this sitting |

No ruling removes work, so no removal verification conditions arise. Three rulings change
harness machinery (S1-1, S1-2, S1-3, S1-4, S1-6), four change suite bodies or the live adapter
(S2-1, S2-2, S2-3, S2-4, S2-5); the declarations and process text are untouched by these
rulings.
