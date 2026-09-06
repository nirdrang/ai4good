# The lead's rulings on the four architecture critiques

Critics: fable at medium (`critic-fable.md`, 11 findings), GPT-6 Astra at medium (`critic-astra.md`, 8), opus at xhigh (`critic-opus.md`, 12), grok 4.6 at xhigh (`critic-grok.md`, see the last section). Rulings are act on, consider, noted, or dismissed. An act-on ruling is a constraint on the design arena.

## Act on

**R1. The boundary is one rule stated twice, and the registry is one typed inventory.** (fable 1, 9, 11; opus 3, 4; astra 4.) The universal choke point for every running service is the SECURITY DEFINER layer, because `service_role` holds no write privilege on any table. CI runs the loop tier only, which grades imported TypeScript. So the lifecycle rule lives in both places, the way every rule in this tree already does: a pure decision in `supabase/functions/_shared/` that the edge routes and the fixture import, and a SQL helper called first in every write definer. One exported inventory constant names every write route with the account types it admits; the AT-001.29 body iterates that constant and the static scan checks the tree against it. The scan derives candidates from the tree in two ways and fails any candidate absent from the inventory or not gated: every `supabase/functions/*/index.ts` that imports `callDatabaseFunction` must be in the inventory and must call the gate before the RPC; every definer granted EXECUTE to `service_role` that is not `stable` must call the SQL helper. Exemptions are explicit rows with a reason (`complete_signup`: the account row does not exist yet). A negative-direction selftest proves each refusal. A shared caller-account loader in `edge.ts` returns type, lifecycle state and the target-organisation role once, replacing the two hand-rolled lookups; the gate consumes it. The design states in one sentence what the scan proves (registration, and a call site before the RPC) and what only integration proves (the definer refuses).

**R2. The all-types clause of AT-001.29 and AT-001.30 gets an honest per-tier shape.** (fable 2; opus 2.) The platform administrator's only write is unit 1's transfer route, so it is the admin arm. No deployed write admits a completed volunteer. At the loop tier the volunteer arm runs over the `sendDiscoveryMessage` stand-in through the shared gate, so the shipped decision is graded. At the integration tier the body drives the NGO and admin arms for real and then throws `CapabilityPending` naming the volunteer write capability, the AT-001.24 shape. The inventory is typed by account type so a body cannot skip a type silently.

**R3. One delete policy for the whole subtree.** (fable 3; opus 5; astra 3.) The audit table has no cascading foreign key: actor and subject columns are plain `uuid` plus denormalised labels, in the spirit of `acknowledgments.signer_name`. Append-only is three things and the design says all three: no client role and not `service_role` holds UPDATE, DELETE or TRUNCATE on it; no definer updates or deletes it; a BEFORE UPDATE OR DELETE trigger on the audit table raises. The operator can drop that trigger, and that residual is stated, not hidden. No raise-on-delete trigger guards `acknowledgments` or `org_memberships`; the existing cascade from `auth.users` stays and goes in "Not done here". Unit 5's trigger on `auth.identities` refuses a DIRECT delete only (`pg_trigger_depth() = 0`), so the vendor's admin user delete, which cascades, still works; the prototype measures that discriminator before the migration.

**R4. The static scan grows before any new table lands.** (fable 6; opus 6; astra 7.) The baseline revoke must name `service_role` as well as `anon` and `authenticated`, and `WRITE_PRIVS` gains `references` and `trigger`, each with a selftest case. Unit 4 becomes that check plus the measurement record, in place of a migration.

**R5. The transferee is a completed NGO account.** (fable 4; opus 8.) The transfer route takes an existing `ngo` account that completed signup through the product, so its acknowledgment and signer identity exist. The transfer is an UPDATE of the one `org_memberships` seat, the shape `repointMembershipAsOperator` already proves live. The transferee's own organisation from signup stays and is an accepted residual. No second account-minting path.

**R6. The transfer refuses when the old account holds any other seat.** (astra 1; opus 9.) Lifecycle is account-level and the transfer's subject is one organisation. The route deactivates the old account only when the named seat is its only seat; otherwise it refuses with its own kind naming the other organisations. The blast radius is stated, never silent.

**R7. The gate reads the account row under a share lock.** (astra 2.) The SQL helper reads `lifecycle` with `for share`, so a gated write in flight blocks behind a concurrent deactivation and re-reads the committed state. Deactivation updates the same row. That is the whole concurrency contract; nothing else is serialised.

