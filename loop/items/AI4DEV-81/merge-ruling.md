# Merge ruling — AI4DEV-81 (per-item integration verification), batch with AI4DEV-45 (CI timeout counts queue time)

Ruler: the MERGE sitting, running on **opus @ max**. This sitting runs on opus by design, to
spare fable (founder 2026-08-11). It is not a credit fallback.

Chain, derived from the branch: `AI4DEV-3 (AT harness)` > `AI4DEV-81 (per-item integration
verification)`. The batch partner's chain is `AI4DEV-4 (the work skill)` >
`AI4DEV-45 (CI timeout counts queue time)`. Both are bring-up work, so no requirement sits
above either, and no evidence gate applies.

**Verified code head: `7525e32`.** Every commit after it changes only
`loop/items/AI4DEV-81/`, measured with `git diff 7525e32..<head> -- ':(exclude)loop/items/AI4DEV-81'`,
which is empty. So the code this ruling licenses is the code the runs below graded.

---

## 1. What was built

**The goal step of an item now produces two exact-match results.** The loop tier keeps its
meaning and its speed: stubs, every iteration, and the whole of CI's required check. The
integration tier runs the same suite against the item's reserved database slot — wiped, rebuilt
from `supabase/migrations`, identity-proven, and graded per acceptance id with the same
exact-match strictness. Each item declares its expected integration state in the same manifest
that carries its loop declarations.

The machinery that makes the second tier trustworthy, rather than merely present:

- **A per-run attestation nonce.** `prepare()` writes a runner-minted value into the slot
  database after the reset. The live adapter reads it back through the coordinates it was
  handed and refuses on mismatch. Provenance is now "these coordinates answered with this run's
  value", not "this connection string looks local".
- **A closed enumeration for real verdicts.** No capability is ever granted `real` by name
  prefix. The live route grants only exact names the live adapter module itself exports, each
  admitted against the loaded surface and each carrying attestation evidence.
- **Method-level backing.** One `sut.accounts` key holds both backed and unbacked methods.
  Unbacked methods are callable pending proxies that throw `CapabilityPending` naming the
  method on use. They fake nothing, so they can never produce a green; an id that leans on one
  goes declarably red.
- **A tier-aware ledger.** At integration the harness constructs a live email capability that
  reads the slot's own mail catcher, an attested real clock with no control seam, and live
  fixtures. Loop construction is unchanged.
- **A standing low `jwt_expiry` in the generated slot config.** Session lifetime is provable
  inside one run with no mid-run mutation and nothing to restore.

**First concrete scope:** the live-proof checks of three finished auth items became integration
test bodies. Section 4 states exactly which of them reach green and which do not.

**Source diff, base `466880d`:** 27 files, 4462 insertions, 814 deletions. 22 files are the
declared code territory. The other five are the process text this item's own step 8 changes
(`.claude/agents/executor.md`, `.claude/agents/orchestrator.md`,
`.claude/agents/orchestrator-opus.md`, `.claude/skills/work/WORKFLOW.md`) and `bun.lock`, which
pairs with the one added development dependency. Nothing under `src/` and nothing under
`supabase/` changed: the live adapter tests against the deployed surfaces, it does not alter
them.

**The two orchestrator twins were edited identically.** This sitting checked that itself,
because a silent fork of those two files would be invisible to every other check:
`loop/work/twin-check.ps1` reports `twin-check: SYNCED - 251 body lines identical apart from
the declared differences`, and the two diff hunks are the same text.

---

## 2. Every finding and its disposition

**Gate 1 — the plan.** Reviewer `gpt-5.6-sol` via codex, effort xhigh, read-only. 11 findings,
11 rulings, **no rejection**. Ten accepted; finding 6 accepted and fixed differently (a standing
low `jwt_expiry` in the generated slot config replaced a transient override the reviewer proved
had neither a safe mechanism nor an oracle). Findings 1, 2 and 5 are the three that changed the
design's trust model, and findings 7 and 9 removed two greens the plan had declared on evidence
that did not prove their criteria. Full text: `rulings-gate1.md`.

**Gate 2 — the draft code.** Two pinned readers, blind to each other, over two slices. 17
findings, 17 rulings. Twelve accepted, one accepted in part, three rejected, one settled as
verify-first.

