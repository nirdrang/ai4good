# AI4DEV-5 — rulings 04 (pre-merge audit fold, final)

Auditor: codex gpt-5.6-luna @ max, `--sandbox workspace-write`, detached, in-worktree,
session `019fc490-3cba-7a93-b52d-eecee3a4ed2a`. Report: `premerge-audit.md` (3,521 bytes,
non-empty — checked). Ten of twelve boxes PASS, including every structural box: single
head-sha checkout with no second checkout, five named steps, dynamic discovery failing on
zero items, aggregated exits, the manifest-coverage check, concurrency groups, guard field
handling, the Known-limits header, scope (diff touches only `.github/workflows/ci.yml` and
`loop/items/AI4DEV-5/**`), and the cross-check that every adopted ruling is present in the
file. The audit also re-ran the commands: install, typecheck and at:check PASS inside its
sandbox.

## Ruling 8 — the two audit BLOCKERs are sandbox artifacts, not defects; evidence, then verdict

Boxes 3 (`at:selftest`) and 5 (`at:verify --expect`) failed INSIDE THE AUDIT SANDBOX with
vitest unable to start. The auditor's own session transcript carries the raw cause,
verbatim (task transcript lines 73–146):

- `[ERROR] Cannot read directory "../../../../..": Access is denied.`
- `error: Cannot read file "C:\Users\nirdr\Downloads\ai4good\tsconfig.json": EPERM`

That is vitest/esbuild's config resolution walking ANCESTOR directories. This worktree is
physically nested inside the main checkout (`<main>/.claude/worktrees/agent-…`), and the
codex `workspace-write` sandbox scopes access to the workspace — the parent checkout above
it is out of bounds, so the walk dies at the boundary. The failure is a property of
auditing from a NESTED worktree under a workspace-scoped sandbox, not of the code under
audit: install, typecheck and at:check passed in the same sandbox because none of them
walks above the repo root.

The two commands' true status rests on three independent executions, none contaminated by
the audit sandbox:
1. the executor's Phase 2 run in this worktree — selftest 114/114, verify exact match;
2. the item agent's own run in this worktree — identical results, exit 0 both;
3. decisive: GitHub Actions on ubuntu-latest, where the checkout has no ancestor repository
   at all — three consecutive green runs (30769559140, 30769824712, 30769882722), each
   executing both commands as workflow steps.

VERDICT: boxes 3 and 5 re-scored COULD-NOT-VERIFY-IN-SANDBOX (with the cause named) rather
than failures of the claim. The audit stands as independent verification of everything it
could reach, and the claim it could not reach is carried by CI's own runs — which are the
very instrument this item builds. No change to the workflow; no re-audit ordered, because a
re-run under the same sandbox reproduces the same boundary, and the unsandboxed evidence
already exists in triplicate.

Operational lesson recorded for the way of work (rides along in this PR): a luna audit
launched in a PLATFORM worktree — always nested inside the main checkout — cannot execute
vitest-based suites under the workspace-scoped sandbox. Its execution boxes need either the
CI run as the execution evidence or a sandbox scope that includes the parent; silently
reading its reds as code failures would have ordered a fix against a healthy tree.
