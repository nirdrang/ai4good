# Unit 4 checks for AI4DEV-181 (Discovery backend files)

The implementation is committed, but the live file route has not been validated. The already-running
edge runtime mounts this worktree and has a startup function configuration that does not include
`discovery-file`. The writer brief forbids restarting it. The configured model is
`openai-compatible`, `space-bunny-free`, effort `low`, at `https://opencode.ai/zen/v1`.

| Command | Exit | Counts / result |
| --- | ---: | --- |
| `bun run typecheck` | 0 | All four TypeScript projects pass |
| `bun run at:selftest` | 0 | 504 tests pass in 39 files; baseline was 495 |
| `bun run at:check req-001` | 0 | 38 acceptance ids, 38 registrations |
| `bun run at:check req-002` | 0 | 27 acceptance ids, 27 registrations |
| `bun run at:check req-004` | 0 | 70 acceptance ids, 70 registrations |
| `bun run at:check req-032` | 0 | 13 acceptance ids, 13 registrations |
| `bun run at:verify req-004 --tier loop --expect` | 0 | 44 green, 26 declared red, 0 missing; exact match |
| `bun run at:verify req-032 --tier loop --expect` | 0 | 1 green, 12 declared red, 0 missing; exact match |
| `bun run at:verify req-001 --tier integration --expect` | 1 | Latest full run: 24 green, 14 red, 0 missing; deviations described below |
| `bun run at:verify req-002 --tier integration --expect` | 0 | 19 green, 8 declared red, 0 missing; exact match |
| `bun run at:verify req-003 --tier integration --expect` | 0 | 10 green, 3 declared red, 0 missing; exact match |
| `bun run at:verify req-004 --tier integration --expect` | 0 | 17 green, 53 declared red, 0 missing; exact match |
| `bun run at:verify req-016 --tier integration --expect` | 0 | 12 green, 0 red, 0 missing; exact match |
| `bun run at:verify req-032 --tier integration --expect` | 1 | 0 green, 13 red, 0 missing; the file-limit body encounters the missing route |
| `bun loop/items/AI4DEV-181/evidence/unit4/live-proof.ts` | 1 | Stops at the first upload: `upload answered 404: Function not found` |
| `node loop/items/AI4DEV-181/evidence/unit4/runtime-inspect.ts` | 0 | Worktree mounted, runtime running, `hasDiscoveryFile: false` |

Each completed integration run reset the same stack and proved 39 expected migrations, 39 applied.
The database migration itself replays successfully.

The latest full identity run had four privilege-inventory failures because the new
`viewer_discovery_files` read was missing from its expected viewer-function list. That list is now
corrected, typechecked and committed, but the full identity suite was not rerun before the
environment stop rule. Its fifth new failure is the account-deactivation test trying the new file
route and receiving the runtime's 404 instead of the route's lifecycle refusal. Its nine previously
declared pending tests remain pending. The identity declaration was not changed to hide failures.

## Declaration changes

Only `tests/at/expected/req-032.json` was added. The loop and integration tiers declare
AT-032.13 green and AT-032.01 through AT-032.12 pending at `sut-missing`. The drill tier declares all
13 pending. The other attachment criteria are registered explicitly to preserve the acceptance/code
bijection; their complete flows remain outside this unit. No existing requirement declaration changed.

## Environment diagnosis and attempted remedies

The initial sandbox selftest run failed because esbuild could not traverse parent directories.
The approved run outside the sandbox succeeds. No source change was needed for that restriction.

The initial integration seed failures were fixed: a started Discovery intake needs `submitted_at`,
and Bun SQL needs a `text::jsonb` cast for a serialized brief document. After those fixes the real
upload reaches the edge gateway and returns 404.

`bun loop/items/AI4DEV-181/evidence/unit4/live-proof.ts` was retried after the seed fixes and again
after the final checks. Both upload attempts return `upload answered 404: Function not found`.
The acceptance body independently produces the same failure. A Docker CLI was unavailable at the
assumed path, and Bun's HTTP named-pipe attempt failed. Node's HTTP named-pipe support then read the
running container's mount and function configuration without changing it. `runtime.json` contains
sanitized evidence, including the exact worktree mount and the function names, with no keys.
The main runtime builds its function map from the startup `SUPABASE_INTERNAL_FUNCTIONS_CONFIG`.
The new function is absent from that map even though it exists in the mounted worktree and config.

An attempted organisation integration run while the identity run was still active was refused by
the stack lock with exit 3. No database reset occurred in that attempt. It was subsequently run
alone and passed. All remaining integration runs ran sequentially.

No process was stopped, started or restarted except the writer's own test/diagnostic commands.
No agent was launched, no branch or worktree was removed, and no commit was pushed.

The stack owner must refresh the runtime's function list before the file acceptance check, live
read proof and new-route lifecycle check can complete. File extraction, configured-model digest
reads, multipart storage cleanup and read resumption therefore remain unverified on the live stack.
The authored live proof covers the requested small and large reads, provenance and revision,
zero read charge and no read turn, duplicate content, limits, removal, funded fourth upload,
later-turn digest context and the server-composed report after a completed read.

The file inventory is in `changed-files.json` beside this report. The integration logs and the
failed proof transcript are saved here as well.
