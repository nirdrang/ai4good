You are reviewing the architecture of a codebase subsystem. An explanation of how it works has already been written. Read it to orient yourself, then read the actual code to form your own judgment.

## Architectural Explanation

Read the explanation in full from the file loop/items/AI4DEV-55/artifacts/how/explanation.md (repository root /home/user/ai4good). It was synthesized from four explorer reports in the same folder (e1-data-model-findings.md, e2-request-path-findings.md, e3-harness-findings.md, e4-reference-branch-findings.md); read those too when the explanation leaves you a question.

The deliverable this critique serves: the tenant-isolation leaf of the authentication requirement. It must grant reads to an organisation's own account, the assigned volunteer and the platform admin; deny cross-organisation and unassigned-volunteer reads with no existence oracle; render public surfaces only to a logged-out visitor; and turn acceptance ids AT-001.21, .22, .23, .24 and .40 green at both harness tiers. Critique the EXISTING architecture as the constraint this deliverable must fit or push back on: the database access-control model, the edge-function request path, the front-end routing, and the harness. Say where the existing shape would make the deliverable bolt-on rather than integrated, and where the deliverable should push back on the existing shape.

## Relevant Files

.taskmaster/docs/acceptance/at-req-001.md
.taskmaster/docs/acceptance/at-req-003.md
.taskmaster/docs/architecture-notes.md
.taskmaster/docs/migration-nextjs-to-tanstack-VERIFIED.md
.taskmaster/docs/prd-mvp.md
.taskmaster/docs/requirements/req-001.md
loop/decomp/req-001.md
loop/items/AI4DEV-57/proof-local.ts
loop/items/AI4DEV-62/artifacts/verify-first-answers.md
loop/items/AI4DEV-66/plan.md
src/hooks/use-mobile.tsx
src/lib/api/example.functions.ts
src/lib/config.server.ts
src/lib/error-capture.ts
src/lib/error-page.ts
src/lib/lovable-error-reporting.ts
src/lib/utils.ts
src/routeTree.gen.ts
src/router.tsx
src/routes/README.md
src/routes/__root.tsx
src/routes/index.tsx
src/server.ts
src/start.ts
supabase/config.toml
supabase/functions/_shared/
supabase/functions/_shared/accounts.ts
supabase/functions/_shared/acknowledgment-copy.ts
supabase/functions/_shared/caller.ts
supabase/functions/_shared/edge.ts
supabase/functions/_shared/github.ts
supabase/functions/_shared/memberships.ts
supabase/functions/_shared/verification.ts
supabase/functions/_shared/visibility.ts
supabase/functions/complete-signup/index.ts
supabase/functions/create-organization/index.ts
supabase/functions/update-organization/index.ts
supabase/migrations/20260808120000_accounts_org_membership_and_acknowledgments.sql
supabase/migrations/20260809090000_volunteer_github_link_and_imported_profile.sql
supabase/migrations/20260811120000_acknowledgment_signer_identity.sql
supabase/migrations/20260811125000_org_membership_ngo_only_and_organization_rename.sql
supabase/migrations/20260811130000_single_seat_org_and_single_developer_projects.sql
supabase/migrations/README.md
supabase/seed.sql
tests/at/README.md
tests/at/expected/README.md
tests/at/expected/req-001.json
tests/at/harness/live-stack.ts
tests/at/harness/registry.ts
tests/at/harness/runner.ts
tests/at/harness/shipped-caller.selftest.ts
tests/at/suites/req-001/
tests/at/suites/req-001/_bind.ts
tests/at/suites/req-001/_contract.ts
tests/at/suites/req-001/_live.ts
tests/at/suites/req-001/_pending.ts
tests/at/suites/req-001/c-membership-and-acknowledgment.test.ts
tests/at/suites/req-001/d-tenant-isolation.test.ts

Paths under .claude/worktrees/ref-66/ are a detached checkout of a prior attempt at this same deliverable (pull request 57 on GitHub). Read it for ideas only; it is far behind main and merges nothing. supabase/functions/_shared/visibility.ts exists only in that checkout.

## Critique Rubric

# Architectural Critique Rubric