| finding | severity | ruling |
|---|---|---|
| S1-1 | critical | accept — the proof travels into `writeAttestation` |
| S1-2 | high | accept — brand validation in the clock and email constructors |
| S1-3 | high | accept in part — inherited-method check tightened; the any-name half rejected |
| S1-4 | high | accept — `has` answers true, so an omitted method is observably pending |
| S1-5 | high | **reject** — documented deliberate design; failure direction false-red |
| S1-6 | high | accept — mail URL validated; the probe requires the Mailpit shape |
| S2-1 / F2 | critical | accept, converged — scoped timeout raise for the two time-based bodies |
| S2-2 / F1 | critical | accept, converged — `signOut` keeps tokens; the live stack judges the revoked write |
| S2-3 | high | accept — verify-first, then narrow the claim in words |
| S2-4 | high | accept — each `.09` iteration completes signup as its type and asserts it |
| S2-5 / F3 | high | accept, converged — the same-account assertion made real |
| S2-6 | medium | **reject** — the sanctioned batch closes-line |
| F4 | low | **reject** — the enforced rule covers pull-request title and body only |
| F5 | verify-first | settled — both diff constraints confirmed |

Three findings converged across the two seats (S2-1/F2, S2-2/F1, S2-5/F3). Two of those three
are critical, and both would have produced a declared green that could not occur.

**The slice-1 second seat never landed.** It terminated vendor-side twice, with zero-token
telemetry both times, and no distillate exists. It is recorded as FAILED-TO-LAND, never as
clean, and the slice-1 gate stands on one landed seat. The audit brief stated that fact in
advance, so the audit weighed that reader's harness findings knowing they were a first read.

**Audit — the claim checklist.** Two readers, blind to each other, read-only, over a 42-line
enumerated checklist. Seat one reported 2 findings, seat two 1 finding. Both rulings accepted:

- **AU-1** (seat one, checklist A12): the live `linkGithubIdentity` did not route its handle
  through `tokensOf`, so a registration handle that holds no session reached the operator
  insert instead of being refused. The class is *an adopted ruling not implemented* — draft
  ruling R-D3 promised that every session-taking operation refuses such a handle by name, and
  the contract document and the simulation fixture both keep that promise. The code changed to
  match the record. No exercised path reached it, so the exposure was bounded; the defect was
  the unimplemented ruling, and that is never mergeable as-is.
- **AU-2** (both seats, convergent, checklist C5): the checklist stated the physical membership
  column backwards. The code was always correct — it reads `org_id AS organization_id`, and its
  own comment states the seam. The record changed to match the code, in the open, with a
  correction marker in `rulings-fix.md`.

**One clean verdict is recorded as incorrect.** Seat two graded A12 PASS by enumerating the
`tokensOf` call sites and not checking `linkGithubIdentity`. Seat one caught it. This sitting
confirms the audit sitting's grading: a clean line beside a failing line is evidence, never a
veto, and it is why the audit is a panel of two.

**Audit re-run — the once-per-item re-run, whole panel, both seats CLEAN.** Scoped to the fix
delta with the rebuilt checklist. Seat one: `AUDIT: CLEAN`, 39 PASS and 3 could-not-verify
(C6, C7, C9 — all runtime items whose evidence belongs to execution, not to reading). Seat two:
`AUDIT: CLEAN`, all 42 lines PASS, 20 re-read against the fix delta and 22 carried forward on
stated independence. **Both verdicts are recorded here as dispositions, not as a step that
silently did not happen.**

**Executor judgments.** The draft sitting ruled five (`rulings-draft.md`, R-D1 to R-D5) and the
fix sitting six (`rulings-fix.md`, RF-1 to RF-6). RF-2 records five live-adapter defects the
integration run itself exposed — a quoted-printable decode, a wrong field name, a JSON cast, a
column read and a type mismatch. Every one was traced to code and fixed there. **No declaration
was ever bent toward a run.**

---

## 3. Both tiers' exact-match results

Run on this machine on 2026-08-11, serial on the reserved slot. The first table is the goal
step at code head `41bcadc`; the second is the re-verification after the audit fix, at code
head `7525e32`, which is the code this ruling licenses.

**Goal step, head `41bcadc`:**

| command | tier | requirement | exit | result |
|---|---|---|---|---|
| `bun run at:verify req-001 --tier loop --expect` | loop | req-001 | 0 | 37 P0: 13 green, 24 red, 0 missing — matches exactly |
| `bun run at:verify req-016 --tier loop --expect` | loop | req-016 | 0 | 12 P0: 11 green, 1 red, 0 missing — matches exactly |
| `bun run at:verify req-001 --tier integration --expect` | integration | req-001 | 0 | 37 P0: 8 green, 29 red, 0 missing — matches exactly |
| `bun run at:verify req-016 --tier integration --expect` | integration | req-016 | 0 | 12 P0: 0 green, 12 red, 0 missing — matches exactly |

