# Unit 6 record: the local email rate limit, measured

Measured on 2026-09-06 on the one local stack (`supabase/config.toml`, Supabase CLI v2.110.0, GoTrue `v2.193.0`). No product code lands for this unit. The raw records are under `artifacts/measure/`.

## What the file says and what the container runs

`[auth.rate_limit]` in `supabase/config.toml` (lines 228 to 241) sets `email_sent = 2`, `sign_in_sign_ups = 30`, `token_refresh = 150`, `token_verifications = 30`, `sms_sent = 30`, `anonymous_users = 30`.

The running auth container (`unit6-auth-container-env.txt`) carries `GOTRUE_RATE_LIMIT_EMAIL_SENT=360000`, `GOTRUE_RATE_LIMIT_TOKEN_REFRESH=150`, `GOTRUE_RATE_LIMIT_VERIFY=30`, `GOTRUE_RATE_LIMIT_OTP=30`, `GOTRUE_RATE_LIMIT_SMS_SENT=30`, `GOTRUE_RATE_LIMIT_ANONYMOUS_USERS=30`. Two facts follow.

1. The CLI does not push `email_sent`. The container has the vendor's local default, 360000 per hour, in place of the file's 2. The local stack therefore never throttles email, so the file's value cannot be verified here.
2. The CLI pushes no variable for `sign_in_sign_ups`. The password grant probe (`unit6-signin-rate-limit.txt`) sent 45 wrong-password grants from one address in 0.66 seconds and got 45 answers of 400 `invalid_credentials`, no 429, and no rate-limit header. The file's 30 per five minutes is not enforced locally.

## What the CLI does push

The hook probe (`hook-push-probe.txt`) added a temporary `[auth.hook.password_verification_attempt]` block, restarted the stack, and read `GOTRUE_HOOK_PASSWORD_VERIFICATION_ATTEMPT_ENABLED=true` with the `pg-functions://` URI in the container; after the revert the variables were gone. So a product-side sign-in counter through that hook is reachable on this stack. This run does not ship one (rulings R11: it would be SQL the loop tier cannot grade, and a control the criterion did not ask for). The founder can overturn that ruling.

## Where the two limits are verified

Both limits are the vendor's, enforced by the hosted Auth service from the project's dashboard settings, and both are verified there, outside this tree. AT-001.34 (sign-in rate limit) is declared red at both tiers with the capability `vendors.gotrue-sign-in-rate-limit`. The email limit has no acceptance id in this requirement; its record is this file.

## Open causes, not resolved here

Three candidate causes for the unpushed values stay open and named so a later leaf does not re-measure blind: the CLI version maps only some `[auth.rate_limit]` keys to container variables; the local image applies its own defaults over pushed values for email; the `--ignore-health-check` start path skips a config step. None was tested.
