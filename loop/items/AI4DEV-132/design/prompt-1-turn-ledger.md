# Design task: the credits engine and funded routing (REQ-004 D1 plus three leaves), one design for six units

You are one runner in a four-lane design arena. Produce one candidate design package for the whole subtree. You are read-only over the tree. Do not edit, create, or run anything that writes under the repository. Working directory is the item worktree; every path below is relative to it. If you shell out, use PowerShell syntax; you are on Windows.

## Read first, in this order

1. `loop/items/AI4DEV-132/brief.md`. The six units, the facts, the ask.
2. `loop/items/AI4DEV-132/how/explanation.md`. The grounding. Its section "Constraints for the design" is binding: a design that breaks one of the forty-four constraints is rejected before scoring. Its section "Ids whose proof waits on another surface" is the explainer's reading; you may disagree with reasons. Two of its findings override the brief: the semantic-oracle harness is parked, not built, and no fuel ledger or funding column exists anywhere.
3. `.taskmaster/docs/acceptance/at-req-004.md`. The fifty-eight P0 ids; twenty are this run's.
4. `loop/decomp/req-004.md`. The manifest and its cross-contracts.
5. `supabase/migrations/20260916120000_discovery_allowance.sql` and `supabase/functions/_shared/discovery-allowance.ts`. The ledger this run extends.
6. `supabase/functions/_shared/write-routes.ts`, `supabase/functions/_shared/edge.ts`, `supabase/functions/_shared/need-intake.ts`, `supabase/functions/_shared/verification.ts` lines 150 to 170. The write frame and the need.
7. `tests/at/suites/req-003/` and `tests/at/expected/req-003.json`. The suite shape you copy. Read `_bind.ts`, `_contract.ts`, `_fixture.ts`, `_live.ts`, `_pending.ts`, `_source-need.ts`, one green test file and `d-reference-files.test.ts`.
8. `tests/at/harness/contracts.ts` and `tests/at/harness/vendors.ts`. The vendor stand-in shape.
9. `tests/at/suites/req-002/_source-absences.ts` and `_source-pins.ts`. The absence and pin arms.

The explorer reports under `loop/items/AI4DEV-132/how/explorer-*.md` hold more detail if you need it.

## What the design must cover

One design, six units. For each unit the design names the tables and columns, the SQL definer functions and their signatures, the edge routes, the `_shared` decision modules and exported signatures, the refusal kinds and SQL DETAIL strings, the suite files, and the acceptance ids that turn green at each tier or are declared pending with a stated capability name. The units, from the brief:

1. Per-turn metering against the existing ledger at a constant cost-to-credit ratio under a stated rounding rule, the turn's cost recorded, one grant per NGO across projects, balance never negative, spend never exceeds the remaining allowance. AT-004.01, .02, .08, .47, .49.
2. Funded projects bill their own fuel and never the free pool; isolation between a funded and an unfunded project of one NGO; funding mid-conversation switches from the next turn; exhausted fuel never falls back to free; funding changes no model id, service tier, priority or allowance. No fuel ledger exists. AT-004.04, .05, .06, .48, .09.
3. Zero-credit remedies split by tier. The block-at-zero sentence already exists in SQL and TypeScript and already splits by tier. AT-004.03a, .03b.
4. The conversation on Claude Opus from a Supabase edge function on Deno, five to ten structured turns, persisted and resumable in a new session with full prior context, with an Anthropic Messages stand-in for the loop tier and a fixture-specific oracle for AT-004.10. AT-004.10, .11.
5. Abuse guardrails: an email-unverified account is blocked from any Discovery message; a platform-admin kill switch per NGO blocks Discovery immediately; static absence arms prove no supplemental free-credit grant path and no platform-wide breaker; free credits never purchasable and outside the money ledger. AT-004.41 to .45.
6. Transparency: the remaining credits and every turn's cost are readable by the NGO through a route the wiring leaf renders; every negative balance delta matches exactly one turn record or the daily reset; zero-cost actions leave no delta. AT-004.46.

Decisions the design must make and say why, each in one paragraph:

