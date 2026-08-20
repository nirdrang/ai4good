# DeepSeek V4 Pro — executor trial against the Opus baseline, 2026-08-13

Founder request: test V4 Pro as an executor writing code, compared with Opus, which does that job
today.

## Why this subject and not the world-seam replay

The first plan was to replay the 2026-08-09 world-invention-seam task, where flash produced a
false green and Opus did not. That plan was abandoned before any spend, for a reason found while
setting it up: `tests/at/harness/registry.ts:238-255` now documents that seam as **known-open by
design and impossible to close in the type system** — the widened type and the derived one are
assignable in both directions, so no annotation can tell them apart. The attack is committed as a
type probe, and closing it properly is filed as its own item. An executor "closing" it would be
producing a false green by construction, and the original brief and exploit were lost with the
08-09 scratch worktree. The founder chose the item replay instead.

## Method

Subject: **AI4DEV-65 (who signed: name, title, authority)**, replayed from its true base commit
`72aa3e4`. The base tree carries NO AI4DEV-65 material — `git ls-tree` of the item directory at
that commit is empty — so nothing leaked the answer.

Reference: Opus's shipped code for the identical plan, commit `e888d82`, on main.

Brief: the item's amended plan verbatim, plus an environment statement and three required checks.

Baseline proven green BY ME before handover, so any red afterwards is attributable:
typecheck clean · `at:check req-001` 37/37 in bijection · `at:selftest` 344 passed.

Cage: `executor-v4pro.md`, write/edit/patch/bash allowed, `loop/` off limits, no webfetch,
no subagents. Pins `opencode-go/deepseek-v4-pro`, `--variant max`.

**Disclosed limitation, and it is the big one.** No database was reachable. The migration and the
integration tier were written but never executed, by either the trial or my verification. Opus had
live slots. This is the one place the comparison is not like-for-like.

## What it produced

93 steps, 18.3 minutes, **$0.206**. Tools: read×32, edit×36, bash×20, grep×10, glob×4, write×4.

**Exactly the same 13 files as Opus, no more and no fewer.** 1,003 added lines against Opus's
1,070.

## Verification — every check re-run by me, not taken from its report

| check | its claim | my independent run |
|---|---|---|
| `bun tests/at/typecheck.ts` | exit 0, both configs clean | **exit 0, confirmed** |
| `bun tests/at/harness/check.ts req-001` | 37 P0 in bijection | **exit 0, confirmed** |
| `at:selftest` | 13 files, 344 tests | **exit 0, 344 passed, confirmed** |
| `at:verify req-001 --tier loop --expect` | 16 green, 21 red, 0 missing, exact match | **exit 0, confirmed exactly** |

Baseline was 13 green. The run is 16 green. **The three new ids (AT-001.19, .20, .39) genuinely
went green at loop tier and the expectation file matches exactly. There is no false green in
anything it claimed.**

## Where it beat Opus

**Plan fidelity on the integration bodies.** The plan (lines 113, 119, 124, 132) specifies the
AT-001.19 and AT-001.39 bodies live in `c-membership-and-acknowledgment.test.ts` as
`{ default, integration }` pairs, using `registerConfirmAndSignIn` imported from `_integration.ts`.
V4 Pro did exactly that, and correctly reported that the helper was not exported — an implicit
ripple the plan never named — rather than silently restructuring. Opus instead created
`at00119`/`at00139` inside `_integration.ts`, which is where the 151-versus-65 line gap in that
file comes from. **Caveat I cannot close: the plan text on main may have been amended after Opus
executed, so this may be a plan that moved rather than an executor that deviated.**

## Reporting discipline — the thing that separated it from flash

- It ran **two checks nobody asked for**: `req-016` at loop tier and `at:check req-016`, as a
  regression guard on the untouched manifest. Both green.
- Its UNVERIFIED section is precise and correct: the integration tier, the migration replay, the
  edge function's runtime behaviour, and AT-001.19's GitHub clause — each with the exact command
  or probe that would settle it.
- It reported **four disagreements with the plan instead of silently deciding**, including a real
  self-contradiction: plan step 11 lists AT-001.04's request among those that "may omit" the
  fields, but that is the same byte-identical object that must SUCCEED after the GitHub link. It
  implemented the plan's governing clause, said so, and named the evidence.
