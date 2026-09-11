# Adversarial review — `main...426f2c1` (AI4DEV-102, the vetting action and its audit record)

Reviewed against the stated intent, the design of record (`loop/items/AI4DEV-102/design/SYNTHESIS.md`),
and the project's standing rules. Read: all three migrations in full, all five new/changed
`supabase/functions/_shared/` modules, the three route entry points, the whole `tests/at/suites/req-002/`
suite, the expected manifest, and the req-001 compatibility changes.

Totals: **1 critical, 13 warnings, 4 nits.**

---

## Findings

### 1. [critical] The zero-credit refusal fires when the allowance is full, and names a remedy the caller already has

**Location**: `supabase/migrations/20260916120000_discovery_allowance.sql:167-173`;
`supabase/functions/_shared/discovery-allowance.ts:49-54`;
`tests/at/suites/req-002/b-allowance.test.ts:364-371`

**Finding**: One raise serves two different conditions and gets both wrong.

```sql
if v_spent + p_credits > v_granted then
  raise exception
    'discovery_allowance refuses: organisation % has no Discovery credits left today — get vetted (daily grant becomes %), fund project fuel to continue now, or wait for the next UTC day',
    p_organization_id,
    public.discovery_daily_grant(true)
    using errcode = 'P0001', detail = 'daily-allowance-exhausted';
```

**(a) A single oversize debit on an untouched allowance is reported as exhaustion.** Trace: a fresh
organisation, no row for today. `apply_discovery_grant_mark` inserts `(spent 0, granted 10)`.
The select-for-update reads `v_spent = 0, v_granted = 10`. A debit of 11 gives `0 + 11 > 10` → the
caller is told it "has no Discovery credits left today" and gets `kind: 'daily-allowance-exhausted'`.
It has ten. It asked for eleven.

This is not hypothetical: `b-allowance.test.ts:364-370` performs exactly that call and asserts the
`daily-allowance-exhausted` kind, at both tiers (AT-002.04 is green in both halves of
`tests/at/expected/req-002.json`). The fixture agrees with the same wrong answer
(`_fixture.ts:824-831`), so the defect is pinned in two implementations and one acceptance id.

**(b) An already-vetted organisation at zero is told to get vetted.** The first remedy is hard-wired
to `discovery_daily_grant(true)` with no reference to the caller's own tier. A vetted organisation
that spends all thirty credits reads "get vetted (daily grant becomes 30)". Two of the three
mandated remedies then apply and the first one is noise. `dailyAllowanceExhaustedReason` in
TypeScript has the same shape — it takes only `organizationId`, so it could not vary by tier even
if a caller wanted it to.

**Evidence**: The intent says the block at zero names "three remedies". AT-002.05's criterion names
them for *an unverified-tier NGO at 0 remaining*. The implementation emits that sentence, with that
refusal kind, for a caller that is neither at zero nor unverified. `WRITE_REFUSAL_KINDS` is a
branchable API contract (`write-routes.ts:74-95`), so a Discovery client that shows "you are out of
credits until tomorrow" on `daily-allowance-exhausted` will show it to a caller holding ten of ten.

**Suggestion**: Split the two conditions and make the tier a parameter.
- `v_spent >= v_granted` → `daily-allowance-exhausted`, with the remedy list conditioned on
  `v_vetted` (drop the get-vetted clause when the organisation is already vetted).
- `v_spent + p_credits > v_granted` but `v_spent < v_granted` → a distinct kind
  (`insufficient-credits` or the existing `invalid-credit-amount`) saying how many remain.
- Give `dailyAllowanceExhaustedReason(organizationId, tier)` the same two arms, and extend
  `scanExhaustedSentence` to compare both arms rather than one.

---

### 2. [warning] The vetting email tells the NGO it may publish; no publish route exists in this tree

**Location**: `supabase/functions/_shared/notification-copy.ts:71-79`

