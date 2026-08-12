# Goal runs AFTER the merge with main — AI4DEV-62 (per-org roles and isolation), batch with the single-seat partner item

This file supersedes `goal-runs.md`. Those four runs graded a tree that cannot land: main took the
acknowledgment-identity leaf, that leaf edits the same shared req-001 acceptance-test suite, and the
merge changes every number they matched against. The runs below grade the merged tree.

Executor sitting, fix-and-goal pass. Plan steps 10 to 14 (`plan.md`, the amendment).
Reserved database slot: **2**. No second slot was reserved and slot 1 was never touched.

---

## 1. The verify-first measurement — the migration version collision (plan step 12)

**PROVEN. The duplicate version stamp breaks the apply.** Measured BEFORE any rename, on slot 2,
through the pool's own guarded seam (`occupy` then `prepare`, which mirrors the merged item tree
into the slot and resets the slot database from it). Nothing about the migration set was changed
before this ran.

The merged tree held two migrations under ONE version stamp `20260811120000`:

- `20260811120000_acknowledgment_signer_identity.sql` (from main)
- `20260811120000_org_membership_ngo_only_and_organization_rename.sql` (this branch)

### What three instruments said

**(a) What the tree declares.** `expectedMigrations()` maps each file to its 14-digit version and
returns the list. It returned five entries with one repeated:

```
expectedMigrations() length = 5
expectedMigrations() versions = ["20260808120000","20260809090000","20260811120000","20260811120000","20260811130000"]
duplicate version stamps in that list = ["20260811120000"]
```

**(b) What the reset did.** It failed.

```
db-pool — slot 2 identity proven before the reset: project ai4good-slot-2, api 56321, db 56322
db-pool — docker confirms slot 2's own database container before the reset: supabase_db_ai4good-slot-2
prepare() THREW: `supabase db reset` exited 1: Resetting local database...
```

(The reported text is one line only. `diagnostic()` in `runner.ts:210-217` keeps the FIRST non-empty
line of the captured stderr, so the CLI's own failing statement is not in the message. The database
readings below are what establish the fact, and they are stronger than a message.)

**(c) What the database recorded.** Three of five, and the missing two are exactly the ones after the
collision:

```
rows in supabase_migrations.schema_migrations = 3
  applied: version=20260808120000  name=accounts_org_membership_and_acknowledgments
  applied: version=20260809090000  name=volunteer_github_link_and_imported_profile
  applied: version=20260811120000  name=acknowledgment_signer_identity
migrationSetProblems(expected, applied) = ["never applied: 20260811130000"]
```

`version` is the key of `supabase_migrations.schema_migrations`, so one row is all two files can ever
produce. The CLI applies in sorted filename order, and `acknowledgment...` sorts before
`org_membership...`, so MAIN's migration ran and this branch's did not.

**(d) The catalog, asked object by object.** Not "a migration is missing" but "which objects are
absent":

```
this branch's migration — function update_organization: n=0
this branch's migration — trigger on org_memberships: n=0
main's migration — a signer-identity column on acknowledgments: n=2
the later migration — projects table: n=0
```

So this branch's colliding migration never ran, and the migration AFTER it never ran either. Both of
this item's two migrations were silently absent from a database the harness would otherwise have
graded against.

### The action the ruling licenses, and the control

All three of the ruling's conditions hold — the duplicate breaks the apply, skips a migration, and
changes the effective order. This branch's file was renamed to
`20260811125000_org_membership_ngo_only_and_organization_rename.sql`. The stamp moves FORWARD, not
back, because the acknowledgment-identity migration really did land first. **The migration already on
main was not renamed.**

**The control is run 2 below**: after the rename the same guarded reset reports `5 migrations
expected, 5 applied`. That is the confirming half of the measurement — the failure and the repair are
attributable to the duplicate version and to nothing else.

---

## 2. The four runs

All four exit 0 under `--expect`, run serially against reserved slot 2.

**These are the runs taken AFTER `src/routeTree.gen.ts` was restored to main's version** (section 5).
An earlier set of four ran before that restore and reported the same numbers, but it graded a tree
that no longer exists, so it is superseded and not recorded as the evidence. AT-001.17's source arm
reads that file, which is why the runs were taken again rather than reused.

| run | requirement | tier | result | exit |
|---|---|---|---|---|
| 1 | req-001 | loop | 21 green / 16 red / 0 missing — exact match | 0 |
| 2 | req-001 | integration | 16 green / 21 red / 0 missing — exact match | 0 |
| 3 | req-016 | loop | 11 green / 1 red / 0 missing — exact match | 0 |
| 4 | req-016 | integration | 0 green / 12 red / 0 missing — exact match | 0 |

Every number matches the merge sitting's arithmetic exactly. **No count in
`tests/at/expected/req-001.json` was edited to make a run agree with it.** The manifest was written
once, by unioning the two sides' green lists as the per-hunk ruling directs, and both runs then
matched it.

### The slot evidence lines, verbatim

Run 2, req-001 at integration tier:

```
at:verify — db slot 2 (ai4good-slot-2, api 56321) — reset OK — migrations: 5 expected, 5 applied
```

Run 4, req-016 at integration tier:

```
at:verify — db slot 2 (ai4good-slot-2, api 56321) — reset OK — migrations: 5 expected, 5 applied
```

