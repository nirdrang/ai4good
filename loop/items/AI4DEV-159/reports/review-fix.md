# Review fix report

The grok feature lane applied every act-on row of `decisions.tsv` and died at its check step
(the grok CLI cancelled its own terminal command; receipt `reports/receipt-review-fix.json`,
status `malformed-output`). The lead ran the checks on the finished tree, made one change, and
committed it as `e9fadd1`.

## What landed, by act-on row

- Stop flow: `settling` state folded into `busy`; `onStop` awaits `stop()` then `settle()`;
  `setMessages` replaces the list; no remount, no `chatGeneration`, no `stoppingRef`, no
  status-transition effect.
- Allowance: one state, set from `onData` on `data-turn` and from every read;
  `allowanceFromMessages` and `allowanceFromTurnData` deleted.
- Settle poll: `pollUntilTurnSettled(read, knownMaxSeq, { deadlineMs: 20000, intervalMs: 500 })`
  in the pure module, a turn with `seq` above the known maximum that is not `open`; on the
  deadline the page keeps what it shows and says so.
- In-stream error: `onError` classifies by `refusalFromResponseText`; a JSON refusal drops the
  optimistic user message and restores the draft; anything else runs the settle poll.
- Thrown reads: `readConversation` catches and returns `failed`; a Retry button reloads.
- Boundary guards: `isDiscoveryTurn`, `isAllowance`, `parseConversationBody`; `DiscoveryTurn`
  holds the five consumed fields.
- Session: `unknown` | `signed-out` | `signed-in`; nothing renders while unknown.
- `prepare-chat-page.ts`: `let` bindings above the first `fatal`; one `send` helper with a
  401 retry; the drain ends on either zero-credit 409 and prints `drainedKind`; `apiUrl` in the
  JSON.
- Recipe: the `.env.local` step; README: the unmapped sentence; CI header and runner
  Dockerfile comments: the diff-scope step and the item-id guard.
- `tests/at/harness/discovery-chat.selftest.ts`: thirteen cases over the pure module.

## The lead's change

The pure module imported `type UIMessage` from `ai`, which pulls DOM-typed declarations into
the tests project (`lib: ES2022`, `skipLibCheck: false`) and failed `tsc` there. The module
now exports its own structural `ChatMessage` type, assignable to the SDK's `UIMessage`, and
imports nothing from `ai`.

## After the second browser drive

A stop while the status is still `submitted` cuts the request before the server reserves, so
no turn row appears and nothing is charged (the drive's step 3 and step 8: the readback shows
no new row). The poll now returns `no-turn` in that case and `still-open` only when a newer
open turn exists, both with the last read's allowance; the page says "the stopped message did
not reach Discovery; nothing was charged" or "the stopped turn is still settling; reload to
see its charge", and applies the allowance either way. Two selftest cases cover the two
deadline outcomes.

## Checks

`reports/checks-final/` on `e9fadd1`: fourteen green. `reports/checks-final-c/` after the
poll change: typecheck 0, build 0, at:selftest 0 (458 passed).
