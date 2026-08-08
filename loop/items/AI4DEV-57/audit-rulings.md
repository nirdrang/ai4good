# AI4DEV-57 (email + Google signup, three account types) — rulings on the AUDIT (sitting 5)

Ruled by `orchestrator-opus` (Opus 5, effort max), the opus fallback in force for this whole item
because fable is out of credit. A fable ruling and an opus ruling are not the same evidence; every
ruling in this file is an opus ruling, as are those in `plan.md`, `gate1-rulings.md`,
`draft-rulings.md` and `fix-rulings.md`.

**Audit ruled on:** `audit-luna.md` (luna, effort max, read-only) — **AUDIT: 7 FINDINGS**, against head
`553d2bb43c1cff7593681d592e9194580ec03ff8`.

**This sitting exists because the audit was not clean.** A clean audit is absorbed by the merge
sitting; findings get their own sitting, which is this one.

**Every finding was verified against the tree by me before it was ruled.** The conductor's summary of
the audit was explicitly not treated as ground truth, and that mattered: on finding 1 the auditor
**understated** the defect, and on finding 3 the auditor was right about the brief and wrong about the
tree. Two of the seven could not have been ruled correctly by reading the summary alone.

**Outcome: five accepted and fixed, one rejected with reason, one stale reference corrected. Plus one
finding of my own that the audit could not have made**, because it is not in the tree.

---

## THE HEADLINE: the audit earned its keep, and the thing it found was not the thing it reported

Finding 1 was reported as a scope violation — a surgical four-line change that had grown to
thirty-one. That is true, and it is the smaller half. **The twenty-seven extra lines were
character-encoding corruption.** Every em-dash in `tests/at/harness/type-invention.selftest.ts` had
become `â€”` — the UTF-8 byte sequence of an em-dash decoded as Windows-1252 and re-encoded — which is
the exact `Set-Content`-style ANSI-codepage hazard this environment's own tooling notes warn about.

It was invisible to every check this item runs. The corrupted text sits in comments, in `it()` test
names and in assertion failure messages; the asserted `marker` strings contain no em-dashes, so all
251 self-tests passed and CI was green. A reviewer reading the diff would have seen prose churn and
moved on. **The audit is the only thing in this process that looked at the diff and asked why it was
bigger than the ruling said**, and that question is what surfaced it.

---

## FINDING 1 — HIGH — the CI-2 ruling was not implemented as ruled. **ACCEPTED. Record was false; the code is now what the ruling said.**

**The auditor's claim, verbatim:**

> CI-2 was not implemented as exactly four marker-only constraint changes; the diff also rewrites
> numerous prose and diagnostic-label lines.
> why it matters: The adopted surgical-change ruling is false even though the four rejection subjects
> remain intact.

**Verified, and the auditor understated it.** `git diff main...HEAD --stat` on that file reported
**31 insertions and 31 deletions**, against a ruling whose own words were *"the four string matches
are repaired to `'SuiteId'`"* plus one prose site in a different file. Measured programmatically
rather than by eye — `[System.IO.File]::ReadAllText` with real character-code comparison, because the
PowerShell console's own output encoding misrenders em-dashes and would have produced a false
positive on four other files:

| file | mojibake sequences | surviving em-dashes |
|---|---|---|
| `tests/at/harness/type-invention.selftest.ts` | **27** | **0** |
| `supabase/functions/_shared/accounts.ts` | 0 | 21 |
| `supabase/functions/complete-signup/index.ts` | 0 | 6 |
| `tests/at/suites/req-001/_fixture.ts` | 0 | 15 |
| `supabase/functions/_shared/edge.ts` | 0 | 14 |

**Every em-dash in the file was destroyed and no other changed file was touched.** The blast radius is
one file, which is what makes the repair safe.

**Ruling: accept.** The four marker repairs were correct and are kept; the write that made them is
what corrupted the file. All 27 sequences restored to `U+2014`, written back with an explicit
`UTF8Encoding($false)` rather than any cmdlet default.

