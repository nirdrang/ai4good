# AT-REQ-004 — AI Discovery Agent (free, rate-limited)

Source: prd-mvp.md REQ-004 (+ REQ-002 tiers, REQ-005.5 transitions, REQ-006 funded routing, REQ-032 files, REQ-034 category attribution). Dependencies: REQ-003.

## A. Credits & the two-layer money model

- **AT-004.01 (P0)** — Given an unverified-tier NGO, When it converses with Discovery, Then consumption draws from the 10/day allowance; Given a vetted NGO, Then from 30/day [cross: REQ-002].
- **AT-004.02 (P0)** — Given any Discovery turn on free credits, When it completes, Then its credit cost is proportional to the platform cost of the turn (a long/context-heavy turn costs more than a trivial one) and the per-turn cost is shown to the NGO.
- **AT-004.03 (P0)** — Given an NGO at 0 credits on an unfunded project, When it sends a message, Then it is blocked and shown exactly the three remedies: get vetted (→30), fund fuel to continue now, or wait for the next day.
- **AT-004.04 (P0)** — Given a funded project (fuel balance > 0), When the NGO runs Discovery on it, Then every turn bills the project's fuel — never the free pool ("Funded → all-$"), and the same platform share applies as any consumption [cross: REQ-006].
- **AT-004.05 (P0)** — Given one NGO with a funded project A and an unfunded project B, When it runs Discovery on both, Then A's turns bill A's fuel and B's turns draw the NGO's free daily pool — the pool serves only unfunded projects.
- **AT-004.06 (P0)** — Given an NGO that funds a project mid-conversation, When the next turn runs, Then billing switches to fuel from that turn onward.
- **AT-004.07 (P0)** — Given a project funded at any point from `draft` onward, When Discovery bills fuel, Then the consumption is labeled as NGO-side Discovery in the ledger and attributed to the project's Discovery category [cross: REQ-006/034].
- **AT-004.08 (P0)** — Given free credits, When the UTC day rolls, Then the balance hard-resets to the tier grant (no rollover) [cross: REQ-002].
- **AT-004.09 (P0)** — Given funding, When it occurs, Then it only removes the wait: same model, no speed change, no allowance raise — observable as identical model/latency class before and after.

## B. Conversation behavior

- **AT-004.10 (P0)** — Given a submitted intake, When Discovery starts, Then it runs as a structured conversation on Claude Opus that elicits enough from a non-technical NGO to produce a valid scope, typically over 5–10 turns.
- **AT-004.11 (P0)** — Given a Discovery conversation in progress, When the NGO leaves and returns (new session, next day), Then the conversation persists and resumes with full prior context.
- **AT-004.12 (P0)** — Given free-credit Discovery, When the NGO asks an unrelated task (general Q&A, document drafting, translation, coding help), Then the agent declines/redirects to scoping.
- **AT-004.13 (P0)** — Given repeated off-topic requests on free credits, When the pattern continues, Then a plain notice is shown and the conversation is flagged for founder visibility — and the NGO is never locked out.
- **AT-004.14 (P0)** — Given a free conversation reaching the bounded per-conversation turn ceiling, When the ceiling is passed, Then Discovery wraps up: it generates the scope or directs the NGO to start a fresh Discovery.
- **AT-004.15 (P0)** — Given a funded project's Discovery, When the NGO goes off-topic, Then no scope guardrail fires — the per-turn cost display and fuel gauge are the only controls.

## C. Reference files [cross: REQ-032]

- **AT-004.16 (P0)** — Given files marked Discovery-visible, When the agent runs, Then it can read them (multimodally where applicable) and may cite them in questions and in the scope doc.
- **AT-004.17 (P0)** — Given a file NOT marked Discovery-visible, When the conversation runs, Then that file's content never reaches the agent (negative test at the context boundary).
- **AT-004.18 (P0)** — Given a mid-conversation need, When the agent asks for more material, Then the NGO can upload and the agent uses it in later turns.
- **AT-004.19 (P0)** — Given a file attachment on free credits, When uploaded, Then it consumes zero credits and triggers no confirmation interruption; Given a funded project, Then file-bearing turns bill fuel like any turn.

## D. Structured scope output

- **AT-004.20 (P0)** — Given a completed Discovery, When the scope is generated, Then it contains ALL of: a summary; user stories with nested acceptance criteria; a suggested stack; a complexity tier (small/medium/large); risk flags; a data-sensitivity tier; a maintainability-fit verdict; a Lovable recommendation with rationale; and the Lovable-vs-Claude-Code build split.
- **AT-004.21 (P0)** — Given any Discovery output or rendered scope doc, When inspected, Then no dollar estimate appears anywhere — the complexity tier is never expressed in money.
- **AT-004.22 (P0)** — Given every generated scope, When inspected, Then both parts of the build split are present (which parts are built in Lovable and which are coded through Claude Code) — v1 always emits both.
- **AT-004.23 (P0)** — Given a valid scope output, When produced, Then the project transitions `discovery_in_progress → scoped` automatically [cross: REQ-005.5].
- **AT-004.24 (P0)** — Given the scope contract rule, When any downstream surface is inspected, Then no build tasks are decomposed directly from Discovery output — it is the source for the dev-authored PRD and the scorer's gate reference only [cross: REQ-036/026].
- **AT-004.25 (P0)** — Given the rendered scope doc, When read by the NGO, Then it explains the complexity tier with rationale and start-small advice; states maintenance expectations (NGO evolves by chat, ~$25/mo Lovable subscription paid directly, NGO owns the code); links Lovable's public pricing where recommended; and renders fixtures-only handling when Tier-2.

