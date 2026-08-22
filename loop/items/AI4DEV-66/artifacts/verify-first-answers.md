# Verify-first answers — AI4DEV-66 (cross-organisation denial, no existence oracle), slice 1

Written by the EXECUTOR sitting, 2026-08-13, at head `b247772` on
`nirdrang/ai4dev-66-denying-access-across-organisations-with-no-existence-oracle`.

This file records what was MEASURED and what was NOT. Nothing in it is inferred from the code.

---

## (a) Plan step 6 — the privilege posture under the existing suite. **NOT MEASURED.**

**The measurement plan step 6 asks for, in full:**

1. `GET /rest/v1/org_memberships` with the ANON key still answers `401` with a body matching
   `/permission denied/i` — the assertion `_integration.ts` AT-001.17 arm 2 already makes, and the
   one this slice's `grant select … to authenticated` could have moved.
2. The four newly granted tables — `public.organizations`, `public.org_memberships`,
   `public.acknowledgments`, `public.projects` — answer the same way to `anon`.
3. AT-001.17 stays green at the integration tier.

**IT WAS NOT MADE, AND NO RESULT IS INVENTED FOR IT.** Every part of it needs the slot's live stack,
and the stack is down.

**The evidence that it is down** is `integration-attempt.txt` beside this file: the one permitted
integration run exited **3**, the runner's INFRASTRUCTURE code, in about five seconds, and said

> slot 1 reported no running stack (the stack reports stopped services:
> `supabase_kong_ai4good-slot-1`, `supabase_edge_runtime_ai4good-slot-1` — start them before running
> the suite), so nothing was reset and nothing was run

No database was reset. No test was run. No id was graded. That matches what the founder relayed
before this sitting began: the gateway container cannot bind its API port because Windows has it
reserved, and the edge-function container fails to mount its entry file.

**Only the founder can clear it.** Under the orchestrator's ruling this sitting ran the integration
verify EXACTLY ONCE and stopped. Nothing was started, stopped, restarted, rebuilt or reconfigured to
work around it; no port was changed; `supabase/config.toml` was not edited; `AT_DB_SLOT` was not
set; and **`supabase db reset` was not run, directly or through any wrapper** — gate-1 ruling 10, the
most dangerous line in this item.

### What must be measured before this slice merges

| # | measurement | why it cannot wait |
|---|---|---|
| 1 | `GET /rest/v1/org_memberships` with the ANON key: exact status and exact body | The whole of plan step 6's first clause. `anon` receives no grant in this slice's migration, so the answer *should* be unchanged — but "should" is the word this step exists to delete. |
| 2 | The same read, as `anon`, against `organizations`, `acknowledgments` and `projects` | Three tables this slice grants to `authenticated` for the first time. A grant written to the wrong role would show up here and nowhere else. |
| 3 | AT-001.17 green at the integration tier | It is the landed id whose own arm asserts measurement 1. If the posture moved, this is the id that reports it. |
| 4 | `select count(*) from pg_policies where schemaname='public'` over the operator connection, greater than zero | Plan step 5's replacement done-criterion (gate-1 ruling 10). It is what proves the migration's policies really landed rather than merely parsed. |
| 5 | The integration run's own slot evidence line — the slot, that the reset happened, and the migration count | The executor contract requires it carried into the report verbatim. This run printed no such line, because it never reached the reset. |
| 6 | AT-001.21 and AT-001.22 green at the integration tier | The declaration in `tests/at/expected/req-001.json` now says green for both at BOTH tiers. At the integration tier that is an **EXPECTATION**, not a measurement. |

**Until measurement 6 is made, this slice has proved its two ids against stand-ins only.** The loop
tier grades the decision module and the fixture's storage; it says nothing about the migration, the
deployed functions, row-level security or Supabase Auth.

---

## (b) Gate-1 ruling 4 — the no-oracle property under a database fault. **MEASURED, at the loop tier.**

The ruling's remedy is an ordering constraint, and its proof is one loop-tier arm rather than an
assertion. Arm 7 of AT-001.22's loop body arms a one-shot read fault against each store the project
workspace reads — `accounts` and `projects` — and asserts that an existing-but-foreign project and a
well-formed identifier that names nothing produce the SAME outcome: same status `502`, same body.

**Measured green**: `bun run at:verify req-001 --tier loop --expect` exits 0 with AT-001.22 green.

**What it does NOT cover, said plainly.** The arm rides on `project-workspace`, which makes exactly
TWO reads. `organization-dashboard` makes FOUR, and its ordering is where a lookup issued after the
target read would do the most damage. The plan's arm list for AT-001.21 does not include a fault arm
and the orchestrator placed the single ruled arm on AT-001.22, so the executor built what was ruled
and reports the gap rather than widening the ruling.

**There is no fault injection at the integration tier**, by design: `_live.ts` does not name
`failNextReadOf` in `backedSutMethods`, so an integration body that reached for it would refuse by
name rather than fault a real database.

---

## (c) The `_shared/edge.ts` importer count. **MEASURED, and it disagreed with the instruction.**

The orchestrator's amendment said five deployed functions import `supabase/functions/_shared/edge.ts`
and asked for the count corrected. Measured instead of assumed:

```
grep "from '../_shared/edge.ts'" over supabase/functions/
```

returns **six** deployed functions — `complete-signup`, `create-organization`, `update-organization`,
`organization-dashboard`, `project-workspace`, `public-project-page` — plus `edge.ts` itself, which
matches only because its own comment quotes that specifier inside prose. The header now says six.

---

## (d) Where the runner writes. **MEASURED, and worth recording.**

The integration attempt's STDOUT was empty and its whole report arrived on STDERR. An empty stdout
here is the runner's stream choice, not an absent answer. Both streams were captured separately and
both are in `integration-attempt.txt`, so the negative was read with a second instrument before being
reported.

---

## What DID pass, at this head, on this machine

| command | exit |
|---|---|
| `bun run typecheck` | 0 |
| `bun run at:check req-001` | 0 — 37 P0 ids in bijection |
| `bun run at:verify req-001 --tier loop --expect` | 0 — 23 green / 14 red, exact match |
| `bun run at:selftest` | 0 — 13 files, 344 tests passed |
| `bun run at:verify req-001 --tier integration --expect` | **3 — INFRASTRUCTURE, zero tests run** |
