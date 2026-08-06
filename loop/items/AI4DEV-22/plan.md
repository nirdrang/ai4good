# AI4DEV-22 (first requirement green end to end) — PLAN

**Sitting:** PLAN, sitting 1. **Orchestrator model: opus, via the `orchestrator-opus` fallback
definition — fable is out of credit.** That is a different agent type at effort `max`, not an opus
override on the fable definition. Every ruling below is an opus ruling and should be read as such
evidence, not as a fable run.

## 1. Attribution, derived

cwd → worktree `.claude/worktrees/agent-a3dadbeb34877543c` → branch
`nirdrang/ai4dev-22-h7-proving-ground-req-016-green-end-to-end-at-integration` → AI4DEV-22
(first requirement green end to end) → `parent` = AI4DEV-3 (the acceptance-test harness), project
"W0 Bring-up". AI4DEV-3 has no parent: this chain ends on a bring-up root, which is what marks the
work as foundation. No requirement above it, no evidence gate, closes on a merged pull request.

Cross-checked against the board: status In Progress, parent AI4DEV-3, project W0 Bring-up, related
to the local-database item. Confirmed, not assumed.

## 2. What the item says, and what the tree says

The board text names five blockers — the four capability slices and the local database — and says
the suite "currently runs red pending the capability slices". Every one of the five is Done with a
merged pull request. So on the item's own account nothing should stand in the way.

The tree says otherwise, and the difference is the whole of this plan.

**Measured state, by pointer:**

| fact | where |
|---|---|
| the REQ-016 suite is 12 tests, 4 files | `tests/at/suites/req-016/{a,b,c,d}-*.test.ts` |
| at loop tier it reports 11 green, 1 red | `tests/at/expected/req-016.json` |
| the only declared red is AT-016.01, waiting on a static provider scan | same file |
| the system under test is a **stand-in written from the suite's own specification**, not the product | `tests/at/suites/req-016/_fixture.ts` lines 1–19 |
| the product has no notification code | `src/` — Lovable scaffold and shadcn components only |
| the database has no schema | `supabase/migrations/` — `.gitkeep` and a README |
| there are no edge functions | no `supabase/functions/` directory |
| above `loop`, the harness refuses **any** stand-in | `tests/at/harness/registry.ts` line 618–620 |
| clock, fixture worlds, email vendor and every `sut.*` are marked stand-in **unconditionally, at every tier** | `tests/at/harness/index.ts` lines 118, 129, 142, 153–155 |
| the integration tier's database plumbing is fully written but has never run | `tests/at/harness/runner.ts` lines 1044–1112 |
| nothing anywhere reads the database coordinates the runner establishes | grep `AT_SUPABASE_` — only the four assignments in `runner.ts` |
| `--wired` refuses: the screen driver does not exist | `tests/at/harness/runner.ts` lines 970–977 |
| the stable-handle convention the screen driver needs is a **draft awaiting founder ratification** | `loop/bringup/testid-convention-draft.md` line 3 |

## 3. The finding — this item's stated goal is not reachable inside this item

"Green at the integration tier, not against stubs" is, by the harness's own construction, the
statement "`stubbedCapabilities()` is empty". Four names are on that list today and all four are
hard-coded stand-ins regardless of tier. Making them real means, in order:

- **`sut.notifications`** — REQ-016's actual notification subsystem: the emitter as sole writer, the
  event taxonomy (about forty-five rows), delivery rows per recipient-channel pair, an outbox worker
  with a restartable process identity, provider-acceptance semantics with an idempotent retry, an
  ops-item path, and a fault point between the state transition and the event write.
- **`fixtures.worlds`** — worlds materialised in the real database, which needs a schema, which does
  not exist.
- **`clock.controlled`** — a clock the *product* reads, which needs product code to read it.
- **`vendors.email`** — the one capability the harness calls "a stand-in by nature"
  (`index.ts` line 139); what stands at that seam at integration tier is left to a later slice and
  has never been decided.

