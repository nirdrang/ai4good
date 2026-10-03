Unit 3 of AI4DEV-181 (Discovery wired to backend) is implemented on `lane/ai4dev-181/unit3`. Nothing was pushed. No other agent was launched. No existing process was stopped, started, or restarted. Integration checks used the running Supabase stack and the normal migration reset.

The server now accepts only the screen's opening or answer request with a client message id. Answer requests must name the displayed charge. A completed free reply costs exactly one credit regardless of tokens; failed and abandoned replies release the reserved credit. The opening stays free. Replaying the same completed message id uses its saved reply. Free comes before fuel, which remains the existing stub.

The daily grant is 10, or 30 when vetted, per UTC day. No lifetime counter remains in the active screen or request path. The usage card shows today's free turns left of the daily grant, available paid USD, and the next reply's mode. Historical replies do not consume today's grant: the strengthened test seeds 60 replies on six prior UTC days, then proves that today's replies still work and that projects share the NGO's daily allowance.

The requirement bundle is decision d95 and change order 013. The owning pure sections were edited, the PRD and the two isolates were generated, and the acceptance/decomposition bijections remain intact. The cohort limit of 20 NGOs and one sponsored project each remains in the requirement. No enrollment table or backend field storing lifetime grants or usage exists in this branch, so there was no such field to drop. Enrollment enforcement was not added by this unit.

## Implementation commits

- `81271c49b5e02783787b1c49f870261b78fa8628` docs: apply d95 daily Discovery grants and remove lifetime limits (AI4DEV-181)
- `5187211be5aa5501681be6aae84a8eabd5d60080` feat: show daily Discovery turns without lifetime fields (AI4DEV-181)
- `39b3540011cbfd84c34985214749cca64cce696b` feat: remove old Discovery requests and token-priced free turns (AI4DEV-181)
- `dc40b4a53d6cb6b1a08c0681ad1220819f8781cc` test: prove daily grants after historical replies and update auth requests (AI4DEV-181)

This report is committed after the implementation commits. Its commit hash is listed in the final handoff.

## Checks

All final check results are below. Existing declared red cases remain red; no result declaration changed and no previously green test became red. Earlier failing runs were repaired before these final runs: a missing reply shape in the authorization helper, stale retry charges, current-message duplication in the context assertion, and a failure response missing its refreshed allowance.

| Command | Exit | Result |
| --- | --- | --- |
| `bun run typecheck` | 0 | All four projects clean |
| `bun run at:selftest` | 0 | 38 files, 495 tests pass; 494 before the unit |
| `bun run at:check req-001` | 0 | 38 priority acceptance ids in bijection |
| `bun run at:check req-002` | 0 | 27 priority acceptance ids in bijection |
| `bun run at:check req-004` | 0 | 70 priority acceptance ids in bijection |
| `bun run at:verify req-002 --tier loop --expect` | 0 | 20 green, 7 red, 0 missing; matches |
| `bun run at:verify req-004 --tier loop --expect` | 0 | 44 green, 26 red, 0 missing; matches |
| `bun run at:verify req-001 --tier loop --expect` | 0 | Additional authorization-helper check: 33 green, 5 red, 0 missing; matches |
| `bun run at:verify req-001 --tier integration --expect` | 0 | 29 green, 9 red, 0 missing; matches |
| `bun run at:verify req-002 --tier integration --expect` | 0 | 19 green, 8 red, 0 missing; matches |
| `bun run at:verify req-003 --tier integration --expect` | 0 | 10 green, 3 red, 0 missing; matches |
| `bun run at:verify req-004 --tier integration --expect` | 0 | 17 green, 53 red, 0 missing; matches, including the 60-reply historical regression |
| `bun run at:verify req-016 --tier integration --expect` | 0 | 12 green, 0 red, 0 missing; matches |
| `powershell -File loop/assemble-pure.ps1` | 0 | Generated and verified 30 requirements |
| `powershell -File loop/extract-isolates.ps1 -Reqs 002,004` | 0 | Generated both named isolates |
| `powershell -File loop/assemble-pure.ps1 -Check` | 0 | Exact PRD reproduction; 30 headings, 62 roadmap references, zero prohibited content |
| `powershell -File loop/decomp/check-tree.ps1` | 0 | All 30 requirement bijections and dependency graph pass |
| Equivalent of the requested forbidden-name `rg` search | 0 | Python byte scan of all 368 nonbinary files under `src`, `supabase`, `design/astra/src`, and `tests`: 0 matches |
| `git diff --check` | 0 | No whitespace errors |