**Finding**: The vetted body reads *"A platform administrator vetted your organisation. Your daily
Discovery allowance is now the vetted grant, **and you may publish**."* The branch declares
AT-002.19 and AT-002.20 red precisely because no publish route exists, and `publishingAllowed`'s own
doc comment says so in capitals: `NO PUBLISH ROUTE CONSULTS IT YET` (`org-vetting.ts:53`).

**Evidence**: This is not a test artefact. `emit_notification` writes a real `email` delivery row
with this body for every successful vet (`20260916120000_discovery_allowance.sql:467-499`), and the
class default for `vetting.outcome` is `['email','inapp']`. The design reviewed this copy for one
word ("verified", G4) and did not check whether the sentence is true. The unvetted body carries the
mirror claim, *"Publishing is closed"*, which implies a thing that was open.

**Suggestion**: Say what the tree can do: "Your daily Discovery allowance is now the vetted grant."
Add the publishing sentence in the unit that lands the publish flow, where it becomes true.

---

### 3. [warning] Correction G3 was not implemented: the definer trusts the caller's channel list

**Location**: `supabase/migrations/20260916120000_discovery_allowance.sql:452-456, 467-478`;
`SYNTHESIS.md` G3

**Finding**: The design says, in terms: *"Do not port that candidate's unchecked `channels`
argument... The definer derives the channels from the class default and refuses an empty delivery
set."* The definer does not derive anything. It reads `p_notice->'channels'` and checks only that
the value is a non-empty array, then builds one delivery per element.

**Evidence**: `tests/at/suites/req-002/c-vetting-action.test.ts:405-409` proves the hole by exploiting
it — it passes `channels: ['not-a-channel']` and the only thing that stops the commit is the
`::public.notification_channel` cast inside `emit_notification`. Substitute `['inapp']` and the vet
commits with no email delivery at all, which is the exact defect G3 named. The empty-array case is
refused; every other wrong non-empty list is not.

The blast radius is small today — the function is granted to `service_role` only and the one edge
route computes channels from `channelsFor(taxonomyRow('vetting.outcome'))` — but the design
identified this as the thing not to ship and it shipped.

**Suggestion**: Drop `channels` from `p_notice` and resolve them in SQL from
`notification_event_types` / the class default, keeping only `copy` as the TypeScript-computed
half. If the class default must stay in TypeScript, at minimum intersect the supplied list against
the known enum and refuse anything outside it *before* any write.

---

### 4. [warning] The late-failure test asserts four of the five writes the transaction makes

**Location**: `tests/at/suites/req-002/c-vetting-action.test.ts:470-482`;
`supabase/migrations/20260916120000_discovery_allowance.sql:413-417`

**Finding**: `assertAbsentAfterLateFailure` checks the aggregate row, the audit row, the
notification event and the deliveries. It does not check `discovery_spend`. The grant mark is the
write the second migration *added*, it happens between the aggregate write and the audit append,
and it is the one the rollback assertion does not cover.

**Evidence**: Correction C4 says the body must assert "the tier, the audit row, the event and its
deliveries are all absent afterwards" — the list predates the grant mark and was never extended.
A partial commit would leave a `discovery_spend` row with `granted = 10` for an organisation that
has no vetting record at all, and the test would pass. The fixture models the rollback with a
hand-rolled `undo()` closure that *does* restore the spend row (`_fixture.ts:444-452`), so the
fixture is more complete than the assertion that reads it.

That `undo()` is itself the weak point: it is a convention, not a structure. Any future write added
to `commitVetting` that is not also added to `undo()` silently weakens AT-002.30's loop arm with no
signal.

**Suggestion**: One line — `expect(await sut.spendRows(organizationId), 'the late failure left a
spend row').toEqual([])`. Consider having the fixture snapshot and restore whole maps rather than
enumerating the three things it currently remembers.

---

### 5. [warning] The email-verification floor on Discovery debits is enforced and never tested

**Location**: `supabase/migrations/20260916120000_discovery_allowance.sql:148-152`;
`tests/at/suites/req-002/_fixture.ts:810-817`; `tests/at/suites/req-002/e-gates.test.ts:194-234`