All of that is REQ-016's own product work. It is decomposed already, into seven leaves, and the
done contract of that decomposition is word for word the sentence this item is trying to satisfy:
"All 12 P0 of AT-REQ-016 green at integration tier" (`loop/decomp/req-016.md` lines 9, 14–28).
Building it here would put a product requirement's implementation inside a bring-up item and leave
its own leaves claiming work done somewhere else.

It is also larger than REQ-016. `loop/decomp/req-016.md` line 27 makes the full guarded matrix that
AT-016.09 walks depend on producers owned by three *other* requirements — the money ledger, the
access-key issue/revoke path, and project completion — none of which is built. AT-016.09 fires
eleven guarded rows and asserts a control run commits both sides for every one of them.

And it sits outside the harness item's own written scope boundary:
`loop/bringup/AI4DEV-3-at-harness.md` line 166–172 — "It builds the ENGINE + capabilities, not the
~658 per-requirement tests." H7's own line in that same file (line 187) says "translate REQ-016's
12 P0 end-to-end at integration tier; green", and those two sentences cannot both be honoured. The
tier refuses stand-ins on purpose; the boundary excludes the only thing that would satisfy it.

**Ruling: this is real scope growth and a contradiction inside ratified text. Both are the
founder's, and both go up. I am not narrowing the item and I am not quietly building the product.**

### 3a. The second half of the item is blocked too, and separately

The board text also claims this item satisfies done-criterion 5 — one authored test body running on
both surfaces from one source. That needs four things: a screen driver in the harness, static
screens carrying stable handles, at least one REQ-016 test marked `surface: 'ui'`, and `--wired`
selection actually implemented. The static screens exist (twenty files under `design/screens/`) but
carry no handles, and the convention that would put them there is a draft awaiting the founder
(`loop/bringup/testid-convention-draft.md` line 3, and its own retrofit note at line 50).

There is a sharper problem underneath. Done-criterion 5 exists to prove the wired pass is a
**re-run and not a rewrite**. None of the twelve bodies reads anything a screen could show: they
call `sut.taxonomy()`, `sut.senders()`, `sut.runtimeRegistrationSurface()`, `sut.drainDeliveries()`
and read delivery rows by role and recipient id. To drive one of them through a screen the body
would have to be rewritten — which falsifies the criterion instead of demonstrating it. Which ids
are screen-observable, and through what seam, is undesigned.

**Ruling: this half also goes to the founder, as a second and separable question.** It is not
merely "not yet built"; it is not yet designed, and its enabling convention is unratified.

## 4. What I rule in scope, and why it is worth doing before the ruling arrives

One thing in this item is unambiguously the harness's, unambiguously unbuilt, and needed whichever
way the founder rules: **nobody has ever run the integration tier.**

The local-database item merged under the title "local Supabase stack scaffolding + integration-tier
wiring (**unproven pending Docker**)". Docker now answers. About four hundred lines of `runner.ts` —
the machine-wide lock and its takeover race, the proof that the stack answering is the local one,
the two readiness gates, the reset, the proof that the reset replayed the migration set, and the
environment allowlist that keeps a developer's secrets out of a test child — have never executed
once. That code is the gate every requirement will eventually close through.

Running it is exactly what this item is named for: *the evidence that the harness actually works*.
It converts a merged claim into a measurement, it will find defects in never-executed code, and it
produces the evidence the founder needs in order to rule on section 3.

**It also stops where the founder's ruling begins.** I am deliberately not building the
integration-tier provenance seam — the mechanism by which a real capability could ever report
itself real. That mechanism has no consumer until the product exists, and this tree already carries
a founder ruling against exactly that move: vendor stand-ins are built with the first suite that
consumes them, never ahead of one, "because a sim contract authored without its consuming test is a
guess that gets rewritten when the real suite arrives" (`loop/bringup/AI4DEV-3-at-harness.md`
lines 53–64, founder 2026-08-04). The same reasoning binds here.

