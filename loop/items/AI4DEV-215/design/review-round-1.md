# Review round 1: interrogate verdict and Codex user review

Reviewers: A, Codex gpt-6.1-sol at high (8 findings); B, Grok grok-4.7 at xhigh (8); C, Claude Opus at high (17). Codex user review round 1 (gpt-6-astra at low, `codex-review/round-1.md`): 6 interactions that do not work.

## Act on

1. **The screen copies backend rules** (A, B, C). `model.ts` repeats `canAffordReply`, the funds band and check-passed-for-revision, and the copies already differ (`total > 0`). Fix: the snapshot carries the funds band, a per-chat send availability (covering role, busy, closed and funds, with a reason), and which path Close PRD takes. Delete the copies from the screen. `fundsBand` and `checkPassedForRevision` get their callers in `toSnapshot`.
2. **Close PRD uses an `invalid` refusal as a signal** (B, C). Fix: the snapshot's close state says `close` (act) or `check` (enqueue `close-check`). Remove the refusal branch.
3. **A refused send loses what the user typed** (A, B, C). A refused main-chat message and a refused Use answer drop their text, and the review drafts are cleared before the server accepts. Fix: keep the item until success; on refusal put a text item back in the composer and a use-answer back in the review drafts; clear review drafts only on success.
4. **The queue does not resume** (A, B, C). `pump` runs only on offer and on main finish. Fix: one settle point that also runs on every installed snapshot.
5. **Technical scope can be confirmed before its prerequisites** (A, B). Fix: the rules refuse confirm (unavailable, with a reason) while a dependency is neither ready nor confirmed; the `prd-today` seed gets its Ready to confirm state from a topic whose prerequisites are met, keeping all five states.
6. **A reply that finishes after close changes the frozen revision** (A). Fix: Close PRD is unavailable while any reply or backend job is running ("Wait for the AI to finish."), and a finish handler never mutates a closed record.
7. **A backend-started turn is invisible** (B, C). The automatic completion check and the answer write-up do not mark their chat busy in the snapshot. Fix: project busy into the per-chat send availability; the screen shows Answering for it and the queue treats it as busy.
8. **Use answer and Close PRD can be queued twice** (C). Fix: the use reserves the question when it starts (`canUse` false at once); a second `close-check` is refused while one is queued or running.
9. **The last confirm silently drops the check when funds are short** (B). Fix: refuse that confirm with `funds`.
10. **No teardown** (C). Queued messages still send after the screen unmounts. Fix: on unmount stop each chat and drop the queue.
11. **The NGO notice is missing on her phone landing tab and while a topic is open** (B). Fix: render the read-only banner from both layouts, outside the tab and the center column.
12. **Edit merges a queued message into a non-empty draft** (B). Fix: Edit is available only while the composer is empty.
13. **View answer is hidden when funds are out** (A). Viewing is free. Fix: separate view visibility from Use answer availability.
14. **A newer check erases an older check's gaps from history** (A). Each check is a separate revision-linked event (AT-036.08). Fix: keep each check's gaps with its message.
15. **Reload can lose the last draft edit** (A). Fix: a navigation-safe flush (`pagehide`), and the reload tests stop waiting 500 ms first.
16. **Side-chat follow-up decided by a trailing question mark** (B). Fix: decide it from the script and the stored evidence, never from punctuation.
17. **Codex: three topic chats open with stale text** (all-ready: Data handling and Success criteria say they wait for Maya after her answer was used; Users and roles says confirmed while in Needs review). Fix: a topic chat's opener matches the topic's state when the scenario starts.
18. **Codex: dark theme section labels are pale on pale cards.** Fix the screen's dark-theme contrast (the shell logo is out of scope).

Small ones to fix in the same pass: the selection-to-layout mapping written twice (C9); `parseRefusal` should validate the kind with zod (C10); a failed snapshot parse should surface, not vanish (C11); the recursive schema holder (C12); dead code (C13); the "Still open" count mixing required and non-required topics (C15); a unit selftest for the pure outbox, and a queue acceptance test that does not race the 3-second hold (C16); the selftest example viewer `Maya Levi` (C17).

## Consider

- One `useConversation` hook and one chat input for the three conversations (C8). Do it if the fixes touch those components anyway.

## Noted

- The optimistic message texts repeat the backend's strings (C14); at wiring the edge function owns them.
- Duplicated test helpers across `_flows.ts`, `_phrases.ts`, `_world.ts` and the selftest (C17).

## Dismissed

- Codex: changes survive a reload. Required by AT-036.02; the review prompt was wrong.
- Codex: the threshold placeholder. A pilot decision the founder ruled on.

## Agreement map

All three models found the duplicated rules, the lost text on refusal, and the stuck queue: the clearest signal. Sol was the only reviewer to reproduce state bugs end to end (close versus a running reply, the stuck queue with exact amounts). Grok alone found the silently dropped check and the missing NGO notice. Opus covered structure and teardown. No reviewer contradicted another.
