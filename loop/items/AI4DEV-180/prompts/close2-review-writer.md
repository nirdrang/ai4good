# Writer brief: closing round 2, the review panel's fixes and the founder's calls

Follow `loop/items/AI4DEV-180/prompts/close1-ingest-writer.md` for the rules (the worktree, the
commits, commit early, the stop rule, PowerShell), with these changes:

- Your working directory is a git worktree on branch `lane/ai4dev-180/close2-review`. It holds
  closing round 1: Discovery files are ingested automatically and the file chat is gone.
- Evidence goes under `loop/items/AI4DEV-180/evidence/close2/`.

A five-model review panel read the whole item. The lead's verdict is
`loop/items/AI4DEV-180/evidence/interrogate/verdict.md`; the lane reports are beside it and cite
file lines. Line numbers there are from before round 1 and may have moved. Some findings went away
with the file chat in round 1; skip a fix that has nothing left to fix, and say so.

## Fixes from the verdict

A1. **A confirmed brief never changes without reopening Discovery.** In `fixture-world.ts`,
    `acceptSuggestion` and `removeCauseLabel` refuse with `finished` while Discovery is confirmed,
    as `askTopic` does. Round 1 already keeps a read from finishing after confirmation; check it.
    In the client, add one model helper that says whether the confirmation is for the current
    revision, and use it wherever the screen decides "finished".
A2. **A send shown as Free never settles as Paid** (contract lines 124 and 125). The chat request
    body in `src/lib/discovery-stream.ts` carries the mode the Send button showed
    (`expectedCharge: "free" | "paid"`). The world refuses with a `mode-changed` refusal before it
    charges when the mode differs, and the screen then shows the refreshed mode and keeps the draft.
A3. **The model-call record counts only accepted turns.** Report `chat-turn` after the world
    accepts the turn, not before.
A4. **`askTopic` returns the question id.** In `useDiscoveryReview.askTopic`, take the id of the
    question for that topic from the returned brief.
A5. **The usage card** (contract lines 146, 163, 164, 205). Buy fuel shows whenever the next reply
    is not free, with its $50 note. The free part of the bar uses the more consumed of the daily and
    beta limits, the same value that sets its colour. `UsageCard` takes an `onBuyFuel` callback;
    the Discovery screen passes it through from its props, and the shell opens its fuel page.
A6. **A finished send never clears text typed during the reply.** Clear the composer only when it
    still holds the note that was sent, and clear an answer draft only when it still equals the
    answer that was sent.
A7. **View works or does not show.** The Questions card offers View only when the answer has a
    message to scroll to. A Not sure row and an answer with no message get no View.
A8. **One meaning of "still open".** In `applyTurn`, the "Nothing is left to ask" sentence and the
    streamed question list both use `topicSettled`. A Not sure topic counts as open; an agreed topic
    that needs review is still listed.
A9. **Dependents are marked on every answer change.** `applyTurn` and `acceptSuggestion` call
    `markDependents` when a topic's answer changes, as `saveBriefEdit` does (contract lines 105 and
    169).
A10. **The open-questions tick clears when the open set changes.** Store the open count with the
    tick, as the review tick stores its revision, and treat the tick as unticked when the count
    differs.
A11. **The confirmation crosses the port in pushes.** Add `confirmation` to `ServerChange` in
    `port.ts`; `commit` in the world sends it; both controllers take it; `saveChange` no longer makes
    the extra `port.load()`.
A12. **A port rejection never sticks the review page.** Every review call (`saveBriefEdit`,
    `acceptSuggestion`, `askTopic`, `removeCauseLabel`, `finish`) clears its busy state in a
    `finally` and shows the error next to the control that failed.
A13. **A refused send leaves no ghost line.** After a refusal, remove the user line that the chat
    added for that send. The drafts stay. The world builds the stored user line from the request,
    not from the client's message list.
A14. **One fixture world per scenario and pace.** Build the world outside render (a module cache
    keyed by scenario and pace), so React StrictMode in development does not start two worlds that
    write to one storage key.
