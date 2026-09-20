# Discovery interface contract

Status: accepted requirements, 2026-09-20. Implementation requires fresh verification.

The Discovery workspace preserves the layout and question flow agreed in this conversation.
It uses the existing application font and theme. The NGO and AI are the two chat participants.

Sources: [Discovery requirement](../.taskmaster/docs/requirements/req-004.md),
[acceptance criteria](../.taskmaster/docs/acceptance/at-req-004.md), and
[funding update](../loop/items/AI4DEV-132/discovery-update.md).
The saved [conversation prototype](references/discovery-conversation.html) records the agreed layout.
Its old credit arithmetic and standalone colors are superseded by this contract.

## Workspace layout

- The header shows the project, NGO, Discovery stage, and save state.
- A compact stage strip provides context: Intake, Discovery, PRD, Design, Build, and Handoff.
- The main column holds the NGO and AI conversation, current questions, answers, and composer.
- A side panel shows the live Discovery brief, confirmed facts, open questions, and review action.
- The current gate has one usage gauge. Other gates have no gauges in this workspace.
- On narrow screens, the brief opens in a labeled panel without losing the current answer.

The stage strip represents workflow context. It does not introduce new values into the existing project lifecycle table.
Do not imply that later platform stages are implemented merely because they appear in this strip.

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
[Matt Pocock's grill-me skill](https://github.com/mattpocock/skills/tree/main/grill-me).
Use the questioning method without adopting an adversarial tone toward the NGO.

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

AI4DEV-9 (Discovery screen design) owns the screen revision under change order 008.
AI4DEV-158 (Discovery interface wiring) owns implementation through edge functions.
AI4DEV-157 (Discovery usage display) owns the funding display.
AI4DEV-141 (Discovery question flow) owns dependent questions and persistence.
AI4DEV-139 (free-first paid routing) owns mode selection and metering.

Run the revised acceptance criteria against the implementation, including both themes and narrow screens.
Exercise usage boundaries at 79.99%, 80%, 95%, 95.01%, and 100%.
Exercise a funded free turn, paid spillover, UTC reset, beta exhaustion, and a stale Free preview.
Old completion evidence does not establish compliance with these revised requirements.
