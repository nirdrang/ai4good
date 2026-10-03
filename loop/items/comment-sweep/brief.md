# Brief: comment sweep (no board item)

Branch: machinery/comment-sweep
Founder ruling 2026-10-03: code carries almost no comments. See "Code carries almost no comments"
in CLAUDE.md. pstack's comment audit sees only each pull request's diff, so older comments
survived. This branch removes them once. There is no board item: the founder ruled none is needed.

## Scope, in this order, one commit per unit

1. Frontend: `src/` and `design/astra/`. About 130 comment lines.
2. Backend: `supabase/functions/`. About 1,046 comment lines.
3. Tests: `tests/at/` (suites and harness). About 6,278 comment lines.

Out of scope: `supabase/migrations/` (applied history), `src/components/ui/` (shadcn generated),
generated files such as `src/routeTree.gen.ts`, and `supabase/config.toml` (Supabase's template).

## Method

- For each unit, run pstack's `/no-comments` skill with the unit's folders as its scope (files,
  not a diff). Spawn its audit as `subagent_type: "pstack:comment-sicko", model: "sonnet"`. For
  the tests unit, split the folders across several audits so no one audit holds too much.
- Delete only. Keep exactly the kinds the audit keeps: license headers, a constraint forced by
  something we cannot change, doc comments on a public API (keep those on the harness helpers
  every suite calls, such as `atTest`), issue links. Assertion messages are not comments.
- A `MUST KILL` flag is not refactored here. Collect every flag, with its file, symbol and one
  line, for the pull request. A trivial fix the audit names (a dead path, an unused parameter)
  may land.
- Answer the no-comments skill's encoding offers with "no": no new types, tests or lints here.

## Checks after each unit

Run as background shell commands and read back only exit codes and counts:

- `bun install --frozen-lockfile` once, then `bun run typecheck`
- `bun run at:selftest`
- `bun run at:check <req>` for every `tests/at/suites/req-*`
- `bun run at:verify <req> --tier loop --expect` for every `tests/at/expected/req-*.json`

Some acceptance tests read source files as text, so a deletion can break one. A check that fails
after a unit is fixed in that unit by restoring the line or adjusting the scan, never by changing
an expected manifest.

## The pull request

One pull request from this branch, titled "machinery: comment sweep across src, functions and
tests". Write it with `/technical-writing`, then `/unslop`. Name no board item id anywhere in the
title or body. The body holds: comment lines removed per unit, comments kept with the reason, the
full `MUST KILL` list, and each check with its exit code and counts.

Merge only when CI is green on the exact head AND the founder says "merge":
`gh pr merge <n> --squash`. Delete no branch.