## 5. Decisions taken

- **D1. Measurement before machinery.** Nothing is built until the integration tier has been run
  once and its output recorded. A plan that guessed what it does would be the declared-versus-real
  drift this way of work exists to delete.
- **D2. The scope question goes up, unnarrowed.** Recorded in `PHASE-STATE.md` for the conductor to
  raise. I do not decide it and I do not work around it.
- **D3. Blast radius.** Steps 1–5 may touch only `tests/at/harness/runner.ts`,
  `tests/at/harness/expected.ts` and its selftest, `tests/at/expected/req-016.json`,
  `supabase/config.toml`, and files under `loop/items/AI4DEV-22/` and `loop/bringup/`. **No product
  code, no migrations, no test body, no fixture adapter.** A defect that cannot be fixed inside that
  set is reported, not fixed.
- **D4. Secrets never land in the tree.** Every transcript committed is redacted before it is
  written. The stack issues real JWTs and a Postgres connection string; `redact()` in
  `runner.ts` lines 195–201 is the shape to follow, and a committed transcript is checked by eye for
  `eyJ`, `postgresql://…@`, and any run of forty or more identifier characters before it is staged.
- **D5. One slice.** The planned diff is small — transcripts, at most a bounded `expected.ts`
  extension, small `runner.ts` repairs, one boundary note. One code gate, not several.
- **D7. A stopped service is never silenced by widening the pattern that ignores stopped services.**
  The likely first refusal (S2) is the crashed edge-runtime container. `DISABLED_SERVICES` exists to
  ignore services the *configuration* turned off — imgproxy and the pooler, both `enabled = false`.
  The edge runtime is `enabled = true` and has exited 255, so adding it to that pattern would make
  the runner state a false reason for ignoring it, which is the declared-versus-real drift this
  whole tree is built against. Two honest repairs are available and the executor picks between them
  **on evidence, in writing**: turn the edge runtime off in `config.toml` if the tree genuinely has
  nothing for it to serve (there is no `supabase/functions/` directory), which makes the CLI's
  "stopped" report true and the existing pattern correct once it is extended to a *configured-off*
  service; or find and fix the crash if the runtime is meant to be up. Whichever is chosen, the
  reason is recorded beside the change and the container's exit status is quoted.
- **D6. The judge credential is not this item's to decide, and that is a reading of the recorded
  text rather than a deferral of it.** `oracles.ts` lines 798–807 defers "how a credential should
  reach a child at integration tier" to "the slice that makes the integration tier real, taken with
  its first consuming run". This is that slice — but REQ-016 never calls `judge()` (grep: no use of
  `h.oracles` anywhere under `tests/at/suites/`), and the live transport reads the key lazily inside
  `send()`, so an integration-tier run of this suite neither needs a credential nor fails without
  one. The trigger the recorded text names is a *consuming run*, and this item supplies none.
  **Gate 1 should attack this reading specifically.**

## 6. Steps

Each step's done-criterion is the thing that is checked; a step is not done because it was attempted.

### S1 — Record what is already running; do not restart it

**The stack is already up.** Measured during this sitting: twelve `supabase_*_poancmeitlmxejofwzuu`
containers, up about three hours, against the `project_id` in `supabase/config.toml`. So `db:start`
is not the first step — establishing what is running, and in what condition, is.

Three container-level facts were measured and matter (see S2):

- `supabase_edge_runtime_…` — **Exited (255)**, and `supabase status` lists it among "Stopped
  services". `config.toml` has `[edge_runtime] enabled = true`, so this is a crash, not a service
  the configuration turned off. There are no edge functions in the tree for it to serve.
- `supabase_vector_…` — **Restarting**, i.e. in a crash loop at the time of measurement.
- everything else — up, and healthy where it reports health.

