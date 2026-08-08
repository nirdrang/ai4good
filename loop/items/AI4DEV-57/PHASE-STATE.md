# AI4DEV-57 (email + Google signup, three account types) — phase state

**Phase just completed:** the DRAFT (sitting 3). The executor built every plan step; the code is
committed and pushed. The plan was amended three more times, by rulings on the executor's own report.
**Phase next:** the CODE CRITIQUE — two prompts, each launched twice, four runs in total.
**Branch:** `nirdrang/ai4dev-57-email-and-google-signup-and-the-three-account-types-d1l1`
**Chain, derived from the branch:** AI4DEV-57 (email + Google signup, three account types) →
AI4DEV-51 (accounts and sign-in container) → AI4DEV-50 (auth dev-tree root) → AI4PM-19 (the
authentication requirement). No `attr:` label anywhere on the chain. Product work under a real
requirement; this leaf itself closes on a merged pull request.

---

## THE OPUS FALLBACK IS IN FORCE FOR THIS ITEM, NOT JUST ONE SITTING

Fable is out of credit. Every orchestrator sitting on this item runs as `orchestrator-opus` (opus at
effort max), a different agent TYPE, never a model override on the fable definition. A fable ruling
and an opus ruling are not the same evidence: every decision in `plan.md`, all nine rulings in
`gate1-rulings.md` and all eight in `draft-rulings.md` are opus rulings. A successor sitting that
finds itself running as fable should say so in its first line rather than assume continuity.

A session limit is not the same thing as being out of credit. If the reason ever reads
"You've hit your session limit · resets HH:MM", that is the account-wide five-hour window, it heals
itself, and an opus agent hits the same wall.

---

## STANDING HAZARD — READ THIS BEFORE RUNNING A BUILD ON THIS BRANCH

**`bun run build` rewrites `src/routeTree.gen.ts`.** Ten lines, a stale `declare module` block,
deterministic, reproduced twice by the executor and reverted both times.

Continuous integration fails any pull request whose files match **both** `^src/` and
`^(supabase|tests|loop|\.claude|\.github)/`, and this branch is permanently on the wrong side of that
line. **So an unexamined `git add -A` after a build breaks the build**, for a reason that has nothing
to do with the change. Stage deliberately, and check `git status` after every build.

Regenerating that file properly is a `src/`-only change belonging to a different pull request.
**Filed, not fixed.**

---

## What completes the next phase

**1. Launch the code critique: TWO PROMPT FILES, FOUR RUNS.** The draft is 1990 changed lines outside
`loop/items/`, against a stated split trigger of 1200, so the gate is split. Ruling and reasoning:
`draft-rulings.md` R8.

| prompt file (in `loop/items/AI4DEV-57/`) | launched as |
|---|---|
| `gate2-prompt-sql-and-config.txt` | `gpt-5.6-terra` effort `max`, `--sandbox read-only` |
| `gate2-prompt-sql-and-config.txt` | `kimi-code/k3` effort `high` (from its config file — its CLI has no effort flag), `--sandbox read-only` |
| `gate2-prompt-typescript-and-tests.txt` | `gpt-5.6-terra` effort `max`, `--sandbox read-only` |
| `gate2-prompt-typescript-and-tests.txt` | `kimi-code/k3` effort `high`, `--sandbox read-only` |

**Each slice is read by both models — not one model per slice.** One reader per slice would halve the
independent readers per line, which is a narrowing of attack directions, and the gate may never be
narrowed. The prompts are already assembled and checked: no metadata block, no sibling section,
nothing telling any reader that another reader exists or that the change was split. **Send each file
exactly as it is.**

Name the four outputs distinctly — model and slice in the filename — or two of them will be
indistinguishable. They go to the item's artifacts directory, not into the tree, until the fix
sitting commits them.

**2. Distil each raw output separately**, one distiller per file, as usual.

**3. Then a FIX-AND-GOAL sitting**, which is where this item's remaining work is concentrated. It
must do all of the following, and the last three are not optional extras — they are plan steps whose
done-criteria this sitting deliberately did not pursue:

- Rule every finding from all four runs, and push the rulings **before** any code changes.
- **Apply R4 from `draft-rulings.md` — a defect I found by reading, which no reviewer may catch
  because it is mine.** `loop/items/AI4DEV-57/proof-local.ts` line 44 records a *skipped* check as
  `passed: true`, so line 461 counts it among the passes and line 466 prints `ALL CHECKS PASSED` when
  a check never ran. Its own docstring says "never as a pass". **Fix it before step 7 is executed** —
  the check most likely to be skipped is (f2), the Google one, so the failure mode is this item
  claiming a Google proof it did not perform. Nothing false exists yet: the script has never been run.
- **Run step 7** — `proof-local.ts` against the live stack, transcript to `proof-local.txt`. This is
  the only evidence the item will ever have about the real database, and it also closes step 5's
  done-criterion, which is currently unmet (see `draft-rulings.md` R5 — that is my draft boundary,
  not an executor omission).
- **Run step 6's verification** — `bun run at:verify req-001 --tier loop --expect` must exit 0
  reporting exactly 4 passed and 33 failed. The four real test bodies are written and have **never
  been executed**.
- **Run step 8** — the whole verify surface green together, both requirements, into `verify-final.txt`.
- **Commit the four raw critiques and their distillates into the record**, and write the audit brief.

---

## The state of the code, honestly

**Built, and committed at `b3de541`:** all four tables, two enumerated types and five database
objects; the shared decision module; both edge functions; the full 37-site acceptance suite with 4
real bodies and 33 declared pending; the Google provider block; and the step-7 proof script.

