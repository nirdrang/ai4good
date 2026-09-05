# Arena synthesis: tenant isolation design

Four candidates, one direction each, scored by the lead against `rubric.md` before reading the cross-judge. The judge's report is `judge-astra.md`; the agreement or disagreement is recorded at the end.

## Lead scores (0 to 3 per criterion)

| Candidate | 1 honest proof | 2 no-oracle | 3 territory, AT-001.24 | 4 migration | 5 one rule | 6 harness fit | Total |
|---|---|---|---|---|---|---|---|
| A database-first (Opus) | 2 | 3 | 3 | 3 | 3 | 3 | 17 |
| B edge-first (Fable) | 3 | 3 | 3 | 3 | 1 | 3 | 16 |
| C catalog-first (Astra) | 3 | 3 | 3 | 2 | 3 | 2 | 16 |
| D viewer-scope-first (Grok) | 3 | 3 | 1 | 2 | 3 | 3 | 15 |

Cells below 3, with the candidate's own text that cost the point:

- **A, criterion 1.** Ships no authenticated read function ("No authenticated read function ships") and declares four loop rows red. The acceptance text names two probes, "by UI or direct API/ID probing"; A proves only the second and leaves the product read path to a later leaf with a contract note. The four loop reds are honest but they are a consequence of having no shipped orchestration to grade, which ruling 3 explicitly allows the loop tier to grade.
- **B, criterion 5.** Keeps `tenantReadAllowed` in TypeScript beside the SQL policies ("belt, braces, and the buckle"), against ruling 1. The matrix mechanism is real, and B names the deletion path itself; with the rule deleted, B converges on A plus edge functions.
- **C, criterion 4.** Grants `SELECT` on all six tables with own-row and administrator policies on `accounts` and `volunteer_profiles` that no acceptance id exercises; the `viewer_is_org_member` helper restates the NGO type the membership trigger already enforces.
- **C, criterion 6.** A compiler, a generator CLI, generated migrations and a generated evaluator for six tables. The harness rules forbid no such thing, but the laziness protocol does: six policies do not pay for a code generator, and a reviewer reads generated SQL instead of policy text.
- **D, criterion 3.** Ships `classifyRoute` and an `AppRoute` union that no router imports and names `/sign-in` before the route exists. It is a function rather than a file-name registry, and it is still product code nothing calls that reports a capability nothing enforces; ruling 10 refused that shape.
- **D, criterion 4.** The whole design rests on the planner building one InitPlan per statement for `(select ... from public.viewer_scope() s)` inside a policy; D's own first open question says this is unmeasured. A `viewer-scope` edge function and a composite type are added for a consumer that does not exist yet.

## Strongest idea per candidate

- **A.** The policy set is the system under test and nothing in TypeScript decides a tenant read. The `ViewerRead` type keeps three refusal kinds apart from an empty list, so a stack whose grants never applied cannot pass as isolation. The seat trigger is the single home of "a developer seat holds a volunteer". The static scan runs inside the loop bodies so the build fails when the policy set loses its shape.
- **B.** `TenantReadAnswer<T>` as a three-member union whose two refusals are `as const` constants (`TENANT_NOT_FOUND` 404, `TENANT_READ_FAILED` 502): a handler has nowhere to put a second refusal, and an outage names no identifier. Two authenticated read functions, organisation dashboard and project workspace, with wiring-only shells over a pure core with injected reads.
- **C.** The public page reads through one `SECURITY DEFINER` RPC granted to `service_role` only, so no table gains a `service_role` `SELECT` grant for the public surface. The assignment trigger body with its two error codes.
- **D.** Two indexes the helper lookups want: `org_memberships (account_id)` and `projects (assigned_volunteer_id)`.

## Base

**Candidate A.** It takes ruling 1 to its end, its migration is the smallest and safest of the four, its harness additions are two fetch helpers and one scan, and a future maintainer adding a table writes one policy and one catalog line. B and D converge on it once their extra rule and extra classifier are removed. C's compiler is the one shape a maintainer would have to learn before touching a policy.

## Grafts

