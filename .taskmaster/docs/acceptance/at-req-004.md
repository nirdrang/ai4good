# AT-REQ-004 — AI Discovery Agent (free, rate-limited)

Source: prd-mvp.md REQ-004 (isolated: requirements/req-004.md). Dependencies: REQ-003.

**Boundary note [cx]:** REQ-004 owns Discovery behavior, credits/routing at the Discovery boundary, tiers, fit-check/declines, guardrails, and structured output. Tested in their owning suites (setup/cross only here): the **auto `discovery_in_progress → scoped`** transition and the **invalid-output → bounded-retry → admin** rule → AT-REQ-005.5; **funding mechanics** ($50 min, NGO-picked amount, reactive top-up) and the **Discovery ledger label** → AT-REQ-006; **REQ-034 category attribution** → AT-REQ-034; the **UTC reset boundary** → AT-REQ-002.

## A. Credits & the two-layer money model

- **AT-004.01 (P0)** — Given an unverified-tier NGO, When it converses with Discovery, Then consumption draws from the 10/day allowance; Given a vetted NGO, Then from 30/day [cross: REQ-002].
- **AT-004.02 (P0)** — Given free-credit turns with controlled provider costs, When each completes, Then the credit charged holds a constant cost-to-credit ratio (proportional to platform cost, under a stated rounding rule), and each turn's cost is shown to the NGO. [cx r2: proportionality, not just monotonicity]
- **AT-004.03a (P0)** — Given an UNVERIFIED-tier NGO at 0 credits on an unfunded project, When it sends a message, Then it is blocked and shown exactly: get vetted (→30), fund fuel now, or wait for the next day. [cx: split by tier]
- **AT-004.03b (P0)** — Given a VETTED NGO at 0 credits on an unfunded project, When it sends a message, Then it is blocked and shown only the applicable remedies: fund fuel now, or wait — never "get vetted". [cx: split by tier — REQ-002]
- **AT-004.49 (P0)** — Given free-phase Discovery over a day, When turns run against the allowance, Then total free-phase provider spend never exceeds the remaining allowance and the balance never goes negative — without prescribing whether an underfunded turn is preflight-rejected or hard-capped. [cx r2: bound platform spend, do not mandate "does not run"]
- **AT-004.04 (P0)** — Given a funded project (fuel balance > 0), When the NGO runs Discovery on it, Then every turn bills the project's fuel — never the free pool ("Funded → all-$"), and the same platform share applies as any consumption [cross: REQ-006].
- **AT-004.05 (P0)** — Given one NGO with a funded project A and an unfunded project B, When it runs Discovery on both, Then A's turns bill A's fuel and B's turns draw the NGO's free daily pool — the pool serves only unfunded projects.
- **AT-004.47 (P0)** — Given one NGO with two UNFUNDED projects, When it runs Discovery across both, Then their combined free consumption cannot exceed the NGO's single daily grant — the allowance is per-NGO, not per-project. [cx: added]
- **AT-004.48 (P0)** — Given a funded project with exhausted fuel AND the NGO holding a positive free-credit balance, When Discovery runs on that project, Then it does NOT fall back to free credits — it requires a fuel top-up. [cx: added — funded projects never draw the pool]
- **AT-004.06 (P0)** — Given an NGO that funds a project mid-conversation, When the next turn runs, Then billing switches to fuel from that turn onward.
- **AT-004.07 [retired — cx r2: duplicate of AT-004.04, which already asserts funded turns bill project fuel at the standard share]**
- **AT-004.08 (P0)** — Given free credits, When a day rolls over, Then the balance hard-resets to the tier grant with no rollover [cross: REQ-002 owns the exact UTC boundary]. [cx]
- **AT-004.09 (P0)** — Given funding, When it occurs, Then the model ID and service tier / request-priority settings are identical before and after, and the free daily allowance is unchanged — funding removes only the wait. [cx r2: observable request settings instead of nondeterministic "latency class"]

## B. Conversation behavior

- **AT-004.10 (P0)** — Given a representative non-technical intake fixture, When Discovery runs to completion on Claude Opus over 5–10 structured turns, Then its output satisfies a fixture-specific semantic oracle — the required facts, constraints, user stories, and acceptance criteria for that fixture are present and correct — not merely non-empty fields. [cx r2: 5–10 bound + semantic oracle, not field-presence]
- **AT-004.11 (P0)** — Given a Discovery conversation in progress, When the NGO leaves and returns (new session, next day), Then the conversation persists and resumes with full prior context.
- **AT-004.12 (P0)** — Given free-credit Discovery, When the NGO asks an unrelated task (general Q&A, document drafting, translation, coding help), Then the agent declines/redirects to scoping.
- **AT-004.13 (P0)** — Given repeated off-topic requests on free credits, When the pattern continues, Then a plain notice is shown and the conversation is flagged for founder visibility — and the NGO is never locked out.
- **AT-004.14 (P0)** — Given a free conversation reaching the bounded per-conversation turn ceiling, When the ceiling is passed, Then Discovery wraps up: it generates the scope or directs the NGO to start a fresh Discovery.
- **AT-004.15 (P0)** — Given a funded project's Discovery, When the NGO goes off-topic AND continues past the free turn ceiling AND repeats off-topic requests, Then no free-scope redirect, turn-ceiling wrap-up, notice, or founder flag occurs — only the per-turn cost display and fuel gauge apply. [cx r2: exercises the full "funded = no guardrail" clause, not one off-topic turn]

