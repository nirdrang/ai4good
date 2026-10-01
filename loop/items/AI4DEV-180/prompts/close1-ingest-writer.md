# Writer brief: closing round 1, automatic file ingest

You are the writer for one round. Work only in your working directory, a git worktree on branch
`lane/ai4dev-180/close1-ingest`. It holds the whole item so far. Commit your work with messages
that end with `(AI4DEV-180)`. Do not push. Do not launch other agents. Do not touch any other
folder. Do not stop or start any process you did not start yourself. Use PowerShell syntax for
shell commands.

**Commit early.** Commit each step as soon as its checks pass, before you take screenshots. Do not
delete files outside your evidence folder at the end.

**Stop rule.** If an environment problem (a hang, a tool that will not start, a sandbox refusal)
blocks you for 15 minutes, stop. Commit what works, and report the exact command, its output, and
what you tried.

## The founder's decision

The founder decided on 2026-10-01 that a Discovery file is ingested automatically. In the
founder's words: "It should be automatic ingest process I even debate having to ask the funder
anything there and just let it upload and the ingest skill will digest according to the intake
and". Asked to choose, the founder chose "Go automatic now". So the file chat goes: no question
when a file arrives, no pause question during the read, and no question in the main chat about a
file fact.

Read first: `design/discovery-ui-contract.md` (lines 260 to 275 are the files section),
`.taskmaster/docs/acceptance/at-req-004.md` (AT-004.65 to .70), `loop/items/AI4DEV-180/design.md`,
and the code in `src/components/discovery/` and `design/astra/src/`.

## What the screen does after this round

1. **Add a file** opens the same chooser panel as today: the drop area, Choose a file, the accepted
   types, and the sample-data disclosure. Cancel adds nothing. These stay as they are.
2. **Choosing or dropping a file starts the read at once.** No question comes first. The chooser
   closes. The file appears in Your files with "Reading… N%", then "Ready · N facts". The read never
   pauses and never asks anything. The row states that do not exist any more ("A question for you",
   "Reading paused") go, with their copy.
3. **Selecting a file in Your files** opens a read-only file panel in the same place the file chat
   uses today (the right column on desktop, full screen on a phone). It shows the file name and
   size, the read's progress while it runs, and, when it is ready, the facts the AI took from it.
   It has no answer box, no chips and no Send. Closing it returns focus to the control that opened
   it, as today.
4. **A read costs nothing.** It uses no reply, no free turn and no fuel. The usage card does not
   change when a file is added or read.
5. **The facts go into the brief without a question.** When a read finishes, the file's facts
   appear in the brief's files block ("The AI took from it: …"), marked as coming from that file.
   A file fact does not agree a topic: topics are still agreed by the NGO in the chat. The next main
   chat reply after a read still says, in one sentence, what the file showed (AT-004.68), and asks
   nothing about it. Remove the "Is that right? I add it to your brief when you agree." text and the
   "Suggestion · waiting for you" marker for file facts, and remove the file-fact entries from
   `brief.suggestions` if nothing else needs them.