1. **From B: two authenticated read functions that read as the caller, with a pure core.** `organization-dashboard` and `project-workspace` ship in unit 1. Each shell resolves the caller for session liveness, forwards the request's own `Authorization` header to PostgREST through a `callerReads` adapter in `edge.ts`, and hands the rows to a pure core in `supabase/functions/_shared/tenant-reads.ts` that projects them. The core holds no tenant rule: zero rows is `TENANT_NOT_FOUND`, a failed read is `TENANT_READ_FAILED`, rows are shaped field by field. Reason: the criterion names the UI path; the project rule sends the UI through an edge function; a function that forwards the token proves at integration that the product path and the direct probe are filtered by the same policy, and gives the loop tier shipped orchestration to grade. Precedent: the three write functions exist with no UI calling them.
2. **From B: the three-member answer type.** `TenantReadAnswer<T>` with `TENANT_NOT_FOUND` and `TENANT_READ_FAILED` as constants, returned and never thrown. The public page keeps A's `PROJECT_NOT_PUBLIC` as its own constant, since its refusal covers a different pair ("no such project" and "not public").
3. **From C: the public page reads through one definer RPC.** `public.read_public_project(uuid)` returns the project id, its name and the organisation name in one row, `SECURITY DEFINER`, `EXECUTE` to `service_role` only. The function's service-role call reaches that RPC and no table, so `service_role` gains no table `SELECT` for the public surface. `projectIsPublic` is applied in TypeScript to the returned row before projection; one read, so the refusal collapse needs no ordering.
4. **From C: the trigger body.** `23503` when the account does not exist, `42501` when it is not a volunteer, with the sentences C wrote.
5. **From D: the two indexes.**
6. **Loop tier: green over shipped orchestration.** With graft 1 there is shipped code to grade, so AT-001.21, .22, .23 and .40 are green at loop over the pure cores with injected reads, the refusal constants compared by identity and by bytes, the public projection's named absences, and the static scan. The viewer-shaped harness reads still throw `CapabilityPending` at loop and no loop body calls them. This replaces A's four loop reds. It is what ruling 3 permits and what B, C and D all did.

## Rejected

- **B's `tenantReadAllowed` and `_tenant-matrix.ts`.** With one rule there is nothing for a matrix to keep in step.
- **B's zero-helper policy graph over own-row policies.** Elegant, and it leans on the single-seat invariant: an NGO member sees only its own seat row, and the day multi-member organisations land (the roadmap names them) every organisation policy changes shape. A's two `viewer_` helpers keep the policies one sentence each and survive that change.
- **C's compiler, generator, generated migrations and tooling evaluator.** The catalog stays a declared expectation the scan compares against, as A has it.
- **C's own-row and administrator policies on `accounts` and `volunteer_profiles`.** No id reads them; a policy nothing exercises is a policy nobody tests. The tables stay unreachable by client roles and are declared so.
- **D's `viewer_scope()` composite, `viewer-scope` function, `classifyRoute` and `AppRoute`.** The InitPlan behaviour is unmeasured, the classifier is product code nothing imports, and the sign-in path is not this leaf's to name.
- **A's four loop reds.** Replaced by graft 6.
- **A's `freshAccessToken` refresh in the adapter** stays; B's `signInAgain` in the bodies is not needed on top of it.

## Cross-judge

The judge ran on GPT-6 Astra at medium, the provider of candidate C, and recommended C as the base with A at 13, B at 14, C at 17 and D at 4. The lead and the judge disagree on the base.

The judge's deductions on A, read one by one: the missing rightful-caller control in AT-001.22, the loop reds, the deferred authenticated read path and the `functionGet` call were all already removed by grafts 1, 2 and 6 above, written before the judge's report. Two deductions stand and are taken:

- **The assigned-volunteer policy needs the type conjunct after all.** An operator changing an assigned account's type after assignment leaves a non-volunteer with project reads, and a trigger on `projects` cannot see that. Ruling 8 asked for both. `design.md` now adds `viewer_is_volunteer()` and the conjunct, and the trigger stays for the write. The "open point" this note carried to the founder is closed by that.
- **The public answer type is a closed union**, not an open status and record.

The judge's case for C rests on the compiler enforcing the extension contract. The lead keeps the rejection: six tables do not pay for a generator, a reviewer reads generated SQL instead of policy text, and A's static scan already fails the build when a new table is undeclared, which is the extension contract in twenty lines. The judge is C's own lane; the decision trail records that when the judge was chosen. Where the judge found defects in D (an acknowledgment policy that admits foreign rows, a correlated subquery sold as uncorrelated), the lead's rejection of D stands on the same facts.

Base stays A with the grafts above and the two corrections.
