# UI Way-of-Work — implementing the design screens in Lovable

> How a finished screen from `design/screens/` becomes a real, tracked, verified screen in
> the app. The UI counterpart to the backend way-of-work (`loop/out/wow-claude-driven-linear.md`).
> Written 2026-07-21. Companion to `ui-ux-instructions.md` (the screen rules) and
> `design-session.md` (batch cadence + credit tracking, still valid; this doc supersedes its
> per-screen loop now that `design/screens/` HTML is the input).
>
> **Stated assumption (flag):** screens arrive via Claude Design's "Handoff to Claude Code"
> bundle (HTML/CSS/JS + per-state screenshots + README); `design/screens/` holds the unpacked
> per-screen HTML with its state screenshots beside it. Verify the exact bundle layout on the
> first real handoff; if it differs, only §2 (the Lovable handoff) and §4 step 4 change.

## 0. The four layers (who is the source of truth for what)

```
PRD (requirements)            → WHAT must exist            [.taskmaster/docs/prd-mvp.md]
  ↓ derived
ui-ux-instructions.md         → screen RULES / invariants  [never-show list, money units,
                                                            two-tree, projection, states]
  ↓ derived, emitted by "Claude design"
design/screens/*.html         → screen VISUAL DESIGN       [layout, hierarchy, copy — the
                                                            look you approve]
  ↓ implemented by Lovable
src/ (TanStack + shadcn)      → the REAL APP               [Lovable owns; behind the fixture
                                                            seam; verified against the two above]
  ↓ wired later, per screen
supabase/ (edge functions)    → the BACKEND                [Claude owns; reached via the seam swap]
```

Each layer is derived from the one above and is the source of truth for its own concern.
Nothing downstream is hand-edited to diverge from its source: if the look is wrong you fix the
design HTML, not the built screen; if a rule is wrong you fix the spec, not a one-off screen.

## 1. What `design/screens/` is, and its role

- The **visual source of truth** per screen — the approved layout, hierarchy, and copy.
- A **read-only INPUT** to implementation. Lovable builds *from* it; it is never itself shipped,
  never imported into `src/`, never wired to a backend.
- Emitted by "Claude design" downstream of the rules spec — so it already reflects the current
  requirements when it lands.

## 2. The handoff — how Lovable consumes a screen (HTML, not screenshot)

The primary channel is the **HTML source**, not a screen capture:

1. Claude Code reads `design/screens/<screen>.html`.
2. Claude Code composes the Lovable build message (`send_message`): the design HTML included as
   the target, plus "implement this as a TanStack route using our shadcn components and the
   fixture seam; build these states: …; obey these rules: …" (pulled from the screen's row in
   `ui-ux-instructions.md`).
3. Lovable rebuilds it as real TanStack + shadcn components in `src/`, reading data through the
   fixture seam (`src/lib/data.ts`).