- The turn record. Where a turn's provider cost, credits charged, project, conversation and timestamp live, and how `discovery_spend.spent` and the turn records stay equal by construction, so AT-004.46's delta invariant is a query and not a convention.
- The ratio and the rounding rule. How a turn learns its provider cost (from the model response's usage, from a fixed table of token prices, or from a controlled value the stand-in injects), the constant cost-to-credit ratio and where it is pinned (an `AT_CONFIG` entry and a shipped constant), and the rounding rule. Whether an underfunded turn is refused before it runs or capped; AT-004.49 accepts either and forbids overspend. Say what happens when the model's actual cost exceeds the preflight estimate.
- The funding seam. How a project's funding state is represented until the Stripe requirement lands (a column, a table, a stub port), who sets it at loop and at integration, what the pure routing function's signature is, and exactly which of the five unit-2 ids go green at loop, green at integration, or pending on `checkout.project-fuel` and `billing.funded-turn`. What the Stripe run deletes or fills in later.
- The send route. Whether the existing `discovery-message` stand-in row in `WRITE_ROUTES` is promoted or a new route is added, what its request and response bodies are, the order of its gates (account active, org admin, email verified, kill switch, funding route, allowance preflight, model call, settle, persist), which gates are TypeScript and which are SQL, and the one HTTP shape for the email refusal.
- The conversation store. Table shape, how messages persist, how a new session resumes with full prior context, how the conversation relates to `need_intakes` at stage `discovery_in_progress`, and how it differs from the audit event that must never carry request or response bodies.
- The model client. Where the Deno-only file lives, whether it uses `npm:@anthropic-ai/sdk` or `fetch` against the Messages API, how the key is read, what the request settings are and how AT-004.09 observes that funding leaves them identical. This is the founder's decision at the unit 4 gate; take a position and give the alternative.
- The loop-tier stand-in and the oracle. The two-face shape of the Anthropic stand-in (port for the SUT, sim for the test), where its contract lands, how it injects controlled usage costs for AT-004.02, how a scripted five-to-ten-turn conversation is replayed, and what the fixture-specific oracle for AT-004.10 asserts against the stand-in's output. What the integration tier proves without a key, and what it declares pending, on which capability name.
- The kill switch. The state (column or table), the admin write route's name, request body, SQL definer, refusal kind, audit event or not, and how the send route reads it so the block is immediate.
- The two absence arms. What each scans and for which names.
- The transparency read. The route or read function that returns remaining credits and the turn records, and the SQL that proves every negative delta matches one turn record or the daily reset.
- The red set. Every id pending at either tier, its capability name, and the reason. Fewer reds are better only when the green is honest.
- Which units go to the hardest-tasks lane (the writer must still design something) and which to the feature lane (the writer applies a fixed contract). The sheet's writer lanes are grok at xhigh for feature and astra at medium for hardest tasks.

## The rubric the judge and the lead score

1. Constraint compliance. Every one of the forty-four constraints in `explanation.md` holds. Name any you bend and why. A hard break is disqualifying.
2. Honest green count. How many of the twenty ids are green at loop and at integration, with each red carrying a capability name a stranger could act on.
3. Interface depth. Routes and RPCs are few; the wiring leaf's screen later calls a small surface; the complexity of metering, routing, gating, persistence and the stand-in sits behind it.
4. Invariants in structure. The balance cannot go negative, spend equals the sum of turn records by construction, a funded project cannot touch the pool, funding cannot change request settings, the kill switch cannot be bypassed by a stale read, a resumed conversation cannot lose a message.
5. Fit for what comes later. The Stripe fuel ledger, the free-phase guardrails, regeneration and retries, the structured scope output, the decline record and the wiring leaf extend this design with the least throwaway. Name what each deletes or fills in.
6. Diff size. The smallest change that gives the above. Count migrations, routes, definers, modules, stand-ins and suite files.

## Output

One document, shaped per the architect rationale template: Problem, Usage (caller's view, written first, with the six unit call sites in test form), Shape (tables with columns and types, definer signatures, route names and request and response bodies, `_shared` module names and exported function signatures, the stand-in's port and sim, the suite's SUT contract members, the expected file's red entries per tier), Tradeoffs accepted, Alternatives considered, Open questions and risks, Next implementation step. Leave "Synthesis decision" empty. Add a final section "Per-unit plan" with one block per unit naming files, ids, tier result, and lane.

Do not converge on a safe middle. Your lane has an assigned structural direction below. Push it as far as it honestly goes, and say where it breaks if it does.
## Your structural direction: the turn record is the ledger

Make the per-turn record the primary fact. A `discovery_turns` table (or your name) holds one row per turn with project, conversation, provider usage, cost, credits charged, billing target (pool or fuel), request settings, and timestamp. `discovery_spend.spent` becomes a maintained aggregate of those rows, kept equal by a trigger or by the same definer that inserts the turn, so AT-004.46's delta invariant is `spent = sum(credits) where target = pool` for the day. The daily reset is still the day key. Funded turns are rows with target fuel and no pool delta. The kill switch and email floor are gates read inside the turn definer. Push this direction: can the conversation itself be reconstructed from turn rows, so no separate messages table exists? Say where that breaks.

## Output location

Return the whole document as your reply. Do not write any file. Your reply is captured by the runner.

