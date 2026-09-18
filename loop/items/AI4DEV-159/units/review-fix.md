# Review fix: the chat page after the five-lane review

You are the writer lane. Read `loop/items/AI4DEV-159/brief.md`, then
`loop/items/AI4DEV-159/how/explanation.md` sections 6 to 8 (the stream, the stop, the read),
then `loop/items/AI4DEV-159/decisions.tsv` (the lead's rulings on the review) and the five
review files under `loop/items/AI4DEV-159/review/` (`astra.md`, `grok.md`, `muse.md`,
`deepseek.md`, `opus.md`). Every "act on" row in the decisions file is your scope. Nothing
else is. You work in this worktree on `lane/ai4dev-159`, one commit.

## The page, redesigned around three facts held in state

`src/routes/discovery/$organizationId.$projectId.tsx` and `src/lib/discovery-chat.ts`.

State shape, before any logic:

- `session`: `unknown` | `signed-out` | `signed-in`. Start at `unknown`; `onAuthStateChange`
  fires `INITIAL_SESSION` on subscribe and settles it. Render nothing while unknown.
- `history`: `loading` | `loaded { turns }` | `failed { reason }`, loaded once after sign-in.
  `readConversation` wraps its whole body in try/catch and returns `failed` with the error
  message on a thrown fetch. The failed view has a Retry button that reloads.
- `allowance`: `Allowance | null`, one state in the chat component, set from every
  conversation read and from `onData` of `useChat` when `part.type === "data-turn"`
  (`part.data.allowance`). `allowanceFromMessages`, `allowanceFromTurnData` and the `??`
  fallback are deleted.
- `settling`: boolean. True from a Stop press (or an in-stream error) until the settle poll has
  been applied. `busy = settling || status === "submitted" || status === "streaming"`. Send
  is disabled while busy; Stop is enabled only while `status` is submitted or streaming.
- `refusal`: `Refusal | null`, as today.
- `notice`: `string | null`, a plain line for "the stopped turn is still settling" or a failed
  reread's reason, shown above the composer and cleared on the next send.

No remount. Delete `chatGeneration`, the `key`, `onStopSettled`, `reloadAfterStop`,
`stoppingRef`, `previousStatus` and the status-transition effect. `useChat` gives
`setMessages`; use it.

The stop, in one handler:

```ts
async function onStop() {
  setSettling(true);
  await stop();
  await settle();
}
```

`settle()` runs the poll below, then on `loaded` calls `setMessages(messagesFromTurns(turns))`
and `setAllowance(allowance)`; on `still-open` sets `notice` and leaves messages and allowance
as they are; on `failed` sets `notice` to the reason and leaves messages and allowance as they
are; then `setSettling(false)`.

The poll, in `src/lib/discovery-chat.ts` as a pure async function that takes a `read`
callback so the selftest can drive it: `pollUntilTurnSettled(read, knownMaxSeq, { deadlineMs:
20000, intervalMs: 500 })`. It reads until the turns hold a turn with `seq > knownMaxSeq`
whose `status !== "open"`, and returns `{ kind: "loaded", turns, allowance }`; returns
`{ kind: "still-open" }` at the deadline; returns `{ kind: "failed", reason }` when a read
fails. `knownMaxSeq` is the highest `seq` the page has seen before the send: keep it in a ref
updated from every read. The explanation, section 7, says why the predicate is on `seq`: a stop
that lands before the reserve leaves no open turn to wait for, and the row appears later.

`onError`, classified by `refusalFromResponseText(error.message)`:

- If the text parsed as JSON with a `reason` (a refusal before any stream byte): set
  `refusal`, remove the optimistic user message (the last message when its role is `user`)
  through `setMessages`, and put its text back into the draft.
- Otherwise (an `error` part inside a 200 stream, or a transport failure): set `refusal` with
  the raw text and run `settle()` as after a stop, because the server reserved a turn and will
  settle it.

`onSend` clears the draft only after `sendMessage` resolves without throwing; a throw restores
it. Keep the empty catch out: `sendMessage` reports through `onError`, so `await` it and let
a throw restore the draft.

Boundary guards in `src/lib/discovery-chat.ts`:

- `DiscoveryTurn` shrinks to the four consumed fields: `id: string`, `seq: number`,
  `status: "open" | "settled" | "failed" | "abandoned"`, `userMessage: string`,
  `assistantMessage: string | null` (five, with `seq`). Keep the one-line doc comment naming
  `DiscoveryTurnView` as the source.
- `isDiscoveryTurn(value)` and `isAllowance(value)` guards. `parseConversationBody(text)`
  returns `{ kind: "loaded", turns, allowance }` or `{ kind: "failed", reason }`; a body whose
  turns fail the guard is `failed` with the reason `"the conversation read has an unexpected
  shape"`; an `allowance` that fails the guard becomes `null`, not a failure.
- `messagesFromTurns` and `refusalFromResponseText` stay as they are.

Remove code the redesign makes dead. Do not add features beyond this list.

## The verify skill

`.claude/skills/verify-ai4good/scripts/prepare-chat-page.ts`:

- Declare `let organizationId = ""` and `let projectId = ""` (and `email`, `orgName` if they
  sit below a `fatal`) above the first `fatal` call, assign later. `flush` must run on every
  abort.
- One `send(message)` helper for the drain: post, on 401 sign in again and post once more,
  return the answer. The loop ends on any 409; `drained` is true when the kind is
  `daily-allowance-exhausted` or `debit-exceeds-remaining`, and the printed JSON carries
  `drainedKind`. Any other status is fatal.
- Add `apiUrl: stack.apiUrl` to the printed JSON.

`.claude/skills/verify-ai4good/features/discovery-chat-page.md`: before "Open
`http://localhost:8080`", add the `.env.local` step: two lines, `VITE_SUPABASE_URL=<API_URL>`
and `VITE_SUPABASE_PUBLISHABLE_KEY=<ANON_KEY>` from `bunx supabase status -o json`, git-ignored,
and the sentence that without them the page signs in against the hosted project and every
sign-in fails. Say the printed `apiUrl` must equal the page's `VITE_SUPABASE_URL`.

`.claude/skills/verify-ai4good/features/README.md`: the "not mapped yet" sentence no longer
says the web UI is a placeholder; it names what is still unmapped (the other screens and the
OAuth consent step).

`.github/workflows/ci.yml` line 17 to 18 comment and `.github/runner/Dockerfile` line 29
comment: they name "the ownership guard"; reword to the diff-scope step and the item-id guard.
Comments only.

## The selftest

`tests/at/harness/discovery-chat.selftest.ts`, vitest, importing from
`../../../src/lib/discovery-chat.ts`. Cases: `messagesFromTurns` with a settled turn, an open
turn (user only) and a stopped turn with partial text; `refusalFromResponseText` with a JSON
refusal with kind, a JSON body without kind, and plain text; `parseConversationBody` with a good
body, a body with a malformed turn, and a body with a malformed allowance; `pollUntilTurnSettled`
with a fake `read` that answers open twice then settled, one that never settles under a short
deadline, and one that throws. Use fake timers or a 1 ms interval so the suite stays fast.
Check that `tests/at/tsconfig.json` types the import (it allows `.ts` extensions); if `ai` types
are not visible from that project, import the `UIMessage` type through `import type` only and
say in the report what you had to do.

## Checks before the commit

Output under `loop/items/AI4DEV-159/reports/review-fix-checks/`:

```
bun run typecheck
bun run build
bun run at:selftest
```

All three exit 0. You do not start the stack and you do not run the prepare script.

## Commit and report

One commit on `lane/ai4dev-159`, message starting `AI4DEV-159: ` and naming the change in
words. Write `loop/items/AI4DEV-159/reports/review-fix.md`: each act-on row with the file and
the change, the deleted symbols, the checks with exit codes, deviations with reasons. Reply
with five lines and the path.
