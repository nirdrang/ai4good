You are the writer for unit 3 of the scope run, "Scope as contract". You apply a fixed design; you
do not redesign it. Working directory: your own git worktree on branch `lane/ai4dev-135/unit3`,
cut from the item branch after unit 2 merged. Commit there. Never touch any other folder. Never
push.

## Read first, in this order
1. `loop/items/AI4DEV-135/design/SYNTHESIS.md`: decision 11, the `ScopeContractRef` and resolver
   lines in "The pure module", the suite table rows for AT-004.24 and AT-004.52, and "Build
   order" item 3.
2. `loop/items/AI4DEV-135/design/how.md`, "(3) A versioned scope read plus the absence of any
   scope-to-tasks path", and the verbatim text of AT-004.24 and AT-004.52 under "The sixteen
   acceptance ids".
3. `loop/items/AI4DEV-135/brief.md`, Unit 3.
4. Units 1 and 2 as merged: `supabase/functions/_shared/scope.ts` (`ScopeView`,
   `scopeViewFromSql`), `tests/at/suites/req-004/g-scope-output.test.ts`, `_contract.ts`
   (`writeScope`, `scopeRows`), `_fixture.ts` and `_live.ts` (how `scopeRows` reads),
   `_source-absences.ts` (`scanScopeMoneySource` and `scanFreeCreditsOutsideMoney` for the scan
   shape and the "refuse to report an absence over an empty source" rule), `_pending.ts`,
   `z-later-runs.test.ts`, `tests/at/expected/req-004.json`, and
   `tests/at/harness/req004-absences.selftest.ts`.

## What unit 3 lands
- In `scope.ts`: `export type ScopeContractRef = { projectId: string; version: number }` and two
  resolvers, `scopeSourceForPrd(scopes, ref)` and `scopeReferenceForScorer(scopes, ref)`, both
  over `readonly ScopeView[]` for one project, both returning
  `{ ok: true; scope: Scope; markdown: string } | { ok: false; reason: 'no-such-version' | 'not-settled' }`.
  `no-such-version` when no row has `ref.version`; `not-settled` when the row's status is not
  `current` or `superseded`, or its contract or markdown is null. The two functions share one
  body; the second is the same resolver under the scorer's name, so a caller reads which
  consumer it serves. `ScopeView` gains `projectId` (from `row.project_id`) so a ref for a
  different project is `no-such-version`. Update every place that builds a `ScopeView` by hand
  (the fixture, any selftest).
- In `_pending.ts`: `prdAuthoring: 'prd.authoring'` and `backlogDerivation: 'backlog.derivation'`
  in `AWAITED`.
- In `_source-absences.ts`: `scopeDecompositionProblems()` over `scanScopeDecomposition(input)`.
  The scan walks `supabase/functions`, `supabase/migrations` and `src` for any product source that
  reads `discovery_scopes` (a `from('discovery_scopes')`, a SQL `from discovery_scopes` or
  `public.discovery_scopes`, a REST path `/discovery_scopes`) and, in the same file, writes a task,
  backlog or issue table or calls a function whose name carries `task`, `backlog` or `issue`. Any
  such file is a problem line. The scan throws when it finds no product source, the way the money
  scan does. Cover it in `req004-absences.selftest.ts`: the real tree is clean; a synthetic file
  that reads the scope and inserts into `tasks` is flagged; an empty input throws.
- Tests, in `g-scope-output.test.ts`, moved out of `z-later-runs.test.ts`:
  - AT-004.24, one `default` body: run `scopeDecompositionProblems()` and assert `[]`, then throw
    `awaiting(AWAITED.backlogDerivation)` the way the pending helper does (call the function it
    returns). Red at both tiers under `backlog.derivation`.
  - AT-004.52, one `default` body: through the SUT, provision an NGO, start the grant-tracker
    need, script the elicitation reply and `GRANT_TRACKER_SCOPE_REPLY`, send the completing
    message, generate the scope. Read `scopeRows(projectId)`, map through `scopeViewFromSql`, and
    prove both resolvers return `ok: true` with the same `scope` and `markdown` for
    `{ projectId, version: 1 }`, both refuse `{ projectId, version: 2 }` with `no-such-version`,
    and both refuse a ref for another project id. Then throw `awaiting(AWAITED.prdAuthoring)`.
    Red at both tiers under `prd.authoring`. At the integration tier the SUT cannot script the
    model, so the body runs its provable half only when `h.vendors.anthropic` is scriptable;
    look at how AT-004.21 splits `loop` and `default`, and give AT-004.52 a `loop` body with the
    route walk and a `default` body that builds three `ScopeView` values by hand (one `current`,
    one `failed`, one `generating`) and proves the same four facts on the pure resolvers before
    throwing the pending name.
- `tests/at/expected/req-004.json`: AT-004.24 red `backlog.derivation` at both tiers, AT-004.52
  red `prd.authoring` at both tiers.

## Rules
- Match the surrounding code. Comments only for a non-obvious why. No feature beyond the list.
- The suite rules: tests through the SUT; capture once, assert many; no pinned number as a
  literal in a test body.
- If the synthesis is silent, follow the nearest existing pattern and note the choice in the
  report. If it is wrong about the tree, stop that part, keep the rest, and name it under
  "Deviations".

## Verify before you commit, in this order, and record each exit code
1. `bun run typecheck`
2. `bun run at:check req-004`
3. `bun run at:selftest`
4. `bun run at:verify req-004 --tier loop --expect`
5. `bun run build`, then `git checkout -- src/routeTree.gen.ts` if the build dirtied it; never
   commit that file.

## Commit and report
One commit, message starting `AI4DEV-135: unit 3,`, plain sentences. Write
`loop/items/AI4DEV-135/lanes/unit3-writer.report.md` (Landed, Verify with exit codes and
counts, Deviations or "none", Choices the synthesis left open or "none") and include it in the
commit. Reply with five lines at most: the commit sha, the five exit codes, the report path.
