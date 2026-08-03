Verdict: the final acceptance documentation is honest, but the tree still contains a few overbroad or stale statements.

Accurate sites:

- `suite-adapters.ts:30–46`: explicitly lists structural reconstruction as open.
- `registry.ts:185–228`: explicitly retracts “UNSPELLABLE” and distinguishes invited routes from hand-built reconstruction.
- `_bind.ts:20–41`: accurately limits the closure to the invited binding route and includes the caveat.
- `contracts.ts:157–165`: accurately records that derived types can still be rebuilt by hand.
- `tests/at/README.md:48–84`: accurate closed/open split, including the exact `Omit` route.
- `proof-green.txt` §3/§3b and `verify-final.txt:212–231`: accurate final ruling.
- The known-open block in `sut-seam.probe.ts:203–265` is accurate and correctly kept as a comment, not executable probe code.
- `gate2-rulings.md` accurately records that the blocker remains open and is filed as AI4DEV-37.

Remaining overbroad wording:

1. `sut-seam.probe.ts:4–6` says:

   > “this file holds the new API and proves each way back in is shut.”

   That is too broad; the same file documents a compiling structural route. It should say the invited/new-API routes are shut.

2. `type-invention.selftest.ts:170` says:

   > `the sut/world seam cannot be invented by a suite`

   The test only proves the listed invited attacks fail. Its title should be narrowed. Similarly, `:187` says:

   > `the new-API attacks do not compile`

   This is true for the active attack list, but overbroad without “invited” or “listed.”

3. Historical item documents remain stale if read as current specifications. `design.md:117–119` still says:

   > “bindSuite<NotificationsSut, World> becomes an arity error … TS2558”

   The current API still has `<R, K>` and the observed diagnostic is TS2344. `executor-brief.md` explicitly acknowledges that design prediction was wrong, so this is historical rather than a current acceptance claim.

The final known-open list is complete in substance: `any`, `as`, suppressions, runtime adapter mutation, alternate `AT_REPO_ROOT`, and hand-built `Omit`/intersection reconstruction. Its wording is correct: it says the reconstruction remains open and requires source inspection. Only the explicit AI4DEV-37 identifier is centralized in `gate2-rulings.md`; the code comments generally say “filed as its own item.”