# The design of record

This is the design the build follows. It is the base named below, changed by every graft and every
correction in this document. Where this document and the base disagree, this document wins.

## The base

`candidate-1b-vetting-aggregate.md`, the vetting-aggregate direction.

The blinded cross-judge scored it 20 of 30, against 17 for the allowance-ledger candidate, 17 for
the extend-existing candidate, and 12 for the thin-SQL candidate. The lead agrees with the pick and
with the reason. The base is the only candidate whose central safety claim survives inspection: it
makes a complete vetting record a schema fact through not-null columns and a check that couples the
evidence type to its document metadata. The other three enforce the same rule with procedural guards
that hold only while every caller goes through one door, and one of them ships a check that does not
constrain what it appears to constrain, because a JSON null in a required key makes the whole
expression evaluate to SQL NULL and pass.

The judge is from the same family as the base's author. The four designs were judged blind, as
`design-A` to `design-D` with their titles removed, and the verdict argues from quoted source rather
than from preference. The lead read all four and reached the same base independently on the vet
record, while disagreeing with the base on the allowance, which is where the grafts go.

## The grafts

Each is a specific part of a losing candidate, ported into the base by hand.

### G1. The spend ledger replaces the base's usage table

From the allowance-ledger candidate, changed by the founder's ruling below.

The base keeps one usage row per organisation. Replace it with a row keyed by organisation and UTC
day. Store two numbers and nothing else:

```sql
create table public.discovery_spend (
  org_id       uuid    not null references public.organizations (id) on delete cascade,
  utc_day      date    not null,
  spent        integer not null default 0,
  granted      integer not null,
  primary key (org_id, utc_day),
  constraint discovery_spend_non_negative check (spent >= 0),
  constraint discovery_spend_granted_positive check (granted > 0),
  constraint discovery_spend_within_grant check (spent <= granted)
);
```

`granted` is the high-water mark: the largest daily grant this organisation has held on this UTC day.
`remaining` is never stored. It is `granted - spent`.

Why the key and not a mutable day column: the primary key is the once-per-UTC-day guarantee. With a
day column, the same rule becomes "a stale day counts as zero", which the read path and the write
path must each remember to apply. The judge scored every candidate 2 of 5 on the reset for a
different reason, addressed in C3 below, but the key still removes one class of mistake for free.

### G2. The high-water mark, by founder ruling

The founder ruled on 2026-09-09 that an unvetted organisation keeps the credits it already holds
until the next UTC day. Publishing closes at once; the credits do not.

This is what `granted` is for. Every read and every write of the day's row applies:

```
granted := greatest(granted, dailyGrantFor(currentTier))
remaining := granted - spent
```

A vet raises the mark from 10 to 30 and the remaining credits become `30 - spent`, which is
AT-002.07. An unvet cannot lower the mark, so the credits survive the day, which is the ruling. A
re-vet computes `greatest(30, 30)` and changes nothing, so no credits are minted, which is AT-002.08.
The thin-SQL candidate needed a stored `raised_on_day` boolean for the same three rules. The mark
makes all three arithmetic, and there is no flag for a later code path to forget.

The first row of a new UTC day is inserted with `granted = dailyGrantFor(tier)` and `spent = 0`.

### G3. The notification notice, split

From the allowance-ledger candidate, section 3.4, minus its defect.

The base hard-codes the channels and the copy in SQL. Instead, TypeScript computes the notice from
the shipped taxonomy row and `renderCopy`, and passes it to the definer, which resolves the recipient
inside the transaction. This keeps one statement of the channel default and one of the wording, and
it avoids the alternative the extend-existing candidate chose, which was to widen `write_standing`
with the seat holder's email address on every write route in the tree.

Do not port that candidate's unchecked `channels` argument. It allows a caller to pass an empty array
and commit a vet with no deliveries. The definer derives the channels from the class default and
refuses an empty delivery set.

### G4. Named copy for the two outcomes

From the allowance-ledger candidate. The base emits the general template, which reads "Vetting
outcome notification. unvetted". Add one `NAMED` entry in `notification-copy.ts` giving a vet and an
unvet their own sentence. Neither sentence contains the word "verified".

The judge settled a disagreement here: two candidates claimed named copy forces a change to the
closed taxonomy oracle. It does not. `NAMED` rendering is separate from taxonomy registration, and no
suite reads `NAMED`.

### G5. The grant-drift scan

From the allowance-ledger candidate, sections 1.6 and 5.5. The base compares the live SQL grant
against the pinned number, but CI runs the loop tier only, so that comparison never runs in CI. Add a
source scan that reads the pinned registry values, the TypeScript constants, and the migration text
of the grant function, and returns every disagreement. It runs at both tiers.

### G6. Reach the profile through the existing route

From the extend-existing candidate. The base adds a second creation route beside
`create-organization`, but signup has already created the organisation before any acceptance Given in
this requirement begins. One route reaches both first completion and later edits.

