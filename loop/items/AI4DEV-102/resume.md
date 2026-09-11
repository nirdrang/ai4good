# Resume note for AI4DEV-102 (the vetting action and its audit record)

Paused at the founder's word on 2026-09-09, at the end of the design arena, before the pick.

## Where the run is

The Feature playbook, run once for the whole subtree. Steps 1 and 2 are done. Step 3 onward is not
started.

- Step 1, ground the subsystem with the `how` skill. Done. Three explorer reports under
  `loop/items/AI4DEV-102/how/`. The critique stage the brief asks for does not exist: pstack 1.4.0
  removed it and its role left the model sheet the same day.
- Step 2, parallel design exploration. Done. Four candidates under
  `loop/items/AI4DEV-102/design/`. Not yet judged, not yet picked, not yet grafted.
- Steps 3 to 8, the throughput checkpoint, the thirteen build units, verification, the rebase and
  the pull request. Not started.

Everything is committed at `012035f` on
`nirdrang/ai4dev-102-the-vetting-action-and-its-audit-record-d3`. The tree is clean. Nothing is
pushed beyond the brief commit that was already on origin. No product code and no test code exists
yet, so nothing is broken.

## The first action on resume

Dispatch the arena cross-judge. Its prompt is already written at
`C:\Users\nirdr\AppData\Local\Temp\claude\ai4dev102\arena-rubric.md`. That path is a session
scratchpad and may be gone; the file is short and the rubric is reproducible from this note.

The judge descriptor comes from the `arena cross-judge pool` row of `.claude/pstack-models.md`.
The lead is a Claude model, so the pool's opus entry cannot fire; pick astra at medium or grok.

Send it the four candidates by path and the six rubric criteria: does the design satisfy the ids it
claims, does the daily reset survive the integration tier, is a partial vet impossible, does it obey
the tenant scan and the write-route gate, is it as small as it can be, and could a writer build it
without guessing.

## The four candidates, and what each is for

| file | direction | new tables | its one strong idea |
|---|---|---|---|
| `candidate-1b-vetting-aggregate.md` | one vetting aggregate | 2 | the vet record is a table of not-null columns with a check that couples the evidence type to its document metadata, so a partial vet is refused by the schema |
| `candidate-2-allowance-ledger.md` | the allowance is the centre | 1 | the spend row is keyed `(org_id, utc_day)` and stores only what was spent, so the once-per-day reset is the primary key and no reset code exists |
| `candidate-3b-thin-sql.md` | three narrow records, rules in TypeScript | not yet read | not yet read |
| `candidate-4-extend-existing.md` | extend what exists, add nothing | 0 | six columns on `organizations` and no new table at all, the smallest possible diff |

The two three-line and seven-line files are dead stubs. Both external lanes were told to write their
document to a file, but an external lane runs read-only and the runner writes the model's closing
message to that same path at completion, destroying whatever the model put there. Grok lost 768
lines that way and they are not recoverable. Both lanes were re-run as `1b` and `3b`. **For any
future external lane: the final response is the artifact. Never ask it to write a file.**

## The synthesis already forming, to test against the judge rather than assume

Take candidate 2's spend ledger and candidate 1b's vetting table.

- The spend ledger keyed by `(org_id, utc_day)` puts the once-per-day invariant in the primary key.
  Candidates 1b and 4 keep one row per organisation with the day as a mutable column, which turns
  the same guarantee into a rule that the read path and the debit path must each remember.
- The vetting table with not-null columns enforces "every mandated field or no commit" in the
  schema. Candidate 2 enforces it with a raise inside the definer, which holds only while every
  caller goes through that one door.
- Use `now()`, not `clock_timestamp()`. Inside one transaction `now()` is fixed, so a lock-then-
  compute sequence cannot see the day change under it. Candidate 1b reaches for `clock_timestamp()`.
- One open question the graft must settle: if the vetting table carries the authoritative `vetted`
  flag, then `organizations.trust_tier` from candidate 2 is a second source of truth for the same
  fact. Pick one. Do not ship both.

## Decisions already made, and by whom

- **The founder ruled** how the three missing surfaces are handled: split per id. Build and prove
  every id the tree supports. Declare red, by id and with a stated shape, only the ids that need a
  surface that does not exist. No fixture producers and no new harness machinery.
- **The lead set the red set at five ids**: AT-002.10 and AT-002.31 wait on the project-fuel
  checkout, AT-002.19 and AT-002.20 wait on the publish flow, AT-002.26 waits on both the checkout
  and funded-turn billing. Candidate 2 reached the same five independently. Candidate 4 argues for a
  sixth, AT-002.05 red at the integration tier only, because no deployed surface shows the three
  remedies. That one is unsettled and goes to the judge.
- **The brief's own count is wrong.** It says twenty-five ids are in the run, but its thirteen units
  name all twenty-seven. The red set decides the split, not the brief's number.
- Units 12 and 13 ship the publish and funding decisions as pure modules, and their ids stay red.
  They must **not** gain `WRITE_ROUTES` rows: a row is a claim that a route exists, and the static
  scan then demands the auth suite drive it.

## The hard constraints any design must satisfy

Measured from the tree, not assumed. Full detail in the three explorer reports.

1. There is no time travel at the integration tier. `h.clock.advance` compiles at the loop tier only
   and no live adapter takes the harness clock. A day boundary is observed by ageing a stored day
   value with operator SQL.
2. `public.emit_notification` is a definer with execute revoked from public and granted to nobody, so
   no edge function can call it. A product definer must call it, in the same transaction as the write.
3. The notification taxonomy is closed and its oracle is checked both ways by the notifications
   suite. `vetting.outcome` already exists and covers both outcomes. Tell a vet from an unvet in the
   params, never with a new event type.
4. `audit_events.event_kind` is a Postgres enum. A new value needs its own migration, because
   Postgres refuses to use a new enum value in the transaction that adds it.
5. Every new public table needs a baseline revoke from all three roles, RLS enabled, a row in
   `TENANT_CATALOG` in `tests/at/suites/req-001/_policy-scan.ts`, and a posture. The scan has about
   twenty-five ways to fail.
6. `VIEWER_FUNCTIONS` is a closed set of three in the auth suite's live check. Do not add a fourth
   `viewer_` helper.
7. Adding a write route forces small edits in three auth-suite files, because their
   `Record<WriteRouteName, ...>` types are exhaustive.
8. The grants 10 and 30 are already pinned in `tests/at/harness/atconfig.ts`. Never write them in a
   test body.
9. CI runs the loop tier only. Integration-tier evidence is produced locally with
   `bun run db:start` and `bun run at:verify req-002 --tier integration --expect`.

## Gotchas that cost time already

- This project forbids the Bash tool. Use PowerShell for every shell command.
- `grok.exe` is not on the tool shell's PATH. Prepend `$env:USERPROFILE\.grok\bin` per call.
- The read shunt refuses an unbounded read of a file over 350 lines. Page it with `offset` and
  `limit`, or send a read lane with a named aim.
- Never paste the output of `bun run db:start`. It contains a secret key, and GitHub push protection
  then refuses every later push on the branch.

## The trail

`loop/items/AI4DEV-102/decisions.tsv`. One row per decision, append-only. It carries the founder's
ruling, the red-set derivation, the two lost lanes, and the design fork.
