# Critic Prompt Template

Build each critic subagent's prompt from this template. Fill in the placeholders.

---

You are reviewing the architecture of a codebase subsystem. An explanation of how it works has already been written. Read it to orient yourself, then read the actual code to form your own judgment.

## Architectural Explanation

The explanation is in the file named below. Read it in full before anything else.

## Relevant Files

Repository root (your working directory): C:\Users\nirdr\Downloads\ai4good\.claude\worktrees\AI4DEV-86

- The explanation: loop/items/AI4DEV-86/artifacts/how/explanation.md (read it first, in full)
- The item brief and its scope: loop/items/AI4DEV-86/brief.md
- Runner and tiers: tests/at/harness/runner.ts, check.ts, expected.ts, registry.ts, index.ts, db-pool.ts, attestation.ts, live-email.ts, capabilities.ts, contracts.ts
- Machinery: tests/at/harness/oracles.ts, record-oracles.ts, sentinels.ts, faults.ts, vendors.ts, fixtures.ts, guards.ts, clock.ts, suite-adapters.ts
- Suites: tests/at/suites/req-001/_live.ts, _integration.ts, _fixture.ts; tests/at/suites/req-016/_fixture.ts; tests/at/expected/req-001.json, req-016.json
- CI: .github/workflows/ci.yml; package.json (scripts); tests/at/vitest.config.ts; tests/at/tsconfig.json
- v1 ceremony: .claude/agents/*.md; .claude/skills/work/SKILL.md; .claude/settings.json; loop/work/*.ps1; loop/drills/run-drills.ps1
- The stack: supabase/config.toml (project id, ports, jwt_expiry)

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

## The decision this critique feeds

The item parks the slot machinery, the six v1 relay agents, the v1 scripts, and the CI twin-guard; freezes the rest of the harness; and repoints the integration tier at the one local stack (project poancmeitlmxejofwzuu, api 44321, db 44322, mail 44324) with no slot code on the path. The lead must also rule, part by part, whether the frozen harness earns its place (runner and bijection, --expect manifests, the semantic judge in oracles.ts, sentinels/faults/vendors/fixtures/guards/clock, the selftests) against the alternative of plain vitest against shipped modules and the one stack. Findings that bear on those rulings, on the integration repoint (lock, identity proof, reset, attestation, the 120 s vs 3600 s JWT lifetime), and on what parking breaks are the most valuable. Keep line-level review out.

## Where to write

You are in a read-only sandbox. Return the full findings, in the output format above, as your final answer. Do not write any file.