**Done when:** a **redacted** transcript at `loop/items/AI4DEV-22/stack-state.txt` records the
container list with status, the API and database host/port taken from `supabase status`, and whether
the stack was already running or had to be started. Never a key, never a connection string, never
the JWT secret.

**Notes for the executor.** The stack's identity is the `project_id` in `supabase/config.toml`,
which every worktree of this repository shares, so these containers are machine-wide rather than
this worktree's. Do not stop or restart the stack to tidy it: another session may be using it, and
the state above is evidence. A first bring-up on a cold machine pulls several images and is slow;
that is not a hang.

### S2 — Run the integration tier once, and record exactly where it stops

`bun run at:verify req-016 --tier integration`, full output captured.

**My prediction, written down before the run so that it can be wrong. It changed once already
during this sitting, which is the argument for writing predictions down at all.** My first
expectation was that the infrastructure sequence would complete and every id would then red on the
stubbed-capability assertion. The container measurement in S1 says otherwise:

`readStackStatus()` (`runner.ts` lines 493–498) treats any service in the CLI's "Stopped services"
list as fatal unless it matches `DISABLED_SERVICES`, which is `/^supabase_(imgproxy|pooler)_/`
(line 62) — and `edge_runtime` is not in that pattern. The CLI is reporting
`supabase_edge_runtime_…` as stopped right now. **So I expect the run to refuse at stage (2) with
"the stack reports stopped services: supabase_edge_runtime_… — start them before running the
suite", as an infrastructure failure (exit 3), having taken the lock, run no reset and run no
tests.** Nothing downstream of that — readiness, reset, the migration proof, the environment
allowlist, vitest — gets exercised at all on the first attempt.

**Done when:** a redacted transcript is committed at
`loop/items/AI4DEV-22/integration-tier-first-run.txt`, and a short written comparison states which
parts of that prediction held and which did not. **Every difference is named, including differences
that look like improvements.** If the run stops earlier or later than predicted, the stage it
stopped at and the exact message are the result, and that is a successful S2.

**Then keep going.** S2 is not finished at the first refusal: each infrastructure stage that has
never run is a separate measurement, so S3 repairs the blocker and S2's transcript is extended until
the run reaches vitest or stops somewhere that D3 forbids fixing. The two steps interleave, and the
transcript records every attempt in order.

**Three more candidate refusals, ahead of the run, so they are recognised rather than debugged
from scratch:**

1. **The local-key issuer check.** `localStackProblems` (`runner.ts` lines 554–566) requires the
   anon and service-role JWTs to carry `iss === 'supabase-demo'`. This CLI is 2.110.0 and also
   issues new-style `sb_publishable_…` / `sb_secret_…` keys alongside the legacy JWTs. If the JWT
   issuer has changed, the runner refuses and the message names the failed check without printing
   the value. **Decode the token's issuer claim locally and report the claim name only — never the
   token.**
2. **The missing seed file.** `config.toml` line 71 sets `[db.seed] sql_paths = ["./seed.sql"]` and
   `supabase/seed.sql` does not exist. `db reset` may warn or fail on it; that is stage (4).
3. **`supabase_vector` flapping** may make readiness (stage 3) or the reset intermittent. If a stage
   passes on one attempt and fails on the next, say so — an intermittent infrastructure stage is a
   finding, not something to retry until it is quiet.

### S3 — Repair the infrastructure defects S2 surfaces, and only those

**Done when:** `bun run at:verify req-016 --tier integration` reaches the vitest spawn and prints a
per-id report, and every remaining red is an assertion inside a test rather than an infrastructure
refusal (exit 3). Each repair is one commit citing the item, naming the defect and the evidence line
in the S2 transcript that showed it.

**Bounded, hard:** only the files in D3. A defect that would need a change outside them — including
anything in the product tree — stops the step and is reported to me. Three attempts at green inside
one executor invocation, then report.

### S4 — Declare the integration tier's honest state, if it can be declared