**Finding**: The debit arm refuses an unconfirmed caller with `detail = 'email-unverified'`, and
`email-unverified` was added to `WRITE_REFUSAL_KINDS` for it. No acceptance body ever drives a
debit from an email-unverified session.

**Evidence**: `emailVerified: false` appears exactly once in the suite
(`e-gates.test.ts:199`), and that session is passed only to `sut.discoveryMessageAllowed(...)` —
the pure, pre-existing `verification.ts` decision, which has nothing to do with the new route.
AT-002.22 is titled "blocked from any Discovery message at every tier" and proves only that a pure
function returns the right answer for a flag the test itself supplied. The new enforcement point is
unexercised at both tiers, and so is the SQL/fixture agreement on it.

The intent says "email verification is the floor under every Discovery message". That floor is a
branch nothing stands on.

**Suggestion**: Add to AT-002.22, after the two pure consultations:

```ts
const debit = await sut.debitAllowance(unverified.session, unverified.organizationId, 1);
expect(debit.ok).toBe(false);
if (!debit.ok) expect(debit.kind).toBe('email-unverified');
expect(await sut.spendRows(unverified.organizationId)).toEqual([]);
```

---

### 6. [warning] Two hundred and ninety-six lines of security-definer body duplicated across two migrations

**Location**: `supabase/migrations/20260914120000_org_vetting.sql:82-377` and
`supabase/migrations/20260916120000_discovery_allowance.sql:199-508`

**Finding**: The second migration restates `set_organization_vetting` in full to insert one
fourteen-line block. A line-by-line comparison of the two bodies differs in sixteen lines: the
`create` vs `create or replace` head, one declaration, three comment lines, and the
`apply_discovery_grant_mark` call. Everything else — the authorization checks, the field
validation, the evidence rule, the audit append, the notice validation, the delivery loop — exists
twice in the tree, and the first copy is dead from the moment the second migration runs.

**Evidence**: The tree now holds two authorization checks, two evidence rules and two audit
projections under one name, and a maintainer editing one has no signal that the other is the live
one. `_source-scan.ts` handles this correctly for `discovery_daily_grant`
(`lastGrantFunctionSql` takes the last definition, line 654-669) — an explicit acknowledgment that
redefinition is a hazard — but nothing pins the definer itself to its last definition, and
`scanOrgVettingWriters` skips *both* copies without reading either
(`_source-scan.ts:193-196`).

Restating a body is unavoidable in `CREATE OR REPLACE FUNCTION`. Splitting the work into two
migrations that both define it is not.

**Suggestion**: Move `discovery_spend`, `discovery_daily_grant` and `apply_discovery_grant_mark`
into a migration that runs *before* `20260914120000`, and define `set_organization_vetting` once,
with the grant mark already in it. If the ordering cannot move, add a scan arm that fails when
`set_organization_vetting` is defined more than once, so the duplication is at least announced.

---

### 7. [warning] The vetting definer validates its notice after it has written the aggregate, the grant mark and the audit row

**Location**: `supabase/migrations/20260916120000_discovery_allowance.sql:405-463`

**Finding**: `p_notice` is checked for being an object, for a non-empty `channels` array and for
`copy.subject` / `copy.body` at lines 447-463 — after the upsert (line 403), after
`apply_discovery_grant_mark` (line 413) and after `append_audit_event` (line 419).

**Evidence**: The transaction rolls back, so no state is corrupted, but boundary discipline says
validate where data enters and then trust it. Nothing in the design or the suite needs the late
placement: correction C4's test induces its failure inside `emit_notification` via the enum cast,
not via the notice check, so moving all three notice checks to the top of the function (beside the
`p_action` and `p_note` checks, lines 256-265) would not weaken a single assertion. As written, the
function does three writes before deciding whether it was given a well-formed request, and the
refusal message "refuses a vetting action with no notification notice" describes a request that is
already half-executed.

**Suggestion**: Move the three `p_notice` checks up beside the `p_action` and `p_note` validation.

