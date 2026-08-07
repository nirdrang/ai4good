# AI4DEV-48 (a green can be faked) — phase state

**Phase just completed:** PLAN (sitting 1)
**Phase next:** GATE 1 — critique of the plan
**Branch:** `nirdrang/ai4dev-48-a-green-can-be-faked-capability-provenance-is-a-caller`
**Chain, derived:** AI4DEV-48 (a green can be faked) → parent AI4DEV-3 (AT harness), a bring-up
root under the W0 Bring-up project, carrying `attr:bringup`. No requirement above it, so no
evidence gate — this closes on a merged pull request like any other foundation item.

---

## THE OPUS FALLBACK IS IN FORCE FOR THIS ITEM, NOT JUST THIS SITTING

Fable is out of credit. Every orchestrator sitting on AI4DEV-48 runs as `orchestrator-opus`
(opus at effort max), which is a different agent TYPE, never a model override on the fable
definition. A fable ruling and an opus ruling are not the same evidence: read every ruling in this
item, including the plan's decisions D1–D7, as an opus ruling. Any successor sitting that finds
itself running as fable should say so in its first line rather than assume continuity.

---

## What the plan decided, in one paragraph

Provenance stops being a word a caller passes and becomes a verdict the harness computes. The
`realCapability` / `standInCapability` pair is removed; one constructor computes the verdict from a
witness registered per capability name, and a name with no witness is refused rather than defaulted.
The clock and the vendor simulator are refused on the CONTROL SEAM they expose — a capability that
can be commanded to jump forward is not time, and one that can be told to reject the next N sends is
a simulator — which is what gives the change teeth, because faking either verdict means removing the
seam the suites drive. The fixture worlds and every system-under-test member are refused on the
adapter module path the harness actually loaded them from. The three harness-owned capabilities stay
real. The oracle keeps the derivation it already has and is only rewired.

Full plan: `loop/items/AI4DEV-48/plan.md`. Gate 1 prompt: `loop/items/AI4DEV-48/gate1-prompt.txt`.

---

## What completes GATE 1

The reviewer is **sol at effort xhigh, `--sandbox read-only`**, reading `plan.md` at this commit
plus the code it makes claims about. The prompt is `loop/items/AI4DEV-48/gate1-prompt.txt`, which is
the base contract in `.claude/skills/work/reviewers.md` plus eleven additive attack directions.
Its raw output goes to the item's artifacts directory, is distilled, and the DRAFT sitting rules on
every finding before any code is written.

**Gate 1 is complete when** the distilled findings file exists and is non-empty in the sense the
invariants require — a genuine "no findings" line counts, a progress-line-only or empty output does
not and must be re-run.

**The three answers that matter most**, because the plan is exposed on them and a successor sitting
should read the distillate for these first:

1. **Question 1 — decision D5.** The plan partially REJECTS the very critique that created this
   item: it adopts "a relabelled reference adapter must be refused" and rejects "build a
   structurally separate integration adapter path." If Gate 1 names a concrete defect that only the
   separate path closes, the plan changes shape rather than absorbing an argument.
2. **Question 3 — the self-defeating-lie claim.** The plan's teeth rest on it. If the clock or
   vendor seam can be hidden from the witness without reddening a test, section 7's claim is
   overstated and must be narrowed before it is built, not after.
3. **Question 4 — is decision D4 a check or a constant with extra steps.** The plan refuses
   `fixtures.worlds` and `sut.*` on the loaded module URL and explicitly declines to add a `backing`
   declaration to the adapter. Both halves are deliberately exposed to attack.

---

## Question for the founder

**None at this time.** Nothing in this plan contradicts ratified text and nothing in it is scope
growth. The one place the plan reasons by extension rather than by direct application — it leans on
the founder ruling of 2026-08-04 about vendor stand-ins (`loop/bringup/AI4DEV-3-at-harness.md`
lines 52–64) to justify not building an integration adapter, and that ruling is written about the
five named vendor sims — is put to Gate 1 as attack question 11 rather than to the founder. If Gate
1 finds the ruling does not bear on this case, that becomes a founder question and the DRAFT sitting
raises it.

---

## To report upward for filing — separate items, absorbed nowhere

The founder considers this the last acceptance-test-engine item before product work begins, so
scope growth is unusually costly. Two things surfaced during this sitting that are real and are NOT
being built here:

1. **The static provider scan has no board item.** `h.static` is an unconditional
   `pendingCapability` (`tests/at/harness/index.ts:173`), which is why AT-016.01 is the one red in
   the notification suite. It is H3 work left unbuilt when H3 closed — AI4DEV-19 (sentinels and
   fault injection) is Done — and it is harness-owned, buildable today, and independent of the
   product. I searched the board and found no item owning it. Worth noting that AI4DEV-30 (declared
   reds must name their owning item), the machinery that would have made an unowned red impossible,
   is itself still in Backlog. **Recommend filing.**
2. **A typed `stubbed-capabilities` failure kind** — so the integration-tier refusal is
   structurally declarable rather than matched as free-form text. This was a separate finding of the
   same Gate 1 review that produced this item. It is close enough to AI4DEV-28 (structured
   capability codes), whose own text says it *"Belongs to the slice that owns `capabilities.ts`"*,
   that it should be **added to that existing item rather than filed fresh**.

Also flagged, not for filing: AI4DEV-28 wants a machine-readable code emitted from
`capabilities.ts` — the exact file this item rewrites. It is deliberately not absorbed. The only
obligation carried into the DRAFT sitting is negative: the rewrite must not make emitting such a
code harder than it is today.

---

## For the mechanical opening the pull request

The body must **name no item id other than this branch's own**. Any other id links that item and
moves it on the board even without a closing verb — a finished item was dragged back to In Progress
twenty-four minutes after its own merge by a body that carried a bare reference. This item's record
cites several sibling ids in `plan.md`, which is fine in a file and is not fine in the pull request.
Refer to them in words. CI enforces this and will fail the build.

---

## Verify surface for this item

`bun run typecheck` · `bun run at:selftest` · `bun run at:verify req-016 --tier loop --expect` ·
`bun run at:check` · `bun run lint`. Expected per-id state and the negative controls are in
`plan.md` section 5. `tests/at/expected/req-016.json` must come out byte-identical, confirmed with
`git diff --stat` rather than by eye.