Each integration suite ran alone. Every reset reported 38 migrations expected and 38 applied. The migration added by this unit is `20261003120200_discovery_daily_reply_only.sql`; no merged migration changed. It removes the old reserve and reply-wrapper SQL functions, token-price columns and constraints, and replaces the canonical reserve and settle implementations with the reply contract.

`rg` is not installed in this environment, so the equivalent search used the exact regular expression from the brief and the same four trees. Bun checks and commits needed sandbox escalation for parent configuration and shared Git metadata; those executions were approved. There was no 15-minute environment blockage.

## Acceptance text amendments

Every amended acceptance id is retained. The new acceptance lines are reproduced verbatim below. Coverage-map rows were adjusted to the daily-only rule as well.

### at-req-002.md

- **AT-002.04 (P0)** — Given an email-verified NGO with an enrolled project, its daily grant is exactly 10 free turns, or 30 when vetted. Another project or member receives no additional grant. Unvetted NGOs can draft but cannot publish. [d95]
- **AT-002.05 (P0)** — Given no eligible free turn and no available fuel, sending is blocked and the draft remains. Show ordinary fuel checkout and the next UTC daily reset. Vetting raises an unvetted NGO's daily grant from 10 to 30 without resetting turns already used. [d95]
- **AT-002.26 (P0)** — Given exhausted daily capacity, funding project fuel permits paid continuation. Buying fuel changes no daily grant or usage. [d95]
- **AT-002.27 (P0)** — Given exhausted daily capacity, the next UTC day restores 10 free turns, or 30 when vetted, without a lifetime cap. [d95]
- **AT-002.06 (P0)** — Given zero, partial, or full daily capacity, the UTC day change resets daily usage exactly once without rollover. The daily grant is 10, or 30 when vetted. [d95]
- **AT-002.07 (P0)** — Given k turns used today, vetting raises the daily grant from 10 to 30 and preserves k. Subsequent UTC days grant 30 while vetted. [d95]
- **AT-002.08 (P0)** — Given an enrolled NGO, unvetting, re-vetting, reopening Discovery, or recreating a project never creates another sponsorship or resets consumed daily turns. Vetting raises the daily grant from 10 to 30. [d95]
- **AT-002.28 (P0)** — Given pilot enrollment, concierge onboarding records the audited vet action and sponsored project. At most 20 NGOs enroll, one sponsored project each. Concurrent admissions cannot create a twenty-first sponsorship. Vetting raises the daily grant from 10 to 30 and never creates a second sponsorship. [d95]

### at-req-004.md

- **AT-004.01 (P0)** — Given an enrolled project, each completed free reply consumes one of its 10 daily free turns, or 30 when its NGO is vetted, regardless of paid fuel. [d95]
- **AT-004.03a (P0)** — Given an unvetted NGO with no available free turn or fuel, sending stops and preserves the draft. Show ordinary fuel checkout and the next UTC daily reset. Vetting raises the daily grant from 10 to 30 without resetting consumed turns. [d95]
- **AT-004.03b (P0)** — Given a vetted NGO with no available free turn or fuel, sending stops and preserves the draft. Show ordinary fuel checkout and the next UTC daily reset, which restores 30 free turns. [d95]
- **AT-004.49 (P0)** — Given two concurrent requests for the last free turn, at most one reserves that turn. Successful completion consumes once; failure releases once; duplicate completion changes no counter. The daily allowance never becomes negative. Token usage cannot change a reserved free reply into paid usage. [d92] [d95]
- **AT-004.04 (P0)** — Given a funded project with daily capacity, the next completed reply consumes one free turn and no paid fuel. After the daily cap is exhausted, a paid reply uses reported usage and versioned rates plus the separate locked platform fee. Uncached input, cache reads, cache writes by duration, output, and billed tools are counted once. Missing final usage remains pending. Duplicate provider events cannot duplicate consumption. [d92] [d95]
- **AT-004.47 (P0)** — Given one enrolled NGO and multiple projects, only its recorded sponsored project consumes the daily grant. Reopening, recreating projects, or adding members cannot create another sponsorship or reset daily usage. The initial cohort has at most 20 NGOs, one sponsored project each. More than 50 lifetime replies remain eligible across UTC days; free replies are bounded by the daily grant alone. [d95]
- **AT-004.48 (P0)** — Given exhausted paid fuel and eligible daily capacity, the next Discovery reply runs free through the platform budget despite the inactive paid key. Existing account or abuse blocks remain effective. [d92] [d95]
- **AT-004.06 (P0)** — Given mid-conversation funding, the next reply stays free while daily capacity remains. Otherwise it uses paid fuel. After the daily reset it returns to free-first. A turn keeps its selected source throughout execution. [d92] [d95]
- **AT-004.08 (P0)** — Given the UTC reset, daily usage resets without rollover and the daily grant is 10, or 30 when vetted. There is no lifetime turn cap. [d95]
- **AT-004.09 (P0)** — Given funding, model ID, service tier, request priority, and the daily free grant remain unchanged. Funding permits paid continuation after free capacity. [d92] [d95]
- **AT-004.14 (P0)** — Given a Discovery conversation of any length, When the NGO says to stop, Then Discovery wraps up on request: the live brief keeps what is known and lists the rest as open questions, and the NGO can finish Discovery. [d94: no closing model call and no scope generation] There is no per-conversation turn ceiling. On free turns, the daily free-turn quota is the only bound. When a quota runs out, Discovery offers scope review or paid continuation. A fresh conversation does not reset the daily usage, cannot mint a grant, and cannot approve unresolved scope. [founder 2026-09-19: "No limit of number of turns (except credit) but ngo can always say stop now"; d92 quotas; the founder chose this combination on 2026-09-25] [d95]
- **AT-004.46 (P0)** — Given Discovery, show only its gate gauge, daily free turns, available paid USD, reset time in the viewer's locale, and Free or Paid before Send. Show final or pending per-turn usage and a separate 15% fee for paid consumption. Preserve fractional cents. At consumed percentages 79.99, 80, 95, 95.01, and 100, colors are green, yellow, yellow, red, and red respectively. Text identifies the active limit. Reading, manual editing, review, and approval change no allowance or fuel. Use the existing app font and theme variables, including dark mode. After approval, carry available paid allocation forward once, keep pending amounts reserved, and never convert free turns to dollars. Follow design/discovery-ui-contract.md for layout and states. [d92] [d95]
- **AT-004.72 (P0)** — Given free and paid modes, When the usage display renders, Then one bar shows free replies first and paid fuel after, with daily and fuel values in one card; the card stays visible while the brief is open; no usage text sits beside Send; and on a 390-pixel phone the bar sits directly above the message box. The message box starts at one line and grows with the text. [d95]

