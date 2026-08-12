# Merge sitting — rulings. AI4DEV-62 (per-org roles and isolation), batch with AI4DEV-63 (single seat, single developer)

**Orchestrator on opus @ max.** The merge sitting runs on opus BY DESIGN, to spare fable (founder
ruling 2026-08-11). It is not a credit-out fallback.

Chain, derived from the branch and confirmed against Linear:
`AI4PM-19 (auth and org membership)` > `AI4DEV-50 (auth root)` >
`AI4DEV-53 (org membership and seats)` > `AI4DEV-62 (per-org roles and isolation)`.
The partner `AI4DEV-63 (single seat, single developer)` rides this branch. Linear's own branch
name for AI4DEV-62 matches the checked-out branch exactly.

**THE RULING IN ONE LINE: the merge is BLOCKED, and the cause is not CI. The branch is no longer
integrated with main, so the tree that would land is not the tree that was verified and audited.**

---

## 1. The blocking finding — the branch conflicts with main

`AI4DEV-65 (who signed)` merged to main at 09:29 local on 2026-08-12. It edited the same shared
req-001 acceptance-test suite that this branch edits. GitHub reports the pull request as
`mergeable: CONFLICTING`, `mergeStateStatus: DIRTY`.

A dry-run merge (`git merge-tree --write-tree HEAD origin/main`, conflicted tree
`692f9ef`) names five content conflicts. No working tree was modified to obtain them.

| file | what collides |
|---|---|
| `tests/at/expected/req-001.json` | both items add their own green ids to one manifest |
| `tests/at/suites/req-001/_pending.ts` | both items remove their own leaf labels and restate the counts |
| `tests/at/suites/req-001/_contract.ts` | this branch adds `ProjectRow`; main rewrites the acknowledgment-row comment |
| `tests/at/suites/req-001/_integration.ts` | both items add their own arms |
| `tests/at/suites/req-001/c-membership-and-acknowledgment.test.ts` | both items add their own arms |

**Ruling: the CODE is additive everywhere. Exactly one documentation block is contradictory, and
the executor must rewrite it rather than pick a side.** Each side lands a different, disjoint set
of acceptance ids in one shared ledger. This branch lands AT-001.16, .36, .37, .17 and .32. Main
lands AT-001.19, .39 and .20. This is the collision the shared manifest creates by construction
when two items land in the same requirement. It is **normal integration work, not scope growth**,
so it does not go to the founder.

### The conflict hunks, one by one

Measured against the merge base `ea4f345`. Both sides are pure additions: no side deletes or
rewrites the other's symbols.

| hunk | where | verdict |
|---|---|---|
| manifest | `_contract.ts` green lists, both tiers | ADDITIVE — union the id lists |
| pending A | `_pending.ts` header prose and counts | ADDITIVE — restate to the merged counts |
| pending B | `_pending.ts` `LEAF` map and its comment | ADDITIVE — drop `D3_L1`, `D3_L2` AND `D4_L1` |
| contract | `_contract.ts` row comments | ADDITIVE — this branch adds `ProjectRow`, main rewrites the acknowledgment-row comment |
| integration A | `_integration.ts` imports, line 31 | ADDITIVE — `inviteOrAddMemberSurface` against `ACKNOWLEDGMENT_IDENTITY_COPY`, disjoint |
| integration B | `_integration.ts` bodies, line 649 | ADDITIVE — six new names against two, zero overlap; needs ONE closing brace between the blocks |
| test header | `c-membership-and-acknowledgment.test.ts` docblock | **CONTRADICTORY — see below** |
| test imports | same file, imports and constants | ADDITIVE, with a duplicate-name collision — see below |

**The contradictory hunk, and why picking a side is a defect.** The file-header comment of
`c-membership-and-acknowledgment.test.ts` carries, on each side, a negative status claim about the
OTHER side's ids. This branch writes that AT-001.18, .19, .39 and .20 "belong to leaves further out
and stay declared". Main writes that the membership ids "are still not landed" and that none is
"enforced by anything shipped yet". After the merge BOTH claims are false. **Ruling: the executor
rewrites this comment to the merged truth** — AT-001.16, .36, .37, .17, .19, .39 and .20 are all
landed and written; AT-001.18 alone stays declared, on `LEAF.D3_L3`. Taking either side verbatim
would leave a false statement about the code in the suite's own header, which is the exact defect
class the audit grades.

