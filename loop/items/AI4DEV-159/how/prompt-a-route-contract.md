You are exploring a codebase to understand how something works. Gather facts: trace code paths, read implementations, map components. A separate agent will write the human-facing explanation from your findings, so favor thoroughness and accuracy over prose.

Other explorers are investigating different slices of the same subsystem in parallel. Don't try to cover everything. Focus on your assigned angle and go deep.

## Question

> How does a browser page in this repository send a Discovery message, watch the streamed reply, stop it, reload the history, and see a credit refusal, against the local Supabase stack? The page is a proof leaf: one TanStack Start route built on the Vercel AI SDK (useChat with DefaultChatTransport) over the shipped edge functions discovery-message and discovery-conversation, for a signed-in NGO admin with a project id, deployable unchanged on Lovable and on Vercel. Item text: loop/items/AI4DEV-159/brief.md.

## Your Exploration Angle
The browser-facing contract of the two Discovery edge functions, exactly as a client must speak it. For `supabase/functions/discovery-message/index.ts` and `supabase/functions/discovery-conversation/index.ts` with everything they import from `supabase/functions/_shared/` (edge.ts, write-routes.ts, discovery-turn.ts, discovery-stream.ts, discovery-metering.ts, discovery-allowance.ts, discovery-reads.ts, memberships.ts, caller.ts, tenant-reads.ts): the HTTP method, the required headers (Authorization bearer, apikey, Content-Type, Accept), the exact request body fields, CORS handling (preflight, allowed headers, exposed headers), the JSON success answer shape for a send (turn, reply, elicitation, allowance) and for a conversation read (conversation, turns, allowance), the exact SSE part sequence when `Accept: text/event-stream` is sent (part names, the `data-turn` payload, `error`, `finish`, `[DONE]`, the response headers), what happens on the wire when the client aborts mid-stream, and every refusal the client can see with its HTTP status, its `kind` string and its reason text: email unverified, zero credits with the tier remedies (what field carries the remedies and what values), fuel exhausted, discovery disabled, no such project, need not in discovery, invalid request, and the stale-context and 5xx paths. Also the allowance shape `renderDiscoveryAllowance` returns and the credit numbers on it. Cross-check against the recorded live transcript `loop/items/AI4DEV-132/artifacts/verify-discovery/transcript.json` and the drive `.claude/skills/verify-ai4good/scripts/drive-discovery.ts`, which drove these routes for real.
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