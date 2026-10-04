# Writer brief: unit 5, the real route

You are the writer for unit 5 of AI4DEV-181 (Discovery wired to backend). Work only in your working
directory, a git worktree on branch `lane/ai4dev-181/unit5`. Commit with messages that end with
`(AI4DEV-181)`. Do not push. Do not launch other agents. Do not touch any other folder. Do not stop,
start or restart any process you did not start yourself. That includes the local Supabase stack:
it is already running from your worktree, so its edge runtime serves your files as they were at
launch and `bun run at:verify ... --tier integration` resets the database from your migrations. If
you change an edge function and need the runtime to serve the change, say so in your report; do not
restart the stack. Use PowerShell syntax for shell commands.

**Commit early.** Commit each step as soon as its checks pass. Only committed work survives a time
limit. **Stop rule:** if an environment problem blocks you for 15 minutes, commit what works and
report the command, its output and what you tried.

**Comments.** New code carries almost no comments: only a constraint forced by something we cannot
change, or a doc comment on an exported API.

## The rules

- UI code reads and writes only through our edge functions, never the database or storage
  directly, and holds no secret. A `VITE_` value ships to the browser.
- The screen components in `src/components/discovery/` are the product. Do not copy screen code
  from `design/astra/`; that is the sample-data shell, and it keeps working at the loop tier.
- The acceptance test harness takes no new machinery: no new sentinels, faults, vendor stand-ins,
  fixture worlds or capabilities. Seed integration worlds with the helpers the integration suites
  already use. A test with no acceptance id lives under `tests/at/harness/`.
- Two levels (founder 2026-10-02). At the loop tier the section J bodies keep every exact-copy
  assertion on the fixture shell. At the integration tier the same bodies run on the real route
  with seeded worlds and the real model, and a tier switch turns copy only a script can produce
  into state checks: answer saved, revision raised, one credit used, file read and its facts in the
  brief, confirmation recorded, refusals by kind. Steps that need a fuel balance stay loop-only,
  declared so.

## Read first

- `loop/items/AI4DEV-181/design.md` ("Real port", "How the tests prove it") and `plan.md`
  (definition of done, unit 5).
- `src/components/discovery/port.ts` (`DiscoveryPort`, every member), `src/lib/discovery-stream.ts`
  (the wire types), `DiscoveryScreen` and `DiscoveryReview` in `src/components/discovery/`.
- The fixture port and transport in `design/astra/src/` (how each member behaves, the order of
  states), as a behaviour reference only.
- The edge functions this unit calls: `supabase/functions/discovery-conversation`,
  `discovery-message`, `discovery-brief`, `discovery-file`, and the refusal kinds in
  `supabase/functions/_shared/write-routes.ts`.
- The route as it is today, `src/routes/discovery/$organizationId.$projectId.tsx`, an older chat
  page this unit replaces, and `src/lib/discovery-chat.ts` and `src/lib/supabase.ts`. Delete what
  only the old page used once nothing imports it.
- The sign-in pattern of the other signed-in routes under `src/routes/`.
- The screen tests: `tests/at/suites/req-004/j-need-brief.test.ts`, `_screen.ts` (the driver; line
  510 enables it at the loop tier only and line 517 throws `CapabilityPending` otherwise), `_flows.ts`,
  `_bind.ts`, `tests/at/harness/screen.ts` (`useScreenDriver`), and `design/astra/src/givens.ts`
  (`GIVEN`, `MODEL_CALL_PROBE`).
- `tests/at/expected/req-004.json`: AT-004.67, .68, .69 are pending `sut-missing` today.

## Build

1. **The real port.** `src/lib/discovery-port.ts` implements every `DiscoveryPort` member over the
   four edge functions with the signed-in user's token: load through `discovery-conversation`, the
   chat through a `DefaultChatTransport` to `discovery-message`, the review writes and finish
   through `discovery-brief`, add and remove file through `discovery-file`. `subscribe` polls load
   while any file is reading and once after each write. Refusals reach the screen as the
   `DiscoveryRefusal` kinds the screen already renders. Selftests under `tests/at/harness/` for the
   pure parts (response parsing, refusal mapping, when polling runs and stops).
2. **The route.** `src/routes/discovery/$organizationId.$projectId.tsx` mounts `DiscoveryScreen`
   and `DiscoveryReview` on the real port behind the existing sign-in, with `ssr: false` as today.
   A signed-out visitor goes to sign-in.
3. **The integration tier.** The screen driver serves the real app at the integration tier and
   opens the real route signed in to a seeded world; the same section J bodies run. Where a step
   asserts copy only a script can produce, the integration tier asserts the state instead, read
   through the existing test helpers. The model-call counter (`MODEL_CALL_PROBE`) reads the stack
   (turn rows, file part rows) at the integration tier. AT-004.67, .68 and .69 gain their backend
   parts. Move each test you turn green from pending to green in `tests/at/expected/req-004.json`,
   and declare loop-only every step that needs a fuel balance.

## Checks (all must pass)

1. `bun run typecheck` exits 0, and `bun run build` exits 0.
2. `bun run at:selftest` exits 0 (it was 504 before this unit).
3. `bun run at:check req-001`, `req-002`, `req-004`, `req-032` exit 0.
4. `bun run at:verify req-004 --tier loop --expect` exits 0 and matches; the section J bodies still
   pass on the fixture shell.
5. `bun run at:verify <req> --tier integration --expect` exits 0 and matches for req-001, req-002,
   req-003, req-004, req-016 and req-032, each on its own. Before this unit they were 29, 19, 10,
   17, 12 and 1 green. Nothing green turns red; every declaration change is listed.

## Your final response

The commits (hash and subject), each check with its exit code and counts, the files you added,
changed and deleted, every declaration change with its id, the steps declared loop-only and why,
and anything you could not do and why.
