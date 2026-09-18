# Browser drive 2 — AI4DEV-159 discovery chat page

All times UTC. Tab id 1996459177 in a fresh MCP tab group.

## Step 1 — sign in, fresh account

- 2026-09-18 09:48:04Z — read prepared account files. Fresh account organisationId
  465b2499-6af6-4e6e-8a9e-2ab97cd20404, projectId eea71274-7a0a-4704-95db-cbf54c1c5240.
- 2026-09-18 09:48:17Z — navigated to the fresh account's pageUrl. Observed the sign-in form:
  "Sign in", Email, Password, Sign in.
- Set the email and password fields with form_input, then clicked into the password field and
  pressed Return. First attempt did not submit (page still showed the sign-in form after 2s and
  3s waits, and no auth network request had fired). A second click on the password field
  followed by Return did submit.
- 2026-09-18 09:49:59Z — after the second click+Return, page text showed:
  "Discovery / organisation 465b2499-6af6-4e6e-8a9e-2ab97cd20404 · project
  eea71274-7a0a-4704-95db-cbf54c1c5240 / 10 of 10 credits today, not vetted / Send / Stop /
  ready".
- Network log showed two requests: `POST /auth/v1/token?grant_type=password` → 200, and
  `POST /functions/v1/discovery-conversation` → 200.
- Observed allowance line: "10 of 10 credits today, not vetted" (matches expected). Status word:
  "ready" (matches expected).

## Step 2 — streaming growth, in-page

- 2026-09-18 09:50:08Z (approx, script started at page epoch 1789714208234) — armed the
  MutationObserver script, typed the discovery message ("We are a small food bank...") into the
  textarea, and clicked Send after 50ms.
- Waited 8 seconds, then read `window.__drive`.
- Sample count: 35.
- Distinct rising `len` values while `status === "streaming"`: 29 (computed:
  `new Set(samples.filter(s=>s.status==='streaming').map(s=>s.len)).size` = 29).
- Last sample: `{"t":2150,"status":"ready","len":265,"items":2}`.
- Full `window.__drive` JSON, reassembled verbatim from three chunked reads (the tool truncates
  long strings, so it was read in three overlapping slices and concatenated):

```json
{"started":1789714208234,"samples":[{"t":3,"status":"ready","len":0,"items":0},{"t":140,"status":"submitted","len":98,"items":1},{"t":600,"status":"submitted","len":0,"items":2},{"t":602,"status":"streaming","len":0,"items":2},{"t":1418,"status":"streaming","len":6,"items":2},{"t":1620,"status":"streaming","len":15,"items":2},{"t":1626,"status":"streaming","len":22,"items":2},{"t":1629,"status":"streaming","len":25,"items":2},{"t":1633,"status":"streaming","len":36,"items":2},{"t":1636,"status":"streaming","len":50,"items":2},{"t":1638,"status":"streaming","len":62,"items":2},{"t":1640,"status":"streaming","len":80,"items":2},{"t":1643,"status":"streaming","len":83,"items":2},{"t":1645,"status":"streaming","len":92,"items":2},{"t":1660,"status":"streaming","len":93,"items":2},{"t":1686,"status":"streaming","len":100,"items":2},{"t":1711,"status":"streaming","len":106,"items":2},{"t":1859,"status":"streaming","len":125,"items":2},{"t":1862,"status":"streaming","len":151,"items":2},{"t":1899,"status":"streaming","len":209,"items":2},{"t":1928,"status":"streaming","len":214,"items":2},{"t":1952,"status":"streaming","len":221,"items":2},{"t":1979,"status":"streaming","len":225,"items":2},{"t":2004,"status":"streaming","len":230,"items":2},{"t":2034,"status":"streaming","len":236,"items":2},{"t":2056,"status":"streaming","len":252,"items":2},{"t":2084,"status":"streaming","len":256,"items":2},{"t":2117,"status":"streaming","len":265,"items":2},{"t":2143,"status":"streaming","len":265,"items":2},{"t":2148,"status":"ready","len":265,"items":2},{"t":2150,"status":"ready","len":265,"items":2}]}
```

- Allowance line after: "9 of 10 credits today, not vetted" (fell by one, as expected).

## Step 3 — stop mid-reply, and the composer during the settle

