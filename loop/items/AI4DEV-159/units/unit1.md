# Unit 1: the bare chat page on the Vercel AI SDK

You are the writer lane for one unit of the item whose brief is
`loop/items/AI4DEV-159/brief.md`. Read the brief first, then
`loop/items/AI4DEV-159/how/explanation.md` in full (529 lines; page it if your read tool
limits you). The explanation is the exact wire contract of the two edge functions, and it is
correct at this head. Do not re-derive it; cite it.

You work in this worktree only. The lane branch is `lane/ai4dev-159`. You commit here.
Nobody else writes here while you run.

## What to build

One TanStack Start route that lets a signed-in NGO admin chat with Discovery on a project,
through the two shipped edge functions, with the Vercel AI SDK off the shelf. No design
work, no styling beyond readable. Every call goes through an edge function. The page holds
no server secret and uses no host-specific server API.

### Files

- `src/routes/discovery/$organizationId.$projectId.tsx` (URL `/discovery/:organizationId/:projectId`).
  One file, `createFileRoute`, `ssr: false` on the route, because the page reads the browser
  session. If the flat file naming does not produce that URL, use the nested folder form
  from `src/routes/README.md`; the URL is the contract.
- `src/lib/supabase.ts`: one browser client from `import.meta.env.VITE_SUPABASE_URL` and
  `import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY`, with a thrown `Error` naming the missing
  variable when either is undefined. `@supabase/supabase-js` moves from `devDependencies`
  to `dependencies` (a page import must survive a production install).
- `src/lib/discovery-chat.ts`: the pure part of the page, exported and typed, no React:
  - `messagesFromTurns(turns): UIMessage[]`, two messages per turn (`<turn.id>:user`,
    `<turn.id>:assistant`), the assistant one only when `assistantMessage` is a non-empty
    string. A turn with `stopReason === 'user_stopped'` keeps its partial text. The user
    message is one `text` part; so is the assistant message.
  - `refusalFromResponseText(text): { kind: string | null; reason: string }`, which parses
    a non-2xx body. When the body is JSON with a string `reason`, return it with `kind`
    when present; otherwise return the raw text as `reason` with `kind: null`.
  - `allowanceFromMessages(messages): Allowance | null`, the `data` of the last `data-turn`
    part of the last assistant message, or `null`. Type `Allowance` locally as
    `{ organizationId: string; utcDay: string; vetted: boolean; dailyGrant: number; spentToday: number; remaining: number }`.
  - A `DiscoveryTurn` type that mirrors `DiscoveryTurnView` from
    `supabase/functions/_shared/discovery-turn.ts` lines 28 to 41. Copy the field names;
    do not import from `supabase/` (that tree is Deno).
- `package.json` and `bun.lock`: add `ai`, `@ai-sdk/react`, `react-markdown` as
  dependencies at their current latest (the decision paper measured `ai` 7.0.105,
  `@ai-sdk/react` 4.0.108, `react-markdown` 10.1.0 on 2026-09-17; take what `bun add`
  resolves today and record the versions in your report). `bun add` writes the lockfile.
- `.claude/skills/verify-ai4good/scripts/prepare-chat-page.ts`: a bun script that produces
  the state the page needs on the local stack through the product path and prints what a
  person or a browser drive needs. Model it on
  `.claude/skills/verify-ai4good/scripts/drive-discovery.ts` (reuse its helpers from
  `tests/at/harness/live-stack.ts` and `local-stack.ts`; run its Doctor checks first).
  Steps: signup, mail confirmation, password sign-in, `complete-signup` as NGO,
  `project-need` start with a description, `project-need` submit. Then print, as one JSON
  object on stdout: `email`, `password`, `organizationId`, `projectId`, `pageUrl`
  (`http://localhost:8080/discovery/<org>/<project>`). The password is a fresh random
  string for a throwaway local user; printing it is intended. With the flag `--drain`,
  after the setup, send short JSON turns through `discovery-message` (no `Accept` header)
  until the send answers 409 `daily-allowance-exhausted`, at most 15 sends, and add
  `drained: true` and the count to the JSON. The transcript goes to `outDir` (first
  positional argument, default `loop/verify-evidence/<timestamp>/`), redacted as the other
  drives do. The drain spends real provider credits on the Haiku test model; say so in the
  header comment.
- `.claude/skills/verify-ai4good/features/discovery-chat-page.md`: the recipe for a
  browser drive of the page (what to open, what to type, what to expect at each of the
  four checks: a real turn streams, stop mid-reply, reload shows the history, the
  zero-credit refusal). Add one line for it to `features/README.md` and one line to the
  `## Helpers` list in `SKILL.md`, matching the existing style.

