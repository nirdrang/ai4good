# Design task: the admin-operations subtree, one design for six units

You are one of four runners in a design arena. Produce ONE design package for the whole subtree below, in the shape of `rationale-template.md` (usage first, then types, signatures, module map, migration sketch with `not implemented` bodies, and prose rationale). Your working directory is a read-only checkout of the branch. Write nothing except your one output file. Do not run git, do not start processes, do not touch the database.

Read first, in this order:

1. `loop/items/AI4DEV-56/brief.md`, the six units and the facts the board does not say.
2. `loop/items/AI4DEV-56/artifacts/how/explanation.md`, how the tree authorises writes, talks to Supabase Auth, and lands an acceptance id.
3. `loop/items/AI4DEV-56/artifacts/how/rulings.md`, the lead's rulings on the four architecture critiques (act on, consider, noted, dismissed). The act-on rulings are constraints.
4. The measurements under `loop/items/AI4DEV-56/artifacts/measure/`. Each is a fact the design must fit.
5. `loop/items/AI4DEV-56/artifacts/arena/rubric.md`, what the picker grades.
6. `.taskmaster/docs/acceptance/at-req-001.md` sections F, G and H, the ten criteria word by word.
7. The code the explanation points at, as you need it.

## The six units

Unit 1, contact transfer and lost-access recovery (AT-001.25, .26, .27, .28, .35). A platform administrator moves an organisation's ownership to a new account, the old account is deactivated, every row keeps its original attribution, an audit record captures who, when and why, and an NGO user, a volunteer or an unauthenticated caller is refused. Lost-access recovery is the same flow. One non-login escalation contact is stored for the NGO "at concierge onboarding", a surface that does not exist in this tree.

Unit 2, deactivation gates every write (AT-001.29, .30, .31). A lifecycle state on the account. Every write route registers through ONE mandatory boundary, and a conformance check that runs at the loop tier (so in CI) fails any write route that is not registered. A deactivated account of each global type is refused every enumerated write while an active control of the same type succeeds. AUP deactivation of a volunteer rejects writes immediately and revokes the project's virtual keys (a gateway surface that does not exist in this tree). A platform administrator re-enables an account and writes work again while independent gates stay enforced.

Unit 3, append-only audit and sign-in rate limit (AT-001.33, .34). Role changes and contact transfer leave an append-only record that cannot be altered or deleted. Sign-in attempts past the configured limit are throttled while legitimate use within the limit works.

Unit 4, leftover table privileges. Measured done on `main`; the unit is a proof record. Say what the record is and whether any check changes (the static scan's write-privilege list omits references and trigger).

Unit 5, volunteer GitHub unlink refused. A volunteer may not unlink the mandatory GitHub identity after signup. The refusal lives where Auth deletes the identity row or in front of it. A new acceptance id, the next free number is AT-001.41, through the doc-sync fold, with a test at both tiers.

Unit 6, local email rate limit. Measured; the unit is a record that says what the local tool honours and where the limit is verified instead.

## Measured facts the design must fit

- After a reset, no client role holds TRUNCATE, TRIGGER or REFERENCES on any public table. The default ACL still hands them to every NEW public table, so every new table revokes them (the static scan requires the revoke).
- `service_role` cannot write any public table directly; every product write passes through a SECURITY DEFINER function. The operator (`postgres` over the database URL) bypasses definers and hits only triggers.
- An admin ban in Auth does not end a live access token: the same unexpired token still answers 200 at `/auth/v1/user`; refresh and new sign-in are refused. "Writes rejected immediately" therefore needs a product-side lifecycle read on the write path.
- The local GoTrue does not throttle password grants at the file's `sign_in_sign_ups = 30`: 45 grants in 0.7 s all answered 400. The local CLI DOES push `[auth.hook.password_verification_attempt]` into the container. That hook fires on a password grant for an existing user with `{ user_id, valid }` and may answer `reject`.
- `DELETE /auth/v1/user/identities/{identity_id}` unlinks a fabricated GitHub identity (200). `postgres` can create a BEFORE DELETE trigger on `auth.identities`. A raising trigger keeps the row and Auth stays healthy for the user, but GoTrue answers 500 `unexpected_failure` "Database error deleting identity", not a shaped 4xx. A call with no token answers 401.
- `Caller` has no account type; a write learns the type by one service-role read of `public.accounts`.
- `GET /auth/v1/user` answers 403 for dead tokens; shipped code treats every non-2xx as no caller.

## The two clauses with no surface, and the working assumption

Virtual keys (AT-001.30's second clause, AT-001.31's parenthetical) belong to the LLM gateway requirement, which has no code in this tree. Concierge onboarding (AT-001.28's Given) is the NGO profile requirement's vetting step, which does not exist. The founder's ruling is pending; design for DECLARE: the clause is green at the loop tier over a stand-in seam (a shipped pure decision the future leaf must consult, the way `discoveryMessageAllowed` is), and red `capability-pending` on a named capability at the integration tier, the way AT-001.24 is declared. Name the capability strings. Say in one paragraph what changes if the founder says "stub" instead.

## What every package must contain

- Usage first: the README a caller reads, and three real call sites (the transfer route, one gated write, the unlink integration body).
- The data shapes: the lifecycle state on `accounts` (v1 has only active and deactivated, never a third state), the audit table, the escalation contact, and any registry. Organising structure per principle-model-the-domain: a state machine over scattered booleans, a table or registry over branching, a typed model over repeated shape assumptions.
- The signatures: every new pure decision in `supabase/functions/_shared/*`, every new edge function, every new SQL function and trigger, every new `AccountsSut` member (contract, fixture, live), every new static scan or selftest.
- The migration sketch: tables, grants and revokes, policies, definer functions with `revoke execute from public`, triggers, in a form the static scan `_policy-scan.ts` accepts.
- The conformance check: exactly how it enumerates write routes from the tree, what "registered" means mechanically, and the negative-direction selftest that proves it fails an unregistered route.
- Per id, per tier: the Given, the act, the assertion, and the declared shape where a clause has no surface. Include AT-001.41.
- The transfer row by row: what changes in `org_memberships`, what does not change in `acknowledgments`, `projects`, `volunteer_profiles`, and how the old account's deactivation is recorded.
- The refusal shapes on the wire (status and `kind`) for the admin-only route, the gated writes, and the unlink trigger.
- Tradeoffs accepted, alternatives considered, open questions, and the first implementation step.

## Your structural direction

The four runners each take a DIFFERENT structural direction so the candidates do not converge. Yours is named in your prompt. Commit to it fully; the arena grafts the strongest parts of the losers into the base, so a half-hearted middle helps nobody.

## Output

Write the package to the output path named in your prompt. Markdown, one file, with code blocks for types, signatures and SQL. Then reply with five lines: the output path, the word count, your direction in one sentence, the one decision you are least sure of, and the one part of your design you would graft into another candidate if yours loses.
