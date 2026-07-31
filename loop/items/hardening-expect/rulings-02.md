# ORCHESTRATOR RULINGS 02 — on the Gate 1 critique (codex `gpt-5.6-terra` @ `xhigh`)

Board item: **AI4DEV-25** (filed 2026-07-31; the earlier "no Linear id" deferral is closed).
These rulings amend the brief. Fold them into `plan.md` with the rest of your dispositions.

---

## R8 — G1-F1, D4a is still a placeholder. **UPHELD. Implement what the report actually exposes; the residual gap is named, not hidden.**

I probed the installed reporter rather than reasoning about it. Its real top-level fields are:
`numTotalTestSuites, numPassedTestSuites, numFailedTestSuites, numPendingTestSuites,
numTotalTests, numPassedTests, numFailedTests, numPendingTests, numTodoTests, snapshot,
startTime, success, testResults`.

**Codex's claim is correct: there is no unhandled-errors field.** So implement exactly this,
and no custom reporter (that is scope growth, and D7 stands):

Under `--expect`, in addition to the per-id comparison, ALL of these must hold:
1. `numFailedTests` equals the declared red count;
2. `numPassedTests` equals the declared green count;
3. `numTotalTests` equals green + red — no extra test ran;
4. `numPendingTests` and `numTodoTests` are both 0 — a skip must never hide inside a
   declared red;
5. a launch failure (`run.error`) always fails, regardless of declaration;
6. `success === true` while any red is declared is a failure — vitest should have reported
   those failures, so a clean run means the suite did not do what the declaration says.

Conditions 1–4 close codex's concrete scenario (an untagged failing `it()` alongside two
matching declared rows): the extra failure moves `numFailedTests` and `numTotalTests` off
their declared counts and the run fails.

**The residual gap, to be stated plainly in the README (W4) and filed:** an unhandled
rejection or a hook error that fails no test and is not serialised into the JSON report
remains invisible to `--expect`. It is partially covered elsewhere — AI4DEV-26 puts the raw
vitest output in front of CI — but it is a real hole in this gate. File a follow-up item for
a reporter-side envelope. Do not close it here.

## R9 — G1-F2, D3's substring rule is unsound. **UPHELD. D3 is REPLACED — and the fix stays inside D7.**

Codex is right and its example is decisive: `H3 fault injection` declared as a free
substring also matches `Error: H3 fault injection: fixture reset failed`, so a brand-new
harness defect would satisfy the declaration. A gate that cannot tell a pending capability
from a broken one is not a gate.

I do NOT accept the proposed remedy of emitting structured capability codes from
`capabilities.ts` — that is exactly the harness change D7 forbids, and it is not needed to
close the hole. **Replace D3 with a typed, exact-shape declaration:**

- A declared red is an OBJECT, not a bare string, carrying its `kind`.
- `kind: "capability-pending"` declares `capabilities: [...]`. The reported detail must
  match the CapabilityPending shape **exactly** — the literal prefix the harness prints,
  followed by exactly the declared capability names in the order and joining the harness
  uses. Not a substring: an exact match of the whole first line.
- `kind: "pending"` declares `phase` (e.g. `sut-missing`, `harness-missing`) for the
  `AtPending` shape, matched the same exact way.
- Any other detail shape is undeclarable — and therefore a failure. That is deliberate: a
  red we cannot describe exactly is a red we do not understand, and it must not pass.

Derive both shapes from what the runner actually prints today (you already captured all
twelve detail strings verbatim; use them). This kills codex's scenario outright: a
fixture-reset failure does not carry the CapabilityPending shape, so it cannot match.

**Known, accepted trade-off:** this couples declarations to the harness's message text. If
that text changes, declarations break loudly with a clear diff rather than silently
passing — the correct failure direction. Structured machine-readable capability codes
remain the better long-term answer; file that as a follow-up alongside R8's, to be done in
the slice that owns `capabilities.ts`.

## R10 — G1-F3, a manifest edit can launder a regression into an expected red. **Governance, not code. Out of scope here; document and file.**

Codex is right that no current-state checker can prove a red is *honest* — the manifest is
an author's claim about intent. The answer is review and traceability, not more machinery
inside this item: a declaration change is a reviewed diff like any other, it passes through
both gates, and a red that names a capability should point at the board item that will
deliver it.

For this item: say it plainly in the README — moving an id from `green` to `red` is a
governance act, and a reviewer should treat it with more suspicion than a code change.
File the stronger version (require every declared red to reference the board item that will
resolve it, and check that reference) as a follow-up.

## R11 — G1-F4/F5/F6/F7. **Yours to fold; my reading agrees they are inside the contract.**

`--wired` precedence vs D5, the PowerShell glob in the typecheck command, the two README
duties R4/R5 already mandate, and the type-only `import type { IdRow }`. Codex's point on
the last is well made: a type-only import is erased at compile time and creates no runtime
cycle, so prefer `Pick<IdRow, 'id' | 'status' | 'detail'>` over a hand-rolled duplicate that
can silently drift. Fold all four, record the dispositions, and if any turns out NOT to be
mechanical once you are in the code, escalate it rather than forcing it.

---

**Next:** fold R8–R11 plus your own dispositions into `plan.md`, commit, and STOP. The
orchestrator checkpoint reads the amended plan before you write a line of implementation.
