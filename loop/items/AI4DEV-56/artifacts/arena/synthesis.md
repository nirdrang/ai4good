# Synthesis note: the lead's scoring, before the cross-judge

Scored by the lead (fable) on ubric.md, criterion by criterion, after reading all four packages end to end. The judge's verdict (judge-verdict.md, grok 4.6 at xhigh, blinded A to D per judge-blinding-map.txt) is compared below once it lands.

| Criterion | opus | fable | grok | astra |
|---|---|---|---|---|
| 1. One boundary, mechanically enforced | 3 | 3 | 2 | 2 |
| 2. History preserved, attribution intact | 3 | 3 | 3 | 3 |
| 3. Append-only in the schema | 3 | 2 | 2 | 3 |
| 4. Every id has a body and an honest tier shape | 3 | 3 | 3 | 2 |
| 5. Smallest surface, deepest modules | 3 | 3 | 2 | 1 |
| 6. Fits the tree's posture | 3 | 3 | 3 | 3 |
| Total | 18 | 17 | 15 | 14 |

## Evidence per score that is not a 3

- **grok, criterion 1 (2).** The boundary is two calls added to each entry file, and the scan proves that the file text names `writeGateDecision` and `callDatabaseFunction` somewhere. Order is not proven and a route can still reach the RPC on its own. The admin surface is one function with a `switch` on a jsonb payload passed to SQL, so the per-route `admits` typing the rubric asks for collapses to one row.
- **astra, criterion 1 (2).** The gate is a convention (call `gateWrite` before the RPC) proven by a TypeScript syntax-tree scan and a SQL tokenizer. Rigorous, but the boundary itself is not structural; the scan is the boundary.
- **fable, criterion 3 (2).** No statement-level TRUNCATE trigger; a row trigger never sees TRUNCATE. It does add an `audit-mutation-in-definer` scan code that nobody else has.
- **grok, criterion 3 (2).** No TRUNCATE trigger; the append-only trigger uses errcode `25006` (read-only transaction), which misdescribes the refusal.
- **astra, criterion 4 (2).** It declares AT-001.28 red at integration under a reading that the task's DECLARE assumption overrides R15. The assumption covers the virtual-key clauses only; R15 rules AT-001.28 green with the narrowing stated. It also mints a SQL twin for every stand-in rule, two functions with no caller.
- **grok, criterion 5 (2).** `applyAdminCommand` in TypeScript is a second statement of `apply_admin_act`, the whole projection twice. The jsonb payload crosses the SQL boundary untyped.
- **astra, criterion 5 (1).** A generated inventory file, an emitter, a CI text comparison, a TypeScript AST scan and a SQL tokenizer with fail-closed syntax rules, plus ten SUT members and a request-id receipt table. The largest machinery for the same property the others get from a constructor.

## Base

**opus** (candidate-opus.md). The structural claim is one line: `callDatabaseFunction` stops being exported, so a route has no way to reach the database except through `writeRoute()`. Registration is then enforced three times (type: `name` is a key of `WRITE_ROUTES`; run time: construction throws on an unknown name; CI: the scan reads the tree in both directions and refuses a re-export). The inventory carries the exemption reason in the type. `attemptWrite` as a `Record<WriteRouteName, ...>` in both adapters makes AT-001.29 total by compilation. fable is the same shape one notch less enforced (`callDatabaseFunction` stays exported; the scan refuses its import), and it is the tie-break loser on criterion 3.

## Grafts

- **From astra: the trigger-depth discriminator goes in a `WHEN` clause, and the semantics are stated correctly.** Inside a trigger function `pg_trigger_depth()` is already 1 for a direct delete, so `= 0` inside the body (fable, grok) never fires. opus's body uses `> 1` for a cascade, which is right; the `WHEN (pg_trigger_depth() = 0)` form is clearer and keeps the function body one rule. The prototype measures it either way (R3).
- **From astra: an index on `org_memberships (account_id, org_id)`.** R6's other-seats check and the standing loader's `seatCount` query by account; the unique index is by organisation.
- **From fable: the scan checks the literal own name.** The entry's `name:` must equal its directory, so a copied file registered under another row fails (`write-route-registered-under-other-name`).
- **From fable: `audit-mutation-in-definer`.** The SQL half of the scan refuses a definer body that updates or deletes `audit_events`; R3's second clause becomes a check instead of prose.
- **From fable: the stand-in row is scanned too.** The fixture's `sendDiscoveryMessage` must call the gate over `WRITE_ROUTES['discovery-message']` or the scan fails (`stand-in-not-gated`).
- **From grok: `reason` is required on every audit row, not only the transfer.** Every event this run writes has one; a not-null column is simpler than the conditional check constraint.

## Rejected

- **grok's one `admin-operations` function.** A `switch` in a handler and a jsonb payload to SQL, for two fewer directories. opus's alternative E says why; the inventory's per-route `admits` is the thing AT-001.29 iterates.
- **grok's audit-first `apply_admin_act` projection.** A second whole-projection twin in TypeScript, and the hot path never reads the audit table anyway, so the spine buys a reviewer's reconstruction at the cost of the rule stated twice in full.
- **astra's migration-derived generated inventory.** The inventory is one constant with seven rows; a generator, an emitter and a CI comparison for it fails the Laziness Protocol. The scan already checks the constant against the migrations in both directions.
- **astra's request-id idempotency receipt.** opus names the outgoing account, so a stale retry refuses `not-the-current-contact` and writes nothing. Same property, no new column.
- **astra's SQL twins for the stand-in rules** (`concierge_contact_refusal`, `virtual_key_refusal`). Functions with no caller.
- **fable's `lifecycle_changed_at` column.** When and why live on the audit row (opus's single source per invariant).
- **opus's own AT-001.41 loop arm kept as the static scan**, not replaced by fable/grok's pure `githubUnlinkAllowed` twin: no deployed TypeScript sits on Auth's delete path, so a shipped decision would be a rule stated twice with one copy live. The fixture's `unlinkGithubIdentity` mirrors the trigger, labelled as a mirror like every operator mirror there.

## Dropouts

None in the second attempts. Both external runners lost their first package to the launcher's final-message save (`candidate-astra-attempt1-lost.md`, `candidate-grok-attempt1-lost.md`); the reruns delivered the package as the final message.

## Judge comparison

The judge (grok 4.6 at xhigh, receipt complete and provider-verified) scored A (opus) 17, D (fable) 16, B (astra) 15, C (grok) 15, and recommended A as the base. Agreement on the base and on the order of the top two. Differences: the judge gave every candidate 2 on criterion 5 (object count) where the lead gave opus and fable 3; the judge gave fable and grok 3 on criterion 3 where the lead docked the missing TRUNCATE trigger. Neither changes the pick. Two more grafts came from the verdict and are in design.md: the definer refusal kind in RAISE ... USING DETAIL with a fail-closed parser, and the reuse of the sut.accounts.sendDiscoveryMessage capability string. The judge's third suggestion, grok's one closed command list, is declined for the reason under Rejected. The judge confirmed the trigger-depth finding on fable and grok independently.