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
## Round two: four new runners on the same task, 2026-09-05

Founder ruling: the arena row must answer three things at once, sol or astra but not both, whether
muse earns a runner seat, and whether fable stays and at which effort. Four new candidates design
against the same task at the same commit, in four fresh checkouts, each holding the task, the
explanation, the rulings and the four critiques the original runners had.

| candidate | direction | route |
|---|---|---|
| fable at high | fable's original, subtract first | native, blinding by instruction, transcript checked |
| fable at low | fable's original, subtract first | native, same |
| astra at medium | sol's original, one new module behind one call | external runner, sandboxed by process |
| muse 1.3 at xhigh | opus's original, keep the proven read | external runner, sandboxed by process |

Each newcomer takes an incumbent's direction so that inside a direction only the model changes,
and inside fable's direction only the effort changes.

Judges: GLM 5.3 at max and DeepSeek Flash at max, the only families with no candidate in the
race. Both probed reachable today. Eight designs, fresh random labels, one pass each on the
arena's own six criteria.

### A false start, caught by a candidate

The first launch seeded the four checkouts with the task and the explanation only. The task's read
list also names the rulings and the three critiques, which the original runners had. Fable at low
finished first and flagged in its summary that the rulings and critiques were absent from its
worktree. That is a fairness gap: the rulings are constraints, and one of them (the pinned
session lifetime) is a rubric criterion. All four lanes were stopped, the four checkouts were
seeded with the rulings and all four critiques, and all four lanes were relaunched. The
fable-at-low run cost 226k tokens and 4.5 minutes for nothing but the catch, which was worth it.
### Round two launched

All eight candidates relabelled A to H by a fresh random permutation (`label-key-round-2.txt`,
never shown to a judge), sanitised, and placed in the judge checkout. Both native fable runs were
transcript-checked: fable at high touched 26 paths, fable at low 19, none outside their own
checkouts. The two runner lanes were sandboxed by process.

Leak check on the eight: six hits, none an author leak. Three are the repository path
`.claude/settings.json`, which the task itself names. Three are citations of the form "sol 12" in
one candidate, pointing at numbered findings in the critique file every designer was given. The
critique files carry model names in their filenames because the original runners saw them that
way, and a citation of a critique does not identify the candidate's own author.

Judges launched: GLM 5.3 at max and DeepSeek Flash at max, one pass each over all eight.
### GLM judge, first attempt: rate-limited after 50 requests

The GLM lane ran 11.6 minutes, made 50 successful requests through the router, then hit one 429
from the OpenCode provider and codex gave up after its retry limit. The runner labels this
"unauthenticated"; the ledger shows it was the rate limit. DeepSeek Flash was reading the same
eight designs on the same provider at the same time. GLM retries alone once DeepSeek finishes.
### Judge one on the eight, DeepSeek Flash at max. 12 minutes.

| candidate | total of 18 | rank |
|---|---|---|
| astra at medium | 18 | 1 |
| sol at max | 18 | 2 |
| opus at xhigh | 17 | 3 |
| fable at high | 16 | 4 |
| grok at xhigh | 16 | 5 |
| fable at low | 16 | 6 |
| fable at max | 15 | 7 |
| muse 1.3 at xhigh | 10 | 8 |

Verdict on the top two: close. The judge's reasoning, visible in its reply, weighed whether to
penalise thorough selftest stories as "not smallest" and decided that honest, accurate counts are
what the criterion rewards; three candidates lost a point there for counts the checkout
contradicts, and those three were the three fable runs.

Astra ties sol for first on its first design here, on sol's own direction. Fable at max, the
incumbent seat, is seventh of eight. Fable's best effort was high, in fourth. Muse is last by a
wide margin, the same pattern as the explainer eval: a strong reviewer, a weak designer.
### GLM judge, second attempt: the OpenCode window is closed

Retried alone after DeepSeek finished. The first request drew a 429 and codex gave up in 17
seconds; the ledger shows the provider refusing GLM outright. The window that the two judges,
the two design runners and the muse reviewer spent today is exhausted, and it is a five-hour
window. Every family with no candidate in this race lives on that provider, so no second judge can
run until it reopens. A same-vendor judge would be biased toward exactly the candidates at the top
or the bottom, so none was substituted. GLM retries when the window reopens.

One judge has scored the eight. Its verdict stands as a single pass until the second lands.
## Ruling, 2026-09-05

Founder: "I think we should go here on Astra@med and fable@low". Both runner rows become astra at
medium, fable at low, grok at xhigh, opus at xhigh. Sol leaves on cost at a tie. Fable at low
stays by ruling, not by score. Muse is out. The fable lane leaves the judge pool as dead
configuration. GLM's second pass still runs when the OpenCode window reopens and is recorded here
when it lands, whatever it says.