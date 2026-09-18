## Findings

### 1. [warning] Allowance falls back to a stale first read whenever the latest assistant has no `data-turn`
**Location**: `src/lib/discovery-chat.ts` (`allowanceFromMessages`, inner `return null`); `src/routes/discovery/$organizationId.$projectId.tsx` (`shown = allowanceFromMessages(messages) ?? allowance`)

**Finding**: The page computes the credits line as “last `data-turn` else the conversation read”. The helper does not search earlier messages. After it walks the **latest** assistant and finds no `data-turn`, it returns `null` immediately. The fallback `allowance` is the prop from the first `discovery-conversation` load. That prop is only replaced when `DiscoveryChat` remounts (`chatGeneration` after stop). It is not updated after a completed send.

**Evidence**: A completed stream writes `data-turn` on that assistant, so the idle line is right. The next send creates a new assistant with only text parts until settle. For that whole stream the helper returns `null` and the line jumps back to the **initial** remaining, not the last settled remaining.

Concrete path: load remaining 10 → turn 1 settles to 9 (from `data-turn`) → turn 2 streams → latest assistant has no `data-turn` → inner `return null` at `discovery-chat.ts` after the parts loop → `shown` is the original 10. Same hole after stop, before remount, and after an in-stream `{ type: "error" }` (no `data-turn`).

The unit text even says the visible line is “the last `data-turn` part **in the messages**”. The extra `return null` makes that false. There is no test of this helper; a two-assistant fixture would have caught it.

**Suggestion**: Delete the inner `return null` and keep scanning older assistants. Better: hold allowance in state and update it from conversation reads and from `data-turn` / `onFinish`, so a streaming placeholder cannot wipe the last known remaining.

---

### 2. [warning] After Stop, Send stays live while a remount is queued; that remount aborts a new paid turn
**Location**: `DiscoveryChatPage.reloadAfterStop`; `DiscoveryChat` status effect + `onStop`; `@ai-sdk/react` `useChat` cleanup (`void chat.stop()` on unmount)

**Finding**: Stop sets `stoppingRef`, waits for `status === "ready"`, then starts `readConversationOnceSettled` (up to ~5s of 500ms polls). During that window `busy` is false, so Send is enabled. When the poll finishes, `setChatGeneration` remounts `DiscoveryChat`. `useChat`’s effect cleanup calls `stop()` on the old `Chat`. If the user sent again during the poll, that abort hits a turn the server already reserved. The server still settles it after disconnect (`EdgeRuntime.waitUntil`).

**Evidence**: `stop()` on the SDK only aborts the fetch; it does not roll back the reserve (explanation section 7; live drive: a stop still charged). The composer is not gated on “settling”. Five seconds is enough to type and send. The unmount `stop()` is unconditional in `node_modules/@ai-sdk/react/src/use-chat.ts`. Result: a second `user_stopped` charge the user did not mean to start, and the remounted list may or may not include that turn depending on settle timing.

The `stoppingRef` + status-transition effect is also extra machinery. `stop()` does not wait for server settle; the poll already does. `onStop` can abort, set a local settling flag that disables Send, and call the poll. The effect can go.

**Suggestion**: While the post-stop reread runs, keep the composer disabled (treat it as busy). Ignore a late poll if `projectId` changed or the page unmounted. Call the poll from `onStop` after `await stop()`; do not remount over an in-flight send.

---

### 3. [warning] The settle wait is 5 seconds; the same server path is known to need up to 20
**Location**: `readConversationOnceSettled` (10 tries × 500ms); compare `.claude/skills/verify-ai4good/scripts/drive-discovery.ts` (20s deadline on the same `waitUntil` settle)

**Finding**: Live verify already caught the bug: a reread while the stopped row is still `open` shows remaining as if the full reservation were spent. The fix polls until the last turn leaves `open`. The bound is ~5 seconds. The existing Discovery drive waits 20 seconds for that same background settle.

**Evidence**: `live-verify.md` (“One defect found and fixed”): first reread saw remaining 4 while spend was 5, because settle had not finished. `drive-discovery.ts` uses `Date.now() + 20_000` for `user_stopped` settle. If recount-after-abort takes more than 5s, this page remounts with `status: "open"`, `assistantMessage: null`, and remaining still holding the reserve — the same wrong line they thought they fixed. The user can then send and get `turn-in-flight`. Haiku in the live drive was fast; that is not a bound.

**Suggestion**: Use the same 20s ceiling as the drive (or poll until not `open` with that deadline). If the deadline hits, show that the turn is still settling; do not remount as if it were final.

---

### 4. [warning] Conversation reads have no failure path on thrown `fetch`
**Location**: `readConversation`; the history `useEffect`; `reloadAfterStop`

**Finding**: `readConversation` awaits `fetch` with no `try/catch`. Callers use `.then(...)` only. A network drop, DNS failure, or thrown `getSession` leaves `history` on `"loading"` forever (first load) or never updates after stop. The rejection is unhandled.

**Evidence**:

```javascript
void readConversation(projectId).then((next) => {
  if (!cancelled) setHistory(next);
});
```

HTTP 4xx is handled (`response.ok`). `fetch` throwing is not. `reloadAfterStop` has the same shape and also no `cancelled` flag, so a late poll can `setHistory` after `projectId` has changed.

**Suggestion**: Catch around the read and map to `{ kind: "failed", reason }`. Keep the cancelled flag on the stop reread and drop the result if `projectId` no longer matches.

---

### 5. [warning] In-stream failures never reload the conversation
**Location**: `DiscoveryChat` `onError`; reload only from the stop → `ready` effect

**Finding**: Credit refusals before the stream are JSON 4xx; `onError` + `refusalFromResponseText` is enough (the drained drive showed `daily-allowance-exhausted`). Failures **after** the stream has opened are HTTP 200 with `{ type: "error", errorText }`. The SDK throws that into `onError` and sets `status: "error"`. The page paints `errorText` as a refusal and does not reread. The server has already reserved and will settle. Remaining and history stay stale. The next send can hit `turn-in-flight` if the row is still `open`.

**Evidence**: `edge.ts` emits `error` after `streamAct` / settle failure, then `finish` / `[DONE]`. `process-ui-message-stream.ts` turns that into `onError(new Error(chunk.errorText))`. `makeRequest` does not reread. Only `stoppingRef && status === "ready"` reloads. A provider error is not a stop, so that branch does not run. Combined with finding 1, the credits line also reverts to the first read.

**Suggestion**: On `status === "error"` after a send that had already opened a turn, run the same settle poll as Stop. Keep JSON 4xx (no stream) as a local refusal with no reread.

---

### 6. [nit] The verify map still says the web UI is a placeholder
**Location**: `.claude/skills/verify-ai4good/features/README.md` (table row vs “Not mapped yet” paragraph)

**Finding**: The table adds “Discovery chat page (browser)”, then the next paragraph still says the web UI is unmapped (“a placeholder page today”). That file is the skill’s feature map. The two sentences cannot both be true.

**Suggestion**: Drop the web UI from the “not mapped” list, or narrow it to the rest of the app (OAuth, other screens) so the new recipe is not contradicted on the same page.