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
3. **Assemble + verify**: run the assemble script. Confirm the gate is green (word count,
   30 REQ headings, RM bijection, 0 decision-refs, 0 banned words, 0 FFFD). Isolates
   regenerate with it. If a requirement changed and its `at-req-0NN.md` was not touched in
   this working tree, WARN and resolve deliberately (amend or state why no test changes).
4. **Amend the AT file(s)** with `[dNN]`-tagged notes; update `loop/decomp/req-0NN.md`
   if deliverables, verify sets, or dependencies moved.
5. **Log the decision** (`loop/state/decisions.jsonl` via Add-Content of a scratchpad
   file), **commit everything as ONE commit** (message cites the dNN and, if in-flight
   work is affected, the PM item), **republish the review artifact**.
6. **Forward sync** (the `/doc-sync` core — see below).
7. **Report**: one summary naming the dNN, the touched PM items, and any re-pins.

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
