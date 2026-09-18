## Findings

### 1. [warning] Allowance regresses mid-stream because the scan stops at the newest assistant message
**Location**: `src/lib/discovery-chat.ts:103-114` (`allowanceFromMessages`), used at `src/routes/discovery/$organizationId.$projectId.tsx:273`
**Finding**: The reverse scan returns `null` as soon as the newest assistant message has no `data-turn` part, instead of continuing to earlier assistants.
**Evidence**: Lines 107-112: the inner loop searches one message for `data-turn`; if none is found control falls to line 112 `return null` inside the outer loop, never reaching earlier messages. Concrete trace: turn 1 completes (assistant 1 carries `data-turn` with `remaining: 9`, page shows 9); turn 2 starts streaming (assistant 2 has text only) → function returns `null` → `shown = null ?? allowance` falls back to the mount-time prop (`remaining: 10`), so the line jumps 9 → 10 until turn 2 settles. The intent ("allowance line from the last `data-turn` part") requires the last `data-turn` anywhere, not the last message.
**Suggestion**: Replace the line-112 `return null` with `continue` (keep scanning older assistants); only return `null` after the whole loop.

### 2. [warning] Refused sends leave a ghost user bubble the next reload erases
**Location**: `src/routes/discovery/$organizationId.$projectId.tsx:254-259` (`onError`), `:275-285` (`onSend`), `:302-316` (render)
**Finding**: A 4xx refusal (zero credits, over-limit, tenant mismatch) keeps the optimistic user message in `messages` while the server created no turn, so local state permanently diverges from the conversation read until a remount.
**Evidence**: `sendMessage({text})` pushes the user message before the fetch; the `Chat.makeRequest` catch path (`node_modules/ai/dist/index.js:21440-21458`) calls `onError` and sets `status: "error"` without popping the message. The page's `onError` only sets `refusal` state and never reconciles `messages`. Reserve refusals happen before any turn row exists (`edge.ts:375-380`), so a later `readConversation` returns the old turns without the ghost. The zero-credit live flow shows exactly this shape (user text stays, "no assistant text", refusal box) with no reconciliation step.
**Suggestion**: On refusal, either remove the optimistic user message (via `setMessages`) or reload the conversation to re-anchor `messages` to server truth.

### 3. [warning] Stop-settle reload only fires on `ready`, so an abort that ends as `error` never reconciles
**Location**: `src/routes/discovery/$organizationId.$projectId.tsx:262-270` (stop effect), `:126-131` (`reloadAfterStop`), `:273` (`shown`)
**Finding**: `stoppingRef` is cleared and `onStopSettled` fires only on a non-`ready` → `ready` transition; a stream that ends in `error` (abort racing a provider/settle failure) leaves the charge invisible with no automatic reload and no manual reload control.
**Evidence**: Stream `error` chunks throw inside `processUIMessageStream` (`node_modules/ai/dist/index.js:7593-7595` with the throwing `onError` at `:21422-21424`), and the outer catch sets `status: "error"` (`:21451-21458`). The effect condition `previous !== "ready" && status === "ready"` ignores that transition, so `stoppingRef` stays `true` and the settled turn plus its allowance are never re-read. The same gap applies to any non-stop stream error: `shown` falls back to the stale mount-time allowance because the failed turn carries no `data-turn`.
**Suggestion**: Fire the settled-reload on `error` as well when `stoppingRef` is set (and consider reloading after any stream error to refresh the allowance).

### 4. [warning] Assistant markdown is rendered with no URL sanitization in a session-bearing origin
**Location**: `src/routes/discovery/$organizationId.$projectId.tsx:311` (`<Markdown>{text}</Markdown>`)
**Finding**: `react-markdown` is used with zero hardening props, so a markdown link with a dangerous scheme renders as a live anchor in the same origin that holds the Supabase session.
**Evidence**: Input path is traceable: project-need description and prior answers (attacker-influenced via the product path) enter the model context (`discovery-turn.ts:101-106`), return as `turn.assistantMessage`, flow through `textOf` into `<Markdown>`. No `urlTransform`, `allowedElements`, `skipHtml`, or sanitize plugin is passed, so `[x](javascript:...)` becomes clickable. Impact is session theft: `getSupabase()` persists the access/refresh pair in `localStorage` (default `supabase-js` storage), readable by any script the click-level XSS can run. The model is instructed to stay plain-language, but nothing constrains its link output.
**Suggestion**: Pass `urlTransform` allowing only `http/https/mailto` (and relative links), or add a sanitize layer; keep raw HTML disabled.

### 5. [warning] Initial allowance is cast blindly while stream allowance is validated
**Location**: `src/routes/discovery/$organizationId.$projectId.tsx:81-85` vs `src/lib/discovery-chat.ts:81-101`
**Finding**: The conversation read does `(body.allowance ?? null) as Allowance | null` with no shape check, but `data-turn` payloads go through `isAllowance`/`allowanceFromTurnData`.
**Evidence**: The same file already distrusts the wire enough to validate the stream copy, and the server contract explicitly includes `allowance: null` plus tenant/502 shapes. A malformed-but-truthy `allowance` object (missing `remaining`/`dailyGrant`) passes the cast and renders as `undefined of undefined credits today` at `:294-301` instead of the designed `allowance unavailable` fallback.
**Suggestion**: Run the initial read through the existing `allowanceFromTurnData`-style guard and coerce failures to `null`.