**The verification is the finding's own criterion, which is why it is worth stating.** After the
repair, `git diff main -- tests/at/harness/type-invention.selftest.ts` shows **exactly four changed
lines**, all four of them `marker:` constraint text, `'"req-016"'` → `'SuiteId'`. The ruling's
sentence is now true of the tree. Byte delta is exactly `27 × 5`, the mojibake shrink and nothing
else.

**One self-inflicted error, recorded because catching it is the point.** Mid-repair I concluded that
four files had also lost a byte-order mark, and I restored one. That conclusion was an artifact of my
own measurement: PowerShell's `>` redirection writes UTF-8 **with** a BOM in this environment, so the
temp files I compared against had BOMs that `main` does not. The diff caught it immediately — line 1
showed as changed — and I removed the BOM I had just added. **No file's BOM was ever altered by this
item.** A measurement that produces the answer you expected is still worth re-deriving when it comes
from a tool that rewrites what it hands you.

---

## FINDING 2 — HIGH — B6 was not fully implemented; SQL still judges blank organisation names. **ACCEPTED. The record was false; the CODE IS RIGHT and does not change.**

**The auditor's claim, verbatim:**

> `create_organization` still independently judges blank organization names outside
> `_shared/accounts.ts`.
> why it matters: A direct RPC follows a separate name-validation branch, so B6's "no duplicate copy
> outside the module" claim is untrue.

**Verified as fact.** Migration line 276: `if p_name is null or length(btrim(p_name)) = 0 then raise
exception 'create_organization refuses an empty organisation name'`. It is a second statement of the
rule, and it is outside the shared module.

**Where the false claim actually lives, which the auditor located precisely: `audit-brief.md` line 70
— a file I wrote.** Its B6 row read *"**No duplicate copy of that rule remains outside the module**"*.
The auditor tested my own claim against the tree and found it untrue. That is exactly what an audit is
for.

**Ruling: accept the finding, and fix the record rather than the code — the SQL check stays.**

The distinction is not a technicality and it is the same one E3 turned on. **B6's defect was a
judgement ESCAPING the shared module**, so the acceptance suite graded a copy instead of the shipped
rule. Both escapees were TypeScript — `create-organization/index.ts` and the adapter — and both were
fixed; the suite now grades the shipped rule. The SQL check never escaped anything: it is a database
backstop on a `security definer` function that `service_role` can execute **directly, with no
TypeScript in the path at all**.

**And that is the precise shape B2 ruled MANDATORY, one row above it in the same brief.** B2 accepted
an account-type backstop in this very function for this very reason — *"a guard on the only write path
does not depend on the code that normally calls it"*. Deleting the name check to satisfy my
overbroad sentence would have implemented a regression against a ruling I had already made, on the
strength of a sentence I had written carelessly. **The sentence was wrong; the code is right.**

`audit-brief.md` is corrected by annotation rather than silent rewrite — the false sentence is struck
through, the corrected one stated, and the reason recorded — so a later reader can still see that the
auditor's finding was legitimate rather than finding a brief that mysteriously matches the tree.

**The residual is real and is filed, extending E3 rather than opening new work at the close of a
sitting.** There are now three near-copies of the non-empty-name rule: `validateOrganizationName` and
`validateCompleteSignup`'s NGO branch (both inside the shared module, E3) and this SQL backstop.
Nothing tests an NGO signup with an empty organisation name, so a divergence between any two of them
would be caught by nothing. Named in `PHASE-STATE.md`; deliberately not built here.

---

## FINDING 3 — MEDIUM — `PHASE-STATE.md:10` names foreign board item ids. **REJECTED as a defect in the change. ACCEPTED as a defect in MY BRIEF, which is corrected.**

**The auditor's claim, verbatim — recorded here because a rejected finding's claim must be visible:**