- It obeyed the `loop/` scope limit, and then reported that plan step 12 is therefore incomplete
  by one artifact rather than pretending the plan was fully done.

## Recorded defects against Opus's code, for comparison

Gate 2 on Opus's code found two, both from terra, with flash clean: the database write path
accepts any nonblank authority attestation (accepted, fixed differently — the boundary was stated,
not moved), and the POSIX `\s` class does not guarantee JavaScript `trim()`'s blank definition for
U+FEFF (verify-first). V4 Pro's code carries **both of the same residuals**, because both follow
from decisions the plan makes. That is parity at the same stage, not a defect against it. Its code
has had no review at all, so its true defect count is unknown and is certainly not zero.

## Verdict

**On a well-specified plan, V4 Pro executed at a standard I cannot distinguish from Opus's, at
about 1/40th of the cost, and its reporting discipline was better than the average.**

**But this trial does not test the thing that disqualified flash.** Flash also solved an easy,
well-specified executor task perfectly — byte-identical to the shipped reference. Its failure came
on a HARD, under-specified problem, where it shipped a confident false green. This item arrived
with a 17,900-byte amended plan that had already been through a gate-1 review and named its
decisions A–H. That is the easy half of the executor job.

So the honest reading is: **V4 Pro clears the bar flash also cleared, more convincingly and with
better reporting — and the bar that actually separated flash from Opus was not tested here.**

## ADDENDUM — the integration tier was run after all, and V4 Pro FAILS it

**My "no database is reachable" statement was wrong.** Slot 2 was up, healthy and unreserved the
whole time — gateway HTTP 200 on `127.0.0.1:56321`, Postgres on `56322`. Only slot 1 is broken.
So the executor was handicapped by my instruction, not by the environment.

Re-run on slot 2, same command both sides:

| | loop tier | integration tier |
|---|---|---|
| **Opus (shipped, `e888d82`)** | green | **11 green, 26 red, exact match, exit 0** |
| **V4 Pro** | green, exact match | **10 green, 27 red, 3 deviations, exit 1** |

`AT-001.19` and `AT-001.20` pass at integration for both. **`AT-001.39` passes for Opus and FAILS
for V4 Pro:** `Error: the live signup for a fresh address answered 400`.

**Root cause, found and confirmed.** V4 Pro's AT-001.39 integration branch builds its test address
as ``w.email(`omission-${variant.label}`)``, where `variant.label` is the human-readable
`'name omitted'` / `'title omitted'` / `'attestation omitted'` — **each containing a space**. The
resulting address is invalid, the deployed signup answers 400, and `_live.ts:317` throws before any
assertion runs. Opus's data carries a separate `slug: 'name' | 'title' | 'attestation'` field for
address construction and uses the readable text only in assertions.

**The loop tier cannot see this.** The fixture does not validate address shape, so the same code is
green at loop and fatal at integration. This is precisely the defect class a database exists to
catch.

**Two things this does NOT change.** First, it is **not a false green** — V4 Pro explicitly listed
the AT-001.19/.39/.20 integration bodies as UNVERIFIED and named the exact command that would
settle them. It was right, and the unverified thing was indeed broken. That is the honest failure
mode, and it is the opposite of flash's. Second, **its migration works**: the run reports
"3 migrations expected, 3 applied", and AT-001.19 going green at integration proves its 345-line
migration, its new columns and its recreated 12-argument function all work end to end — none of
which it was able to execute itself.

**What it does change: on this item, V4 Pro's code would have failed the gate, and Opus's did
not.** One concrete defect, one line, invisible without a database.

## What would settle it

1. **The same trial with a database.** The migration, the edge function and the whole integration
   tier — the majority of this item's risk — are unexecuted for both the trial and my grading.
2. **A hard, under-specified task**, which is the discriminator flash failed. It needs an oracle
   the executor did not write.
3. **A blind review of V4 Pro's diff by terra**, to find what my grading did not look for.

Until at least 1 and 2 are done, this is one sample on the easy half of the job, and it should not
carry a seating ruling on its own.
