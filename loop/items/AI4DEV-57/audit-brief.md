# AI4DEV-57 — the pre-merge AUDIT brief

**Head to audit:** `b4688fed1e8f4fbc47054a355b77a23211490fdd`
**Branch:** `nirdrang/ai4dev-57-email-and-google-signup-and-the-three-account-types-d1l1`
**The change:** `git diff main...HEAD`

---

## WHAT YOU ARE AUDITING — read this before anything else

**Your subject is THE CLAIM, never the code's quality.** You are not asked whether this is good code,
whether you would have designed it differently, or whether it could be simpler. Three questions, and
only these three:

1. **Does every adopted ruling appear in the tree as ruled?**
2. **Does the diff stay inside its declared scope?**
3. **Is every stated fact about the code true?**

A defect in code this branch never touched belongs to another item. Say so and move on.

**You have whole-tree access and change-only scope.** Read anything you need in order to judge the
change; report only on the change.

## DO NOT EXECUTE ANYTHING. This is not a limitation of trust — it is what the record shows works

**Do not run the test suite, the acceptance harness, the type-checker, the local Supabase stack, the
proof script, or the build.** Execution evidence belongs to continuous integration, which gates this
merge on its own.

This instruction is written from measured experience across four prior items: an auditor's execution
attempts produced almost nothing except "could not verify", and on one occasion produced two FAIL
verdicts that turned out to be artifacts of its own sandbox rather than defects in the tree — while
**every reading-and-tracing question it was given came back answered.** So every box below is a
reading-and-tracing question. Answer those.

**`bun run build` in particular must never be run on this branch.** It rewrites `src/routeTree.gen.ts`,
and continuous integration fails any pull request touching both `^src/` and
`^(supabase|tests|loop|.claude|.github)/`. Running it would create the defect you are auditing for.

---

## The record you are auditing against

| file | what it is |
|---|---|
| `loop/items/AI4DEV-57/plan.md` | the amended plan — decisions, steps with done-criteria, and **section 4, the per-acceptance-id claims table** |
| `loop/items/AI4DEV-57/fix-rulings.md` | **the rulings this sitting made** — Parts A, B, C, D, E |
| `loop/items/AI4DEV-57/draft-rulings.md` | the previous sitting's rulings, including a correction written into its verification table |
| `loop/items/AI4DEV-57/gate1-rulings.md` | the plan-review rulings |
| `loop/items/AI4DEV-57/proof-local.txt` | the live-stack transcript |
| `loop/items/AI4DEV-57/verify-final.txt` | the whole-surface verify capture |
| `loop/items/AI4DEV-57/PHASE-STATE.md` | carried facts, filed work, open questions |

---

## BOX SET A — does every adopted ruling appear in the tree as ruled?

Each row names a ruling and what the tree must show. Trace it to the file and say **YES / NO /
PARTIAL**, with the path and line. A ruling implemented *differently from how it was ruled* is a NO,
not a PARTIAL — that is the defect this box set exists to catch.