**R8. One deactivation authority, the product column.** (fable 5; opus 12.) `public.accounts` gains the lifecycle state, v1 values `active` and `deactivated` only. No Auth ban, no token claim: a ban leaves a live token working (measured) and a claim is a cached copy of the row, which is the wrong shape for "immediately". Ending a deactivated account's live sessions is out of scope by this decision and goes in "Not done here".

**R9. The audit row's actor is nullable and the operator is a sentinel.** (fable 10.) Role changes reach the audit table from an AFTER INSERT OR UPDATE trigger on `org_memberships`, which sees no actor on an operator path; the transfer definer writes its own row with actor, reason and the two accounts. `actor_account_id` is nullable, `actor_label` is not, and the trigger writes `operator` when no actor is set in the session. AT-001.33's body accepts a trigger-written row with no actor.

**R10. Refusal kinds travel on the wire and the unlink oracle is the row.** (astra 5.) The new routes carry `kind` beside `reason`, as `update-organization` does: `not-a-platform-admin`, `account-deactivated`, `holds-other-seats`, `transferee-not-ngo`, and so on. The unlink test asserts that the identity row survives and that `/auth/v1/user` still answers 200 for that user; it never pins GoTrue's 500.

**R11. AT-001.34 is declared red with a named capability at both tiers.** (fable 8; opus 10.) The sign-in limit is Auth's endpoint, the local limiter does not throttle (measured), a product counter would be SQL the loop tier cannot grade and a control the criterion did not ask for. The capability is the vendor's sign-in rate limit; unit 6's record names where it is verified instead (the hosted platform). The founder can overturn this.

**R12. The audit and escalation tables are `unreachable-by-client-roles`.** (opus 7.) No policy, no viewer helper. The tests read them back as the operator at integration and from fixture storage at loop. A later admin screen adds a definer read, the `read_public_project` shape.

**R13. The lifecycle boundary lands in unit 1's commit group.** (opus 11.) Unit 1 already needs the lifecycle column ("the old account is deactivated"), so the column, the SQL helper, the pure gate, the inventory and the transfer route registered through it all land with unit 1. Unit 2 adds the conformance scan and its selftest, AUP deactivation, re-enable, and the three ids. No unit reopens an earlier unit's route.

**R14. Every new table is declared in the three catalog lists in one change** (opus 7): `TENANT_CATALOG`, and the two lists in `_integration.ts`. Noted as a cost; not restructured in this run.

## Consider

- **Deployed write orchestration has no type-checker** (astra 8). A `deno check` over `supabase/functions` in CI would close it. Not this run; "Not done here".
- **The integration runner pins the database and the token lifetime but not the Auth hook or rate-limit config** (astra 6). With R11 no hook ships, so nothing to pin. Noted for the leaf that ships a hook.

## Noted

- The hand-written catalog lists (opus 7) and the per-fact round trips (opus 12) are real costs and stay.
- The scan is a text oracle over untyped files (fable 1, opus 4). R1 says what it proves.

## Dismissed

- None. Every finding traced to code.



**R15. The escalation contact is written by a platform-admin operation, in its own table, one row per organisation.** (grok 9; the explanation's gotcha on three different people.) It is never a required field on create-organization or on the acknowledgment signer. Concierge onboarding is the administrator acting on an organisation, so an admin-only operation on the same admin surface as the transfer captures it; the vetting act itself stays the NGO profile requirement's. AT-001.28 is green at both tiers with that narrowing stated in the body, and no capability-pending.

## Grok (critic-grok.md, 10 findings)

Grok's ten findings map onto R1 (its 1, 6, 10: caller lifecycle in the shared pair, never a row trigger; operator SQL stays outside the oracle), R2 (its 2), R11 and R3 (its 3: sign-in and unlink live on Auth; the identity trigger is the only placement and was measured), R5 (its 4), R3 and R8 (its 5: update the seat, keep A's rows), R4 (its 7), R9 and R3 (its 8: one audit table, transfer rows from the definer, a raising BEFORE UPDATE OR DELETE trigger), and R15 (its 9). Nothing dismissed. Its sharpest sentence stands as a constraint: a lifecycle trigger of the AT-001.37 shape would block the transfer's seat update and the re-enable write, so the gate is about the CALLER, read in TypeScript and re-read in the definer, and no row trigger expresses it.