# Deslop report — branch nirdrang/ai4dev-55-tenant-isolation-and-visibility-d5

Scope: the branch diff against origin/main. No file under `src/`, no migration before 2026-09-06,
nothing under `loop/items/`, no comment, and not `tests/at/expected/req-001.json`. Behavior unchanged.

## Edits (file — what — why)

1. `tests/at/suites/req-001/_policy-scan.ts` — `usingExpression`: dropped `match.index === undefined` from the guard — `RegExp.exec` always sets `index` on a match; the check was dead.
2. `tests/at/suites/req-001/_policy-scan.ts` — removed the `remainingViewer` set — it was a subset of `definers`, so `!remainingViewer.has(fn) && !definers.has(fn)` equals `!definers.has(fn)`; the set added nothing.
3. `tests/at/suites/req-001/_policy-scan.ts` — exported `isTautologicalUsing` — so the integration body reuses it (edit 4) instead of a copy.
4. `tests/at/suites/req-001/_integration.ts` — `assertTenantCatalog`: replaced the inline normalise/strip/compare with `isTautologicalUsing(policy.using)` and imported it — the three lines were a verbatim copy of the scan's helper.
5. `tests/at/suites/req-001/_live.ts` — `retypeAccountAsOperator`: dropped the `: AccountType` parameter annotation and the `AccountType` type import — `AccountsSut` supplies the type by contextual typing; no other adapter method annotates its parameters.
6. `tests/at/suites/req-001/_live-tenant-reads.ts` — `AccessTokens` and `SqlQuery` are no longer exported — no other module imports them (`JwtClaims` stays exported; `_live.ts` uses it).
7. `tests/at/suites/req-001/_live-tenant-reads.ts` — `functionOutcome`: removed the `isOk` callback parameter and checked `ok === true` inside; return type is now the existing `TenantReadOutcome<T>` alias — all three callers passed the identical `(body) => body.ok === true`, and the return shape already had a name in `_contract.ts`.
8. `tests/at/suites/req-001/_live-tenant-reads.ts` — `publicProjectPage`: typed the body as `{ ok: true } & PublicProjectView` and copied the three fields without `String(x ?? '')` — the dashboard and workspace arms trust the parsed body the same way; the coercions were inconsistent defensiveness.
9. `tests/at/suites/req-001/_live-tenant-reads.ts` — dropped the now-unused `ViewerAnswer` type import — orphaned by edit 7.
10. `tests/at/harness/live-stack.selftest.ts` — hoisted `captureFetch` to module scope with a `body = '{}'` parameter and deleted the second copy; the three new tests call `captureFetch('{"ok":true}')` — the branch duplicated the stub verbatim inside a second `describe`, differing only in the stubbed body.

Files edited: 5. Edits: 10.

## Gates (run from /home/user/ai4good after the edits)

| command | exit |
| --- | --- |
| `bun run typecheck` | 0 |
| `bun run at:check req-001` | 0 |
| `bun run at:selftest` | 0 (15 files, 219 tests) |
| `bun run at:verify req-001 --tier loop --expect` | 0 (25 green, 12 red, matches the manifest) |

No edit had to be reverted.

## Judged slop but left, with the reason

- `_live-tenant-reads.ts` `viewerRead`: `try/catch` around `JSON.parse` of a 200 answer and the loud refusal on an unmappable row. The parent named the refusal a design decision. The parse guard sits on the same network edge (PostgREST answers), so it stays with it.
- `_live-tenant-reads.ts` `functionOutcome`: `try/catch` around `JSON.parse` and the object-shape check. Same network edge; the harness has no other path for a non-JSON edge answer that keeps the raw bytes for the byte-equality assertions.
- `_live-tenant-reads.ts` `freshAccessToken`: a proactive refresh when the token has under 20 seconds left. `_live.ts` already has a refresh path in `refreshSession`, but that one is a SUT method that the acceptance body calls on purpose; this one is adapter plumbing for long integration runs. Not a duplicate of behavior; left.
- `_policy-scan.ts` `tenantCatalogProblems`: the `try/catch` around `readdirSync` that rewraps the error. The selftest pins the rewrapped message (`/could not read migrations/`), so removing it would change a graded behavior.
- `_policy-scan.ts`: the `i` flag on `/^grant\b/i.test(lower)` where `lower` is already lower-cased. Harmless; not worth a diff line.
- `live-stack.ts` `restGet`: the leading-slash normalisation accepts both `/x` and `x`. Both shapes are pinned by the selftest; removing the branch changes graded behavior.
- `d-tenant-isolation.test.ts` and `_integration.ts` import `CapabilityPending` from `harness/registry.ts` while `_fixture.ts` and `_live.ts` import it from `harness/pending.ts`. `registry.ts` re-exports it and `_integration.ts` already used that path before this branch; a style split older than the branch, not the branch's.
- `_fixture.ts` `fixtureReads` is a function that rebuilds the `TenantReads` object on every call rather than a constant. It closes over per-world `state`, and the surrounding adapter builds closures the same way; left.
- `_fixture.ts` `publicProjectPage` and `_live-tenant-reads.ts` `publicProjectPage` both copy the three page fields by name rather than spreading the body. Kept: a spread would carry `ok` into `PublicProjectView`, and the field-by-field copy is the module's stated projection style.
- `loop/work/grok-shim/grok`: a bash wrapper; outside the TypeScript scope of this pass and not graded by any gate.

## For the lead to rule on

Edit 10 moved the pre-existing `captureFetch` body out of the first `describe` (a cut-and-paste plus one default parameter). Every other edit touches only lines the branch added. If the lead wants the pass to stay strictly inside branch-added lines, revert edit 10 alone; the gates do not depend on it.