> A changed file names foreign board items `AI4DEV-51`, `AI4DEV-50`, and `AI4PM-19`, contrary to the
> single-item scope rule.
> why it matters: Those IDs can link or move other work items even though the pull-request body and
> commit subjects use only `AI4DEV-57`.

**The auditor applied my brief exactly as written and reported correctly against it.** The brief's
BOX SET B item 3 said: *"No pull-request body, commit message **or file in this change** may name any
board item id other than `AI4DEV-57`."* Under that rule the finding is sound. **The rule is wrong**,
and three independent facts each settle it.

**1. The mechanism does not reach files.** Linear links from a pull request's title and body and from
commit messages. It does not parse files inside a diff. A markdown file naming an id creates no link
and moves nothing. The auditor's *"can link or move"* is the correct hazard, stated about the wrong
surface.

**2. This repository's own guard agrees, and it is the authority on what the rule is.**
`.github/workflows/ci.yml` line 292 reads
`gh api "repos/${REPOSITORY}/pulls/${PR_NUMBER}" --jq '.title + "\n" + (.body // "")'`. Title and
body. It never looks at the diff. My brief was stricter than the guard the project actually enforces.

**3. The rule as written condemns the repository as it stands.** `main` already carries **65 distinct
board item ids** across its `.ts` and `.md` files. The very file this branch edits,
`tests/at/harness/type-invention.selftest.ts`, names `AI4DEV-20`, `AI4DEV-24` and `AI4DEV-31` **on
`main`**, in comments explaining why the harness exists. Complying with my brief would have meant
deleting pre-existing explanatory comments from a file I was already being told I had over-edited —
a strictly worse change, made to satisfy a rule nothing enforces.

**And the specific line is one the way of work REQUIRES.** `PHASE-STATE.md:10` is the item's
chain-of-derivation: `AI4DEV-57 → AI4DEV-51 → AI4DEV-50 → AI4PM-19`. Attribution is *derived from the
branch by walking `parent` upward*, and recording that derived chain is mandatory. A rule forbidding
it would forbid the process.

**Verified on the surface that actually carries the hazard, so the rejection rests on measurement:**

| surface | ids present | verdict |
|---|---|---|
| all 19 commit messages on this branch | `AI4DEV-57` only | clean |
| live pull request title | `AI4DEV-57` only | clean |
| live pull request body | `AI4DEV-57` only | clean |

**Ruling: reject.** No foreign id appears on any surface Linear reads, so nothing can move another
item. CI's reference guard will pass. `audit-brief.md` item 3 is corrected in place so this false
finding does not recur on every future item — leaving an overbroad rule in the brief would
manufacture the same finding forever, and a rule that produces guaranteed false positives trains
people to ignore the audit.

---

## FINDING 4 — HIGH — real credential values committed in `stack-up.txt`. **ACCEPTED AND SCRUBBED. No live system is affected; the record's claim was false and that is the defect.**

**The auditor's claim, verbatim:**

> The committed stack transcript contains a JWT secret and S3 access key and secret instead of
> redacting them.
> why it matters: Credential values are exposed in a changed file, violating the secret gate.

**Verified immediately and treated as blocking before anything else was ruled.** True. Line 22 carried
three unredacted values. **The auditor also missed one:** the same JWT secret appears again at line 34
in the second JSON block. Both are now redacted.

**What the values are, stated precisely rather than reassuringly:**

- `JWT_SECRET` was Supabase's **published default local-development JWT secret** — a self-describing
  placeholder string shipped in the CLI and printed in their public documentation, which announces in
  its own text that it exists only to be long enough. It is not a secret in any operational sense.
  **The value is deliberately not repeated here**, because a ruling that re-commits the string it is
  ruling against has not removed it from the change.
- The two `S3_PROTOCOL_*` values are local-stack credentials for the storage S3 endpoint at
  `http://127.0.0.1:54321/storage/v1/s3` — a loopback address on the one machine that ran the stack.
  They authenticate against nothing reachable from anywhere else.