---

### 8. [warning] A pure allowance read takes an exclusive row lock on the organisation

**Location**: `supabase/migrations/20260916120000_discovery_allowance.sql:81-85`

**Finding**: `perform 1 from public.organizations where id = p_organization_id for update;` runs
before the action branch, so `action: 'read'` — which writes nothing and is documented as writing
nothing (`discovery-allowance/index.ts:2-6`, `_contract.ts:336`) — acquires `FOR UPDATE` on the
organisation row.

**Evidence**: Every Discovery turn is a read plus a debit, so each turn takes that exclusive lock
twice. While a read is in flight, a concurrent vet (`set_organization_vetting`, same
`FOR UPDATE` at line 267), a concurrent debit, and any `update public.organizations` from
`set_organization_profile` or `update_organization` all block behind it. The existence check that
the lock is bundled with needs no lock at all, and the read's arithmetic is correct on any
consistent snapshot: `v_vetted` and the spend row are read afterwards without locks anyway.

**Suggestion**: Branch on `p_action` before the lock: a plain `perform 1 from public.organizations
where id = ...` for the read, `for update` for the debit. Or split the existence check from the
lock and take `for update` only inside the debit arm.

---

### 9. [warning] The allowance rule itself is stated in SQL and in the test fixture, and nowhere in a shipped module

**Location**: `supabase/functions/_shared/discovery-allowance.ts` (whole file);
`tests/at/suites/req-002/_fixture.ts:819-837`

**Finding**: `decideDiscoveryAllowance` validates request shape and the org-admin role. It does not
decide whether a debit may proceed. The shipped module exports the arithmetic pieces
(`dailyGrantFor`, `highWaterGrant`, `remainingCredits`, `allowanceOf`) but never the judgement, so
the loop tier's answer to "may this debit proceed, and in what order are the email floor and the
credit check applied" comes from twenty lines written inside the test adapter.

**Evidence**: This contradicts the principle the neighbouring module states in its own comment:

> It lives here, and not in either test adapter, **because a rule an adapter states is a rule the
> suite grades against itself** — `org-vetting.ts:49-52`

`publishingAllowed` and `discoveryMessageAllowed` follow that principle; the allowance does not.
The consequence is visible in finding 1: the fixture and the SQL independently reproduce the same
wrong refusal, and the suite cannot notice because the suite's oracle *is* the fixture at loop tier.
`dailyAllowanceExhaustedReason` makes the shape plainer still — it is product code with **no
product caller**, kept alive only by the fixture and by `exhaustedSentenceProblems`.

**Suggestion**: Ship the decision beside its siblings:

```ts
export type SpendRefusal = 'daily-allowance-exhausted' | 'insufficient-credits';
export function spendAllowed(
  input: { granted: number; spent: number; credits: number; tier: DiscoveryTier },
): Decision<'within-allowance'> | { ok: false; kind: SpendRefusal; reason: string };
```

Have both the fixture and `dailyAllowanceExhaustedReason` call it, and keep the SQL as the backstop
that `exhaustedSentenceProblems` pins — the posture every other definer in this tree already has.

---

### 10. [warning] `_source-scan.ts` is a 1,246-line bespoke source analyzer, and three of its arms grade no acceptance id

**Location**: `tests/at/suites/req-002/_source-scan.ts` (1,246 non-blank lines, the largest file in
the tree); `tests/at/harness/req002-oracles.selftest.ts` (942 lines)

**Finding**: Roughly 2,200 new lines of test tooling, containing a hand-written SQL `CREATE TABLE`
column extractor (`createTableColumns`, `columnNamesFromTableBody`, `pushTableMemberName`, lines
1171-1225), an `ALTER TABLE ... ADD COLUMN` parser (1226-1238), a JSX text extractor (536-546), an
identifier tokenizer (907-913), and naming heuristics for "is this a wallet" (944-964) and "is this
a publish surface" (1129-1166).

