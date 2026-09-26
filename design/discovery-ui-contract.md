# Discovery interface contract

Status: accepted requirements, 2026-09-20. Implementation requires fresh verification.

The Discovery workspace preserves the layout and question flow agreed in this conversation.
It uses the existing application font and theme. The NGO and AI are the two chat participants.

Sources: [Discovery requirement](../.taskmaster/docs/requirements/req-004.md),
[acceptance criteria](../.taskmaster/docs/acceptance/at-req-004.md), and
[funding update](../loop/items/AI4DEV-132/discovery-update.md).
The saved [conversation prototype](references/discovery-conversation.html) records the agreed layout.
Its old credit arithmetic and standalone colors are superseded by this contract.

## Scope boundary

Clarified by the founder on 2026-09-21: the Discovery screen deals only with Discovery.
The stage bar is a separate shared component, a compact view of the process Kanban.
This document calls that component the **process bar**.

| Owner | Responsibility |
| --- | --- |
| Discovery screen | NGO and AI conversation, questions, answers, Discovery brief, Discovery usage, and NGO confirmation. |
| Shared project workspace | Process bar showing Intake, Discovery, Volunteer match, PRD, Design, Build, and Handoff, with the current stage identified. |

The process bar can remain above Discovery in the composed page. Its placement does not make it part of the Discovery screen.
The shared workflow supplies the current stage. The process bar displays that state; it does not approve or advance a gate.
Discovery records its own confirmation through the existing authorized workflow.

Assess Discovery completeness against Discovery requirements only.
Intake, Volunteer match, PRD, Design, Build, Handoff, and publishing retain their own screens and requirements.
AI4DEV-9 (Discovery screen design) groups several screens; its broader scope does not belong inside the Discovery page.
Assess the shared process bar separately from those screens.

## After Discovery: volunteer matching

After the NGO confirms Discovery, the process bar highlights **Volunteer match**, before PRD.
The finished screen offers **Find a volunteer**. This action opens the existing publication review screen.
Vetting and human publication review remain required. After approval, ai4good coordinates a volunteer match.
The volunteer must consent, and the NGO must fund kickoff before PRD work begins.
The matching step covers preparation, publication review, finding a volunteer, consent, and funding readiness.
These are existing workflow actions and lifecycle states. The label adds no lifecycle state and grants no approval.
The completed Discovery chat stays complete while matching proceeds.

## Workspace layout

- The header shows the project, NGO, Discovery stage, and save state.
- The shared project workspace can display its process bar above the Discovery screen.
- The main column holds the NGO and AI conversation, current questions, answers, and composer.
- A side panel shows the live Discovery brief, confirmed facts, open questions, and review action.
  The Discovery usage card follows the brief, in the side panel and on narrow screens.
- The current gate has one usage gauge. Other gates have no gauges in this workspace.
- On narrow screens, the brief opens in a labeled panel without losing the current answer.

The shared process bar does not introduce new values into the existing project lifecycle table.
Its labels do not imply that later platform stages are implemented.

## Questions and answers

The AI reuses intake facts and asks the next unresolved question with a short reason.
Independent questions can share a round. A question that depends on another answer waits for that answer.
The interface supports suggested answers, a custom response, and **I'm not sure**.
An uncertain answer remains an open question. The AI must not invent certainty to finish the brief.

The NGO can revise a previous answer. The brief updates and affected dependent answers need review.
The interface preserves the transcript, pending questions, answers, brief, and usage after a reload.
Round navigation and manual answer editing do not consume AI turns.
One submission followed by one completed AI reply counts as one turn, including a reply addressing several independent questions.