- 2026-09-18 09:51:00Z (approx, script started at page epoch 1789714260... — not separately
  recorded) — armed the stop-drive script, typed the "Summarise everything..." message, sent it,
  and after 700ms clicked Stop if enabled.
- `clickedStopAt`: 759 (ms after script start).
- `stopDisabled` at the moment of the click attempt: `false` (Stop was enabled and was clicked).
- `sendDisabledAfterStop` entries (fact: whether Send stayed disabled while the page was settling
  after the stop):
  - `{"t":900,"sendDisabled":true,"status":"ready"}`
  - `{"t":1200,"sendDisabled":true,"status":"ready"}`
  - `{"t":1600,"sendDisabled":true,"status":"ready"}`
  - `{"t":2200,"sendDisabled":true,"status":"ready"}`
  - `{"t":3000,"sendDisabled":true,"status":"ready"}`
  - Send stayed disabled at every sampled point after the stop click, even though `status` had
    already reverted to "ready" in the DOM span read by the script.
- Last three MutationObserver samples (of 5 total captured):
  - `{"t":848,"status":"ready","len":113,"items":3,"sendDisabled":true}`
  - `{"t":851,"status":"ready","len":113,"items":3,"sendDisabled":true}`
  - `{"t":1758,"status":"ready","len":113,"items":3,"sendDisabled":true}`
- After the 12-second wait (2026-09-18 09:51:47Z), page text still showed the notice line
  "the stopped turn is still settling", allowance "9 of 10 credits today, not vetted", and status
  word "ready" (the `<span>` the script reads shows "ready", but the visible notice line still
  said the turn was settling).
- Ran `bun readback-spend.ts 465b2499-6af6-4e6e-8a9e-2ab97cd20404`. Output (redacted of nothing
  sensitive, this is aggregate spend data):
  ```
  {
   "org_id": "465b2499-6af6-4e6e-8a9e-2ab97cd20404",
   "utc_day": "2026-09-18T00:00:00.000Z",
   "spent": 1,
   "granted": 10
  }
  ```
  Spend row: granted 10, spent 1. Allowance line shown ("9 of 10") equals granted minus spent
  (10 − 1 = 9). Matches.

## Step 4 — reload

- 2026-09-18 09:52:11Z — navigated again to the fresh account's pageUrl.
- The sign-in form did NOT appear; the session persisted straight to the Discovery page.
- Message count in the list: 2 (one user message "We are a small food bank...", one assistant
  reply asking about volunteer counts). The stopped "Summarise everything..." turn from step 3
  was not present after reload.
- Allowance line: "9 of 10 credits today, not vetted".

## Step 5 — zero-credit refusal and the composer, drained account

- 2026-09-18 09:52:xxZ — ran `localStorage.clear(); sessionStorage.clear();` in the fresh
  account's tab, then navigated to the drained account's pageUrl
  (fcf988aa-cdc5-4629-901b-38e22e2f73a1 / f7102c75-4ac0-495a-989c-ae235b2a2c09).
- Sign-in form appeared. Filled email/password with form_input. Click-then-Return on the
  password field did not submit this time (tried a click+Return, a ref click on the submit
  button, and a coordinate click on the submit button — none of them fired a network request,
  confirmed via read_network_requests showing no `/auth/v1/token` call and via zoomed screenshot
  showing the button was clicked at the correct on-screen location). Submitted successfully only
  after calling `document.querySelector('button[type=submit]').click()` via the JavaScript tool.
  This UI unresponsiveness to computer-tool clicks/Enter on this second sign-in is noted as a
  surprise; the JS-triggered click on the same DOM button worked immediately.
- 2026-09-18 09:54:44Z — after sign-in, page text showed allowance "0 of 10 credits today, not
  vetted" (matches expected) and a pre-existing transcript of 10 "Short turn N. Please record
  this need." exchanges (this account was pre-drained by the setup script, sendCount 11).
- Typed "One more message" into the textarea (form_input) and clicked Send via
  `document.querySelectorAll('button')` JS click (the same computer-click unresponsiveness was
  present here too, so JS click was used for reliability).