Three of its arms — `discoveryWalletProblems`, `absentPublishFlowProblems`, `trustWordingProblems`
— are called from **no acceptance body at all**. Their only caller is
`req002-oracles.selftest.ts:73-74, 71`. `f-public-claims.test.ts:8-9` says so outright:
*"That arm has no acceptance id."*

**Evidence**: The ids these arms would serve (AT-002.10, AT-002.19, AT-002.20, AT-002.23) are all
declared red, and the design's own rule — *"Each still has exactly one `atTest` call site with a
throwing body"* — makes it impossible to attach the evidence to the id. So the evidence was
attached to a selftest instead, where it contributes nothing to any verdict the manifest reports.

The heuristics are also unfalsifiable in the direction that matters. `isDiscoveryWalletName`
requires the token `discovery` *and* one of `wallet|sku|buy|purchase|topup|balance`; a real
Discovery credit store named `credit_pack` or `extra_turns` passes. The module's own comment admits
it: *"A disguised `credit-desk.tsx` escapes it, as does a `balance` column added to
`discovery_spend`"*. What remains is a scanner that can only fail on code nobody would write, and
that will fire false positives the day an unrelated feature names a column `wallet_id`.

Against the project rule that *"the harness takes no new machinery"* and the design's own *"No new
harness machinery"*, this is the largest single piece of new machinery in the change.

**Suggestion**: Keep the arms that pin a live product fact and are consumed by a green id —
`grantPinProblems`, `exhaustedSentenceProblems`, `vettingRouteProblems`, `orgVettingWriterProblems`,
`scheduledVettingProblems`, `documentContentSinks`. Delete `scanDiscoveryWallet`,
`scanAbsentPublishFlow` and `scanTrustWording` and let the red ids carry the absence, as the other
seven reds do, or land them with the unit that lands the surface they describe. That is roughly 700
lines out of `_source-scan.ts` and 500 out of the selftest.

---

### 11. [warning] AT-002.24 is live in the acceptance document and appears nowhere in this branch

**Location**: `.taskmaster/docs/acceptance/at-req-002.md:53`; `tests/at/expected/req-002.json`;
`tests/at/suites/req-002/_pending.ts:4-9`

**Finding**: The requirement document holds 32 ids. Four are marked retired (`.03`, `.09`, `.15`,
`.25`). That leaves 28 live. The manifest declares 27 — twenty green and seven red at loop, nineteen
and eight at integration. AT-002.24 (P1, *"no verification badge appears on project cards"*) has no
`atTest` call site, no manifest entry, and no mention in `SYNTHESIS.md`.

**Evidence**: Nothing mechanical catches it. `tests/at/harness/check.ts:49-53` parses only ids
marked `(P0)`, and its "EXTRA" arm (line 153) would *fail the run* if AT-002.24 were registered,
because a P1 is "not a P0 of this requirement". So the bijection check cannot cover it in either
direction. `_pending.ts:4` says *"all twenty-seven ids of `.taskmaster/docs/acceptance/at-req-002.md`
need executable call sites"* — the count is wrong and it is the only place a reader would look.

AT-002.24 needs exactly the surface AT-002.23 is declared red on. The design's red table claims to
declare, *"by id and with a stated shape, only what needs a surface that does not exist"*. This one
needs that surface and is declared nothing.

**Suggestion**: Either add AT-002.24 to the red set with `capabilities: ["ui.public-listing-screens"]`
and teach `check.ts` to accept declared P1 ids, or state in `SYNTHESIS.md` that P1 ids are out of
scope for this branch and correct the "twenty-seven" in `_pending.ts` to the real count of live ids.

---

### 12. [warning] An unvet leaves the previous vet's actor, instant and note in the aggregate, and the audit row then carries two unlabelled notes

**Location**: `supabase/migrations/20260916120000_discovery_allowance.sql:305-308, 419-445`

**Finding**: The unvet path is `update public.org_vetting set vetted = false`. It does not touch
`vetted_by_account_id`, `vetted_at` or `note`. The audit row built from `v_current` therefore
reports `detail.current.note` = the *vet's* note, while `reason` (the audit row's own column) =
the *unvet's* note.

