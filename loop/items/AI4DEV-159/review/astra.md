## Findings

### 1. [critical] Stop reconciliation can abort the next message
**Location**: `src/routes/discovery/$organizationId.$projectId.tsx:126–130,272,330`

**Finding**: Send becomes available while Stop reconciliation is still running. Completing reconciliation remounts the chat, aborting any subsequent request and erasing its draft.

**Evidence**: After Stop, SDK status becomes `ready`, so `busy` becomes false. The user can send again while `readConversationOnceSettled()` runs. Its eventual callback unconditionally increments `chatGeneration`. The installed `useChat` implementation calls `chat.stop()` on unmount, so this replacement cancels the new request. A slow reconciliation can also discard text typed into the composer.

**Suggestion**: Keep reconciliation as an explicit pending state that prevents another send, and update messages without unconditionally remounting the composer.

### 2. [critical] Polling exhaustion silently treats an open turn as settled
**Location**: `src/routes/discovery/$organizationId.$projectId.tsx:89–95`

**Finding**: After ten retries, the function returns an open turn as successfully loaded and stops checking permanently.

**Evidence**: Server cancellation awaits `countedOutput()` in `supabase/functions/_shared/anthropic-messages.ts`, which makes another provider request with a 120-second timeout. Settlement can therefore exceed this polling window. The page then retains missing assistant text and reserved credits even after settlement completes, until another reload.

**Suggestion**: Preserve a pending settlement state and continue polling with backoff, or expose a retryable timeout instead of presenting the open snapshot as final.

### 3. [critical] Later replies reset the displayed allowance to the initial read
**Location**: `src/lib/discovery-chat.ts:103–112`

**Finding**: `allowanceFromMessages()` stops searching after the newest assistant message, even when that message has no `data-turn`.

**Evidence**: Suppose history initially reports 10 credits and the first completed reply reports 9. When the next assistant starts streaming, its message lacks `data-turn` until settlement. Line 112 returns `null`, and the route falls back to the original 10-credit allowance. If that stream fails before receiving `data-turn`, the incorrect value persists.

**Suggestion**: Continue searching older assistant messages for the last available `data-turn`.

### 4. [critical] A failed history fetch leaves the page loading indefinitely
**Location**: `src/routes/discovery/$organizationId.$projectId.tsx:44,118–120,127–130`

**Finding**: Network exceptions escape `readConversation()` and neither caller handles rejected promises.

**Evidence**: A connection failure rejects `fetch()` before the HTTP-response handling runs. The initial loading effect never calls `setHistory()`, leaving a permanent “loading” screen. The same failure during Stop reconciliation prevents history and allowance recovery. Token refresh does not retry the initial read because the effect depends only on `session.kind` and `projectId`.

**Suggestion**: Convert transport exceptions into a failed history state and provide a retry.

### 5. [warning] Setup failures crash the evidence writer
**Location**: `.claude/skills/verify-ai4good/scripts/prepare-chat-page.ts:55–58,273–277`

**Finding**: `fatal()` invokes `flush()` before variables used by `flush()` have been initialized.

**Evidence**: A failed stack lookup reaches `fatal()` before `email` is initialized. A missing confirmation email reaches it before `organizationId` and `projectId` are initialized. Evaluating the transcript object throws a temporal-dead-zone `ReferenceError`, so the promised failure transcript is never written.

**Suggestion**: Initialize reporting metadata before the first fallible operation and populate it as setup progresses.