- 2026-09-18 09:55:09Z — page text showed:
  - Refusal reason text: "discovery_allowance refuses: organisation
    fcf988aa-cdc5-4629-901b-38e22e2f73a1 has no Discovery credits left today — get vetted (daily
    grant becomes 30), fund project fuel to continue now, or wait for the next UTC day"
  - Kind in small print, directly under the reason: "daily-allowance-exhausted"
  - Status word: "error"
  - The user message "One more message" was NOT shown in the list after the refusal (the page
    removed it, as expected).
  - The textarea held "One more message" again after the refusal (confirmed via
    `read_page` showing `textbox "One more message" [ref_53]`) — the draft was restored, as
    expected.
- Network log: only one request matching `discovery-message` was visible —
  `OPTIONS /functions/v1/discovery-message` → 200. The POST that actually carried the refusal
  (visible in the page text and matching the 409/`daily-allowance-exhausted` shape) was not
  present in the tool's network-request buffer at the time it was read — noted here as a fact
  observed, not explained away. The refusal kind and reason text match the `drainedKind`
  ("daily-allowance-exhausted") recorded in the prepared-account file, which is consistent with
  a 409 response, but the exact HTTP status code of the POST was not directly observed in the
  network log.

## Step 6 — console messages

- `read_console_messages` with pattern `error|Error|warn` on the drained-account tab: "No
  console messages found for this tab."

## Summary table

| Step | Expected | Observed | Matches or differs |
|---|---|---|---|
| 1 | Allowance "10 of 10 credits today, not vetted"; status ready | Allowance "10 of 10 credits today, not vetted"; status "ready" | Matches |
| 2 | Streaming grows the last message length while status is "streaming"; allowance falls by one | 29 distinct rising `len` values across 35 samples while streaming; last sample len 265, status ready; allowance fell to "9 of 10" | Matches |
| 3 | Stop mid-reply; Send stays disabled while the page settles; allowance falls by the spend amount | Stop was enabled and clicked at t=759ms; Send stayed disabled at all 5 sampled points (900–3000ms) after the stop even once the status span read "ready"; notice "the stopped turn is still settling" was still shown after 12s; allowance "9 of 10" equalled granted(10) minus spent(1) from the readback script | Matches |
| 4 | Reload keeps the session, does not show sign-in form | No sign-in form after reload; 2 messages shown (1 user, 1 assistant); allowance "9 of 10 credits today, not vetted" | Matches |
| 5 | Drained account shows "0 of 10"; a refusal on send with reason/kind; the user's message is removed from the list; the draft is restored; the discovery-message request is 409 | Allowance "0 of 10 credits today, not vetted"; refusal reason and kind "daily-allowance-exhausted" shown; user message not shown in list; draft "One more message" restored to textarea; the request's HTTP status was not directly observed (only its OPTIONS preflight was in the network buffer) | Matches (allowance, refusal text/kind, message removal, draft restore); differs/unverified (409 status code not directly captured in the network log) |
| 6 | No error/warn console messages | None found | Matches |
| 7 | Stop lands while streaming; a newer turn exists so the page shows "still settling; reload to see its charge"; allowance applies the last read while settling, then equals 10 minus the sum of `charged_credits` once settled | Stop landed at t=1336ms while status was "submitted" just before the click (nearest sample before click: `{"t":1335,"status":"submitted"}`); Send stayed disabled through 900–3000ms samples; after 12s the page showed no "still settling" notice (it had already settled) with status "ready" and a partial reply "Summary so" visible; allowance "8 of 10" equalled 10 minus (1+1) charged credits from the two settled turns (seq 1 `end_turn` charged 1, seq 2 `user_stopped` charged 1) | Matches (allowance math); differs from the coordinator's literal expectation of seeing the "still settling; reload to see its charge" notice at read time — by the time it was read (12s after arming), the turn had already settled, so that transient notice was not caught in this run |
| 8 | Stop lands while submitted (before a turn opens); no newer turn appears within 20s; page shows "the stopped message did not reach Discovery; nothing was charged"; allowance stays at its last read; the stopped message's own text is not added to the list; Send re-enables | Notice text observed after 25s: "the stopped message did not reach Discovery; nothing was charged"; allowance unchanged at "8 of 10 credits today, not vetted"; the send's own message text ("...second time.") was not shown anywhere in the message list; `document.querySelector('form button[type=submit]').disabled` returned `false` (Send re-enabled) | Matches |

## Step 7 — stop while streaming (second sign-in of the fresh account)

