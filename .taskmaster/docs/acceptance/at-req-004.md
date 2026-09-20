# AT-REQ-004 — AI Discovery Agent (free, rate-limited)

Source: prd-mvp.md REQ-004 (isolated: requirements/req-004.md). Dependencies: REQ-003.

**Boundary note [cx]:** REQ-004 owns Discovery behavior, credits/routing at the Discovery boundary, tiers, fit-check/declines, guardrails, and structured output. Tested in their owning suites (setup/cross only here): the **NGO-confirmed `discovery_in_progress → scoped`** transition and the **invalid-output → bounded-retry → admin** rule → AT-REQ-005.5; **funding mechanics** ($50 min, NGO-picked amount, reactive top-up) and the **Discovery ledger label** → AT-REQ-006; **REQ-034 category attribution** → AT-REQ-034; the **UTC reset boundary** → AT-REQ-002.

## A. Credits & the two-layer money model

- **AT-004.01 (P0)** — Given an enrolled project of either vetting status, free replies consume the project's 10 daily and 50 beta turn limits. A free reply requires capacity in both counters, regardless of paid fuel. [d92]
- **AT-004.02 (P0)** — Given completed free replies with different input, cached input, output, and internal call counts, each reply consumes exactly one free turn and zero NGO dollars. One NGO submission and its completed AI reply form one turn; internal retries add no free charge. [d92]
- **AT-004.03a (P0)** — Given an unvetted NGO with no available free turn or fuel, sending stops and preserves the draft. Show ordinary fuel checkout and, only when beta capacity remains, the next daily reset. Do not offer vetting as an allowance increase. [d92]
- **AT-004.03b (P0)** — Given a vetted NGO with no available free turn or fuel, show the same applicable remedies as the unvetted NGO. If beta capacity is zero, never imply tomorrow supplies more free turns. [d92]
- **AT-004.49 (P0)** — Given two concurrent requests for the last free turn, at most one reserves that turn. Successful completion consumes once; failure releases once; duplicate completion changes no counter. Neither counter becomes negative. Token usage cannot change a reserved free reply into paid usage. [d92]
- **AT-004.04 (P0)** — Given a funded project with daily and beta capacity, the next completed reply consumes one free turn and no paid fuel. After either cap is exhausted, a paid reply uses reported usage and versioned rates plus the separate locked platform fee. Uncached input, cache reads, cache writes by duration, output, and billed tools are counted once. Missing final usage remains pending. Duplicate provider events cannot duplicate consumption. [d92]
- **AT-004.05 (P0)** — Given a sponsored project A and another project B, each paid turn draws only its own project fuel. Free A calls use the platform-funded provider budget and never enter either NGO money ledger, including during provider reconciliation. B has no independent free grant. [d92]
- **AT-004.47 (P0)** — Given one enrolled NGO and multiple projects, only its recorded sponsored project can consume its beta grant. Reopening or recreating projects, or adding members later, cannot exceed 50 beta turns or create another sponsorship. The initial 20 enrollments permit at most 1,000 completed free turns. [d92]
- **AT-004.48 (P0)** — Given exhausted paid fuel and eligible daily and beta capacity, the next Discovery reply runs free through the platform budget despite the inactive paid key. Existing account or abuse blocks remain effective. [d92]
- **AT-004.06 (P0)** — Given mid-conversation funding, the next reply stays free while both counters have capacity. Otherwise it uses paid fuel. After the daily reset it returns to free-first if beta capacity remains. A turn keeps its selected source throughout execution. [d92]
- **AT-004.07 [retired — cx r2: duplicate of AT-004.04, the earlier paid-routing case; d92 replaces that case with free-first routing]**
- **AT-004.08 (P0)** — Given the UTC reset, daily capacity becomes 10 without rollover and beta capacity persists. A depleted beta grant never replenishes from the reset. [cross: REQ-002] [d92]
- **AT-004.09 (P0)** — Given funding, model ID, service tier, request priority, and both free grants remain unchanged. Funding permits paid continuation after free capacity. [d92]

