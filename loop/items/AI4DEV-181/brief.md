# Brief for AI4DEV-181 (Discovery wired to backend)

Chain: AI4PM-26 (Discovery agent requirement) > AI4DEV-131 (Discovery dev root) > AI4DEV-178 (Discovery screen, three phases) > AI4DEV-181 (Discovery wired to backend)
Note on the chain: on the board, AI4DEV-178 has no parent. The founder placed it under AI4DEV-131 at the pickup of the phase 2 item, 2026-09-29. The board is not re-parented.
Branch: nirdrang/ai4dev-181-phase-3-discovery-screen-wired-real-transport-and-backend-on

Founder decisions at this pickup, 2026-10-02:
- The board text of step 5 was rewritten to the automatic file ingest decision of 2026-10-01 ("Update board text"). The text below is the corrected one.
- This item absorbs AI4DEV-158 (old Discovery workspace wiring) ("Absorb, close 158 later"). That item stays open until this merges; `/controller done` then proposes closing it as replaced. Its verify ids, AT-004.10, .11 and .46, join this item's acceptance tests.

This item is the screen wiring stage of the Discovery screen. `.claude/skills/controller/screen-stages.md`, section "Screen wiring", lists that stage's steps; the item text below covers them, and the verify-ai4good feature map update (its step 4) is part of done.

PRD slice: `loop/out/pure-s3-req-001-006.md`, section "REQ-004: AI Discovery Agent (free, rate-limited)", verbatim below. The item also touches `loop/out/pure-s6-req-027-036.md`, sections "REQ-032: Project Need Attachments" (the three-file limit, AT-032.13) and "REQ-036: Shared PRD Workspace, Completion & Materialization" (the scope that moves to the PRD step, AT-036.11 and .12); read those two sections there.

#### REQ-004: AI Discovery Agent (free, rate-limited)

A conversational agent, on Claude Opus, turns intake into a confirmed Discovery document about the need over 5–10 structured turns.

**Discovery pilot funding:** one free credit covers one completed AI reply, regardless of token usage or internal model calls. The enrolled project receives 10 free turns per day and 50 across the beta (REQ-002). If both counters have capacity, Discovery uses a free turn first, including on funded projects. Otherwise, it uses available project fuel in USD. When neither source is available, the draft persists and sending stops. Show the next daily reset only when beta capacity remains. Show ordinary fuel checkout for paid continuation. Vetting never restores free capacity.

