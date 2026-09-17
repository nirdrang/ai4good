# Brief for AI4DEV-132 (credits engine and funded routing)

Chain: AI4PM-26 (AI Discovery agent, free and rate-limited, REQ-004) > AI4DEV-131 (Discovery
agent dev root) > AI4DEV-132 (credits engine and funded routing, D1)
Branch: nirdrang/ai4dev-132-credits-engine-and-funded-routing-d1
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
words: the NGO profile and vetting requirement owns the tier grants, the daily reset and the
vet raise, and this requirement owns per-turn metering and routing; the Stripe fuel top-up
requirement owns the fuel billing that funded routing draws on, and the manifest's note that
it is done is wrong, it is not built; the need attachments requirement owns the file access
model that feeds reference-file usage; the triage gate requirement consumes the tier and
edited scope; the dev-authored PRD, task management and attribution requirements are
interface-only consumers of the scope contract; the auth requirement supplies the
email-verification gate the abuse guardrails consume; the org-profile mission text is one
input to cause-label generation, reachable through the intake requirement's existing
dependency.

Item text: the parent's description, verbatim:

> Deliverable D1 of the AI Discovery agent requirement: the free daily allowance is metered per
> NGO at a constant cost-to-credit ratio and hard-resets each day, a funded project bills its
> own fuel and never the free pool, and an NGO at zero credits sees only the remedies that
> apply to its tier. A container — it folds when its leaves close.
>
> Covers acceptance ids AT-004.01, .02, .03a, .03b, .04, .05, .06, .08, .09, .47, .48 and .49.

Acceptance tests: no suite exists for this requirement. This run creates
`tests/at/suites/req-004/` and `tests/at/expected/req-004.json`, in the shape of the intake
suite under `tests/at/suites/req-003/`, and registers every id below through `atTest`. The
specification is `.taskmaster/docs/acceptance/at-req-004.md`: section A (credits and the
two-layer money model), B (conversation behavior), H (abuse guardrails and controls), I
(transparency). Fifty-eight P0 ids in the requirement, twenty in this run. The `at:check`
bijection requires every P0 id of the specification to have exactly one call site, so the
thirty-eight ids of later runs are registered in this run as pending with a stated shape,
the way the intake run registered ids that waited on other surfaces. Retired ids 07, 23 and
40 are excluded by the specification. The expected-state declaration is authored before the
first run, never copied from one. Its pending-capability names reuse the ones already in
`tests/at/expected/`, `ui.discovery-surface` among them, and add new ones only where no
existing name fits.

## Units

Units 1 to 3 are the parent's own leaves. Units 4 to 6 are extra units from the same
requirement root (founder 2026-09-16, one run). The order follows the manifest's blocked-by
edges: metering first, then funded routing, then the zero-credit remedies, then the
conversation itself, then the abuse guardrails and the transparency contract, which both
read the meter. The pull request names each unit by its short label in words, never by its
id.

### Unit 1: AI4DEV-138 (allowance metering: tier draws, constant ratio, daily reset, one grant per NGO)
Item text, verbatim:

> Free-phase Discovery draws from the tier allowance, 10 a day unverified and 30 vetted. Each
> turn charges credits at a constant cost-to-credit ratio and shows the NGO that turn's cost.
> The balance hard-resets to the tier grant once a day with no rollover. One NGO holds one
> grant shared across all its unfunded projects, not one per project. Free-phase provider
> spend never exceeds the remaining allowance and the balance never goes negative.
>
> The tier grants and the UTC hard reset are built in the NGO profile and vetting
> requirement; this leaf meters against them.
>
> **Verify:** AT-004.01, AT-004.02, AT-004.08, AT-004.47, AT-004.49
> **Blocked by:** the tier grants and the UTC reset in the NGO profile and vetting requirement, already built
> **Manifest:** `loop/decomp/req-004.md`, deliverable D1 leaf L1, revision `6fe2d7f`

Acceptance tests: AT-004.01, .02, .08, .47, .49, section A. The allowance ledger and its
read-and-debit route exist (see facts below). This unit adds the per-turn charge: provider
cost in, credits out, at a constant ratio under a stated rounding rule, with the turn's cost
recorded so that AT-004.02 can read it and AT-004.46 can reconcile every balance delta to a
turn record or the daily reset. Say in the design how a turn learns its provider cost, and
whether an underfunded turn is refused before it runs or capped, because AT-004.49 accepts
either and forbids overspend.

### Unit 2: AI4DEV-139 (funded projects bill fuel, never the free pool, and funding changes nothing else)
Item text, verbatim:

