# Design task: tenant isolation and visibility for the authentication requirement

You are one runner in a parallel design exploration. Read this whole file, then the grounding files it names, then produce ONE candidate design package as your final answer. You are read-only on the repository at /home/user/ai4good. Do not edit any file. Your final answer is the package.

## Grounding, read in this order

1. `loop/items/AI4DEV-55/brief.md` — the item, its two units, and the ask.
2. `loop/items/AI4DEV-55/artifacts/how/explanation.md` — how the repository decides visibility today. Every constraint below comes from it; check the code when you doubt a line.
3. `loop/items/AI4DEV-55/artifacts/how/rulings.md` — what the architectural critics found and what the lead ruled: the "act on" items bind your design, the "consider" items you may take or refuse with a reason.
4. `.taskmaster/docs/acceptance/at-req-001.md`, section "E. Tenant isolation & visibility" — the five acceptance ids, verbatim. They are the specification. Quote them, never paraphrase them.
5. `tests/at/suites/req-001/` — `_contract.ts`, `_fixture.ts`, `_live.ts`, `_integration.ts`, `_pending.ts`, `d-tenant-isolation.test.ts`, and `c-membership-and-acknowledgment.test.ts` as the nearest landed precedent. `tests/at/harness/live-stack.ts` for `functionPost`, `authPost`, `sqlClient`. `tests/at/expected/req-001.json` for the declaration manifest.
6. `supabase/migrations/` (all five) and `supabase/functions/_shared/` — the schema, the grants, the definer functions, the caller resolution.
7. `.claude/worktrees/ref-66/` — a complete, never-merged prior attempt at this deliverable. Read `supabase/functions/_shared/visibility.ts`, its two migrations dated 2026-08-12 and 2026-08-13, and `loop/items/AI4DEV-66/plan.md` there. Its decisions may be taken; its harness code targets a retired slot pool and cannot be pasted.

## The problem

Five acceptance ids must turn green at both harness tiers, and the tree today has no tenant read path at all: six tables with row-level security on and zero policies, three edge functions that only write, one front-end route that renders a heading, and a loop fixture that is a Map. The design must add the read path and prove it. Two units, one design:

- Unit 1 (cross-org denial, no existence oracle): AT-001.21 and AT-001.22.
- Unit 2 (assigned volunteer scope, platform admin reach, logged-out visibility): AT-001.23, AT-001.40, AT-001.24. Unit 2 starts only when unit 1 is green.

## Constraints the design must honor

- **Grant before policy.** Client roles hold almost no table privileges. A `GRANT SELECT ... TO authenticated` must precede any policy, or PostgREST fails at privilege and the policy never runs. `projects` and `volunteer_profiles` carry `REVOKE ALL`.
- **No account type in the JWT.** Policies that need the caller's type must read `public.accounts` through a SECURITY DEFINER helper with `SET search_path = ''`, EXECUTE granted to `authenticated`, taking no "other person" argument.
- **Do not widen `service_role` DML, do not set FORCE ROW LEVEL SECURITY.** The first defeats `complete_signup`'s platform-admin refusal; the second breaks operator provisioning.
- **Service role and operator SQL bypass RLS.** Any read through them proves nothing about isolation. Today every edge-function lookup and every harness read-back is such a read.
- **Loop tier cannot prove RLS.** It proves shipped pure TypeScript decisions and the shape of an edge-function response. Integration is the only tier where a policy is exercised, and the only read that exercises it is a PostgREST GET with `apikey: <anon key>` and `Authorization: Bearer <that user's access token>`. There is no `restGet` helper yet and no SUT method that reads as the caller.
- **The named surfaces do not exist.** Drafts, ledger, reference files, comment thread, dashboard, tasks, listings and the public project page have no table and no route; they belong to later requirements. The tenant rows that exist are organisations, memberships, acknowledgments, volunteer profiles, and a project's identity plus its assigned volunteer. The design decides once, in writing, how the ids are proved against surfaces that do not exist, and how a later requirement's new table is forced to join the policy set (a tripwire, a catalog, a conformance test, or a documented stand-in).
- **This pull request cannot touch `src/`.** The CI ownership guard fails any pull request that changes both Lovable territory (`src/`) and Claude territory (`supabase/`, `tests/`, `loop/`, `.claude/`). UI work goes through Lovable separately. AT-001.24's redirect half ("every authenticated surface redirects to sign-in") names a front end that does not exist. The design states exactly what this pull request proves for AT-001.24, how, and what it declares in the manifest for the part it cannot prove. A red must have a named shape (`AtPending` phase or `CapabilityPending` capability), never a silent skip.
- **The harness discipline.** `tests/at/expected/req-001.json` declares each id per tier; a declared red that turns green fails the run, so the manifest moves in the same change as the bodies. `_pending.ts` drops a leaf label when its ids land. Integration bodies register, confirm by mail, then sign in. Refusal classification is by message text first, SQLSTATE second.
- **The project rule "UI never touches the database directly, always through an edge function"** conflicts with the migration notes that imagine RLS-backed reads from the UI. State which read architecture the design chooses and why: edge functions with the caller's JWT, PostgREST with RLS, or both with a stated relation between the TypeScript rule and the SQL rule.
- **The no-existence-oracle clause is structural, not tested-in.** The reference branch's shape: one exported refusal answer for both "no such row" and "not yours", handlers with nowhere to put a second refusal, target row read last, tests comparing the two responses byte for byte. Take it, improve it, or replace it with something at least as structural.