This follows the dependency-first questioning discussed from
[Matt Pocock's grill-me skill](https://github.com/mattpocock/skills/blob/main/skills/productivity/grilling/SKILL.md).
Use the questioning method without adopting an adversarial tone toward the NGO.

## Completion guidance and Finish Discovery

The Discovery agent must work toward completion. It must not keep an open-ended interview running.
Show a Discovery progress panel above the conversation. It contains the agreed topic count, percentage, remaining topics, and **Finish Discovery**.
This panel belongs to Discovery. It is separate from the shared process bar and the Discovery usage gauge.

Progress equals agreed required topics divided by required topics. It does not measure messages, tokens, fuel, time, or AI confidence.
Use a stable checklist. Conditional follow-up questions belong to their existing topic and keep that topic open until resolved.
In the volunteer fixture, six topics cover priority, booking, maintenance, success measure, booking rules, and information handled.
If trained roles require an approval owner, booking rules remain open until that owner is agreed. The denominator stays six.

The agent selects the next unresolved required topic. Each reply must help resolve that topic or explain its blocker.
Reusing intake facts and grouping independent questions can reduce the number of turns.
Optional detail must not delay completion. Unknown facts stay visible; the agent must not invent certainty or repeat the same question indefinitely.

When required topics are agreed, the AI states that Discovery is ready for review and stops asking questions.
The interface replaces the composer with a finish invitation. Completion must stop further automatic model calls and charges.
The **Finish Discovery** action remains visible throughout. Disable it while required answers, draft validity, or a review hold prevent finishing.
Explain the remaining work beside it. Usage limits do not block review or finishing.

**Finish Discovery** opens the current brief. The NGO reviews it, supplies the existing acknowledgments, and selects **Confirm and finish Discovery**.
That action records the revision, actor, and time. It carries available paid funds once under the existing funding rules.
The interface then says **Discovery finished**. AI readiness and 100% topic coverage do not constitute NGO approval.
If the NGO changes an answer, reopen affected topics, lower progress where needed, and invalidate the previous approval.

Required checks include incomplete, uncertain, conditional follow-up, ready, confirmed, and edited-after-confirmation states.
Verify that the last answer stops questioning, finishing is free, and repeated completion cannot charge or transfer funds twice.

## Funding panel

Keep these values visible together in the Discovery panel:

| Value | Example | Rule |
| --- | --- | --- |
| Daily free turns | 3 of 10 remaining today | One completed free reply consumes one turn. |
| Beta free turns | 18 of 50 remaining | The counter persists after the daily reset. |
| Paid fuel available | $10.00 | This is available USD allocated to this gate, after reservations. |
| Next reply | Free · 1 turn | Free applies when both free counters have capacity. |
| Reset | Resets at 03:00 in your time zone | Convert 00:00 UTC to the viewer's actual local time. |

If free capacity is exhausted, show **Paid · actual usage in USD** before Send.
Show the paid reservation or turn spending limit where the NGO can inspect it.
If a concurrent request changes the displayed funding mode, refresh that mode before accepting a newly paid submission.
A submission labeled Free cannot silently become Paid.

The **Buy fuel** action uses the existing project checkout, acknowledgment, and $50 minimum.
There is no separate paid-credit SKU. A $10.00 example is a remaining balance, not a new minimum purchase.
Buying fuel does not replenish daily or beta turns.

After a paid reply, show AI usage, the platform fee, and the total debit in USD.
For example: $0.040 AI usage + $0.006 platform fee = $0.046 total.
Keep fractional cents in storage. Small charges must not appear as free because of display rounding.
If final usage is missing, show **Usage pending** and retain the relevant reservation.

## Gauge behavior

Use the unrounded percentage consumed when choosing the color:

| Consumed | Color |
| --- | --- |
| Below 80% | Green |
| 80% through 95%, inclusive | Yellow |
| Above 95% through 100% | Red |

In free mode, the gauge uses the more consumed percentage of the daily and beta limits.
Its label identifies that limit. The two counters remain visible as text.
In paid mode, it shows consumption against the current gate's paid allocation.
Label reservations separately from settled charges. A paid allocation of zero has an empty state, not a division by zero.
Use labels and numbers in addition to color. Red is a usage warning and does not itself block a funded reply.

When the NGO approves the gate, carry available paid funds to the next allocation once.
Retain pending reservations until settlement. A transfer cannot increase project fuel.
Free turns never become dollars. The prototype's former per-gate free grants do not apply to this beta.

## Required states

| State | Visible behavior |
| --- | --- |
| Free capacity available | Free label, both counters, paid balance, active composer. |
| Daily cap reached, beta remains, fuel available | Paid label, USD balance, next reset. |
| Beta cap reached, fuel available | Paid label and beta exhausted notice; no promise of free turns tomorrow. |
| Daily cap reached, no fuel | Preserve draft; show Buy fuel and applicable reset. |
| Beta cap reached, no fuel | Preserve draft; show Buy fuel; no reset remedy. |
| Fuel exhausted, free eligible | Free composer remains available. |
| Streaming | Show progress; prevent duplicate submission. |
| Failure or automatic retry | Preserve answers; no extra free charge; show retry state. |
| Brief ready | Show review and NGO confirmation of the current revision. |
| Earlier answer edited | Mark dependent answers for review and invalidate old approval. |
| Gate approved | Retain the approved revision and actor; carry only available paid allocation. |
| Fit declined or reopened | Preserve the existing decline, oversight, and admin-overturn rules. |

The AI cannot sign off for the NGO. The server checks role, project access, and brief revision.
Reading, manual editing, review, confirmation, and file attachment cost no AI turn.
Bounded scope regeneration retains the existing zero-credit exemption.

## Usability rules from the NGO critique

Added 2026-09-26 with Discovery design revision 5, at the founder's request. Founder approval of revision 5 is pending.
Two agent critics played a non-technical NGO coordinator with a small budget.
DeepSeek V4.1 Flash judged screenshots of the main flow and eleven usage states, on desktop and phone.
GPT-6 Astra at low operated the mock in a browser, in three iterations.
Both critics ended with "ready". The record is in [the critique folder](astra/discovery-critique/README.md).
The rules below stay inside the sections above. They say how the screen presents those rules.

### Progress and finishing

- Before the first answer, the progress panel tells the NGO to start with the AI's first question.
- While Finish Discovery is disabled, it is a secondary button. When finishing is possible, it is a primary button.
- After the progress panel scrolls out of view, a compact strip stays at the top of the page.
  The strip shows the percentage, the agreed topic count, and Finish Discovery with the same enabled state.
- When the questions are complete, the finish invitation points to Finish Discovery. It does not add a second finish button.

### Conversation and brief

- Each AI reply that saves answers lists the brief topics it added.
- A free reply receipt says "Free reply · no charge".
- Each answered topic in the brief has a labeled Edit button. The brief says that edits are free.

### Usage and money

- The usage card starts with one plain sentence. The sentence says whether the next reply is free and how many free replies remain today.
  If a limit stops free replies, the sentence names the limit and says when free replies return, or that beta replies do not reset.
- If no reply is possible, the next-reply value is "Not available now". The card and composer then omit the paid hold.
- In paid mode, the line beside Send shows paid mode, the fuel left, a low-fuel warning at yellow and red, and the per-reply hold.
- Buy fuel appears only when free replies are used up. It states the $50 minimum and that fuel does not add free replies.
- The pending message says the shown fuel already excludes the hold, that only actual usage is charged, and that the hold is not an extra charge.
- Yellow and red gauge captions say that replies still work.
- Limit messages name the Discovery usage card as the place to add fuel. They use no position word such as "beside".

### Review and confirmation

- The review page names itself as the last step of Discovery. The process bar keeps Discovery current.
- On narrow screens, a fixed bar jumps to the confirmation card. On wide screens, the confirmation card stays in view while the NGO reads.
- The confirmation card shows no success mark before confirmation.
- A plain explanation follows the data-responsibility checkbox. The checkbox wording does not change.
- The maintenance section explains Lovable in plain words. It shows the standard Lovable subscription of about $25 a month,
  paid directly to Lovable and never from fuel, with a link to Lovable's public pricing.
  It states that ai4good gives no ongoing support after handoff in this version, and that larger work is a new project.

### Open minor findings

These findings are not requirements. The founder may choose them later.

- The full usage card is below the brief, away from Send.
- On a phone, the first question starts below the first screen.
- Small amounts such as $0.046 show no cents equivalent. Fractional cents must stay visible.
- The process bar label "PRD" has no plain explanation. The process bar labels are fixed above.

## Application theme

The source is [src/styles.css](../src/styles.css) and the app's existing Tailwind and shadcn components.
Inherit the app font; do not load Inter or introduce another web font.
The current application uses the system sans-serif stack supplied by Tailwind.

| Element | Existing token or behavior |
| --- | --- |
| Page and card | `--background`, `--foreground`, `--card`, `--card-foreground` |
| Primary action | `--primary`, `--primary-foreground` |
| Secondary panel | `--muted`, `--muted-foreground` |
| Controls | `--input`, `--border`, `--ring`, existing Button and input variants |
| Selected answer | `--accent`, `--accent-foreground`, visible selected state |
| Corners and spacing | Existing component defaults and `--radius` |
| Errors | Existing destructive tokens |
| Usage warnings | Green, yellow, and red semantic styles that pass contrast in both themes |

Light and dark themes use the existing variables. Do not copy the prototype's independent green page palette.
Keep visible focus, keyboard answer selection, labeled controls, and accessible progress values.
At 320 CSS pixels, no required control or amount may be clipped.

## Implementation and proof

AI4DEV-175 (Discovery screen design) owns the screen revision under change orders 008 and 009, within AI4DEV-9 (design batch 2 screens).
AI4DEV-158 (Discovery interface wiring) owns implementation through edge functions.
AI4DEV-157 (Discovery usage display) owns the funding display.
AI4DEV-141 (Discovery question flow) owns dependent questions and persistence.
AI4DEV-139 (free-first paid routing) owns mode selection and metering.

Run the revised acceptance criteria against the implementation, including both themes and narrow screens.
Exercise usage boundaries at 79.99%, 80%, 95%, 95.01%, and 100%.
Exercise a funded free turn, paid spillover, UTC reset, beta exhaustion, and a stale Free preview.
Old completion evidence does not establish compliance with these revised requirements.
Check each rule in the usability section on the wired screen, on desktop and at phone width.

The chat uses the Vercel AI SDK, `useChat` from `@ai-sdk/react`, on the mock and on the real page.
The mock swaps only the transport: `design/astra/src/fixture-transport.ts` streams sample replies.
The wired screen keeps the mock's chat code and uses a transport to the `discovery-message` function.
Each reply streams the typed parts in `src/lib/discovery-stream.ts`: question, filed, charge, ready, and usage.
The send route must emit those parts. Today it emits only the reply text and one `data-turn` part.
The critique prompts and capture scripts in `design/astra/discovery-critique/` can repeat the NGO critique on the wired screen.
