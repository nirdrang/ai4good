# Brief for AI4DEV-135 (structured scope output and rendering)

Chain: AI4PM-26 (AI Discovery agent, free and rate-limited, REQ-004) > AI4DEV-131 (Discovery
agent dev root) > AI4DEV-135 (structured scope output and rendering, D4)
Branch: nirdrang/ai4dev-135-structured-scope-output-and-rendering-d4
PRD slice: `loop/out/pure-s3-req-001-006.md`, lines 50 to 73, the REQ-004 section, verbatim:

> #### REQ-004: AI Discovery Agent (free, rate-limited)
>
> A conversational agent, on Claude Opus, turns intake into a scoped spec over 5–10 structured turns.
>
> **Two-layer money:** free Discovery runs on daily credits — 10/day unverified, 30/day vetted; daily reset, no rollover. Funded fuel is dollar-pegged at the standard platform share. **Routing ("Funded → all-$"):** a funded project's Discovery draws on its fuel and the free pool serves only unfunded projects. At zero credits the NGO can get vetted (→ 30), fund fuel to continue now, or wait for the next day.
>
> - Discovery elicits enough from a non-technical NGO to produce a valid technical scope; the conversation persists and resumes.
> - It reads Discovery-visible reference files, may request more mid-conversation, and may cite them; it never receives files not marked Discovery-visible (REQ-032).
> - **Structured scope output:** a summary; user stories with nested acceptance criteria; a suggested stack; a complexity tier (small/medium/large — never dollars); risk flags; a data-sensitivity tier; a maintainability-fit verdict; zero to three normalized cause labels; a Lovable recommendation with rationale; and the Lovable-vs-Claude-Code build split — which parts are built in Lovable and which are coded through Claude Code. v1 always emits both parts (every match requires an Anthropic fuel kickoff) (→ RM-15).
> - **Discovery output is a scope contract:** the source for the dev-authored PRD (REQ-036) and the scorer's gate reference; never decomposed into tasks directly.
> - **Data-sensitivity tiers** (Discovery asks what data the tool will handle before assigning one): Tier 0 (no restriction); Tier 1 (ordinary PII — a minimization reminder and NGO data-responsibility acknowledgment); Tier 2 (special-category or high-volume PII — synthetic/anonymized fixtures only during build, the NGO connecting real data itself after completion; real Tier-2 data never reaches Anthropic, Lovable, or the volunteer). The NGO owns the exposure risk and triage confirms the tier; when unsure, Tier 2; health, immigration, abuse-victim, and financial data are never below Tier 2.
> - **Maintainability fit check:** the criterion is who evolves the tool after the volunteer leaves — the maintainer, not the technology. A fit means a non-technical staffer can maintain the live app by chat, with Lovable as the durable home; internal tools (intake forms, CRUD trackers, directories, dashboards) fit by default. A need requiring ongoing developer maintenance — developer-grade, one-off, pure-backend, or Tier-2 data that cannot live in Lovable — is declined plainly, with Discovery explaining the limitation and never producing a publishable scope. No waitlist, no second track. Confidential-codebase needs are likewise declined (public-only → RM-2). Sensitive *data* is never a decline reason.
> - **Decline-then-review — every fit decline is read by a person.** The fit decline is the only consequential AI judgment in v1 that reaches a decision on its own, and it is the one an unhappy party never contests, because a declined NGO simply leaves; a miscalibrated decline evaluator would therefore be invisible by construction. So the decline is delivered and reviewed, in that order. **To the NGO:** the decline arrives immediately — kind, plainly reasoned, final in the moment, no waiting state and no service-level promise — and its copy says outright that a person reads every decline and will reach out if it was wrong. **On the project:** a durable decline record — cause, date, and the reshaping suggestion — so the declined project stays visible in the NGO's project list instead of existing only as a chat message. **To the platform:** the decline opens a platform-admin ops item carrying the project, the decline cause, and the full Discovery conversation, with an admin notification (REQ-016). The item stays open until the founder disposes it **upheld** or **overturned**; an overturn reopens Discovery and notifies the NGO. Dispositions are recorded and are the decline evaluator's calibration dataset, exactly as the founder-review records are the triage screener's (REQ-023). No decline is auto-approved and none is unauditable.
> - **Cause-taxonomy generation is self-generated and normalizing, never curated.** Discovery emits the project's cause labels (zero to three) from the org profile's mission text, the intake description, and the Discovery conversation itself — no NGO, admin, or platform staff ever curates or types a category list, and there is no admin taxonomy-management surface. Generation must normalize, not invent freely: it sees the labels that already exist across the system and reuses one that fits rather than minting a synonym, growing the vocabulary only when a need is genuinely new — emergent but converging, so that a volunteer tagged one way lines up with a project tagged another. Causes are optional throughout — v1 matching is concierge (a human reading the problem description), so a cause is a coarse aid, never a required input for intake, Discovery, or matching. The NGO may remove a wrongly generated label; it may never type or invent one. A project shown before Discovery has run (a `draft`) legitimately carries no cause labels at all.
> - Scope is regenerable a bounded number of times (each with a logged reason) before admin escalation; regenerations and system-error retries cost zero credits.
> - Discovery consumes credits in proportion to the platform cost of each turn. **File attachment never consumes credits and never interrupts** (no pre-ingestion confirm); the daily allowance bounds platform spend. Funded projects bill each turn to fuel, files included.
> - **Transparency:** the NGO can see its remaining daily credits and each turn's cost; credits are never silently removed.
> - **Free-phase scope guardrails (free credits only):** (1) a scope rule declines/redirects unrelated tasks (general Q&A, document drafting, translations, coding help); (2) a bounded per-conversation turn ceiling, past which Discovery wraps up — generate the scope or start a fresh Discovery; (3) repeated off-topic declines show a plain notice and flag the conversation for founder visibility, never a lockout. **Funded Discovery carries no scope guardrail** — the per-turn cost display and fuel gauge are the controls.
> - **Abuse guardrails:** email verification precedes any Discovery message; the daily allowance caps the per-NGO subsidy; funding only removes the wait (same model, no speed change, no allowance raise); a per-NGO admin kill switch exists; free-credit allowances cannot be supplemented by admin grants; there is no platform-wide circuit breaker (per-NGO caps bound exposure). Free credits are never purchased — no stored-value/money-transmitter/escheatment exposure — and live outside the money ledger.
>
> **No dollar estimation in v1:** the scope doc shows the complexity tier with rationale and links Lovable's public pricing where recommended; the NGO picks its fuel amount at funding ($50 minimum), topping up reactively (→ RM-16). The rendered doc plainly explains the tier and start-small advice, maintenance (the NGO evolves by chat for roughly the ~$25/mo Lovable subscription, paid directly, and owns the code), and the data tier (Tier 2 renders fixtures-only).
>
> Dependencies: REQ-003.