## C. Reference files [cross: REQ-032]

- **AT-004.16 (P0)** — Given a Discovery-visible file containing a unique sentinel fact, When the NGO asks Discovery about it, Then the response or scope reflects that file-backed fact — proving the agent read the file (multimodally where applicable). [cx: sentinel makes citation observable, not "may cite"]
- **AT-004.17 (P0)** — Given a file NOT marked Discovery-visible, When the conversation runs, Then that file's content never reaches the agent (negative test at the context boundary).
- **AT-004.18 (P0)** — Given a mid-conversation need, When the agent asks for more material, Then the NGO can upload and the agent uses it in later turns.
- **AT-004.19 (P0)** — Given a file attachment on free credits, When uploaded, Then it consumes zero credits and triggers no confirmation interruption; Given a funded project, Then file-bearing turns bill fuel like any turn.

## D. Structured scope output

- **AT-004.20 (P0)** — Given a completed Discovery, When the scope is generated, Then it contains ALL of: a summary; user stories with nested acceptance criteria; a suggested stack; a complexity tier (small/medium/large); risk flags; a data-sensitivity tier; a maintainability-fit verdict; a Lovable recommendation with rationale; and the Lovable-vs-Claude-Code build split.
- **AT-004.21 (P0)** — Given any Discovery output or rendered scope doc, When inspected, Then no project/build-cost estimate appears and the complexity tier is never expressed in money — the mandated ~$25/mo Lovable maintenance figure and per-turn costs are permitted. [cx: narrowed — was "no dollar anywhere", which contradicted the required maintenance figure]
- **AT-004.22 (P0)** — Given every generated scope, When inspected, Then both parts of the build split are present (which parts are built in Lovable and which are coded through Claude Code) — v1 always emits both.
- **AT-004.23 [retired — cx: the `discovery_in_progress → scoped` auto-transition is a REQ-005.5 lifecycle obligation → AT-REQ-005.5]**
- **AT-004.24 (P0)** — Given a scoped project, When the INITIAL automated build backlog is decomposed [cross: REQ-026/036], Then it derives from the passing dev-authored PRD and no task decomposes Discovery output directly (later volunteer-added sub-issues / accepted scope-additions are exempt). [cx r2: scoped to initial decomposition — later sub-issues are allowed by REQ-026]
- **AT-004.52 (P0)** — Given a completed Discovery, When PRD authoring and the completion scorer run [cross: REQ-036], Then the Discovery scope is the source supplied to PRD authoring AND the reference the scorer compares the PRD against. [cx r2: covers "scope contract = PRD source + scorer gate reference", not just downstream lineage]
- **AT-004.25 (P0)** — Given rendered scope docs across Tier 0, Tier 1, and Tier 2 fixtures, When read by the NGO, Then each plainly explains its assigned data tier (Tier-2 additionally renders fixtures-only handling), the complexity tier with rationale + start-small advice, maintenance expectations (chat-evolve, ~$25/mo paid directly, NGO owns the code), and links Lovable pricing where recommended. [cx r2: parameterized across all tiers, not Tier-2 only]

## E. Data-sensitivity tiers

- **AT-004.26 (P0)** — Given any Discovery, When the conversation proceeds, Then the agent asks what data the tool will handle BEFORE assigning a sensitivity tier.
- **AT-004.27 (P0)** — Given ordinary-PII needs, When tiered, Then Tier 1 is assigned with a minimization reminder and the NGO data-responsibility acknowledgment.
- **AT-004.28 (P0)** — Given special-category or high-volume PII, When tiered, Then Tier 2 is assigned: synthetic/anonymized fixtures only during build; the NGO connects real data itself after completion; real Tier-2 data never reaches Anthropic, Lovable, or the volunteer.
- **AT-004.29 (P0)** — Given health, immigration, abuse-victim, or financial data, When tiered, Then the tier is never below Tier 2.
- **AT-004.30 (P0)** — Given genuine uncertainty about the data, When tiered, Then Tier 2 is assigned (unsure → Tier 2).
- **AT-004.31 (P0)** — Given a no-restriction tool (no personal data), When tiered, Then Tier 0 is assigned. [cx: promoted P1→P0]
- **AT-004.50 (P0)** — Given a tier assignment, When it lands, Then the data-exposure responsibility is attributed to the NGO, and a data-responsibility acknowledgment is required in the tier flows that mandate one (Tier 1 and Tier 2) — not universally for Tier 0. [cx r2: acknowledgment only where the tier rules require it]
- **AT-004.51 (P0)** — Given a Discovery-assigned data tier, When the project reaches triage [cross: REQ-023], Then the tier is submitted to and confirmed by triage — not treated as final without confirmation. [cx: added — "triage confirms the tier"]

