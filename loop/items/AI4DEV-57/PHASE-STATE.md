# AI4DEV-57 (email + Google signup, three account types) — phase state

**Phase just completed:** the plan review's RULINGS and the plan amendment (sitting 2). All 9 of
sol's findings are ruled, `plan.md` is amended in place, and both are pushed. **No code exists yet;
nothing has been built.**
**Phase next:** the DRAFT — spawn the executor against the amended plan.
**Branch:** `nirdrang/ai4dev-57-email-and-google-signup-and-the-three-account-types-d1l1`
**Chain, derived from the branch:** AI4DEV-57 (email + Google signup, three account types) →
AI4DEV-51 (accounts and sign-in container) → AI4DEV-50 (auth dev-tree root) → AI4PM-19 (the
authentication requirement). No `attr:` label anywhere on the chain. Product work under a real
requirement; this leaf itself closes on a merged pull request.

---

## THE OPUS FALLBACK IS IN FORCE FOR THIS ITEM, NOT JUST ONE SITTING

Fable is out of credit. Every orchestrator sitting on this item runs as `orchestrator-opus` (opus at
effort max), a different agent TYPE, never a model override on the fable definition. A fable ruling
and an opus ruling are not the same evidence: the eight decisions in `plan.md` section 2 and all
nine rulings in `gate1-rulings.md` are opus rulings. A successor sitting that finds itself running
as fable should say so in its first line rather than assume continuity.

A session limit is not the same thing as being out of credit. If the reason ever reads
"You've hit your session limit · resets HH:MM", that is the account-wide five-hour window, it heals
itself, and an opus agent hits the same wall.

---

## This sitting was scoped to rulings only — the DRAFT is deliberately split in two

The standard draft sitting rules the findings, amends the plan, pushes, **and then spawns the
executor in the same sitting**, staying live because the executor may dispute a ruling. The
conductor scoped this sitting to the rulings and the amendment, ending before the executor.

That is a two-sitting draft rather than a broken one: the executor sitting is a live ruler with the
whole ruling record in front of it, so a dispute still reaches someone who can rule. Recorded here
so the split reads as deliberate rather than as a dropped step. **What must not be lost is listed
below.**

---

## What completes the next phase

**1. Spawn the executor** (model `opus`, synchronously, no isolation so it inherits this worktree)
against `plan.md` as amended. Its target is a **draft**, not a green run: every plan step
implemented, `bun run typecheck` and the build passing, **the verify suite deliberately not yet
run**. The draft exists to be critiqued.

**2. Two things in the plan can stop the executor, and both mean "report", not "work around":**
- **Step 1** — if the local Supabase stack does not come up after two attempts, stop. Steps 4, 5 and
  7 all depend on it and the plan needs amending, not patching.
- **Step 6** — if AT-001.03 cannot be written without simulating a Google provider handshake in the
  adapter, stop. An adapter that fakes a round trip and reads its own fake back as proof is this
  item's worst outcome, and it is exactly what the plan review pressed on.

**3. Write the Gate 2 prompts** — critique only, no execution. Two of them, one per pinned model
(terra at max, and Kimi at high), each assembled as `reviewers.md`'s `## Your contract` plus the
DRAFT CODE review section plus this item's additions. **Neither may hint that the other exists**,
and item-specific content is additive only. They belong to the executor's sitting because their
additions depend on what the draft actually touched.

**4. The split trigger is still live.** If the draft diff exceeds 1200 changed lines outside
`loop/items/`, the code gate splits into two prompts — SQL plus configuration, and TypeScript plus
tests. The revised estimate (plan D8) is comfortably under it, but the two amendments grew the
draft, so check rather than assume.

---

## The rulings, in one paragraph

Nine findings from sol (gpt-5.6, xhigh, read-only). **Six accepted outright, three accepted with a
different remedy, none rejected** — a strong review. Full rulings with every claim quoted:
`loop/items/AI4DEV-57/gate1-rulings.md`; the raw output and distillate are committed beside it.

**Two findings changed what gets built,** and the executor must not treat either as optional:
- **A second edge function, `create-organization`** — AT-001.06 had no product operation to test, so
  the test could only have called a helper directly, which proves nothing about a boundary.
- **A transactional database function, `complete_signup`** — the plan promised four writes "in one
  transaction" and had arranged no transaction at all.

Three amendments exist to stop a well-meant simplification undoing a ruling: the deliberate absence
of a GitHub gate on the volunteer path (F1), the deliberate duplication of the account-type refusal
inside the database (F6), and the requirement that the acknowledgment predicate **discriminate**
rather than merely exist (F3). Each is marked in the plan with its finding tag.

---

## Open questions for the founder — the conductor raises these, I do not

### 1. The signup SCREENS — ANSWERED, and folded in

The founder ruled the screens stay out of this leaf: follow the manifest, they belong to the wiring
leaf. `plan.md` decision D1 now stands on that ruling as well as on its three original reasons, and
its heading says "confirmed by the founder" rather than proposing a reduction. **Closed.**