## B. Conversation behavior

- **AT-004.10 (P0)** — Given a representative intake, Discovery uses NGO and AI roles only, reuses known facts, and targets 5–10 structured turns on Claude Opus. Ask the next unresolved question with its reason. Group only independent questions. Dependent questions wait. Suggested answers, custom answers, and uncertainty are supported. The resulting scope satisfies the fixture's required facts, constraints, stories, and criteria. Unknown answers remain explicit. [d92]
- **AT-004.11 (P0)** — Given an active conversation, leaving and returning restores the transcript, answers, pending questions, brief, and usage. Editing an earlier answer marks dependent answers for review and updates the brief. The AI cannot approve the brief for the NGO. [d92]
- **AT-004.12 (P0)** — Given free-credit Discovery, When the NGO asks an unrelated task (general Q&A, document drafting, translation, coding help), Then the agent declines/redirects to scoping.
- **AT-004.13 (P0)** — Given repeated off-topic requests on free credits, When the pattern continues, Then a plain notice is shown and the conversation is flagged for founder visibility — and the NGO is never locked out.
- **AT-004.14 (P0)** — Given a Discovery conversation of any length, When the NGO says to stop, Then Discovery wraps up on request: the elicitation is recorded as complete with what is known and the rest listed as open questions, and the scope can be generated. There is no per-conversation turn ceiling. On free turns, the daily and beta free-turn quotas are the only bound. When a quota runs out, Discovery offers scope review or paid continuation. A fresh conversation does not reset the daily or beta counts, cannot mint a grant, and cannot approve unresolved scope. [founder 2026-09-19: "No limit of number of turns (except credit) but ngo can always say stop now"; d92 quotas; the founder chose this combination on 2026-09-25]
- **AT-004.15 (P0)** — Given a paid-mode turn after free capacity is exhausted, free scope redirects and off-topic notices do not apply. Given a funded project still using free capacity, those free guardrails do apply. The selected turn mode decides, not whether fuel was purchased. [d92; the founder kept this over "funded = no guardrail" on 2026-09-25]

## C. Reference files [cross: REQ-032]

- **AT-004.16 (P0)** — Given a Discovery-visible file containing a unique sentinel fact, When the NGO asks Discovery about it, Then the response or scope reflects that file-backed fact — proving the agent read the file (multimodally where applicable). [cx: sentinel makes citation observable, not "may cite"]
- **AT-004.17 (P0)** — Given a file NOT marked Discovery-visible, When the conversation runs, Then that file's content never reaches the agent (negative test at the context boundary).
- **AT-004.18 (P0)** — Given a mid-conversation need, When the agent asks for more material, Then the NGO can upload and the agent uses it in later turns.
- **AT-004.19 (P0)** — Given any file upload, attachment alone consumes no turn and causes no spending interruption. File-bearing AI replies follow their reserved free or paid mode. A free reply remains one turn and zero NGO dollars, regardless of file tokens. [d92]

## D. Structured scope output