## F. Maintainability-fit check & declines

- **AT-004.32 (P0)** — Given a need a non-technical staffer can maintain via Lovable chat (internal tools: intake forms, CRUD trackers, directories, dashboards), When checked, Then it passes the fit check (fit by default).
- **AT-004.33 (P0)** — Given a need requiring ongoing developer maintenance (developer-grade, one-off, pure-backend, or Tier-2 data that cannot live in Lovable), When checked, Then Discovery declines plainly, explains the limitation, and produces NO publishable scope.
- **AT-004.34 (P0)** — Given a confidential-codebase need, When checked, Then it is likewise declined (public-only v1).
- **AT-004.35 (P0)** — Given any decline, When it lands, Then a decline record exists for founder review — and there is no waitlist and no second track.
- **AT-004.36 (P0)** — Given a tool handling sensitive *data* that otherwise fits, When checked, Then it is not declined for sensitivity — it is served, with the tier assigned by the 0/1/2 rules (ordinary PII → Tier 1, special-category → Tier 2). [cx: corrected — not everything sensitive is Tier-2]

## G. Regeneration, retries & failure

- **AT-004.37 (P0)** — Given a generated scope the NGO rejects, When they regenerate, Then regeneration works a bounded number of times, each with a logged reason, and costs zero credits.
- **AT-004.38 (P0)** — Given the regeneration bound is exhausted, When the NGO tries again, Then the case escalates to an admin instead of regenerating.
- **AT-004.39 (P0)** — Given a system-error mid-turn, When the turn is retried, Then the retry costs zero credits.
- **AT-004.40 [retired — cx: invalid-output → bounded-retry → admin (and not silently reaching `scoped`) is a REQ-005.5 lifecycle obligation → AT-REQ-005.5]**

## H. Abuse guardrails & controls

- **AT-004.41 (P0)** — Given an email-unverified account, When it attempts any Discovery message, Then it is blocked [cross: REQ-001/002].
- **AT-004.42 (P0)** — Given a per-NGO admin kill switch, When an admin disables the NGO, Then its Discovery is blocked immediately.
- **AT-004.43 (P0)** — Given free credits, When any admin path attempts to grant supplemental free credits, Then no such capability exists.
- **AT-004.44 (P0)** — Given heavy usage by one NGO, When its caps bind, Then only that NGO is limited — there is no platform-wide Discovery circuit breaker.
- **AT-004.45 (P0)** — Given free credits, When inspected against the money system, Then they are never purchasable and live outside the money ledger [cross: REQ-006].

## I. Transparency

- **AT-004.46 (P0)** — Given a Discovery surface, When the NGO views it, Then remaining daily credits and each turn's cost are visible; and every negative balance delta corresponds exactly to a visible turn-cost record or the documented daily reset, while zero-cost actions (file attach, regeneration, error retry) produce no delta — credits are never silently removed. [cx r2: made "never silently removed" a checkable delta invariant]

## Coverage map

| REQ-004 clause | Tests |
|---|---|
| Two-layer money: 10/30 daily, reset, no rollover; per-NGO not per-project; insufficient-credit bound | 01, 08, 47, 49 |
| Funded → all-$ routing; pool serves only unfunded; exhausted funded never falls back | 04–07, 48 |
| Funding removes the wait only | 09 |
| Opus, structured conversation → valid scope in bounded turns; persists/resumes | 10, 11 |
| Reads Discovery-visible files (sentinel-proven); may request more; never non-visible | 16–18 |
| Structured output (all fields) | 20, 22 |
| Never project-cost/tier-in-dollars; tier + rationale + start-small; maintenance + pricing link; Tier-2 renders fixtures-only | 21, 25 |
| Scope contract — Discovery is PRD source + scorer reference; initial backlog from the gated PRD, never Discovery | 24, 52 |
| Sensitivity tiers 0/1/2, ask-first, unsure→2, category floor; NGO owns risk (ack per tier rules); triage confirms tier; per-tier doc explanation | 25, 26–31, 50, 51 |
| Maintainability fit + declines (recorded, no waitlist); sensitivity never a decline reason | 32–36 |
| Regeneration bounded/logged/free; error retries free | 37–39 |
| Free-phase guardrails (scope rule, turn ceiling, notice+flag, never lockout); funded = no guardrail | 12–15 |
| Abuse guardrails (verification floor, kill switch, no grants, no platform breaker, credits outside ledger) | 41–45 |
| Transparency (credits visible, per-turn cost, never silently removed) | 02, 46 |
| Files free / no interrupt; funded files bill fuel | 19 |
| Retired to owning suites [cx]: valid-output→scoped + invalid→retry→admin (REQ-005.5); ledger label (REQ-006); category attribution (REQ-034) | — |