## Test and declaration changes

No file under `tests/at/expected/` changed. The list of acceptance results whose declaration changed is empty.

- AT-004.01 (daily grants), AT-004.02 (one credit regardless of tokens), AT-004.03a (unvetted remedies), AT-004.03b (vetted remedies), AT-004.04 (free before funded fuel), AT-004.05 (project fuel isolation), AT-004.06 (funding mid-conversation), AT-004.08 (UTC reset), AT-004.09 (funding keeps the grant), AT-004.47 (historical replies and shared daily usage), AT-004.48 (free with exhausted fuel), and AT-004.49 (last credit and token independence) now exercise the reply contract or its canonical reservation and settlement.
- AT-004.10 (grant-tracker conversation), AT-004.11 (restored context), AT-004.12 (off-topic redirect), AT-004.13 (repeated redirects), AT-004.14 (stop and retain open questions), and AT-004.15 (guardrails follow selected mode) now use the forced reply tool and the new brief contract.
- AT-004.20 (scope source), AT-004.21 (no cost estimate), AT-004.22 (build split), AT-004.25 (tier copy), AT-004.58 (cause reuse), AT-004.59 (cause growth), AT-004.60 (label removal), AT-004.37 (scope regeneration), AT-004.38 (regeneration bound), and AT-004.39 (failure and retry) use reply-based scripted conversations. Existing scope generation derives its input from the completed brief rather than a removed model-record parser. This retains the old scope suite until its already scheduled removal; no old Discovery request path remains.
- AT-004.46 (readable usage), AT-004.62 (Finish), AT-004.64 (manual review), and AT-004.72 (one usage card) stop checking lifetime fields. Other brief flow assertions share the updated helper.
- AT-001.10 (unverified account refusal) retains its text and result; both authorization helpers send the new wire shape so the test reaches the email-verification refusal.
- No requirement-002 test asserted a lifetime counter. Its existing 10/30 grant and vetting tests retain their results and use the corrected contract text.

The scripted model helper was updated once in `tests/at/harness/vendors.ts`. Discovery calls always receive `reply`; saved semantic fixtures are converted centrally into reply updates. The separate parser selftest was removed and replaced with four request-contract tests, accounting for the increase from 494 to 495 harness tests. Token-count dispatch was removed from both model adapters and the shared port.

## Files

### Added (4)

- `design/change-orders/013-discovery-one-credit-no-beta.md`
- `supabase/migrations/20261003120200_discovery_daily_reply_only.sql`
- `tests/at/harness/discovery-turn.selftest.ts`
- `loop/items/AI4DEV-181/evidence/unit3/writer-output.md`