- Discovery elicits enough from a non-technical NGO to describe the need: who uses the tool, how they work today, what must change, and how the NGO will know it works. Discovery is about the need, not the technology. The stack, complexity tier, Lovable recommendation, build split, and story acceptance criteria belong to the PRD step (REQ-036). Only the NGO and AI participate in this chat. The conversation persists and resumes with its question, answer, brief, and funding state intact.
- **Question progression:** reuse intake facts. Ask the next unresolved question and explain why it matters. Independent questions may share a round. Dependent questions wait for prerequisite answers. Offer suggested answers, a custom answer, and an explicit uncertainty option. The agent records uncertainty instead of inventing an answer. Answers update the visible Discovery brief. If an answer changes, mark affected dependent answers for review.
- **Live brief:** each AI reply updates the brief in the same model call. The update records the questions asked with their options, the suggested option, and an importance; the answers agreed, with their source turn; facts proposed from file digests; and the open questions with their importance. Importance is one of: needed before build, a suggestion exists, or can wait. A fact from a file stays a suggestion until the NGO agrees. The live brief is the Discovery record; no closing model call rebuilds it.
- **Discovery completion:** show the percentage and count of agreed topics, the remaining topics, and Finish Discovery. Progress measures resolved topics, not messages, tokens, fuel, or elapsed time. Use a stable topic checklist; conditional follow-up questions belong to their topic. Finish Discovery stays enabled and primary from the start, including at zero coverage or with no fuel. It opens one review page with the current brief and makes no model call. The open questions come first, each with its importance, why it matters, and any suggested answer. The NGO can accept a suggestion, return to the chat to answer, or keep the question open. The NGO can edit any brief section on the review page; saving is free, creates a new revision, and clears the review acknowledgment. The NGO can return to the conversation or acknowledge the gaps and confirm completion anyway. Unresolved topics and an empty summary do not block acknowledged completion. Keep accepted gaps in the confirmed brief for project review and volunteer matching. Progress retains actual topic coverage; confirmation does not invent answers or force 100%. The agent stops asking when required topics are resolved or the NGO confirms completion. Optional detail does not prolong Discovery. Existing human review holds and data responsibilities remain separate from missing information. Reading, review, and completion require no turns or paid fuel. A changed answer reopens affected topics and invalidates approval. The shared process bar remains separate.
- **After Discovery:** the shared project step becomes Volunteer match. The Find a volunteer action opens publication review (REQ-005). Existing vetting and human review requirements remain. ai4good coordinates the match, and the volunteer must consent. PRD work starts after consent and funding kickoff (REQ-005.5, REQ-036). Matching does not add a lifecycle state or extend the Discovery chat.
- **NGO confirmation:** the NGO reviews and confirms the current brief before Discovery completes (REQ-005.5). If information remains missing, require explicit acknowledgment of those gaps alongside the existing scope and data acknowledgments. Record the approver, brief revision, timestamp, and the accepted gaps with their reasons. Confirmation with accepted gaps survives reload. The AI cannot approve for the NGO. Edits invalidate approval of an older revision. Reading, manual edits, reviews, and approval consume no free turns or paid AI usage.
- **Reference files:** while the project has fewer than three Discovery files, the first AI reply asks for files that show how the NGO works today and names the kinds that would help this need. Adding a file opens a short file chat with one question: what should we know about this file, with suggested answers and free text. The answer starts the read. One read processes the whole file, in parts when the file is large, with the NGO's answers as its instruction, and stores a digest: the facts that matter for the need and the questions the file raises. If the AI needs more to finish the read, it pauses and asks in the file chat until the read is complete. Each NGO answer in the file chat is one Discovery turn, free or paid. The read itself consumes no turn and no fuel. The NGO can close the file chat and keep using the main chat during the read; the file list shows reading progress, a waiting question, and then the number of facts found. Later turns receive the digests, not the files. The next AI reply says what the file showed, and the AI may cite files. Every uploaded file is read; there is no visibility choice. While the project is not funded, the NGO can add at most three files in Discovery; intake files do not count (REQ-032).
- **Discovery document:** the confirmed live brief, rendered by code. It holds the need in the NGO's words; who uses the tool and how they work today; the agreed answers with their sources; how the NGO will know it works; the open questions kept, with their importance; each file with what the AI took from it; the data-sensitivity tier; the maintainability-fit verdict; and zero to three normalized cause labels. It shows no stack, complexity tier, build split, or cost. The NGO changes it through the chat or by editing the brief; the AI never rewrites the document.
- **Discovery output is the need contract:** the source for the dev-authored PRD (REQ-036) and the scorer's reference for the need; never decomposed into tasks directly.
- **Data-sensitivity tiers** (Discovery asks what data the tool will handle before assigning one): Tier 0 (no restriction); Tier 1 (ordinary PII — a minimization reminder and NGO data-responsibility acknowledgment); Tier 2 (special-category or high-volume PII — synthetic/anonymized fixtures only during build, the NGO connecting real data itself after completion; real Tier-2 data never reaches Anthropic, Lovable, or the volunteer). The NGO owns the exposure risk and triage confirms the tier; when unsure, Tier 2; health, immigration, abuse-victim, and financial data are never below Tier 2.
- **Maintainability fit check:** the criterion is who evolves the tool after the volunteer leaves — the maintainer, not the technology. A fit means a non-technical staffer can maintain the live app by chat, with Lovable as the durable home; internal tools (intake forms, CRUD trackers, directories, dashboards) fit by default. A need requiring ongoing developer maintenance — developer-grade, one-off, pure-backend, or Tier-2 data that cannot live in Lovable — is declined plainly, with Discovery explaining the limitation and never producing a publishable scope. No waitlist, no second track. Confidential-codebase needs are likewise declined (public-only → RM-2). Sensitive *data* is never a decline reason.
- **Decline-then-review — every fit decline is read by a person.** The fit decline is the only consequential AI judgment in v1 that reaches a decision on its own, and it is the one an unhappy party never contests, because a declined NGO simply leaves; a miscalibrated decline evaluator would therefore be invisible by construction. So the decline is delivered and reviewed, in that order. **To the NGO:** the decline arrives immediately — kind, plainly reasoned, final in the moment, no waiting state and no service-level promise — and its copy says outright that a person reads every decline and will reach out if it was wrong. **On the project:** a durable decline record — cause, date, and the reshaping suggestion — so the declined project stays visible in the NGO's project list instead of existing only as a chat message. **To the platform:** the decline opens a platform-admin ops item carrying the project, the decline cause, and the full Discovery conversation, with an admin notification (REQ-016). The item stays open until the founder disposes it **upheld** or **overturned**; an overturn reopens Discovery and notifies the NGO. Dispositions are recorded and are the decline evaluator's calibration dataset, exactly as the founder-review records are the triage screener's (REQ-023). No decline is auto-approved and none is unauditable.
- **Cause-taxonomy generation is self-generated and normalizing, never curated.** Discovery emits the project's cause labels (zero to three) from the org profile's mission text, the intake description, and the Discovery conversation itself — no NGO, admin, or platform staff ever curates or types a category list, and there is no admin taxonomy-management surface. Generation must normalize, not invent freely: it sees the labels that already exist across the system and reuses one that fits rather than minting a synonym, growing the vocabulary only when a need is genuinely new — emergent but converging, so that a volunteer tagged one way lines up with a project tagged another. Causes are optional throughout — v1 matching is concierge (a human reading the problem description), so a cause is a coarse aid, never a required input for intake, Discovery, or matching. The NGO may remove a wrongly generated label; it may never type or invent one. A project shown before Discovery has run (a `draft`) legitimately carries no cause labels at all.
- System-error retries cost zero credits.
- **One charge per turn:** reserve one free turn atomically before dispatch and consume it only when the reply completes. Automatic retries belong to that turn. Failed turns release the reservation. The funding mode stays fixed throughout the turn. Never convert part of a free reply into a paid charge. Uploading and reading a file consume no turn and require no spending confirmation. Each file-chat answer is a turn in the selected mode.
- **Free-first routing:** after the daily reset, eligible replies use free turns again. If the beta allowance is exhausted, daily resets provide no further free replies. Buying fuel does not increase either allowance. Free calls use a platform-funded provider budget. Paid calls use the project fuel budget. Paid fuel exhaustion cannot block eligible free calls. Provider reconciliation must never charge free usage to the NGO.
- **Paid Discovery metering:** the API reports usage; the backend calculates USD from each call's model, service configuration, and versioned rates. Price uncached input, cache reads, cache writes by duration, output, and separately billed tools without overlap. Sum internal calls once. Preserve fractional cents. Reserve an authorized paid amount before dispatch. Settle reported usage once per request and turn. Missing usage remains pending. Apply the existing 15% configurable platform fee, locked per turn, at consumption and show it separately. Provider billing reconciliation posts visible adjustments, never a second charge for the same usage (REQ-006/034).
- **Discovery interface:** use the agreed question workspace and live brief in `design/discovery-ui-contract.md`. Inherit the application font and shared theme variables from `src/styles.css`. Show only the current gate's usage gauge. Show today's free turns, remaining beta turns, paid USD available, and the next reply's Free or Paid mode before Send. Free quota has no dollar conversion. Show each completed turn's charge and any pending settlement. Gauge colors use the unrounded percentage consumed: green below 80%, yellow from 80% through 95%, and red above 95% through 100%. Keep text labels alongside color. No other gate's gauge appears inside Discovery. Remaining paid allocation becomes available to the next gate after NGO approval, retaining pending reservations. No transfer creates money, changes the project's total fuel, or converts free quota into dollars.
- **Free-turn scope guardrails:** unrelated tasks receive a scope redirect. There is no per-conversation turn ceiling: the NGO can say stop at any time, and Discovery then wraps up with the open questions listed. When a free-turn quota runs out, Discovery offers brief review or paid continuation. A new conversation does not replenish daily or beta counters. Repeated off-topic requests show a notice and flag the conversation for founder visibility, without lockout. These rules follow the selected free mode even when the project has fuel. Paid turns use the cost display and fuel gauge without the free scope guardrails.
- **Abuse guardrails:** email verification precedes every Discovery message. Cohort admission and daily and beta counters bound the number of sponsored replies, not their dollar cost. Funding changes no model, service priority, or allowance. A per-NGO admin kill switch exists. Admins cannot issue supplemental free grants. The cohort admission cap does not stop other enrolled NGOs when one NGO exhausts its quota. Free counters stay outside the money ledger. Free credits are never purchased.

