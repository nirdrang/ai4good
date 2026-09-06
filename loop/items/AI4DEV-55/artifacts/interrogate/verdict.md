# Interrogate verdict: the tenant read path

## Intent

> Land the tenant read path for the authentication requirement's visibility line, with the SQL policy set as the only tenant rule; every filtered read reaches PostgREST as the caller; the public project page is the one anonymous surface, behind one eligibility predicate; a read denial is one constant for "not yours" and "no such row"; the assigned-volunteer seat holds a volunteer, enforced by a trigger on write and a type conjunct on read; the harness gains viewer-shaped reads, raw-text helpers, a static catalog scan that runs in CI and a live catalog check at integration. Four acceptance ids green at both tiers, AT-001.24 red with a declared capability by founder ruling.

## Reviewers

- Astra (GPT-6 at medium, external): 5 findings, 3 minutes.
- Fable (at medium, native): 11 findings.
- Opus (at xhigh, native): 14 findings, two backed by a probe it ran against the shipped scanner (13 weakening statements, all passed clean).
- Grok (4.6 at xhigh, external): 6 findings, 16 minutes.

## Act on

1. **The static catalog scan is add-only and misses every weakening statement.** Raised by all three. Opus appended thirteen statements to the real migration set and the scanner returned clean for each: `disable row level security`, `drop policy`, `alter policy ... using (true)`, write grants to `authenticated`, `grant all on all tables`, `force row level security`, `create table if not exists`, a quoted table name, an unqualified `viewer_is_org_member(...)` call, a policy `to anon`, `drop function`, `drop table`, `using (1=1)`. The one guard CI runs therefore catches none of the regressions ruling 4 built it for. Fix: make the overlay symmetric (model drop policy, alter policy, disable and force row level security, drop table, drop function, `if not exists`, quoted names, `grant all on all tables`, `grant ... to public`, `alter default privileges`, and refuse the last two forms outright); check exact privilege sets rather than presence (`authenticated` holds exactly `{select}` on an isolated table and `{}` on an unreachable one, `anon` holds `{}` everywhere, `service_role` holds no insert, update, delete or truncate); require the baseline `revoke all ... from anon, authenticated` after every catalog table's `create table`, since the tree learned twice that no grant statement is not no privilege; refuse a policy `to anon`, `for all` or with a tautological `using`; require every `using` to name `auth.uid()` or a `public.viewer_` function; apply the definer rule to every `create function ... security definer`, not only to the `viewer_` prefix. One selftest per refusal, in the negative direction.
2. **The live catalog check tests one of the header's four bullets.** Raised by Fable and Opus. Fix: walk the facts both ways and refuse any `public` table the catalog does not name; read `relforcerowsecurity`; read `has_table_privilege` for every privilege for `anon`, `authenticated` and `service_role` and pin the exact sets; read `has_function_privilege` for `anon` and `authenticated` on every definer function and pin it to the `viewer_` set. Then rewrite the migration header so it says exactly what the two checks test.
3. **The service role's default privileges on the four oldest tables were never revoked.** Raised by Fable, agreed by Opus's posture finding. Fix: in migration one, `revoke all on table <six tables> from service_role`, then re-grant the two `SELECT`s the write functions need, and have the live check pin `service_role` to exactly those.
4. **The public-page leak assertion inspects a reconstructed object, not the bytes.** Raised by Astra. Fix: in AT-001.22 and AT-001.24 integration bodies, parse `answer.body` and assert its exact key set.
5. **Nothing exercises the read-time type conjunct.** Raised by Astra. Fix: an operator member that changes an account's type (contract, both adapters, narrow), and in AT-001.23 at integration: after the seated volunteer's successful read, retype that account to `ngo` without touching the seat, sign in again, and assert the project read and the workspace are denied.
6. **The two seat-refusal sentences overlap, so classification depends on regex order in two adapters.** Raised by Opus, noted as a deviation by the unit 2 writer. Fix: reword the trigger's sentence so it does not contain "single developer seat" (for example "projects refuses assignment: the developer seat admits volunteer accounts only"), update the live regex and the fixture's mirrored reason, and keep the two patterns disjoint.
7. **A row the viewer parser cannot map is dropped in silence, so a leak reads as a denial.** Raised by Fable and Opus. Fix: `viewerRead` answers `{ ok: false, kind: 'refused', reason: 'a row did not match the expected shape' }` when any row of a 200 answer fails the mapper.
8. **The zero-argument policy predicates run once per row.** Raised by Opus. Fix: `(select public.viewer_is_platform_admin())` and `(select public.viewer_is_volunteer())` in the five policies; `viewer_is_org_member(id)` stays as it is.
9. **Duplicated helpers.** Raised by Fable and Opus. Fix: `publicProjectReads.source` becomes one `restJson` call with a POST init; `functionPost` becomes a wrapper over `functionPostRaw`, which returns the url and takes the optional ip; the three parse blocks in the live adapter collapse into one helper; one `claimsOf(token)` replaces the four copies of the JWT decode; `seatsOf` and `projectsOf` run under one `Promise.all`; the unreachable `?? ''` on the `Authorization` header in the two function shells goes.
10. **The live adapter crosses a thousand lines with a separable block.** Raised by Astra and Opus. Fix: move the viewer-read members and their helpers to `tests/at/suites/req-001/_live-tenant-reads.ts` and spread them into the adapter.
11. **Three integration bodies reach around the contract to the raw stack.** Raised by Fable. Fix: an unfiltered `organizationsAsViewer(session)` member; the four viewer reads and `publicProjectPage` accept `Session | null` for the anon arm; the `live-stack.ts` import leaves `_integration.ts`.
12. **The grok wrapper escalates unconditionally and the committed copy is not the copy that ran.** Raised by all three. Fix: gate the sandbox rewrite, the permission-mode rewrite and the bash auto-allow on the Landlock probe, re-probe on every run instead of caching a negative, print one line to stderr when the rewrite fires, add a short README beside it, and make the committed copy the live path (the lead's own PATH prefix moves to `loop/work/grok-shim`).
13. **Seven stated-posture comments are now false and ruling 12 named two.** Raised by Opus and Grok. Fix: rewrite the paragraphs in `_integration.ts` for AT-001.16 and AT-001.17 arm 2 and the `_source-scan.ts` header to the posture this leaf landed (`anon` holds nothing; `authenticated` holds `SELECT` on the four tenant tables, filtered by policy; the anon 401 is the privilege layer for `anon`, not "no client role"); correct the CORS paragraph in `edge.ts` in place (six functions now, one authenticates nothing, and the justification must reach that case); add one paragraph to the migration-one header naming the two earlier migrations' superseded claims by file, and name the earlier proof script's `authenticated` arm as superseded there too. Do not edit the earlier migration files.
14. **Small things.** Drop the `org_memberships (account_id)` index (the primary key already serves the predicate); log the read failure `detail` once in `restJson` so it is not write-only; rename `emptyViewerRows` to `viewerRows` and `asStringRows` to `mappedRows`.

## Consider

- **Collapse the dashboard's three reads into one embedded PostgREST read.** Opus. It would make the read atomic and delete two failure branches, at the cost of a different `TenantReads` shape in every injected-read literal. Not now; the `Promise.all` half is taken in item 9. Recorded for the leaf that gives the dashboard a screen.
- **Put the publication predicate into `read_public_project`'s `WHERE`.** Opus. Today the predicate is true for every row, so the clause would be `where true`. When the publication requirement lands a real rule, that is where the SQL half belongs, with `projectIsPublic` as the projection-side statement. Recorded in the predicate's header and in "Not done here"; not built now.
- **Move the loop bodies out of the test file into a `_loop.ts` sibling.** Opus. The file's own pattern argues for it; the laziness protocol argues against touching a passing file for shape alone. Left as is.

## Noted

- Loop bodies run the shipped cores over unfiltered Maps, so at loop tier a foreign dashboard answers 200. Chosen on purpose by ruling 3; the file header says so. (Fable, not flagged.)
- `viewer_is_org_member` is callable through the Data API by any signed-in user and answers only about the caller. (Fable, not flagged.)

## Dismissed

- None. Every finding traced to a real line and none rested on a hypothetical path. The two "critical" labels from Opus land on the same defect as items 1 and 2 above.

## Agreement map

All three reviewers, working from different providers, found the scanner hole and the wrapper escalation independently, and two of three found each of the parser silence, the duplicated helpers and the file-size crossing. That agreement is the reason items 1, 2 and 12 lead the list. The single-reviewer findings that survived (the byte-level leak assertion, the missing conjunct test, the sentence collision, the per-row predicate cost) each traced a concrete path, and the lead checked each against the code.

## Grok

Six findings, all traced. Four duplicate items already above (the file-size crossing, the scanner's posture gap, the copied `restJson`, the missing conjunct test, the wrapper). One is new and taken into item 13: the AT-001.16 and AT-001.17 write-ups in `_integration.ts` and the `_source-scan.ts` header still say the tree has no read surface and that `org_memberships` reaches no client role. Grok also names `grant ... to public` and `alter default privileges` as statement forms the overlay must refuse; taken into item 1. Four of four reviewers found the scanner hole and the wrapper escalation.