Add an `integration` block to `tests/at/expected/req-016.json` recording what S2/S3 measured, then
`bun run at:verify req-016 --tier integration --expect`.

**Verify first, before writing anything.** I expect this to be impossible as the declaration format
stands: `tests/at/expected/README.md` lines 46–77 permit exactly two red kinds, `capability-pending`
and `pending`, and the stubbed-capability failure is a plain `expect().toEqual([])` assertion that
matches neither — so the id is undeclarable and `--expect` fails closed by design. **The executor
must reproduce that refusal and quote its message before proposing any change.** If it turns out to
be declarable, declare it and this step is a two-line change.

**If the refusal is real,** the minimal honest extension is one new red kind carrying the assertion's
first line, added to `expected.ts` with a case in `expected.selftest.ts`. **Cap: one kind, no
redesign of the declaration format**, and if it cannot be done in that budget the step stops and
reports.

**Done when:** either `--expect` at integration tier exits 0 against a committed declaration, or a
written finding in `loop/items/AI4DEV-22/` states why it cannot, quoting the refusal.

### S5 — Write the boundary into the tree, where the next person will meet it

A note at `loop/bringup/integration-tier-boundary.md`: what an integration-tier run requires, what
exists, what stands between the REQ-016 suite and green, and the measurement from S2 that
establishes it. Every claim carries a `file:line` pointer. Linked from
`loop/bringup/AI4DEV-3-at-harness.md` beside H7's line so it cannot be missed.

**Done when:** the file exists, every factual claim in it is a pointer rather than a recollection,
and it names in words — not by board id, which is a habit worth keeping even in tree files — the
three requirements whose producers AT-016.09's guarded matrix depends on.

### S6 — Not planned

Everything in section 3 waits on the founder. No step here anticipates an answer.

## 7. Expected verification state, per acceptance-test id

**Loop tier — must be unchanged by this item.** CI runs `bun run at:verify req-016 --tier loop
--expect` on every pull request (`.github/workflows/ci.yml` line 178), so any drift here fails the
build, which is the correct direction.

| id | loop tier, expected at merge | why |
|---|---|---|
| AT-016.01 | red — `capability-pending`, "H3 static provider scan" | unchanged; the scan is not built here |
| AT-016.02 … AT-016.12 (11 ids) | green | unchanged |

**Integration tier — the outcome S2 measures.** Written as my expectation, to be replaced by the
measurement. There are two states here and they must not be conflated:

| state | integration tier, expected | why |
|---|---|---|
| **first attempt, before any repair** | **no per-id report at all** — exit 3, "INFRASTRUCTURE", no tests run | the crashed edge-runtime container is reported stopped and `DISABLED_SERVICES` does not cover it (`runner.ts` lines 62, 493–498). There is no id-level outcome because vitest is never spawned |
| **after S3 clears the infrastructure stages** | all twelve red, identically | `stubbedCapabilities()` returns four names and the tier refuses any stand-in (`registry.ts` lines 618–620). The refusal is inside `open()`, before any assertion of a test's own, so every id fails the same way |

**A run that never reached vitest is not "twelve reds".** An infrastructure refusal and a suite that
ran and failed are different facts, and only the second says anything about REQ-016. The transcript
and the declaration must both keep them apart.

**What a green on this item does and does not claim.** It claims the integration tier's
infrastructure works: the stack is proved local before anything destructive runs, the reset replays
the migration set, the environment allowlist holds, and the tier honestly refuses to grade a
stand-in. It claims **nothing** about REQ-016 the product, which does not exist, and it is not the
requirement's evidence gate.

## 8. Risks

- **Secret-shaped values escape reconnaissance easily.** During this sitting a read-only probe of the
  stack quoted the local `SECRET_KEY`, the S3 protocol secret and the JWT signing secret back in
  plain text. They are the CLI's own local development values on a loopback stack, not production
  credentials, and nothing was committed — but it happened on the first look, which is the whole
  argument for D4. **Redact before writing, and check the file by eye before staging it.**