- 2026-09-18 09:58:54Z — ran `localStorage.clear(); sessionStorage.clear();` in the tab (still on
  the drained account's page from step 5).
- 2026-09-18 09:58:5xZ — navigated to the fresh account's pageUrl. Sign-in form appeared. Filled
  email/password with form_input, then submitted with
  `document.querySelector('button[type=submit]').click()` (the JS submit click that worked
  reliably in step 5).
- 2026-09-18 09:59:28Z — signed in. Page text showed allowance "9 of 10 credits today, not
  vetted" and the same two-message transcript from step 2 (unchanged since the last visit to
  this account).
- Armed the step 3 script with the Stop-click delay changed from `700` to `1300`. Waited 12
  seconds, then read `window.__stopDrive`:
  - `clickedStopAt`: 1336
  - `stopDisabled` at the click: `false` (Stop was enabled and was clicked)
  - Sample nearest before the click: `{"t":1335,"status":"submitted","len":113,"items":3,"sendDisabled":true}`
    — the stop landed while status was still "submitted" in this sample, immediately ahead of
    the transition to "streaming" (the coordinator's brief said the delay of 1300ms would land
    it in "streaming"; the nearest captured sample just before the click still read
    "submitted", one mutation tick before the streaming state began).
  - `sendDisabledAfterStop`:
    - `{"t":900,"sendDisabled":true,"status":"submitted"}`
    - `{"t":1200,"sendDisabled":true,"status":"submitted"}`
    - `{"t":1600,"sendDisabled":true,"status":"ready"}`
    - `{"t":2200,"sendDisabled":true,"status":"ready"}`
    - `{"t":3000,"sendDisabled":true,"status":"ready"}`
    - Send stayed disabled at every sampled point, including after `status` read "ready" again.
  - Last three of 7 samples:
    - `{"t":1346,"status":"ready","len":113,"items":3,"sendDisabled":true}`
    - `{"t":2346,"status":"ready","len":113,"items":3,"sendDisabled":true}`
    - `{"t":3414,"status":"ready","len":10,"items":4,"sendDisabled":false}`
- 2026-09-18 10:00:08Z (after the 12s wait) — page text showed allowance "8 of 10 credits today,
  not vetted", status word "ready", and a fourth list item with partial text "Summary so" (a
  short, apparently truncated reply). No "still settling" notice was present at this read — the
  turn had evidently already settled by the time of this read, so the transient
  "still settling; reload to see its charge" notice described in the brief was not caught in
  this run.
- Ran `bun readback-turns.ts eea71274-7a0a-4704-95db-cbf54c1c5240`:

```json
[
 {
  "seq": 1,
  "status": "settled",
  "stop_reason": "end_turn",
  "output_tokens": 57,
  "reserved_credits": 2,
  "charged_credits": 1,
  "served_model": "claude-haiku-4-5-20251001",
  "reply_chars": 271,
  "took": "00:00:01.553122"
 },
 {
  "seq": 2,
  "status": "settled",
  "stop_reason": "user_stopped",
  "output_tokens": 19,
  "reserved_credits": 2,
  "charged_credits": 1,
  "served_model": "claude-haiku-4-5-20251001",
  "reply_chars": 12,
  "took": "00:00:01.5999"
 }
]
```

  Sum of `charged_credits`: 1 + 1 = 2. Page allowance "8 of 10" equals 10 − 2. Matches.

## Step 8 — stop while submitted (no turn opens)

- 2026-09-18 10:00:32Z — armed the step 3 script again with the original `700` delay, using a
  distinguishable message text ("...one per line, second time.") so it could be told apart from
  the earlier stopped message.
- Waited 25 seconds (5 seconds past the page's stated 20-second deadline).
- 2026-09-18 10:01:20Z — page text showed:
  - Notice line: "the stopped message did not reach Discovery; nothing was charged"
  - Allowance line: "8 of 10 credits today, not vetted" (unchanged from step 7's last read)
  - The stopped send's own message text ("...second time.") was not present anywhere in the
    message list.
  - `document.querySelector('form button[type=submit]').disabled` → `false` (Send re-enabled).
- Ran `bun readback-turns.ts eea71274-7a0a-4704-95db-cbf54c1c5240` again: identical two rows
  (seq 1 and seq 2) as in step 7 — no new row appeared, consistent with "nothing was charged"
  and no turn having opened for this stopped send.