A15. **Small defects.** Paragraph and filed-topic keys use the index, not the text. The shell's
    theme setup does not write to the DOM inside a `useState` initializer. Remove the compact
    progress observer in `ProgressStrip.tsx`: the frame does not scroll, so the strip is always
    visible, which meets contract line 189. Remove the `ask` mode if nothing sends it. Remove
    `createScreenHost` and `bindScreenPage` from `tests/at/harness/screen.ts` if nothing calls them.
    Remove the Discovery parts of the old mock model in `design/astra/src/model.ts` and
    `questions.ts` that nothing calls any more, and the shell's old Discovery scenario picker if it
    no longer drives anything.

## The founder's calls

F1. **The data box follows the data tier.** Founder, 2026-10-01: "For the box yes I want the box
    and yes it should be adapted according to the data". On the Finish Discovery card, the data
    checkbox depends on `brief.dataTier`:
    - Tier 0 (no personal information): no data box, and Finish does not need it.
    - Tier 1 (ordinary personal information): today's sentence.
    - Tier 2 (sensitive information): a box with this sentence: "Our NGO keeps real sensitive data
      out of the build. The volunteer and the AI work only with fake or anonymized records." Keep
      the "In practice" line under it in the same style.
    The port's `finish` acks carry `data: boolean` (true when the box was shown and ticked, false
    when no box was shown). The world refuses a finish of a Tier 1 or Tier 2 brief without it. The
    confirmed scenarios `confirmed-tier-1` and `confirmed-tier-2` and one Tier 0 given show each
    case; add a Tier 0 finish given if none exists. Add the copy to the provisional copy list in
    `design/astra/discovery-review.md`.
F2. **The shell after Finish Discovery tells one story.** Founder, 2026-10-01: "fix it". In
    `design/astra/src/`:
    - The dashboard reads the finish state from the Discovery fixture world (the same port the
      Discovery screen uses). After finish, "Needs your attention" and the next step point to
      volunteer match, and Continue opens volunteer match.
    - The fuel page reads and writes fuel through the same fixture world: a purchase raises the
      available fuel that the Discovery usage card shows. Add a world member for it if the port
      needs one; the shell is the only caller. Buying fuel never adds free replies.
    - Buy fuel on the usage card opens the fuel page. "Return to your project" goes back to the
      Discovery page the person came from, or to the finished review when Discovery is finished.
F3. **A green check on finished steps in the sidebar.** Founder, 2026-10-01: "the side bar after a
    step is finished should have the green v sign so its clear which steps are already acomplished".
    In the shell sidebar's current-project steps, a finished step shows a green check icon in place
    of its number, with the theme's ok colour, and an accessible name that says the step is done
    (for example "Discovery, done"). Intake is done once intake is submitted. Discovery and
    Discovery review are done once Discovery is confirmed for the current revision. A change that
    reopens Discovery removes their checks. Check both themes.

## Tests

Add assertions to existing bodies, without new ids, where the screen part is visible:

- The finish flow: Tier 0 shows no data box and finishes; Tier 2 shows the fake-records sentence.
- The usage body: with daily replies used up, beta left and no fuel, Buy fuel shows; selecting it
  opens the fuel page.
- The send body: text typed in the composer while a reply streams survives the reply.
- The Questions card body: a Not sure row has no View.
- The change-reopens body: after confirmation, the sidebar shows the Discovery check; after the
  change that reopens Discovery, it does not.
- Keep every current assertion green. Do not loosen an assertion to pass.

## Checks (all must pass; run them yourself)

The four checks from the round 1 brief, then screenshots under
`loop/items/AI4DEV-180/evidence/close2/`: the finish card at Tier 0, Tier 1 and Tier 2 (desktop
light); the dashboard after finish; the fuel page after a purchase with the Discovery usage card
beside it in a second shot; the usage card with Buy fuel; the sidebar after finish in light and
dark. Stop any server you started.

## Your final response

The commits (hash and subject), each check with its exit code and counts, each fix with done or
skipped and why, and anything you could not do.