**Re-verification after the audit fix, head `7525e32`:** all four runs green with exit 0, and
the same four counts — req-001 loop `13 green, 24 red, 0 missing`; req-016 loop `11 green,
1 red, 0 missing`; req-001 integration `8 green, 29 red, 0 missing`; req-016 integration
`0 green, 12 red, 0 missing`. **No declared red's kind shifted and no manifest line was
amended.**

**The integration runner's own slot evidence line, verbatim:**

```
at:verify — db slot 1 (ai4good-slot-1, api 55321) — reset OK — migrations: 2 expected, 2 applied
```

The identity reads that precede it, verbatim:

```
db-pool — slot 1 identity proven before the prepare: project ai4good-slot-1, api 55321, db 55322, containers supabase_imgproxy_ai4good-slot-1, supabase_pooler_ai4good-slot-1
db-pool — slot 1 identity proven before the reset: project ai4good-slot-1, api 55321, db 55322, containers supabase_imgproxy_ai4good-slot-1, supabase_pooler_ai4good-slot-1
db-pool — docker confirms slot 1's own database container before the reset: supabase_db_ai4good-slot-1
at:verify — 2 migrations expected, 2 applied — the rebuilt schema matches supabase/migrations exactly
```

**Other checks at head `7525e32`:** `typecheck OK: both configs clean`; build clean
(`✓ built in 169ms`); `at:selftest` 344 passed, and the count is unchanged by the audit fix.
The selftest count was 327 before this item and is 344 after it: seventeen new tests, and every
one of the original 327 still passes.

---

## 4. What the green does and does not claim

**The required CI check proves the loop tier only.** `verify` runs the suite against stubs. It
holds no database slot and never will — keeping it stub-based and fast is a stated constraint
of this item, not an omission. So the required check is not evidence about the real database at
all, and the integration half of the merge evidence is the two runs recorded above. This ruling
states both tiers for that reason.

**The integration green says** that against a database rebuilt from `supabase/migrations`, with
the deployed edge functions served by the slot's own container, **eight of REQ-001's 37 P0 ids
proved their full criteria**: signup with the org, admin membership and acknowledgment; the
NGO-only refusal; the provisioned platform administrator; email verification for both account
types; the wrong-password refusal; session expiry and revocation; automatic client refresh
without a forced re-login; and the emailed password reset.

**It does not say REQ-001 works.** Twenty-nine ids are red, each in a shape the manifest
declares: two provider handshakes nobody in this environment can perform, a GitHub statistics
import that a shipped stub answers, a Discovery route that exists in no requirement yet, and
twenty-four surfaces that have not landed.

**One deviation from this item's own "done means", stated plainly.** The board text says the
three migrated check sets run green at integration tier. Two of the three do: the email
verification checks and the sessions checks are green. **The GitHub sign-in checks are not.**
AT-001.02, AT-001.03 and AT-001.04 are declared red naming
`sut.accounts.registerWithGithub` and `sut.accounts.registerWithProvider`, and AT-001.05 is
declared red naming the GitHub statistics stand-in. The reason is environmental and was ruled
at R-D1: a real provider handshake cannot be performed locally, and a green resting on a vendor
read that a shipped stub answered is exactly the false green this item exists to prevent. Those
ids migrated into declared reds with exact kinds, which is an honest result, not a silent gap.
This is recorded as a deviation rather than absorbed, so nobody later reads the merge as proof
the GitHub sign-in path is live-verified.

**What merging changes for CI: nothing.** The required check stays loop-only and fast. This
item makes the two-tier goal step the rule in the process text; it does not put a database in
CI.

---

## 5. Maintained reviewer disagreements, verbatim

Four reviewer positions stand rejected. Every claim is quoted exactly as the reviewer wrote it.
No id needed eliding: each quote names only this branch's own item and the sanctioned batch
partner.

**S1-5, rejected** — reviewer terra, slice 1, severity high, `registry.ts:702`:

> "A bare test body or `default` body is typed as a loop-tier body but is also executed at
> integration tier."

The claim is factually accurate and the behaviour is deliberate, documented design.
`registry.ts:822-832` states the tradeoff: the single-body form runs at every tier and is typed
at the richest tier, and the per-tier form is the opt-in protection at exactly the ids whose
procedures differ. The failure direction is false-red, never false-green. Refusing bare bodies
above loop would break the tier-agnostic single-body form every existing suite uses. Risk
accepted as designed.

**S1-3, the any-name half, rejected** — reviewer terra, slice 1, severity high,
`capabilities.ts:473`:

> "`liveSutCapability` admits any `sut.*` capability name and accepts inherited methods through
> `surface[method]`, rather than using a closed, own-method enumeration."