**Run and passing:** the step-0 baseline (all four commands exit 0 — a clean starting point), the
local Supabase stack (**came up on the first attempt** — the item's riskiest unknown, now closed),
the step-2 declaration spike (exit 0, 37 declared reds, matched exactly), `bun run db:reset` three
times, `bun run typecheck` four times, `bun run build` twice, and both edge functions booting under
the committed configuration.

**Deliberately NOT run:** the four real acceptance bodies, `proof-local.ts`, and the whole-surface
step 8. That is the draft boundary, ruled in this sitting: a draft is implemented, not green, because
the critique must land on oracles nobody has yet tuned to pass.

**So expect continuous integration to be red or inconclusive at this head.** It runs
`at:verify --expect` over every expected file, and `expected/req-001.json` declares an end state
whose tests have never executed. **This is the normal state of a draft in this process and must not
be classified as a defect.** The merge gate is the green on the final head, not on this one.

---

## The three defects the executor found by measuring, which reading alone would not have caught

Recorded because they are the strongest argument in this item for why the plan front-loaded the live
stack rather than deferring it.

1. **`anon` could call `complete_signup`.** PostgreSQL grants `EXECUTE` on a new function to `PUBLIC`
   by default, so a holder of only the publishable key could have completed a signup against another
   user's auth id. Now revoked from `PUBLIC` before being granted to `service_role`.
2. **`service_role` has no privileges on any of the four tables.** `BYPASSRLS` is a different
   mechanism from a table privilege, so as first committed **both edge functions were broken against
   the real database** — and only step 7 would have found it. The repair deliberately did *not* grant
   the service role INSERT; see `draft-rulings.md` R2, because that repair would have gutted the F6
   guard.
3. **Two literal NUL bytes** in the fixture adapter made git classify it as a binary file, which
   would have reached the critique unreviewable.

---

## Open questions for the founder — the conductor raises these, I do not

### 1. The signup SCREENS — ANSWERED and folded in. Closed.

The founder ruled the screens stay out of this leaf: follow the manifest, they belong to the wiring
leaf. `plan.md` D1 stands on that ruling. Nothing further is needed.

### 2. The Google OAuth client — ANSWERED in direction, and folded into the plan this sitting

The founder ruled that **a real Google OAuth client will be created**: this project runs on external
Supabase rather than Lovable Cloud, so a real client id and secret are mandatory in every
environment, not optional extra rigor. Creating the credential is a **founder-manual step**, like
Docker was.

Folded into `plan.md` D7 and step 7(f2). It blocked nothing: the credential was not set when the
executor ran, which is the expected case, and the item proceeded unchanged.

**What is still worth the founder knowing, stated exactly:**
- Proved now: the provider block is well-formed, the stack starts with it, and `/auth/v1/settings`
  reports Google enabled.
- Provable the moment the credential is in the environment, with no human involved: that the
  configured client id reaches the provider handshake. That is step 7(f2), currently skipped.
- **Never provable by any agent:** the consent round trip itself, because consent is a person
  pressing a button in a browser. **AT-001.03's "sign-in via Google succeeds on return visits" clause
  stays unproved by this item whether or not the credential arrives** — the credential narrows the
  gap, it does not close it. Closing it needs a person to sign in once and that evidence recorded.
  This is repeated in the merge ruling.

### 3. Edge function or `createServerFn` — STILL OPEN; the ruling stands and nothing challenged it

Server logic lives in `supabase/functions/`, because `createServerFn` lives in `src/`, which is
Lovable's territory and which this item may not touch at all. Nothing in the draft gave a concrete
reason to revisit it. The underlying contradiction between the two checked-in documents is real, is
not this item's to fix, and **will bite the screen-wiring leaf squarely.** Relayed, not escalated.

---

## Filed, not built

- **`AGENTS.md` is badly stale** — it documents `/pm-next`, `/dev-start`, `/bind` and TaskMaster, all
  deleted by the one-verb way of work, and its section 5 ends in a corrupted table fragment at line
  93. Pre-existing, unrelated to this branch.
- **`src/routeTree.gen.ts` is stale** and is regenerated by every build. A `src/`-only change; see the
  standing hazard above.

---

## Facts established in the tree, which no later sitting should re-derive

The first nine were established in earlier sittings and all still hold. The rest were established
this sitting, by running things rather than by reading them.

1. **First product code: confirmed** — this branch is it.
2. **The acceptance harness is per-requirement, not per-leaf.** Creating `tests/at/suites/req-001/`
   obliged all 37 call sites at once. Done; this leaf owns 4.
3. **The integration tier cannot go green for any requirement today** — every `sut.<key>` is stamped
   a stand-in unconditionally. This leaf's verify command is pinned to
   `bun run at:verify req-001 --tier loop --expect`.
4. **The `AtPending` declaration mechanism works** — no longer inferred. The spike ran: exit 0, 37
   declared reds, matched exactly. It also settled an open question: a body that throws before
   asserting is **not** disturbed by `expect.hasAssertions()`.
5. **The local Supabase stack comes up** — proven, on the first attempt. API on 54321, database on
   54322. This was the item's riskiest unknown and it is now closed.
6. **`bun run typecheck` covers `supabase/functions/_shared/accounts.ts` through the `tests/at`
   project only** — the root project's `include` is `src/`-only, so nothing under `supabase/` is in
   its program.
7. **Neither TypeScript project covers the two edge-function entry points or `_shared/edge.ts`, and
   no Deno type-checker is reachable** — not on PATH, and the edge-runtime container ships no `deno`.
   **Those three files have no type coverage at all.** Recorded, not worked around; installing a
   language runtime is bigger than a leaf's call.
8. **`registry.ts` line 723 is `surface: opts.surface ?? 'backend'`.** AT-001.01, .03 and .07 are
   marked `surface: 'ui'`; AT-001.06 is left `backend`. The wiring leaf inherits these marks.
9. **`--wired` is implemented; the screen driver is not** — `runner.ts` line 970 returns 3.
10. **`--expect` and `--wired` cannot be combined** — usage error, exit 2. D2's wiring leaf will need
    a different command shape than the one this leaf pins.
11. **PowerShell 5.1's `Out-File -Encoding utf8` writes a byte-order mark**, and the harness's JSON
    parser rejects a file carrying one outright. This cost the spike its first run. Any later sitting
    writing JSON from PowerShell must write it without a BOM.

---

## Caps, carried forward

- The executor gets three attempts to reach green inside one invocation, then reports. **This sitting
  used one of three** — the draft was a single linear pass with four in-flight corrections.
- An orchestrator sitting may send the executor back twice — three invocations per sitting. **This
  sitting used one of three.**
- The audit re-runs once per item, and only if code changed.
- A suspected CI flake gets one re-run of the check, with no new commit.
- A green local verify against a red CI gets two pushes, then escalation with the evidence.

When a cap fires: **stop working, do not stop judging.** What remains is written down as open items —
filed as separate work, or escalated as scope growth. "We ran out of rounds" is never recorded as
"the finding was invalid."