Review through whichever of these lenses are relevant. Not every lens applies to every subsystem.

## Abstraction Fit

Are the abstractions pulling their weight?

- Does each abstraction represent a real concept, or is it an indirection layer "in case we need it"?
- Are the boundaries in the right place? Do they separate things that change independently?
- Is there accidental coupling where components share implementation details they shouldn't need to know about?
- Is business logic entangled with framework wiring, or cleanly separated?

Over-abstraction is as much a problem as under-abstraction. A flat, simple design is fine when the domain is simple.

## Data Model

Do the data structures fit the actual usage patterns?

- Are the data models designed for how data is actually accessed, or for how it was conceptually modeled?
- Are there impedance mismatches, places where code constantly reshapes data because the model doesn't match the access pattern?
- Are types honest? Do they represent what data actually looks like at runtime, or claim more structure than exists?

## Boundary Discipline

Are system boundaries clean and well-placed?

- Is validation concentrated at entry points, or scattered through internal code?
- Are errors handled at boundaries and propagated cleanly, or caught and re-thrown at every layer?
- Does data cross boundaries in well-typed shapes, or as bags of optional fields?
- Could this subsystem be tested in isolation, or does it require the entire system to be running?

## Evolution Readiness

How well will this architecture handle likely changes?

- If the most probable next requirement landed tomorrow, how much would change? "One file" or "everything"?
- Are there hardcoded assumptions that would need to be relaxed?
- Is the design bolted-on (integrated as an afterthought) or integrated (looks like it was always part of the plan)?
- Are legacy paths preserved for compatibility that no one depends on?

Don't penalize for not handling hypothetical changes. Focus on changes plausible given the codebase's trajectory.

## Complexity vs. Value

Is the complexity budget spent wisely?

- Is complexity concentrated in the parts that need it (core logic, tricky invariants) or in accidental places (boilerplate, unnecessary indirection, configuration)?
- Are there simpler ways to achieve the same behavior?
- Does every component earn its existence, or are there vestigial pieces from an earlier design?

## Consistency

Does this subsystem follow the patterns established elsewhere in the codebase?

- Are similar problems solved the same way here as elsewhere, or does this area invent its own patterns?
- If the patterns differ, is there a good reason, or did it just evolve independently?
- Inconsistency isn't automatically bad. But unexplained inconsistency is a maintenance burden.


## Instructions

Read the files listed above. Use the explanation as a map, but form your own opinions from the code itself. The explanation might miss things or frame them charitably.

Find architectural problems, not line-level bugs or style issues. Ask whether this subsystem is built well for what it needs to do and how it will need to evolve.

For each finding:

1. **Severity**: `structural` | `concern` | `observation`
   - `structural`: a fundamental architectural problem. Wrong abstraction boundary, broken data model, coupling that will block future work
   - `concern`: a real issue that makes the system harder to work with or reason about, but not fundamentally broken
   - `observation`: worth noting. A tradeoff that might not age well, a pattern inconsistent with the rest of the codebase, technical debt
2. **Finding**: the architectural issue. Be specific. Name the components, the boundary, the coupling.
3. **Evidence**: concrete code that demonstrates the problem. Don't just assert that "this is too coupled". Show the dependency chain.
4. **Impact**: what the issue costs. Harder to test? Harder to change? Performance cliff at scale? Be concrete about the consequence.

## What to Avoid

- Line-level code review (not your job here)
- Suggesting rewrites without demonstrating a problem with the current approach
- "This could use more abstraction" without showing what the abstraction would actually solve
- Flagging intentional tradeoffs with clear benefits as issues

If the architecture is sound, say so. An empty critique is a valid outcome.

## Output

```
## Findings

### 1. [Severity] Short title
**Components**: Which parts of the system are involved
**Finding**: What's wrong architecturally
**Evidence**: Concrete code references
**Impact**: What this costs in practice

### 2. [Severity] Short title
...
```


## Where to write

Work read-only in the repository at /home/user/ai4good. Do not write any file; your sandbox forbids it. Your FINAL ANSWER IS THE REPORT: return the complete findings in the output format above as your last message, in full, not a summary. Begin the answer with the line `## Findings`.
