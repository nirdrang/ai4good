# Interrogate verdict: the whole item diff against main

Run on 2026-10-01 at bec2312. Five lanes from the interrogate reviewers row: GPT-6 Astra at medium
(6 findings, pinned argv), Muse 1.3 at xhigh (16, provider-verified), Grok 4.7 at xhigh (8,
provider-verified), Opus at high (15, native lane), DeepSeek V4.1 Flash at max (7,
provider-verified). The raw reports are beside this file.

## Act on

| # | Finding | Raised by | Fix |
|---|---|---|---|
| A1 | A file read that finishes after confirmation raises the brief revision and adds a suggestion; the finished page then shows revision N+1 as confirmed revision N. | Astra, Opus, DeepSeek, Grok | `finishRead` holds while confirmed, like `pauseRead`; a saved change releases it. `acceptSuggestion` and `removeCauseLabel` refuse while confirmed, like `askTopic`. |
| A2 | A send shown as Free can settle as Paid when the main chat and the file chat race (contract lines 124-125). | Astra, Opus, Grok | The chat and file-chat bodies carry the shown mode; the world refuses `mode-changed` before it charges. |
| A3 | The model-call probe counts a turn before the world can still refuse it. | Muse, Grok | Report the call only after the world accepts the turn. |
| A4 | `askTopic` returns the topic id where a question id is needed. | Muse, Opus, DeepSeek | Take the question id from the returned brief. |
| A5 | Buy fuel shows only when both free limits are zero, has no action, and the free fill ignores the beta limit (contract lines 146, 163, 164, 205). | Astra, Opus, Grok | Show Buy fuel when the next reply is not free; an `onBuyFuel` prop; the free fill uses the more consumed limit. |
| A6 | A completed send clears text typed into the composer or answers during the stream. | Astra | Clear a draft only when it still equals what was sent. |
| A7 | View on a Not sure row, or on a seeded answer with no message, does nothing. | Astra, DeepSeek, Muse | Offer View only when a target exists. |
| A8 | With a Not sure topic left, the reply says "Nothing is left to ask", and the streamed question tail drops agreed topics that need review. | Muse, Grok | Both use `topicSettled`. |
| A9 | Changing an earlier answer through Send or Use the suggestion does not mark dependent answers for review (contract lines 105, 169). | Grok | `markDependents` on those paths too. |
| A10 | The open-questions tick stays checked after the open set changes. | Grok | The tick keeps the open count it was given and clears when the count changes. |
| A11 | `ServerChange` has no confirmation, so the other mounted controller goes stale and `saveChange` makes an extra load. | Muse, Opus, Grok | Add `confirmation` to `ServerChange`; both controllers take it; drop the extra load. |
| A12 | A port rejection leaves the review controller busy forever and is never shown. | Opus | try/finally and a shown error on each review call. |
| A13 | A refused send leaves the user line in the chat, and the world stores it. | Opus | Remove the trailing user line on a refusal. |
| A14 | Under StrictMode the fixture world is built twice in development, so two worlds run timers on one storage key. | Opus | Cache the world per scenario and pace outside render. |
| A15 | Small defects: duplicate React keys for repeated paragraphs; a DOM write inside a `useState` initializer; the compact progress observer can never fire because the frame does not scroll (the strip is always visible, which meets contract line 189); dead `ask` mode; screen-driver wrappers with no callers; Discovery parts of the old mock model that this change orphaned. | Muse, Opus, DeepSeek | Fix or delete each. |

## Consider (asked of the founder)

- C1. The main-chat file report asks "Is that right?" but no control answers it (contract line 272). Opus, Grok.
- C2. The data acknowledgment ignores the data tier: Tier 0 needs none, Tier 2 needs the fixtures-only wording. Opus.
- C3. The shell dashboard and fuel page still read the old mock confirmation and balance. Opus, Grok.
- C4. The acceptance file grows past 1000 lines, and `use-discovery.ts` holds two state machines. Opus, Grok, DeepSeek.

## Noted (phase 3 or low impact)

- The created file id and the pause question do not cross the port; the client matches by name and writes the question into the chat store. Phase 3 changes the stream (Opus, DeepSeek).
- "Not sure" crosses the port as display copy; `sectionId` is an untyped string (Opus).
- A paid reply settles the whole hold at once and never shows Usage pending (Grok). The fixture scripts money; phase 3 owns settlement.
- `isState` checks only the top level of a stored world (Muse). Shallow, fixture only.
- `held` file chats are never evicted (Muse). At most three files while unfunded.
- Opening another panel drops a chosen file that has no answer yet (Muse). Matches the board: the file commits with its first answer.
- `openChooser` does not read confirmation; the Add control is already disabled (Muse).
- A render-phase ref write in `Conversation` (Muse). A common pattern; no aborted-render bug traced.
- Six validation failures in `requestOf` share one message (Opus, DeepSeek).
- The theme effect stores the default on first mount (Opus).
- Repeated code: the phone dialog classes, the growing textarea, two matchMedia hooks, the doubled uppercase headings, two section builders (Opus, DeepSeek).

## Dismissed

- Send drops a reopened answer (Muse): a reopened question saves through Save change, and its draft stays.
- CI installs Chromium through `playwright-core` (Muse): its CLI has `install --with-deps`; CI on the pull request is the check.
- The usage bar's fixed free segment (Muse): it is the revision 12 board.

## Agreement map

Four of five lanes found the read that changes a confirmed brief, the strongest signal of the run;
the screen tests stop at the paused state, so the explorer loop never reached it. Three lanes each
found the Free-to-Paid race, the topic id returned as a question id, and the usage card gaps.
Grok alone found the dependents and tick defects, Astra alone the composer loss, Opus alone the
stuck busy state and the StrictMode double world. Muse produced the most findings and the most
dismissals. No lane contradicted another.
