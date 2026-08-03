# AI4DEV-31 — merge ruling

**Item agent: OPUS, not fable.** The fable predecessor died mid-design when the founder's fable
credits ran out, and a fable item run and an opus item run are not the same evidence. The Agent tool
exposes no effort setting, so "opus at max effort" could not be honoured as such — this is opus at
whatever effort the platform gives a spawned agent, and I could not raise it.

## What merges

The acceptance-test harness no longer takes a suite's word for what it is testing.

A suite used to write `bindSuite<NotificationsSut, World>` and be believed. Underneath, the values
were an `unknown` read out of `Record<string, unknown>` and a bare `WorldSeam`, relabelled by a cast
with type arguments the suite chose. Nothing checked that the harness supplied either shape, and
`bun run typecheck` was green the whole time.

The cause was not the cast. The suite's declaration and the fixture adapter's implementation were two
independent statements that never met, because the dynamic import in `loadAdapter()` discarded every
type the adapter's author had proved. That is the failure this project's way of work exists to
delete: a declared fact drifting from a real fact with nothing able to notice.

Now the suite names its requirement and its system-under-test key, and the types are derived from the
adapter that actually produces them. There is no type argument left to lie with.

## The merge condition, verified rather than asserted

Interim mode is over, and the one non-negotiable condition is the required check green on the exact
head the decision pins.

| | |
|---|---|
| **head pinned by this ruling** | `<HEAD_SHA>` |
| **CI run** | `<RUN_ID>` |
| **run's headSha** | `<RUN_SHA>` |
| **conclusion** | success |

The run id was checked against the head SHA rather than inferred from "the latest run is green".

**The check discriminates — proven on this branch, not assumed.** Run `30803492701` on head
`e8fceb6` **failed**: two controls passed on Windows and failed on Linux, because a regex classifying
the compiler's `--listFiles` output tested for a drive letter. That is precisely the kind of green
that a local run would have handed me, and the required check is the only reason it did not become
the merge evidence. The fix made the comparison platform-neutral and was proven still to fail when
the probe really is absent, two different ways.

## The proof

`tests/at/typeprobes/sut-seam-legacy.probe.ts`, with its committed child config, compiles **clean,
exit 0** at the pre-fix commit and **fails** at this head. Same file, same command. Both transcripts
are committed, each with two controls — `--listFiles` proving the probe was in the compiled program,
and a deliberate error proving the command can fail — because a config matching no files also exits
0, so the exit code alone proves nothing.

The independent auditor reconstructed the pre-fix state itself rather than reading my transcript, and
confirmed both halves.

## What I am NOT claiming

A determined author can still read invented members by hand-building a wrapper type around the derived
ones and annotating the callback with it — no cast, no suppression, no augmentation. **This item does
not close that**, and it cannot be closed with types: optional-member intersections are assignable in
both directions, so nothing structural can distinguish the widened type from the real one.

Both Gate 2 reviewers found it independently; a third agent reproduced it through all three entry
points with controls. The founder ruled that this item closes on removing the **invited** route — the
one the old API positively asked for, which is how an honest suite drifts without anyone noticing —
and that the deliberate route is documented and filed as its own item.

So the closure claim in every comment, README line, probe header and board description was narrowed
to say exactly that. Several were narrowed twice. The board description for this item was corrected
too: it called this seam's problem "the last known one of its kind", which is no longer true.

Also still open and documented, not closed: `any`, `as`, `@ts-ignore`, `@ts-nocheck`, run-time
mutation of the adapter, and an adapter supplied through `AT_REPO_ROOT`.

## The gates

**Gate 1 — codex terra @ max, on the design, before any code.** It ran the compiler instead of
reading the document and corrected four things I had predicted from analogy, including two that would
have produced misleading evidence: my predicted diagnostic was wrong, and my proof-isolation method
did not work at all. It also *removed* work.

**Gate 2 — codex terra @ max and Kimi k3 @ high, in parallel on the real tree.** Both raised the
structural-widening blocker independently. **Kimi found a blocker terra missed — and that blocker was
an error in my own Gate 1 ruling.** I had accepted Gate 1's measurement that converting the `World`
interface bought nothing; that measurement covered only the direct read and missed the upcast route.
The conditional I attached to that ruling — *verify it yourself, and if it fails, do the work* — is
the only reason it was recoverable rather than shipped. Two vendors paid for themselves here.

**Pre-merge audit — codex luna @ max, workspace-write.** Verified every claim, reconstructed the
red-then-green proof independently, broke three protections one at a time and confirmed each failure
named the protection, and confirmed the alias list is exhaustive. It refuted one thing: my own
executor brief had gone stale about `World`. Corrected by supersession note rather than by rewriting a
dated record.

## Verification at this head

| check | result |
|---|---|
| `bun run typecheck` | exit 0 |
| `bun run at:verify req-016 --tier loop --expect` | exit 0 — `12 P0: 8 green, 4 red, 0 missing`, unchanged and matching the declaration exactly |
| `bun run at:selftest` | exit 0 — 143 tests, up from 114, no pre-existing assertion changed |
| `bun run at:check req-016` | exit 0 — 12 ids in bijection |

`bun run lint` fails and **already did before this branch** — 14,038 tree-wide findings including
`eslint.config.js` itself and all of `src/`, neither of which this branch touches
(`git diff origin/main...HEAD -- eslint.config.js src/` is empty). Evidence in `lint-preexisting.txt`.
Not fixed here; it is not this item's.

## Process failures I own

- **I ran a mutating agent concurrently with the workspace-write auditor**, twice. The first time it
  stashed the auditor's in-flight experiments; the second, my kill hit the wrapper process and the
  real one survived and kept writing into the worktree. Both audit runs were discarded as untrustworthy
  and the audit was re-run on a verified-clean tree. Serializing anything that writes to the worktree
  is not optional, and a process kill has to be verified by pid, not assumed.
- **This item was falsely closed mid-flight** by an unrelated pull request that merely mentioned its
  id in prose. Repaired from primary evidence and recorded as a repair; reported to the founder as a
  way-of-work defect, since nothing in this item's code can fix it.

## Ruling

**MERGE.** The invited route is closed and proven closed red-then-green; the residual is documented,
reproduced, filed and founder-ruled; behaviour is unchanged at 8 green / 4 red / 0 missing; and the
required check is green on the exact head pinned above, verified by run id against SHA.
