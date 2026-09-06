# feat(accounts): admin operations, one lifecycle gate on every write, an append-only audit

## Why

The user-authentication requirement's last deliverable is the platform administrator's operations on an organisation and the rules around them: a contact seat must move to a new account while every old row keeps its attribution, a deactivated account must be refused every write at once, role changes and transfers must leave a record nobody can alter, and a volunteer must never unlink the GitHub identity that signup made mandatory. This branch builds those six units on one structural claim: a write route is a value handed to `writeRoute()`, and there is no other way to reach the database. The claim is enforced three times: by the type (a route name must be a key of `WRITE_ROUTES`), at run time (construction throws on an unknown name), and in CI (a conformance scan reads the tree against the inventory in both directions). The lifecycle rule is stated once in TypeScript, graded by the loop tier, and once in SQL, as the backstop for a service-role caller with no TypeScript in its path.

## Scope

- `supabase/functions/_shared/write-routes.ts` is new: the inventory `WRITE_ROUTES` (seven rows: the five deployed writes, `set-account-lifecycle`, and the `discovery-message` stand-in), `WriteStanding` with a fail-closed parser, `writeGateDecision` with five ordered checks (unreadable, deactivated, absent-by-design, no account, wrong type), `writePipeline`, and the closed refusal-kind list `WRITE_REFUSAL_KINDS`.
- `supabase/functions/_shared/edge.ts` gains `writeRoute` and `loadWriteStanding`; `callDatabaseFunction` is no longer exported. The three existing write routes (`complete-signup`, `create-organization`, `update-organization`) are rewritten to the four-line shape. Three routes are new: `transfer-organization-contact`, `set-escalation-contact`, `set-account-lifecycle`, each with `verify_jwt = true` in `supabase/config.toml`.
- `supabase/functions/_shared/admin-operations.ts` (new) holds `decideContactTransfer`, `decideEscalationContact`, `decideLifecycleChange`; `accounts.ts` gains `AccountLifecycle`, `decideSignupCompletion`, `decideOrganizationCreation`; `memberships.ts` gains `decideOrganizationRename`.
- Five migrations: `20260908120000` (the `account_lifecycle` enum and column on `accounts`, the `audit_events` and `org_escalation_contacts` tables unreachable by every client role, the append-only row and statement triggers, `assert_account_active` with `for share`, `write_standing`, `append_audit_event`, `change_account_lifecycle`, `transfer_organization_contact`, `set_escalation_contact`, and `create_organization` and `update_organization` recreated with the gate first); `20260909120000` (`set_account_lifecycle`); `20260910120000` (the role-change trigger on `org_memberships`); `20260911120000` (the `before delete` trigger on `auth.identities` guarded by `when (pg_trigger_depth() = 0)`); `20260912120000` (the actor set on the two product membership paths, the type-derived audit label, the escalation contact's audit row, and refusal kinds in DETAIL on the two recreated writers).
- The static scans grow: `_policy-scan.ts` refuses `references` and `trigger` grants to `service_role`, a baseline revoke that omits `service_role`, a volatile service-role definer that does not call `assert_account_active`, a definer that updates or deletes `audit_events`, and a tree with no guarded identity trigger; `_write-route-scan.ts` (new) is the conformance check with its negative selftest.
- The acceptance harness: `AccountsSut` gains `transferOrganizationContact`, `setEscalationContact`, `setAccountLifecycle`, `attemptWrite` (a `Record<WriteRouteName, ...>` in both adapters), `auditEvents`, `escalationContact`, `attemptAuditTamper`, `unlinkGithubIdentity`, `linkedIdentities`, `authUserIsHealthy`; `AccountRow` gains `lifecycle`. The fixture runs the shipped pipeline over its Maps; the live adapter drives the deployed routes and reads the two new tables as the operator.
- Acceptance ids: AT-001.25, .26, .27, .28, .35, .33 and the new AT-001.41 are green at both tiers; AT-001.29 is green at loop and declared `capability-pending` at integration; AT-001.30, .31 and .34 are declared `capability-pending` at both tiers. The manifest `tests/at/expected/req-001.json`, the pending ledger and `_pending.ts` say so. The requirement text, its isolate, the acceptance file (38 P0) and the decomposition gain decision d91 (the GitHub link is permanent after volunteer signup).
- Records, no code: `loop/items/AI4DEV-56/unit4-record.md` (no leftover privileges after a reset, measured) and `unit6-record.md` (the local CLI pushes neither the email nor the sign-in limit, measured).

Out of scope, by ruling: an Auth ban or token claim as the deactivation mechanism, a product sign-in counter, a lifecycle trigger on tenant tables, a new account-minting path for the transferee.

## Tradeoffs

- `callDatabaseFunction` stops being exported, so a future route with a different pipeline must extend `writeRoute` rather than work beside it. That is the cost of a boundary nothing can forget.
- The transfer moves the named seat and deactivates the outgoing account only when it then holds no other seat; otherwise the account stays active and the audit row names the seats it keeps. The first design refused a multi-seat outgoing account, and review showed that every transferee holds its own seat, so that refusal made every transferee permanently untransferable.
- The transferee is an existing completed NGO account; its own organisation from signup stays with it.
- Every audit row names its actor by account type and id; only a path that sets no actor (the operator's own SQL) records `operator`.
- The virtual-key clauses of AT-001.30 and AT-001.31 are declared `capability-pending` at both tiers (`gateway.virtual-key-revocation`, `gateway.virtual-key-reissue`) rather than stubbed with a table nobody reads or a pure mapping nothing calls. Building the stub is one more commit group if the founder wants it.
- AT-001.34 is declared at both tiers: the local GoTrue does not throttle password grants (45 in 0.66 s, no 429), and a product counter would be SQL the loop tier cannot grade and a control the criterion did not ask for. The limit is verified on the hosted platform.
- A refused GitHub unlink answers 500 from GoTrue; the tests read the identity row and the user's health, never the status.

## Blast Radius

Every write route changes shape, and every write now costs one `write_standing` read before its decision. A caller sees the same wire shapes plus one new refusal, `account-deactivated`, and kinds beside reasons on the new routes. `public.accounts` gains a not-null column with a default, so existing rows read `active`. Two new tables are unreachable by every client role; nothing reads them except the operator. The identity trigger sits on `auth.identities`, a vendor-owned table: a direct delete of a volunteer's GitHub row is refused, and the vendor's admin user delete still cascades through (measured). The operator path bypasses every definer and is test-only. A deactivated account's live session keeps answering at Auth; the write path refuses it on the next call.

## Verification

{VERIFICATION}

## Not done here

- Ending a deactivated account's live sessions at Auth (a ban leaves the access token working, measured).
- A refused GitHub unlink reaches the caller as GoTrue's 500 with no product reason; a product surface must not offer unlink to a completed volunteer.
- The hosted platform's ownership of `auth.identities` and whether the identity trigger applies there; both measurements are local.
- The existing cascade from `auth.users` into `accounts`, `acknowledgments` and `org_memberships`.
- A `deno check` over `supabase/functions` in CI; the edge shells have no type-checker today.
- The hosted verification of the sign-in and email rate limits, and the stub of the virtual-key seam.
- The forward sync of decision d91 to the board is the controller's step, not this branch's.
- The transferee's leftover signup organisation.
- Splitting `_live.ts`'s administrator block into its own module, the shape `_live-tenant-reads.ts` set.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01X4L1LDLGqdutW5cMaJsaaG
