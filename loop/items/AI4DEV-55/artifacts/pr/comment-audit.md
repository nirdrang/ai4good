# Comment Sicko — AI4DEV-55 tenant isolation and visibility

Yes... Ha ha ha... Yes!

Scope: `/tmp/claude-0/-home-user-ai4good/6d2ae7ff-abf7-5c2e-8b33-a34c92f253fc/scratchpad/code-diff.patch`
(this branch against origin/main, item artifacts excluded). Full current files read for every
hunk judged. Two lead-ruled keeps excluded from judgment entirely: the header paragraphs of the
two 2026-09-06 / 2026-09-07 migrations, and the CORS paragraph in `supabase/functions/_shared/edge.ts`.

Report only. No file touched but this one.

## Meat (kill)

### supabase/config.toml
- Line 485, "REQ-001's edge functions. `verify_jwt`" — alibi (justifies a config default at length instead of the config being self-evident).

### supabase/functions/_shared/public-project.ts
- Line 1, "The public project page: one eligibility" — narration (module banner restating the file's contents).
- Line 12, "ONE answer for "no such project"" — our-code surprise dressed as prose. `MUST KILL`.
- Line 18, "Whether a project row may be shown to the world. TRUE FOR EVERY ROW TODAY" — alibi for an unfinished predicate. `MUST KILL`.
- Line 27, "Built field by field, so a wider row cannot leak" — narration (the field-by-field literal below is already obvious).
- Line 38, "THE ONE outage answer for the public surface. Names nothing." — narration restating the constant. `MUST KILL`.
- Line 44, "A page, or one of the two constants. There is no fourth member" — narration restating the union.
- Line 50, "One read, then the predicate, then ONE `return PROJECT_NOT_PUBLIC`" — narration restating the four lines beneath it.

### supabase/functions/_shared/tenant-reads.ts
- Line 1, "Caller-bound tenant reads and the two authenticated" — narration (module banner).
- Line 8, "Exactly what a caller-bound read produced. Zero rows" — narration restating the type.
- Line 11, "THE ONE refusal for "no such thing" and "not yours"" — our-code surprise as prose (duplicates the near-identical constant in public-project.ts). `MUST KILL`.
- Line 17, "THE ONE outage answer. It names no identifier" — same defect as above. `MUST KILL`.
- Line 23, "A success body, or one of the two constants" — narration restating the union.
- Line 26, "The reads a surface needs, keyed by request identifiers only" — narration.
- Line 50, "Pure orchestration over caller-bound reads. It holds no tenant rule" — narration restating the function body beneath it.

### supabase/functions/_shared/edge.ts
- Line 328, "Caller-bound Data API GETs. A non-2xx answer is" — narration restating `restJson`'s return shape.
- Line 353, "The public page's source: one RPC as the service role" — narration restating the function body.

### supabase/migrations/20260906120000_tenant_read_posture_and_org_member_policies.sql (below the excepted header)
- Line 46, "1. normalise client privileges" — phase marker.
- Line 64, "2. the viewer predicate" — phase marker.
- Line 66, "Cuts the recursion a policy on org_memberships would otherwise hit" — our-code surprise (recursion avoidance not obvious from the SQL). `MUST KILL viewer_is_org_member`.
- Line 89, "3. the policies" — phase marker.
- Line 127, "4. the public page's source" — phase marker.
- Line 129, "One row, no table grant to service_role for it" — narration restating the grant lines beneath it.
- Line 150, "5. indexes the lookups want" — phase marker.

### supabase/migrations/20260907120000_tenant_read_volunteer_seat_and_admin_reach.sql (below the excepted header)
- Line 10, "1. the seat holds a volunteer" — phase marker.
- Line 12, "Symmetric with org_membership_grantee_must_be_ngo" — alibi (cites a sibling trigger by name instead of the trigger naming itself).
- Line 56, "Raise when any existing row already seats a non-volunteer" — long justification for a migration-time guard. `MUST KILL` the anonymous `do $$ ... $$` block — extract it to a named check function so the intent is in its name.
- Line 72, "2. the administrator predicate" — phase marker.
- Line 95, "3. the volunteer predicate and seat branch" — phase marker.
- Line 128, "4. the administrator's reach" — phase marker.

### tests/at/harness/policy-scan.selftest.ts
- Line 1, "Oracle for the static tenant catalog scan" — narration.

### tests/at/harness/shipped-tenant-reads.selftest.ts
- Line 1, "Oracle for the shipped tenant-read cores" — narration.
- Line 5, "Driven directly because the acceptance bodies cannot inject" — alibi for the test's own existence.
- Line 125, "The predicate is true for every row today" — alibi explaining why a branch is untested; restates `projectIsPublic`.

### tests/at/suites/req-001/_contract.ts
- Line 620, "WHAT A GREEN OVER IT CLAIMS, said narrowly because the criterion's" — alibi (edited, still a long justification of what the test does and does not prove). `MUST KILL updateOrganization` — the doc comment is carrying a scope boundary the type signature does not.
- Line 703, "Change an account's type without touching any seat" — narration restating `retypeAccountAsOperator`'s one-line body.
- Line 809, "reads AS THE CALLER. The operator reads beside them" — phase marker.

### tests/at/suites/req-001/_fixture.ts
- Line 1265, "ATTACH A VOLUNTEER — and the refusals below MIRROR THE DATABASE's" — alibi (long justification of ordering and refusal shape that the code below already encodes). `MUST KILL assignVolunteerAsOperator` — the ordering claim belongs in a comment beside the two `if` blocks it describes, not a wall of prose above the function, or better, in a test that pins the order.

### tests/at/suites/req-001/_integration.ts
- Line 764, "WHAT THIS GREEN CLAIMS, AND WHAT IT DOES NOT (gate-1 ruling 1)" — alibi (edited).
- Line 985, "NO CLIENT REACH. `public.org_memberships` is asked for" — alibi (edited).
- Line 1288, "AT-001.21 — one organisation cannot reach another's data" — narration.
- Line 1386, "AT-001.22 — an unassigned volunteer is denied a project's working data" — narration.
- Line 1458, "AT-001.23 — the assigned volunteer reaches that project's working data" — narration.
- Line 1573, "AT-001.40 — a platform administrator reaches every tenant table" — narration.
- Line 1666, "AT-001.24 — logged-out visitor. The API half is asserted first" — narration.

### tests/at/suites/req-001/_live.ts
- Line 583, "only way AT-001.32's Given is reached. `authenticated` may SELECT" — alibi (edited).
- Line 633, "SENTENCE-PRIMARY, SQLSTATE AS AGREEMENT — gate-2 ruling R3" — alibi (edited to add more justification instead of less).

### tests/at/suites/req-001/_pending.ts
- Line 2, "THE IDS REQ-001 HAS NOT LANDED YET, and the leaf that will land" — narration (a running headcount kept in prose; edited).
- Line 48, "EIGHT LABELS ARE GONE FROM THIS MAP rather than kept for symmetry" — narration (edited).

### tests/at/suites/req-001/_source-scan.ts
- Line 4, "The criterion's parenthetical is "(UI absent; API rejects)"" — narration (edited).

### tests/at/suites/req-001/d-tenant-isolation.test.ts
- Line 1, "AT-REQ-001 section E — tenant isolation and visibility" — narration (replaced wholesale).

### tests/at/suites/req-001/_live-tenant-reads.ts
- Line 1, "Caller-bound tenant reads for the live adapter" — narration.

### tests/at/README.md
- Not a code comment; this is prose documentation. Skipped, not counted as meat or keep.

## MUST KILL summary

1. `PROJECT_NOT_PUBLIC` (`supabase/functions/_shared/public-project.ts:13`) — the "no way to tell which" invariant should be obvious from the constant's shape, not asserted in prose.
2. `projectIsPublic` (`supabase/functions/_shared/public-project.ts:23`) — the stub-until-REQ-010/011 status needs a name or type that says so, not a comment.
3. `PUBLIC_READ_FAILED` (`supabase/functions/_shared/public-project.ts:39`) — duplicate shape of `TENANT_READ_FAILED`; extract one outage-answer factory.
4. `TENANT_NOT_FOUND` (`supabase/functions/_shared/tenant-reads.ts:12`) — same duplication problem as above.
5. `TENANT_READ_FAILED` (`supabase/functions/_shared/tenant-reads.ts:18`) — same.
6. `viewer_is_org_member` (`supabase/migrations/20260906120000_tenant_read_posture_and_org_member_policies.sql:71`) — recursion-avoidance needs a rearchitecture (a comment-free naming convention or a docs table) that doesn't rely on a `--` note nobody reads at query time.
7. The anonymous `do $$ ... $$` existing-row guard (`supabase/migrations/20260907120000_tenant_read_volunteer_seat_and_admin_reach.sql:58`) — extract to a named check so "the table is empty in every environment" isn't a claim living only in prose.
8. `updateOrganization` (`tests/at/suites/req-001/_contract.ts:647`) — the isolation-scope disclaimer belongs on the narrower assertion it now defers to, not restated here.
9. `assignVolunteerAsOperator` (`tests/at/suites/req-001/_fixture.ts:1289`) — the trigger-ordering claim should be pinned by a test, not carried as a wall of prose above the fixture.

## Keeps (leash held)

- Two migration headers dated 2026-09-06 and 2026-09-07 — lead-ruled keep, not judged.
- CORS paragraph, `supabase/functions/_shared/edge.ts` (around line 60) — lead-ruled keep, not judged.
- `loop/work/grok-shim/grok:2`, "PATH-front wrapper for the grok CLI on hosts whose kernel lacks Landlock." — non-obvious behavior forced by an external dependency (the grok CLI's own sandbox profiles and the host kernel's Landlock support), which this tree cannot reshape.
- `supabase/migrations/20260907120000_tenant_read_volunteer_seat_and_admin_reach.sql:118`, "A free seat admits nobody: null = auth.uid() is null, not true." — SQL's own null semantics, an external protocol this tree cannot reshape.
- `supabase/functions/_shared/edge.ts:328` neighbor... (not double-counted) — see meat list; no further keeps in that file beyond the CORS exception.
- `tests/at/harness/live-stack.ts:99`, "A Data API GET as a caller. `bearer` null sends the anon key as bearer" — doc comment stating the exported test-harness function's contract (what a null bearer means), not narration of its body.
- `tests/at/harness/live-stack.ts:108`, "An edge-function POST that returns raw text so equality is over bytes." — same: states why the contract differs from its sibling (`functionPost`), not what the code already shows.
- `tests/at/suites/req-001/_policy-scan.ts`, "Apply later statements over earlier ones and return every catalog problem. Throws when the files contain no `create table public.<t>`." (on `scanTenantMigrations`) — states the throw contract of an exported function, not narration.
- `tests/at/suites/req-001/_contract.ts`, the `ViewerRefusalKind` inline doc ("privilege-denied: the privilege layer; session-refused: the token...") — defines what each discriminant of an exported contract type means; not restatable from the type alone.

## Skips

- `tests/at/README.md` — prose documentation, not a code comment; out of scope.
- `tests/at/expected/req-001.json` — JSON, carries no comments.
- `comment on function ...` / `comment on policy ...` SQL statements in both migrations — these are persisted catalog metadata (visible via `\d+`), a different construct from a `--` comment. Judged out of scope for this audit; flagged here for the lead's attention rather than silently passed.
- Renamed/moved existing doc comments in `tests/at/suites/req-001/_live.ts` (`claimsOf` extraction, lines 127–136) — pure code motion, no new prose; not meat.
