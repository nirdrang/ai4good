# AI4DEV-57 (email + Google signup, three account types) — phase state

**Phase just completed:** PLAN (sitting 1). `plan.md` and the plan-review prompt are written and
pushed. No code exists yet; nothing has been built.
**Phase next:** the PLAN REVIEW, then the DRAFT sitting.
**Branch:** `nirdrang/ai4dev-57-email-and-google-signup-and-the-three-account-types-d1l1`
**Chain, derived from the branch:** AI4DEV-57 (email + Google signup, three account types) →
AI4DEV-51 (accounts and sign-in container) → AI4DEV-50 (auth dev-tree root) → AI4PM-19 (the
authentication requirement). No `attr:` label anywhere on the chain. This is product work under a
real requirement, so the requirement above it has an evidence gate — this leaf itself closes on a
merged pull request.

---

## THE OPUS FALLBACK IS IN FORCE FOR THIS ITEM, NOT JUST THIS SITTING

Fable is out of credit. Every orchestrator sitting on AI4DEV-57 runs as `orchestrator-opus` (opus
at effort max), which is a different agent TYPE, never a model override on the fable definition. A
fable ruling and an opus ruling are not the same evidence: read the eight decisions in `plan.md`
section 2 as opus rulings. Any successor sitting that finds itself running as fable should say so
in its first line rather than assume continuity.

A session limit is not the same thing as being out of credit. If the reason ever reads
"You've hit your session limit · resets HH:MM", that is the account-wide five-hour window and it
heals itself — an opus agent hits the same wall.

---

## What completes the next phase

The plan review runs against `plan.md` at the head this state file rides in.

- **Prompt:** `loop/items/AI4DEV-57/gate1-prompt.txt`, already assembled and committed — send it as
  it stands. It is the reviewer contract plus the plan-review section (pins block stripped) plus
  this item's additions.
- **Pins, from the reviewer contract:** `gpt-5.6-sol`, effort `xhigh`, `--sandbox read-only`.
- **Raw output** goes to `C:\Users\nirdr\Downloads\ai4good\.claude\worktrees\artifacts-AI4DEV-57`,
  not into the tree while the gate is open. A distiller turns it into a findings-only file.
- The phase completes when the distilled findings exist and a fresh orchestrator sitting can read
  them.

The DRAFT sitting then rules every finding, amends `plan.md` in place, **pushes the rulings and the
amendment before any code is written**, and only then spawns the executor.

---

## Open questions for the founder — the conductor raises these, I do not

### 1. The signup SCREENS are not in this item, and that is a reduction against the spawn

This sitting was asked for "Lovable-driven UI work for the three account types and signup flows".
The plan removes it, for three converging reasons set out in `plan.md` section 2, decision D1:

- The decomposition manifest assigns the screens to a **different leaf** — deliverable D2's wiring
  leaf, which re-runs these same acceptance ids through real screens and adds no new ones.
- `.github/workflows/ci.yml` **fails any pull request that touches both `src/` and `supabase/`**,
  and this item has one branch. Screens plus schema in one pull request is a hard CI failure, not a
  style preference.
- The runner flag that would prove a screen works, `--wired`, **is not implemented** — it exits 3
  saying the screen driver does not exist. Screens built now could not be verified by anything.

Also, the fixture seam that `design/ui-way-of-work.md` has Lovable build against — `src/lib/data.ts`
and `src/fixtures/` — does not exist yet, so building screens now means inventing that seam too.

**If the founder wants signup screens inside this item, it becomes a second branch and a second
pull request, and the plan is amended before any code is written.** Raising this now is the whole
point; discovering it at merge would be too late.

### 2. Is there a Google OAuth client, and should one be created?

`supabase/config.toml` has no `[auth.external.google]` block at all. The plan adds one reading
credentials from the environment and proves the configuration is well-formed — the stack starts and
`/auth/v1/settings` reports Google enabled. **A real Google consent round trip is not provable
here** and needs an OAuth client with redirect URIs registered for local and hosted use. AT-001.03
is one of this leaf's four acceptance ids, so this is the gap most likely to be argued about at
merge, and it is named in advance rather than discovered.

### 3. Two checked-in documents contradict each other about where server logic lives

`CLAUDE.md` and `AGENTS.md`: *"UI code must always go through an edge function — never call the
database directly from UI code."* But `src/lib/api/example.functions.ts` says: *"Use this pattern
instead of Supabase Edge Functions for server logic"* (TanStack `createServerFn`).

I ruled it for this item — edge function, because `createServerFn` lives in `src/`, which is
Lovable's territory and which this item may not touch at all. That ruling is sound for this leaf and
does not need the founder. **It will bite the screen-wiring leaf squarely**, and somebody should
decide it properly before that leaf starts. Relayed, not escalated.

---

## Filed, not built

- **`AGENTS.md` is badly stale.** It documents `/pm-next`, `/dev-start`, `/bind` and TaskMaster —
  all deleted by the one-verb way of work — and its section 5 ends in a corrupted table fragment at
  line 93 (`---|---|` with no header). Pre-existing, unrelated to this branch, and it will keep
  misleading anything that reads it. Independent work that could stand alone: **file it, do not
  build it here.**

---

## Facts established this sitting that the next sitting should not re-derive

All five were read directly in the tree, not taken from the spawn prompt.

1. **First product code: confirmed.** `supabase/migrations/` holds only `.gitkeep` and a README;
   there is no `supabase/functions/`; `src/` is the untouched Lovable scaffold and references
   Supabase nowhere.
2. **The acceptance harness is per-requirement, not per-leaf.** `bijectionProblems()` in
   `tests/at/harness/check.ts` refuses any suite whose registered ids are not in exact bijection
   with the acceptance file's P0 set, and `runner.ts` turns that into exit 2 with nothing graded.
   Creating `tests/at/suites/req-001/` obliges all **37** call sites at once. This leaf owns 4.
3. **The integration tier cannot go green for any requirement today.**
   `adapterDerivedCapability()` stamps every `sut.<key>` a stand-in unconditionally, and
   `registry.ts` refuses any stand-in above the loop tier. The resulting failure is a plain
   `AssertionError`, which the declaration schema cannot express. Unblocking it is harness work in
   `tests/at/harness/capabilities.ts` — a different item. **This leaf's verify command is pinned to
   `bun run at:verify req-001 --tier loop --expect`**, which the manifest permits in as many words.
4. **The declaration mechanism the plan depends on is verified.** `AtPending`'s constructor builds
   `` `${atId} PENDING [${phase}] — ${detail}` `` with `name = 'AtPending'`, exactly matching the
   anchored prefix `expected.ts` uses for a `pending` red; and `executeRegisteredBody()` awaits the
   body **before** checking `testUseProblem`, so a body that throws never trips the "never opened a
   fixture world" guard. Step 2 of the plan still proves it on the real files before 37 of anything
   is written.
5. **The local Supabase stack is still UNPROVEN.** `bunx supabase --version` reports 2.110.0 and
   Docker answers with 12 containers running, but `supabase start` has never been run in this repo.
   It is step 1 of the plan for that reason, and it stops the item rather than being worked around.

---

## Caps, carried forward

- The executor gets three attempts to reach green inside one invocation, then reports.
- I may send it back twice — three invocations per sitting.
- The audit re-runs once per item, and only if code changed.
- A suspected CI flake gets one re-run of the check, with no new commit.
- A green local verify against a red CI gets two pushes, then escalation with the evidence.

When a cap fires: stop working, do not stop judging. What remains is written down as open items —
filed as separate work, or escalated as scope growth. "We ran out of rounds" is never recorded as
"the finding was invalid."
