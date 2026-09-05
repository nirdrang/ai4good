**Recommend Candidate C as the base.** All four files are present and nonempty. I judged the written packages against the binding rulings, including where an assigned direction conflicted with them.

| Candidate | Honest proofs | Structural no-oracle | Territory / AT-001.24 | Safe migration | One rule, one home | Harness / two green units | Total |
|---|---:|---:|---:|---:|---:|---:|---:|
| [A](/home/user/ai4good/loop/items/AI4DEV-55/artifacts/arena/candidate-opus.md) | 2 | 2 | 3 | 2 | 3 | 1 | **13/18** |
| [B](/home/user/ai4good/loop/items/AI4DEV-55/artifacts/arena/candidate-fable.md) | 2 | 2 | 3 | 3 | 2 | 2 | **14/18** |
| [C](/home/user/ai4good/loop/items/AI4DEV-55/artifacts/arena/candidate-astra.md) | 3 | 3 | 3 | 3 | 3 | 2 | **17/18** |
| [D](/home/user/ai4good/loop/items/AI4DEV-55/artifacts/arena/candidate-grok.md) | 2 | 0 | 1 | 0 | 0 | 1 | **4/18** |

Every deduction:

- **A — Honest proofs, 2:** “Proof map,” AT-001.22 integration, supplies operator existence and a service-role public-page success, but no rightful caller’s successful private project read in that body.
- **A — Structural no-oracle, 2:** “Read surfaces” gives `publicProjectAnswer` an unrestricted numeric status and record body, relying on “one return statement” rather than a closed refusal interface, and reads the privileged target before the organisation despite ruling 6.
- **A — Safe migration, 2:** “Migration sketch,” unit 2, explicitly omits the volunteer-type conjunct from the assignment policy, contradicting ruling 8; its project trigger cannot protect against a subsequent change to the assigned account’s type.
- **A — Harness / units, 1:** “Harness changes” calls the JSON-body public endpoint through `functionGet`, while “Unit split” calls unit 1 green despite its two declared loop reds and “Not built here” defers the required authenticated edge read path.
- **B — Honest proofs, 2:** “Proof map,” AT-001.40 integration, claims to prove “the four admin policies” through dashboards, workspaces and an organisation listing, but none of those reads exercises the acknowledgment admin policy.
- **B — Structural no-oracle, 2:** “Proof map” explicitly compares foreign/absent edge responses, but specifies only empty direct PostgREST results and successful public-page requests, leaving the required response comparisons incomplete across surfaces.
- **B — One rule, 2:** “Problem” and “Tradeoffs accepted” explicitly retain a second runtime tenant rule against ruling 1, although the shared integration matrix earns credit as a concrete drift detector.
- **B — Harness / units, 2:** “Proof map” uses existing `provisionPlatformAdmin` without reconciling its automatically confirmed admin-user creation with the task’s register, mail-confirm, then sign-in discipline.
- **C — Harness / units, 2:** “Harness changes” makes obtaining loop evidence from the existing fixture optional although main rejects successful bodies that neither open a world nor consume captured evidence, and its projected integration total is incorrectly stated as 21 green/16 red instead of 20 green/17 red.
- **D — Honest proofs, 2:** “Proof map” does not exercise the wrong-account-type assignment refusal in AT-001.23 or demonstrate administrator access to acknowledgments in AT-001.40 despite claiming the associated policy coverage.
- **D — Structural no-oracle, 0:** “Migration sketch,” `acknowledgments_select_own`, admits foreign acknowledgment rows, so direct probing distinguishes an existing foreign record from an absent one.
- **D — Territory / AT-001.24, 1:** “Route classification, without a file registry” and “Tradeoffs accepted” deliberately ship an unused `AppRoute` inventory and classifier, reproducing the unconsumed route model ruling 10 rejects despite keeping AT-001.24 red.
- **D — Safe migration, 0:** “Migration sketch” writes `(select account_id = s.account_id from public.viewer_scope() as s)`, where both sides resolve to the inner scope’s account ID rather than comparing the protected acknowledgment row.
- **D — One rule, 0:** “Core type” and “Route classification” hand-write the organisation/project/admin admission rules again in `classifyRoute`, with no derivation or cross-layer conformance mechanism connecting those decisions to the SQL policies.
- **D — Harness / units, 1:** “Unit split” promises a green first unit whose AT-001.21 acknowledgment-denial assertion would fail against the candidate’s own policy.

A’s named loop reds are honest under ruling 3; I penalized the missing completion under the two-green-units criterion, not merely for declaring a capability unavailable.