### Changed (58)

- `.taskmaster/docs/acceptance/at-req-002.md`
- `.taskmaster/docs/acceptance/at-req-004.md`
- `.taskmaster/docs/prd-mvp.md`
- `.taskmaster/docs/requirements/req-002.md`
- `.taskmaster/docs/requirements/req-004.md`
- `design/astra/src/fixture-data.ts`
- `design/astra/src/fixture-world.ts`
- `design/astra/src/model.ts`
- `design/astra/src/screens.tsx`
- `design/discovery-ui-contract.md`
- `design/ui-ux-instructions.md`
- `loop/decomp/req-002.md`
- `loop/decomp/req-004.md`
- `loop/out/pure-s3-req-001-006.md`
- `loop/out/pure-s7-nfr-tech-roadmap-scope.md`
- `loop/out/pure-s9-questions-risks.md`
- `loop/state/decisions.jsonl`
- `src/components/discovery/UsageCard.tsx`
- `src/components/discovery/a11y.ts`
- `src/components/discovery/model.ts`
- `src/lib/discovery-stream.ts`
- `src/routes/discovery/$organizationId.$projectId.tsx`
- `supabase/functions/_shared/anthropic-messages.ts`
- `supabase/functions/_shared/discovery-metering.ts`
- `supabase/functions/_shared/discovery-prompt.ts`
- `supabase/functions/_shared/discovery-reads.ts`
- `supabase/functions/_shared/discovery-reply.ts`
- `supabase/functions/_shared/discovery-skills/04-complete-the-record.md`
- `supabase/functions/_shared/discovery-skills/index.ts`
- `supabase/functions/_shared/discovery-turn.ts`
- `supabase/functions/_shared/openai-compatible-messages.ts`
- `supabase/functions/_shared/scope.ts`
- `tests/at/harness/atconfig.ts`
- `tests/at/harness/config.ts`
- `tests/at/harness/contracts.ts`
- `tests/at/harness/vendors.selftest.ts`
- `tests/at/harness/vendors.ts`
- `tests/at/suites/req-001/_fixture.ts`
- `tests/at/suites/req-001/_live.ts`
- `tests/at/suites/req-004/_contract.ts`
- `tests/at/suites/req-004/_fixture.ts`
- `tests/at/suites/req-004/_flows.ts`
- `tests/at/suites/req-004/_live.ts`
- `tests/at/suites/req-004/_source-pins.ts`
- `tests/at/suites/req-004/a-metering.test.ts`
- `tests/at/suites/req-004/b-funded-routing.test.ts`
- `tests/at/suites/req-004/c-remedies.test.ts`
- `tests/at/suites/req-004/d-conversation.test.ts`
- `tests/at/suites/req-004/e-guardrails.test.ts`
- `tests/at/suites/req-004/f-transparency.test.ts`
- `tests/at/suites/req-004/fixtures/food-bank.ts`
- `tests/at/suites/req-004/fixtures/grant-tracker.oracle.ts`
- `tests/at/suites/req-004/fixtures/grant-tracker.ts`
- `tests/at/suites/req-004/fixtures/record-grant-tracker.ts`
- `tests/at/suites/req-004/g-scope-output.test.ts`
- `tests/at/suites/req-004/h-cause-labels.test.ts`
- `tests/at/suites/req-004/i-regeneration.test.ts`
- `tests/at/suites/req-004/j-need-brief.test.ts`

### Deleted (1)

- `tests/at/harness/discovery-elicitation.selftest.ts`

## Left for the design stage and external publication

Change order `design/change-orders/013-discovery-one-credit-no-beta.md` records the founder's exact words, the changed requirement text, and the usage-contract edits. Parts a and b are committed. Part c remains with the design stage: revise the Discovery canvas so its usage card has daily turns only, with the 10/30 daily grant, paid USD available, and the next reply mode; run its design review and founder completion gate, then copy the accepted canvas into `design/canvas/discovery/`. This unit did not revise or approve that canvas.

The repository's generated review document was refreshed at `.taskmaster/docs/prd-mvp.md`. An external Claude review artifact was not republished: this session exposes no Claude artifact publishing tool or designated artifact destination. The assembled repository document and change order are ready for that publication. No Linear forward sync was run; the writer brief requested doc-sync steps 1 through 6 and authorizes work only inside this worktree.

The required automated checks are complete. A real-provider conversation proof was not requested for this unit and was not run; vendor-dependent acceptance cases retain their existing declared red status. Fuel remains the stub as requested.
