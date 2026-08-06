# PHASE-STATE — AI4DEV-22 (first requirement green end to end)

**Phase just completed:** PLAN (sitting 1).
**Phase next:** GATE 1 — critique of the plan.

**Orchestrator model: opus, via the `orchestrator-opus` fallback definition, because fable is out
of credit.** Every sitting on this item from here on will be the same unless that changes. This is
a different agent type at effort `max`, not an opus override on the fable definition — the two
definitions exist precisely so the effort pin follows the model. Anything reported upward from this
item should carry that fact: a fable run and an opus run are not the same evidence.

## What completes this phase

One reviewer, one file.

- **Reviewer:** `gpt-5.6-sol`, effort `xhigh`, `--sandbox read-only`, launched OS-detached with
  `-C <tree>` and its output written to the artifacts directory **outside** the tree.
- **Prompt:** `.claude/skills/work/reviewers.md` (the base) **plus** `loop/items/AI4DEV-22/gate1-prompt.txt`
  (item additions — additive only).
- **Subject:** `loop/items/AI4DEV-22/plan.md` at the head this state file rides in, the board item,
  and the code the plan makes claims about.
- **Done when:** sol's run is final and its raw output exists in the artifacts directory. The
  conductor then has it distilled — findings only, count in equal to count out — and spawns the
  DRAFT sitting.

An empty or progress-line-only output is **not** a clean gate. If sol produces nothing, re-run it;
a lost output is re-run rather than reconstructed.

## Two questions for the founder — recorded here, raised by the conductor

The plan reaches a conclusion I do not have the authority to act on. Both questions are stated at
length in `loop/items/AI4DEV-22/plan.md` sections 3 and 3a, with pointers; the short forms are
below. **Gate 1 is deliberately asked to attack both**, so the founder should hear sol's verdict
alongside mine rather than instead of it.

### Question 1 — the item's stated goal is not reachable inside the item

The item asks for REQ-016's twelve acceptance tests green at the integration tier, "not against
stubs". At that tier the harness refuses any stand-in, deliberately — that refusal is what makes
the tier a gate. REQ-016's system under test is a stand-in written from the suite's own
specification (`tests/at/suites/req-016/_fixture.ts` lines 1-19, which says so in its first
sentence). The actual notification product does not exist: no schema (`supabase/migrations/` holds
a placeholder and a README), no edge functions, no notification code in `src/`.

Building it is REQ-016's own product work, already decomposed into seven leaves whose done contract
is word for word this item's sentence (`loop/decomp/req-016.md` lines 9, 14-28). It is also larger
than REQ-016: the guarded matrix one of the tests walks depends on producers owned by three other
requirements — the money ledger, the access-key issue and revoke path, and project completion —
none of which is built. And it falls outside the harness item's own written scope boundary, which
says it builds the engine and the capabilities, not per-requirement work
(`loop/bringup/AI4DEV-3-at-harness.md` lines 166-172).

So two sentences in ratified text cannot both be honoured. **Three ways forward, for the founder to
choose between:** build REQ-016's product inside this bring-up item; or narrow this item to the
harness-side work and let "twelve green at integration" close where REQ-016's own decomposition
already puts it; or something neither of those.

### Question 2 — done-criterion 5 is undesigned, and its enabling convention is unratified

The item also claims to satisfy "one authored test body running on both surfaces from a single
source". That needs a screen driver, static screens carrying stable handles, at least one test
marked as a user-interface test, and `--wired` selection actually implemented — it currently
refuses outright (`tests/at/harness/runner.ts` lines 970-977). The screens exist and carry no
handles; the convention that would put them there is a draft awaiting founder ratification
(`loop/bringup/testid-convention-draft.md` line 3).

Underneath that is a harder problem. The criterion exists to prove the wired pass is a **re-run and
not a rewrite**, and none of the twelve bodies reads anything a screen could show. Driving one
through a screen would mean rewriting it, which falsifies the criterion instead of demonstrating
it. Which ids are screen-observable, and through what seam, has not been designed.

## What the plan does in the meantime, and why it does not prejudge either question

One thing here is unambiguously the harness's and needed whichever way the founder rules: **nobody
has ever run the integration tier.** The local-database item merged under a title that says so —
"integration-tier wiring (unproven pending Docker)". Docker now answers. About four hundred lines of
`runner.ts` — the machine-wide lock, the proof that the stack answering is the local one, two
readiness gates, the database reset, the proof that the reset replayed the migration set, and the
environment allowlist that keeps a developer's secrets out of a test child — have never executed
once, and that code is the gate every requirement will eventually close through.

The plan measures it, repairs what the measurement breaks, records the honest state, and stops.
Steps S1-S5 in the plan, blast radius fixed in decision D3 to `runner.ts`, `expected.ts` and its
selftest, `tests/at/expected/req-016.json`, `supabase/config.toml`, and the item's own record
directory. **No product code, no migrations, no test body, no fixture adapter.**

It deliberately does **not** build the mechanism by which a real capability could report itself
real. That machinery has no consumer until the product exists, and this tree already carries a
founder ruling against exactly that move — vendor stand-ins are built with the first suite that
consumes them, never ahead of one (`loop/bringup/AI4DEV-3-at-harness.md` lines 53-64, founder
2026-08-04).

## Open facts the next sitting needs

- **The stack is already running** — twelve containers against the project id in
  `supabase/config.toml`, machine-wide rather than per-worktree. Do not restart it to tidy it.
- **`supabase_edge_runtime_…` has exited 255** and the CLI reports it stopped. `DISABLED_SERVICES`
  in `runner.ts` line 62 covers only imgproxy and the pooler, so the first integration-tier run is
  predicted to refuse at that check before running any test. That prediction is written into the
  plan so the measurement can contradict it.
- **`supabase_vector_…` is in a restart loop.**
- **`config.toml` names a seed file that does not exist** (`supabase/seed.sql`).
- **A read-only probe of the stack quoted local secret values back in plain text during this
  sitting.** Nothing was committed. Every transcript this item writes is redacted before it is
  staged, and checked by eye — decision D4.
- **CI runs the loop tier only** (`.github/workflows/ci.yml` line 178), so integration-tier evidence
  is local and must be committed as a redacted transcript to exist at all.
- **The pull request body may name no board id but this item's own.** CI fails the build otherwise,
  and Linear moves any item a pull request names.

## Slicing

One slice. The planned diff is small — transcripts, at most a bounded declaration-format extension,
small runner repairs, one boundary note. One code gate, not several.

## No code was written this sitting

The tree changes are this file, `plan.md` and `gate1-prompt.txt`, all under
`loop/items/AI4DEV-22/`. Nothing under `tests/`, `src/` or `supabase/` was touched.
