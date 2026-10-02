# Plan for AI4DEV-181 (Discovery wired to backend)

Written by the lead on 2026-10-02 after a four-explorer `how` pass (grok-4.7 xhigh) and an Opus
synthesis. Playbook: figure-it-out under poteto-mode.

## Definition of done (falsifiable)

1. The phase 2 screen (`src/components/discovery/`) is mounted on the real route
   `src/routes/discovery/$organizationId.$projectId.tsx` behind a real `DiscoveryPort` that calls
   edge functions only.
2. `bun run at:verify req-004 --tier integration --expect` matches a declaration in which section J
   (AT-004.61 to .73), AT-004.10, .11, .46 and the backend halves of .67, .68, .69 are green, and the
   moved ids are retired. The same screen test bodies run on the fixture shell at the loop tier and
   on the real route at the integration tier.
3. AT-032.13 and AT-036.11, .12 are registered and green at integration.
4. The verify-ai4good skill has a feature file for the wired screen and a drive that passes on
   desktop and phone, on Haiku.
5. CI (loop tier) is green.

## What exists and what does not (from the how pass)

| Port member | Backend today | Status |
|---|---|---|
| `load` | `discovery-conversation` (turns, elicitation, scopes, allowance) | partial: no brief, files, screen-shaped usage, confirmation |
| `chat` | `discovery-message` (reserve, model, settle) | partial, wrong contract: ignores `answers`/`expectedCharge`, refuses an empty note, emits `data-turn` only, no per-turn brief |
| `addFile` | `project-need attach` (metadata only) | partial: no bucket, no read job, no digest |
| `subscribe` | nothing | none |
| `saveBriefEdit` | nothing | none: no brief table, no revision |
| `acceptSuggestion` | nothing | none |
| `askTopic` | nothing | none |
| `removeCauseLabel` | `discovery-scope remove-label` | partial, wrong shape, and the scope moves to the PRD step |
| `finish` | nothing | none: no confirmation table |

Two models also differ: the screen counts free replies (10 a day, 50 in the beta, free first even
when funded); the ledger counts token-priced credits (10 or 30 a day, no beta counter, fuel first
when funded), and fuel is a stub that returns 0.

## Units (one pull request, a gate after each)

1. **Brief store.** Migrations for a revisioned brief per project (sections, topics, questions,
   suggestions, data tier, fit, cause labels) and a confirmation record; the review writes as edge
   functions (`saveBriefEdit`, `acceptSuggestion`, `askTopic`, `removeCauseLabel`, `finish`) with
   `baseRevision` checks, dependent-topic marking and idempotent finish; `load` returns the
   `DiscoveryState` shape. No model call.
2. **Turn contract.** `discovery-message` accepts the screen's body (answers, note, expected
   charge), updates the brief in the same model call (a per-turn brief tool replacing
   `record_elicitation`), and streams the screen's data parts (`data-brief`, `data-usage`,
   `data-question`, `data-filed`, `data-charge`). Refusal kinds aligned with the screen.
3. **Usage.** Depends on the founder's call below.
4. **Files.** A storage bucket and an upload edge function, a discovery-file table with status,
   a read job into a stored digest (in parts when large), facts into the brief marked as from the
   file, digests in later context, the three-file limit (AT-032.13), and the live-update channel.
5. **Real route.** A real port in `src/lib/` behind the edge functions; `DiscoveryScreen` mounted on
   the route with sign-in; the screen driver opens the real route at the integration tier with
   seeded worlds; the model-call counter reads the stack.
6. **Scope move and close-out.** AT-004.20, .22, .25 to AT-036.11, .12; AT-004.37, .38 retired;
   AT-004.58, .59 (and .60, .21 if they depend on the scope route) re-homed; the verify-ai4good
   feature map; `design/discovery-model-calls.md`.

Riskiest unknown first: unit 2's per-turn brief tool on Haiku (does the model fill a structured
brief update reliably every turn). A prototype settles it before unit 1's schema is fixed.

## Open decisions for the founder

Listed in the gate question, recorded in `decisions.tsv` with the answers.