**The duplicate-name collision.** `TEXT_VERSION`, `CLIENT_IP` and `PASSWORD` appear on main's side
of the marker and again in the cleanly merged text below it. **The values are identical on all
three** (`'tos-2026-01+promise-2026-01'`, `'203.0.113.7'`, `'correct horse battery staple'`); only
`CLIENT_IP`'s doc comment differs. **Ruling: keep ONE declaration of each. This is a name
collision, not a value disagreement, so no behaviour is decided by the choice.** The union also
produces two separate `import` statements from `'./_integration.ts'`; the executor merges them into
one.

### The merged numbers, computed from the conflicted tree

| tier | before (this branch alone) | after the merge |
|---|---|---|
| req-001 loop | 18 green / 19 red | **21 green / 16 red** |
| req-001 integration | 13 green / 24 red | **16 green / 21 red** |
| migrations applied | 4 | **5** |

Arithmetic: 13 base green + 5 from this branch + 3 from main = 21 loop green; 8 base + 5 + 3 = 16
integration green; both sum to 37 with their reds. The red blocks auto-merged cleanly, because the
two sides delete different entries.

**Consequence, and it is the reason this sitting cannot write a merge ruling: every number a merge
ruling would state is changed by the merge.** The recorded evidence is true of a tree that cannot
land.

## 2. A second defect, created by the integration and seen by no gate

The merged tree holds two migrations with the SAME version stamp:

- `supabase/migrations/20260811120000_acknowledgment_signer_identity.sql` (from main)
- `supabase/migrations/20260811120000_org_membership_ngo_only_and_organization_rename.sql` (this branch)

Neither audit reader could see this. Each read one tree, and the collision exists only in the
merge. The integration harness asserts `N migrations expected, N applied`, and a migration version
is a key. **Ruling: VERIFY FIRST.** The executor measures whether the merged set applies to slot 2.
If the duplicate version breaks the apply or reorders it, the executor renames THIS branch's
migration to `20260811125000_org_membership_ngo_only_and_organization_rename.sql`. That stamp keeps
main's migration first, which is the true order, and keeps this branch's own two migrations in
their existing order. The executor never renames a migration that is already on main.

## 3. CI — no run exists, and the cause is NOT a dropped webhook

`loop/work/ci-status.ps1 -Sha 0b8517d…` reports `run NONE EXISTS for this head` and prints a
standing hint: a dropped webhook never replays, so resume with a fresh event. **That hint is wrong
for this case, and this sitting did not act on it.** The script says so itself: "These are
observations. Whether they excuse a red check is a ruling, not an output."

Measured, with two instruments (`gh run list` and the check-runs API):

- The last CI run on this branch is on head `65a9d4f`, conclusion `success`, 2026-08-11T21:01:22Z.
- The seven commits after it — `1bf6ac0`, `90c3ed9`, `bcb91cf`, `ca1a8e4`, `f5de217`, `07bae19`,
  `0b8517d` — have ZERO workflow runs and ZERO check runs between them.
- GitHub Actions is `operational`, with no open incident.
- `.github/workflows/ci.yml` triggers on `pull_request` to main, and on `push` to main only. This
  branch is not main, so only the `pull_request` trigger can fire.
- Every one of those seven pushes happened AFTER main took the conflicting commit at 09:29 local.

**Ruling: the missing run is a deterministic consequence of the conflict, not an infrastructure
fault.** GitHub builds a `pull_request` run against the computed merge of head into base. While the
pull request is `DIRTY`, that merge does not exist, so no run is created. Seven consecutive missing
runs, bounded exactly by the commit that created the conflict, is not seven dropped webhooks.

This classification matters in practice. Had this sitting followed the script's hint and pushed an
empty commit to force a fresh event, it would have produced nothing, because the branch would still
conflict. CI dispatches again on the push that resolves the conflict. **No re-trigger is needed and
none was made.**

## 4. The audit panel — both readers clean, and both verdicts are recorded here

The panel is clean, so no audit sitting exists. This sitting records both verdicts, as its contract
requires.

- **luna (codex, gpt-5.6-luna, effort max, read-only sandbox): AUDIT CLEAN, 0 findings.** All three
  boxes PASS. Box 1: every claim-checklist line C1–C13 PASS with cited `file:line` evidence. Box 2:
  the source-only diff holds exactly the fifteen declared files. Box 3: every stated fact F1–F6
  PASS. No test execution attempted, and the reader says so.
