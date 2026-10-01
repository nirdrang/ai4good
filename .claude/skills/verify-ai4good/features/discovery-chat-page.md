# Discovery chat page

A signed-in NGO administrator chats with Discovery on a submitted project. The page is
`/discovery/:organizationId/:projectId`. It talks only to `discovery-conversation` and
`discovery-message`. Prepare the user and project with
`scripts/prepare-chat-page.ts` (add `--drain` before the zero-credit check). Write a
git-ignored `.env.local` with two lines from `bunx supabase status -o json`:
`VITE_SUPABASE_URL=<API_URL>` and `VITE_SUPABASE_PUBLISHABLE_KEY=<ANON_KEY>`. Without
those lines the page signs in against the hosted project and every sign-in fails. The
printed `apiUrl` must equal the page's `VITE_SUPABASE_URL`. Open
`http://localhost:8080` with `bun run dev`. Sign in on the page with the printed email
and password.

Every step below sends a message, so every step needs the provider key in
`supabase/functions/.env` (the deployed `discovery-message` reads `ANTHROPIC_API_KEY`).
Without it a send answers 502 at token counting and the page shows that reason; the page is
then unreachable for this drive. `prepare-chat-page.ts` without `--drain` still runs without
the key. The page uses its own chat on `@/lib/discovery-chat`. It does not use the fixture-built
Discovery screen in `src/components/discovery/`, which no route mounts yet.

Refusals the page shows with their `kind` in small print, besides the zero-credit one:
`invalid-request` (empty or over 4000 characters), `need-not-in-discovery`, `no-such-project`,
`not-an-admin`, `discovery-disabled`. When a stopped turn has not settled within the 20-second
poll, the page shows a notice that the turn is still settling, or that the stopped message did
not reach Discovery.

## Drive

1. A real turn streams. Type a short project fact and press Send. Expect the status word
   to become `submitted` then `streaming`, then assistant text to appear in pieces, then
   `ready`. The allowance line falls by the charged credits.
2. Stop mid-reply. Send a longer message. Press Stop while the reply is still streaming.
   Expect the stream to halt, status `ready`, and no further tokens. After the page reloads
   the conversation, the stopped turn is present with its (possibly longer) partial text.
   Replies on the Haiku test model end within one to three seconds, faster than a Stop
   pressed through a browser tool round trip. Press it from inside the page instead: a
   script that clicks Send, then clicks Stop about 700 ms later (measured 2026-09-18; the
   in-page timer fired at 1.1 to 1.4 s and still landed mid-stream). Read the turn row back:
   `stop_reason = 'user_stopped'` is the proof, together with the allowance line matching
   `granted - spent` in `discovery_spend`.
3. Reload shows the history. Refresh the browser. Sign-in should not be required. The
   earlier user and assistant messages are still on the page, including the stopped turn.
4. The zero-credit refusal. On a grant drained by `prepare-chat-page.ts --drain`, send one
   more message. Expect the refusal `reason` text on the page and `daily-allowance-exhausted`
   in small print. The stream does not start.
