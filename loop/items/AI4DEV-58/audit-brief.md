# AI4DEV-58 — the pre-merge AUDIT brief

**Head to audit:** the pushed branch head that carries this brief — the conductor names the
exact SHA when launching you (a file cannot know the commit that carries it).
**Branch:** `nirdrang/ai4dev-58-github-sign-in-and-the-mandatory-github-link-for-volunteers`
**The change:** `git diff main...HEAD`

---

## WHAT YOU ARE AUDITING — read this before anything else

**Your subject is THE CLAIM, never the code's quality.** You are not asked whether this is good
code, whether you would have designed it differently, or whether it could be simpler. Three
questions, and only these three:

1. **Does every adopted ruling appear in the tree as ruled?**
2. **Does the diff stay inside its declared scope?**
3. **Is every stated fact about the code true?**

A defect in code this branch never touched belongs to another item. Say so and move on.

**You have whole-tree access and change-only scope.** Read anything you need in order to judge
the change; report only on the change.

## DO NOT EXECUTE ANYTHING. This is not a limitation of trust — it is what the record shows works

**Do not run the test suite, the acceptance harness, the type-checker, the local Supabase stack,
the proof script, or the build.** Execution evidence belongs to continuous integration, which
gates this merge on its own.

Measured across prior items: an auditor's execution attempts produced almost nothing except
"could not verify", and once produced two FAIL verdicts that were artifacts of its own sandbox —
while **every reading-and-tracing question it was given came back answered.** Every box below is
a reading-and-tracing question. Answer those.

**`bun run build` in particular must never be run on this branch.** It rewrites
`src/routeTree.gen.ts`, and continuous integration fails any pull request touching both `^src/`
and the backend territories. Running it would create the defect you are auditing for.

---

## The record you are auditing against

| file | what it is |
|---|---|
| `loop/items/AI4DEV-58/plan.md` | the twice-amended plan — decisions, steps with done-criteria, **section 4, the per-acceptance-id claims table** |
| `loop/items/AI4DEV-58/gate1-rulings.md` | the plan-review rulings (F1–F5) |
| `loop/items/AI4DEV-58/draft-rulings.md` | the draft sitting's rulings, including the split trigger and three executor deviations |
| `loop/items/AI4DEV-58/gate2-rulings.md` | **this sitting's rulings** — R1–R7 over eight findings from two review slices, plus the sitting-3 addendum ruling on five executor deviations |
| `loop/items/AI4DEV-58/artifacts/gate2-sql-terra-distilled.md`, `gate2-ts-terra-distilled.md` | the findings the rulings dispose of (raw outputs beside them) |
| `loop/items/AI4DEV-58/migration-replay.txt` | the refreshed catalog capture after the gate-2 migration edits |
| `loop/items/AI4DEV-58/proof-local.txt` | the live-stack transcript (9 checks, 8 passed, 0 failed, 1 skipped) |
| `loop/items/AI4DEV-58/verify-final.txt` | the whole-surface verify capture |
| `loop/items/AI4DEV-58/pending-ledger.txt` | one line per still-pending acceptance id (30) |
| `loop/items/AI4DEV-58/PHASE-STATE.md` | carried facts, filed work, open questions |

---

## BOX SET A — does every adopted ruling appear in the tree as ruled?

Each row names a ruling and what the tree must show. Trace it to the file and say **YES / NO /
PARTIAL**, with the path and line. A ruling implemented *differently from how it was ruled* is a
NO, not a PARTIAL — that is the defect this box set exists to catch. (One deliberate exception is
pre-ruled: the whitespace set spells vertical tab as `\013` because PostgreSQL has no `\v`
escape — gate2-rulings addendum Dev-1. That IS the ruling as ruled.)

