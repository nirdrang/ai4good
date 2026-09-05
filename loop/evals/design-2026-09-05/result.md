# Design arena rejudge, 2026-09-05: does the fable runner lane earn its seat?

The arena two items ago (the v1-ceremony item) ran four runners, fable at max, sol at max, grok at
xhigh, opus at xhigh, each pushed in a distinct structural direction, against a hidden six-criterion
rubric scored 0 to 3. All four candidates, the task, the rubric, the explanation the runners were
given, and the original cross-judge's verdict are on disk under the item's arena folder.

This rejudge relabels the four at random (key in `label-key.txt`, never shown to a judge),
sanitises every model and author name, and puts them in a fresh checkout at f81062e, the tree the
runners designed against. Each judge scores all four in one pass on the arena's own rubric, verifies
claims against the code, ranks them, lists grafts, and says whether the top two are clear or close.

Judges: astra at high and muse at xhigh, because all four usual families are candidates here and
cannot judge themselves. Astra shares a vendor with the sol candidate; disclosed.

## The original cross-judge, from the real run

| fable | sol | grok | opus |
|---|---|---|---|
| 15 | 17 | 15 | 12 |

The lead picked fable's candidate as base anyway, noting all four had converged on one shape and
differed only in factoring.

## Judge one, astra at high. 8 minutes.

| criterion | opus | fable | sol | grok |
|---|---|---|---|---|
| compile-time proof on the destructive path | 3 | 3 | 3 | 3 |
| positive identity, nothing deleted | 3 | 2 | 3 | 2 |
| surface: one screen, at most two functions | 1 | 1 | 3 | 0 |
| session lifetime single-sourced | 3 | 3 | 3 | 3 |
| smallest honest diff and selftest story | 2 | 2 | 2 | 2 |
| lock and evidence | 3 | 3 | 3 | 3 |
| **total of 18** | **15** | **14** | **17** | **13** |

Ranking: sol, opus, fable, grok. Verdict on the top two: close. Sol has the cleaner ownership
boundary and the smaller change; opus offsets with stronger identity testing.

Sol wins on the same criterion it won in the real run, the surface of the runner's integration
branch. Fable is third.
## Judge two, muse 1.3 at xhigh. 32 minutes.

| criterion | opus | fable | sol | grok |
|---|---|---|---|---|
| compile-time proof on the destructive path | 3 | 3 | 2 | 3 |
| positive identity, nothing deleted | 3 | 2 | 2 | 2 |
| surface: one screen, at most two functions | 2 | 1 | 3 | 1 |
| session lifetime single-sourced | 3 | 2 | 2 | 2 |
| smallest honest diff and selftest story | 2 | 1 | 1 | 3 |
| lock and evidence | 3 | 3 | 3 | 3 |
| **total of 18** | **16** | **12** | **13** | **14** |

Ranking: opus, grok, sol, fable. Verdict on the top two: close.

## Three judges, one conclusion about the fable seat

| judge | winner | fable's rank of four |
|---|---|---|
| the original cross-judge, in the real run | sol | joint second |
| astra at high, blind | sol | third |
| muse at xhigh, blind | opus | fourth |

The judges do not agree on the winner. They agree that fable's design is not it, and both blind
judges call the top two close, which means the arena's outcome on this task was never decided by
one candidate being clearly best. Every candidate scored full marks on the destructive-path proof
and on the lock and evidence. The spread came from surface, diff size, and identity, where fable
was middle or bottom.

The lead picked fable's design as base in the real run, noting all four had converged on one
shape. That pick was the lead's judgment, and the grafts came from the other three. Nothing in
three judge passes says the fable candidate was needed to reach the design that shipped.

## What this means for the two runner rows

The fable lane at max in `arena runners` and `architect runners` is the largest remaining fable
seat in the item flow, and on the one arena we have it produced a design three judges rank below
sol's or opus's. That is one arena, one task. It is enough to stop assuming the seat earns itself,
and not enough to say which lane replaces it. Options, in order of evidence:

- Drop the fable lane and run three runners. Every judge found the top two close, and the arena's
  own rule seats a cross-judge from a provider different from the front-runner, which fable can
  never be while the lead is fable.
- Seat astra in its place. Astra judged this arena coherently and ranked the candidates the same
  way as the original judge. It has never designed here. A live arena on the next item with astra
  as a fourth runner, scored the same blind way, settles it.