**Evidence**: Two different administrators with two different notes produce one audit row in which
`reason` says why the organisation was unvetted and `detail.current.note` says why it was vetted,
with nothing in the shape to tell a reader which is which. The contract type says
`detail.current: VettingRecord` and `VettingRecord.note: string`
(`_contract.ts:155-170, 189-202`), with no hint that the field means different things depending on
`detail.action`. No test reads `note`, `vettedAt` or `vettedByAccountId` on an unvet audit row —
AT-002.11 asserts them only on the vet (`c-vetting-action.test.ts:111-126`) — so the ambiguity is
latent.

Retaining the evidence fields is deliberate and right (`_contract.ts:152-154`). `note` is not
evidence; it is "why this action was taken", and it is now stale on exactly the rows where a reader
most wants it.

**Suggestion**: Either name the columns for what they hold (`last_vet_note`, or move `note` out of
the aggregate entirely and read it from the audit trail), or have the unvet write its own note and
rely on the audit history for the vet's. Whichever, assert it: add
`expect(audits[1].detail.current.note)` to AT-002.11's unvet counterpart.

---

### 13. [warning] The UTC-reset bodies are time-of-day dependent at the integration tier

**Location**: `tests/at/suites/req-002/b-allowance.test.ts:132-140, 191-193, 214, 299-302, 311-316,
449, 462, 519`

**Finding**: `proveUtcReset` and `proveRolloverRemedy` capture `today` from the first allowance read
and then assert, several round trips later, that the product still reports that day. They also
compare it against `utcDayOf(Date.now())` evaluated once when the test starts (lines 449, 462).

**Evidence**: At the integration tier there is no controllable clock — the design says so in C3 —
so `today` is the real UTC day. A run that crosses midnight UTC between
`first.allowance.utcDay` (line 189) and `rolled.allowance.utcDay` (line 132) fails on a correct
product. The same goes for AT-002.07's `expect(nextDay.allowance.utcDay).toBe(todayRow.utcDay)` at
line 519. These bodies do many live edge-function round trips each, across six parameterized
iterations, so the window is not negligible.

C3 is candid about what the reset test proves and does not prove. It does not mention that the test
is unrunnable for a few minutes a day.

**Suggestion**: Take the UTC day once at the top, re-read it at the end, and skip (or restart) when
the two differ — `if (utcDayOf(Date.now()) !== today) return;` with a named reason — so a
boundary-crossing run is inconclusive rather than red.

**Secondary**: `assertResetFromStartingRemaining:147-149` asserts `yesterdayRow.spent === spent` and
`yesterdayRow.granted === grant` — values the body itself wrote through
`writeSpendRowAsOperator` two lines earlier (line 127). That assertion reads back the test's own
write and cannot fail for any product reason.

---

### 14. [warning] `set_organization_profile` has no partial edit, and `name` now has two doors with two validators

**Location**: `supabase/migrations/20260915120000_organization_profile.sql:44-101`;
`supabase/functions/_shared/memberships.ts:151-184`;
`supabase/functions/set-organization-profile/index.ts:4-7`

**Finding**: All five fields are mandatory on every call. Changing only the website means the client
must resend name, mission, country and logo. Meanwhile `update-organization` survives as a
second route that writes `name` through a different definer.

**Evidence**: The design (G6) justifies keeping `update-organization`: two acceptance ids grade
through it. Granted. But the result is that `organizations.name` is written by two definers with
two independently maintained validation paths (`validateOrganizationName` in TypeScript for both,
then `update_organization`'s own SQL check versus `set_organization_profile`'s
`btrim(...) = ''` check at line 50-53), and the other four fields have one door with no partial
edit. A client that reads the row, edits one field and writes all five is doing a last-write-wins
read-modify-write over four columns it did not intend to touch. The single seat keeps that from
being a lost-update race today, but the shape only holds while an organisation has exactly one
admin.

The intent says the profile "can be created and edited". What ships is create-or-replace.

