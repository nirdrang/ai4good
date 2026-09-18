# Brief for AI4DEV-159 (bare chat page on the Vercel AI SDK)

Chain: AI4PM-26 (the AI Discovery agent requirement) > AI4DEV-131 (Discovery dev root) > AI4DEV-137 (regeneration, abuse controls and transparency) > AI4DEV-159 (bare chat page on the Vercel AI SDK)
Branch: nirdrang/ai4dev-159-a-bare-chat-page-on-the-vercel-ai-sdk-over-the-real
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

The manifest is `loop/decomp/req-004.md`, revision `6fe2d7f`. This leaf is not in the
manifest. It is a proof leaf the founder filed on 2026-09-17 under the D6 container, before
the screen wiring leaf, to see the shipped Discovery loop work in a browser through an
off-the-shelf chat client.

Item text: A proof leaf before the screen wiring item. One route in `src/routes/` for a signed-in NGO admin with a project id, built with the Vercel AI SDK off the shelf and no design work, to see the Discovery loop work end to end in a browser: a person sends, watches the reply stream, presses stop, reloads and finds the history, and hits the credit refusals.

What it is:

* `ai` and `@ai-sdk/react` installed; `useChat` with a `DefaultChatTransport` pointed at the `discovery-message` function (the Supabase token and anon key in the headers, `Accept: text/event-stream`, the outgoing body reshaped to `{ organizationId, projectId, message }`).
* Initial messages loaded from `discovery-conversation`; the allowance shown from the send answer and the read; a stop button; `react-markdown` for the reply; a refusal shown as its reason text (email unverified, zero credits with the tier remedies, fuel exhausted, Discovery switched off).
* Every call goes through an edge function; no direct database access from the page. Deploys unchanged on Lovable and on Vercel (no server secret in the page, no host-specific API).

What it is not: the elicitation card, the scope document, regenerate, any styling beyond readable. Those belong to the screen wiring item that follows.

Evidence: the verify skill drives the page in a browser on the local stack with a provider key on the Haiku test model: a real turn, a stop mid-reply, a reload with the history, and a zero-credit refusal. No new acceptance ids; the screen's own ids stay with the wiring item.

Background: the send route emits the Vercel UI message stream behind `Accept: text/event-stream` (founder ruling 2026-09-17); the decision paper comparing Vercel `useChat`, assistant-ui and a hand-rolled client is `loop/items/AI4DEV-132/research/chat-ui.md` on main.

Acceptance tests: none registered by this item, by its own text. The item must keep the
Discovery suite and its neighbours where they are: `tests/at/suites/req-004/` at loop and
integration with `--expect`, and `req-001`, `req-002`, `req-003`, `req-016` the same way,
plus `bun run typecheck`, `bun run at:check req-004` and `bun run at:selftest`. The
evidence of this item is the verify skill's drive of the page, recorded under
`loop/items/AI4DEV-159/reports/` with its transcript under `artifacts/`. The drive script
of the previous item, `.claude/skills/verify-ai4good/scripts/drive-discovery.ts`, and its
transcript at `loop/items/AI4DEV-132/artifacts/verify-discovery/transcript.json` show the
route contract the page must speak.

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
- The stack is up, started from the previous item's lane worktree. Restart it from this
  item's worktree before any integration run or browser drive, because the edge runtime
  serves functions from the folder the stack was started in. Never paste the output of
  `bun run db:start`; write it to a file.
- The provider key for the local drive is in `.env.local` at the repository root and in
  `supabase/functions/.env` of the previous item's lane worktree, both git-ignored, with
  `DISCOVERY_MODEL=claude-haiku-4-5-20251001` beside it. Copy the function env file into
  this worktree's `supabase/functions/.env`. Never print the key and never commit it.
- codex needs `codex login --device-auth` once per fresh VM. The session banner says when.
