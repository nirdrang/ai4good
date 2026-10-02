# Writer brief: unit 1, the brief store

You are the writer for unit 1 of AI4DEV-181 (Discovery wired to backend). Work only in your working
directory, a git worktree on branch `lane/ai4dev-181/unit1`. Commit with messages that end with
`(AI4DEV-181)`. Do not push. Do not launch other agents. Do not touch any other folder. Do not stop
or start any process you did not start yourself. Use PowerShell syntax for shell commands.

**Commit early.** Commit each step as soon as its checks pass. **Stop rule:** if an environment
problem blocks you for 15 minutes, commit what works and report the command, its output and what
you tried.

## Read first

- `loop/items/AI4DEV-181/design.md` (the design you build to; this unit is "Data", "Rules", and the
  review writes of "Real port" on the server side).
- `loop/items/AI4DEV-181/evidence/arena/out-astra.md` sections 1 and 2 (the base candidate's type
  sketch and commit protocol; the design trims its operation receipts and file leases).
- `design/astra/src/fixture-world.ts` and `design/astra/src/fixture-data.ts`: the rules and data the
  server must reproduce (revision bumps, dependents, stale-revision, finish, accepted gaps).
- `src/components/discovery/port.ts`, `src/lib/discovery-stream.ts`, `src/components/discovery/model.ts`
  (`newerBrief`, `topicSettled`, `confirmationCurrent`): the shapes the screen reads.
- `supabase/functions/_shared/edge.ts` (`writeRoute`), `write-routes.ts`, and the latest discovery
  migrations, for the house style (security definer, `set search_path = ''`, grants, RLS).

## Build

1. **The rules module** `supabase/functions/_shared/discovery-brief.ts`, pure TypeScript with no
   Deno or browser runtime dependency (it must import into vitest under `tests/at/harness/`):
   - `BriefDocument` (sections, ordered topics with their stored question definition, questions,
     dependency edges, data tier, fit, cause labels, removed labels), `BriefVersion`
     (`revision` plus document).
   - `evolveBrief(current, command)` for `edit`, `accept-suggestion`, `ask-topic`, `remove-label`,
     `apply-answers` (the screen's `DiscoveryAnswer[]` with round and user message id), and
     `apply-file-facts` (source `file`, never agreeing a required topic). It returns `unchanged` or
     `changed` with the next version, an optional person line (id `you-<new revision>`, text as
     the fixture writes it), and the filed topics. It bumps the revision only on a semantic change,
     marks answered dependents `needsReview` (the fixture's pairs: priority to measure, booking to
     rules, owner to info), and keeps provenance on a repeated identical answer.
   - `decideFinish(version, input)`: accepted gaps from the open topics, the acks (gaps ack only
     while topics are open; data ack for tiers 1 and 2), refusals `file-reading`, `open-gaps`,
     `data-ack`; idempotent for the same revision; no revision change.
   - `snapshotOf(version)`: the screen's `BriefSnapshot` exactly.
   - `openingDocument(input)`: revision 1 from the need text and the topic definitions (the
     fixture's six topics as the default definitions); unit 2 calls it from the opening turn.
2. **The migration** `supabase/migrations/20261002120000_discovery_brief_store.sql`:
   `brief_revisions` (append-only, primary key `(project_id, revision)`), `discovery_confirmations`
   (primary key `(project_id, revision)`, foreign key to the revision, actor id and name, accepted
   gaps), `discovery_brief_messages` (person lines). Immutability triggers on all three. RLS: select
   for organisation members and platform admins, as `discovery_turns` does; no direct writes for
   anon, authenticated or service_role. One security-definer commit function
   `discovery_brief_commit` (service_role only): lock the project, check active account, admin, the
   organisation switch and the need stage; check `p_base_revision` against the latest revision
   (`stale-revision` with the current brief in the refusal detail); refuse `turn-in-flight` while a
   young open turn exists; refuse `finished` where the fixture does; insert the next revision only
   when a changed document is supplied; write the person line or the confirmation in the same
   transaction. One read function returning the latest revision, the current confirmation and the
   person lines for the caller (member-scoped).
3. **The edge function** `supabase/functions/discovery-brief/index.ts` on `writeRoute`
   (`admits: ['ngo']`, organisation admin): body `{organizationId, projectId, action, ...}` with
   actions `edit` `{sectionId, text, baseRevision}`, `accept` `{topicId, baseRevision}`, `ask`
   `{topicId}`, `remove-label` `{label, baseRevision}`, `finish` `{revision, acks}`. `prepare` reads
   the current version, runs the pure rule, and passes the result to the commit. Response
   `{ok, brief, confirmation, lines}`. Register the route and every new refusal kind in
   `write-routes.ts` (an unregistered kind collapses to `refused`). Add
   `[functions.discovery-brief] verify_jwt = true` to `supabase/config.toml`.
4. **Load:** `discovery-conversation` adds `brief` (the snapshot, or null before the opening),
   `confirmation`, and the person lines to its response, additively; nothing existing changes.

## Tests

- A vitest selftest `tests/at/harness/discovery-brief.selftest.ts` that ports each fixture-world
  rule case: edit of an unchanged section is `unchanged`; a real edit bumps once and writes the
  person line; accept marks dependents; ask is idempotent; remove-label of an absent label is
  unchanged; apply-answers with the same answer twice bumps once; finish twice at one revision
  returns the same confirmation; finish refusals; snapshot round-trip.
- A live proof on the local stack, as a script under `loop/items/AI4DEV-181/evidence/unit1/` (not a
  new acceptance id): seed a project with an opening document through the operator, then over HTTP
  edit, accept, finish, edit again, and read back revisions 2, 3, 3 (finish keeps it), 4 and the
  confirmation history; a stale base answers `stale-revision`. The stack runs from your worktree:
  `bun run db:stop`, then `bun run db:start` from your directory, and copy
  `supabase/functions/.env` from `C:\Users\nirdr\Downloads\ai4good\.claude\worktrees\AI4DEV-181\supabase\functions\.env`
  (git-ignored; never print or commit it).

## Checks (all must pass)

1. `bun install --frozen-lockfile` first in a fresh worktree.
2. `bun run typecheck` exits 0.
3. `bun run at:selftest` exits 0 with the new selftest counted.
4. `bun run at:check req-004` exits 0.
5. `bun run at:verify req-004 --tier loop --expect` exits 0, 44 green, matching.
6. `bun run at:verify req-004 --tier integration --expect` exits 0 and matches (17 green); nothing
   that was green turns red.
7. The live proof script exits 0; its transcript goes under `evidence/unit1/`.

## Your final response

The commits (hash and subject), each check with its exit code and counts, the files you added or
changed, and anything you could not do and why.