> A funded project bills every Discovery turn to its own fuel, never the NGO's free pool, at
> the same platform share as any consumption. Projects are isolated: a funded project A and an
> unfunded project B under one NGO bill A's fuel and the free pool respectively. Funding
> mid-conversation switches billing from the next turn. A funded project with exhausted fuel
> never falls back to free credits. Funding changes no model id, service tier, request
> priority, or free allowance.
>
> The fuel consumption rows belong to the Stripe fuel top-up requirement, not materialised.
> Decide in the design how fuel billing is proven until that ledger exists.
>
> **Verify:** AT-004.04, AT-004.05, AT-004.06, AT-004.48, AT-004.09
> **Blocked by:** D1.L1, plus the fuel consumption rows in the Stripe fuel top-up requirement
> **Manifest:** `loop/decomp/req-004.md`, deliverable D1 leaf L2, revision `6fe2d7f`

Acceptance tests: AT-004.04, .05, .06, .48, .09, section A. No fuel ledger exists in the
tree. The intake run's expected-state file already names the shape for this case: ids that
wait on the fuel ledger are declared red with the capability names `checkout.project-fuel`
and `billing.funded-turn`, as the NGO profile suite did for its own funded-path ids. What
this unit builds is the routing decision itself, a pure function from the project's funding
state to the billing target, with the fuel side behind a seam the Stripe run fills in. The
ids that need only the routing decision and the isolation between projects go green; the ids
that need a real fuel debit are declared red by name.

### Unit 3: AI4DEV-140 (zero-credit remedies by tier: vet, fund or wait for unverified; fund or wait for vetted)
Item text, verbatim:

> An unverified-tier NGO at zero credits on an unfunded project is blocked and shown exactly
> three remedies: get vetted, fund fuel now, or wait for the next day. A vetted NGO at zero
> credits is shown only fund fuel now or wait, never "get vetted".
>
> **Verify:** AT-004.03a, AT-004.03b
> **Blocked by:** D1.L1
> **Manifest:** `loop/decomp/req-004.md`, deliverable D1 leaf L3, revision `6fe2d7f`

Acceptance tests: AT-004.03a, .03b, section A. The NGO profile run's block at zero already
names three remedies. Read it before adding a second copy: the vetted case, two remedies,
may be a change to that reason and not a new one.

### Unit 4: AI4DEV-141 (structured elicitation on Opus over 5 to 10 turns, persisted and resumable)
Item text, verbatim:

> Discovery runs on Claude Opus as a structured elicitation over five to ten turns. On a
> representative non-technical intake fixture, its output satisfies a fixture-specific
> semantic oracle: the required facts, constraints, user stories and acceptance criteria are
> present and correct, not merely non-empty. A conversation in progress persists, and the NGO
> resumes it in a new session with full prior context.
>
> The semantic-oracle harness is built; write the fixture-specific oracles here.
>
> **Verify:** AT-004.10, AT-004.11
> **Blocked by:** —
> **Manifest:** `loop/decomp/req-004.md`, deliverable D2 leaf L1, revision `6fe2d7f`

Acceptance tests: AT-004.10, .11, section B. This unit is the one-way door of the run: it
picks how the platform talks to Anthropic from an edge function and how a conversation is
stored and resumed. Nothing in the tree calls Anthropic today. The architecture notes pin
only the model, Claude Opus, system-prompt tuning, a deterministic per-conversation turn
ceiling, and three regenerations. Bring the framework choice to the founder at the unit
gate before building on it, with the arena's candidates and your recommendation. Two hard
constraints from the project: the agent runs inside a Supabase edge function on Deno, and
the UI reaches it only through that function. The Anthropic stand-in for the acceptance
harness is a board item under the harness parent, to be built with the first consuming
suite, which is this one; that work rides in this branch. Decide in the design what the
loop tier proves against the stand-in and what the integration tier proves against the
real model, and what the fixture-specific oracle for AT-004.10 asserts.

### Unit 5: AI4DEV-156 (abuse guardrails: unverified blocked, per-NGO kill switch, no extra grants, no platform breaker, credits never sold)
Item text, verbatim:

> An email-unverified account is blocked from sending any Discovery message. A platform admin
> can switch Discovery off for one NGO. There are no supplemental free-credit grants. Heavy
> usage bounds only that NGO; there is no platform-wide breaker. Free credits are never
> purchasable and live outside the money ledger.
>
> The email-verification gate is built in the auth requirement.
>
> **Verify:** AT-004.41, AT-004.42, AT-004.43, AT-004.44, AT-004.45
> **Blocked by:** D1.L1
> **Manifest:** `loop/decomp/req-004.md`, deliverable D6 leaf L2, revision `6fe2d7f`

Acceptance tests: AT-004.41 to .45, section H. Two of the five are absence claims: no admin
path grants supplemental free credits, and no platform-wide breaker exists. The NGO profile
suite proves absences with a static arm over the shipped tree (its `_source-absences.ts`);
use that shape. The kill switch is a new admin write route, and every write route registers
with the mandatory inventory (see facts below).

