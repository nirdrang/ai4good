# Goal runs — AI4DEV-62 (per-org roles and isolation) and its single-seat partner item

Plan step 9's four runs, all at head `bcb91cf` (the last commit before this file), on 2026-08-12
between 17:39 and 17:48 local time (UTC+3). Every run exits 0 under `--expect`. The two integration
runs took the item's own reserved slot, **slot 2**, and each one carries its own slot evidence line.

`bun run typecheck` exit 0 and `bun run build` exit 0 before the first run.

**One generated file rides along, and the runs saw it.** `bun run build` regenerated
`src/routeTree.gen.ts`, adding a type-only `declare module '@tanstack/react-start'` block at the
end of the file. It was in the working tree for all four runs and it is committed with this record,
so the runs graded the tree this commit holds. The block adds no route and no invite or add-member
naming, so AT-001.17's source arm reads it exactly as before.

The whole set needed **zero fix iterations**: no run reported a deviation, so no code changed
between the runs. One environment repair was needed first and it is recorded at the end, because a
green that cannot say what it ran against is worth less than the run that produced it.

---

## 1. `bun run at:verify req-001 --tier loop --expect` — exit 0

```
  37 P0: 18 green, 19 red, 0 missing
  EXPECTED: the run matches …\tests\at\expected\req-001.json exactly (18 declared green, 19 declared red)
```

18 green / 19 red, exactly the count plan step 8 states. AT-001.16, .36, .37, .17 and .32 all green.
The loop tier takes no database slot, so it prints no slot evidence line; this is the tier CI's
required check runs, and it grades this item against the fixture's stand-ins.

## 2. `bun run at:verify req-001 --tier integration --expect` — exit 0

Slot evidence, verbatim:

```
db-pool — slot 2 identity proven before the prepare: project ai4good-slot-2, api 56321, db 56322, containers supabase_imgproxy_ai4good-slot-2, supabase_pooler_ai4good-slot-2
db-pool — slot 2 identity proven before the reset: project ai4good-slot-2, api 56321, db 56322, containers supabase_imgproxy_ai4good-slot-2, supabase_pooler_ai4good-slot-2
db-pool — docker confirms slot 2's own database container before the reset: supabase_db_ai4good-slot-2
at:verify — 4 migrations expected, 4 applied — the rebuilt schema matches supabase/migrations exactly
at:verify — db slot 2 (ai4good-slot-2, api 56321) — reset OK — migrations: 4 expected, 4 applied
```

```
  37 P0: 13 green, 24 red, 0 missing
  EXPECTED: the run matches …\tests\at\expected\req-001.json exactly (13 declared green, 24 declared red)
```

13 green / 24 red, exactly the count plan step 8 states. The five ids this item lands are green
against the real database, including AT-001.37 with the fourth arm ruling R5 added — the operator
re-points a seated membership at the volunteer and the NGO-only trigger's UPDATE half refuses it.
Every other id keeps its declared kind: the five `CapabilityPending` reds (.02, .03, .04, .05, .10)
and the nineteen `AtPending` reds are unchanged.

## 3. `bun run at:verify req-016 --tier loop --expect` — exit 0

```
  12 P0: 11 green, 1 red, 0 missing
  EXPECTED: the run matches …\tests\at\expected\req-016.json exactly (11 declared green, 1 declared red)
```

The untouched requirement, unchanged.

## 4. `bun run at:verify req-016 --tier integration --expect` — exit 0

Slot evidence, verbatim:

```
db-pool — slot 2 identity proven before the prepare: project ai4good-slot-2, api 56321, db 56322, containers supabase_imgproxy_ai4good-slot-2, supabase_pooler_ai4good-slot-2
db-pool — slot 2 identity proven before the reset: project ai4good-slot-2, api 56321, db 56322, containers supabase_imgproxy_ai4good-slot-2, supabase_pooler_ai4good-slot-2
db-pool — docker confirms slot 2's own database container before the reset: supabase_db_ai4good-slot-2
at:verify — 4 migrations expected, 4 applied — the rebuilt schema matches supabase/migrations exactly
at:verify — db slot 2 (ai4good-slot-2, api 56321) — reset OK — migrations: 4 expected, 4 applied
```

```
  12 P0: 0 green, 12 red, 0 missing
  EXPECTED: the run matches …\tests\at\expected\req-016.json exactly (0 declared green, 12 declared red)
```

The untouched requirement, unchanged at this tier too.

---

## The environment repair, recorded

The Docker daemon was DOWN when this sitting started its measurements, so the first attempt at the
after-half probe refused with "slot 2 reported no running stack". Docker Desktop was started; the
slot 2 containers came back, but `supabase_kong_ai4good-slot-2` and
`supabase_edge_runtime_ai4good-slot-2` could not, because the bind-mounted files the Supabase CLI
writes under `.temp/start-secrets` at start time were gone.

The slot 2 stack was then stopped and started again through the pool's own CLI seam
(`runSupabaseCli(slotTarget(2), …)`, project `ai4good-slot-2`, workdir
`…\ai4good-build\db-slots\slot-2`). Slot 1 and the personal stack were never touched.

The FIRST req-001 integration attempt after that still answered 502 on every live call. The cause
was measured, not guessed: `supabase_kong_ai4good-slot-2` held the auth container's OLD address
(`172.20.0.8`) while the auth container had come back at `172.20.0.6`, so kong refused every
upstream connection. Its own log names the failure —
`connect() failed (111: Connection refused) while connecting to upstream … 172.20.0.8:9999`. A
second stop-and-start of slot 2 made kong resolve the running auth container, and
`GET /auth/v1/health` through kong answered `200 {"version":"v2.193.0","name":"GoTrue",…}`.

No product code, no test code and no declaration changed for any of this. The four runs above all
ran after the repair.
