# Architect task: wire the Discovery screen to the real backend (AI4DEV-181)

You produce ONE candidate design package. Read-only on the repository: do not edit any file in it.
Your final response IS the design package (markdown). The repository is your working directory
(C:\Users\nirdr\Downloads\ai4good\.claude\worktrees\AI4DEV-181). Use PowerShell syntax if you run
shell commands.

## Read first (grounding)

- `loop/items/AI4DEV-181/brief.md` (the item: steps 1 to 7, the acceptance tests).
- `loop/items/AI4DEV-181/plan.md` (definition of done, the gap table, six units).
- `loop/items/AI4DEV-181/decisions.tsv` (the founder's calls: one credit per turn and no beta
  counter; live updates by polling an edge function; the first AI reply automatic and free; six
  units in one pull request; a forced `reply` tool carrying the text plus the brief update, chosen
  by a Haiku prototype in `loop/items/AI4DEV-181/evidence/proto-brief/`).
- The four explorer reports, the traced model of today's code:
  `C:\Users\nirdr\AppData\Local\Temp\claude\C--Users-nirdr-Downloads-ai4good\44802c73-47d7-44cd-b178-89b3ea791dc2\scratchpad\how181\out-a-screen.md`,
  `out-b-turns.md`, `out-c-gap.md`, `out-d-tests.md` (same folder).
- The screen's contract: `src/components/discovery/port.ts`, `src/lib/discovery-stream.ts`,
  `src/components/discovery/use-discovery.ts`, `src/components/discovery/model.ts`, and the fixture
  that implements it today, `design/astra/src/fixture-world.ts` (its rules are what the server
  must reproduce).
- `design/discovery-ui-contract.md` (revision 12 plus the 2026-10-01 automatic file ingest).
- The backend: `supabase/functions/_shared/{edge.ts,write-routes.ts,discovery-turn.ts,discovery-prompt.ts,discovery-metering.ts,discovery-stream.ts,anthropic-messages.ts}`
  and the latest discovery migrations under `supabase/migrations/`.

## The artifact

A design for units 1 to 5 of plan.md, at the level of types, signatures, tables and module map,
with `not implemented` bodies where code helps:

1. **Brief store**: the tables (brief with revision, its topics/questions/suggestions/sections,
   confirmation), the RLS and grants, the security-definer functions, and the edge functions that
   serve `load`, `saveBriefEdit`, `acceptSuggestion`, `askTopic`, `removeCauseLabel`, `finish`, with
   the revision rules (bump only on a real change; dependent topics marked for review; a real edit
   clears the confirmation; finish idempotent per revision; `stale-revision` on a base mismatch).
2. **Turn contract**: what `discovery-message` accepts (the screen's `DiscoveryRequestBody`: answers,
   note, expected charge), how one model call with the forced `reply` tool both streams the text and
   updates the brief atomically with settle, which stream parts it emits so `use-discovery.ts` works
   unchanged, the automatic free first reply, and the refusal kinds aligned with the screen.
3. **Usage**: one credit per turn, the daily grant tiers kept (10, or 30 when vetted), no beta
   counter, free first, fuel a stub; what `DiscoveryUsage` the server returns and how the screen's
   usage type and copy change (the beta fields go).
4. **Files**: storage bucket, the upload edge function, a discovery-file table with status, the read
   job (in parts when large) into a stored digest, the facts into the brief marked as from the file,
   digests in later context, the three-file limit while not funded; how progress reaches the screen
   through polling.
5. **Real port**: the `DiscoveryPort` implementation in the app (edge functions only), how
   `subscribe` polls, how the screen is mounted on `src/routes/discovery/$organizationId.$projectId.tsx`,
   and how the screen tests in `tests/at/suites/req-004/j-need-brief.test.ts` open the real route at
   the integration tier with seeded worlds while the loop tier keeps the fixture shell.

Keep `src/components/discovery/` and the screen tests unchanged except where the founder's usage
call forces it (the beta counter). Name every place the screen must change and why.

## Shape of your answer

Follow the rationale template the architect skill names (Problem, Usage first, Shape, Tradeoffs
accepted, Alternatives considered, Open questions and risks, Next implementation step), then the
type sketch: SQL table definitions, TypeScript signatures for the shared modules and the port, the
module map with file paths. Be concrete. Be opinionated; differences between candidates are the
signal. One page of rationale plus the sketch.
