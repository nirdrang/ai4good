# Unit 1 writer: cross-organisation denial with no existence oracle (AT-001.21, AT-001.22)

You are the writer for unit 1 of the tenant-isolation deliverable. You work in the git worktree at `/home/user/ai4good/.claude/worktrees/unit-1`, on branch `ai4dev-55-unit-1`. Stay inside that directory for every read, write and command. Never touch `/home/user/ai4good` itself or any other worktree. Never change a file under `src/`.

## The contract

Read, in this order, all from the worktree root:

1. `loop/items/AI4DEV-55/artifacts/arena/design.md` — the design. It is the contract. Its unit 1 section says what you build.
2. `loop/items/AI4DEV-55/artifacts/how/rulings.md` — the rulings the design honours. Every "act on" item binds you.
3. `loop/items/AI4DEV-55/brief.md` — the item, and the two acceptance ids of this unit, which you read verbatim in `.taskmaster/docs/acceptance/at-req-001.md`, section E.
4. `loop/items/AI4DEV-55/artifacts/how/explanation.md` — how the tree decides visibility today. Check it against the code where you doubt it.
5. The files the design changes, all of them, before you change one: `supabase/migrations/*.sql`, `supabase/functions/_shared/*.ts`, the three existing function entry points, `supabase/config.toml`, `tests/at/harness/live-stack.ts`, `tests/at/harness/registry.ts`, `tests/at/suites/req-001/*.ts`, `tests/at/expected/req-001.json`, `tests/at/README.md`, and `c-membership-and-acknowledgment.test.ts` with its bodies as the landed precedent for a per-tier body.

The design is a sketch with signatures. You fill the bodies. Where the design and the tree disagree on a detail (a helper's real signature, a row type's real fields, how `_fixture.ts` resolves a session), the tree wins on the detail and the design wins on the decision. Where you cannot follow the design without breaking a ruling, take the smallest change that keeps every ruling and name it under "Deviations" in your report. Do not redesign.

## What unit 1 lands

Everything `design.md` lists under "Unit 1, green on its own": migration one; `supabase/functions/_shared/tenant-reads.ts` and `public-project.ts`; the `edge.ts` adapters; the three functions `organization-dashboard`, `project-workspace`, `public-project` with their `supabase/config.toml` entries; `restGet` and `functionPostRaw` in `live-stack.ts`; the `_contract.ts` types and members and the two comment corrections; the `_fixture.ts` members; the `_live.ts` members with `freshAccessToken` and `viewerRead`; `_policy-scan.ts` with the six-table catalog; the two selftests; the loop and integration bodies for AT-001.21 and AT-001.22; the manifest rows for those two at both tiers; `_pending.ts` losing `D5_L1` with its header counts corrected. Nothing from unit 2: no volunteer policy, no administrator policy, no trigger, no `viewer_is_platform_admin`, no `viewer_is_volunteer`.

Facts settled for you:

- No body under `tests/` pins the row-level-security message on a client-key insert into `accounts` (grep run on 2026-09-05: zero matches). Migration one drops that grant and says so in its header.
- The migration file name is `20260906120000_tenant_read_posture_and_org_member_policies.sql`.
- The loop tier's registry guard (`tests/at/harness/registry.ts`, the check near line 525) fails a body that passes without opening a fixture world or consuming captured evidence. Your loop bodies open the world and drive the shipped cores through the fixture surface.
- AT-001.22's positive control in unit 1 is the owning NGO's viewer read of the project and the public page's 200; the assigned-volunteer success belongs to unit 2.
- `AccountsSut` is one flat type bound by both adapters; every new member exists in both `_fixture.ts` and `_live.ts`, the loop ones throwing `CapabilityPending` where the design says so.

## Rules for the diff

- Comments state a non-obvious why only. No narrating comments, no phase markers, no restated signatures. The migration header paragraphs the design asks for are the exception, because the catalog check tests them.
- TypeScript under `tests/at` compiles under `tests/at/tsconfig.json` (strict, Node, `.ts` import specifiers, type aliases not interfaces in the contract). Pure modules under `supabase/functions/_shared/` use relative imports only, no `Deno` global, no I/O.
- Match the style of the file you are in. Do not reformat or improve adjacent code.
- Commit liberally on `ai4dev-55-unit-1`, in the worktree, with messages that begin `AI4DEV-55:` and name no other item id anywhere. The lead rebases later; commit shape does not matter, commit content does.

## Gates, in order, all from the worktree root

1. `bun run typecheck`
2. `bun run at:check req-001`
3. `bun run at:selftest`
4. `bun run at:verify req-001 --tier loop --expect` and `bun run at:verify req-016 --tier loop --expect`
5. The integration tier. The one local stack on the 44321 block serves edge functions from the checkout that started it, and it currently mounts `/home/user/ai4good/supabase/functions`, not yours. Before the first integration run, from the worktree root: `bun run db:stop`, then `bun run db:start`, then confirm with `docker inspect supabase_edge_runtime_poancmeitlmxejofwzuu --format '{{json .Mounts}}'` that the mount names your worktree's `supabase/functions`. Then `bun run at:verify req-001 --tier integration --expect`. The run resets the database itself. Run one integration run at a time and nothing else against the stack while it runs.
6. Every gate green at the end, on the committed tree.

A red you cannot turn green is not a reason to weaken a test, widen a declaration, or skip. Record it exactly and stop at that gate.

## The report

Write `loop/items/AI4DEV-55/artifacts/units/unit-1-report.md` in the worktree and commit it. It carries: what you built, file by file in one line each; every gate with the exact command, its exit code and the summary line it printed; the migration's effect as the live catalog saw it; deviations from the design, each with the reason; anything discovered that belongs to a later requirement. Plain sentences, no labels the lead has to decode.

Then reply with exactly five lines: the report's path; one line per gate group saying green or the first red (typecheck and check, selftest and loop tiers, integration tier); one line naming your deviations or "no deviations".