### Unit 6: AI4DEV-157 (transparency: remaining credits and per-turn cost visible, zero-cost actions leave no balance delta)
Item text, verbatim:

> The NGO sees its remaining credits and the cost of each turn. A zero-cost action produces
> no balance delta.
>
> **Verify:** AT-004.46
> **Blocked by:** D1.L1
> **Manifest:** `loop/decomp/req-004.md`, deliverable D6 leaf L3, revision `6fe2d7f`

Acceptance tests: AT-004.46, section I. The screen is the wiring leaf's, not in this run.
The backend pass proves the read contract: the remaining credits and the per-turn cost
records the surface will render, and that every negative delta in the ledger matches one
turn record or the daily reset. The rendering half of the id is declared red pending
`ui.discovery-surface`, as the NGO profile suite already declares for its own view of the
same surface.

## Facts from the repository

The board does not say these. The lead needs them.

1. `main` is at `9826a88`, the verification-skill catch-up merged after the intake run. The
   branch was cut from it, and the only commit on the branch before you is this brief.
2. What the auth requirement landed: the three account types and the platform admin role;
   the `organizations`, `org_memberships`, `acknowledgments` and `projects` tables; the
   email-verification gate on unverified writing; the tenant read posture, one rule in SQL,
   reads as the caller, with a static catalog scan in CI
   (`tests/at/suites/req-001/_policy-scan.ts`) and a live catalog check at integration; the
   append-only audit table; and the mandatory write-route inventory in
   `supabase/functions/_shared/write-routes.ts` that every write route registers through,
   with a conformance check that fails an unregistered route. Every table this run adds
   joins the posture, and every write route registers with the inventory, or CI fails.
3. What the NGO profile and vetting run landed, and this run meters against: the daily
   Discovery allowance in `supabase/functions/_shared/discovery-allowance.ts` and the
   `discovery-allowance` edge route, a per-UTC-day ledger with ten credits unverified and
   thirty vetted, a `read` and a `debit` action, the high-water grant rule for a same-day vet
   raise, and the block at zero naming three remedies. The grants are pinned in the at-config
   registry as `discoveryDailyCreditsUnverified` and `discoveryDailyCreditsVetted`. The
   migration is `supabase/migrations/20260916120000_discovery_allowance.sql`. Unit 1 extends
   this ledger with per-turn cost; it does not build a second one.
4. What the intake run landed: `need_intakes` with stages `draft` and
   `discovery_in_progress`, the `project-need` route with actions start, save, attach and
   submit, the `need-intake` read route, the raw-intake snapshot, and the reference-file
   metadata with the base and hardened disclosures, all in
   `supabase/functions/_shared/need-intake.ts`. Submission moves a need to
   `discovery_in_progress`; the conversation of unit 4 starts from that stage.
5. What the notifications run landed: one shared emitter as the sole writer, the static
   taxonomy table, the outbox, and the delivery defaults, under
   `supabase/functions/_shared/`. The founder-visibility flag and the admin kill switch may
   owe a notification. If the design finds one is owed and no taxonomy row fits, that is a
   "Not done here" line, not a new row.
6. The acceptance harness: the shared contract in `tests/at/harness/contracts.ts`, the
   controlled clock, fixtures, sentinels and faults, the email provider stand-in in
   `tests/at/harness/vendors.ts`. The Anthropic stand-in is not built. The contract file says
   each vendor stand-in is built with the first suite that consumes it and its contract lands
   in that file. The suite-authoring rules are `loop/bringup/AI4DEV-3-at-harness.md`.
7. Read the intake suite's `_contract.ts`, `_fixture.ts`, `_live.ts`, `_pending.ts` and
   `_source-need.ts`, and the NGO profile suite's `_source-absences.ts` and `_source-pins.ts`,
   for the integration style the per-id gate expects: how a red id is declared with a stated
   shape, how a static arm pins a fact against the shipped tree, and how an absence is proven.
8. The verify commands: `bun run typecheck`, `bun run at:check req-004`,
   `bun run at:selftest`, `bun run at:verify req-004 --tier loop --expect`,
   `bun run at:verify req-004 --tier integration --expect`. Run the auth, NGO profile,
   intake and notifications suites at both tiers too: the write-route conformance check and
   the emitter's sole-writer scan both change their result when this run adds routes, and
   the NGO profile suite's allowance ids read the ledger this run extends.
9. The verify skill under `.claude/skills/verify-ai4good/` drives the real stack: auth, edge
   functions, the database, and the mail catcher on the 44321 block. The mechanical agent
   drives it and captures the evidence under the item folder. A real Anthropic call at
   integration tier needs a key in the local environment; `.env.example` names where secrets
   go and the tree forbids pasting any key into a file that is committed.
10. The pull request body must not name any id but the parent's own. The six units are named
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