**No hosted or production credential was exposed. No rotation of any live system is required, because
no live system is involved.** This is stated as an assessment of what the values are, not as a reason
the commit was acceptable.

**Why it is a real finding anyway, and the reason is the interesting one: the file asserted the
opposite of what it did.** Its own header read *"nothing key-shaped is committed"* while line 22
committed three key-shaped values. And the **same two S3 values were correctly redacted twenty lines
lower**, which proves the redaction was intended and one line was simply missed. A missed line is an
oversight; **a header asserting that the missed line does not exist is a false statement in the
record**, and false records are the one class this process never merges. That is the ground of this
ruling, not the sensitivity of the strings.

**Ruling: accept.** Both lines redacted using the placeholders the file already used elsewhere. The
header now states what is true and carries a note recording that it was false, what it said, and why
no live system is affected — so the correction is visible rather than quiet.

**Git history is deliberately NOT rewritten, and the reason is recorded so it is a decision rather
than an omission.** The values sit in earlier commits on a pushed branch. Rewriting history would
force-push a branch under active review, invalidate the SHA this audit ran against and the CI runs
attached to it, and buy nothing — the values are local-development-only and valueless off this
machine. Scrubbing forward is proportionate. **If the founder wants history rewritten, that is the
founder's call and it is cheap to do before merge; it is named here rather than assumed away.**

**A scan of every changed file for residual credential-shaped values comes back clean.** The only
remaining hits are git SHAs and two deliberately synthetic test vectors in `runner.selftest.ts` — a
hand-made JWT whose payload decodes to a service-role claim, and an obviously fabricated
`sb_secret_`-prefixed string — which exist to prove the redactor redacts, are pre-existing on `main`,
and are not reproduced here for the same reason.

---

## FINDING 5 — MEDIUM — three comments still call the acknowledgment IP the "source address". **ACCEPTED.**

**The auditor's claim, verbatim:**

> The comment still calls the acknowledgment value the request's "source address," with the same
> wording in `_contract.ts:79` and the test diagnostic at `a-signup-and-signin.test.ts:95`.
> why it matters: It contradicts the narrowed claim that the stored value is only an unauthenticated
> gateway-reported address.

**Verified — all three sites, exactly as described.** This directly contradicts E1, which narrowed the
claim **on the strength of a measurement**, not caution: on the live local stack a spoofed
`x-forwarded-for` was stored verbatim, and with no header at all the stored value was `172.18.0.1`,
the Docker bridge — the gateway's own hop, not the client.

**Ruling: accept.** This is squarely the discipline the plan states outright: *"A clause named unproved
here may not be described as proved anywhere else in this item."* Four reviewers raised this property
and all four marked it unverifiable by reading; it was then measured and the measurement settled
against the item. Three comments still saying "source address" is precisely how a narrowed claim
quietly widens again.

Corrected at all three sites, matching the wording `edge.ts:172` already carries — the address the
gateway chain **reported**, never a verified source address. The `_contract.ts` field comment now
carries the measurement itself, so the next reader meets the evidence rather than a bare assertion.
**No assertion changed; only the messages and comments.** `a-signup-and-signin.test.ts:95` still pins
the same value — what it proves is that the reported value reaches the row intact, which is true and
worth pinning.

---

## FINDING 6 — MEDIUM — AT-001.07's comment claims fixture-only work as a shipped-module property. **ACCEPTED.**

**The auditor's claim, verbatim:**

> The AT-001.07 comment calls fixture-only provisioning and sign-in a real property of the shipped
> decision module.
> why it matters: The loop test can remain green while real administrator authentication fails,
> although the claims table assigns that proof to live check (g).

**Verified, and the auditor's two apparently contradictory verdicts are both correct** — it scored B17
as **YES** in the ruling-fidelity box and this comment as **FALSE** in the claim-truth box. Both hold,
and resolving that is what makes the finding worth accepting rather than dismissing as an
inconsistency:

- B17 required a disclaimer that a real administrator really authenticating belongs to live-stack
  check (g). **That disclaimer is present and correct**, at lines 316–319. B17 was implemented.
- A **different** sentence, immediately above it, was not part of B17 and is false. It listed three
  things and closed *"That is a real property of the shipped decision module."* Of the three, only
  the refusal is — `validateCompleteSignup` in the shared module. The other two, that the type is
  carried and that a session resolves, are the **adapter's Map** answering.

So the comment simultaneously disclaimed the strong version and asserted a weaker version of the same
overclaim four lines earlier.

**Ruling: accept.** Rewritten to separate the two strengths of evidence explicitly: the refusal is a
real property of shipped code the suite imports rather than copies; the carry-and-sign-in half is
adapter storage, which proves the test is well-formed and says nothing about the real schema or a
real Auth. **No assertion changed** — this is a comment that was claiming more than the per-id table
allows, and the comment is what moves.

---

## FINDING 7 — LOW — `PHASE-STATE.md:90` names a stale head. **ACCEPTED.**

**The auditor's claim, verbatim:**

> The state file identifies `b4688fe` as the head although the checked-out head is
> `553d2bb43c1cff7593681d592e9194580ec03ff8`.
> why it matters: A reader following the state file can inspect a superseded commit and miss the final
> claims-table and record corrections.

**Verified.** True, and it is the ordinary consequence of a state file being written just before the
commit that carries it. **A state file cannot name the commit that carries it** — the SHA does not
exist until the file is written. The stale value came from naming a head at all rather than naming the
one thing a state file can honestly say about its own position.

**Ruling: accept.** `PHASE-STATE.md` is rewritten wholesale by this sitting, and the head line now
describes what the file can actually know — the sitting it closes and how to obtain the real head —
rather than a SHA that is stale the moment it is committed.

---

## MY OWN FINDING, which the audit could not have made — **the live pull request body was never updated**

The auditor is read-only **on the tree**, and this defect is not in the tree. It is on GitHub.

**B18 ruled that `pr-body.md`'s three false statements be corrected. The file was corrected — the
auditor confirmed it at Box A item 18, and it was right. The correction was never published to the
pull request.** Read back from the GitHub API during this sitting, PR #47's live body still said:

- *"**This pull request currently carries the plan only.** No code exists yet."*
- *"The **first edge function**, `complete-signup`"* — there are two.
- *"the acceptance runner's `--wired` flag ... is not implemented yet"* — it is implemented; the
  screen driver is what does not exist.

**All three are the exact statements B18 ruled false.** So the item's public face — the first thing a
human reviewer reads — carried three false statements through the entire fix sitting and the audit,
while the record showed the ruling as implemented. **A ruling is not implemented when the file
changes; it is implemented when the thing the ruling was about changes.** `pr-body.md` is a
convenience copy. The pull request body is the artifact.

**Ruling: accept, mine.** The corrected body is published to PR #47 in this sitting, and publishing is
verified by reading it back rather than by the absence of an error.

**This is a gap in the audit brief and it is named for the next item:** the brief scoped the auditor
to the tree, so nothing in the process ever compares `pr-body.md` to the live pull request body. The
same gap would recur on any item.

---

## THE TWO FOUNDER RULINGS, folded in

Both arrived on `main` and were not in this worktree; both are now carried in the record.

**1. The second draft-code reader is stopped permanently.** A single reader is the design going
forward, **not a temporary degradation awaiting repair**. The pull request body states the two facts
**separately**, as ruled, with no averaging:

- the SQL and configuration slice had **one** completed reader (terra, 8 findings) where the
  two-reader design applies;
- the TypeScript and tests slice had **both** readers complete (terra 11, kimi 7).

The prior body blended these into a single sentence — *"designed as four independent reads and only
three completed"* — which is arithmetically true and hides which half of the change is thinner. It is
rewritten. The section also no longer reads as a defect report against the process, since the
one-reader design is now the intended design.