**Why HTML and not a screenshot:** the design HTML and the target app share the same styling
vocabulary (Tailwind), so structure, spacing, and class intent translate faithfully into
shadcn — Lovable can reuse what's there. A screenshot throws that structure away and forces a
visual re-guess. A rendered screenshot of the design *may* ride along as a visual anchor, but
the HTML is the substance. (This is the opposite of the throwaway-mockup case, precisely
because these screens are finished and share the target's Tailwind vocabulary.)

## 3. The implement-a-screen loop (the first coding steps)

Unit of work = one screen (or a small batch of related screens). Per screen:

```
source → compose → build → boundary-gate → verify(rules + fidelity) → fix(≤2) → sign-off → close
```

1. **Source.** Read `design/screens/<screen>.html` + the screen's row in `ui-ux-instructions.md`
   (its states + rules + which requirement it serves) + the fixture data it needs.
2. **Compose.** One Lovable message per screen/batch (never conversational drip — coherence +
   credit economy): the design HTML + the states to build + the rules to obey + the boundary
   reminder. Batch 0 (design system + shell) goes through `plan_mode=true` first.
3. **Build.** `send_message` → Lovable builds it in `src/`.
4. **Boundary gate (before anything else).** `get_diff`: only `src/` touched (never `supabase/`,
   `tests/`, `design/`, `loop/`); the shared shadcn components reused (not reinvented); the
   fixture seam used (no `fetch`, no Supabase imports in screens). Violations → fix list, stop.
5. **Verify — two targets.**
   - **Rules** (`tests/design/`, automated): renders per state; the never-show scan; money-unit
     discipline; the right-viewer-sees-the-right-thing projection; accessibility basics.
   - **Visual fidelity** (screenshot compare): the built screen's default state vs the rendered
     `design/screens/<screen>.html` — a **soft flag** (surfaces a diff for you to accept or
     fix, not a hard block). Non-default states are held to the rules, not to a design HTML,
     unless Claude design emitted a per-state variant.
6. **Fix.** One consolidated fix message per iteration; **cap two iterations**; still failing →
   stop and surface to you with the gallery and the stuck points.
7. **Sign-off.** The screen goes into the batch gallery Artifact → you approve or annotate.
8. **Close.** Commit (message carries the Linear work-item id, per the adopted way-of-work);
   the approved screenshot becomes the screen's **baseline** (regression reference); the Linear
   work item closes; the design log notes any deviation (folded back to the spec or the design
   HTML — never a silent one-off in `src/`).

## 4. Maintenance — how a PRD change reaches Claude design (and comes back)

The emitter is **Claude Design** (the Anthropic Labs chat-and-canvas product at
claude.ai/design, hosted by the desktop app in its own window — NOT a desktop chat; it shares
no desktop MCP servers/extensions and cannot write to disk itself). Since 2026-06-18 it has a
**native round-trip integration with Claude Code** — the direct analog of the Figma MCP — and
that is our bridge, in three channels (researched + partly verified 2026-07-21):

- **Delivery (design → repo): the "Handoff to Claude Code" export.** In Claude Design:
  Share/Export → *Handoff to Claude Code* → *Send to local coding agent* (or download the
  .zip). The handoff bundle contains the design files (HTML/CSS/JS), **per-state
  screenshots**, a README stating target stack/conventions, and the design-conversation
  context. The founder triggers it once per screen/batch; the build session unpacks the
  screens into `design/screens/` (canonical home), keeps the state screenshots beside them
  (they upgrade the §3 fidelity check from default-state-only to per-state), and commits.
- **Notification + steering (repo → design): the Claude Design MCP server.** Registered for
  Claude Code (user scope, 2026-07-21): `claude-design → https://api.anthropic.com/v1/design/mcp`
  (authenticate via `/design-login` if prompted). Through it the build session can create,
  edit, and sync design projects from here — i.e., express a change order INTO Claude Design
  programmatically. The change-order files in `design/change-orders/` remain the durable git
  record of what was asked; the MCP is the wire. (Fallback wire: Claude Design also reads this
  repo read-only via the desktop trusted-folders bridge, so the founder can just tell it to
  process the open orders.)
- **Component round-trip (repo → design system): `/design-sync` + the DesignSync tool.** The
  founder's Claude Design "Design System" project is reachable and writable from the build
  session (verified via the session's DesignSync tool). After Batch 0 is approved in Lovable,
  the real component library (fuel gauge, status badge, blocker card, shell) gets pushed into
  that project so every re-emitted screen starts from OUR actual components — closing the
  design↔implementation drift at the source.

Once a screen lands and is committed, everything downstream (handoff, verify, maintenance) is
versioned, diffable git — which is more than a live MCP would give us.

The full path a change travels, top-down, always:

1. The requirement changes in the PRD (through the normal decision + `/doc-sync` process).
2. The build session updates the affected screen's rows in `ui-ux-instructions.md` — the
   contract file both sessions read — and commits.
3. The build session writes a **change order**: a short file `design/change-orders/NNN-<slug>.md`
   naming the affected screens, what rule changed (in plain words), and what to re-emit.
   Committed. This file is the message from the build side to the design side.
4. The change order reaches Claude Design (sent over the MCP wire by the build session, or
   the founder tells it to process the open orders — it reads them directly). It re-emits
   ONLY the named screens; the founder triggers *Handoff to Claude Code*; the build session
   unpacks the bundle into `design/screens/`, verifies, and commits.
5. The re-emitted design HTML landing in the repo is the build session's trigger: re-run the
   §3 loop in Lovable for those screens only.

Every hop ends as a committed file the next session reads; the founder is the only scheduler
(when to bring orders to the design session, when to let the build session push to Lovable).
No session needs to remember anything — each reconstructs its task from what's committed.

So `design/screens/` **is** maintained — but always as a *re-emission* downstream of the spec,
never hand-patched to diverge, and never the place a requirement first changes. A screen whose
requirement hasn't changed is never touched. This keeps one top-down flow of truth and no
sideways drift.

## 5. Tracking, the fixture seam, and wiring (how UI meets the rest of the system)

- **Tracking.** Each screen (or batch) is a work item in Linear's PM tree under a **Design**
  grouping — pulled, built, verified, signed off, closed like any other tracked work. Its
  attribution binds to that item, same as the backend way-of-work.
- **The fixture seam is the boundary to the backend.** Every screen reads its data through
  `src/lib/data.ts`, backed by `src/fixtures/`. During UI work it feeds mock data — no backend,
  no auth, no money. Screens never fetch or touch Supabase directly (our standing rule).
- **Wiring (later, not now).** When a screen's requirement is implemented on the backend, its
  implementation loop swaps the seam from "read the fixture" to "call the real edge function" —
  one screen at a time, contract-first, with no change to the screen's own code. The exact HTML
  you approved is the exact HTML that ships. Then the full acceptance tests run against the live
  screen.

## 6. First concrete steps (to actually begin)

1. **Bring-up (once):** load the condensed rules into Lovable's project knowledge; author the
   fixture pack (PM-tree + per-requirement burn content, per the updated `design-session.md`);
   stand up `tests/design/` (the rules checker + the fidelity screenshot compare); record the
   Lovable credit baseline.
2. **Batch 0 first:** the design system + app shell + shared components (fuel gauge, status
   badge, blocker card, the action-needed rail). Hard sign-off gate — every later screen reuses
   these, so nothing else starts until Batch 0 is approved.
3. **Then screens in batch order** (public/onboarding → NGO → volunteer → comms → admin), each
   through the §3 loop, sourced from its `design/screens/*.html`.

## 7. Boundaries / non-goals

- Lovable touches only `src/`. The design HTML in `design/screens/` is input, never edited by
  Lovable and never shipped.
- No backend, no real data, no money, no connectors during UI work — only the fixture seam.
- The built screen is verified against the design HTML (look) and the spec (rules) — never the
  other way around; the design HTML and spec are never "corrected" to match a Lovable quirk.
- This doc governs turning finished design screens into app screens. Producing the design
  screens is "Claude design's" job, upstream; changing what a screen must do is the PRD's job,
  further upstream.