### 6. [warning] Send path clears the draft optimistically and swallows the throw
**Location**: `src/routes/discovery/$organizationId.$projectId.tsx:275-285` (`onSend`), `:333` (Stop button)
**Finding**: `setDraft("")` runs before `await sendMessage`, and the `catch {}` discards whatever `sendMessage` threw; the Stop button's `void onStop()` likewise leaves a rejection unhandled.
**Evidence**: On a 400 over-4000-chars send or a transport-level throw that never reaches `onError`, the user's typed text survives only as the ghost bubble from finding 2 — the editable draft is gone and nothing is logged. Debugging a silent failure then depends on reproducing it, since the page kept no trace.
**Suggestion**: Clear the draft only after the send is accepted (or restore it in `onError`), and at minimum log/report caught errors instead of an empty `catch`.

### 7. [warning] Post-stop poll gives up after ~5s and a failed re-read clobbers loaded history
**Location**: `src/routes/discovery/$organizationId.$projectId.tsx:89-96` (`readConversationOnceSettled`), `:126-131`
**Finding**: The loop polls at most ten 500ms intervals for the last turn to leave `open`, then accepts whatever it got; worse, a transient read failure replaces the currently displayed loaded turns with `{kind:"failed"}`.
**Evidence**: The settle after abort runs in `EdgeRuntime.waitUntil` after the browser is gone (`edge.ts:416-420`) plus a provider recount path — nothing bounds it at 5s. If the 11th read still sees `open` (or fails), `setHistory(next)` + generation bump remounts the chat onto an open turn (user line, no reply) or onto a bare failure string, discarding the previously good history the user was looking at. There is no retain-previous logic and no manual retry control on the page.
**Suggestion**: Retain the previous loaded turns when the re-read fails, and either poll longer/back off or surface the still-open state explicitly instead of presenting it as settled.

### 8. [warning] Verify-script early abort crashes inside its own transcript writer
**Location**: `.claude/skills/verify-ai4good/scripts/prepare-chat-page.ts:55-59` (`fatal`/`flush`), `:273-280` (`flush`), `:185`/`203` (`organizationId`/`projectId`)
**Finding**: `flush()` reads module-scope `const organizationId`/`projectId`, but `fatal()` (which calls `flush()`) is reachable before those bindings initialize, throwing a `ReferenceError` that masks the real failure and skips the transcript write.
**Evidence**: Call chain: stack-health (`:103`), mail-identification (`:112`), or edge-mount (`:146`) failures all call `fatal` before line 185 executes. `flush` at `:277` evaluates `organizationId`, which is in the temporal dead zone at that point → `Cannot access 'organizationId' before initialization`. The intended abort-with-evidence becomes an uncaught crash with no `transcript.json`.
**Suggestion**: Declare both ids with `let ... = ""` near the top (assign later) or make `flush` read them defensively.

### 9. [warning] `--drain` treats `debit-exceeds-remaining` as fatal and may never reach exhausted
**Location**: `.claude/skills/verify-ai4good/scripts/prepare-chat-page.ts:221-254`, `supabase/migrations/20260916120000_discovery_allowance.sql:188-194`
**Finding**: The drain loop only accepts `200` or `409 daily-allowance-exhausted`; any other 409 aborts the run — but the SQL proves `debit-exceeds-remaining` is the expected intermediate whenever `0 < remaining < reserve`.
**Evidence**: SQL lines 172-186 raise `daily-allowance-exhausted` only when `remaining <= 0`; lines 188-194 raise `debit-exceeds-remaining` when the debit exceeds a positive remainder. The route contract notes short Haiku turns reserve 2 and charge 1, and context (hence reserve) only grows as the drain adds turns — so approaching zero with a 2-credit reserve against `remaining = 1` deterministically raises `debit-exceeds-remaining`, which the script fatals on (`:253`) instead of handling. The reported 11-send drain worked at one reserve size; it is fragile to any reserve growth.
**Suggestion**: Handle `debit-exceeds-remaining` explicitly (shorter final message, or accept it as a drained-equivalent signal for the zero-credit page check).

### 10. [warning] Frontend `DiscoveryTurn` is a hand mirror with blind casts and no drift check
**Location**: `src/lib/discovery-chat.ts:12-43` (mirror type + "cannot import" comment), `src/routes/discovery/$organizationId.$projectId.tsx:84` (`turns as DiscoveryTurn[]`)
**Finding**: The page duplicates the server's `DiscoveryTurnView` by hand and then casts the wire array without validation, so any server-side field/status/billing change is silently accepted.
**Evidence**: The comment concedes the Deno/Vite boundary, but the chosen fix (copy the shape + `as` cast) means `readConversation` never checks the fields it actually uses (`id`, `userMessage`, `assistantMessage`, `status`). A new terminal status, a renamed field, or a `null` where a string was assumed flows straight into `messagesFromTurns` and the `open`-poll at `:91`, which only understands the four hardcoded statuses.
**Suggestion**: Validate the minimal consumed subset at the boundary (ids, message strings, status membership) and fail closed to the existing `failed` history state instead of casting.
```