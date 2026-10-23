# Brief for AI4DEV-140 (exhausted allowance remedies), with AI4DEV-142 (free limits follow turn mode)

Chain: AI4PM-26 (Discovery agent requirement) > AI4DEV-131 (Discovery dev root) > AI4DEV-132 (free turns and paid routing) > AI4DEV-140 (exhausted allowance remedies)
Second item: AI4PM-26 > AI4DEV-131 > AI4DEV-133 (questions and turn-mode guardrails) > AI4DEV-142 (free limits follow turn mode)
Branch: claude/project-thread-j3a1m6

Notes on this pickup, 2026-10-23:
- The run is a cloud session started from the project thread. The session was given the branch
  above, not the board's branch names, so the branch owns no item id. The pull request names no
  item id, and `/controller done` closes both items from the merge commit, as it does for the
  children of a parent run.
- The two items have different parents. The coordinator asked for them together, relaying the
  founder's message "Start pushing cloud session to push our dev board progress".
- Paid fuel parts stay out of scope. They wait on the Stripe fuel item. AT-004.15 stays red.
- The integration tier of AT-004.12 and .14 needs a real model key in
  `supabase/functions/.env`. This VM has none. If none arrives, those two stay red here and are
  run on the founder's PC.

PRD slice: `loop/out/pure-s3-req-001-006.md`, section "REQ-004: AI Discovery Agent (free, rate-limited)", lines 55 and 75, verbatim:

> **Discovery pilot funding:** one free credit covers one completed AI reply, regardless of token usage or internal model calls. The enrolled project receives 10 free turns per UTC day, or 30 when its NGO is vetted (REQ-002). While daily capacity remains, Discovery uses a free turn first, including on funded projects. Otherwise, it uses available project fuel in USD. When neither source is available, the draft persists and sending stops. Show the next daily reset. Show ordinary fuel checkout for paid continuation. Vetting raises the daily grant from 10 to 30 without resetting consumed turns.

> - **Free-turn scope guardrails:** unrelated tasks receive a scope redirect. There is no per-conversation turn ceiling: the NGO can say stop at any time, and Discovery then wraps up with the open questions listed. When a free-turn quota runs out, Discovery offers brief review or paid continuation. A new conversation does not replenish daily usage. Repeated off-topic requests show a notice and flag the conversation for founder visibility, without lockout. These rules follow the selected free mode even when the project has fuel. Paid turns use the cost display and fuel gauge without the free scope guardrails.

Item text (AI4DEV-140): see the board. Current scope, founder cleanup 2026-10-04: decision d95
removed the beta counter, so the next daily reset is always shown when free replies are used up.
Vetting raises the daily grant from 10 to 30 and is not offered as a remedy. AT-004.03a and .03b
are green at loop tier and red at integration tier only because their screen check is not
switched on. Buy fuel waits on real project fuel.

Item text (AI4DEV-142): see the board. Current scope, founder cleanup 2026-10-04: a fresh
conversation preserves daily usage only. AT-004.13 is green at both tiers. AT-004.12 and .14 are
red at integration tier because they waited on a real model. AT-004.15 waits on real project fuel.

Acceptance tests:
- `tests/at/suites/req-004/c-remedies.test.ts`: AT-004.03a, AT-004.03b.
- `tests/at/suites/req-004/e-guardrails.test.ts`: AT-004.12, AT-004.13, AT-004.14, AT-004.15.
- `tests/at/suites/req-002/b-allowance.test.ts`: AT-002.05 asserts the same exhausted sentence and
  moves with it (its acceptance text carries d95 too).

## The finding at pickup

The shipped exhausted sentence still offers "get vetted (daily grant becomes 30)" to an unvetted
NGO, in `supabase/functions/_shared/discovery-allowance.ts` and in two SQL raises
(`discovery_allowance` and `discovery_turn_reserve`). The loop bodies of AT-004.03a and AT-002.05
assert that remedy. d95 removed it. So the product changes, not only the tests: one sentence for
both tiers, with fund fuel and the next UTC day.

## The ask
Run this item in poteto-mode and open one pull request from this branch.
In the pull request title and body, name no item id at all.
