# Unit 6 report: scope move and close-out

Work belongs to AI4DEV-181 (Discovery backend wiring), branch `lane/ai4dev-181/unit6`.
No push, agent dispatch, board change or restart of the existing Supabase stack.

The technical scope now uses a confirmed Discovery document in the PRD step. Discovery replies propose bounded cause labels in the live brief; finish publishes them transactionally. Regeneration has no current route action. The wired-screen drive prepares real NGO accounts and submitted needs, then checks desktop and phone end states.

## Acceptance changes

- AT-004.20 and AT-004.22 retired under d94; their output/build-split obligations move to AT-036.11.
- AT-004.21 and AT-004.25 retired under d94; their three-tier maintenance/pricing obligations move to AT-036.12.
- AT-004.37 and AT-004.38 retired under d94. Free manual brief edits remain covered by AT-004.64.
- Those six identifiers are removed from REQ-004 registration, expected declarations and decomposition coverage. REQ-004 now has 64 registered active cases.
- AT-004.39 no longer exempts regeneration from the credit retry assertion.
- AT-004.58 and AT-004.59 retain their identifiers; their trigger is Discovery proposing labels, and their tests cover reply, live brief and finish at both tiers.
- AT-004.60 retains its identifier; its input is the live brief and its remove-label path remains free, with no curation control.
- AT-036.11 and AT-036.12 are newly executable and declared green at loop and integration tiers. The ten PRD-workspace cases AT-036.01 through AT-036.10 are registered and declared red `sut-missing` at those tiers. The drill declaration retains the existing capability requirements.
- REQ-004 integration declarations for AT-004.10, AT-004.46, AT-004.58 and AT-004.59 change from red capability-pending to green. AT-004.11 and AT-004.60 stay green, now with the actual configured-model/brief path.
- No other requirement's expected declarations change. REQ-004 loop retains 41 green cases after four green scope cases and two pending regeneration cases retire.
- Acceptance notes now explicitly mark the retirements and the live-label trigger. REQ-036 status distinguishes the two executable scope cases from the pending workspace.
- Shared data-tier and maintainability verdict checks enforce the confirmed document. No project/build estimate is accepted; fixed Lovable subscription guidance stays in rendering.

## Verification

The writer's Codex login expired during its final checks, so the lead ran them. Lead fixes: `scope.ts` no longer builds a default model port (it pulled the Anthropic SDK into Bun scripts and broke both live proofs); AT-004.60 checks only its own project's label rows; AT-004.71 asks for a second question up to three times. On muse, stack started from the item worktree: typecheck 0; build 0; at:selftest 517; at:check req-001, 002, 004, 032, 036 0; loop req-004 41, req-032 1, req-036 2; integration req-001 29, req-002 19, req-003 10, req-004 30, req-016 12, req-032 1, req-036 2, all matching; assemble-pure -Check 0; check-tree 0; `drive-discovery-screen.ts` exit 0 (evidence `loop/verify-evidence/discovery-screen-1791129501266/`); unit 2 proof 6 of 6; unit 4 proof passes.

## Files

### Added

- `.claude/skills/verify-ai4good/features/discovery-screen.md`
- `.claude/skills/verify-ai4good/scripts/drive-discovery-screen.mjs`
- `.claude/skills/verify-ai4good/scripts/drive-discovery-screen.ts`
- `supabase/functions/_shared/env.ts`
- `supabase/migrations/20261004120000_prd_scope_and_brief_labels.sql`
- `tests/at/expected/req-036.json`
- `tests/at/harness/model-runtime.d.ts`
- `tests/at/suites/req-036/_bind.ts`
- `tests/at/suites/req-036/_fixture.ts`
- `tests/at/suites/req-036/_live.ts`
- `tests/at/suites/req-036/pending.test.ts`
- `tests/at/suites/req-036/scope.test.ts`

### Changed

- `.claude/skills/verify-ai4good/SKILL.md`
- `.claude/skills/verify-ai4good/features/README.md`
- `.claude/skills/verify-ai4good/features/discovery-scope.md`
- `.claude/skills/verify-ai4good/scripts/prepare-chat-page.ts`
- `.taskmaster/docs/acceptance/at-req-004.md`
- `.taskmaster/docs/acceptance/at-req-036.md`
- `design/discovery-model-calls.md`
- `loop/decomp/req-004.md`
- `supabase/functions/_shared/anthropic-messages.ts`
- `supabase/functions/_shared/discovery-brief.ts`
- `supabase/functions/_shared/discovery-metering.ts`
- `supabase/functions/_shared/discovery-reply.ts`
- `supabase/functions/_shared/discovery-turn.ts`
- `supabase/functions/_shared/edge.ts`
- `supabase/functions/_shared/openai-compatible-messages.ts`
- `supabase/functions/_shared/openai-responses-messages.ts`
- `supabase/functions/_shared/scope.ts`
- `supabase/functions/discovery-scope/index.ts`
- `tests/at/expected/req-004.json`
- `tests/at/harness/atconfig.ts`
- `tests/at/harness/config.ts`
- `tests/at/harness/discovery-reply.selftest.ts`
- `tests/at/harness/suite-adapters.ts`
- `tests/at/suites/req-004/_contract.ts`
- `tests/at/suites/req-004/_fixture.ts`
- `tests/at/suites/req-004/_live.ts`
- `tests/at/suites/req-004/_screen.ts`
- `tests/at/suites/req-004/_source-pins.ts`
- `tests/at/suites/req-004/d-conversation.test.ts`
- `tests/at/suites/req-004/f-transparency.test.ts`
- `tests/at/suites/req-004/g-scope-output.test.ts`
- `tests/at/suites/req-004/h-cause-labels.test.ts`
- `tests/at/suites/req-004/i-regeneration.test.ts`
- `tests/at/vitest.config.ts`

### Deleted

- `.claude/skills/verify-ai4good/features/discovery-chat-page.md`

