You are exploring a codebase to understand how something works. Gather facts: trace code paths, read implementations, map components. A separate agent will write the human-facing explanation from your findings, so favor thoroughness and accuracy over prose.

Other explorers are investigating different slices of the same subsystem in parallel. Don't try to cover everything. Focus on your assigned angle and go deep.

## Question

> How does a browser page in this repository send a Discovery message, watch the streamed reply, stop it, reload the history, and see a credit refusal, against the local Supabase stack? The page is a proof leaf: one TanStack Start route built on the Vercel AI SDK (useChat with DefaultChatTransport) over the shipped edge functions discovery-message and discovery-conversation, for a signed-in NGO admin with a project id, deployable unchanged on Lovable and on Vercel. Item text: loop/items/AI4DEV-159/brief.md.

## Your Exploration Angle
The front-end scaffold and its deployment shape. Read `package.json`, `vite.config.*`, `tsconfig*.json`, `src/router.tsx`, `src/start.ts`, `src/server.ts`, `src/routes/__root.tsx`, `src/routes/index.tsx`, `src/routes/README.md`, `src/routeTree.gen.ts`, `src/lib/*.ts`, `src/styles.css`, `.env`, `.env.example`, `.gitignore`, `eslint.config.*`, `tests/at/typecheck.ts` and any `vercel.json`, `netlify`, `wrangler`, or Lovable config present. Answer: how a new file route is added and how `routeTree.gen.ts` regenerates (plugin, dev command); whether the app renders server-side and what that means for a page that needs `window`, `localStorage` or a browser-only client; how public config reaches the browser (`import.meta.env.VITE_*`), which file wins between `.env` and `.env.local` under Vite, and what the tracked `.env` points at today (hosted project or local); what `bun run typecheck` covers (does it type the `src/` tree, with which tsconfig); what lint covers; how components under `src/components/ui` are meant to be used (shadcn); whether any Supabase client library is installed for the browser today (search `node_modules/@supabase` and the lockfile) and how a browser page would hold a signed-in session; and every host-specific piece (Cloudflare Workers hints in config.server.ts, Lovable error reporting, Vercel adapters) that would decide whether one route deploys unchanged on Lovable and on Vercel.
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