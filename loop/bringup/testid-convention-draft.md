# Stable test handles on screens — convention draft (H0.2 of the AT harness item)

**Status: DRAFT, awaiting founder ratification.** Once ratified: fold into
`design/ui-ux-instructions.md` (the design session owns that edit), push into Lovable
project knowledge, and hand the harness (AI4DEV-3) the selector rule below.

**The problem it solves.** Lovable owns the interface and regenerates markup freely on
every message. The wired re-runs of acceptance tests must drive real screens; a test
pinned to today's classes, structure, or button text breaks on the next Lovable turn.
The fix is an explicit contract between screens and tests: a stable handle attribute
that survives regeneration because Lovable is standing-instructed to preserve it.

## The convention

1. **Attribute:** `data-testid`. It is the default selector of both Playwright and
   Testing Library, so the harness needs no custom plumbing, and it is inert at runtime.
2. **Naming grammar:** `<surface>-<thing>[-<qualifier>]`, kebab-case, from REQUIREMENT
   vocabulary — never visual/layout vocabulary. `fuel-balance`, `task-list`,
   `blocker-raise-button`, `notif-item` — never `left-panel`, `card-3`, `blue-button`.
   Renaming a testid is a breaking change to the test contract: never rename on
   restyle; rename only when the requirement's meaning changes.
3. **What must carry one** (not every element — exactly what a test observes):
   - every interactive control an acceptance test exercises (buttons, inputs, links
     that change state);
   - every state-bearing display a test asserts on (fuel gauge, status chip, runway
     figure, counters);
   - every list plus its repeated item (`task-list` / `task-item`);
   - every distinct empty/error/alert state (`fuel-depleted-banner`, `tasks-empty`).
4. **Repeated items:** instances share one testid and carry `data-testkey="<domain id>"`
   for row identity (`data-testid="task-item" data-testkey="AI4PM-20"`). The key is a
   DOMAIN id, never an array index.
5. **Uniqueness:** a singleton testid appears at most once per screen. Two screens may
   reuse a name only for the same requirement-level thing (the fuel balance on the
   project page and the dashboard are both `fuel-balance`).

## Enforcement (three layers, none optional)

- **Lovable project knowledge** carries the convention verbatim with the standing rule:
  *preserve existing `data-testid`/`data-testkey` attributes on every regeneration; add
  them per the grammar on new elements; never rename except on an explicit instruction.*
  This is the same channel that already carries the governance rules, so it re-applies
  to every generation.
- **The design gate scan** (the standing design-check suite) fails a screen that renders
  an interactive control or state display with no handle, and diffs handles across
  batches so silent renames surface as gate failures, not as broken tests weeks later.
- **The harness selector rule:** wired tests select ONLY by `data-testid`/`data-testkey`
  (a helper is the sole selector surface; raw CSS/text selectors are unavailable). This
  keeps the whole test corpus honest by construction rather than by review.

## Retrofit note

Screens generated before ratification (the current inventory) carry no handles. That is
expected: handles are retrofitted per requirement at its WIRING leaf, when its wired
re-run first needs them — not in one big pass. The design session only needs to follow
the convention from ratification forward.

## Paste-ready block for the design session / Lovable knowledge

> **Test handles (ratified convention):** Every interactive control, state-bearing
> display, list, list item, and empty/error state gets `data-testid` in kebab-case
> requirement vocabulary (`fuel-balance`, `task-item`), with `data-testkey="<domain id>"`
> on repeated items. Preserve existing handles verbatim on every regeneration; never
> rename on restyle; add handles to new elements per the grammar. Layout/visual names
> (`left-panel`, `card-2`) are forbidden.
