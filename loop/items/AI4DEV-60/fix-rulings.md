# AI4DEV-60 (session expiry, refresh, password reset) — FIX-SITTING RULINGS on the executor's report

**Sitting 3 of the item: FIX AND GOAL. Ruled by the `orchestrator` definition on fable
(claude-fable-5, effort xhigh).** The executor implemented all seven gate-2 rulings, ran plan
steps 4–6, and reached the goal: 13 green / 24 red on req-001 (re-run first-hand by this
sitting — exact declaration match, exit 0), req-016 unchanged at 11 / 1, the selftest at 264,
and the live proof at 7 checks / 7 passed. It returned four proposed judgments — live
measurements that contradict the plan's written expectations. The fail-and-re-pin protocol
covered the checks themselves; these rulings settle the record.

## Ruling 1 — check (a): a session row already exists before the wrong-password attempt

Measured: following the emailed confirmation link is an implicit-flow sign-in, and GoTrue
mints a session at that moment — so "no `auth.sessions` row for the user" was false before
the refused attempt was ever made. **ACCEPT the re-pin.** The check now asserts the
criterion's own clause — the REFUSED attempt creates no row, measured as an unchanged
session-id set — which is stronger evidence than the plan's original sentence, not weaker.
Plan D-G (a) is amended to the measurement. The contract's issuance-gap paragraph needs no
change: it says the live stack issues no session AT SIGNUP, which the measurement confirms —
the session appears at link use.

## Ruling 2 — checks (c) and (d): `/auth/v1/user` answers 403, not 401, for a dead token

Measured twice: HTTP 403 for the revoked token (error code `session_not_found`, exactly as
pinned) and HTTP 403 for the expired one (`bad_jwt`, token-expired message). **ACCEPT the
re-pin.** The vendor claims themselves — revocation ends access before the JWT's own expiry;
expiry ends access — are confirmed; only the status number was wrong, and nothing shipped
reads it: `callerFromAuthAnswer` accepts 2xx and refuses everything else, so 403 and 401 are
the same refusal to every line of this repository's code. Plan D-G (c) and (d) are amended.

## Ruling 3 — `POST /auth/v1/logout` defaults to the GLOBAL scope; the fixture models LOCAL

Measured: a plain logout emptied `auth.sessions` — every row, not one. The fixture's
`signOut(session)` and its mirror-6 comments ("ONE SESSION, NOT THE ACCOUNT") describe the
`?scope=local` shape. No acceptance body asserts either shape — every body signs in afresh
after a sign-out, which both scopes permit — and check (c) as run binds the mirror precisely:
`?scope=local` with a sibling session as the control that exactly one row disappeared, then
the default measured and recorded. **ACCEPT, with a record fix:** the mirror-6 comments in
`_fixture.ts` (the `signOut` block) and `_contract.ts` (the `signOut` doc) gain a clause
naming the scope — the fixture models `?scope=local`, the vendor's DEFAULT scope is `global`
(measured, recorded in `proof-local.txt`), and no body asserts the difference. The fixture
header's mirror-6 line gains the same word if it describes the logout shape. Behaviour
changes nowhere.

## Ruling 4 — the expired-token refusal at the deployed function is the platform's

Measured: `verify_jwt = true` makes the edge runtime reject an expired JWT (body
`Invalid JWT`) before the function runs, so an expired token never reaches `resolveCaller`;
check (c)'s revoked token — still signed, unexpired — is the one that passes the platform and
is refused by this repository's own sentence. **ACCEPT.** The two checks cover the two layers
only together, and the record must say which layer each binds. Plan D-G (d) gains the
clause. The transcript already states it in check (d)'s own note.

## Disposition summary

| proposed judgment | ruling |
|---|---|
| (a) row exists before the attempt | accept — re-pin stands, plan amended |
| (c)/(d) 403 not 401 | accept — re-pin stands, plan amended, nothing shipped reads the number |
| logout default scope is global | accept — mirror-6 comments gain the scope clause (executor applies) |
| expired-token refusal is the platform's | accept — plan D-G (d) gains the layer clause |

All four are the fail-and-re-pin protocol doing its job: the expectation was written down,
the measurement disagreed, both readings are in the transcript, and the record now matches
the measurement. None contradicts ratified text and none is scope growth — no founder
question arises.