The decisive code checks support these deductions. Main’s [admin provisioning implementation](/home/user/ai4good/tests/at/suites/req-001/_live.ts:781) creates an already-confirmed user; its [body-execution guard](/home/user/ai4good/tests/at/harness/registry.ts:525) rejects successful tests without fixture or captured-evidence use; and the [current manifest](/home/user/ai4good/tests/at/expected/req-001.json) contains 16 integration greens before these four land. D’s acknowledgment defect follows PostgreSQL’s inner-query name resolution. [PostgreSQL table-expression documentation](https://www.postgresql.org/docs/17/queries-table-expressions.html)

D’s performance premise also fails inspection: its organisation and project subqueries reference outer-row `id` or `org_id`, so the stated uncorrelated InitPlan guarantee does not follow from that SQL. Its later concession of “2–3 InitPlan evaluations” also contradicts “once per statement.” No measured plan is supplied. [PostgreSQL EXPLAIN documentation](https://www.postgresql.org/docs/17/using-explain.html)

**Each candidate’s strongest distinctive idea**

- **A — “Shape / Three: the read outcome.”** Its explicit `privilege-denied`, `session-refused` and successful-empty-result distinction makes a failed probe difficult to mistake for working isolation.
- **B — “Load-bearing decisions / Zero SECURITY DEFINER helpers.”** The acyclic policy dependency graph, terminating at own-account and own-membership policies, provides a concrete way to avoid exposing policy-helper RPCs.
- **C — “Acceptance bodies derive coverage, not their own correctness.”** It derives resource coverage while retaining independent acceptance assertions, preventing a mistaken catalog amendment from changing both implementation and expected verdict into a false green.
- **D — “Core type: one snapshot of reach.”** A caller-only scope value offers one inspectable representation of membership and assignments without a shared authorization cache; the supplied SQL does not establish its claimed execution cost.

**Base recommendation**

Choose **C**, subject to correcting its harness omissions and count. A future maintainer gets a closed resource declaration, reproducible SQL, checks for stale generated artifacts and undeclared tables, and independent assertions protecting the intended access relationships. SQL remains the only runtime authority; the generated TypeScript evaluator stays outside handlers and fixture filtering. The compiler and SQL scanner are substantial maintenance costs, but they enforce the extension contract rather than asking authors to remember it. C leads by three points; the tie-breakers reinforce its position against B and D because it offers two product endpoints rather than three or four. A’s single endpoint is smaller because authenticated product reads are deferred, so it does not provide the same capability. C does carry more trace files and tooling, which counts against it under the later tie-breakers.

**Grafts into C**

- **From A:** Fold in the explicitly named viewer-failure taxonomy for harness diagnostics; it makes privilege mistakes and stale sessions immediately distinguishable from genuine filtered reads.
- **From B:** **Nothing structural.** Its main distinctive contribution—own-row policy leaves replacing helpers—does not transfer cleanly to C’s administrator access across account rows, while its response constants and differential matrix already have equivalents in C.
- **From D:** **Nothing as written.** The scope RPC and unused classifier enlarge the surface, duplicate admission decisions, and rely on an unproved performance premise.

**Architect-skill red flags**

Applying the [skill’s definitions](/root/.claude/plugins/marketplaces/open-pstack/plugins/pstack/skills/architect/references/design-red-flags.md):

- **A — “The relation between the two written rules” / “Not built here”: pass-through method.** The future proxy is described as forwarding authorization and returning rows verbatim while resolving nothing; the separately suggested session-liveness gate would add meaningful responsibility, but the package leaves these descriptions inconsistent.
- **B — “The type sketch” / “Migration sketch”: information leakage.** The same admission decisions appear in TypeScript and SQL, and `TenantReads` exposes storage-shaped fields such as `account_type`, `org_id` and `assigned_volunteer_id` across the adapter boundary.
- **C — No clear instance of the four red flags.** Its machinery is large, but generated repetition is checked derivation, and its runtime boundary performs domain adaptation and refusal serialization rather than bare forwarding.
- **D — “Core type” / “Route classification”: information leakage.** SQL policies and the classifier both know how scope fields grant access, so changing that interpretation requires coordinated edits.
- **D — “Interface depth” / “Module map”: shallow-module warning.** The shared module exposes a scope representation, parser, shapers, route vocabulary and classifier while handlers still coordinate several database reads and failure handling.

I found no clear temporal decomposition warranting a separate flag. The two delivery units are sequencing requirements, not evidence of that architectural defect.

Read-only review completed; I changed no files and ran no migrations or acceptance tests. Attribution: unattributed.