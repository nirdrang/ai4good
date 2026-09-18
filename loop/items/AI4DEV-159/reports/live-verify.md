# Live verify of the chat page, 2026-09-18

The page ran on the Vite dev server (`bun run dev`, port 8080) from this worktree, against the
local stack started from this worktree, with the provider key and
`DISCOVERY_MODEL=claude-haiku-4-5-20251001` in the git-ignored `supabase/functions/.env`, and
`.env.local` pointing `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` at the local stack.
The mechanical agent drove Chrome through the browser extension. Its full observations are in
`../artifacts/verify-chat-page/browser-drive.md`. The two accounts came from
`.claude/skills/verify-ai4good/scripts/prepare-chat-page.ts` (transcripts under
`../artifacts/verify-chat-page/prepare-fresh/` and `prepare-drained/`, the drained one after
eleven JSON sends). The database readbacks below were run by the lead from the scratchpad against
`DB_URL` of the stack.

| check | evidence | result |
|---|---|---|
| Sign in and the allowance | The page showed the sign-in form, then "10 of 10 credits today, not vetted" for the fresh account. | pass |
| A real turn streams | In-page `MutationObserver` (step 8): 39 distinct rising lengths of the assistant text while the status word read `streaming`, then `ready`; allowance fell by one credit. The turn row: `stop_reason end_turn`, `served_model claude-haiku-4-5-20251001`, `charged_credits 1`. | pass |
| Stop mid-reply | In-page Stop 1.1 s and 1.4 s after Send (steps 9 and 10): status returned to `ready`; the rows for seq 5 and 6 read `status settled`, `stop_reason user_stopped`, `output_tokens 46` and `25` (counted on the received text), `charged_credits 1` each, `assistant_message` of 141 and 32 characters, longer than what the browser had rendered (0 characters at the moment of the stop in step 9). | pass |
| Reload shows the history | After a full navigation the sign-in form did not return; every user and assistant message came back in order, including the stopped turns' partial text; the allowance line matched the read. | pass |
| Zero-credit refusal | The drained account showed "0 of 10"; one more send answered 409, the page showed the full `reason` sentence with the three unverified-tier remedies and `daily-allowance-exhausted` in small print; no assistant text; the status word read `error`. | pass |
| Console | No message matched `error|Error|warn` after the drive. | pass |

## One defect found and fixed during the drive

After a stop the page reread the conversation at once, while the stopped turn was still open and
its two-credit reservation held (the settle runs after the browser has gone, inside
`EdgeRuntime.waitUntil`). The page showed "4 of 10" while the ledger said 5 spent. The fix in
`src/routes/discovery/$organizationId.$projectId.tsx` (`readSettledConversation`) rereads until
the last turn has left `open`, at most ten times at 500 ms. Step 10 repeated the stop after the
fix: the page showed "4 of 10" and the spend row read `granted 10, spent 6`.

## Observations that are not defects of the page

- The Discovery agent on Haiku answers in one to four sentences and keeps redirecting to
  elicitation, so a stop pressed through a tool round trip lands after the reply has ended. The
  in-page script was the lever; the recipe now says so.
- The browser extension's network tool reports method, URL and status only, so the stream's
  `content-type` and `x-vercel-ai-ui-message-stream` headers were not read from the browser. The
  previous item's drive recorded them on the wire (`loop/items/AI4DEV-132/artifacts/verify-discovery/transcript.json`).
- Two clicks on the Sign in button by element and by coordinate produced no request once during
  step 7; pressing Return in the password field submitted. Not reproduced afterwards; recorded,
  not explained.
- The GIF the agent recorded sits at `C:\Users\nirdr\Downloads\7832be9f-3cf9-404b-9e54-d41723474544.gif`
  on the founder's machine and is not committed (3.5 MB binary).

## Second drive, after the review fixes (2026-09-18, `browser-drive-2.md`)

On the rewritten page, with fresh accounts after the integration runs had reset the stack:

| check | evidence | result |
|---|---|---|
| Sign in, allowance | "10 of 10 credits today, not vetted". | pass |
| A real turn streams | In-page observer: rising text lengths while `streaming`, then `ready`; allowance fell to 9. | pass |
| Stop while streaming (step 7, Stop at 1.3 s) | Row seq 2 `user_stopped`, `charged_credits 1`; the page showed "8 of 10" and the ledger read 2 charged; Send stayed disabled at every sample while the page settled. | pass |
| Stop while still `submitted` (steps 3 and 8, Stop at 0.7 s) | No turn row appeared (readback before and after: the same rows); the page said "the stopped message did not reach Discovery; nothing was charged" after its 20 second deadline and the allowance line matched the ledger. The first run of this case (step 3) said "still settling" and led to the `no-turn` outcome in the poll. | pass |
| Reload | No sign-in form; the messages and the allowance came back. | pass |
| Zero-credit refusal | "0 of 10"; the reason sentence with the remedies and `daily-allowance-exhausted`; the refused message was removed from the list and its text put back in the composer. The 409 itself was not seen in the extension's network buffer (only the preflight was listed); the page's refusal block is the evidence. | pass |
| Console | No message matched `error|Error|warn`. | pass |

The extension's click on the Sign in and Send buttons did nothing on several tries in this
drive; a JavaScript `click()` on the same button, or Return in the password field, submitted.
Recorded as a tool observation; the page's forms are ordinary `<form onSubmit>` elements.