One correction the prior sitting owed: D1's third reason said the `--wired` runner flag "is not
implemented". That was wrong. The flag is parsed and implemented; what does not exist is the screen
driver behind it — `runner.ts` line 970 returns 3 with *"the screen driver does not exist yet"*. The
conclusion is unchanged and the plan now states the fact correctly.

### 2. Is there a Google OAuth client? — STILL OPEN, and it does NOT block code

**Explicitly ruled this sitting, because the plan review pressed on exactly this:** the missing
OAuth client does not block the executor. Every step of the plan can be built and run without one.
What it bounds is a **claim**, not the work.

- What this item will prove: the `[auth.external.google]` block is well-formed, the stack starts
  with it present, and `/auth/v1/settings` reports Google enabled; and that a session recorded as
  provider `google` completes signup through the same shipped path as email.
- What it will **not** prove: AT-001.03's clause *"sign-in via Google succeeds on return visits"* —
  a real consent round trip. That is named as unproved in the plan's per-id claims table and will be
  repeated in the merge ruling.
- **If an OAuth client exists or can be created before the merge sitting**, step 7 proves the round
  trip and the claim narrows no further. That is the only thing the founder's answer changes, and it
  is worth asking for that reason — AT-001.03 is one of this leaf's four ids and is the green most
  likely to be argued about at merge.

### 3. Edge function or `createServerFn` — STILL OPEN with the founder; the ruling stands here

Nothing in the plan review gave a concrete reason the edge-function ruling is wrong for this leaf,
so it stands as the prior sitting made it: server logic lives in `supabase/functions/`, because
`createServerFn` lives in `src/`, which is Lovable's territory and which this item may not touch at
all. The finding about a second operation (F4) was ruled *within* that decision — a second edge
function — not against it.

The underlying contradiction between the two checked-in documents is real, is not this item's to
fix, and **will bite the screen-wiring leaf squarely**. Relayed, not escalated.

---

## Filed, not built

- **`AGENTS.md` is badly stale.** It documents `/pm-next`, `/dev-start`, `/bind` and TaskMaster — all
  deleted by the one-verb way of work — and its section 5 ends in a corrupted table fragment at line
  93. Pre-existing, unrelated to this branch, and it will keep misleading anything that reads it.
  Independent work that could stand alone: **file it, do not build it here.**

---

## Facts established in the tree, which no later sitting should re-derive

The first five were read in the plan sitting; the last four were read this sitting while checking
the reviewer's claims. All were read in the tree, never taken from a prompt.

1. **First product code: confirmed.** `supabase/migrations/` holds only `.gitkeep` and a README;
   there is no `supabase/functions/`; `src/` is the untouched Lovable scaffold and references
   Supabase nowhere.
2. **The acceptance harness is per-requirement, not per-leaf.** Creating `tests/at/suites/req-001/`
   obliges all **37** call sites at once, or the run exits 2 with nothing graded. This leaf owns 4.
3. **The integration tier cannot go green for any requirement today** — every `sut.<key>` is stamped
   a stand-in unconditionally, and stand-ins are refused above the loop tier. This leaf's verify
   command is pinned to `bun run at:verify req-001 --tier loop --expect`.
4. **The `AtPending` declaration mechanism is verified** against `registry.ts` and `expected.ts`.
   Step 2 still proves it on the real files before 37 of anything is written.
5. **The local Supabase stack is still UNPROVEN.** `supabase start` has never been run in this repo.
   Step 1 of the plan, first, and it stops the item rather than being worked around.
6. **`bun run typecheck` is `bun tests/at/typecheck.ts`**, which runs `tsc -p` over both projects —
   but the root project's `include` is `["src/**/*.ts", "src/**/*.tsx", "vite.config.ts",
   "eslint.config.js"]`. **Nothing under `supabase/` is in the root program.** The shared module is
   covered by the `tests/at` project alone, and the edge-function entry points by neither.
7. **`registry.ts` line 723 is `surface: opts.surface ?? 'backend'`** — an unmarked test is a backend
   test, and `--wired` selects the ui-marked ids. The wiring leaf inherits whatever this leaf marks.
8. **`--wired` is implemented; the screen driver is not.** `runner.ts` line 970 returns **3**.
9. **`--expect` and `--wired` cannot be combined** — a usage error, exit 2, *"cannot be combined"*.
   Irrelevant here, but D2's wiring leaf will need a different command shape than the one this leaf
   pins.

---

## Caps, carried forward

- The executor gets three attempts to reach green inside one invocation, then reports.
- An orchestrator sitting may send it back twice — three invocations per sitting.
- The audit re-runs once per item, and only if code changed.
- A suspected CI flake gets one re-run of the check, with no new commit.
- A green local verify against a red CI gets two pushes, then escalation with the evidence.

When a cap fires: **stop working, do not stop judging.** What remains is written down as open items
— filed as separate work, or escalated as scope growth. "We ran out of rounds" is never recorded as
"the finding was invalid."