Do not touch `supabase/`, `tests/`, `.github/`, `src/routes/__root.tsx`, `src/routes/index.tsx`,
or `vite.config.ts`. Do not edit `src/routeTree.gen.ts` by hand (the dev server and the build
regenerate it; if your build changed it, keep the regenerated file in the commit).

### The page, top to bottom

Data shape first. The page is a state machine over three independent facts, not a pile of
booleans:

- `session`: `signed-out` | `signed-in` (the supabase-js session; subscribe with
  `onAuthStateChange`). Signed out shows one form: email, password, a submit button that
  calls `signInWithPassword`, and the error text when it fails. Nothing else renders until
  signed in.
- `history`: `loading` | `loaded { turns, allowance }` | `failed { reason }`. Loaded once
  after sign-in by POSTing `{ projectId }` to `discovery-conversation` with the headers of
  section 2 of the explanation. Reloaded after every `stop()` settles (see below).
- `refusal`: `null` | `{ kind, reason }`. Set from the transport error, cleared on the next
  send.

Then the chat. `useChat` from `@ai-sdk/react` with `DefaultChatTransport` from `ai`:

- `api`: `${VITE_SUPABASE_URL}/functions/v1/discovery-message`.
- `headers`: an async function that reads the current session and returns
  `Authorization: Bearer <access_token>`, `apikey: <anon key>`,
  `Accept: text/event-stream`. Read the session per request (local tokens live 120
  seconds and supabase-js refreshes them).
- `prepareSendMessagesRequest`: the body becomes
  `{ organizationId, projectId, message }`, where `message` is the text of the last user
  message's text parts joined. The route refuses the SDK's default body (gotcha 5).
- `fetch`: a wrapper around the global `fetch` that, on a non-2xx response, reads the body
  text and throws an `Error` whose `message` is that text, so the page can run
  `refusalFromResponseText(error.message)`. Read the installed types first: if the
  transport already throws the response text on a non-ok status, do not wrap, and say so
  in the report.
- `messages`: initial value `messagesFromTurns(history.turns)` once history is loaded.
  Mount the chat only after history loads (a keyed child component is the simplest way).
- `onError`: set `refusal`.

Rendering, all plain elements and `src/components/ui` where they fit (`Button`, `Input`,
`Textarea`): the allowance line (`remaining` of `dailyGrant` credits today, vetted or not),
the message list (user text as a paragraph, assistant text through `react-markdown`), the
refusal as its `reason` text with `kind` in small print when present, the composer (a
textarea, a Send button disabled while `status` is `submitted` or `streaming`, a Stop button
enabled only then), and a status word. The allowance shown is, in order of recency: the last
`data-turn` part in the messages, else the conversation read's `allowance`.

Stop. `stop()` aborts the fetch. The server sends nothing more (explanation section 7). When
`status` returns to `ready` after a stop, POST the conversation read again and replace the
allowance and the turns. Do this by watching for the transition, not with a timer.

### Skill files as data

The SSE part names, the refusal `kind` strings, and the field names are data from the
explanation. Do not invent a `remedies` field; remedies are inside `reason` (gotcha 6).

## Checks you run before you commit

From this worktree, output to files under `loop/items/AI4DEV-159/reports/unit1-checks/`
(create it), then read the exit codes:

```
bun run typecheck
bun run build
bun run at:selftest
bun run at:check req-004
```

`bun run build` must succeed and must not need Nitro or any host adapter. The lead runs the
integration tier and the browser drive; you do not start the stack and you do not run
`prepare-chat-page.ts`. You may run `bun run dev` for a compile check and stop it.

Read the types you install. `node_modules/ai/dist/index.d.ts` and
`node_modules/@ai-sdk/react/dist/index.d.ts` are the authority on `DefaultChatTransport`
options, `useChat` returns, `UIMessage` parts and the `data-*` part shape. The explanation
marks these unverified; your report closes each one with a line number.

## Commit

One commit on `lane/ai4dev-159`, message starting `AI4DEV-159: ` and saying in plain words
what the page is. No co-author line. Keep the diff surgical.

## Report

Write `loop/items/AI4DEV-159/reports/unit1.md` in this worktree: the files changed, the
versions installed, the type facts that closed each unverified point (with the line in the
`.d.ts`), each check with its exit code, and every deviation from this brief with the reason.
Reply with five lines and the path.