6. **A read must never change a confirmed brief.** Finish Discovery stays unavailable while any
   file is still reading, and its hint says so in plain words (for example: "A file is still being
   read. You can finish when it is ready."). After confirmation, Add a file stays disabled with the
   existing finished note. This replaces the old hold of the pause question while confirmed.
7. **The limit of three Discovery files for an unfunded project** (AT-004.70) is unchanged. Intake
   files still do not count.
8. **The first AI reply** still asks for files while the project has fewer than three (AT-004.65).

## Code that goes

Remove what only the file chat needed, and nothing else: the file chat transport in
`design/astra/src/fixture-transport.ts`, the `fileChat` member of the port in
`src/components/discovery/port.ts` (replace it with one call that uploads a file and starts its
read, for example `addFile(file): Promise<Result<DiscoveryFile>>`, returning the created file with
its id, so the client never matches files by name), the file chat state in `use-discovery.ts` (the
held chats, the staged entry, the idle chat, the file drafts, `sendFileAnswer`, the pause question
injection), the file chat view in `model.ts`, the pause and resume logic in `fixture-world.ts`
(`pauseRead`, `heldQuestions`, `releaseHeldQuestions`, `questionStillOpen`, the file chat store),
the file chat copy in `a11y.ts`, and the file chat parts of `FilePanel.tsx`. Remove the
`file-chat-turn` model-call probe. Keep `file-read`. Keep the read progress timers. The stored
world in localStorage gets a new version in its key, so an old stored world with file chats is not
loaded.

## Contract and acceptance text

Change the documents to match the decision, and name the founder's decision with its date in each:

- `design/discovery-ui-contract.md` lines 266 to 272: the file chat, its question, its pause and
  "Each NGO answer in the file chat is one reply" go. Write the new flow from the list above in the
  file's own style (ASD-STE100: short sentences, active voice). "A file fact enters the brief only
  after the NGO agrees" becomes: the read's facts enter the brief, marked as from the file. Search
  the whole contract for other mentions of the file chat and change them too.
- `.taskmaster/docs/acceptance/at-req-004.md`:
  - AT-004.66: keep the chooser half (drop area, Choose a file, accepted types, disclosure, cancel
    adds nothing). Replace the file chat half: choosing or dropping a file starts the read with no
    question; the file list shows reading progress, then Ready with the number of facts; closing
    the panel does not stop the read; selecting the file opens a read-only view of its progress and
    facts.
  - AT-004.67: a file read consumes no turn, no free-turn charge and no fuel, and the usage display
    does not change. Keep its cross-reference to REQ-032.
  - AT-004.68: keep the main-chat progress, the report in the next reply and the digest at the
    context boundary. Replace the last sentence: the file's facts enter the brief marked as from
    the file, and no question about them is asked.
  - Search all of `.taskmaster/docs/acceptance/` and `loop/decomp/` for the file chat ("file chat",
    "file-chat") and for "each answer" about files, and change each mention to match. Do not change
    any other requirement's meaning.
- `design/astra/discovery-review.md`: add a short entry under the section "Revision 12 built on
  fixtures" that records the decision, quoting the founder exactly as above, and lists what left.

## Tests

The acceptance ids stay; their bodies change with their text.

- AT-004.66 body: the chooser checks stay. Choosing a file starts the read with no question, the
  row shows Reading then Ready with the fact count, closing the panel keeps the read going, and
  selecting the file opens the read-only panel with no answer box. Remove the file chat, pause,
  lock and reload-question checks that no longer describe the screen.
- AT-004.67 screen half: adding and reading a file leaves the usage card's values unchanged and the
  model-call record shows `file-read` and no turn. It stays pending for its backend half, as today.
- AT-004.68 screen half: the next main reply after a read carries the one-sentence report and no
  question; the brief's files block shows the facts. It stays pending for its backend half.
- Add to the finish flow body: while a file is reading, Finish Discovery is unavailable with the
  hint; after the read is ready, it is available.
- Every other assertion stays green. Do not loosen an assertion to pass. If a declared count in
  `tests/at/expected/req-004.json` must change, change it only because a test's state really
  changed, and say which and why.

## Checks (all must pass; run them yourself)

1. `bun run typecheck` exits 0.
2. `bun run at:selftest` exits 0.
3. `bun run at:check req-004` exits 0.
4. `bun run at:verify req-004 --tier loop --expect` exits 0 and matches.
5. Screenshots under `loop/items/AI4DEV-180/evidence/close1/`: Your files with a reading row and a
   ready row (desktop light), the read-only file panel on desktop light and phone (390x844) light,
   one dark shot of the panel, and the Finish Discovery hint while a file reads. The fixture shell
   runs with `bun run design:astra` on 127.0.0.1:4310; if that port is taken by a process you did
   not start, use `bun run design:astra:build` then `vite preview` on another port. Stop any server
   you started.

## Your final response

The commits (hash and subject), each check with its exit code and counts, every document line you
changed (file and line range), and anything you could not do and why.
