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

Keys from `bunx supabase status -o json`. `API` is `http://127.0.0.1:44321`. The Mailpit
API is `http://127.0.0.1:44324`.

1. `POST {API}/auth/v1/signup`, headers `apikey: <ANON_KEY>` and `Authorization: Bearer
   <ANON_KEY>` (the harness sends both on every Auth post). The body is
   `{"email": "<unique>@example.com", "password": "<6+ chars>"}` (`minimum_password_length =
   6`). Expect 200 with a `user` object and NO `access_token`.
2. `POST {API}/auth/v1/token?grant_type=password` with the same credentials. Expect 400
   (`email_not_confirmed`).
3. `GET {MAIL}/api/v1/search?query=to:<address>&limit=50` — the message list for that
   address; for each `ID`, `GET {MAIL}/api/v1/message/{ID}/raw` — the raw source. Decode
   quoted-printable (join soft line breaks `=\r\n`, then `=XX` escapes, then `&amp;` to `&`).
   Collect the `http(s)://` links, and keep those containing `/auth/v1/verify` and
   `type=signup`. Mail is not synchronous with the request: poll for up to 20 seconds at
   250 ms. This is `verifyLinksFor` in `tests/at/harness/live-stack.ts`.
4. `GET` the link with redirects disabled. Expect a 3xx Location toward the site URL.
5. Repeat step 2. Expect 200 with an `access_token`. The token lives `[auth] jwt_expiry`
   seconds (120 on this stack); use it promptly or sign in again.

Readback over `DB_URL`, before step 4 and again after it:

```sql
select id, email_confirmed_at from auth.users where email = '<address>';
select count(*) from public.accounts where id = '<user id>';
```

`email_confirmed_at` is null before the link and set after it. The `accounts` count is 0 both
times: signup and confirmation create no account row; completion does (see
ngo-signup-completion.md).

The shipped drive `scripts/drive-ngo-signup.ts` runs steps 1 to 5 as its checks (b) to (e),
then continues into the NGO completion.

## What proves it

Step 1's response has no token, step 2 refuses, step 5 succeeds — captured as pairs. The
side effects: Mailpit really held one message for the address, and `auth.users` flipped from a
null to a set `email_confirmed_at`.

## Gotchas

- `[auth.rate_limit] email_sent = 2` per hour, but the config comment says it "Requires
  auth.email.smtp to be enabled". `[auth.email.smtp]` is commented out on this stack. The
  limits that do apply are `sign_in_sign_ups = 30` and `token_verifications = 30` per 5 minutes
  per IP. `bun run db:reset` does not reset a limiter; restarting the stack does. Use unique
  addresses; if step 3 finds no message after 20 s, restart the stack and try again.
- The stack reads `config.toml` at start (the `jwt_expiry` comment says so in words). A change
  to `enable_confirmations` or `jwt_expiry` needs `bun run db:stop` then `bun run db:start`.
- The Location fragment of the verify redirect carries a minted token. Redact it before it
  reaches any transcript.
- `max_frequency = "1s"` between resend attempts; back off rather than hammering.