**Suggestion**: Either accept `null`/absent for a field and leave that column alone (`coalesce`
in the `update`), which makes "edit the website" one call, or state in the module comment that the
write is whole-profile replacement so a client author learns it from the code rather than from a
400.

---

### 15. [warning] The profile route ships its result renderer in the one file no type-checker covers

**Location**: `supabase/functions/set-organization-profile/index.ts:17-34`

**Finding**: The two sibling routes import a named renderer from a typechecked shared module
(`renderOrganizationVetting`, `renderDiscoveryAllowance`). This one inlines a renderer built on a
raw `as` cast of `unknown` to a six-optional-field object literal.

**Evidence**: `edge.ts:11-15` states of itself that **no type-checker covers edge entry points** —
"`bun run typecheck` runs over the root project ... and the `tests/at` project ... Neither reaches
an edge-function entry point." `memberships.ts:39-46` makes the same point about why narrowing
belongs in the shared module and not at the edge. So the one piece of parsing logic that is written
as an unchecked cast is also the one piece placed where nothing checks it, and the suite drives
`setProfile` through the shared decide path without ever exercising this renderer at loop tier.

**Suggestion**: `export function renderOrganizationProfile(value: unknown)` in
`memberships.ts` beside `decideOrganizationProfile`, with an `isRecord` narrowing rather than a
cast, and import it — matching the two routes landed alongside it.

---

### 16. [warning] The loop fixture decides the profile write twice, by different paths, depending on test setup

**Location**: `tests/at/suites/req-002/_fixture.ts:596-643`

**Finding**: `setProfile` checks whether a `roleOverrides` entry exists for this caller. If it does,
it builds its own `WriteStanding` and runs `writePipeline` itself; if the decision passes, it then
*also* delegates to `inner.sut.accounts.attemptWrite`, which runs the same pipeline again with the
req-001 fixture's own standing. If no override exists, only the second path runs.

**Evidence**: The two runs disagree about `org_role`: the first uses the override, the second uses
the inner fixture's membership row. Today an override to `member` refuses at the first gate so the
disagreement is invisible, but the code path a test exercises now depends on whether the test
happened to call `setMembershipRoleAsOperator`. This is exactly the "weird if statement in a random
place" the quality lens names: a special case wedged into a shared flow because the inner adapter
does not model role overrides.

**Suggestion**: Push the override into the inner fixture's membership state, so there is one
standing and one pipeline run, and delete the branch.

---

### 17. [warning] The deactivated-account sweep cannot fail for the allowance route

**Location**: `tests/at/suites/req-001/_integration.ts:395-396, 414-415`

**Finding**: The sweep drives `discovery-allowance` with `action: 'read'` and snapshots
`{ organization: await sut.organization(subject.organizationId) }`.

**Evidence**: Two independent reasons that row is vacuous. A `read` writes nothing even when
permitted, so there is no state a deactivated caller could have changed. And `organizations` is
never touched by `discovery_allowance` in either action, so the snapshot compares a value that is
invariant under the route. If a deactivated caller's debit did write a `discovery_spend` row, this
sweep would pass.

The refusal assertion the sweep also makes is real; this is about the "nothing changed" half.

**Suggestion**: Use `action: 'debit'` with one credit and snapshot the spend row, or drop the
snapshot for this route and say in a comment that the refusal is the whole assertion.

---

### 18. [nit] `Number(null)` turns a broken render into a plausible zero

**Location**: `tests/at/suites/req-002/_live.ts:141-150`;
`supabase/functions/_shared/discovery-allowance.ts:114-126`

`renderDiscoveryAllowance` answers `null` for any field that is not a number, and
`allowanceFromJson` runs every one through `Number(...)`. `Number(null)` is `0`, not `NaN`. So
`expect(atBlock.allowance.remaining).toBe(0)` (`b-allowance.test.ts:297`) passes if the route
returned `remaining: null`. Assert the field is a number before coercing, or let the render throw.

---

