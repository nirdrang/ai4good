# Unit 5 writer report: free-phase guardrails

## Landed

- `supabase/migrations/20260924140000_discovery_guardrails.sql` — `off_topic` on `discovery_turns` with the fuel CHECK, `off_topic` on the immutable allow-list, settle takes `p_off_topic` and `p_notice` and emits `discovery.off_topic_flagged` once when the count equals the strikes pin, reserve stores `guardrails: { active, off_topic_flag_strikes }`, seed of the event name.
- `supabase/functions/_shared/discovery-prompt.ts` — `DECLINE_OFF_TOPIC_TOOL`, `GuardrailSettings`, `guardrailSettingsFor`, `DISCOVERY_STOP_RULE`. No guardrail system block.
- `supabase/functions/_shared/discovery-metering.ts` — `DISCOVERY_OFF_TOPIC_FLAG_STRIKES = 3` and the pin in `reserveSettings`.
- `supabase/functions/_shared/discovery-skills/04-complete-the-record.md` and regenerated `index.ts` — wrap-up on request: record what is known, put the rest in `openQuestions`.
- `supabase/functions/_shared/discovery-turn.ts` — free requests carry the decline tool, settle maps `decline_off_topic` to `p_off_topic` and `p_notice`, the message answer carries `guardrail`.
- `supabase/functions/_shared/scope-copy.ts` — `offTopicNotice`.
- `supabase/functions/_shared/write-routes.ts` — `turn-ceiling` removed.
- Taxonomy, copy, req-016 isolate, seed fold in `_source-scan.ts`, fixture-producer samples, and AT-004.12–.15 in `e-guardrails.test.ts`.

## Verify

| Command | Exit | Result |
|---|---|---|
| `bun run typecheck` | 0 | three projects clean |
| `bun run at:check req-004` | 0 | 58 P0 ids in bijection |
| `bun run at:selftest` | 0 | 34 files, 469 tests, all green |
| `bun run at:verify req-004 --tier loop --expect` | 0 | 31 green, 27 red |
| `bun run at:verify req-001 --tier loop --expect` | 0 | 33 green, 5 red |
| `bun run at:verify req-016 --tier loop --expect` | 0 | 12 green, 0 red |
| `bun run build` | 0 | client and server builds completed |

AT-004.12 and AT-004.14 are green at loop and red under `vendors.anthropic` at integration. AT-004.13 is green at both tiers. AT-004.15 is green at loop and red under `checkout.project-fuel` at integration. `src/routeTree.gen.ts` was dirty after the build and is not in this commit.

## Deviations

none

## Choices the synthesis left open

1. `TenantReads.project` gained optional `funded_at` so `discoveryPrepare` can call `billingTargetFor` without changing every tenant-read stub. The live project select lists the column.
2. If no active platform admin has an email, settle still completes and does not emit, because the outbox refuses an empty recipient list. AT-004.13 provisions a platform admin so the flag row exists.
3. `SCOPE_COPY.offTopicNotice` is one plain sentence: the conversation was flagged, the NGO can keep talking, a person can see it. No money words.