The two lines are identical, and that is correct rather than a copy: both runs took the same reserved
slot and rebuilt it from the same five-migration tree. Each run performed its OWN reset — the
identity proof and the container confirmation are printed once per run — so the second line is a
second measurement, not a repeat of the first.

---

## 3. Iteration count: ONE

One goal iteration ran, and this is what changed inside it.

**The first run of run 1 failed**, with seven deviations: five of this branch's own ids reported red
while declared green, plus the two count lines that follow from them. Every one of the five failed
the same way — `the NGO actor could not complete signup`, `the volunteer could not complete signup`.

**The cause is a SEMANTIC conflict that the textual merge could not show, and no gate could have
seen it.** The acknowledgment-identity leaf makes signer name, signer title and the authority
attestation mandatory on EVERY completion, in the shared `validateCompleteSignup`. This branch's five
bodies were written before that rule existed and call `completeSignup` without those fields. Neither
side's text conflicts; the two sides simply disagree about what a valid completion is. It is the same
class of defect as the migration collision above: visible only in the merge, and only to something
that runs the code.

**The fix**: every completion in this branch's bodies that must SUCCEED now carries the three fields,
using the shipped-constant idiom the identity leaf established (`...SIGNER`, with the attestation
imported from `supabase/functions/_shared/acknowledgment-copy.ts` rather than restated).
`f-lifecycle-and-audit.test.ts` gained the constant and the import, because the identity leaf never
touched that file and its one written body needs three successful completions.

**The two completions that must be REFUSED were deliberately left alone** —
`c-membership-and-acknowledgment.test.ts:271` and `_integration.ts:862`, both the volunteer
completion carrying an organisation name. That refusal is pinned to the check at
`supabase/functions/_shared/accounts.ts:230-236`, which runs BEFORE the four identity checks
(`accounts.ts:200-206` states that ordering and why it is load-bearing). Adding the fields there
would have changed nothing except to hide which check was answering. This is the identity leaf's own
doctrine, applied to this branch's bodies.

**After the fix all four runs passed on their first attempt.** No second iteration was needed and
none was run.

**Round 2 of this sitting added NO goal iteration.** It carried out one ruled change — the
generated-file restore in section 4 — and re-ran all four to describe the restored tree. Every run
passed first time and no count moved. The iteration count for the whole sitting stays at ONE.

---

## 4. The ownership guard — deviation (iii) is REVERSED (plan step 15)

CI ran for the first time since the integration and went RED on head `dce5dde`, run `31614130816`,
at the step "Guard against a pull request that changes both territories". One file did it:
`src/routeTree.gen.ts`, which is Lovable territory. The fix-and-goal sitting had adopted it as
build-regenerated where CI could not answer. The merge sitting reversed that ruling
(`merge-rulings.md` section 9), and this sitting carried the reversal out.

`git checkout origin/main -- src/routeTree.gen.ts`. The whole difference was ten lines: a type-only
`declare module '@tanstack/react-start'` block appended at the end. It adds no route.

### AT-001.17's source arm is unaffected — measured, not assumed

The ruling states this. This sitting ran the arm on BOTH versions of the file rather than taking it
on trust, because the arm reads that exact file and a wrong answer here would be a false green.

| | with the block | without the block |
|---|---|---|
| `src/routeTree.gen.ts` bytes | 1797 | 1562 |
| quoted string literals found | 19 | 16 |
| `inviteOrAddMemberSurface()` | `[]` | `[]` |

The three literals the block adds are `'./router.tsx'`, `'./start.ts'` and `'@tanstack/react-start'`.
The arm's pattern is `/invite|add[-_ ]?member|addmember|add[-_ ]?user|adduser/i`. None of the three
matches, so the arm returns the same empty array either way. The ruling is confirmed first-hand.

### The standing fact: `bun run build` DOES regenerate the block

Measured on this tree, and it is a fact about the repository rather than about this item.

1. Restore the file to main's version — `git diff -- src/` is empty.
2. Run `bun run build` — it exits 0.
3. `git diff --stat -- src/` reports `src/routeTree.gen.ts | 10 ++++++++++`. The same ten lines are
   back.

So any Claude-territory item that builds will dirty a Lovable-territory file and meet this guard.
That is the process finding the merge sitting filed, and this measurement is the evidence for it.

**Two other commands were tested and do NOT regenerate it:** `bun run typecheck`, and all four
`at:verify` runs. `git diff -- src/` stayed empty across every one of them. Only the build writes
the file, so the restore is done LAST, after the final build, and the committed tree is the tree
that ships.

## 5. What this sitting did NOT do

- It did not rebase. Main was merged INTO the branch (`git merge origin/main`, main at `390042c`),
  so every audited SHA — `0b8517d` above all — is still an ancestor.
- It did not touch the pull request, the board, or anything outside this tree.
- It did not reserve a second slot, and it never touched slot 1 or the personal stack.
- It did not edit any historical record. The reviewer raw output, the distillates and the gate
  prompts under `loop/items/AI4DEV-62/` still name this branch's migration by its OLD file name,
  because they describe the tree as it was at the head they graded. Renaming a file does not make a
  past reading of it false, and editing evidence to match a later tree would.
- It did not repair the environment. Docker was already up and slot 2 was already running when this
  sitting started, so no repair step was needed and none is recorded.
- It did not propose waiving the ownership guard, and it changed no CI machinery. The item came
  into compliance instead, which is what the ruling directs.