- **AT-004.20 (P0)** — Given a completed Discovery, When the scope is generated, Then it contains ALL of: a summary; user stories with nested acceptance criteria; a suggested stack; a complexity tier (small/medium/large); risk flags; a data-sensitivity tier; a maintainability-fit verdict; zero to three cause labels; a Lovable recommendation with rationale; and the Lovable-vs-Claude-Code build split. [d90: cause labels added to the enumerated contract — see AT-004.58-60 for generation behavior]
- **AT-004.21 (P0)** — Given any Discovery output or rendered scope doc, When inspected, Then no project/build-cost estimate appears and the complexity tier is never expressed in money — the mandated ~$25/mo Lovable maintenance figure and per-turn costs are permitted. [cx: narrowed — was "no dollar anywhere", which contradicted the required maintenance figure]
- **AT-004.22 (P0)** — Given every generated scope, When inspected, Then both parts of the build split are present (which parts are built in Lovable and which are coded through Claude Code) — v1 always emits both.
- **AT-004.23 [retired — cx: the `discovery_in_progress → scoped` confirmation transition is a REQ-005.5 lifecycle obligation → AT-REQ-005.5]**
- **AT-004.24 (P0)** — Given a scoped project, When the INITIAL automated build backlog is decomposed [cross: REQ-026/036], Then it derives from the passing dev-authored PRD and no task decomposes Discovery output directly (later volunteer-added sub-issues / accepted scope-additions are exempt). [cx r2: scoped to initial decomposition — later sub-issues are allowed by REQ-026]
- **AT-004.52 (P0)** — Given a completed Discovery, When PRD authoring and the completion scorer run [cross: REQ-036], Then the Discovery scope is the source supplied to PRD authoring AND the reference the scorer compares the PRD against. [cx r2: covers "scope contract = PRD source + scorer gate reference", not just downstream lineage]
- **AT-004.25 (P0)** — Given rendered scope docs across Tier 0, Tier 1, and Tier 2 fixtures, When read by the NGO, Then each plainly explains its assigned data tier (Tier-2 additionally renders fixtures-only handling), the complexity tier with rationale + start-small advice, maintenance expectations (chat-evolve, ~$25/mo paid directly, NGO owns the code), and links Lovable pricing where recommended. [cx r2: parameterized across all tiers, not Tier-2 only]
- **AT-004.58 (P0)** — Given a shared vocabulary already containing a cause label (fixture: "food security") and a new Discovery conversation whose problem description clearly matches that same domain, When the scope generates, Then the emitted cause label REUSES the existing "food security" label rather than inventing a synonymous new one (e.g. "hunger relief" or "food banks") — generation normalizes against the existing vocabulary, it does not invent freely per project. [d90]
- **AT-004.59 (P0)** — Given a Discovery conversation describing a domain with no matching existing label, When the scope generates, Then a new cause label is added to the shared vocabulary — the vocabulary grows only for genuinely new domains; and Given a conversation too thin to support a confident label, When the scope generates, Then zero cause labels are emitted — generation may legitimately produce none, causes are never a required output. [d90]
- **AT-004.60 (P0)** — Given a scoped project carrying Discovery-generated cause labels, When the NGO removes one, Then it is removed; When the NGO or any other account attempts to type, create, or curate a cause label through any supported UI/API, Then no such control or endpoint exists anywhere in the product — there is no admin taxonomy-management surface either. Correction is deletion-only; invention stays machine-owned. [d90]

## E. Data-sensitivity tiers