## E. Data-sensitivity tiers

- **AT-004.26 (P0)** — Given any Discovery, When the conversation proceeds, Then the agent asks what data the tool will handle BEFORE assigning a sensitivity tier.
- **AT-004.27 (P0)** — Given ordinary-PII needs, When tiered, Then Tier 1 is assigned with a minimization reminder and the NGO data-responsibility acknowledgment.
- **AT-004.28 (P0)** — Given special-category or high-volume PII, When tiered, Then Tier 2 is assigned: synthetic/anonymized fixtures only during build; the NGO connects real data itself after completion; real Tier-2 data never reaches Anthropic, Lovable, or the volunteer.
- **AT-004.29 (P0)** — Given health, immigration, abuse-victim, or financial data, When tiered, Then the tier is never below Tier 2.
- **AT-004.30 (P0)** — Given genuine uncertainty about the data, When tiered, Then Tier 2 is assigned (unsure → Tier 2).
- **AT-004.31 (P1)** — Given a no-restriction tool (no personal data), When tiered, Then Tier 0 is assigned and no data acknowledgment burden is added.

## F. Maintainability-fit check & declines

- **AT-004.32 (P0)** — Given a need a non-technical staffer can maintain via Lovable chat (internal tools: intake forms, CRUD trackers, directories, dashboards), When checked, Then it passes the fit check (fit by default).
- **AT-004.33 (P0)** — Given a need requiring ongoing developer maintenance (developer-grade, one-off, pure-backend, or Tier-2 data that cannot live in Lovable), When checked, Then Discovery declines plainly, explains the limitation, and produces NO publishable scope.
- **AT-004.34 (P0)** — Given a confidential-codebase need, When checked, Then it is likewise declined (public-only v1).
- **AT-004.35 (P0)** — Given any decline, When it lands, Then a decline record exists for founder review — and there is no waitlist and no second track.
- **AT-004.36 (P0)** — Given a tool handling sensitive *data* that otherwise fits, When checked, Then sensitivity alone is never a decline reason — it is served Tier-2 fixtures-only.

## G. Regeneration, retries & failure

- **AT-004.37 (P0)** — Given a generated scope the NGO rejects, When they regenerate, Then regeneration works a bounded number of times, each with a logged reason, and costs zero credits.
- **AT-004.38 (P0)** — Given the regeneration bound is exhausted, When the NGO tries again, Then the case escalates to an admin instead of regenerating.
- **AT-004.39 (P0)** — Given a system-error mid-turn, When the turn is retried, Then the retry costs zero credits.
- **AT-004.40 (P0)** — Given invalid/malformed scope output, When generation completes, Then it is retried a bounded number of times and then escalated to an admin — the project does not silently reach `scoped` [cross: REQ-005.5].

## H. Abuse guardrails & controls

- **AT-004.41 (P0)** — Given an email-unverified account, When it attempts any Discovery message, Then it is blocked [cross: REQ-001/002].
- **AT-004.42 (P0)** — Given a per-NGO admin kill switch, When an admin disables the NGO, Then its Discovery is blocked immediately.
- **AT-004.43 (P0)** — Given free credits, When any admin path attempts to grant supplemental free credits, Then no such capability exists.
- **AT-004.44 (P0)** — Given heavy usage by one NGO, When its caps bind, Then only that NGO is limited — there is no platform-wide Discovery circuit breaker.
- **AT-004.45 (P0)** — Given free credits, When inspected against the money system, Then they are never purchasable and live outside the money ledger [cross: REQ-006].

## I. Transparency

- **AT-004.46 (P0)** — Given any Discovery surface, When the NGO views it, Then remaining daily credits and each turn's cost are visible, and credits are never silently removed.

## Coverage map

| REQ-004 clause | Tests |
|---|---|
| Two-layer money: 10/30 daily, reset, no rollover | 01, 08 |
| Funded → all-$ routing; pool serves only unfunded | 04–07 |
| Funding removes the wait only | 09 |
| Opus, 5–10 structured turns, persists/resumes | 10, 11 |
| Reads Discovery-visible files; may request more; cites; never non-visible | 16–18 |
| Structured output (all fields) | 20, 22 |
| Never dollars; tier + rationale + start-small; maintenance + pricing link; Tier-2 renders fixtures-only | 21, 25 |
| Scope contract — never decomposed directly | 24 |
| Sensitivity tiers 0/1/2, ask-first, unsure→2, category floor | 26–31 |
| Maintainability fit + declines (recorded, no waitlist); sensitivity never a decline reason | 32–36 |
| Regeneration bounded/logged/free; error retries free | 37–39 |
| Invalid output → bounded retry → admin | 40 |
| Free-phase guardrails (scope rule, turn ceiling, notice+flag, never lockout); funded = no guardrail | 12–15 |
| Abuse guardrails (verification floor, kill switch, no grants, no platform breaker, credits outside ledger) | 41–45 |
| Transparency (credits visible, per-turn cost, never silently removed) | 02, 46 |
| Files free / no interrupt; funded files bill fuel | 19 |
| Valid output → scoped automatically | 23 |
