# Comment pass report

Worktree: `.claude/worktrees/AI4DEV-56-comments`, branch `lane/ai4dev-56/comments`, base commit a870d4d.

## How the edits were made (a surprise)

The mechanical session's Edit and Write tools are isolated to the `AI4DEV-56` worktree, not to `AI4DEV-56-comments`. The shell is not. So the four editing lanes made their comment edits in `AI4DEV-56` (same commit a870d4d), the 30 changed files were copied into `AI4DEV-56-comments` with PowerShell, and the 30 copies in `AI4DEV-56` were restored with `git checkout --`. `AI4DEV-56` is left with only the lead's own uncommitted `loop/items/AI4DEV-56/decisions.tsv` change. One lane briefly edited one migration in `AI4DEV-56` before the mismatch was seen; that file is among the 30 restored.

A diff scan confirms every added and every removed line in this branch's diff is a comment line or a blank line: no code, string, assertion or SQL statement changed.

## Counts

- Deletions of audited comments applied: 135 (edge functions 32, migrations 25, harness and scan files 40, fixture/integration/pending/test files 38). The audit names 152; 8 are listed as not found below; the remaining gap is blocks the audit counted as several entries that were deleted as one block (the `_pending.ts` changelog and the "ELEVEN LABELS" comment, header blocks with several quoted sentences).
- Trimmed keeps applied (one sentence, verbatim from the rulings): 18 (migrations 6, edge functions 4, `_fixture.ts` mirrors 8).
- One-sentence file headers written for new modules and migrations: admin-operations.ts, write-routes.ts, 20260908, 20260909, 20260910, shipped-admin-operations.selftest.ts, shipped-lifecycle.selftest.ts, shipped-write-gate.selftest.ts, write-route-scan.selftest.ts, _write-route-scan.ts.
- `_pending.ts`: the header now states one not-yet-landed id (the `LEAF` map holds one label, `D3_L3`); the changelog block is gone.

## Not found (8)

- `supabase/functions/_shared/gateway-keys.ts`: file deleted by the fix lane, so both entries — the file-header doc and the `virtualKeyActionFor` doc — are not found.
- `supabase/functions/_shared/edge.ts`: "// The database's backstop fired. Its sentence travels as the reason and the kind it attached as DETAIL travels as the kind: 409 for anything the database judged, 502 for transport." — replaced by a `rpcRefusalStatus` call with no comment.
- `supabase/migrations/20260908120000_...sql`: "`for update` on the seat row: two transfers of one seat serialise here, and the second one reads the seat the first one moved and refuses."
- `supabase/migrations/20260908120000_...sql`: "R6: lifecycle is account-level, and deactivating an account that holds another seat would gate its writes in an organisation this transfer never looked at."
- `tests/at/suites/req-001/_contract.ts`: "/** Refused with `holds-other-seats`, the body names the other organisations (R6). */"
- `tests/at/suites/req-001/_write-route-scan.ts`: "// A directory with no index.ts is a missing entry when WRITE_ROUTES names it."
- `tests/at/suites/req-001/_fixture.ts`: "/* ------------------------------ the platform administrator's operations -------------------- */"

Relocated, not lost: six entries the audit lists under `_fixture.ts` (the transfer, escalation-contact and lifecycle-setter adapter docs, the AT-001.29/.30/.31 attemptWrite doc, the audit-record doc, the AT-001.33 tamper doc) live in `_contract.ts` on `AccountsSut` and were deleted there. The entry "AT-001.41's static arm..." listed under `_write-route-scan.ts` lives in `_policy-scan.ts` and was deleted there. The `_fixture.ts` KEEP "The organisation's escalation contact, or `null`..." no longer exists in the tree.

## New since the audit

