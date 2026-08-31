# Email signup and confirmation

A visitor signs up with an email and a password. The platform requires the address to be
confirmed before any sign-in works (`enable_confirmations = true` in
`supabase/config.toml`). The confirmation email lands in the local mail catcher, never on the
internet.

## Sub-features

- Signup issues no session while the address is unconfirmed.
- Sign-in is refused until confirmation.
- The confirmation link flips the account to confirmed; sign-in then succeeds.

## How to get to it (user POV)

There is no signup screen yet. The user path is the Auth API the future screen will call:
sign up, receive the email, click the link, sign in.

## Driving it with the HTTP harness

Keys from `bunx supabase status -o json`. `API` is `http://127.0.0.1:44321`.

1. `POST {API}/auth/v1/signup`, header `apikey: <ANON_KEY>`, body
   `{"email": "<unique>@example.com", "password": "<12+ chars>"}`. Expect 200 with a `user`
   object and NO `access_token`.
2. `POST {API}/auth/v1/token?grant_type=password` with the same credentials. Expect 400
   (`email_not_confirmed`).
3. `GET http://127.0.0.1:44324/api/v1/messages` — find the message to that address;
   `GET http://127.0.0.1:44324/api/v1/message/{ID}` — extract the
   `{API}/auth/v1/verify?...` link from the body.
4. `GET` the link with redirects disabled. Expect a 3xx Location toward the site URL.
5. Repeat step 2. Expect 200 with an `access_token`.

## What proves it

Step 1's response has no token, step 2 refuses, step 5 succeeds — captured as pairs. The
side effect: Mailpit really held one message for the address.

## Gotchas

- `[auth.rate_limit] email_sent = 2` per hour. A third signup in an hour sends no email and
  the drive stalls at step 3. `bun run db:reset` does not reset the limiter; restarting the
  stack does. Use unique addresses and keep drives to one or two per hour, or restart.
- The Location fragment of the verify redirect carries a minted token. Redact it before it
  reaches any transcript.
- `max_frequency = "1s"` between resend attempts; back off rather than hammering.
