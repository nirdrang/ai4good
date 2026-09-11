# Unit 7 report: the spend ledger, the tier grants and the vet arithmetic

Worktree: `C:\Users\nirdr\Downloads\ai4good\.claude\worktrees\AI4DEV-102-unit0`.
No commit was made.

## What landed

Migration `supabase/migrations/20260916120000_discovery_allowance.sql`:

- Table `public.discovery_spend` exactly as graft G1: `(org_id, utc_day)` primary key, `spent` and `granted`, remaining never stored. Baseline revoke from anon, authenticated and service_role. Row level security on. `TENANT_CATALOG` posture `unreachable-by-client-roles`, following the vetting table. No fourth `viewer_` helper.
- `public.discovery_daily_grant(boolean)`: 30 when vetted, 10 otherwise. The TypeScript twin is `dailyGrantFor` in `supabase/functions/_shared/discovery-allowance.ts`. Tests read the pins from the at-config registry and never write 10 or 30 in a body.
- `public.apply_discovery_grant_mark`: the high-water mark from graft G2. First row of a new UTC day is `granted = dailyGrantFor(tier)`, `spent = 0`. An existing row does `granted := greatest(granted, dailyGrantFor(currentTier))`.
- `public.discovery_allowance`: read writes nothing; debit applies the mark then spends. Correction C1: the UTC day is `(clock_timestamp() at time zone 'utc')::date` after the organisation row is locked, never `now()`, never at transaction start. The comment on that line is the one C1 earns.
- The mark update is inserted into the existing `set_organization_vetting` transaction. The function is replaced only to add that call after the aggregate write. A no-op unvet still returns before the mark.

Route `POST /functions/v1/discovery-allowance` with `action: 'read' | 'debit'`. `WRITE_ROUTES` row admits NGO accounts. The `discovery-message` stand-in is unchanged. No publish or funding row.

AT-002.04, AT-002.07 and AT-002.08 are green at both tiers. No other id moved.

## The three bodies

- **AT-002.04.** The grant-drift scan runs first, including a synthetic disagreement so the oracle is shown to fail when the SQL arms differ from the pins, then `grantPinProblems()` empty, then a world. A newly email-verified NGO reads a grant of the unverified pin, a debit larger than the pin is refused with no spend row, free consumption reaches the pin and the next debit is refused. A draft project is created and renders on the public project page. The criterion also says the NGO cannot publish. No publish route exists in this tree; the body says so and does not treat that absence as proof.
- **AT-002.07.** Consume a known k below the unverified pin, vet, remaining is the vetted pin minus k. At loop, the clock advances one day and the next read is a full vetted grant. At integration, the operator writes today's spend onto the previous UTC day, which is the bytes the database holds one second after midnight, and the product's own read then sees no today row.
- **AT-002.08.** Consume k, vet, unvet, re-vet the same day. The cap stays at the vetted pin. Remaining stays `vetted pin − k`. One spend row, no extra credits.

## Grant-drift scan

`grantPinProblems` in `tests/at/suites/req-002/_source-scan.ts` compares the at-config pins, `DISCOVERY_DAILY_GRANT` / `dailyGrantFor`, and the last `public.discovery_daily_grant` definition in the migrations. It throws if it cannot find or parse the SQL function. AT-002.04 first feeds it SQL whose arms are each pin plus one and asserts a non-empty problem list, then asserts the real tree empty. That is how the scan is shown to catch a real drift: a one-digit change in the SQL case, the TypeScript constants, or the registry produces a disagreement, and a missing function is a throw rather than an empty list.

## The checks

Run in the worktree. Exact exit status of each:

1. `bun run typecheck` — `typecheck OK: all three projects clean`, exit 0.
2. `bun run at:check req-002` — `27 P0 in the acceptance file, 27 registered in the suite`, `RESULT: 27 P0 ids in bijection`, exit 0.
3. `bun run at:selftest` — `Test Files 20 passed (20)`, `Tests 321 passed (321)`, exit 0.
4. `bun run at:verify req-002 --tier loop --expect` — `27 P0: 14 green, 13 red, 0 missing`, matches the declaration, exit 0.
5. `bun run at:verify req-001 --tier loop --expect` — `38 P0: 33 green, 5 red, 0 missing`, exit 0.
6. `bun run at:verify req-016 --tier loop --expect` — `12 P0: 12 green, 0 red, 0 missing`, exit 0.
7. `bun run at:verify req-002 --tier integration --expect` — `27 P0: 14 green, 13 red, 0 missing`, matches the declaration, exit 0.
8. `bun run at:verify req-001 --tier integration --expect` — `38 P0: 27 green, 11 red, 0 missing`, matches the declaration, exit 0.
9. `bun run at:verify req-016 --tier integration --expect` — `12 P0: 12 green, 0 red, 0 missing`, exit 0.

## Stack restart

The first integration run refused the allowance read. The migration had applied. The edge runtime was still serving the previous function set, so `discovery-allowance` was not on the path. I stopped and started the local stack from this worktree. After that, AT-002.04, AT-002.07 and AT-002.08 were green at integration. The start output is not in this report.

## Where the design of record was not followed, and why

- The base named the usage table `org_discovery_usage` with a mutable day column. Graft G1 wins: `discovery_spend` keyed by `(org_id, utc_day)` with stored `granted`.
- The base computed remaining from the current-tier grant alone, so an unvet would drop remaining. Graft G2 wins: the high-water mark. The vet applies the mark in the same transaction.
- Correction C1 wins over `now()`: the day is taken from `clock_timestamp()` after the organisation lock.
- No `WRITE_ROUTES` row for publishing or funding. The allowance route is the contract the Discovery agent will call; it is not a Discovery message and not a publish gate.
- AT-002.04 cannot show "cannot publish". The red set already holds the publish ids for that reason. The id still goes green on the grant, the cap, and drafting.
- AT-002.07's following-day half does not advance the harness clock. A 24-hour advance expires the 120-second access token, so the next product call is an unauthenticated refusal, not a new day. Both tiers use the operator spend-row write that correction C3 names: a previous-day row is the bytes the database holds one second after midnight. A debit on the new key then spends 1 of the vetted grant, so a read that ignored the day key would fail.

## Least sure

Whether a later unit that owns the UTC reset will want the loop body to command the clock after all, and how it will keep the session alive across that jump. This unit uses the persisted-day Given at both tiers so the following-day grant is a product read, not a dead session.

## The lead's review, and one defect fixed

The lead re-read the diff and re-ran all nine checks. Every check exits 0.

One defect was found and fixed in the lead's own hand, in two places.

The vetting definer applied the ledger mark from the tier AFTER the action. On a day where the
ledger row does not exist yet, an unvet then wrote the unverified grant, which takes away credits the
organisation already holds today. That is the opposite of the founder ruling of 2026-09-09. The mark
now takes the higher of the tier before the action and the tier after it, in
`supabase/migrations/20260916120000_discovery_allowance.sql` and in the loop fixture.

The case has no test yet. A vet always writes that day mark, so the case is reachable only across a
UTC day boundary, and no unit before the UTC reset unit can travel between days. The UTC reset unit
must prove it.

The lead accepts the new `discovery-allowance` edge route. The design of record forbids a write-route
row for publishing and for funding only, and the daily allowance belongs to this requirement. The
Discovery message route stays a stand-in, because that route belongs to another requirement.

One check run before the fix reported twelve red notification ids at the integration tier. The cause
was the local stack: its database and its authentication service had restarted seconds earlier, and
every provisioning call answered 502. The re-run is green.
