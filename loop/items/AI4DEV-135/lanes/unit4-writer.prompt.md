You are the writer for unit 4 of the scope run, "Cause labels". You apply a fixed design; you do
not redesign it. Working directory: your own git worktree on branch `lane/ai4dev-135/unit4`, cut
from the item branch after unit 3 merged. Commit there. Never touch any other folder. Never push.

## Read first, in this order
1. `loop/items/AI4DEV-135/design/SYNTHESIS.md`: decision 9, "Data" migration B, "The route"
   (`remove-label` and the commit's label lines), "The pure module" (`normaliseLabels`), the
   suite table rows for AT-004.58 to .60, and "Build order" item 4.
2. `loop/items/AI4DEV-135/design/how.md`, "(4) A cause-label vocabulary table, generation with
   reuse, and a deletion-only write route", and the verbatim text of AT-004.58, .59 and .60 under
   "The sixteen acceptance ids".
3. `loop/items/AI4DEV-135/brief.md`, Unit 4.
4. Units 1 to 3 as merged: `supabase/migrations/20260924120000_discovery_scopes.sql` (edit it
   only where this prompt says; the new table gets its own migration), `supabase/functions/_shared/scope.ts`,
   `supabase/functions/discovery-scope/index.ts`, `write-routes.ts`,
   `tests/at/suites/req-001/_policy-scan.ts` (`TENANT_CATALOG`), `tests/at/suites/req-004/_contract.ts`,
   `_fixture.ts`, `_live.ts`, `_source-absences.ts`, `g-scope-output.test.ts`,
   `fixtures/scope-tiers.ts`, `fixtures/grant-tracker.ts`, `z-later-runs.test.ts`,
   `tests/at/expected/req-004.json`, `tests/at/suites/req-003/c-labels.test.ts` (AT-003.17 pins a
   draft at zero labels and must stay green), and `supabase/functions/_shared/discovery-skills/06-write-the-scope.md`.

## What unit 4 lands
- Migration `supabase/migrations/20260924130000_cause_labels.sql`: table `public.cause_labels`
  (`label text primary key`, `first_project_id uuid references public.projects (id) on delete set
  null`, `created_at timestamptz not null default clock_timestamp()`, constraint
  `cause_labels_canonical check (label <> '' and label = lower(btrim(label)) and label !~ '\s\s')`).
  Posture `unreachable-by-client-roles`: revoke all, enable RLS, no grants. Add
  `cause_labels: 'unreachable-by-client-roles'` to `TENANT_CATALOG`. In the same migration,
  `create or replace` the two definers from unit 1 so that:
  - `discovery_scope_begin` on `generate` (and later `regenerate`) returns `vocabulary` as
    `select label from public.cause_labels order by label` instead of `'[]'`;
  - `discovery_scope_begin` on `remove-label`: `p_label` canonicalised (lower, trim, single
    space); empty → `invalid-request`; if not in `need_intakes.cause_labels` return
    `{ done: true, changed: false, scope, scopes, need }`; else `array_remove` on the need and
    return `{ done: true, changed: true, ... }` with the updated need. The snapshot shape is the
    pass-through commit's shape, so `scopeAct` and `renderDiscoveryScope` need no new branch; keep
    the `done: true` pass-through as it is (`p_scope_id: null`).
  - `discovery_scope_commit` on `completed`: `insert into public.cause_labels (label,
    first_project_id) select unnest(p_labels), v_scope.project_id on conflict do nothing`, then
    `update public.need_intakes set cause_labels = coalesce(p_labels, '{}') where project_id = v_scope.project_id`.
    A failed commit touches neither.
- In `scope.ts`: `normaliseLabels(candidates, vocabulary)` (canonical, deduplicated, at most
  `SCOPE_CAUSE_LABELS_MAX`, the vocabulary's spelling wins on a case-insensitive match).
  `scopeAct` passes `parsed.causeLabels` through `normaliseLabels` with `begun.vocabulary` before
  the commit args, and the stored contract's `causeLabels` is the normalised list.
  `decideDiscoveryScope` accepts `action: 'remove-label'` with a `label` string field, sends
  `p_label`. `renderDiscoveryScope` already reads `changed`; check it and the `need` view carry
  the updated labels.
- `06-write-the-scope.md` sharpens the label lines: name the vocabulary block, reuse an exact
  entry when the domain matches, mint a new short label only for a genuinely new domain, zero when
  unsure, at most three. Regenerate the index with `bun run discovery:skills`.
- The absence scan for AT-004.60's second half in `_source-absences.ts`:
  `labelCurationSurfaceProblems()` over `scanLabelCurationSurface(input)`. Over `WRITE_ROUTES`,
  every `supabase/functions/*/index.ts`, `supabase/functions/_shared`, `supabase/migrations` and
  `src`: a problem for any route name, exported function, SQL function, REST path or UI route that
  creates, renames, merges, curates or lists-for-editing a cause label (names carrying `label` or
  `taxonomy` next to `create`, `add`, `rename`, `merge`, `curate`, `manage`, `admin`, `upsert`), and
  for any migration statement that grants any privilege on `cause_labels` to a client role. The
  `remove-label` action and the definers are the allow-list. It throws when it finds no product
  source. Cover it in `req004-absences.selftest.ts`: real tree clean, a synthetic `create-label`
  route flagged, a synthetic grant flagged, empty input throws.
- SUT contract (`_contract.ts`): `seedCauseLabelsAsOperator(labels: string[]): Promise<void>` and
  `causeLabelRows(): Promise<{ label: string; firstProjectId: string | null }[]>`; `writeScope`
  request gains `action: 'remove-label'` with `label`. `_fixture.ts` keeps an in-memory vocabulary
  set with the same rules; `_live.ts` writes and reads the table with the service role.
- Fixture `fixtures/food-bank.ts`: a need intake for a food bank (`FOOD_BANK.intake`), its
  completed elicitation, and a full `record_scope` reply whose `causeLabels` is `['Food Security']`
  (mixed case on purpose, so normalisation is visible) plus a thin-conversation variant reply with
  `causeLabels: []`. Realistic, plain English, no money words.
- Tests in a new `tests/at/suites/req-004/h-cause-labels.test.ts`, moved out of
  `z-later-runs.test.ts`:
  - AT-004.58: seed `['food security']`; through the SUT start the food-bank need, script the
    elicitation reply then the reply with `['Food Security']`, send the completing message,
    generate. Assert the last Anthropic request's system carries the vocabulary with
    `food security` in its uncached block; the scope row's `causeLabels` equals `['food security']`;
    `causeLabelRows()` still holds exactly one row; the need's `causeLabels` equals
    `['food security']`. Loop green, integration `awaiting(AWAITED.anthropicLive)`.
  - AT-004.59: two halves in one body. Seed `['food security']`; a grant-tracker generation whose
    reply carries `['grant management']` grows the vocabulary to two rows with the new row's
    `firstProjectId` equal to the project; then a thin food-bank conversation whose reply carries
    `[]` stores zero labels and leaves the vocabulary at two. Loop green, integration
    `awaiting(AWAITED.anthropicLive)`.
  - AT-004.60: generate a scope with one label through the SUT (loop) or seed it with the operator
    helpers (integration; look at how AT-004.37's row in the synthesis describes operator begin
    and commit, and add `beginScopeAsOperator` / `commitScopeAsOperator` to the contract only if
    the live tier needs them to get a labelled need without the model). Then `remove-label`
    through the route: `changed: true`, the need's `causeLabels` empty, the vocabulary row still
    present; a second remove of the same label answers `changed: false`; the scan
    `labelCurationSurfaceProblems()` is `[]`. Green at both tiers.
- `tests/at/expected/req-004.json`: .58 and .59 loop green, integration red `vendors.anthropic`;
  .60 green at both tiers.
- `tests/at/suites/req-001` catalog and write-route ids stay green with the new table and no new
  route (the action rides the existing `discovery-scope` route).

## Rules
- Match the surrounding code. Comments only for a non-obvious why. No feature beyond the list.
- The suite rules: tests through the SUT; capture once, assert many; no pinned number as a
  literal in a test body (`SCOPE_CAUSE_LABELS_MAX` comes from `h.config.get`).
- Never paste a key or token into a committed file.
- If the synthesis is silent, follow the nearest existing pattern and note the choice in the
  report. If it is wrong about the tree, stop that part, keep the rest, and name it under
  "Deviations".

## Verify before you commit, in this order, and record each exit code
1. `bun run typecheck`
2. `bun run at:check req-004`
3. `bun run at:selftest`
4. `bun run at:verify req-004 --tier loop --expect`
5. `bun run at:verify req-001 --tier loop --expect`
6. `bun run at:verify req-003 --tier loop --expect`
7. `bun run build`, then `git checkout -- src/routeTree.gen.ts` if the build dirtied it; never
   commit that file.

## Commit and report
One commit, message starting `AI4DEV-135: unit 4,`, plain sentences. Write
`loop/items/AI4DEV-135/lanes/unit4-writer.report.md` (Landed, Verify with exit codes and
counts, Deviations or "none", Choices the synthesis left open or "none") and include it in the
commit. Reply with five lines at most: the commit sha, the seven exit codes, the report path.