- **The stack is shared, machine-wide.** Another session can be using these containers. The
  machine-wide lock (`runner.ts` lines 343–442) is what serialises destructive runs, and it has
  never executed. If S2 fails inside it, the lock file is under
  `%LOCALAPPDATA%\ai4good-build\at-locks` and its takeover logic is the most intricate code in the
  file.
- **`supabase db reset` on an empty migration set with a missing seed file** is an untested path
  here, and both halves of that are untested at once.
- **Windows process-tree kill** (`runner.ts` line 738) has never fired.
- **A flapping container makes stages intermittent.** `supabase_vector` was restarting when
  measured. An infrastructure stage that passes on one attempt and fails on the next is reported as
  intermittent, never retried until quiet.
- **Scope pressure.** The strongest risk in this item is the pull towards writing "just enough"
  notification code to turn the tier green. That is the whole product wearing a smaller hat, and
  D3's file list is what refuses it.

## 9. Rides along

Nothing yet. Machinery changed while working this item goes in this branch and is listed here.

## 10. Gate 1 — what I want attacked

The critique target is **this plan**, not the code. Item-specific direction, additive to the
standing reviewer base:

1. **Attack section 3 hardest.** Is there a reading under which REQ-016's twelve tests can go green
   at the integration tier without the product being implemented? Construct it if there is. Check
   the four stand-in names against `index.ts` and `registry.ts` yourself; if any of them can be made
   real without product code, name which and how. A refutation here changes the item completely.
2. **Attack D6.** Does an integration-tier run of this suite really need no judge credential? Trace
   `createOracleCapability` → `createLiveTransport` → `send` and say whether anything is read
   eagerly. Then say whether treating "first consuming run" as the trigger is a faithful reading of
   `oracles.ts` lines 798–807 or a quiet loosening of it.
3. **Attack S4's verify-first claim.** Is the stubbed-capability red really undeclarable under
   `expected.ts`? Read the loader, not the README.
4. **Attack the blast radius (D3).** Is `runner.ts` + `expected.ts` + `config.toml` genuinely
   sufficient for any defect S2 could plausibly surface, or does the file list guarantee the step
   stops short?
5. **Attack the prediction in S2.** Trace `main()` from `tier !== 'loop'` downwards against the
   measured container state (edge runtime exited 255 and reported stopped; vector restarting; no
   `supabase/functions/`; no migrations; no `supabase/seed.sql`). Where does the run actually stop,
   and what is the *next* stage that fails after that one is cleared? Name every stage that cannot
   pass as the tree stands, in order — the value of this critique is a list, not a verdict.
6. **Attack D7.** Is turning the edge runtime off in `config.toml` honest, or is it hiding a crash
   that matters? Is there a third repair I have not seen? And is `DISABLED_SERVICES` the right
   mechanism at all, given it decides from a name pattern rather than from what the configuration
   actually says?
7. **Attack section 3a.** Is there a REQ-016 id that is screen-observable through the existing
   `NotificationsSut` seam without rewriting its body? Name it if so.
8. **Attack the escalation itself.** Is this genuinely the founder's, or am I escalating something I
   should be deciding? Being over-cautious costs real time and is a defect too.
9. **Attack what is missing.** The steps here are measurement and repair. Is there in-scope harness
   work this plan has silently dropped — something AI4DEV-3's engine genuinely owes, buildable
   without REQ-016's product, that would be cheaper now than later?

Files to read: `tests/at/harness/{index,registry,runner,expected,oracles,capabilities,vendors}.ts`,
`tests/at/suites/req-016/*`, `tests/at/expected/{req-016.json,README.md}`,
`loop/bringup/AI4DEV-3-at-harness.md`, `loop/decomp/req-016.md`, `.github/workflows/ci.yml`,
`supabase/config.toml`, `supabase/migrations/README.md`.
