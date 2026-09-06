# Interrogate verdict

### Intent
> This branch lands the platform administrator's operations for the user-authentication requirement and the write boundary they need: the audited contact transfer (recovery is the same operation), the escalation contact, one lifecycle gate every write route registers through with a conformance scan in CI, an append-only audit for role changes and transfers, and the permanence of a volunteer's GitHub identity. The structural claim is that a write route is a value handed to `writeRoute()` and there is no other way to reach the database; the lifecycle rule is stated once in TypeScript and once in SQL.

### Reviewers
- Reviewer A: GPT-6 Astra at medium, 6 findings (2 critical, 4 warning), receipt complete.
- Reviewer B: fable at medium, 14 findings (7 warning, 7 nit).
- Reviewer C: grok 4.6 at xhigh, 7 findings (7 warning), receipt complete and provider-verified.
- Reviewer D: opus at xhigh, 13 findings (1 critical, 9 warning, 3 nit).

### Act on

1. **The transfer is one-shot per account** (fable 1, grok 1, opus 1 critical). R5 makes every transferee hold its own seat; R6 then refuses every later transfer out of it. Ruling R16 supersedes R6: the transfer moves the named seat and deactivates the outgoing account only when it holds no other seat afterwards; otherwise the account stays active and the transfer's audit row records the remaining seats. `holds-other-seats` leaves the wire. AT-001.25 gains a second-transfer arm (the seat moves on from the transferee to a third NGO, which keeps its own seat and stays active).
2. **Two races in the transfer definer** (astra 1 and 2 critical, grok 2). Lock the outgoing and the transferee account rows `for update` in id order before any check, then the seat row; read the transferee's lifecycle and the outgoing account's other seats under those locks. A concurrent `create_organization` for the outgoing account then waits on `assert_account_active`'s share lock.
3. **Product membership inserts are attributed to the operator, and the label is hard-coded** (astra 5, fable 4, grok 3; all four). `complete_signup` and `create_organization` set `app.actor_account_id` before their membership insert; `append_audit_event` derives the label from the actor's account type (`<account_type>:<id>`), `operator` only when the actor is null. Fixture mirrors follow.
4. **AT-001.33 proves neither the UPDATE half of the trigger nor the append-only guard at loop** (fable 2, grok 5, opus 2). The body snapshots the role-change rows, then requires the exact new rows: `seat repointed` with the administrator as actor after the transfer, `seat repointed` with the operator after the re-point. The loop arm gains a static oracle over the migration text: `audit_events` has the row trigger, the statement trigger, and no write grant to any role.
5. **The SQL scan forgets grants on `create or replace`** (fable 3, astra 4). Carry the previous entry's execute roles forward on a replace, clear on drop; selftest a replace without the gate and without a grant line.
6. **The write-route scan looks in one file for three spellings** (fable 5, astra 3, opus 6). Read every `.ts` under each function directory and under `_shared`; refuse `/rest/v1/`, `createClient`, `.rpc(`, and the service-role secret names outside `edge.ts`'s own `callDatabaseFunction` and `publicProjectReads`; widen the export check to every export form; selftest a direct table write, a helper module beside `index.ts`, and a `_shared` bypass.
7. **`attemptWrite` re-implements every write, and `WriteSubject` is a nine-field bag** (fable 7, astra 6, grok 7, opus 9). `attemptWrite` delegates to the named members in both adapters; `WriteSubject` becomes a discriminated union keyed by route, so a call names only the fields its route reads. `sendDiscoveryMessage` and `createOrganization` return the `WriteRefusal` shape with `kind`.
8. **Unreachable `standing.kind !== 'account'` branches** (fable 9, opus 7). `writePipeline` narrows: an `account-required` spec's `decide` receives `AccountWriteRouteInput` whose standing is the `account` variant; `complete-signup` keeps the wide input. The three 502 branches and the ternary in `decideOrganizationRename` go.
9. **AT-001.29 never drives `complete-signup`, and its controls are order-coupled** (fable 13, grok 4, opus 8). The sweep iterates every row; a deactivated NGO calling `complete-signup` is refused `account-deactivated`; each route's active control has its own subject, so the transfer control cannot poison a later row.
10. **The two restated writers raise without a kind in DETAIL** (grok 6). `create_organization` and `update_organization` carry `not-an-ngo-account`, `not-a-member`, `not-an-admin`, `no-account`, `no-such-organisation`, `invalid-name` in DETAIL.
11. **A PostgREST failure that is not a raised exception is answered as `409 refused`** (fable 6). `writeRoute` answers 409 only when the PostgREST body carries a five-character SQLSTATE `code`; every other 4xx and every 5xx is 502.
12. **`set_escalation_contact` overwrites the last-resort contact with no audit row** (opus 5). Add `org_escalation_contact_recorded` to `audit_event_kind` and one `append_audit_event` call carrying the previous contact in `detail`. AT-001.28 reads the row back.
13. **The virtual-key clause at loop is discharged by a tautology over a module nothing calls** (opus 3). AT-001.30 and .31 are declared `capability-pending` at the loop tier too, with the two `gateway.*` strings, after the real arms run; `gateway-keys.ts` and its selftest are deleted. The founder's stub answer brings the table and its own code. Overturnable.
14. **Nits accepted**: `fromAccountId` shape-checked in `writeRoute` like the other ids (fable 12); the refusal body spreads `fields` first (opus 13a), or drops `fields` if nothing uses it after R16; `RpcOutcome` stops being exported (opus 13b); the escalation email requires a character on each side of one `@` and a dot in the domain (opus 12); the role-change trigger binds `delete` too and writes `membership removed` (fable 11); the identity static arm resolves the trigger function and requires its body to name `github`, `volunteer` and a `raise` (fable 10); `edge.ts`'s stale counts and the `_fixture.ts` "four modules" header are rewritten to sentences that need no count (fable 8, opus 11); AT-001.28's NGO refusal asserts status as well as kind (opus 4).

### Consider
- The backstop's kind on the wire erases the distinction between the TypeScript gate and the SQL backstop (opus 4). Kept, per R10 and the judge; status still distinguishes them (403 from the gate, 409 from the backstop), and every body that asserts a kind asserts the status too after item 14.
- Splitting `_live.ts` into `_live-admin.ts` (opus 9). Not this run; noted in "Not done here".

### Noted
- The volunteer's refused unlink reaches the caller as an opaque 500 (opus 10): a sentence in the migration header and a line in "Not done here" (a UI must not offer unlink to a completed volunteer).
- The identity trigger is measured on the local CLI only; hosted ownership of `auth.identities` is unmeasured (fable 14): "Not done here".
- `write_standing`'s scalar subqueries depend on the one-seat-per-organisation index (opus, not flagged): one sentence in the function's header.

### Dismissed
- None. Every finding traced to code.

### Agreement map
Three of four reviewers found the one-shot transfer independently, and the fourth found the two races inside the same function; the transfer definer is where the design's two rulings (R5, R6) met and nobody had tested the second step. All four flagged the operator misattribution on product membership inserts. Three flagged the scan's spelling-based boundary. Four flagged the duplicated `attemptWrite`. Two flagged the scan forgetting grants on replace, two the unreachable branches, three the skipped `complete-signup` arm. The lone findings (grok's DETAIL gap on the restated writers, fable's PostgREST 409, opus's escalation audit row and virtual-key tautology) each name a concrete path and are accepted.