Keep `update-organization` as it is: one field, one write, with two acceptance ids grading through
it. Add the profile route beside it rather than changing it. Do not rename
`decideOrganizationRename`; the auth fixture imports it by name.

### G7. The compatibility inventory

From the thin-SQL candidate. It names the tenant-read selftest and the isolation mocks that a new
column on the organisation projection breaks. The allowance-ledger candidate names the auth suite's
exhaustive `Record<WriteRouteName, ...>` maps, which refuse to compile when a write route is added.
Both lists are real and both are in scope for the units that land those changes.

## The corrections

These are defects the judge found in the base, or in every candidate. They are not optional.

### C1. Take the clock after the lock

The base is right and the lead was wrong. An earlier reply said `now()` was safer because it is fixed
across a transaction. That is the defect, not the safety: a transaction that begins before midnight
can acquire its row lock after midnight, and `now()` would then charge the spend to the previous day.
Capture `(clock_timestamp() at time zone 'utc')::date` **after** the organisation row is locked, and
use that one value for the rest of the call. Three of the four candidates get this wrong, and no
backdated-row test can catch it.

### C2. Fix the base's acceptance overclaiming

The judge's sharpest finding, and it applies to all four candidates: each converts a complete
behavioural criterion into a narrower assertion and leaves the id green. The red set below is the
correction.

### C3. Say plainly what the reset test proves

Every candidate scored 2 of 5 on the integration reset, because none observes a real midnight. The
harness gives a live adapter stack configuration and `RealClock.now()`, and no controllable clock.

The lead's judgment, which the build states in the manifest prose and in the pull request rather than
hiding: backdating the day row produces exactly the bytes the database holds one second after
midnight, and the product has no midnight event to observe. A new day is a new key with no row. So
the test exercises the real mechanism, not a stand-in for it. What it does not prove is the crossing
itself, and no test in this tree can.

Two things make the assertion mean more than "a full balance was read", which is the weak form the
judge names. The body debits between the two reads, so an implementation that resets on every read
fails it. And the integration body compares the UTC day the product reports against the test
process's own clock, which catches a day key computed in a session time zone on any machine not set
to UTC.

### C4. Test the late failure

No candidate exercises a rollback after the tier and the audit row are written and the emit then
fails. Field omissions all fail before any write, which proves nothing about the transaction. Add one
body that induces a failure at the emit and asserts that the tier, the audit row, the event and its
deliveries are all absent afterwards.

### C5. The evidence rule states its limit

Rejecting attachments and storing only metadata cannot prove a document was deleted from the
founder's mailbox. The base says this most accurately of the four. The build keeps that sentence in
the code comment and in the pull request. It does not claim deletion it cannot observe.

## The red set

Eight ids, up from the five the lead set before the judge ran. Every addition applies the founder's
ruling of 2026-09-09, which was to build and prove what the tree supports and to declare red, by id
and with a stated shape, only what needs a surface that does not exist.

| id | tier | waits on | why the tree cannot prove it today |
|---|---|---|---|
| AT-002.05 | integration only | a Discovery surface | the block is real and the sentence exists, but no deployed surface shows the three remedies to anybody |
| AT-002.10 | both | the project-fuel checkout | there is no paid-continuation path to follow |
| AT-002.12 | both | the publish flow and the checkout | publishing closing and funding staying untouched both need a consumer that does not exist |
| AT-002.19 | both | the publish flow | no publish route exists to be blocked |
| AT-002.20 | both | the publish flow and triage | neither the publish route nor the triage queue exists |
| AT-002.23 | both | the public listing screens | the sweep covers surfaces that do not exist yet; the brief asked for this one explicitly and every candidate ignored it |
| AT-002.26 | both | the checkout and funded-turn billing | the remedy cannot be shown to restore anything |
| AT-002.31 | both | the project-fuel checkout | there is no funding path whose permissibility can be observed |

Nineteen green at the integration tier and twenty at the loop tier. Every red is
`capability-pending` with the capability named. Each still has exactly one `atTest` call site with a
throwing body, because the bijection check counts call sites and never reads the manifest.

What still lands and is proven: the vetting action and its complete audit record, the authorization
around it, the manual-only shape, the evidence rule, the emitter integration for both outcomes, the
profile create and edit with its refusal matrix, the tier grants, the vet arithmetic, the UTC reset,
and the two gates that vetting must never close.

## What the build does not do

- No new harness machinery. No sentinel, fault, vendor stand-in, fixture world or capability.
- No `WRITE_ROUTES` row for publishing or for funding. A row is a claim that a route exists, and the
  static scan then demands the auth suite drive it. The publish decision ships as a pure module with
  no inventory row, and its ids stay red.
- No fourth `viewer_` helper. The auth suite's live check pins that set at three.
- No change to the notification taxonomy. `vetting.outcome` covers both outcomes, told apart by the
  payload.
- Nothing under `src/`. The wiring leaf is not in this run.