The inherited-method half was accepted and fixed. The any-name half is rejected: name scoping
belongs to the caller by design. `buildLiveLedger` derives keys from the live adapter module,
whose factory return type is the suite's SUT contract, so a rogue key fails typecheck at the
adapter, and a runtime bypass needs a deliberate cast — outside the stated threat model. The
constructor cannot know the suite's key set without importing the suite, which would invert the
dependency.

**S2-6, rejected** — reviewer terra, slice 2, severity medium:

> "The diff displays board identifiers other than AI4DEV-81, including `Closes AI4DEV-45`."

That line is the one sanctioned batch closes-line, declared in section 6. The reviewer was
deliberately not told a batch exists — the gate's blindness working as designed — so it applied
a real rule whose single exception it could not know.

**F4, rejected** — reviewer flash, slice 2, severity low:

> "The board-item hygiene rule — 'no board item id other than AI4DEV-81 may appear in any file a
> pull request displays' — is violated by foreign ids in files this branch authored and the PR
> displays."

The enforced rule covers the pull request's **title and body only**. This sitting verified that
against the guard itself: it reads title and body through the API at `ci.yml:326` and never
reads diff contents. Ids inside committed files are the repository's own record-keeping
convention. The gate prompt overstated the rule, and that prompt defect is recorded in
`rulings-gate2.md` so later briefs do not repeat it.

**One reviewer disagreement runs the other way.** The audit's seat two graded checklist line
A12 PASS. That verdict is rejected: seat one's FAIL was correct and became AU-1.

---

## 6. The batch partner, and the sanctioned closes-line

**I declare the one sanctioned batch closes-line: `Closes AI4DEV-45`**, alone on its line, once
in the pull-request body. This sitting verified the shape and the count directly: the body
contains exactly one such line, and exactly two item ids in total — this branch's own and the
partner's. The guard permits exactly one closes-line and fails a second (`ci.yml:351-370`).
On merge, that line closes the partner deliberately.

**The partner's remedy, and a correction to the facts this sitting was handed.** The spawn
prompt described the remedy as `timeout-minutes: 30` at `ci.yml` line 49 with zero change from
this item. This sitting measured it and reports two corrections, because a merge ruling that
repeats an unverified number is the defect this process exists to remove.

1. **The value sits at `ci.yml` line 58, not line 49.** Line 49 is a comment line.
2. **The value is pre-existing and unchanged by this branch, but the branch does change the
   file.** `timeout-minutes: 30` landed in commit `2795926` (2026-08-07, the change that routed
   the required check to a self-hosted runner behind a repository variable). That commit is an
   ancestor of `main` and of this branch's base `466880d`, both verified with
   `git merge-base --is-ancestor`. In the branch diff the value appears as unchanged context.
   **This branch does edit `ci.yml`, comment-only, in commit `a13f846`.**

**That comment edit is part of the partner's remedy, not incidental.** The partner item asks
for a value in the 30–45 minute range, and 30 is inside it. The partner item also states that
two explanations fit the evidence equally well and that the raise "should not be justified by
picking one". The old comment picked one: it asserted that hosted capacity queued the job for
11-15 minutes. Gate-1 ruling 11 found that the plan's claim about the comment was wrong, and
required the neutralisation. The comment now states both candidate explanations as
undistinguished and says plainly that nobody established which occurred. Behaviour is unchanged
and the runaway bound is kept.

So the partner's remedy is complete in two parts: the pre-existing bound inside the asked-for
range, and this branch's comment correction that stops the file from asserting a cause nobody
measured.

---

## 7. The merge licence

The required check on `main` is `verify`. Branch protection has `strict` false and
`enforce_admins` false; that is a configuration convenience and not a licence, and **no bypass
is used or needed here** — the check is genuinely green.

At head `1efee7b`, which carries the audit re-run evidence and code byte-identical to
`7525e32`, the check run named `verify` completed with conclusion `success`
(check run `93810797267`, workflow run `31501041580`, started 14:21:07Z, completed 14:22:00Z,
head SHA confirmed as `1efee7b00e7b721a85fa4758258876b5145bc266` on the check run itself).

This ruling adds one record-only commit on top of that head. The required check must therefore
be confirmed green again on the resulting head before the merge runs, because the green must
pin the exact head that merges. This sitting confirms it there and records that head SHA and
run id in the ruling comment on the pull request — a file cannot name the commit that carries
it.

**Ruling: MERGE.** Every gate produced signal and every finding is ruled. The one gate seat
that failed to land is named rather than counted clean. The audit found a real unimplemented
ruling and it was fixed. The whole panel re-read the fix and both seats came back clean. Both
tiers match their declarations exactly, with no declaration amended anywhere in this item.
