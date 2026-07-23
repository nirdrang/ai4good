---
name: doc-sync
description: The ai4good documentation-change ritual and git→Linear forward sync. Use /doc-sync after any commit touching pure sections, AT suites, or decomp manifests; /doc-sync check for drift detection only; /doc-sync fold to be walked through a full change bundle (decision → edit → assembly → AT → manifest → commit → artifact → sync).
---

# doc-sync — the change ritual + git→Linear sync (WoW §8a)

**The one rule this skill enforces: changes flow git → Linear, never backward.** Linear
holds pointers and a sync-stamp per PM item; the repo is the only place meaning changes.

## Invocation modes

- `/doc-sync` — forward-sync now: push the repo's current state to the affected Linear
  PM items (use after a change bundle has been committed).
- `/doc-sync check` — drift detection only: report which PM items are behind, touch
  nothing.
- `/doc-sync fold` — guide the operator through a FULL change bundle from scratch
  (steps 1–7 below), ending with the forward sync.

## The change bundle (fold mode; steps 1–5 are the same ritual used for d66–d82)

1. **Classify** the change: (a) implementation detail → `architecture-notes.md` only, no
   sync needed; (b) test wrong → AT file amendment only (+ manifest verify-set if
   affected); (c) requirement text → full bundle below, with a dNN decision (codex breaker
   first if it is a cross-requirement tension; founder ruling if it is a product choice);
   (d) new scope → founder acceptance BEFORE anything else.
2. **Edit the owning pure section** (`loop/out/pure-s*.md`) — never `prd-mvp.md`, never an
   isolate.
3. **Assemble + verify** with the COMMITTED tool chain (crystallized 2026-07-22 after the
   original scratchpad script was lost — tools live in the repo, never in a session
   scratchpad):
   - `powershell -File loop/assemble-pure.ps1` — assembles `prd-mvp.md` from the pure
     sections and runs the gate (30 REQ headings, RM bijection vs roadmap.md,
     0 decision-refs, 0 banned words, 0 FFFD). `-Check` mode verifies + diffs without
     writing — run it BEFORE editing to prove faithfulness.
   - `powershell -File loop/extract-isolates.ps1 -Reqs 0NN,0MM` — regenerates the touched
     isolates (explicit UTF-8, surgical: only the named requirements).
   - `powershell -File loop/decomp/check-tree.ps1` — re-proves the P0↔leaf bijection per
     requirement and the whole depends-on graph's topological order.
   If a requirement changed and its `at-req-0NN.md` was not touched in this working tree,
   WARN and resolve deliberately (amend or state why no test changes).
4. **Amend the AT file(s)** with `[dNN]`-tagged notes; update `loop/decomp/req-0NN.md`
   if deliverables, verify sets, or dependencies moved.
5. **Design branch — when the change touches anything an NGO, volunteer, or visitor SEES**
   (screen content, copy, components, states, vocabulary). Follow design/ui-way-of-work.md
   §4 exactly — Claude Design has NO filesystem access and cannot write to disk; the MCP
   is the only wire:
   a. THIS session updates the affected screen rows in `design/ui-ux-instructions.md`
      (the rules doc is repo-side and build-session-maintained).
   b. THIS session writes the change order (`design/change-orders/NNN-<slug>.md` — the
      ruling, the changed requirement text verbatim, the affected screens/rows), commits
      it (the durable record), and pushes it into the design project's chat panel via
      `put_conversation` (it lands as a read-only synced thread, never an executable
      prompt).
   c. The FOUNDER triggers "process change order NNN" in the design conversation;
      Claude Design re-emits the affected screens inside the design project — it never
      touches the repo.
   d. THIS session pulls the re-emitted screens back into `design/screens/` over the
      design MCP and runs the design gate. The build session never authors or edits
      screen HTML directly — screens are only ever re-emitted by Claude Design.
   (Reverse direction: design-gate findings reach this side as founder-relayed messages
   and START a fold — the d86 anchoring ruling is the worked example.)
6. **Log the decision** (`loop/state/decisions.jsonl` via Add-Content of a scratchpad
   file), **commit everything as ONE commit** (message cites the dNN and, if in-flight
   work is affected, the PM item), **republish the review artifact**.
7. **Forward sync** (the `/doc-sync` core — see below).
8. **Report**: one summary naming the dNN, the touched PM items, any re-pins, and the
   change-order number if the design branch fired.

## The forward sync (core procedure)

Inputs: the decomp manifests (`loop/decomp/req-0NN.md`, which record each PM item's
Linear ID) and git history.

1. **Compute the delta**: for each manifest, read its recorded PM item over the Linear
   MCP and extract the `sync-stamp:` line from the item description. `git diff
   <stamp-commit>..HEAD -- <manifest> <isolate> <at-file>` decides whether the item is
   affected. (Before manifests exist, fall back to: items named by the change commit.)
2. For each affected PM item, over the Linear MCP:
   - `save_issue`: rewrite the cover-sheet description — pointers (isolate, AT file,
     manifest, architecture anchor), done contract with current P0 count, dependencies —
     and bump `sync-stamp: <commit> · <dNN> · <date>`. Update blocking relations if the
     dependency graph moved.
   - `save_comment`: ONE change comment — `[SYNC dNN <commit>] <one-sentence what
     changed>`.
3. **Per requirement state**:
   - **Unpulled**: cover sheet + stamp only. (No dev tree exists — nothing else to do.)
   - **Pulled (In Progress)**: additionally post a **RE-PIN** comment on the PM item
     (`[RE-PIN] manifest revision → <commit>`) — `/done` verifies against the newest pin —
     and reconcile the live dev tree against the new manifest: create missing dev items,
     cancel removed ones (with a comment), never duplicate.
   - **Done**: NEVER edit. Flag to the founder: reopen (→ Todo via the audited path, fresh
     pull) or spawn a follow-up PM item. Record the choice as a comment on the item.
4. **Failure handling**: Linear MCP unreachable → touch nothing, list the pending item
   syncs in the session banner, retry on the next `/doc-sync`. Partial sync (some items
   written, then failure) is safe: stamps make the remainder detectable — just rerun.

## Drift check (`/doc-sync check`; also runs inside the daily reconcile)

For every manifest-recorded PM item: read its stamp; compare against HEAD for its files.
Report three lists, touch nothing: **behind** (stamp older than last relevant commit),
**unknown** (item missing its stamp or missing in Linear), **orphan** (Linear item no
manifest claims). Anything non-empty goes in the session banner until resolved.

## Boundaries

- This skill NEVER changes requirement meaning, closes items, or moves work-item status —
  it mirrors the repo and annotates. The work verbs live in the work skill (`/next`,
  `/done`, `/blocked`, `/override`).
- Backward direction is a proposal only: findings during work get a label + comment on
  the item and enter this skill at step 1 as a classified change.
- Buildout-scoped. (The product's one-shot scope-doc → PM-tree seeding at kickoff may
  later borrow the cover-sheet + stamp conventions, but has no live-sync requirement.)