| ruling | what the tree must show |
|---|---|
| **F1** (gate 1) | AT-001.05's body asserts `volunteerProfile(accountId)` is null after linking and BEFORE completion; D-C's abandoned-flow analysis present in the plan |
| **F2** (gate 1) | no `array_length` anywhere in the migration's constraints or checks; the empty-array refusal is empirically probed in `proof-local.txt` (the `'{}'::text[]` probe) |
| **F4** (gate 1) | the migration's identity backstop matches `identity_data->>'user_name' = v_github_handle` — binding the HANDLE, not mere existence; the mismatched-handle probe is in `proof-local.txt` |
| **F5** (gate 1) | the provider comment at `tests/at/suites/req-001/a-signup-and-signin.test.ts` (~lines 151–163) is RETAINED, with only its stale mechanical clause updated |
| **R1/R6** | scalar CHECKs are `github_handle !~ '^\s*$'` and `contribution_summary !~ '^\s*$'` (names unchanged); `volunteer_profiles_top_languages_present` calls `public.text_array_entries_all_populated`, an IMMUTABLE SQL function with `set search_path = ''` whose EXECUTE is revoked from PUBLIC; the function body's volunteer branch raises with stated reasons for NULL/blank elements and whitespace-only handle/summary; the refreshed `migration-replay.txt` shows the new constraint definitions and the helper's row |
| **R3** | `_fixture.ts`'s `completeSignup` constructs a GoTrue-shaped `{ identities: [...] }` from stored state and derives the caller fact through the SHIPPED `extractGithubHandle`; no test body changed for this |
| **R4** | the four new rpc parameters carry `default null` (visible in the capture's `pg_get_function_arguments`); `complete-signup/index.ts` OMITS the four github keys when the judged handle is null; the migration's drop paragraph states that source co-location is NOT deployment atomicity, states the bridge, and states the honest residual (volunteer completion unavailable in a mixed-plane window); plan risk 2 is the rewritten version |
| **R5** | `revoke all on table public.volunteer_profiles from anon, authenticated, service_role;` present; the "no grant" comment replaced by the measured default-privilege reality; the capture's privilege matrix shows ZERO rows for those three roles on `volunteer_profiles` |
| **R7** | `_fixture.ts` header and `supabase/functions/_shared/edge.ts` cite `loop/items/AI4DEV-58/proof-local.txt` with its REAL counts (9 checks, 8 passed, 0 failed, 1 skipped), keep the Google-handshake caveat, add the GitHub-handshake caveat, and retain the predecessor's transcript for `create-organization` only, stating its completion-path and schema evidence is superseded |

**Rulings that were REJECTED or deliberately left undone. A tree that implements one of these is
a finding, because it means a ruling was overridden by whoever was typing:**

- **R2** — NO SQL-side provenance check of the stub statistics may exist (no fingerprint
  arithmetic mirrored into the migration). The plan's section 4 must carry the
  provenance-not-claimed sentence instead.
- **Gate-1 F3** — no unlink guard, no unlink policy, nothing calling Auth's unlink surface. The
  product question is FILED in PHASE-STATE, not built.
- **R4's rejected remedy** — no staged two-order deployment demonstration; the bridge plus the
  single realisable probe (five-named-argument NGO call, proof check d3) is the adopted form.
- **Predecessor-table grants** — the residue measured on the four pre-existing tables
  (`accounts`, `acknowledgments`, `org_memberships`, `organizations`) is MEASURED ONLY in the
  capture. A diff line touching their grants would be scope escape (it is pre-existing on main,
  handed up for filing).

---

## BOX SET B — does the diff stay inside its declared scope?

1. **Territory.** `git diff main...HEAD --name-only` must match `^src/` **zero times**.
2. **Read-only files.** `.taskmaster/docs/acceptance/at-req-001.md` and `loop/decomp/req-001.md`
   must be unchanged.
3. **Foreign item ids.** No **pull-request title**, **pull-request body** or **commit message**
   may name any board item id other than `AI4DEV-58`. **This rule does NOT extend to file
   contents** — Linear links from PR text and commit messages, not from diffs; the repository's
   guard reads only the PR title and body; and `main` already carries dozens of item ids in
   files. (The predecessor's brief stated the wider rule, produced a false finding, and was
   corrected — the correction is folded in here from the start.) Check `pr-body.md`, the live
   pull-request title and body, and `git log main..HEAD` messages.
4. **Scope of the sittings.** Every changed file should trace to a gate-1 ruling, a gate-2
   ruling, or a plan step. Name anything that does not.
5. **Secrets.** No credential, key or token in any changed file. `proof-local.txt` was required
   REDACTED FROM THE START — no service-role key, no JWT verbatim. Read it and confirm.

---

## BOX SET C — is every stated fact about the code true?

For each, trace it and answer **TRUE / FALSE / CANNOT BE DETERMINED BY READING**. The last
answer is legitimate and better than a guess.

1. **`plan.md` section 4's claims table.** For each of AT-001.02/.04/.05: does the "proved at
   loop tier" column describe something the test body **actually drives**, and does the "not
   proved" column omit nothing the tree shows is unproved? The table's own rule: a clause named
   unproved there may not be described as proved anywhere else in this item.
2. **The fixture's central claim** — storage only, every judgement the shipped module's. After
   R3, `extractGithubHandle` sits on the tested path; search `_fixture.ts` for any judgement it
   still decides for itself (a second copy of the handle-extraction, gate, or stats rule).
3. **The migration's emptiness claims.** Its comments now assert the element-wise, whitespace-
   aware refusals. Do the constraint definitions in the refreshed `migration-replay.txt` match
   the comments, clause for clause?
4. **The bridge claims.** Does the capture show exactly ONE `complete_signup` with four
   `DEFAULT NULL` parameters? Does `complete-signup/index.ts` really send five keys for an NGO
   (trace the conditional spread)? Does proof check (d3) evidence the five-named-argument call?
5. **The posture claims.** The migration says the only write path into `volunteer_profiles` is
   the definer function and that the three Data API roles hold nothing on it. Does the capture's
   privilege matrix agree? Is the function still `security definer` with `set search_path = ''`,
   EXECUTE revoked from PUBLIC and granted to `service_role` only?
6. **`proof-local.txt` against `proof-local.ts`.** Does the transcript's verdict line match what
   the script would print for those results? Is the one SKIP (the GitHub authorize redirect,
   no client id in the environment) stated as skipped everywhere it is mentioned, never as
   proved? Do the R7 citations' counts (9/8/0/1) match the transcript itself?
7. **The supersession rulings.** Dev-4 ruled `step4-serves.txt` SUPERSEDED as serve evidence.
   Does the record (PHASE-STATE, gate2-rulings addendum) say so, and does nothing elsewhere
   still cite it as live evidence?
8. **`pending-ledger.txt`** — exactly 30 lines, none of this leaf's three ids present, each line
   naming a deliverable-and-leaf that appears in `loop/decomp/req-001.md`; and
   `tests/at/expected/req-001.json` flips exactly AT-001.02/.04/.05 and nothing else relative to
   main.
9. **Comments as assertions.** Read the comments in every changed file as claims and check them
   — this gate's findings were dominated by comments claiming more than the code does. In
   particular: nothing may describe the GitHub OAuth handshake, the real import, or Auth's
   `linkIdentity` round trip as proved.

---

## How to report

For every box: the answer, the file and line you traced it to, and one sentence. **Quote the
tree, not the record**, when the two disagree — the whole point of this pass is to find places
where they do.

Rank anything you find by whether it makes **the record false** (an adopted ruling absent, a
diff outside its declared scope, a stated fact untrue) or is a real observation outside this
item's scope. Say which. Close with a single explicit count line so a truncated run is
detectable.