- **AT-004.26 (P0)** — Given any Discovery, When the conversation proceeds, Then the agent asks what data the tool will handle BEFORE assigning a sensitivity tier.
- **AT-004.27 (P0)** — Given ordinary-PII needs, When tiered, Then Tier 1 is assigned with a minimization reminder and the NGO data-responsibility acknowledgment.
- **AT-004.28 (P0)** — Given special-category or high-volume PII, When tiered, Then Tier 2 is assigned: synthetic/anonymized fixtures only during build; the NGO connects real data itself after completion; real Tier-2 data never reaches Anthropic, Lovable, or the volunteer.
- **AT-004.29 (P0)** — Given health, immigration, abuse-victim, or financial data, When tiered, Then the tier is never below Tier 2.
- **AT-004.30 (P0)** — Given genuine uncertainty about the data, When tiered, Then Tier 2 is assigned (unsure → Tier 2).
- **AT-004.31 (P0)** — Given a no-restriction tool (no personal data), When tiered, Then Tier 0 is assigned. [cx: promoted P1→P0]
- **AT-004.50 (P0)** — Given a tier assignment, When it lands, Then the data-exposure responsibility is attributed to the NGO, and a data-responsibility acknowledgment is required in the tier flows that mandate one (Tier 1 and Tier 2) — not universally for Tier 0. [cx r2: acknowledgment only where the tier rules require it]
- **AT-004.51 (P0)** — Given a Discovery-assigned data tier — including one where post-Discovery scope EDITS changed the data surface (second fixture), When the project reaches triage [cross: REQ-023], Then the tier and the final edited scope are presented to the HUMAN reviewer with the advisory pass's data-tier evidence, and the tier is confirmed by the reviewer's decision — never treated as final without human confirmation. [cx: added] [d74: confirmation is the reviewer's, informed by advisory evidence; post-edit drift covered]

## F. Maintainability-fit check & declines

- **AT-004.32 (P0)** — Given a need a non-technical staffer can maintain via Lovable chat (internal tools: intake forms, CRUD trackers, directories, dashboards), When checked, Then it passes the fit check (fit by default).
- **AT-004.33 (P0)** — Given a need requiring ongoing developer maintenance (developer-grade, one-off, pure-backend, or Tier-2 data that cannot live in Lovable), When checked, Then Discovery declines plainly, explains the limitation, and produces NO publishable scope.
- **AT-004.34 (P0)** — Given a confidential-codebase need, When checked, Then it is likewise declined (public-only v1).
- **AT-004.35 (P0)** — Given any decline, When it lands, Then a decline record exists for founder review — and there is no waitlist and no second track.
- **AT-004.36 (P0)** — Given a tool handling sensitive *data* that otherwise fits, When checked, Then it is not declined for sensitivity — it is served, with the tier assigned by the 0/1/2 rules (ordinary PII → Tier 1, special-category → Tier 2). [cx: corrected — not everything sensitive is Tier-2]
- **AT-004.53 (P0)** — Given a fit decline of either cause (ongoing developer maintenance; confidential codebase), When it lands, Then ALL of the following exist from that one event: the NGO's decline message; a durable decline record ON THE PROJECT carrying cause, date and reshaping suggestion; exactly ONE platform-admin ops item carrying the project, the cause and the full Discovery conversation; and the admin notification (REQ-016). A decline that produces the message but no ops item, or two ops items, fails. [d89]
- **AT-004.54 (P0)** — Given a declined project, When the NGO views its project list, Then the declined project is still listed with its decline record visible — the decline is not chat-only. And Given the decline message itself, Then its copy states that a person reviews every decline and will reach out if it was wrong (the oversight sentence is present, not implied). [d89]
- **AT-004.55 (P0)** — Given an open fit-decline ops item, When the founder disposes it **upheld**, Then the item closes, the disposition is recorded with actor and timestamp, the project stays `cancelled`, and the NGO receives NO further notification. [d89]
- **AT-004.56 (P0)** — Given an open fit-decline ops item, When the founder disposes it **overturned**, Then the project returns to `discovery_in_progress` with its Discovery conversation intact and resumable, the NGO is notified that Discovery reopened, and the disposition is recorded. [d89] [cross: REQ-005.5 owns the transition legality]
- **AT-004.57 (P0)** — Given a set of disposed fit-declines, When the calibration dataset is read, Then every disposition (upheld and overturned) is retrievable with its decline cause and Discovery conversation — the dataset the decline evaluator is tuned against, parallel to REQ-023's founder-review records. An unauditable decline — one with no ops item or no recorded disposition path — fails. [d89]

## G. Regeneration, retries & failure

- **AT-004.37 (P0)** — Given a generated scope the NGO rejects, When they regenerate, Then regeneration works a bounded number of times, each with a logged reason, and costs zero credits.
- **AT-004.38 (P0)** — Given the regeneration bound is exhausted, When the NGO tries again, Then the case escalates to an admin instead of regenerating.
- **AT-004.39 (P0)** — Given a failed turn or automatic system retry, no extra free turn is consumed. A failed free turn releases its reservation once. Internal retries share the original turn and mode. Bounded scope regeneration retains its explicit zero-credit exemption. [d92]
- **AT-004.40 [retired — cx: invalid-output → bounded-retry → admin (and not silently reaching `scoped`) is a REQ-005.5 lifecycle obligation → AT-REQ-005.5]**

## H. Abuse guardrails & controls

- **AT-004.41 (P0)** — Given an email-unverified account, When it attempts any Discovery message, Then it is blocked [cross: REQ-001/002].
- **AT-004.42 (P0)** — Given a per-NGO admin kill switch, When an admin disables the NGO, Then its Discovery is blocked immediately.
- **AT-004.43 (P0)** — Given free credits, When any admin path attempts to grant supplemental free credits, Then no such capability exists.
- **AT-004.44 (P0)** — Given an enrolled NGO exhausting its grant, other enrolled NGOs retain their own remaining capacity. The initial cohort admits at most 20 NGOs; this admission bound is not a usage-triggered platform shutdown. [d92]
- **AT-004.45 (P0)** — Given free credits, When inspected against the money system, Then they are never purchasable and live outside the money ledger [cross: REQ-006].

## I. Transparency

- **AT-004.46 (P0)** — Given Discovery, show only its gate gauge, daily free turns, remaining beta turns, available paid USD, reset time in the viewer's locale, and Free or Paid before Send. Show final or pending per-turn usage and a separate 15% fee for paid consumption. Preserve fractional cents. At consumed percentages 79.99, 80, 95, 95.01, and 100, colors are green, yellow, yellow, red, and red respectively. Text identifies the active limit. Reading, manual editing, review, and approval change no allowance or fuel. Use the existing app font and theme variables, including dark mode. After approval, carry available paid allocation forward once, keep pending amounts reserved, and never convert free turns to dollars. Follow design/discovery-ui-contract.md for layout and states. [d92]

## Coverage map

| REQ-004 clause | Tests |
|---|---|
| 10 daily / 50 beta turns per enrolled project; UTC reset; no duplicate grants; atomic bounds | 01, 08, 47, 49 |
| Free-first routing; paid USD settlement; sponsored cost isolation; free works with exhausted fuel | 04–07, 48 |
| Funding removes the wait only | 09 |
| Opus, structured conversation → valid scope in bounded turns; persists/resumes | 10, 11 |
| Reads Discovery-visible files (sentinel-proven); may request more; never non-visible | 16–18 |
| Structured output (all fields, incl. 0-3 cause labels) | 20, 22 |
| Never project-cost/tier-in-dollars; tier + rationale + start-small; maintenance + pricing link; Tier-2 renders fixtures-only | 21, 25 |
| Cause-taxonomy generation: reuses existing vocabulary before inventing; grows only for genuinely new domains; may legitimately emit zero | 58, 59 [d90] |
| Correction is remove-only; no NGO/admin control to invent or curate a cause label anywhere | 60 [d90] |
| Scope contract — Discovery is PRD source + scorer reference; initial backlog from the gated PRD, never Discovery | 24, 52 |
| Sensitivity tiers 0/1/2, ask-first, unsure→2, category floor; NGO owns risk (ack per tier rules); triage confirms tier; per-tier doc explanation | 25, 26–31, 50, 51 |
| Maintainability fit + declines (recorded, no waitlist); sensitivity never a decline reason | 32–36 |
| Decline-then-review: one event → NGO message + durable project record + exactly one ops item + admin notice | 53 [d89] |
| Declined project stays visible in the NGO's list; decline copy carries the oversight sentence | 54 [d89] |
| Disposition upheld (stays cancelled, no further NGO notice) / overturned (Discovery reopens, NGO notified) | 55, 56 [d89] |
| Dispositions retrievable as the decline evaluator's calibration dataset; no unauditable decline | 57 [d89] |
| Regeneration bounded/logged/free; error retries free | 37–39 |
| Free-phase guardrails (scope rule, turn ceiling, notice+flag, never lockout); paid mode has no free guardrail | 12–15 |
| Abuse guardrails (verification floor, kill switch, no grants, no platform breaker, credits outside ledger) | 41–45 |
| Transparency (credits visible, per-turn cost, never silently removed) | 02, 46 |
| File upload is free; AI file reads follow selected mode | 19 |
| Retired to owning suites [cx]: valid-output→scoped + invalid→retry→admin (REQ-005.5); ledger label (REQ-006); category attribution (REQ-034) | — |
