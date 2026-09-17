[unattributed]

**Recommend B as the base, with corrections before implementation. A and C are disqualified under constraint 27.** B best protects actual provider exposure and makes turn accounting structural.

These are design scores, not test results. I read all four packages end to end. The requirement suite does not yet exist. I ran no tests and wrote no files.

| Rubric criterion | A | B | C | D |
|---|---:|---:|---:|---:|
| 1. Constraint compliance | 0 | 4 | 0 | 3 |
| 2. Honest green count | 1 | 4 | 2 | 2 |
| 3. Interface depth | 4 | 5 | 3 | 4 |
| 4. Invariants in structure | 1 | 4 | 2 | 2 |
| 5. Fit for what comes later | 3 | 4 | 3 | 2 |
| 6. Diff size | 3 | 3 | 4 | 4 |
| **Total / 30** | **12** | **24** | **14** | **17** |
| **Eligible as submitted** | **No** | **Yes** | **No** | **Yes** |

The remaining scores for disqualified candidates identify useful ideas. They do not restore eligibility.

**Candidate A**

**1. Constraint compliance: 0.** In “Routes,” A says the auth live adapter “keeps throwing `CapabilityPending(['sut.accounts.sendDiscoveryMessage'])`.” Constraint 27 explicitly requires updating that adapter when promoting the route. I checked `tests/at/suites/req-001/_live.ts:1026` and `supabase/functions/_shared/write-routes.ts`. The obsolete refusal and stand-in inventory row are present. A otherwise specifies appropriate table revokes, catalog registration, pure decisions, and separate audit migrations.

**2. Honest green count: 1.** “Expected file” claims twenty loop greens and twelve integration greens. Several proofs are narrower than their ids. AT-004.49 caps deducted credits after provider spending has occurred. AT-004.46 excludes raw debits and substitutes attachment neutrality for unimplemented regeneration and retry behavior. AT-004.48 treats unknown fuel as exhausted fuel. AT-004.11 proves a seeded read, but does not specify the complete next-day resume proof. I checked `.taskmaster/docs/acceptance/at-req-004.md`. The remedy greens for .03a and .03b are defensible under the grounding’s explicitly permitted API interpretation.

**3. Interface depth: 4.** “Usage” offers “send a turn, read Discovery state, and ... flip the kill switch.” That is a small caller surface. The pure kernel also gives loop tests substantial shipped behavior to exercise. The weakness is an optional kernel mechanism inside the shared write frame, plus four RPCs behind three routes. I checked `supabase/functions/_shared/edge.ts`; its current constructor performs one RPC, so this is a meaningful framework extension.

**4. Invariants in structure: 1.** A qualifies reconciliation with “no raw discovery_allowance debit.” That excludes a supported route, not merely privileged corruption. I checked `supabase/functions/discovery-allowance/index.ts`, its shared decision module, and the allowance migration. An authorized NGO can still create unjournaled spending. A also accepts that concurrent turns can “burn one model call that then refuses at commit.” Credit checks cannot undo that provider cost. Message sequence uniqueness does not supply request idempotency or serialize context assembly. The kill-switch reread lacks an explicit shared locking protocol with the admin writer.

**5. Fit for what comes later: 3.** “Stripe later” fills `FuelState` and may replace `projects.funded`. Separate message and turn tables give structured output and decline review usable records. However, the Messages simulator also owns `setFuelRemaining`, mixing unrelated vendor responsibilities. Retries need a new request identity and attempt lifecycle. The claim that regeneration can simply commit with zero credits also needs explicit operation semantics. I checked `loop/decomp/req-004.md`; these are named future obligations.

**6. Diff size: 3.** The per-unit plan implies four migrations, three route folders, four new definers, three tables, one pure kernel module, one Deno client, one stand-in, and fifteen suite files. It also changes the write frame and harness. A provides no consolidated count. Its small module count is offset by three storage tables and unresolved concurrency work.

**Candidate B**

**1. Constraint compliance: 4.** “Suite contract and files” explicitly updates the auth fixture and live adapter after promotion. Database grants, aliases, audit migration separation, key handling, and expected-state registration fit the grounding. One concrete incompatibility remains: “New configuration entries” puts `discoveryModelId` in `AT_CONFIG`. I checked `tests/at/harness/atconfig.ts`; values accept numbers, booleans, or null, not strings. Keep the model id as a shipped string constant with a source pin. Retiring successful raw debits is not itself a numbered prohibition, but B must preserve the specified allowance reads, sentences, and refusal obligations.