The manifest is `loop/decomp/req-004.md`, revision `6fe2d7f`. Its cross-contracts line, in
words, for the parts this run touches: the dev-authored PRD and task management requirements
are interface-only consumers of the scope contract, both in wave 3 and not built, so the
scope-as-contract leaf asserts against interface stubs; the org-profile mission text is one
input to cause-label generation and is already reachable through the intake requirement's
dependency on the NGO profile requirement; the emitted labels are consumed by the intake
requirement's zero-label state, the volunteer profile picker and the public card, all
display or selection consumers with no producer edge back here.

Item text: the parent's description, verbatim:

> Deliverable D4 of the AI Discovery agent requirement: the full scope output contract,
> rendering that shows no project or build cost, the scope as the contract the dev PRD and
> the scorer read, and the cause-label producer. A container — it folds when its leaves
> close.
>
> Covers acceptance ids AT-004.20, .21, .22, .24, .25, .52, .58, .59 and .60.

Acceptance tests: the suite exists at `tests/at/suites/req-004/`, built by the credits
run, with its declaration at `tests/at/expected/req-004.json`. Sixteen ids in this run,
all registered today as placeholders in `z-later-runs.test.ts` and declared red under the
pending names `discovery.scope-output` (AT-004.20, .21, .22, .24, .25, .52, .58, .59, .60),
`discovery.guardrails` (AT-004.12, .13, .14, .15) and `discovery.regeneration` (AT-004.37,
.38, .39). Each unit moves its ids out of the placeholder file into a real test file and
from red to green in the declaration, in the same commit. The specification is
`.taskmaster/docs/acceptance/at-req-004.md`: section D (structured scope output), B
(conversation behavior), G (regeneration, retries and failure). An id whose full proof waits
on a surface owned elsewhere stays red under a stated shape; the two interface-stub ids of
the scope-as-contract leaf are the ones most likely to.

## Units

