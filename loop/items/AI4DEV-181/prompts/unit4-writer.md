# Writer brief: unit 4, files

You are the writer for unit 4 of AI4DEV-181 (Discovery wired to backend). Work only in your working
directory, a git worktree on branch `lane/ai4dev-181/unit4`. Commit with messages that end with
`(AI4DEV-181)`. Do not push. Do not launch other agents. Do not touch any other folder. Do not stop,
start or restart any process you did not start yourself. That includes the local Supabase stack:
it is already running from your worktree, so its edge runtime serves your files and
`bun run at:verify ... --tier integration` resets the database from your migrations. Use
PowerShell syntax for shell commands.

**Commit early.** Commit each step as soon as its checks pass. Only committed work survives a time
limit. **Stop rule:** if an environment problem blocks you for 15 minutes, commit what works and
report the command, its output and what you tried.

**Comments.** New code carries almost no comments: only a constraint forced by something we cannot
change (a vendor, platform or protocol), or a doc comment on an exported API.

## The rules this unit implements (founder decision of 2026-10-01, automatic ingest)

- Adding a file stores it and starts its read at once. There is no file question, and the read
  never pauses to ask.
- The read is free: it is not a turn, it charges no credit and no fuel, and it needs no spending
  confirmation.
- One read processes the whole file, in parts when the file is large, and stores a digest: the
  facts that matter for the need and the questions the file raises.
- The file's facts enter the brief marked as from the file. A fact from a file never agrees a
  required topic by itself.
- Later turns receive the digests, never the files.
- While the project is not funded, the NGO can add at most three Discovery files. Intake files do
  not count. Removing a Discovery file frees a place. A funded project has no Discovery file limit
  (read AT-032.13 for the exact rule).
- UI code never touches the database or storage directly; everything goes through edge functions.

## Read first

- `loop/items/AI4DEV-181/design.md`, sections "Files", "Data", "Rules" and "Real port".
- `design/discovery-ui-contract.md`, the Files section, and `src/lib/discovery-stream.ts`
  (`FileStatus`, `DiscoveryFile`, `DiscoveryState.files`) and `src/components/discovery/port.ts`
  (`addFile`, `subscribe`): what the screen expects.
- The fixture shell's file behaviour in `design/astra/src/fixture-world.ts` and `fixture-data.ts`:
  statuses, the order of states, the report line the next reply gives.
- `.taskmaster/docs/acceptance/at-req-032.md` (AT-032.13) and the REQ-032 section of
  `loop/out/pure-s6-req-027-036.md`.
- Units 1 to 3 on your branch: `supabase/functions/_shared/discovery-brief.ts` (`evolveBrief` and
  its `apply-file-facts` command), `discovery-brief-write.ts`, `discovery-turn.ts`,
  `discovery-reply.ts`, the model adapters `anthropic-messages.ts` and
  `openai-compatible-messages.ts` (env `DISCOVERY_PROVIDER` picks), `discovery-conversation/index.ts`,
  and the discovery migrations up to `20261003120200`.
- The existing intake attachment path (`project-need` with its `attach` action) and how intake
  files are stored, so Discovery files are told apart from intake files.

## Build

1. **Storage and tables.** One new migration after `20261003120200`: a private `discovery-files`
   storage bucket with no client access; `discovery_files` (project, name, media type, size,
   content hash, status, the read's heartbeat, the facts count, created by and when, removed at)
   and `discovery_file_parts` (file, part index, digest jsonb). RLS select for organisation members
   and platform admins as the other discovery tables do; no direct writes for anon, authenticated
   or service_role. Security-definer commit functions (service_role only) in the house style:
   register a file under the project lock with refusals `finished` (a current confirmation),
   `file-limit` (three Discovery files while not funded, intake excluded, removed files excluded),
   `duplicate-file` (same content hash on a live file); store a part; finish a read (publish the
   facts through a TypeScript-supplied brief document and the base revision, as
   `discovery_brief_commit` does); remove a file. One member-scoped read for the screen's file list.
2. **The edge function** `supabase/functions/discovery-file/index.ts` on `writeRoute`
   (`admits: ['ngo']`, organisation admin), registered in `write-routes.ts` with every new refusal
   kind, and `verify_jwt = true` in `supabase/config.toml`. Actions: `add` (multipart upload: the
   bytes go to the bucket, the row is registered, the read starts) and `remove`. Bound the file size
   and accept the media types the contract names; refuse anything else with a registered kind.
3. **The read.** Run it in `EdgeRuntime.waitUntil` after `add` answers. Split the file into parts
   (text extraction for the types the contract allows; one part when small), make one model call
   per part through the existing `MessagesPort` adapters with a forced tool that returns that part's
   facts and questions, store each part's digest as it completes, refresh the heartbeat, then merge
   the parts and publish the facts through `evolveBrief` `apply-file-facts`. Completed parts are
   kept, so a re-dispatched read resumes from the first missing part. The read writes no turn row
   and charges nothing. A failed read leaves the file with a failed status the screen can show.
4. **Load and later turns.** `discovery-conversation` returns `files` in the screen's
   `DiscoveryFile` shape (statuses as `FileStatus` defines, facts count when read) and
   re-dispatches any read whose heartbeat is older than five minutes. The turn's context includes
   each read file's digest, never the file. The next reply after a read completes carries the
   server-composed report line the contract defines.
5. **AT-032.13.** Register it through `atTest` in a new suite under `tests/at/suites/req-032/`,
   following the house pattern of the req-004 suites, at the integration tier against the stack,
   plus a loop-tier body if the house pattern has one. Add its `--expect` declaration as green in
   `tests/at/expected/req-032.json` (create the file in the format of the others if it does not
   exist), and make `bun run at:check req-032` pass.

## Tests

- Selftests under `tests/at/harness/` for the pure parts: splitting into parts, merging part
  digests, the file-limit rule (intake excluded, removed excluded, funded unlimited), and the facts
  entering the brief as from the file without agreeing a required topic.
- A live proof on the local stack, as a script under `loop/items/AI4DEV-181/evidence/unit4/` (not an
  acceptance id), on the configured model: add a small text file to a seeded unfunded project and
  see it reach read with facts, the brief gain facts marked from the file at a new revision, and no
  credit spent; add a large file and see several parts; a fourth Discovery file refused with
  `file-limit` while the intake file does not count; remove one and add again; a duplicate refused;
  the next turn's context holds the digest. Save the transcript beside the script.

## Checks (all must pass)

1. `bun run typecheck` exits 0.
2. `bun run at:selftest` exits 0 (it was 495 before this unit).
3. `bun run at:check req-001`, `req-002`, `req-004`, `req-032` exit 0.
4. `bun run at:verify req-004 --tier loop --expect` exits 0 and matches.
5. `bun run at:verify <req> --tier integration --expect` exits 0 and matches for req-001, req-002,
   req-003, req-004, req-016 and req-032, each on its own. Before this unit the first five were 29,
   19, 10, 17 and 12 green. Nothing green turns red; any declaration change is listed.
6. The live proof exits 0.

## Your final response

The commits (hash and subject), each check with its exit code and counts, the files you added and
changed, every declaration change, and anything you could not do and why.
