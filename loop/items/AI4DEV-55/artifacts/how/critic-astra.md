## Findings

### 1. [structural] The established request path bypasses the database’s access-control boundary
**Components**: Edge functions, shared database transport, RLS policies.

**Finding**: The current write architecture is defensible: privileged RPCs perform transactional writes and repeat authorization checks. Extending its service-role lookup pattern to tenant reads would, however, make RLS a parallel implementation rather than the enforcement boundary used by the application.

**Evidence**: [update-organization/index.ts:62](/home/user/ai4good/supabase/functions/update-organization/index.ts:62) reads membership using the service key, applies `orgAdminActionAllowed`, then invokes a privileged RPC. [edge.ts:272](/home/user/ai4good/supabase/functions/_shared/edge.ts:272) always sends the service key to PostgREST; it never forwards the caller’s authority. The [initial migration:313](/home/user/ai4good/supabase/migrations/20260808120000_accounts_org_membership_and_acknowledgments.sql:313) enables RLS but explicitly leaves policies absent.

The detached attempt demonstrates the resulting divergence: its [project decision:193](/home/user/ai4good/.claude/worktrees/ref-66/supabase/functions/_shared/visibility.ts:193) admits an assigned volunteer or platform admin, excluding the owning NGO, while its [project policy:141](/home/user/ai4good/.claude/worktrees/ref-66/supabase/migrations/20260812120000_tenant_isolation_policy_set.sql:141) admits the owning organisation’s members. Its workspace handler deliberately omits the membership lookup to preserve its request-order convention.

**Impact**: Access depends on which endpoint retrieves the same resource. Each new read must maintain both application and SQL rules, and application mistakes receive no RLS backstop.

The deliverable should establish authorization around resource ownership and project assignment, independently of dashboard/workspace names. Keeping the edge-function boundary while performing private reads under the caller’s JWT would integrate RLS without allowing direct UI database access. Retaining privileged reads instead requires an explicit, justified second authorization system and equivalent tests across both paths.

### 2. [structural] Rendering isolation has no runtime boundary or completion path
**Components**: TanStack router, session handling, frontend/backend ownership guard, acceptance runner.

**Finding**: Logged-out visibility cannot be completed as a backend-only tenant policy leaf. The missing pieces are connected architectural dependencies: session-aware routing, a sign-in destination, protected loaders, and a driver that observes actual rendering. The current work division encourages replacing that boundary with declarations about routes.

**Evidence**: [router.tsx:5](/home/user/ai4good/src/router.tsx:5) supplies only a `QueryClient` as context. [index.tsx:3](/home/user/ai4good/src/routes/index.tsx:3) is the sole destination and has no guard; [__root.tsx:83](/home/user/ai4good/src/routes/__root.tsx:83) defines the shell and error handling without authentication.

[runner.ts:300](/home/user/ai4good/tests/at/harness/runner.ts:300) explicitly refuses `--wired` because the screen driver does not exist. Meanwhile, [ci.yml:213](/home/user/ai4good/.github/workflows/ci.yml:213) prohibits a PR from changing both `src/` and backend/test files. The detached attempt’s [route catalogue:63](/home/user/ai4good/.claude/worktrees/ref-66/supabase/functions/_shared/route-visibility.ts:63) classifies filenames, but the router consumes none of it.

Frontend guidance also conflicts: [example.functions.ts:11](/home/user/ai4good/src/lib/api/example.functions.ts:11) recommends server functions instead of edge functions, while the project rule requires edge access.

**Impact**: An API denial or complete route catalogue cannot prove that private content never renders or that navigation redirects to sign-in. AT-001.24 cannot honestly become green at both tiers under this arrangement.

The deliverable should include coordinated frontend and harness dependencies, with one runtime session boundary protecting authenticated routes before their data loads. Separate PR ownership can remain, but completion must follow their combined integration—not a backend declaration that substitutes for it.

### 3. [concern] Public visibility is not represented separately from project existence
**Components**: `projects`, future publication lifecycle, public read projections.

**Finding**: The current project model supports ownership and assignment but cannot answer whether a project may be publicly disclosed. A public endpoint built directly over this shape would have to invent that answer. Restricting returned fields does not establish that the row itself is public.

**Evidence**: [projects migration:57](/home/user/ai4good/supabase/migrations/20260811130000_single_seat_org_and_single_developer_projects.sql:57) contains only identity, organisation, name, assignee, and creation time. The detached [public-project-page handler:64](/home/user/ai4good/.claude/worktrees/ref-66/supabase/functions/public-project-page/index.ts:64) reads any existing project by ID and returns its projection without a publication condition.

This conflicts with concrete forthcoming behavior: [AT-003.12](/home/user/ai4good/.taskmaster/docs/acceptance/at-req-003.md:31) requires private draft/discovery states; [the publication requirement](/home/user/ai4good/.taskmaster/docs/prd-mvp.md:451) keeps projects publicly invisible until human approval; [break-glass visibility](/home/user/ai4good/.taskmaster/docs/prd-mvp.md:554) hides projects independently of lifecycle state.