Units 1 to 4 are the parent's own leaves. Units 5 and 6 are extra units from the same
requirement root (founder 2026-09-18, one run). The order follows the manifest's blocked-by
edges: the output contract first, then its rendering, the contract's consumers, and the
label producer, which all depend on it; then the guardrails, whose blockers are both Done;
then regeneration, which depends on the output contract. The pull request names each unit by
its short label in words, never by its id.

### Unit 1: AI4DEV-145 (the full scope output contract, both build-split parts always emitted)
Item text, verbatim:

> A completed Discovery emits the full output contract: summary, user stories with nested
> acceptance criteria, stack, complexity tier, risk flags, sensitivity tier, maintainability
> verdict, the Lovable recommendation with its rationale, and both build-split parts, always.
>
> **Verify:** AT-004.20, AT-004.22
> **Blocked by:** D2.L1
> **Manifest:** `loop/decomp/req-004.md`, deliverable D4 leaf L1, revision `6fe2d7f`

Acceptance tests: AT-004.20, .22, section D. The credits run ended a conversation with the
`record_elicitation` tool call: facts, constraints, user stories with acceptance criteria,
open questions, stored as `elicitation` on the settling turn (see facts below). The scope is
the second structured output, generated from a completed elicitation. Decide in the design
where the scope lives, on the need, on a turn, or in its own table, and how "completed
Discovery" is defined: the elicitation's `complete` flag, the turn ceiling of unit 5, or
both. Two fields of the contract, the sensitivity tier and the maintainability verdict, are
produced by the tiers and fit leaves of a later run; here they are fields with a stated shape
that a later run fills with judgment. The stage after scoping belongs to the lifecycle
state-table requirement, which is not built; the need's stages today are `draft` and
`discovery_in_progress` only. Say in the design how a scoped need is marked without
inventing that requirement's engine.

### Unit 2: AI4DEV-146 (money-free rendering: no build-cost estimate, per-tier explanations of data, complexity, maintenance and pricing)
Item text, verbatim:

> The rendered scope shows no project or build-cost estimate anywhere. The approximate
> monthly maintenance figure and the Lovable pricing link are permitted. Each tier's rendered
> document explains its data tier, complexity, maintenance expectation and pricing.
>
> **Verify:** AT-004.21, AT-004.25
> **Blocked by:** D4.L1
> **Manifest:** `loop/decomp/req-004.md`, deliverable D4 leaf L2, revision `6fe2d7f`

Acceptance tests: AT-004.21, .25, section D. The rendered document is a product artifact
the NGO reads, not a screen. The backend produces it as markdown from the contract, the way
the chat page renders assistant text through react-markdown; the screen that shows it is the
wiring leaf's. AT-004.21 is a negative claim over every output: no build-cost figure, the
complexity tier never in money. AT-004.25 reads three fixture documents, one per tier, and
checks the explanations. The maintenance figure and the Lovable pricing link are copy;
copy modules for this tree live beside the code that serves them
(`need-intake-copy.ts`, `notification-copy.ts`, `acknowledgment-copy.ts`).

### Unit 3: AI4DEV-147 (scope as contract: the PRD source and the scorer's gate reference, backlog never derived directly)
Item text, verbatim:

> The Discovery output is the source the dev PRD is authored from and the reference the
> completion scorer gates against. The initial backlog derives only from a passing dev PRD,
> never from the Discovery output directly.
>
> The PRD authoring and scorer belong to the dev-authored PRD requirement, and the backlog
> derivation to the task management requirement, both in wave 3. Interface stubs here; decide
> in the design what the stubs assert.
>
> **Verify:** AT-004.24, AT-004.52
> **Blocked by:** D4.L1
> **Manifest:** `loop/decomp/req-004.md`, deliverable D4 leaf L3, revision `6fe2d7f`

Acceptance tests: AT-004.24, .52, section D. What this run can own: a stable, versioned
read of the scope that a later consumer takes as its source, and the absence of any path
that decomposes a scope into tasks. The consumers do not exist. Decide in the design what
is provable now and declare the rest red by name; a new pending-capability name for the
PRD and scorer is acceptable if no existing name fits.

### Unit 4: AI4DEV-148 (cause-label producer: 0 to 3 normalised labels, vocabulary reuse, deletion-only correction)
Item text, verbatim:

> The structured scope carries zero to three normalised cause labels. Generation reuses the
> existing shared vocabulary when a need fits an existing label and grows it only for a
> genuinely new domain. The NGO corrects by deletion only; invention stays machine-owned. No
> admin taxonomy-management surface exists anywhere.
>
> Consumers of these labels live elsewhere: the zero-label pre-Discovery state in the intake
> requirement, the volunteer profile picker, and the public card. The org-profile mission
> text is one input to generation.
>
> **Verify:** AT-004.58, AT-004.59, AT-004.60
> **Blocked by:** D4.L1
> **Manifest:** `loop/decomp/req-004.md`, deliverable D4 leaf L4, revision `6fe2d7f`

Acceptance tests: AT-004.58, .59, .60, section D. The intake run left the column ready:
`need_intakes.cause_labels text[]` with a check that a draft carries none, and the intake
read returns it. There is no shared vocabulary table yet; this unit creates it. The
normalisation test is a model-judgment test: given "food security" in the vocabulary and a
food-bank need, the label emitted is "food security" and not a synonym. Decide in the design
how the model sees the existing vocabulary and how the loop tier proves reuse against the
Anthropic stand-in while the integration tier proves it against the real model, the way the
credits run split AT-004.10. The deletion route is a new write route on the need and
registers with the write-route inventory. AT-004.60's second half is an absence claim over
the whole product: no create or curate control for labels, no admin taxonomy surface. The
suite's `_source-absences.ts` has the shape.

### Unit 5: AI4DEV-142 (free-phase guardrails: scope rule, turn ceiling, off-topic notice, no lockout, none when funded)
Item text, verbatim:

> On free credits the agent declines or redirects unrelated tasks (general questions, document
> drafting, translation, coding help) back to scoping. Past the bounded per-conversation turn
> ceiling, Discovery wraps up: it generates the scope or directs the NGO to start a fresh
> Discovery. Repeated off-topic requests produce a plain notice and a founder-visible flag,
> never a lockout. Funded Discovery carries no guardrail.
>
> **Verify:** AT-004.12, AT-004.13, AT-004.14, AT-004.15
> **Blocked by:** D2.L1, D1.L2
> **Manifest:** `loop/decomp/req-004.md`, deliverable D2 leaf L2, revision `6fe2d7f`

Acceptance tests: AT-004.12 to .15, section B. The architecture notes pin the mechanics: a
system-prompt scope line, a deterministic per-conversation turn ceiling, platform-configurable
and pilot-tuned, and a repeated-off-topic decline counter that raises a founder-visibility
flag. The ceiling is a number that exists nowhere; it goes into the at-config registry as a
pin with its source, the way the turn deadline did, and needs a founder ruling at the gate
before this unit. The system prompt today already says "stay within the stated need"; the
scope rule extends it, and the off-topic count is a fact the platform records, not a model
opinion. Decide in the design how a decline is detected deterministically enough to count.
The wrap-up at the ceiling is the scope generation of unit 1 or a fresh-Discovery
instruction. The funded case, AT-004.15, reads the billing target the credits run landed:
`fuel` means no guardrail at all. The founder-visibility flag may owe a notification; see
the facts below.

### Unit 6: AI4DEV-155 (regeneration: bounded, logged reasons, zero credits, admin escalation when exhausted)
Item text, verbatim:

> Scope regeneration is bounded, each regeneration logs its reason, and it costs zero
> credits. When the bound is exhausted the case escalates to an admin. Retries after a system
> error cost zero.
>
> **Verify:** AT-004.37, AT-004.38, AT-004.39
> **Blocked by:** D4.L1
> **Manifest:** `loop/decomp/req-004.md`, deliverable D6 leaf L1, revision `6fe2d7f`

Acceptance tests: AT-004.37, .38, .39, section G. The architecture notes pin the bound at
three; it goes into the at-config registry. The credits run's turn ledger already has the
shape for zero cost: a `failed` turn is constrained to charge zero, and that pull request's
"Not done here" list assigns "per-turn regenerate as a zero-cost retry, and the error retry"
to this leaf. Regeneration produces a new scope version, which is why unit 3's versioned
read matters. The admin escalation is a platform-admin item; the ops-item store belongs to
the operations requirement in wave 5, so escalation here is a durable record plus the admin
notification through the emitter, in the shape the vetting run used for its outcomes.

## Facts from the repository

The board does not say these. The lead needs them.

1. `main` is at `d4f92db`, the squash of the bare chat page item. The branch was cut from it,
   and the only commit on the branch before you is this brief.
