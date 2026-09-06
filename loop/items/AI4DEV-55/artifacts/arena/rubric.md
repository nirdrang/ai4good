# Arena rubric: tenant isolation design

The picker's tool. Candidates do not see it. Score each criterion 0 to 3 per candidate, with one sentence of evidence from the candidate's own text.

1. **Every id has an honest proof at both tiers.** Ten rows, each naming what the body does and which layer it proves. A loop body that claims to prove a policy scores 0 on this row. A red is declared with a named shape, never skipped.
2. **The no-existence-oracle property is structural.** One refusal answer for "not yours" and "no such row", with nowhere in the surface to put a second one, and a test that compares the two responses rather than asserting both refused. Covers direct id probing through PostgREST and through every function the design adds.
3. **Inside Claude territory, and AT-001.24 is settled.** No `src/` change. The candidate states exactly what this pull request proves for the logged-out visitor id, how, and what it declares for the part it cannot prove.
4. **The migration is minimal and safe.** Grants precede policies; `service_role` gains no DML; no FORCE ROW LEVEL SECURITY; helpers are SECURITY DEFINER with `search_path` pinned and EXECUTE to `authenticated`; `anon` is handled explicitly; the platform admin's reach is in the policy set; the two `REVOKE ALL` tables are reopened only as far as needed.
5. **One rule, one home.** The tenant rule lives in one place, or in two places tied by a mechanism that fails when they drift (conformance test, derivation, tripwire). A second hand-written copy with prose asking future authors to keep them in step scores 0.
6. **Fits main's harness and lands in two green units.** Uses `createLiveAdapter({ stack })`, `functionPost`, `authPost`, `sqlClient` and the manifest discipline as they are on main; adds no sentinel, fault, vendor stand-in or fixture world; unit 1 is green on its own before unit 2 starts.

Tie-breakers, in order: smaller public surface for the same capability; fewer files a reader must open to trace one read from request to row; less new machinery under `tests/at/harness/`.