**2. The Google OAuth credential does not exist on this machine**, verified directly by the founder:
neither environment variable is set in any shell or user environment, `.env` has no Google entries,
`.env.local` does not exist. **The honest skip in the live-stack proof — check (f2) — remains a skip
and is never upgraded to a pass anywhere in the record.** The pull request body now says this in its
own paragraph rather than leaving it to the reader to infer from a transcript, including that an
earlier version of the proof script would have counted that skip as a pass — a defect this item found
in itself and fixed.

---

## Verification run in this sitting

Re-run locally after every fix above, at the new head, by me and not taken from a report:

| command | result |
|---|---|
| `bun run typecheck` | **exit 0** — app and acceptance-test projects both clean |
| `bun run at:selftest` | **exit 0 — 9 files, 251 tests passed.** This is the job that would catch the encoding repair breaking a harness self-test |
| `bun run at:check req-001` | **exit 0** — 37 P0 in the acceptance file, 37 registered, in bijection |
| `bun run at:check req-016` | **exit 0** — 12 P0 in bijection |
| `bun run at:verify req-001 --tier loop --expect` | **exit 0 — 37 P0: 4 green, 33 red, 0 missing**, matching the declaration exactly |
| `bun run at:verify req-016 --tier loop --expect` | **exit 0 — 12 P0: 11 green, 1 red, 0 missing**, identical to the step-0 baseline |

The four real acceptance bodies (AT-001.01, .03, .06, .07) are green after the comment corrections,
and `req-016` is untouched — which is the control that says this sitting's edits reached nothing
outside their own item.

**`bun run build` was deliberately NOT run**, for the standing reason in `PHASE-STATE.md`: it rewrites
`src/routeTree.gen.ts`, and a `src/` path in a `supabase|tests|loop` diff fails the territory guard
outright. Nothing fixed in this sitting is anything a build would cover.

---

## DOES THE AUDIT NEED TO RE-RUN? NO — and the cap is deliberately left unused

**The audit re-runs once per item, and only if code changed in a way that would invalidate what it
already checked. That cap is NOT used, and this is the reasoning rather than a convenience.**

What changed in this sitting, exhaustively:

| change | class |
|---|---|
| 27 em-dashes restored in a harness self-test | encoding repair; **restores** text `main` already had |
| three "source address" comments corrected | comment text |
| one assertion **message** reworded (`:95`) | diagnostic string; the assertion is unchanged |
| AT-001.07 comment rewritten | comment text |
| `stack-up.txt` redactions | an evidence transcript, not code |
| `audit-brief.md`, `pr-body.md`, `PHASE-STATE.md`, this file | record |

**No shipped decision logic changed. No SQL changed. No assertion, expectation or test body changed.
No configuration changed.** The only executable-adjacent edits are test names and failure messages —
text that appears in output and never in a judgement.

Every box the auditor checked is therefore either untouched or **more** true than when it checked it:
finding 1's box now passes exactly, finding 2's claim is corrected, findings 5 and 6's comments now
match the claims table. A second audit pass would re-derive the same verdicts on the same code at
cost. **CI on the new head plus the merge sitting's own review is sufficient**, and the re-run stays
available if the merge sitting disagrees.

---

## Caps used

- **The audit re-runs once per item, and only if code changed. STILL NOT USED** — see the reasoning
  above. It remains available to the merge sitting.
- **Executor invocations: none.** This sitting made its own corrections, as an audit sitting may. No
  fix here required code to be written; they are repairs, comments and record.
- **A suspected CI flake gets one re-run with no new commit. Not used** — CI has not run on the new
  head yet.
- **A green local verify against a red CI gets two pushes, then escalation. Not used.**
- Nothing was left undone for want of a round. Everything not fixed here is **filed and named** in
  `PHASE-STATE.md`, never recorded as invalid.

**Nothing escalates to the founder from this sitting.** No finding contradicted ratified text, and
nothing here is scope growth: five repairs, one rejection with its reason, one record correction.