**Impact**: Treating every project as public would turn the public exception into an existence oracle for private projects. Later publication and emergency-hiding work would need to retrofit every public reader.

Before introducing public reads, this leaf needs an explicit, default-private publication contract. A field-by-field public projection is useful, but must follow that eligibility check. This does not require implementing the whole lifecycle now.

### 4. [concern] The harness abstracts away the authority and orchestration that isolation must test
**Components**: `AccountsSut`, loop fixture, live adapter, HTTP helpers, CI.

**Finding**: The harness is well equipped to verify pure decisions and inspect write results. Its existing read abstraction is unsuitable for tenant isolation: reads have no viewer, and loop tests reconstruct handler orchestration rather than execute it.

**Evidence**: [AccountsSut:697](/home/user/ai4good/tests/at/suites/req-001/_contract.ts:697) exposes `account(id)`, `organization(id)`, and `membership(...)` without a session. Their [live implementations:644](/home/user/ai4good/tests/at/suites/req-001/_live.ts:644) use operator SQL. These reads cannot demonstrate caller-specific denial.

The [loop update implementation:1055](/home/user/ai4good/tests/at/suites/req-001/_fixture.ts:1055) independently resolves a fixture caller, selects membership, invokes the shared predicate, and mutates a Map. It does not execute the deployed handler. [functionPost:101](/home/user/ai4good/tests/at/harness/live-stack.ts:101) retains parsed JSON and status, losing the raw response. [CI:185](/home/user/ai4good/.github/workflows/ci.yml:185) runs the loop tier, where SQL policies are never exercised.

**Impact**: A correct predicate can pass while its handler supplies another tenant’s membership, reads in an existence-dependent order, or exposes a different error response. Operator read-backs can confirm storage while bypassing precisely the restriction under test.

The deliverable should add explicitly caller-scoped reads, keep privileged inspection visibly separate, and preserve observable response details for foreign-versus-missing comparisons. Loop coverage should exercise shipped request orchestration with substituted I/O where practical; integration must exercise real caller credentials, grants, and policies with successful own-tenant controls. Loop green alone cannot guard this change.

### 5. [concern] Cross-requirement isolation ownership lacks a durable behavioral handoff
**Components**: Authentication acceptance suite, downstream resource suites, decomposition, proposed catalog checks.

**Finding**: Authentication owns isolation for resources that other requirements have not built, while those requirements explicitly exclude isolation from their own acceptance coverage. Completing the authentication IDs against current stand-ins would leave the eventual resource behavior without a guaranteed test owner.

**Evidence**: [AT-001.21–.40](/home/user/ai4good/.taskmaster/docs/acceptance/at-req-001.md:47) name drafts, ledger, files, threads, dashboards, and tasks. Those resources are absent from the current migrations and routes. [AT-REQ-003’s boundary note](/home/user/ai4good/.taskmaster/docs/acceptance/at-req-003.md:5) assigns cross-NGO isolation to authentication, and explicitly retires its draft-isolation test into AT-001.21.

The detached attempt’s [catalog check:224](/home/user/ai4good/.claude/worktrees/ref-66/tests/at/suites/req-001/_catalog-conformance.ts:224) checks grants, RLS, and policy expressions. It cannot establish that a file-signing endpoint or task proxy authorizes the correct project; nor does mentioning a tenant column prove a policy uses it correctly.

**Impact**: The five IDs could remain green while later resources never receive their required behavioral coverage. A database catalog check also cannot cover storage links, external task reads, or UI aggregation.

The deliverable should establish an explicit handoff requiring each arriving resource to join the isolation matrix: rightful NGO, assigned volunteer where applicable, platform admin, foreign NGO, unassigned volunteer, and absent ID. Catalog checks are useful additional safeguards, not substitutes for these resource-level assertions.

### 6. [concern] The assignment column does not guarantee the identity it grants access to
**Components**: `projects.assigned_volunteer_id`, account types, assignment writers, volunteer read policies.

**Finding**: The model represents one assignee, but not necessarily one volunteer. That was an intentional deferral when the column only proved seat cardinality; it becomes consequential once assignment grants access.

**Evidence**: [projects migration:61](/home/user/ai4good/supabase/migrations/20260811130000_single_seat_org_and_single_developer_projects.sql:61) references any `accounts` row. Its [trigger:80](/home/user/ai4good/supabase/migrations/20260811130000_single_seat_org_and_single_developer_projects.sql:80) checks replacement of an occupied seat, not account type. By comparison, [membership enforcement:52](/home/user/ai4good/supabase/migrations/20260811125000_org_membership_ngo_only_and_organization_rename.sql:52) rejects non-NGO grantees at the database boundary.

**Impact**: An authorization rule that trusts the column’s name can grant project access to an unrelated NGO account placed in that seat. Rules that also check account type avoid that grant but must compensate repeatedly for the model’s weaker invariant.

Tenant isolation should require both assignment and volunteer identity immediately. It should also push the assignment boundary toward enforcing that invariant, rather than leaving every future file, thread, and task reader to rediscover it.