- **flash (opencode-go/deepseek-v4-flash, variant max, agent `reviewer-flash`): AUDIT CLEAN, 0
  findings.** All thirteen checklist lines and all six stated facts PASS on head-state evidence.

### Ruling on flash's two COULD-NOT-VERIFY boxes

Flash's cage holds no shell tool, so it could not run the pinned `git diff ea4f345...f5de217`. Two
verdicts came back COULD-NOT-VERIFY: the negative half of Box 2 ("nothing else in the source-only
diff"), and the delta half of facts F1 and F2. The reader disclosed the limit before any box, and
graded the rest by reading all fifteen files at head.

**Ruling: for the tree at `0b8517d`, the panel covered those boxes, and nothing further was
needed.** The gap is exactly the box luna reached with an instrument flash lacks — luna's sandbox
has the shell, and luna graded the source-only diff PASS against the same fifteen declared files.
A panel of two blind readers covers a box when either seat reaches it with a sound instrument. The
COULD-NOT-VERIFY verdicts are a disclosed method limit, not a defect and not a silent gap.

**This ruling is superseded in effect by the merge.** The merge changes the diff, so both boxes are
re-established at the new head by the audit re-run. The ruling is recorded because it was owed.

### Flash's note about two file names, and what it obliges

Flash noted, outside its findings, that two of the brief's "unchanged file" claims name files that
exist nowhere in the tree: `bun.lockb` and a root `vitest.config.ts`. It judged this a naming
carry-over in the audit prompt itself, not a defect in this item's code, and observed that the
claims are therefore vacuously true.

**Ruling: flash is right, and the defect is in the instrument, not the code.** A claim that cannot
fail proves nothing. **The rebuilt claim checklist for the audit re-run must not carry either name.**
Every "unchanged file" claim in it must name a file that exists in the tree.

## 5. Both tiers' exact-match results, as measured — and now superseded

Recorded for completeness from `artifacts/goal-runs.md`. All four runs exit 0 under `--expect`, at
head `bcb91cf`, with ZERO fix iterations.

| run | requirement | tier | result | exit |
|---|---|---|---|---|
| 1 | req-001 | loop | 18 green / 19 red / 0 missing — exact match | 0 |
| 2 | req-001 | integration | 13 green / 24 red / 0 missing — exact match | 0 |
| 3 | req-016 | loop | 11 green / 1 red / 0 missing — exact match | 0 |
| 4 | req-016 | integration | 0 green / 12 red / 0 missing — exact match | 0 |

Both integration runs carry the identical slot evidence line, verbatim:

```
at:verify — db slot 2 (ai4good-slot-2, api 56321) — reset OK — migrations: 4 expected, 4 applied
```

**The code these runs graded is the code at `0b8517d`.** Measured, not assumed: between `bcb91cf`
and `0b8517d` the only non-record file that changes is `src/routeTree.gen.ts`, which the
fix-and-goal sitting already ruled as build-regenerated and which was present in the working tree
during all four runs. Everything else in that range sits under `loop/items/AI4DEV-62/`.

**These four results do not license a merge**, because the merge changes the manifest they matched
against. They are superseded and must be re-run.

## 6. The `Closes AI4DEV-63` line — ruled ABSENT for now

The batch partner's closing line is still absent from the pull-request body, and this sitting keeps
it absent.

**Ruling: the closes-line rides with the merge ruling that actually merges, and no merge happens
this sitting.** Adding it now would put a closing instruction on a pull request that is not going
to land, which is the exact hazard the naming rule exists to prevent. The next merge sitting adds
it, as one line of exactly the shape `Closes AI4DEV-63`, alone on its line, at most one in the
body. That remains the one sanctioned place in this batch.

**No mechanical was spawned this sitting**, because nothing was owed to the pull request. The body
stays as published, with non-closing references only.

## 7. Residuals carried forward from earlier phases

These stay open and belong in the eventual merge ruling. None of them blocks a merge on its own.

1. **The fixture's malformed-id transport divergence** (gate-2 residual R2). The stand-in and the
   real database disagree on the transport shape of a malformed id.
2. **The `platform_admin` reading is pinned by text, not by an arm** (gate-2 residual R5).
3. **AT-001.17's source arm is a naming oracle** (gate-1 finding 3). It reads source text, so it
   proves the absence of invite naming, not the absence of invite capability.
4. **AT-001.16's green claims operation-surface isolation only** (gate-1 finding 1). Read-surface
   breadth stays with the tenant-isolation leaf.

## 8. After the integration — the executor's two merge-created findings, ruled

The executor merged main in at `ac1301a` and reported two defects that exist ONLY in the merge.
Neither audit reader could have seen either one, because each read a single tree. Both are ruled
here. Head after the integration: `dce5dde`.

### 8a. The duplicate migration version — PROVEN, and worse than suspected

The verify-first condition of section 2 came back proven, measured on slot 2 before any rename,
with three agreeing instruments: `supabase db reset` exited 1; only 3 of 5 rows reached
`supabase_migrations.schema_migrations`, because `version` is that table's key; and the catalog,
asked object by object, reported `update_organization` absent, the `org_memberships` trigger
absent, and the `projects` table absent.

**Ruling: adopted. This was not a tidiness issue — BOTH of this item's migrations were missing from
a database the harness would otherwise have graded against.** A merged tree in this state would
have produced integration results about a schema this item never reached. The executor renamed this
branch's file forward to `20260811125000_org_membership_ngo_only_and_organization_rename.sql`, left
main's migration untouched, and the control run reports 5 expected and 5 applied.

The executor also reported, rather than hid, that the CLI's own failing statement never reaches the
thrown message, because `runner.ts` keeps only the first non-empty stderr line. **Ruling: that is a
real instrument limit and it is recorded. It changes nothing here, because the database readings —
not the CLI's message — establish the fact.** It is filed, not built.

### 8b. The mandatory identity fields — a semantic conflict with no textual conflict

The acknowledgment-identity leaf makes signer name, title and authority attestation mandatory in
the shared `validateCompleteSignup`. This branch's five bodies predate that rule and complete
signups without them. Neither side's text conflicts; the two sides simply disagree about what a
valid completion is. It surfaced as seven deviations on the first verify run.

**Ruling: adopted, and it corrects section 1 of this file.** Section 1 says "the CODE is additive
everywhere". That is true TEXTUALLY and false SEMANTICALLY, and the correction is recorded rather
than quietly amended. A conflict inventory built from `git merge-tree` can only see text. Two
merge-created defects here were invisible to it and visible only to something that RUNS the code —
which is the argument for re-running both tiers after any integration, not just re-reading the diff.

**The executor's one judgment call is CORRECT and adopted.** It added the three fields to every
completion that must SUCCEED, and deliberately left the two that must be REFUSED alone —
`c-membership-and-acknowledgment.test.ts:271` and `_integration.ts:862`, the volunteer completion
carrying an organisation name. This sitting verified the reasoning against the shipped code rather
than accepting it: the refusal returns at `supabase/functions/_shared/accounts.ts:235`, and
`accounts.ts:200-206` states the ordering is load-bearing in those words — "A request that omits the
identity fields for one of those reasons never reaches these checks and its stated reason is
unchanged." Adding the fields there would not change the outcome; it would only hide which check
answered.

## 9. CI ran, and it is RED — the ownership guard. Classified: broken by this change

Resolving the conflict released the dispatch, exactly as section 3 ruled, and with no empty commit:
GitHub created a run for each of the three pushes the moment the pull request became `MERGEABLE`.
**Section 3's diagnosis is therefore confirmed by the fix.**

Run `31614130816` on head `dce5dde` FAILS at the step "Guard against a pull request that changes
both territories":

```
this pull request changes BOTH Lovable territory and Claude territory — split it into two pull requests
Lovable territory (src/):
  src/routeTree.gen.ts
```

**Classification: broken by this change — specifically by the fix-and-goal sitting's adopted
deviation (iii), which committed `src/routeTree.gen.ts` as build-regenerated.** It is not
infrastructure, not a flake, and not pre-existing on main: main's own run on `390042c` is green.
This is the FIRST CI run ever to see that file in this pull request, because the file landed at
`ca1a8e4` and every push after it lost its dispatch to the conflict. The earlier ruling was made
where CI could not answer.

**Ruling: REVERSED. `src/routeTree.gen.ts` is restored to main's version and leaves this pull
request.** The reasons, measured:

- The ownership guard is ratified CI machinery, and it is doing exactly its job. This item's work
  is migrations, edge functions and tests. It has no legitimate need to touch `src/`.
- The file is GENERATED, not authored. The whole difference from main is a type-only
  `declare module '@tanstack/react-start'` block appended at the end. It adds no route.
- **AT-001.17's source arm is unaffected, and this is proved rather than assumed.** The arm
  extracts every quoted string literal from the file and matches them against
  `/invite|add[-_ ]?member|addmember|add[-_ ]?user|adduser/i`. The block's only literals are
  `'./router.tsx'`, `'./start.ts'` and `'@tanstack/react-start'`. None matches. The arm returns the
  same empty array with the block or without it.
- Main is green without the block, so the repository's committed state deliberately does not carry
  it.

I do not propose waiving the guard, and no ruling here loosens it. The item comes into compliance
instead.

**A process finding rides along, filed and not built:** if `bun run build` regenerates a
Lovable-territory file, then every Claude-territory item that builds will dirty `src/routeTree.gen.ts`
and meet this same guard. That belongs to the coordinator to fold, not to this item.

## 10. Step 15 done — the guard ruling carried out, and one method disclosure ruled

Head after step 15: `4235a2e`, pushed, tree clean. `git diff origin/main HEAD -- src/` is EMPTY.
The audited head `0b8517d`, the last-CI head `65a9d4f` and main `390042c` are all still ancestors:
no rebase happened, and the evidence chain holds.

**The build DOES regenerate the block — measured, and the filed process finding now has evidence.**
The executor restored the file, confirmed `git diff -- src/` empty, ran `bun run build` to exit 0,
and `src/routeTree.gen.ts` came back changed by the same ten lines. It also bounded the finding,
which is what makes it useful: `bun run typecheck` and all four `at:verify` runs leave the file
alone. **Only the BUILD writes it, so the restore goes last, after the final build.** That is the
order committed.

**AT-001.17's source arm — my ruling was confirmed first-hand, not taken on trust.** The executor
measured `inviteOrAddMemberSurface()` on both versions of the file: with the block, 19 quoted
literals; without it, 16; both return the empty array. The three literals the block adds are
`'./router.tsx'`, `'./start.ts'` and `'@tanstack/react-start'`, and the arm's pattern matches none.
Checking a proof against the code rather than accepting it is the correct instinct on an arm whose
wrong answer would be a false green.

**The four runs on the restored tree, all exit 0, serial on slot 2 — these supersede every earlier
set:**

| requirement | tier | result |
|---|---|---|
| req-001 | loop | 21 green / 16 red / 0 missing — exact match |
| req-001 | integration | 16 green / 21 red / 0 missing — exact match |
| req-016 | loop | 11 green / 1 red / 0 missing — exact match |
| req-016 | integration | 0 green / 12 red / 0 missing — exact match |

Both integration runs carry the identical slot evidence line, verbatim:

```
at:verify — db slot 2 (ai4good-slot-2, api 56321) — reset OK — migrations: 5 expected, 5 applied
```

No expected count was edited at any point. Total goal iterations for the sitting: ONE.

### The method disclosure, ruled

The executor disclosed that it ran req-001 integration TWICE in this round. The first run passed
with the correct counts, but it truncated its own console capture and lost the slot evidence line.
Rather than quote a line it had not actually seen, it re-ran with the full output captured.

**Ruling: correct conduct, and it is recorded rather than buried.** Both runs were on the same
restored tree and both exited 0, so nothing was selected for its answer — which is the only thing
that would make a repeated run dishonest. Quoting an evidence line one did not observe is exactly
the failure the verbatim rule exists to prevent, and re-measuring to obtain it is the remedy, not a
concession. The line recorded above is the one that was seen.

## 11. What this sitting does, and what it hands on

This sitting rules the blocker and runs ONE executor invocation to integrate the branch with main
and re-verify it. It then pushes and ends, because the code changes and the audit must read the
new head.

**The executor merges main INTO the branch. It does not rebase.** A rebase rewrites the audited
commits, and every SHA in this record — including the audited head `0b8517d` — would stop being an
ancestor. The pull request squash-merges, so a merge commit in the branch costs nothing and keeps
the evidence chain intact.
