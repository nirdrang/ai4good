# GitHub → Linear integration — verification record

On 2026-07-20 the Linear GitHub integration was verified end-to-end for the two-team model:

- **AI4GOOD-DEV** (engineering tasks): a merged pull request moves its task to Done automatically.
  This file's own pull request (task AI4DEV-2) is that test.
- **AI4GOOD-PM** (tracking tasks): all pull-request automations set to "No action" — a merge
  never auto-closes a tracking requirement; those close only through the verified path.

Reference: decision d84 (repo public + branch protection) and the way-of-work
(loop/out/wow-claude-driven-linear.md). Safe to keep as a record.