**2. Honest green count: 4.** “Red set” claims eighteen loop greens and eight integration greens. It correctly leaves .45 pending without a money system and .46 pending without zero-cost actions. Its names identify actionable work, including `discovery.zero-cost-actions` and `vendors.anthropic-messages`. It explicitly identifies operator-supplied integration results. Those prove accounting, not a live provider conversation. The remaining gap is .04: a fuel port is proposed, but the standard platform-share assertion lacks a concrete fixture contract. I checked the full .04 acceptance clause and `tests/at/harness/contracts.ts`.

**3. Interface depth: 5.** “Usage” uses the existing send and allowance route names, plus one admin route. The NGO gets two calls. “SQL functions and write-frame extension” keeps all turn phases behind one inventoried dispatcher. Internal fuel and trigger functions do not widen the browser API. The narrow orchestration branch avoids exposing an arbitrary RPC callback. This fits the boundary enforced by `tests/at/suites/req-001/_write-route-scan.ts`.

**4. Invariants in structure: 4.** “The turn record” specifies a completion trigger, immutable completed facts, and deferred aggregate reconciliation. “Admission, settlement, and concurrency” adds request idempotency, one unresolved turn per conversation, and reservations that survive uncertain outcomes. This is the strongest protection against duplicate provider expenditure. It also closes the raw-debit escape hatch. Two details need resolution. The conservative provider bound must be enforced against actual request settings. Also, `delivery_withheld` does not itself hide assistant content from authenticated table SELECTs. I checked B’s proposed SELECT policy against `tests/at/suites/req-001/_policy-scan.ts`.

**5. Fit for what comes later: 4.** “Open questions and risks” identifies precise extensions. Stripe fills the fuel hook and activation writer. Guardrails consume the stored billing target. Structured output extends content validation. Decline review freezes a conversation sequence. Wiring renders the existing read contract. Unknown outcomes and request identities provide useful foundations for retries. The cost is a future attempt structure for tool loops and multiple assistant messages. Historic nonzero spending also remains an explicit migration gate.

**6. Diff size: 3.** “Planned production additions” counts four migrations, two new edge folders, two tables, seven SQL functions, five shared modules including the client, one stand-in, and fourteen suite files. Three of the seven SQL functions are service-facing mutators; the others are internal helpers or triggers. This is larger than C or D. The extra structure directly supports accounting, concurrency, and retries. Cross-suite debit-fixture migration is a substantial additional cost.

**Candidate C**

**1. Constraint compliance: 0.** “Open questions and risks” explicitly leaves AT-001.10 pending on `sut.accounts.sendDiscoveryMessage` and files the adapter update as “Not done here.” That breaks constraint 27. I checked the existing refusal in `tests/at/suites/req-001/_live.ts`. C otherwise gives detailed table posture and separate audit migrations. Its opening claim that the wallet scan rejects any project table with a state or status column is incorrect. I checked `tests/at/suites/req-002/_source-absences.ts`; that scan detects Discovery wallet naming and copy.

**2. Honest green count: 2.** “Expected file” claims twenty loop greens and ten integration greens. The seeded resume plus reserve-context proof for .11 is stronger than A’s read-only proof. The zero-fuel stub makes .48’s refusal test defensible. However, .49 deliberately scripts provider cost beyond the reservation while keeping the id green. The Deno client also calls `requireEnv('ANTHROPIC_API_KEY')` when constructing the client. That conflicts with the claimed keyless deployed refusal tests unless construction is deferred. I checked the key allowlist in `tests/at/harness/local-stack.ts` and the full .49 acceptance clause.

**3. Interface depth: 3.** “Usage” requires send, conversation read, allowance read, and admin control. Reserve, provider execution, settlement, and refund remain behind the send route. That is reasonable encapsulation, but the NGO must coordinate two reads for one screen. “The write frame’s second phase” adds an arbitrary settlement RPC name and callback. B’s single dispatcher is narrower. I checked the current route constructor and inventory in `edge.ts` and `write-routes.ts`.

