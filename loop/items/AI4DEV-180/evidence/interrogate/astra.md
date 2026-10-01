## Findings

### 1. [critical] Background reads change the document after approval
**Location**: `design/astra/src/fixture-world.ts:503`, `src/components/discovery/DiscoveryReview.tsx:60`

**Finding**: A file read can create a new brief revision while retaining confirmation of the previous revision.

**Evidence**: Start reading a file without a pause question, then confirm Discovery before reading finishes. `finishRead()` adds suggestions and increments the revision without updating confirmation. An in-memory probe produced brief revision **7** with confirmation revision **6**.

`Finished` renders the current brief under the old confirmation. Publish also treats any confirmation as sufficient. The interface therefore presents an unapproved revision as finished.

**Suggestion**: Keep the approved snapshot immutable. Publish brief and confirmation changes together through the port, and require matching revisions before showing an approved document.

### 2. [critical] Concurrent free submissions silently become paid
**Location**: `design/astra/src/fixture-transport.ts:129`, `design/astra/src/fixture-world.ts:124`

**Finding**: The transport checks availability before dispatch but chooses the funding mode later, when applying the answer.

**Evidence**: Main chat and file chat have separate submission guards. Both can submit while the display shows one remaining free reply. Both transports pass their initial checks before either applies its answer.

An in-memory probe reproduced this: the first submission consumed the free reply; the second charged **$0.25**. Neither submission carried authorization for paid mode. The contract explicitly prohibits silently converting a free submission into a paid submission.

**Suggestion**: Reserve the displayed funding mode atomically before dispatch. If that mode is unavailable, refresh the display and require another submission.

### 3. [critical] Reply completion deletes text entered during streaming
**Location**: `src/components/discovery/use-discovery.ts:518`, `src/components/discovery/Composer.tsx:54`

**Finding**: Successful completion clears the current composer and answer drafts, including changes made after submission.

**Evidence**: `send()` captures the submitted values, then awaits the entire streamed reply. The textarea remains editable during that wait. When streaming finishes, `setComposerText("")` deletes whatever text exists then.

With `pace=demo`, send a note and start writing the next note during the reply. The next note disappears without being submitted. Deleting drafts solely by question ID creates the same problem for answers changed during the request.

**Suggestion**: Clear the submitted draft immediately, or clear it on completion only if its value still matches the submitted value.

### 4. [critical] Confirmation removes the editing path for core brief sections
**Location**: `src/components/discovery/DiscoveryReview.tsx:60`, `src/components/discovery/model.ts:450`

**Finding**: After confirmation, users cannot directly correct the need, current users, or standalone success measure.

**Evidence**: Confirmation replaces the editable review with `Finished`, whose `DiscoveryDocument` has no edit controls. Returning to chat does not help: `briefSections()` assigns these sections `questionId: null`, and `BriefPanel` renders Edit only when a question ID exists.

A user who confirms and then notices incorrect need text must change an unrelated question first to reopen Discovery.

**Suggestion**: Keep section editing available after confirmation. Address edits by section ID instead of requiring an associated chat question.

### 5. [critical] The funding recovery control is missing or inert
**Location**: `src/components/discovery/UsageCard.tsx:27`, `src/components/discovery/UsageCard.tsx:63`

**Finding**: Buy fuel disappears in common exhaustion states and does nothing when displayed.

**Evidence**: Free eligibility requires **both** counters to remain positive. The button appears only when **both** counters equal zero. With daily replies exhausted, beta replies remaining, and no fuel, sending stops but Buy fuel is absent. Beta exhaustion with daily capacity remaining has the same defect.

In the supplied paid scenario, both counters are zero and the button appears. However, it has no handler or destination.

**Suggestion**: Show the action when either free allowance is exhausted. Connect it to the existing funding flow through a navigation callback.

### 6. [warning] View cannot locate uncertain answers
**Location**: `src/components/discovery/model.ts:401`, `src/components/discovery/use-discovery.ts:140`

**Finding**: The Questions card offers View for uncertain answers, but the handler cannot resolve them.

**Evidence**: `questionRows()` sets `canView: true` for `not-sure` topics. `answerTarget()` immediately returns `null` unless the topic is `agreed`. In the supplied mid-interview scenario, selecting View for Success measure produces no highlight or scroll. On a phone, it merely closes the panel.

The uncertain state also lacks an answer message ID, so the handler cannot reliably locate the original answer.

**Suggestion**: Store the source message ID for uncertain answers and resolve it through the same navigation path as agreed answers.