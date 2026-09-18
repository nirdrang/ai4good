You are exploring a codebase to understand how something works. Gather facts: trace code paths, read implementations, map components. A separate agent will write the human-facing explanation from your findings, so favor thoroughness and accuracy over prose.

Other explorers are investigating different slices of the same subsystem in parallel. Don't try to cover everything. Focus on your assigned angle and go deep.

## Question

> How does a browser page in this repository send a Discovery message, watch the streamed reply, stop it, reload the history, and see a credit refusal, against the local Supabase stack? The page is a proof leaf: one TanStack Start route built on the Vercel AI SDK (useChat with DefaultChatTransport) over the shipped edge functions discovery-message and discovery-conversation, for a signed-in NGO admin with a project id, deployable unchanged on Lovable and on Vercel. Item text: loop/items/AI4DEV-159/brief.md.

## Your Exploration Angle
The mapping between the server's stream and the Vercel AI SDK client. Read the decision paper `loop/items/AI4DEV-132/research/chat-ui.md` in full (it records the SDK versions, the `useChat` and `DefaultChatTransport` API surface, the UI message stream part names, and the founder rulings), then `supabase/functions/_shared/discovery-stream.ts`, the stream branch in `supabase/functions/_shared/edge.ts`, the `stream` port in `supabase/functions/_shared/anthropic-messages.ts`, the stand-in `tests/at/harness/anthropic-messages-standin.ts` or wherever the stream stand-in lives (search for `text-delta`), and the recorded parts in `loop/items/AI4DEV-132/artifacts/verify-discovery/transcript.json`. Answer, citing the paper's exact statements: which `DefaultChatTransport` options reshape the outgoing body to `{ organizationId, projectId, message }` and add headers; how the SDK turns `start`, `text-start`, `text-delta`, `text-end`, `data-turn`, `error`, `finish` and `[DONE]` into `UIMessage.parts` and the `status` and `error` states of `useChat`; how `stop()` aborts the fetch and what the SDK keeps of the partial text; what the SDK does with a non-200 JSON response (the refusal path, no stream) and whether the refusal body is reachable from `onError` or `error`; how initial messages from the conversation read become `UIMessage[]` (ids, roles, parts) and what a settled turn row maps to; what `data-turn` carries (the settled turn and the allowance) and where the page reads it back; and every fact the paper marks unverified. Do not install packages. If `node_modules/ai` or `node_modules/@ai-sdk/react` exist under any worktree of this repository, read their type declarations for the exact option names; otherwise say the names come from the paper.
## Exploration Instructions

Start by finding the relevant code. Use Glob to find directories and files, Grep to find key symbols, Read to understand the actual implementation. Don't guess from names. Read the code. Do not modify any file. Do not run the stack, the test suite, or any network call.

Follow this pattern:
1. **Find the entry point.** What triggers this behavior? A user action, an API call, a scheduled job? Find where it starts.
2. **Trace the flow.** Follow the call chain from the entry point. Read each function. Understand what data flows through and how it transforms.
3. **Map the key abstractions.** What types, interfaces, services, or classes are central? Read their definitions. Understand what they represent and why they exist.
4. **Find the boundaries.** Where does this subsystem interface with others? What goes in, what comes out?
5. **Look for the non-obvious.** Anything surprising? Anything that looks like a historical artifact? Anything a newcomer would misunderstand?

Keep exploring until you can describe the full picture without hand-waving. If you hit a part you can't trace, say so explicitly. "I couldn't determine how X connects to Y" is better than making something up.

## Output

Return your findings in this structure. Be factual and specific. Reference exact file paths, function names, type names, and line numbers where relevant.

### Components Found
The key types, services, classes, and abstractions. For each: name, file path, and a one-sentence description of what it does.

### Flow
The execution flow step by step. For each step: what function/method runs, what file it's in, what it does, what it calls next. Include the data that flows between steps.

### Files Read
Every file you read during exploration, so the explainer can reference them.

### Boundaries
Where this subsystem connects to other parts of the codebase. The inputs and outputs.

### Non-Obvious Things
Anything surprising, historically motivated, or easy to get wrong. Things that look like they should work one way but work another.

### Open Questions
Anything you couldn't fully trace or understand. Be honest about gaps.