| ruling | what the tree must show |
|---|---|
| **CI-1** | `tests/at/harness/runner.selftest.ts` takes the migration baseline as OBSERVED, not hard-coded, and does not hard-code this item's migration filename |
| **CI-2** | exactly **four** markers in `tests/at/harness/type-invention.selftest.ts` changed, and **only their constraint text**. The rejected SUBJECT of each attack must be unchanged. No other assertion in that file weakened. `suite-adapters.ts` line ~19 prose corrected |
| **B1** | both edge functions answer a CORS preflight and emit access-control headers; the shared piece is in `_shared/edge.ts` |
| **B2** | `public.create_organization` raises unless the account is `ngo`, **commented as a BACKSTOP and not as the decision** — the user-facing refusal must still be `ngoOnlyActionAllowed`'s |
| **B3a** | `callerIp` returns `null` for anything that is not a well-formed IP, and its comment states the address is not authenticated |
| **B5** | AT-001.03's comment no longer claims a provider branch would be caught; the **test body is unchanged** |
| **B6** | a fifth export in `_shared/accounts.ts` judges the organisation name, and **both** `create-organization/index.ts` and `tests/at/suites/req-001/_fixture.ts` call it. **No duplicate copy of that rule remains outside the module** |
| **B7** | three comments corrected (`_fixture.ts`, `_contract.ts`, AT-001.01's body) and **no extraction attempted** |
| **B8** | AT-001.01 asserts a completion with no acknowledgment text version is refused and leaves no account row |
| **B9** | AT-001.06 asserts the refused volunteer left no membership and no organisation |
| **B10** | thrown errors become a shaped 502; **the 4xx→409 mapping is UNCHANGED** — changing it would be implementing a ruling I rejected |
| **B11** | a skipped check is distinguishable in the stored result, the tally and the verdict; `ALL CHECKS PASSED` cannot print when anything was skipped |
| **B12** | `proof-local.ts` distinguishes absent / placeholder / real credential and states the rule it used |
| **B13** | `accountTypeOf` has three outcomes and answers 502 for a failed read, never 409 |
| **B14** | `Caller.email` and `Caller.provider` deleted, along with the `app_metadata` read that fed `provider` |
| **B15** | `_contract.ts` no longer says provisioning is a service-role write |
| **B17** | AT-001.07's body comment no longer says the administrator was "provisioned the only legal way" at loop tier |
| **B18** | `pr-body.md` no longer says the pull request carries the plan only, no longer says "the first edge function" singular, and no longer says `--wired` is unimplemented |
| **L3** | `proof-local.ts` attempts a **service-role** insert into `public.accounts` and asserts the privilege-layer message |
| **L4** | `.env.example` names both Google variables |
| **E2** | the two new `AccountsSut` members are **read-only observations over storage** and supply no judgement |

**Rulings that were REJECTED or deliberately left undone. A tree that implements one of these is a
finding, because it means a ruling was overridden by whoever was typing:**

- **B4** — no row-level-security policy may have been added to `public.accounts`. The migration must
  still add **no policies at all**.
- **B10's second half** — the 4xx→409 mapping must be unchanged.
- **E3** — `validateCompleteSignup`'s own NGO-name check may still exist; consolidating it was
  rejected.

---

## BOX SET B — does the diff stay inside its declared scope?

1. **Territory.** `git diff main...HEAD --name-only` must match `^src/` **zero times**. This is a hard
   continuous-integration failure otherwise.
2. **Read-only files.** `.taskmaster/docs/acceptance/at-req-001.md` must be unchanged — it is the
   source of the 37 expected ids and changing it is a documentation change, not a side effect of
   building a leaf.
3. **Foreign item ids.** No pull-request body, commit message or file in this change may name **any**
   board item id other than `AI4DEV-57`. The id alone links and moves that item; a closing verb
   additionally closes it. Check `pr-body.md` and `git log main..HEAD` messages.
4. **Scope of the fix sitting.** Every changed file should trace to a ruling in `fix-rulings.md` or to
   one of plan steps 6, 7 and 8. Name anything that does not.
5. **Secrets.** No credential, key or token may appear in any changed file. `.env.example` must carry
   variable **names** with empty values only.

---

## BOX SET C — is every stated fact about the code true?

These are the claims the item makes about itself. For each, trace it and answer **TRUE / FALSE /
CANNOT BE DETERMINED BY READING**. The last answer is a legitimate one and is better than a guess.

1. **`plan.md` section 4's claims table** is the item's central promise. For each of the four
   acceptance ids, does the "proved at loop tier" column describe something the test **actually
   drives**, and does the "not proved" column omit nothing the tree shows is unproved?
2. **D4's central claim** — *"The adapter supplies storage; the shared module supplies every
   judgement."* Is it true **now**? It was false at the previous head, which is what B6 fixed. Search
   `tests/at/suites/req-001/_fixture.ts` for any rule it decides for itself rather than delegating.
   **This is the highest-value box in this brief**: the previous sitting's own verification table
   asserted this and was wrong, and the correction is recorded in `draft-rulings.md`.
3. **The "only door" claim** — the migration, `draft-rulings.md` R2 and `plan.md` step 7(g) all say
   there is no key-reachable write path into `public.accounts`. Read the migration's grant block.
   Does any grant contradict it? Does `proof-local.txt` check (k) evidence it?
4. **The F6 guard** — does `public.complete_signup` still refuse `platform_admin` independently of the
   TypeScript, and is it still `security definer` with `set search_path = ''`?
5. **`_shared/accounts.ts`'s two stated constraints** — zero non-relative imports, no `Deno` global.
   Still true after the fifth export was added?
6. **Every comment that survived the critique.** Several findings in this gate were comments claiming
   more than the code does. Read the comments in the changed files as **assertions** and check them.
   Specifically: does anything anywhere still describe the Google handshake, the acknowledgment IP, or
   the acceptance suite's reach as proved, when `plan.md` section 4 names it unproved? The plan's own
   rule is *"A clause named unproved here may not be described as proved anywhere else in this item."*
7. **`proof-local.txt` against `proof-local.ts`.** Does the transcript's verdict line match what the
   script's code would print for that set of results? Does it claim any check that the script skipped?
8. **The gate-coverage statement.** `fix-rulings.md` Part 0 and `PHASE-STATE.md` both say the SQL and
   configuration slice had one completed reader instead of two. Is that recorded accurately and
   consistently in both, and is `gate2-kimi-sql.md` genuinely without a verdict?

---

## How to report

For every box: the answer, the file and line you traced it to, and one sentence. **Quote the tree,
not the record**, when the two disagree — the whole point of this pass is to find places where they
do.

Rank anything you find by whether it makes **the record false** (an adopted ruling absent, a diff
outside its declared scope, a stated fact untrue) or is a real observation outside this item's scope.
Say which. Close with a single explicit count line so a truncated run is detectable.