**4. Invariants in structure: 2.** Reservations under locks prevent concurrent credit overcommit, and a partial unique index prevents two open turns on one project. But “The ratio and the rounding rule” explicitly records `overrun_micros` and lets the platform absorb it. That fails the provider-spend bound. The client converts all caught errors into failed outcomes, which release the reservation even when provider execution may be uncertain. Raw debits remain an admitted reconciliation escape hatch. The balance-dependent `max_tokens` calculation also contradicts C’s stronger claim that free and funded request settings are identical.

**5. Fit for what comes later: 3.** “The funding seam” gives Stripe clear reserve and settle insertion points. Typed elicitation and a fixture oracle give structured output a useful starting point. Turn rows can support decline review. Retry handling is weaker. An abandoned turn is charged at its reservation without measured usage, and the future retry is supposed to inherit that reservation. That needs a defined attempt relationship. “Conversation store” also permits deleting turn rows during a future purge, which would destroy accounting provenance unless that policy changes.

**6. Diff size: 4.** The plan implies three migrations, three route folders, three service-facing definers, two private SQL functions, five new shared modules including the client, one stand-in, and sixteen suite files including fixture resources. It adds a separate harness oracle self-test. One turn table is compact. The refund writer and duplicated SQL/fixture lifecycle add complexity that the table count alone does not show.

**Candidate D**

**1. Constraint compliance: 3.** “Open questions and risks,” item 5, correctly changes the auth adapter and its expected capabilities after promotion. The new viewer helper is registered, and the audit enum gets a separate migration. I found no definite numbered hard break. The package is incomplete on expected-state detail: thirty-eight red entries remain a placeholder without a full id-to-capability mapping. Its grant scanner also expects callers to pass `discovery_daily_grant(...)` into `apply_discovery_grant_mark`. I checked the allowance and vetting migrations. That function takes a boolean vetted flag.

**2. Honest green count: 2.** “The expected file” claims nineteen loop greens and nine integration greens. Keeping .45 red is honest. The refusal, storage, and seeded-resume proofs are clearly distinguished from live model quality. But .49 is unsupported under concurrency, and .46 remains green at loop despite raw debits and missing zero-cost actions. The proposed .43 scanner would reject existing grant calls. The loop fuel map proves routing labels, but does not specify actual fuel consumption or the standard platform share required by .04.

**3. Interface depth: 4.** “Routes” gives the NGO one send and one combined conversation-and-allowance read. Both turn phases use `discovery_turn`. The additional viewer helper keeps the unreachable spend table behind a controlled read. This is a small public surface. The optional `act` RPC mechanism is broader than necessary, and every successful send adds a token-count call. I checked `supabase/functions/_shared/edge.ts` and the write-route scanner.