**No dollar estimation in v1:** the Discovery document shows no cost. The NGO picks its fuel amount at funding ($50 minimum), topping up reactively (→ RM-16). The Discovery document explains the data tier plainly (Tier 2 renders fixtures-only). The complexity tier, maintenance expectations, and Lovable pricing are explained in the PRD step (REQ-036).

Dependencies: REQ-003.

---

Item text (the board description of AI4DEV-181, verbatim, after the founder's step 5 correction of 2026-10-02):

Phase 3 of 3: connect the phase 2 components to the real backend, with pstack, and prove it by driving the real screen.

**Workflow:** `/controller` and `/pstack:poteto-mode`, like phase 2.

**Work**

1. **Swap the transport.** Replace the sample transport with a `DefaultChatTransport` to the `discovery-message` edge function. Mount the phase 2 components on the real route, `src/routes/discovery/$organizationId.$projectId.tsx`. No screen code is copied from `design/astra`.
2. **Per-turn brief contract.** Each reply returns the text and one structured brief update: questions with options, the suggested option, and importance; agreed answers with their source turn; file facts as suggestions; open questions. Replace the closing `record_elicitation` call.
3. **Finish without generation.** The review page reads the brief as it stands; inline edits make a free new revision; confirmation makes no model call. There is no AI rewrite.
4. **Move the technical scope to the PRD step.** The scope generator and the bodies of AT-004.20, .22 and .25 move to AT-036.11 and .12. Remove regeneration (AT-004.37, .38). Move the cause-label trigger of AT-004.58 and .59 into the live brief. Retire the moved ids in the REQ-004 acceptance file, the suite, and the expected-results file in the same change.
5. **Files (automatic ingest, founder decision 2026-10-01).** Storage for the chosen file; the read starts at once with no question and never pauses; the read is free and is not a turn; a stored digest, in parts when large; the file's facts enter the brief marked as from the file; digests, not files, in later context; the first-reply request for files; the three-file limit while not funded (AT-032.13). The contract and the acceptance text already say this (merged with phase 2).
6. **Access.** UI code calls edge functions only, never the database directly.
7. Update `design/discovery-model-calls.md` for what shipped.

**Verify**

* `bun run at:check req-004` and `bun run at:verify req-004 --tier integration --expect`, with section J, AT-032.13 and AT-036.11/.12 moved to green in the declarations.
* The phase 2 screen tests run unchanged against the real route, plus the backend parts of AT-004.67, .68 and .69.
* The verify skill drives the wired screen on the local stack, on desktop and phone.

**Related:** the earlier wiring item, Discovery workspace wiring, overlaps this phase. The founder decided on 2026-10-02 that this phase absorbs it; that item closes as replaced after this merge. The reference-files item and its children are largely replaced by step 5; the child about Discovery-visible files is obsolete.

**Done when** the tests above are green at integration tier, the verify run passes on the wired screen, and the moved ids are retired in the same change.

Note on the item text: step 2's phrase "file facts as suggestions" predates the automatic ingest decision. Under that decision, recorded in the merged contract (`design/discovery-ui-contract.md`, Files section) and in step 5, the file's facts enter the brief marked as from the file, with no question.

Acceptance tests:
- `tests/at/suites/req-004/j-need-brief.test.ts` (section J, AT-004.61 to .73, with the step helpers in `_flows.ts` and `_screen.ts`). The screen bodies run unchanged against the real route; AT-004.67, .68 and .69 gain their backend parts.
- AT-004.10, .11 and .46 (from the absorbed item), in their current suites under `tests/at/suites/req-004/`.
- The suites holding AT-004.20, .22, .25, .37, .38, .58 and .59 (`g-scope-output.test.ts`, `h-cause-labels.test.ts`, `i-regeneration.test.ts` and the others under `tests/at/suites/req-004/`): those ids move or retire as step 4 says.
- AT-032.13 and AT-036.11 and .12: no test is registered for them yet. This item registers them through `atTest` in new suites under `tests/at/suites/req-032/` and `tests/at/suites/req-036/`, with their `--expect` declarations under `tests/at/expected/`.
- The declaration `tests/at/expected/req-004.json`.

Phase 2 records worth reading first: `loop/items/AI4DEV-180/resume.md` (facts that cost time, the "Not done here" list) and `loop/items/AI4DEV-180/evidence/interrogate/verdict.md` (the review panel's notes on the port, several marked for phase 3). The port is `src/components/discovery/port.ts`; the fixture shell that implements it today is under `design/astra/src/`.

## The ask
Run this item in poteto-mode and open one pull request from this branch. One pull request is
a project rule; it overrides the playbook's preference for narrow pull requests.
If the brief has Units, design once for the whole subtree, then build the units in order, one
commit group per unit.
At every unit boundary, after the unit's commit is on the branch and the resume note is
rewritten, stop at a gate opened with the `AskUserQuestion` tool, never as prose. Ask one
question with three options, labelled exactly `Continue`, `Run /compact` and `Fast compact`,
and put in its text what the unit landed, its commit, and the remaining context budget. Ask a
second question for any decision the next unit needs from the founder. If the answer is
`Continue`, start the next unit. If the answer is either compact option, make sure the resume
note holds the second answer, then end the turn and start nothing. Say in one line: "If nothing
happens in a few seconds, type /compact." The project's `self-compact-gate` plugin
compacts and starts the next unit by itself; a session without it waits for the founder.
Send lookups that do not depend on each other together in one message. Each message is one
step, and each step re-reads the whole conversation.
Send a question whose answer is a fact or a short list to a subagent: where something is,
which files use something, what a value is. Write it as facts to locate, and ask for
`file:line` references with the key lines verbatim. Read the exact lines yourself before you
edit them.
In the design arena, give every runner a distinct structural direction.
In the pull request title and body, name no item id except this branch's own, and name each
unit by its short label in words.
Then close the item as the Closing section says.

## Closing (the git part is yours, the board is not)
1. Wait for CI to be green on the exact head of the pull request, and for the founder to
   say "merge". Both, never one.
2. Hand the git mechanics to the `mechanical` agent with exact commands. You decide, it
   types: `gh pr merge <n> --squash`. The merge closes the item on the board through the
   pull request link. Never touch the board yourself. Delete no branch and no worktree: the
   founder keeps merged branches for reflection, and deletes by name when they choose
   (founder 2026-09-06).
3. Leave the worktree with `ExitWorktree(action: "keep")`.
4. Invoke `/controller done AI4DEV-181`. That skill does the board steering. Do not do it
   yourself.

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
- The `mechanical` agent takes tool-heavy work that needs no judgment: the rebase into
  ordered commits, the verify-ai4good drive, and the merge commands. Give it exact
  instructions and check its result once. Spawn it with no `model` parameter; its definition
  owns the model. Do not use a fork for this, because a fork runs on your own model.
- Run the acceptance suite yourself, never in a lane:
  `bun run at:verify <req> --tier integration --expect` as background shell commands that
  write to a file. Read back only the exit code and the green and red counts. CI runs only
  the loop tier. A lane costs about eighty thousand tokens whatever it runs; ten verification
  lanes once cost 746k tokens for thirty minutes of commands.
- The verify skill for this project is `verify-ai4good`, not the built-in verify.
- Spawn the comment audit with `subagent_type: "pstack:comment-sicko", model: "sonnet"`. It
  is the one helper you spawn with a model parameter, because its definition pins none and
  would otherwise run on your model.
- A writer that dies after finishing its work is recovered by running the pin and committing
  the finished tree, not by rerunning the writer.
- The model credential: `discovery-message` and `discovery-scope` read `ANTHROPIC_API_KEY` and
  `DISCOVERY_MODEL` from `supabase/functions/.env` (git-ignored). The founder keeps both in the
  main folder's `.env.local`; on 2026-10-02 the controller copied the two lines into this
  worktree's `supabase/functions/.env`. Use Haiku for debugging at this stage (founder
  2026-10-02: "Make sure to use haiku for cost optimized debug at this stage"):
  `DISCOVERY_MODEL=claude-haiku-4-5-20251001`. Never print the key or commit the file.
- The local stack's edge runtime serves the checkout it was started from (Doctor in the
  verify-ai4good skill). On 2026-10-02 the controller restarted it from this worktree, and
  `drive-discovery.ts` passed 27 of 27 checks on Haiku (`served_model` =
  `claude-haiku-4-5-20251001`). Restart it from this worktree again if another checkout
  starts it.