2. What the credits run landed, and this run builds on. The turn ledger
   `discovery_turns` (migration `20260920120000_discovery_turns.sql`): one open turn per
   project, statuses `open`, `settled`, `failed`, `abandoned`, the reserve-then-settle
   contract enforced by constraints, the `elicitation` jsonb on the settling turn, and
   `request_settings` per turn. The modules under `supabase/functions/_shared/`:
   `discovery-turn.ts` (prepare, act, stream, settle), `discovery-metering.ts` (micros per
   credit, token prices, the billing target `free` or `fuel`, reservation and settlement
   math), `discovery-prompt.ts` (the system prompt template, the need block, and the
   `record_elicitation` tool with its strict schema and parser), `anthropic-messages.ts`
   (the one Anthropic port, model `claude-opus-5`, prompt caching on the static block),
   `discovery-stream.ts` (the event-stream parts the Vercel AI SDK reads: `start`,
   `text-delta`, `data-turn`, `error`, `finish`), `discovery-switch.ts` (the per-NGO kill
   switch), `discovery-skills.ts` (skill text folded into the cached system block), and
   `discovery-reads.ts` (the read contract). Two routes: `discovery-message` (send, streams)
   and `discovery-conversation` (read). The design record is under
   `loop/items/AI4DEV-132/design/`, the winning candidate is
   `candidate-4-reserve-settle.md`, and the decisions trail is `decisions.tsv` there.
3. What the chat page item landed: a route at `/discovery/:organizationId/:projectId` on
   the Vercel AI SDK, `useChat` over the two routes, the stream format now fixed by that
   page. A new stream part for the scope or a label set must be one the page can ignore
   today and render later. The verify skill gained a script that walks the product path on
   the local stack and a recipe for driving the chat page in Chrome
   (`.claude/skills/verify-ai4good/`). The CI two-territory guard is gone; the front end is
   built in this tree and deploys on Lovable or Vercel.
4. What the intake run landed: `need_intakes` with stages `draft` and
   `discovery_in_progress`, `cause_labels text[]` with the draft-has-no-labels check, the
   `project-need` write route with actions start, save, attach and submit, the `need-intake`
   read, and the raw-intake snapshot. `supabase/functions/_shared/need-intake.ts` is the
   module.
5. What the NGO profile run landed: the organisation profile with its mission text
   (`set-organization-profile`, `organization-dashboard`), read through the tenant reads.
   The mission text is one input to label generation.
6. What the notifications run landed: one shared emitter as the sole writer, the static
   taxonomy table, the outbox, and the delivery defaults, under
   `supabase/functions/_shared/`. The founder-visibility flag of unit 5 and the admin
   escalation of unit 6 each look like a notification. Read the taxonomy before adding a
   row: the credits run left "kill-switch notification when a taxonomy row exists" as not
   done because no row fit. A new row is a taxonomy change with its own test in the
   notifications suite; if the design finds one is owed, build it in this branch and say so,
   or list it under "Not done here".
7. The auth requirement's standing rules: every table joins the tenant read posture, one rule
   in SQL, reads as the caller, checked by the static catalog scan
   (`tests/at/suites/req-001/_policy-scan.ts`) and a live check; every write route registers
   with the inventory in `supabase/functions/_shared/write-routes.ts`, or CI fails.
8. The acceptance harness facts for this run: the Anthropic stand-in for the loop tier landed
   in the credits run (see `tests/at/suites/req-004/_fixture.ts` and
   `fixtures/grant-tracker.ts`); the integration tier runs the real model when a key is in
   the environment, and declares `vendors.anthropic` red when it is not. The pending names
   are in `_pending.ts`. The suite-authoring rules are `loop/bringup/AI4DEV-3-at-harness.md`.
   Read `_contract.ts`, `_fixture.ts`, `_live.ts`, `_source-absences.ts` and
   `_source-pins.ts` before adding a test file.
9. The at-config registry (`tests/at/harness/atconfig.ts`) holds every pinned number with its
   source. The turn ceiling and the regeneration bound are new pins. The architecture notes
   (`.taskmaster/docs/architecture-notes.md`, section REQ-004) give three regenerations; the
   ceiling has no number anywhere and needs a founder ruling at the unit 5 gate.
10. The verify commands: `bun run typecheck`, `bun run build`, `bun run at:check req-004`,
    `bun run at:selftest`, `bun run at:verify req-004 --tier loop --expect`,
    `bun run at:verify req-004 --tier integration --expect`. Run the auth, NGO profile,
    intake and notifications suites at both tiers too: the write-route conformance check,
    the emitter's sole-writer scan, and the intake suite's zero-label id all change their
    result when this run adds routes, taxonomy rows, or the label producer.
