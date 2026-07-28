# Change order 005 — stable test handles on every new screen

Date: 2026-07-24 · From: the build session (founder ratification) · Status: OPEN
Project: AI4GOOD platform screens
Source: `loop/bringup/testid-convention-draft.md` (ratified by the founder 2026-07-24).
Folded into the standing screen rules at `design/ui-ux-instructions.md` §5.1.

## Why

Acceptance tests will later drive the real screens, and Lovable regenerates markup freely on
every message. A test pinned to today's classes, structure, or button text breaks on the next
generation. The fix is an explicit contract between screens and tests: a stable handle
attribute that survives regeneration.

## The convention (now standing rule §5.1)

> Every interactive control, state-bearing display, list, list item, and empty/error state gets
> **`data-testid`** in kebab-case requirement vocabulary (`fuel-balance`, `requirement-item`),
> with **`data-testkey="<domain id>"`** on repeated items. Preserve existing handles verbatim on
> every regeneration; never rename on restyle; add handles to new elements per the grammar.
> Layout/visual names (`left-panel`, `card-2`) are forbidden.

- **Grammar:** `<surface>-<thing>[-<qualifier>]`, kebab-case, from **requirement** vocabulary.
- **Vocabulary follows d82/d86:** on NGO and public surfaces the unit is the **requirement** —
  `requirement-list` / `requirement-item`, never `task-*`. `task-*` is legitimate only on the
  volunteer's own dev-tree surfaces. A handle is a long-lived contract, so the two-tree
  vocabulary rule binds handles at least as strictly as visible copy.
- **What carries one:** interactive controls a test exercises; state-bearing displays a test
  asserts on; every list plus its repeated item; every distinct empty/error/alert state.
- **Repeated items:** one shared `data-testid` + `data-testkey="<domain id>"` (a domain id,
  never an array index).
- **Uniqueness:** a singleton handle appears at most once per real screen (route).
- **`data-screen-label` is unrelated and stays untouched.**

## Scope — forward only

**Do NOT retrofit the existing eleven screens.** Screens drawn before ratification carry no
handles by design; they are retrofitted per requirement at its wiring leaf, when a wired test
first needs them. Apply this convention to **every screen drawn from now on** — starting with
Batch 1.

## Component reference sheets

Catalog sheets (`app-shell`, `tokens-and-badges`, `money-components`,
`coordination-components`) render the same component many times, so a handle necessarily
repeats there. On a catalog, a handle documents the contract the component carries in real
use; the once-per-route uniqueness rule does not bind catalogs. Grammar and preservation
still do.

## Done when

Every screen drawn on or after 2026-07-24 carries handles per the grammar, and the design
gate's handle scan (presence, grammar, rename-diff) passes on it.