## Your assigned direction

Each runner takes a different structural direction so the candidates do not converge. Design the best version of YOUR direction. Do not hedge toward the others; the differences are the signal. Your direction is named in the message that hands you this file.

- **Direction A, database-first.** The SQL policy set is the single rule. Reads reach PostgREST as the caller (anon or authenticated JWT). Edge functions exist only where anon needs a projection (the public project page). TypeScript carries no second copy of the tenant rule.
- **Direction B, edge-first.** Every read is an edge function with the caller's JWT. One pure TypeScript decision (`tenantReadAllowed`-style) is the rule, proved at loop; the SQL policies are a backstop proved separately at integration, with an explicit statement of how the two rules are kept from drifting.
- **Direction C, catalog-first.** One declarative visibility catalog (table or surface, scope kind, who sees) is the single source of truth. The SQL policies, the TypeScript decision, and the acceptance bodies all derive from it, and a conformance check fails when a `public` table is missing from the catalog. Show the generation or derivation mechanism concretely.
- **Direction D, viewer-scope-first.** One SECURITY DEFINER function computes the caller's whole scope once (admin flag, organisation ids, assigned project ids) and everything consumes it: the policies, the edge functions, and a route-classification module the front end will import for AT-001.24. Show how a single scope value stays cheap and correct.

## What the package must contain

Follow `rationale-template.md` from the architect skill (Problem, Usage from the caller's view first, Shape, Tradeoffs accepted, Alternatives considered, Open questions and risks, Next implementation step). In addition, as explicit sections:

1. **Migration sketch.** Grants, helper functions, policies per table, in order, as SQL with bodies allowed to be `-- TODO` where the logic is routine. State what happens to `anon`.
2. **Read surfaces.** Each function or PostgREST read the design adds, its inputs, its refusal shape, and which acceptance id uses it.
3. **Proof map.** A table with one row per acceptance id and per tier (ten rows): what the body does, which layer it proves, positive control, and the exact manifest declaration (`green`, or a red with its declared shape).
4. **Harness changes.** Which files under `tests/at/` change and how: `_contract.ts` SUT additions, `_fixture.ts` loop storage, `_live.ts` integration adapter (name the new read-as-caller helper), `_integration.ts` bodies, `_pending.ts`, `expected/req-001.json`, and any new `tests/at/harness/` module with the reason it is not a new sentinel, fault, vendor stand-in or fixture world (the acceptance-test rules forbid those).
5. **Unit split.** What lands in unit 1 and what in unit 2, such that unit 1 is green on its own.
6. **Not built here.** Discovered work that belongs to a later requirement.

Write TypeScript sketches with `not implemented` bodies and SQL with `-- TODO` bodies where the logic is routine. Comments in sketches state intent and invariants only. Keep the whole package under about 1,500 lines.
