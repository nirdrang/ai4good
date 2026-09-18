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