- `supabase/migrations/20260908120000_...sql`, in `transfer_organization_contact`: the fix lane's lock comment ("Lock the outgoing and transferee account rows in id order...") narrates our own locking design and no keep-list entry names that place: deleted.
- `supabase/migrations/20260912120000_audit_actor_on_product_paths.sql` (new file): its five `/* ===== */` banners deleted; its one-sentence header kept.
- `supabase/functions/_shared/write-routes.ts`: the banner "/* --- the refusal kinds --- */" deleted; the doc on `rpcRefusalStatus` (a five-character SQLSTATE is a raised exception, anything else answers 502) kept as a contract with no id or rationale.
- `tests/at/suites/req-001/_contract.ts`, on `WriteSubject`: the reworded "AT-001.29/.30/.31: a discriminated union on `route`..." doc deleted (same place, same id narration).
- `tests/at/suites/req-001/_policy-scan.ts`, on `scanAuditAppendOnly`: "AT-001.33's static arm..." deleted (id narration restating the body).
- `tests/at/suites/req-001/_fixture.ts`: the reworded role-change-audit and transfer mirror comments normalized under the mirror rule.

## Surprises for the lead

- MUST KILL 1 and 2 are NOT applied in the tree: `accounts.ts` still has the inline conditional spread of the four `p_github_*` fields and passes `input.caller.githubHandle` directly with no `verifiedGithubHandle` binding. This pass deleted the audited prose only and changed no code.
- `_fixture.ts` still carries pre-existing, unaudited narration (the caller-judgement import comment, the `updateOrganization` doc citing ruling R2c). Out of scope, untouched.

## Checks

1. `bun run typecheck` — exit 0: "typecheck OK: all three projects clean".
2. `bun run at:check req-001` — exit 0: "38 P0 ids in bijection".
3. `bun run at:selftest` — exit 0: "Test Files 19 passed (19), Tests 293 passed (293)".
4. `bun run at:verify req-001 --tier loop --expect` — exit 0: "38 P0: 33 green, 5 red, 0 missing; EXPECTED: the run matches tests/at/expected/req-001.json exactly".

## git diff --stat HEAD~1

```
 .../artifacts/lanes/comment-pass-report.md         |  53 ++++++++++
 supabase/functions/_shared/accounts.ts             |  25 -----
 supabase/functions/_shared/admin-operations.ts     |  39 +-------
 supabase/functions/_shared/edge.ts                 |  19 +---
 supabase/functions/_shared/memberships.ts          |  14 ---
 supabase/functions/_shared/write-routes.ts         |  42 +-------
 supabase/functions/complete-signup/index.ts        |   4 -
 supabase/functions/create-organization/index.ts    |   4 -
 supabase/functions/set-account-lifecycle/index.ts  |   9 --
 supabase/functions/set-escalation-contact/index.ts |   8 --
 .../transfer-organization-contact/index.ts         |  11 ---
 supabase/functions/update-organization/index.ts    |   4 -
 ...ccount_lifecycle_audit_and_contact_transfer.sql | 108 ++-------------------
 .../20260909120000_account_lifecycle_setter.sql    |   3 +-
 ...0910120000_org_membership_role_change_audit.sql |  13 +--
 ...20260912120000_audit_actor_on_product_paths.sql |  10 --
 tests/at/harness/live-stack.ts                     |   1 -
 .../harness/shipped-admin-operations.selftest.ts   |   9 +-
 tests/at/harness/shipped-lifecycle.selftest.ts     |   8 +-
 tests/at/harness/shipped-write-gate.selftest.ts    |  24 +----
 tests/at/harness/write-route-scan.selftest.ts      |   6 +-
 tests/at/suites/req-001/_contract.ts               |  68 -------------
 tests/at/suites/req-001/_fixture.ts                |  53 ++--------
 tests/at/suites/req-001/_integration.ts            |  86 ----------------
 tests/at/suites/req-001/_live.ts                   |  20 ----
 tests/at/suites/req-001/_pending.ts                |  40 +-------
 tests/at/suites/req-001/_policy-scan.ts            |  17 ----
 tests/at/suites/req-001/_write-route-scan.ts       |  20 +---
 .../at/suites/req-001/a-signup-and-signin.test.ts  |   5 -
 tests/at/suites/req-001/e-admin-operations.test.ts |  20 +---
 .../suites/req-001/f-lifecycle-and-audit.test.ts   |   4 -
 31 files changed, 88 insertions(+), 659 deletions(-)
```
