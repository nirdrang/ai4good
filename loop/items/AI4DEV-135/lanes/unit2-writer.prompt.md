You are the writer for unit 2 of the scope run, "Rendering". You apply a fixed design; you do not
redesign it. Working directory: your own git worktree on branch `lane/ai4dev-135/unit2`, cut
from the item branch after unit 1 merged. Commit there. Never touch any other folder. Never push.

## Read first, in this order
1. `loop/items/AI4DEV-135/design/SYNTHESIS.md`: decisions 10, the `scope-copy.ts` paragraph,
   the suite table rows for AT-004.21 and AT-004.25, and "Build order" item 2.
2. `loop/items/AI4DEV-135/design/how.md`, "Attachment points (2)", and the verbatim text of
   AT-004.21 and AT-004.25 under "The sixteen acceptance ids".
3. `loop/items/AI4DEV-135/brief.md`, Unit 2 and the PRD slice's last paragraph ("No dollar
   estimation in v1 ...").
4. Unit 1 as merged: `supabase/functions/_shared/scope.ts` (`renderScopeMarkdown` is the
   structural document you extend), `tests/at/suites/req-004/g-scope-output.test.ts`,
   `fixtures/scope-tiers.ts`, `_source-absences.ts` (the scan shape: `scanFreeCreditsOutsideMoney`
   and its "refuse to report an absence over an empty source" rule), `_source-pins.ts`,
   `z-later-runs.test.ts`, `tests/at/expected/req-004.json`; the copy modules
   `need-intake-copy.ts`, `notification-copy.ts`, `acknowledgment-copy.ts` for the shape.

## What unit 2 lands
- `supabase/functions/_shared/scope-copy.ts` with `SCOPE_COPY`: `maintenance` (one sentence: the
  NGO evolves the tool by chat, pays Lovable directly about 25 dollars a month, and owns the
  code), `lovablePricingUrl` (`https://lovable.dev/pricing`), `dataTier.tier0`, `.tier1` (ordinary
  personal data: minimise what you collect; the NGO owns the exposure risk), `.tier2`
  (special-category or high-volume personal data: synthetic or anonymised fixtures only during
  the build; the NGO connects real data itself after completion; real tier-2 data never reaches
  Anthropic, Lovable, or the volunteer), `startSmall` (the lead sentence before the model's
  start-small advice), `ownership`. Plain English, short sentences. The keys for units 5 and 6
  are not yours.
- `renderScopeMarkdown` grows the document: the complexity section carries the tier, the
  rationale, and the start-small paragraph (`SCOPE_COPY.startSmall` then the model's advice);
  the data section carries `SCOPE_COPY.dataTier[tier]` then the rationale; a maintenance
  section carries `SCOPE_COPY.maintenance`; the Lovable section carries the rationale and, when
  `recommended` is true, a markdown link to `SCOPE_COPY.lovablePricingUrl`. No money figure
  anywhere else. The complexity tier is a word, never a number with a currency.
- `scopeMoneyProblems(markdown: string): string[]` in `scope.ts`: a currency sign, `USD`,
  `dollar` or `dollars`, `cost`, `estimate`, `budget`, or `price` outside the exact
  `SCOPE_COPY.maintenance` sentence and the pricing link is a problem, one line each.
  `scopeAct` runs it on the rendered document and treats a non-empty result as a failed
  generation (`p_outcome: 'failed'`, failure names the first problem), so a scope whose model
  text sneaks a cost in is never stored.
- The source scan for AT-004.21 in `_source-absences.ts`, `scopeMoneySourceProblems()`: over
  `scope.ts`, `scope-copy.ts`, `discovery-skills/06-write-the-scope.md` and the
  `RECORD_SCOPE_TOOL` description text, the same money words, allow-listing exactly the
  `maintenance` sentence and the pricing URL, refusing to report an absence when it finds no
  source. Follow the shape of the scan that exists.
- Fixtures: `fixtures/scope-tiers.ts` gains two more full scopes so the three data tiers are
  covered (tier0, tier1 from unit 1, tier2), each realistic for a small NGO tool (a volunteer
  roster, the grant tracker, a case-notes tool with health data), and a
  `scopeDocumentProblems(markdown, fixture)` checker that names what is missing: the tier
  sentence, the fixtures-only paragraph on tier2, the tier word and rationale, the start-small
  lead, the maintenance sentence, the pricing link when recommended (and its absence when not).
- Tests: move AT-004.21 and AT-004.25 out of `z-later-runs.test.ts` into `g-scope-output.test.ts`.
  AT-004.21: run the source scan (empty), render every fixture and run `scopeMoneyProblems`
  (empty), and through the SUT script a `record_scope` reply whose summary says "roughly $4,000
  to build" and assert the route refuses (`refused`, 502) and no `current` row exists. AT-004.25:
  render the three fixtures and assert `scopeDocumentProblems` is empty for each. Both ids green
  at loop and integration in `tests/at/expected/req-004.json` (the integration bodies are the
  same pure checks; use `default` when one body serves both tiers, the way other files do).

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
5. `bun run at:verify req-016 --tier loop --expect`
6. `bun run build`, then `git checkout -- src/routeTree.gen.ts` if the build dirtied it; never
   commit that file.

## Commit and report
One commit, message starting `AI4DEV-135: unit 2,`, plain sentences. Write
`loop/items/AI4DEV-135/lanes/unit2-writer.report.md` (Landed, Verify with exit codes and
counts, Deviations or "none", Choices the synthesis left open or "none") and include it in the
commit. Reply with five lines at most: the commit sha, the six exit codes, the report path.
