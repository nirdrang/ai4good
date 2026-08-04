# AI4DEV-21 (fake Stripe, GitHub, Anthropic) — the plan

**Item:** AI4DEV-21 — `H5 — Vendor stand-ins (Anthropic usage, Stripe, GitHub, Lovable, Linear)`
**Chain (derived from the board):** `~bringup > AI4DEV-3 (AT harness) > AI4DEV-21 (fake Stripe, GitHub, Anthropic)`
**Branch (Linear verbatim):** `nirdrang/ai4dev-21-h5-vendor-stand-ins-anthropic-usage-stripe-github-lovable`, base `fa18fda`
**Author:** the item agent (fable), 2026-08-04. This is the ONE intent artifact — there is no
brief and no separate design document. Gate 1 (codex sol @ max) refutes this plan, intent
included, before anything is implemented.

---

## What the item is

Controllable substitutes for outside services, driven by the tests, so a test can force any
vendor response without touching a real account. The item's own note singles out the one
consumer that exists today: REQ-016's provider-acceptance test (AT-016.11 — sent only on
provider acceptance, unconfirmed sends retry, a lost acknowledgment mints no duplicate) needs
the notification-provider stand-in from this slice. AT-016.01's part (4) also reads the
provider-side trace (`h.vendors.email.attempts()`).

Both ids are declared red today in `tests/at/expected/req-016.json` (loop tier):

- `AT-016.11` — `capability-pending: ["H5 email provider simulator"]`
- `AT-016.01` — `capability-pending: ["H3 static provider scan", "H5 email provider simulator"]`

The vendor seam's test-facing contract ALREADY EXISTS and is frozen by two suite files:
`tests/at/harness/contracts.ts` defines `ProviderOutcome`, `ProviderAttempt`,
`EmailProviderSim` (`rejectNext`, `acceptButLoseAck`, `accepted()`, `attempts()`) and
`Vendors = { email }`; `tests/at/suites/req-016/c-reliability-guard.test.ts` and
`a-emitter-and-taxonomy.test.ts` drive exactly that surface. This item implements what the
contract and the tests already demand; it invents no new test-facing surface.

## Decision D1 — deliver the email provider stand-in; DEFER the other four vendor sims

**Ruling.** This item builds the email/notification-provider simulator end to end and flips
AT-016.11 green. It does NOT build the Anthropic usage/cost, Stripe, GitHub, Lovable or Linear
stand-ins now. Grounds:

1. **No consumer exists.** The only tests in the tree that touch a vendor seam are REQ-016's
   two ids above, both against `vendors.email`. The suites that would drive the other four
   (REQ-006 Stripe, REQ-009/030/034 Anthropic usage & reconciliation, REQ-026 Linear,
   Lovable rows in REQ-016's taxonomy are notifications, not a Lovable API) are translated
   **just-in-time when each requirement is pulled** — that boundary is founder-ratified in
   `loop/bringup/AI4DEV-3-at-harness.md` (scope boundary + suite-authoring rule 5: a suite
   reconciles shared seams in the harness package when it lands).
2. **A contract without its consumer is a guess.** The email sim's contract was authored WITH
   the REQ-016 suite; that is why it is right. Contracts for the other four written today
   would be shaped from acceptance-file prose alone and would force a mid-flight redesign at
   translation time — the exact failure class Gate 1 exists to catch, deliberately committed.
3. **Precedent.** H3 (the sentinels item) left `providerClientImporters()` pending although
   the repo's naming assigned it to H3, on the recorded ground that implementing it would
   turn nothing green and prove nothing at loop tier (`loop/items/AI4DEV-19/brief.md`,
   "Ruling: the static provider scan stays pending"). The same logic covers four simulators
   with zero consuming tests.

**Disposition of the deferred four.** Recorded, not filed as dev items: a comment on
AI4DEV-21 (fake Stripe, GitHub, Anthropic) and a "deferred, and why" section in the PR body.
No new board item — a child under AI4DEV-3 (AT harness) would hold the bring-up parent open
behind work that has no consumer yet; each future suite's own decomposition carries its sim
when it is pulled. The stale line in `contracts.ts`'s header comment ("implementations arrive
per slice (… H5 vendor sims)") is updated to say email landed here and the rest arrive with
their consuming suites.

**Verification condition attached to this ruling** (a ruling that removes work must carry
one): before implementing, the executor sweeps `tests/at/` and `loop/decomp/` for any OTHER
present-tense consumer of a vendor seam (`vendors\.`, `stripe`, `github`, `lovable`,
`linear`, `anthropic`, case-insensitive, excluding comments/prose that merely name the
future). If a real consumer of a deferred vendor exists in executable code, the deferral for
that vendor is VOID and it comes back into scope before the diff is cut.

## Decision D2 — the simulator's shape

New file `tests/at/harness/vendors.ts`, following the H3 pattern (implementation module +
predicates routed through `guards.ts`, conformance-tested in the harness's own selftests).

`createEmailProviderSim()` returns two faces of one object:

- **`sim: EmailProviderSim`** — the test-facing contract, exactly as `contracts.ts` already
  defines it. No additions.
- **`port`** — the SUT-facing seam the fixture adapter calls to send. Exported as a type
  alias (`EmailProviderPort`): `deliver(send: { recipientId; eventId; channel }) →
  'accepted' | 'rejected' | 'no_ack'`. The port deliberately does NOT reveal `ack_lost` to
  the caller: a provider that accepted-but-lost-the-ack is indistinguishable from a timeout
  to the sender, and that indistinguishability is the thing AT-016.11(c) tests. `'rejected'`
  and `'no_ack'` are both "unconfirmed" to the SUT.

Semantics, in the order a send is processed:

1. **Idempotency first.** The send's identity is `eventId:recipientId:channel` — the same
   pair identity AT-016.11(c) counts. A send whose identity was already physically accepted
   (a prior `'accepted'` or `'ack_lost'` outcome) is a DUPLICATE: recorded in `attempts()`
   with outcome `'accepted'` (the provider acks the replay), NOT appended to `accepted()`
   (nothing new was accepted), returns `'accepted'`, and does NOT consume a forced outcome.
   This is standard provider idempotency (replay returns the original result, no second side
   effect) and is what makes "a lost ack mints no duplicate" provable.
2. **Forced outcomes.** One FIFO queue of forced outcomes, filled by `rejectNext(n)`
   (n × `'rejected'`) and `acceptButLoseAck(n)` (n × `'ack_lost'`) in call order. A
   non-duplicate send consumes the head: `'rejected'` → recorded in `attempts()` only,
   returns `'rejected'`; `'ack_lost'` → recorded in `attempts()` AND `accepted()` (the
   provider physically accepted), identity marked accepted, returns `'no_ack'`.
3. **Default.** Queue empty → outcome `'accepted'`, recorded in both traces, identity marked
   accepted, returns `'accepted'`.

`attempts()` is every send that arrived at the seam, in arrival order; `accepted()` is the
subsequence the provider physically accepted (first acceptance only). Both return fresh
copies so a test mutating a returned array cannot corrupt the trace.

**Guards** (in `guards.ts`, routed by `vendors.ts`, per the H3 wall pattern):
`providerForceCountProblem(count)` — `rejectNext`/`acceptButLoseAck` refuse a non-positive or
non-integer count with a plain-words error. A test that arms "reject the next zero sends"
believes a rejection is queued when nothing is; that must be a refusal, never a no-op.

**What is deliberately NOT built:** no channel validation at the port (the adapter owns its
channel names — the contract is generic over them), no latency/ordering simulation, no
`clear()`/reset surface (each `open()` builds a fresh harness and therefore a fresh sim;
`registry.ts` tears both down per test — isolation comes free, and the contract has no such
method for a test to call).

## Decision D3 — wiring in `createHarness()` (tests/at/harness/index.ts)

- Create the sim per harness: `const vendors = standInCapability('vendors.email', sim)`.
  It is a stand-in by nature, so `stubbedCapabilities()` lists it and the existing registry
  rule refuses it above the loop tier — an integration-tier run cannot silently grade
  against the sim. What replaces it at integration tier is H7's decision, not this item's.
- `vendors: vendors.value` replaces `pendingCapability<Vendors>('H5 email provider simulator')`.
- The `static` seam's name list drops `'H5 email provider simulator'`, becoming
  `pendingCapability<StaticScan>('H3 static provider scan')` — the seam must state the
  still-missing set exactly, and after this change the email sim is no longer missing. The
  declared red for AT-016.01 changes in the SAME commit (H3's drift rule: the reason for a
  red changing is a declaration edit, in the same change).
- `AdapterOptions`/`FixtureAdapterModule.createFixtureAdapter` gain a `vendors` member
  (`{ email: EmailProviderPort }`) passed to every adapter. Adapters that ignore it (the
  runner's disposable black-box adapters take an options object they largely ignore) keep
  working — the member is additive on the options object, not a new required export.
  `suite-adapters.ts`'s `AdapterModuleFor` constrains the module shape with `(...args:
  never[])`, so no change is forced there; the executor verifies with `bun run typecheck`.

## Decision D4 — the reference SUT honours the provider seam (tests/at/suites/req-016/_fixture.ts)

The loop-tier reference stand-in currently marks every delivery sent unconditionally in
`drainDeliveries()`. It gains the mechanics the suite's OWN contract already declares
(`NotificationsSut.drainDeliveries(opts?: { passes?: number })`, delivery/event states
`pending | retrying | sent | failed`):

- **One worker pass:** for each delivery not `'sent'`: channel `'inapp'` → mark `'sent'`
  (no provider exists for in-app). Channel `'email'` → call `port.deliver` with the pair
  identity; `'accepted'` → `'sent'`; `'rejected'` or `'no_ack'` → `'retrying'`. A delivery
  transitioning to `'sent'` is stamped `deliveredByProcess = processEpoch` at that moment
  (preserves AT-016.07: everything pending before the restart is completed, and stamped, by
  the post-restart process).
- **Per event** with at least one attempted delivery in the pass: `attempts += 1`; state =
  all its deliveries `'sent'` ? `'sent'` : `'retrying'` (first pass from `'pending'` may go
  straight to `'sent'`).
- **`passes` bounds the worker;** default runs to quiescence (every delivery `'sent'`),
  capped at a small constant (`MAX_DRAIN_PASSES = 8`) so a hypothetical always-rejecting
  queue cannot loop forever — no current test forces more than one consecutive failure per
  identity.
- The emit/rollback path (`emitKnown`, the fault point, the one-rollback-unit ordering) is
  UNTOUCHED. Deliveries are still created `'pending'` before any drain, which is what
  AT-016.07's "nothing delivered before the restart" precondition reads.

## Decision D5 — declarations and their meaning

`tests/at/expected/req-016.json`, loop tier, in the same change as the code:

- `AT-016.11` moves `red → green`.
- `AT-016.01` stays red; its capability list becomes `["H3 static provider scan"]` — the
  exact remaining thrown set, in the seam's order.

**What AT-016.11's green claims, precisely:** the loop-tier reference stand-in, driven
through the harness's provider simulator, honours acceptance-before-sent, real retry, and
lost-ack idempotency — i.e. the test machinery, the oracles and the vendor seam run end to
end and discriminate. It claims NOTHING about the product: `sut.notifications` is a declared
stand-in (`standInCapability`), and the registry bars every stand-in from the tiers that
gate. The static scan stays pending because it is a real-source capability: at loop tier
there is no product source to scan, and scanning the fixture would be the self-report the
contract's own comment forbids (H3's standing ruling; lands with real product source, not
with this item).

## Decision D6 — conformance tests (the load-bearing wall)

New `tests/at/harness/vendors.selftest.ts` (picked up by `at:selftest`'s
`harness/**/*.selftest.ts` include), mirroring the H3-wall style in
`conformance.selftest.ts`:

1. Forced rejections are consumed in order and exhausted (reject once → next send accepted).
2. `acceptButLoseAck` physically accepts: the attempt appears in BOTH traces with outcome
   `'ack_lost'`, and the port returns `'no_ack'`.
3. Idempotency: a replay of an accepted identity appears in `attempts()` and never in
   `accepted()`; `accepted()` holds the identity exactly once; the replay returns
   `'accepted'`; a replay does NOT consume a queued forced outcome.
4. A REJECTED identity is not idempotency-protected: its retry consumes the queue /
   default-accepts and can succeed (outcomes `['rejected', 'accepted']`, both traces correct).
5. Count guards refuse `0`, negative and non-integer counts, for both arming methods.
6. Traces are copies: mutating a returned array leaves the sim's record intact.
7. Through the REAL harness (`createHarness` for req-016): `h.vendors.email` is the live sim
   (arming + a drain produces the armed outcome), `stubbedCapabilities()` contains
   `'vendors.email'` at loop tier, and the `static` seam still throws `CapabilityPending`
   naming exactly `'H3 static provider scan'`.

Plus two **falsification runs** recorded as proof artifacts (the AI4DEV-19 pattern —
temporary mutation, capture the red, restore):

- **F1 — sent-without-confirmation:** with the fixture marking email deliveries sent without
  consulting the port, AT-016.11 must go red (its (a) clause: "the provider was never asked
  to send" / unconfirmed-marked-sent). Proves the suite discriminates against the do-nothing
  wiring.
- **F2 — dedupe removed:** with the sim appending replays to `accepted()`, AT-016.11 must go
  red at (c) ("accepted the same recipient-channel pair twice"). Proves the no-duplicate
  oracle has teeth.

Captured to `loop/items/AI4DEV-21/proof-f1.txt` / `proof-f2.txt` from runs against the
mutated tree, then the mutation reverted; the final code run to green is captured after the
final code commit (capture-only-after-the-final-commit, AI4DEV-19's process rule).

## Facts this plan asserts (for Gate 1 to verify in the tree)

1. `contracts.ts` already defines the whole test-facing vendor contract; the suite drives
   only `rejectNext`, `acceptButLoseAck`, `attempts`, `accepted` (grep: `vendors` appears in
   suites only in `a-emitter-and-taxonomy.test.ts` (1 use) and `c-reliability-guard.test.ts`
   (4 uses)).
2. `_contract.ts` already declares `drainDeliveries(opts?: { passes?: number })`; only
   AT-016.11 passes `{ passes: 1 }`.
3. Only two ids are declared red at loop tier, with exactly the capability lists quoted
   above; `--expect` matches a `capability-pending` red's WHOLE first line rebuilt from the
   declaration, so the seam's thrown name-set and the declaration must agree exactly,
   including order (`expected.ts: declaredDetail/detailMatches`).
4. `access.key_issued` and `access.key_revoked` are volunteer-only, channels
   `['email','inapp']` (taxonomy) — so 016.11(a) sees exactly ONE email attempt after one
   pass, and (c)'s expected pair set is volunteer×{email,inapp}.
5. Every taxonomy row of class money/deadline/blocker/completion/decision defaults to
   `['email']` when channels are null (`channelsFor`), so the provider path is exercised by
   the whole capture in `d-taxonomy-evidence.test.ts` with the sim in default-accept — one
   pass sends everything, existing greens keep their meaning.
6. `registry.ts` builds a FRESH harness per `open()` and refuses stubbed capabilities above
   loop tier; teardown is per-test. So sim state cannot leak across ids.
7. CI's required check `verify` runs: typecheck (incl. typeprobes), `at:selftest`,
   `at:check` per suite, `at:verify … --tier loop --expect` per declared requirement.

## Steps

1. **Baseline** (executor): `bun install --frozen-lockfile`; `bun run typecheck`;
   `bun run at:selftest`; `bun run at:verify req-016 --tier loop --expect` → capture to
   `loop/items/AI4DEV-21/baseline-*.txt`. Verify: expect-gate exits 0 with the two declared
   reds.
2. **D1's verification sweep** (executor): the grep sweep above; report findings before
   writing code. Verify: no executable consumer of a deferred vendor, or the deferral is
   void for that vendor and the executor stops and reports to the item agent.
3. **Implement** D2 (vendors.ts + guards) → D3 (index.ts wiring + static name list) → D4
   (fixture drain mechanics) → D5 (declaration edit). Verify per step: `bun run typecheck`.
4. **Conformance + falsification** (D6). Verify: `bun run at:selftest` green;
   `bun run at:verify req-016 --tier loop --expect` green (11 green / 1 red as declared);
   `bun run at:check req-016` green; proof files captured.
5. **Docs**: `contracts.ts` header comment updated (email landed, rest arrive with their
   consuming suites); PR body carries the deferral section and the green's meaning.
6. **Commit discipline**: implementation commit(s), then proofs commit; push at every phase
   boundary; PR opened with `gh pr merge --auto --merge` queued; Linear comment with the D1
   disposition posted when the PR opens.

## Expected verification state per AT id (req-016, loop tier, at the head this plan produces)

| id | expected | why |
|---|---|---|
| AT-016.01 | RED — `capability-pending: ["H3 static provider scan"]` | static scan is a real-source capability, not this item's; list shrinks because the email sim landed |
| AT-016.02 | GREEN (unchanged) | taxonomy registration untouched |
| AT-016.03 | GREEN (unchanged) | capture fires all rows; provider default-accepts; one quiescent drain sends everything |
| AT-016.04 | GREEN (unchanged) | projection of the same capture |
| AT-016.05 | GREEN (unchanged) | projection; email deliveries exist exactly as before |
| AT-016.06 | GREEN (unchanged) | documented defaults untouched |
| AT-016.07 | GREEN (unchanged meaning) | deliveries still created pending; stamp-on-sent preserves "post-restart process completed the pending work" |
| AT-016.08 | GREEN (unchanged) | thread.comment is inapp-only; provider not involved |
| AT-016.09 | GREEN (unchanged) | emit/rollback path untouched; control + fault worlds unchanged |
| AT-016.10 | GREEN (unchanged) | recipient resolution untouched |
| AT-016.11 | **GREEN — the item's deliverable** | provider acceptance / retry / lost-ack idempotency against the harness sim |
| AT-016.12 | GREEN (unchanged) | projection of the capture |

Harness selftests: all green, including the new vendors wall. Typecheck: both projects green;
typeprobes still fail-to-compile per file. CI `verify`: green on the PR head — the merge
condition, pinned by SHA in the merge ruling.

## Gates for this item

- **Gate 1**: codex sol @ max, in this worktree, detached, read-only — refute this plan:
  decisions stated as settled that are not, facts wrong against the tree, constraints
  contradicting the skill, scope forcing mid-flight redesign, steps that cannot be executed,
  and oracles too weak for what they claim (in particular: does D2's idempotency semantics
  actually prove 016.11(c), and does D1's deferral survive its own verification condition).
- **Implementation**: opus executor, same worktree/branch, reports to THIS agent.
- **Gate 2**: terra @ max + Kimi k3 @ high in parallel on the diff, in-worktree, detached;
  one critique round each, bounded fix cycles, resumed (pinned) for confirmation.
- **Pre-merge audit**: luna @ max, workspace-write, detached; the platform-worktree vitest
  sandbox boundary is known — a `Cannot read directory` walk failure reads as
  COULD-NOT-VERIFY-IN-SANDBOX and the execution evidence comes from the PR's CI run.
- **Reflection on `/work`** before the merge decision; fixes ride along.
- **Merge**: only with the required `verify` check green on the exact pinned head.