**4. Invariants in structure: 2.** “The ratio and the rounding rule” calls both preflight terms “exact.” Anthropic documents token counts as estimates. More fundamentally, no reservation survives `open`. Two projects can each preflight against the same remaining allowance and both incur provider cost before one settlement fails. The optional `afterTurn` check cannot guarantee fresh context when omitted. Raw debits bypass the journal, and a switch between phases intentionally loses the exchange. The existing spend check only bounds recorded credits. Sources checked: the allowance migration and [Anthropic token-counting documentation](https://platform.claude.com/docs/en/build-with-claude/token-counting).

**5. Fit for what comes later: 2.** “Where jsonb on the row breaks” candidly predicts lifting turn entries into a child table for Stripe. That is substantial planned replacement, not minimal throwaway. The size argument also depends on a later conversation ceiling, while funded conversations are exempt from that ceiling. Retries need durable request identity and attempt state. A decline record that references a mutable conversation also needs a frozen sequence or snapshot. I checked the funded exemption and decline obligations in `loop/decomp/req-004.md` and the acceptance file.

**6. Diff size: 4.** “Counts” lists two migrations, three route folders, two new mutating definers, one replaced allowance definer, one stub, one viewer helper, six new shared modules including the client, and one stand-in. It claims sixteen suite files, but the enumerated list totals seventeen: five scaffold files, two source arms, three script/oracle files, and seven test files. The schema is smallest. That advantage is reduced by the acknowledged future turn-table migration.

**Disqualifications**

- **A, constraint 27:** Promotes `discovery-message` while explicitly retaining the obsolete auth live-adapter refusal.
- **C, constraint 27:** Promotes `discovery-message` while explicitly deferring the required auth live-adapter update.

Both breaks are verified against `tests/at/suites/req-001/_live.ts:1026` and the binding constraint text. Missing provider credentials justify a new capability refusal. They do not justify leaving the route classified as unimplemented.

B and D have no confirmed numbered disqualification. Their defects still require correction. I do not apply constraint 44 to A’s design-document references because the constraint concerns pull-request references.

**Green-count audit**

Counts below cover this run’s twenty ids.

| Candidate | Claimed loop green | Claimed integration green | Judgment |
|---|---:|---:|---|
| A | 20 | 12 | Overstated at both tiers. |
| B | 18 | 8 | Most credible, with a missing funded-share proof. |
| C | 20 | 10 | Overstated; provider-bound and keyless-client defects remain. |
| D | 19 | 9 | Overstated; unreserved spending and incomplete reconciliation remain. |

A’s red names generally identify real missing capabilities. Its .02 integration red should also name the rendering dependency if the complete id is intended. Its unknown-fuel refusal does not establish the exhausted-fuel Given.

B gives the clearest actionable red set. Its integration accounting greens are credible as controlled SQL proofs. They must not be reported as successful live conversations. Its .04 loop green still needs a concrete fuel debit and platform-share assertion.

C names the immediate integration dependencies clearly. Many later backend obligations are assigned only `ui.discovery-surface`, which would send a stranger to the wrong work. Its .11 and .48 integration proposals are useful, but the deployed client must first boot without a key.

D names the immediate integration reds clearly. Its thirty-eight later reds are not individually mapped. Its routing-only fuel fixture cannot establish the whole funded-billing claim.

All four correctly separate scripted loop elicitation from live Opus quality. None has a currently proven green count. The tree has no `tests/at/suites/req-004` directory.

**Recommended base and transfers**

Use B as the base. It makes a completed turn the accounting fact, closes arbitrary debit access, reserves exposure before external work, and preserves uncertain outcomes. Those choices address the hardest invariants directly. Its conservative reds are more valuable than unsupported extra greens. Before implementation, correct the string configuration pin, define the funded platform-share fixture, resolve withheld-content reads, and specify the raw-debit compatibility migration against the existing allowance assertions. Its larger diff buys necessary guarantees.

- **Take from A:** Keep billing decisions and request construction in pure shipped functions that loop tests call directly.
- **Take from C:** Give Stripe explicit reserve and settle hooks keyed by a durable turn identity.
- **Take from D:** Present conversation history, turn costs, and allowance through one stable read projection.

- **Do not take from A:** Do not treat a capped credit deduction as a cap on provider spending.
- **Do not take from B:** Do not reserve the full model context window indefinitely when a smaller enforceable request bound can preserve safety and availability.
- **Do not take from C:** Do not release exposure merely because a provider call threw an error.
- **Do not take from D:** Do not treat an unreserved preflight as protection against concurrent spending.

**Convergence**

- **Existing allowance ownership:** A, B, C, and D retain `discovery_spend` as the free-credit ledger.
- **Route promotion:** All four promote `discovery-message` and narrow normal send access to NGO accounts.
- **External execution boundary:** All four put model I/O in Deno and extend the write frame around two database phases.
- **Funding separation:** All four route funded work away from free credits and leave real fuel integration unfinished.
- **Local oracle:** All four build a new fixture-specific oracle and Messages stand-in instead of restoring the parked harness.
- **Implementation lanes:** All four assign metering and conversation work to the hardest-tasks lane.
- **Notifications:** All four avoid adding a kill-switch taxonomy event.

**Irreconcilable divergences**

- **Meaning of spent:** B records only completed charges. C includes open reservations. A and D charge only after the provider returns.
- **Accounting authority:** B closes raw debits. A, C, and D retain a route that can violate turn reconciliation.
- **Storage:** A separates conversations, messages, and costs. B uses a header plus turn rows. C uses turn rows alone. D embeds messages and costs in JSON arrays.
- **Uncertain outcomes:** B retains unresolved exposure. C refunds caught failures but charges abandoned reservations. A and D can discard a paid result without a durable turn.
- **Funding state:** A uses a boolean, B and C use activation timestamps, and D has no settable integration funding state.
- **In-flight disable:** B preserves accounting while withholding delivery. C settles and returns already admitted work. A and D reject settlement and discard the exchange.
- **Proof boundary:** A accepts more API-only integration greens. B keeps incomplete whole-id obligations red. C and D accept operator-driven resume proofs. These positions cannot share one expected-state declaration without an explicit decision.