11. The verify skill under `.claude/skills/verify-ai4good/` drives the real stack. The
    mechanical agent drives it and captures the evidence under the item folder. A real
    Anthropic call at integration tier needs a key in the local environment; the tree forbids
    pasting any key into a committed file.
12. The pull request body must not name any id but the parent's own. The six units are named
    in words.

## The ask
Run this item in poteto-mode, end to end, and open one pull request from this branch.
If the brief has Units, design once for the whole subtree, then build and verify the units
in order, one commit group per unit, each unit green before the next starts. The pull
request body names each unit by its short label in words, never by its id.
Ground it with /how in critique mode first: explorers, explainer, then the critics, on
every item.
In the design arena, give every runner a distinct structural direction, so the candidates
do not converge on one design. The runner lanes are the sheet's four; add none.
Tool-heavy work that needs an executor goes to the mechanical agent with exact instructions:
the rebase into ordered commits, driving the verify skill on the real surface, and the closing
commands. You decide and you judge the evidence; it types; you check each result once.
The acceptance suite is not lane work. Run its commands yourself as background shell commands
that write their output to a file, and read back only the exit code and the green and red
counts. A lane costs about eighty thousand tokens whatever it runs; a background command costs
a few hundred. Verify once per unit boundary and once on the merge head, and not in between
unless code changed. Run the integration tier twice only where a procedure waits on real
elapsed time.
Every delegated lane writes its full report to a file under the item folder and replies
with five lines and the path. Read the file only when the summary names a deviation, a
blocker, or a red.
A unit goes to the hardest-tasks lane only when the writer must still design something. A
unit that applies a fixed contract goes to the feature lane. Say which in the decision trail.
At every unit boundary, after the unit's commit is on the branch and the resume note is
rewritten, stop at a gate opened with the `AskUserQuestion` tool, never as prose (founder
2026-09-13: "I want you to update this gate to use the askuserquestion tool"). One question
whose options are continue or compact, with what the unit landed, its commit, and the
remaining context budget in the question text; a second question for any decision the next
unit needs from the founder. The founder's answer starts the next unit.
The comment audit before review runs on the mechanical model with the comment-sicko prompt,
never on your own model.
Do not name any other item's id in the pull request title or body.
The pull request body carries Why, Scope, Tradeoffs, Blast Radius, and Verification.
Then close the item as the Closing section says. You close it, nobody else.

## Closing (the git part is yours, the board is not)
1. Wait for CI to be green on the exact head of the pull request, and for the founder to
   say "merge". Both, never one.
2. Hand the git mechanics to the `mechanical` agent with exact commands. You decide, it
   types: `gh pr merge <n> --squash`. The merge closes the item on the board through the
   pull request link. Never touch the board yourself. Delete no branch and no worktree: the
   founder keeps merged branches for reflection, and deletes by name when they choose
   (founder 2026-09-06).
3. Leave the worktree with `ExitWorktree(action: "keep")`.
4. Invoke `/controller done <item>`. That skill does the board steering. Do not do it
   yourself.

## Mechanics never spend your calls
Fable calls are scarce. Tool-heavy work without judgment, the station 7 rebase, the merge
and cleanup commands, goes to the `mechanical` agent (sonnet, inherits the worktree,
executes exact instructions, rules on nothing). Write the exact plan, let it run, check the
result with one read. Do not use a fork for this: a fork runs on your own model.
The acceptance suite's commands are not mechanical work. A background shell command runs them
for a few hundred tokens where a lane spends about eighty thousand; on the notifications item
ten verification lanes cost 746k tokens to execute about thirty minutes of commands.
A writer that dies after finishing its work is recovered by running the pin and committing
the finished tree, not by rerunning the writer.

## The evidence bar
- The verify suite for the acceptance tests above passes on the final head, run as background
  shell commands. Name each check, its exit code, its counts and its timestamp in the
  Verification section.
- CI is green on the final head.
- Discovered work goes in a "Not done here" list in the pull request body, never in the diff.

## Environment facts
- One database, the stack `supabase/config.toml` describes, local and cloud alike. Start it
  with `bun run db:start`; every integration run resets it.
- codex needs `codex login --device-auth` once per fresh VM. The session banner says when.