### 19. [nit] `isRecord` and `integerField` are duplicated, and one copy lost its type predicate

**Location**: `supabase/functions/_shared/org-vetting.ts:156-167` and
`supabase/functions/_shared/discovery-allowance.ts:97-104`

Same two helpers, written twice in modules landed in the same change. `org-vetting.ts`'s
`isRecord` is `value is Record<string, unknown>`; `discovery-allowance.ts`'s returns plain
`boolean`, which then forces the cast at line 115. Pick the predicate version and put it wherever
`stringField` already lives (`write-routes.ts`), which both files import anyway.

---

### 20. [nit] `renderDiscoveryAllowance` rebuilds the `Allowance` shape by hand instead of using `allowanceOf`

**Location**: `supabase/functions/_shared/discovery-allowance.ts:73-88, 114-126`

`allowanceOf` exists three functions above and produces exactly these six keys, but the renderer
duplicates them and returns `Record<string, unknown>` rather than `Allowance | null`. A field added
to `Allowance` will not reach the wire. Have the renderer parse into the typed shape and call
`allowanceOf`, or fold it into `allowanceOf` with an `unknown` overload.

---

### 21. [nit] `fundingAllowed` has no caller anywhere, and its contract seat is a permanent thrower

**Location**: `supabase/functions/_shared/org-vetting.ts:63-77`; `_contract.ts:361`;
`_fixture.ts:852`; `_live.ts:637`

The function ignores its only parameter and returns a constant. No product path calls it. Both
adapters bind the SUT member to `notLanded('fundingAllowed')`, so no acceptance body can call it
either; the sole consumer is `tests/at/harness/shipped-org-vetting.selftest.ts:42-43`, which asserts
that a constant is constant. The comment explains why the parameter exists, and the explanation is
longer than the rule. Against CLAUDE.md §2 ("nothing speculative", "no abstractions for single-use
code"), the sentence *"vetting never gates funding"* in the module header does all the work the
function does; the function, the contract seat and the two throwers can go and come back with the
checkout.

---

## What I checked and did not flag

- **Concurrency.** `set_organization_vetting` and `discovery_allowance` both take the organisation
  row `FOR UPDATE` first and in the same order, so same-organisation vets and debits serialize with
  no deadlock. The `spent <= granted` check plus the re-read under lock is correct under
  READ COMMITTED.
- **The high-water mark.** I traced vet mid-day, unvet mid-day, re-vet same day, unvet on a day with
  no row, and unvet of a never-vetted organisation. All match the founder's ruling and the design.
  Correction C1 (clock after the lock) is implemented correctly in both functions.
- **The single-seat lookup.** `select account_id into v_holder ... where org_id = ...` with no
  `LIMIT` is deterministic because of `org_memberships_one_seat_per_org_idx`
  (`20260811130000_single_seat_org_and_single_developer_projects.sql:41`). Not a defect, though the
  definer depends on that index without naming it.
- **The enum split migration.** `alter type ... add value` in its own file before the definer that
  uses it is correct.
- **Row-level security.** `org_vetting` and `discovery_spend` are revoked from all client roles with
  RLS on and no policies; the four new `organizations` columns inherit the existing tenant-isolated
  posture. `_policy-scan.ts`'s `TENANT_CATALOG` was updated for both new tables.
- **The evidence rule.** The check constraint at `20260914120000_org_vetting.sql:58-74` is correctly
  two-sided and is not the JSON-null defect the design attributes to another candidate. It is
  restated in plpgsql (lines 342-355), in TypeScript (`org-vetting.ts:340-368`) and in the fixture
  (`_fixture.ts:166-173`); the duplication is defensible as message quality plus a loop-tier mirror,
  and the integration tier drives the real constraint through
  `attemptVettingRowAsOperator`.
- **Unknown-key rejection.** `VET_BODY_KEYS` / `UNVET_BODY_KEYS` correctly refuse `documentContent`,
  `attachment`, `storageKey` and friends, including `__proto__`, which `JSON.parse` makes an own
  property.
