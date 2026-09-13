# Problem

REQ-003 needs one private intake aggregate covering capture, autosave, optional references, disclosure, submission and retained raw input. Existing `projects` rows represent workspace seats and are publicly readable by id; they are unsuitable for drafts. The mandatory write frame delegates each accepted write to one SQL transaction, while existing oracles prohibit storage implementation and project lifecycle additions. This candidate puts authoritative invariants in SQL and targets **13 loop greens and 10 integration greens**, with three explicit integration gaps. These are proposed expectations, not executed results. No repository files were changed.

Attribution: unattributed; this candidate does not establish a binding.

# Usage (caller’s view)

The consumer has two operations: send an intake command and read a need. Every accepted change persists immediately. Submission includes neither a caller-supplied snapshot nor a caller-supplied stage.

The following seven call sites are test sketches written before the types. `sut` is the bound requirement adapter; `must()` is a test assertion that unwraps a successful result. Each block uses an independently provisioned NGO admin and fresh need id. The adapter hides HTTP, SQL rows and session tokens.

```ts
import { expect } from 'vitest';
import { atTest } from './_bind.ts';
import { BASE_DISCLOSURE, TIER2_DISCLOSURE } from
  '../../../../supabase/functions/_shared/need-disclosure.ts';

// 1. Capture: AT-003.01, .02, .04.
const created = must(await sut.command(admin.session, {
  organizationId: admin.organizationId,
  needId,
  commandId,
  action: 'start',
  intake: {
    title: 'Grant deadline reminders',
    description: 'Our team misses deadlines recorded across spreadsheets.',
    urgency: 'this-quarter',
  },
}));
const draft = must(await sut.read(admin.session, needId));
expect(draft.intake).toEqual({
  title: 'Grant deadline reminders',
  description: 'Our team misses deadlines recorded across spreadsheets.',
  urgency: 'this-quarter',
});
expect(draft.stage).toBe('draft');
// Separate assertions replace the sole seat's role with member,
// then test member, volunteer, visitor and direct-definer refusal.
```

```ts
// 2. Description gate and autosave: AT-003.03, .05.
// This write represents the input-change handler, not an explicit Save action.
const change = {
  organizationId: admin.organizationId,
  needId,
  commandId: editCommandId,
  action: 'change',
  expectedRevision: draft.revision,
  patch: { description: '' },
} as const;

const changed = must(await sut.command(admin.session, change));
expect(await sut.command(admin.session, change)).toEqual({
  ok: true, receipt: changed,
});

const secondSession = await sut.reopenSession(admin.session);
expect(must(await sut.read(secondSession, needId)).intake.description).toBe('');

expect(must(await sut.readAllowance(secondSession, admin.organizationId))
  .remaining).toBeGreaterThan(0);
expect(await sut.command(secondSession, {
  organizationId: admin.organizationId,
  needId,
  commandId: submitCommandId,
  action: 'submit',
  expectedRevision: changed.revision,
})).toMatchObject({ ok: false, kind: 'missing-description' });
// Assert unchanged stage, audit count and allowance.
// The actor was provisioned with emailVerified: true.
```

```ts
// 3. No labels before Discovery: AT-003.17.
expect(must(await sut.read(admin.session, needId)).causeLabels).toEqual([]);
// Boundary and direct SQL probes also attempt to inject a cause label.
// Neither the intake command vocabulary nor the current schema permits it.
```

```ts
// 4. Reference association and base disclosure: AT-003.07, .09.
// Loop proves metadata association. It does not simulate stored file bytes.
const before = must(await sut.read(admin.session, needId));
expect(before.upload.disclosure).toEqual(BASE_DISCLOSURE);
expect(before.upload.transfer).toBe('unavailable');

must(await sut.command(admin.session, {
  organizationId: admin.organizationId,
  needId,
  commandId: referenceCommandId,
  action: 'reference',
  expectedRevision: before.revision,
  reference: {
    id: referenceId,
    fileName: 'sample-grants.csv',
    mediaType: 'text/csv',
    byteLength: 148,
  },
}));

expect(must(await sut.read(admin.session, needId)).references).toEqual([{
  id: referenceId,
  fileName: 'sample-grants.csv',
  mediaType: 'text/csv',
  byteLength: 148,
  availability: 'metadata-only',
}]);
// Integration bodies assert this backend contract, then await the
// missing upload or rendering capability.
```

```ts
// 5. Classification hardens the next read: AT-003.10.
const before = must(await sut.read(admin.session, needId));
await sut.classifyTier2AsOperator(needId);

const after = must(await sut.read(admin.session, needId));
expect(after.upload.disclosure).toEqual(TIER2_DISCLOSURE);
expect(after.upload.disclosure.acknowledgmentRequired).toBe(true);
expect(after.references).toEqual(before.references);
// No intervening reference command caused the change.
```

```ts
// 6. Submission: AT-003.11, .12.
// Run with an empty reference set and, separately, metadata association.
const ready = must(await sut.read(admin.session, needId));
expect(must(await sut.readAllowance(admin.session, admin.organizationId))
  .remaining).toBeGreaterThan(0);

const command = {
  organizationId: admin.organizationId,
  needId,
  commandId: submitCommandId,
  action: 'submit',
  expectedRevision: ready.revision,
} as const;

const submitted = must(await sut.command(admin.session, command));
expect(submitted.stage).toBe('discovery_in_progress');
expect(await sut.command(admin.session, command))
  .toEqual({ ok: true, receipt: submitted });
expect(must(await sut.read(admin.session, needId)).stage)
  .toBe('discovery_in_progress');
```

```ts
// 7. Raw retention: AT-003.14, .16.
const raw = must(await sut.read(admin.session, needId)).intake;
const submitted = must(await sut.command(admin.session, {
  organizationId: admin.organizationId,
  needId,
  commandId: submitCommandId,
  action: 'submit',
  expectedRevision,
}));

const original = await sut.snapshotAsOperator(needId);
expect(original?.intake).toEqual(raw);
expect(original?.submittedAt).toBe(submitted.submittedAt);

must(await sut.command(admin.session, {
  organizationId: admin.organizationId,
  needId,
  commandId: laterEditCommandId,
  action: 'change',
  expectedRevision: submitted.revision,
  patch: { description: 'Discovery clarified the reminder workflow.' },
}));

expect(await sut.snapshotAsOperator(needId)).toEqual(original);
expect(await sut.attemptSnapshotMutationAsOperator(needId))
  .toMatchObject({ ok: false });
```

# Shape

## Aggregate and ownership

**The need lives in `public.needs`, linked only to `organizations`.** There is no project row and no nullable project link yet: neither is needed by a current caller. A future workspace-creation operation can establish that relationship when its ownership and cardinality are defined. This avoids exposing drafts through `public-project` and preserves the existing seat model.

**SQL owns the local transition.** `stage` is `draft | discovery_in_progress`; submission atomically records raw intake and changes the stage. A pure SQL helper determines the description/title refusal and resulting stage. The TypeScript edge does not independently decide whether stored content is ready. This is a durable beginning of Discovery, not proof of a conversation, agent execution, billing or notification. REQ-005.5 later absorbs the transition helper and stage guard; it must retain the transaction that captures raw intake. No second lifecycle field is introduced.

**Reference association means metadata attached to a need, with no claim that bytes exist.** A reference has a client-generated UUID, filename, media type and nonnegative byte length. SQL stores these descriptors in an object keyed by reference id. The public projection explicitly returns `availability: 'metadata-only'`; the upload surface says `transfer: 'unavailable'`. This is a real association seam, not disguised storage. REQ-032 replaces the metadata-only receipt with an authoritative stored-reference relationship and removes the unavailable transfer result.

**The upload surface receives copy, not a boolean alone.** `_shared/need-disclosure.ts` ships base and hardened constants drawn from the acceptance requirement and design copy. `read-need` returns the appropriate complete disclosure. A flag alone would make every caller reproduce policy wording. The constants contain no assertions that storage, public metadata or repository publication already exists.

**Classification is a monotonic SQL fact.** `tier2_classified_at` changes once from null to a server/operator timestamp. Integration sets it through operator SQL; loop has an explicitly named operator command. A trigger rejects clearing or rewriting it. Every read derives the hardened disclosure from that fact, so no upload is needed to activate hardening. REQ-004 replaces the operator setup with its authenticated classification producer; it does not add a second disclosure-state field.

**Zero labels are an empty SQL array.** `cause_labels text[] NOT NULL DEFAULT '{}'` currently has `CHECK (cardinality(cause_labels) = 0)`. No command accepts labels. REQ-004 replaces this temporary prohibition with machine-owned label storage and preserves a draft-zero constraint. This deliberately refuses all label production until the producer exists.

**The raw snapshot lives in `audit_events`.** A dedicated `need_submitted` event holds the original title, description, urgency and reference descriptors. Existing append-only protections provide immutability. A partial unique index permits one submitted snapshot per need. Platform retrieval is operator SQL, as permitted by the grounding; this run creates no audit-export endpoint. Later working edits update `needs` and append separate change events.

**Autosave is a revision-checked patch with durable retry receipts.** Omitted fields remain unchanged; empty strings clear text; `urgency: null` clears urgency. Unknown fields and null text values are rejected. Raw text is preserved without trimming. Every command has a stable UUID; its normalized request and receipt live in the existing audit stream. Retrying a successful command returns its original receipt before checking its old revision. Reusing its id with different input is refused. A second session reads committed content through the caller-bound route.

## Public domain types

All declarations below are type aliases. SQL/RPC representations remain private to the boundary module.

```ts
type Urgency = 'soon' | 'this-quarter' | 'no-deadline';

type Intake = Readonly<{
  title: string;
  description: string;
  urgency: Urgency | null;
}>;

type IntakePatch = Readonly<{
  title?: string;
  description?: string;
  urgency?: Urgency | null;
}>;

type ReferenceDescriptor = Readonly<{
  id: string;
  fileName: string;
  mediaType: string;
  byteLength: number;
}>;

type Reference = ReferenceDescriptor & Readonly<{
  availability: 'metadata-only';
}>;

type Disclosure =
  | Readonly<{
      kind: 'base';
      copy: string;
      acknowledgmentRequired: false;
    }>
  | Readonly<{
      kind: 'tier2';
      copy: string;
      acknowledgmentRequired: true;
      acknowledgmentCopy: string;
    }>;

type NeedPosition =
  | Readonly<{ stage: 'draft'; submittedAt: null }>
  | Readonly<{
      stage: 'discovery_in_progress';
      submittedAt: string;
    }>;

type NeedView = Readonly<{
  id: string;
  organizationId: string;
  revision: number;
  intake: Intake;
  causeLabels: readonly [];
  references: readonly Reference[];
  upload: Readonly<{
    transfer: 'unavailable';
    disclosure: Disclosure;
  }>;
}> & NeedPosition;

type CommandTarget = Readonly<{
  organizationId: string;
  needId: string;
  commandId: string;
}>;

type NeedCommand = CommandTarget & (
  | Readonly<{ action: 'start'; intake: Intake }>
  | Readonly<{
      action: 'change';
      expectedRevision: number;
      patch: IntakePatch;
    }>
  | Readonly<{
      action: 'reference';
      expectedRevision: number;
      reference: ReferenceDescriptor;
    }>
  | Readonly<{
      action: 'submit';
      expectedRevision: number;
    }>
);

type CommandReceipt = Readonly<{
  commandId: string;
  needId: string;
  revision: number;
}> & NeedPosition;

type NeedOutcome =
  | Readonly<{ ok: true; receipt: CommandReceipt }>
  | WriteRefusal;

type Snapshot = Readonly<{
  needId: string;
  organizationId: string;
  submittedAt: string;
  submittedByAccountId: string;
  intake: Intake;
  references: readonly ReferenceDescriptor[];
}>;
```

`revision` is a positive PostgreSQL integer, avoiding an implicit `bigint`-to-JavaScript precision conversion.

## Tables, constraints and indexes

Two migrations:

1. `…_audit_event_kind_need_intake.sql`: add `need_intake_changed` and `need_submitted`.
2. `…_need_intake.sql`: table, indexes, SQL functions, triggers, grants and policies.

Only **one new table**:

| `public.needs` column | Type and invariant |
|---|---|
| `id` | `uuid PRIMARY KEY`; supplied by the start command |
| `org_id` | `uuid NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT` |
| `created_by_account_id` | `uuid NOT NULL REFERENCES accounts(id) ON DELETE RESTRICT` |
| `title` | `text NOT NULL DEFAULT ''` |
| `description` | `text NOT NULL DEFAULT ''` |
| `urgency` | Nullable `text`; closed urgency vocabulary |
| `revision` | `integer NOT NULL`; positive |
| `stage` | `text NOT NULL DEFAULT 'draft'`; closed two-value vocabulary |
| `submitted_at` | Nullable `timestamptz`; null exactly when stage is draft |
| `tier2_classified_at` | Nullable `timestamptz`; monotonic once set |
| `cause_labels` | `text[] NOT NULL DEFAULT '{}'`; cardinality zero |
| `reference_descriptors` | `jsonb NOT NULL DEFAULT '{}'`; validated metadata object |
| `created_at` | `timestamptz NOT NULL`; server instant |
| `updated_at` | `timestamptz NOT NULL`; server instant |

Indexes:

- Primary key on need id: read, command lock and classification access.
- `(org_id, created_at, id)`: tenant policy and future draft enumeration.
- Partial unique audit index on `(actor_account_id, (detail->>'command_id'))` for the two intake event kinds: retry lookup.
- Partial unique audit index on `(detail->>'need_id')` for `need_submitted`: snapshot lookup and uniqueness.

Audit details use two closed shapes:

```ts
// Private persisted representation, not a public API type.
type ChangeEventDetail = {
  need_id: string;
  command_id: string;
  request: unknown; // SQL validates the exact action-specific shape.
  receipt: unknown;
};

type SubmissionEventDetail = ChangeEventDetail & {
  raw_intake: {
    title: string;
    description: string;
    urgency: Urgency | null;
    references: readonly ReferenceDescriptor[];
  };
};
```

`unknown` above marks a boundary to be parsed, not unrestricted accepted JSON.

Every new table grant is revoked from `anon`, `authenticated` and `service_role`; RLS is enabled in its creation migration. `needs` then grants authenticated SELECT with existing `viewer_is_org_member(org_id)` and `viewer_is_platform_admin()` helpers. It has a `tenant-isolated` catalog entry. There is no fourth viewer helper and no client write grant.

## SQL surface

Exactly **one new callable SECURITY DEFINER**:

```sql
public.apply_need_intake(
  p_account_id uuid,
  p_organization_id uuid,
  p_need_id uuid,
  p_command_id uuid,
  p_action text,
  p_expected_revision integer default null,
  p_payload jsonb default '{}'::jsonb
) returns jsonb
```

It sets `search_path = ''`, calls `public.assert_account_active`, revokes execution from `public`, `anon` and `authenticated`, and grants execution only to `service_role`. Account identity comes from the resolved caller, never the request.

Four supporting functions are not SECURITY DEFINER:

```sql
-- Pure decision; no verification, capacity, organisation or storage inputs.
public.need_submission_issue(
  p_title text,
  p_description text
) returns text
language sql immutable;

-- Only the local transition vocabulary; no I/O.
public.need_submission_stage(p_stage text)
returns text
language sql immutable;

-- Validates an object of strictly shaped metadata descriptors.
public.need_references_valid(p_value jsonb)
returns boolean
language sql immutable;

-- Before INSERT/UPDATE: identity, stage and classification invariants.
public.guard_need_intake()
returns trigger
language plpgsql;
```

All have an empty search path and revoked direct client execution. Bodies remain `not implemented` in the eventual sketch; their intended logic is:

```sql
-- TODO apply_need_intake:
-- Assert active NGO account.
-- Lock target organisation FOR SHARE; refuse absence.
-- Lock caller's target membership FOR SHARE; require admin.
-- Validate action-specific payload, including unknown-key rejection.
-- Lock existing need FOR UPDATE and re-check org_id.
-- For start with no row: check platform acknowledgment, then INSERT;
-- primary-key conflict waits, after which re-lock and inspect receipt.
-- Look up (actor, command_id); identical request returns old receipt;
-- different request raises command-id-reused.
-- Existing start with another command raises need-already-exists.
-- For change/reference/first submit: require expected revision.
-- Build candidate row from the locked row, never from client whole-state data.
-- For submit: consult description/title helper before eligibility checks.
-- Check caller email and read existing Discovery allowance.
-- Append the event, including immutable raw intake for first submission.
-- Write the candidate row; stage trigger checks submission event consistency.
-- Return receipt. Any failure rolls back event and row together.
```

`guard_need_intake` rejects changing identity columns, returning from Discovery to draft, altering `submitted_at` after submission, or resetting classification. On the first stage transition it requires the already-appended submission event to match the new row’s raw intake and submission timestamp. Subsequent content edits do not compare current content with raw intake.

The trigger and checks also protect operator setup from accidentally creating impossible rows. A database owner who disables triggers remains outside the product security boundary.

Submission eligibility reads `public.discovery_allowance(..., 'read', NULL)` within the owner transaction. It does not copy grant values, create a spend row or debit credits. The read establishes capacity at that instant; it is not a reservation against later agent turns. Email confirmation is read from Auth. The lifecycle owner later absorbs these temporary eligibility checks and supplies its complete remedies and funded-fuel path.

## Concurrency and idempotency

One need is genuinely shared: two sessions edit the same NGO intake, and submission must choose exactly one committed version. Per-session canonical drafts would make submission and reopening ambiguous. This is the justified serialization case, per `separate-before-serializing-shared-state`.

Sessions retain their own pending input; SQL uses row locks plus compare-and-swap revisions:

- Two changes from revision 3: one commits revision 4; the other receives `need-revision-conflict`.
- A duplicate command returns its original receipt, even after newer changes.
- A duplicate command with changed payload is refused.
- Retrying submission with a new command id after submission succeeds without another snapshot or stage change, provided current authorization still holds.
- A crash before commit leaves no mutation or receipt; a crash after commit is recovered by the receipt.
- A classification update and reference association serialize on the need row. A reference command encountering Tier-2 refuses until the future acknowledgment capability exists.
- No automatic conflict overwrite or merge is invented.

The client may re-read after a conflict and retain its unsent input for resolution. This run does not implement the screen’s conflict interaction.

## Routes and modules

| File | Responsibility |
|---|---|
| `supabase/functions/need-intake/index.ts` | One `Deno.serve(writeRoute({ name, target, decide, render }))` |
| `supabase/functions/read-need/index.ts` | Authenticated POST read through existing edge read infrastructure |
| `_shared/need-intake.ts` | Domain types, request boundary, result parsing and need projection |
| `_shared/need-disclosure.ts` | Shipped copy and pure disclosure selection |
| `_shared/edge.ts` | Extend `callerReads` with need-by-id SELECT |
| `_shared/tenant-reads.ts` | Extend the existing read-port type only |
| `_shared/write-routes.ts` | One edge inventory row and refusal vocabulary |
| `supabase/config.toml` | JWT blocks for both routes |

The command route inventory row admits only `ngo` accounts and names RPC `apply_need_intake`. No stand-in row is added.

**One command route is deeper than four verb routes here.** All commands share actor resolution, organisation ownership, locking, idempotency, revision control and audit. The action union exposes four actual domain intents, with no internal pipeline switches. Separate routes would expose the same capability through more registration and wrapper files without removing caller coordination. Reading stays separate because it uses caller credentials and RLS rather than service-role writes.

Request and response bodies:

| Route | Request | Success |
|---|---|---|
| `need-intake` | `NeedCommand` encoded as JSON | `{ ok: true, receipt: CommandReceipt }` |
| `read-need` | `{ needId: string }` | `{ ok: true, need: NeedView }` |

Write failures retain `{ ok: false, kind, reason }`. Boundary validation returns 400; the TypeScript admin gate returns 403; SQL refusals map to 409 through the existing frame. Unauthenticated access returns 401. Read absence or RLS exclusion returns the same 404.

Exports:

```ts
// _shared/need-intake.ts

/** Parses untrusted input, checks the existing admin decision,
 * and creates private RPC arguments. No stored-content decisions here. */
export function decideNeedIntake(
  input: AccountWriteRouteInput,
): WriteRouteDecision<NeedIntakeArgs> {
  throw new Error('not implemented');
}

/** Parses SQL output; malformed success is an error, never fabricated defaults. */
export function renderNeedIntake(
  raw: unknown,
): { receipt: CommandReceipt } {
  throw new Error('not implemented');
}

/** Parses the caller-bound row and derives labels, references and disclosure. */
export function needViewFromRow(raw: unknown): NeedView {
  throw new Error('not implemented');
}

// _shared/need-disclosure.ts

export const BASE_DISCLOSURE: Extract<Disclosure, { kind: 'base' }>;
export const TIER2_DISCLOSURE: Extract<Disclosure, { kind: 'tier2' }>;

export function disclosureFor(tier2Known: boolean): Disclosure {
  throw new Error('not implemented');
}
```

`NeedIntakeArgs` is the internal RPC argument type, not re-exported as the SUT command type. Boundary parsing and SQL are separate trust boundaries, per `boundary-discipline`; the SQL rules remain authoritative. No production TypeScript transition engine mirrors SQL.

Base copy includes “Redacted or sample data only” and that ai4good and the matched volunteer see the files. Hardened copy explicitly requires invented fixtures, excludes real personal or sensitive records, and includes the acknowledgment statement. Both ship as constants in the same module.

## Refusals and exact SQL DETAIL

Add these values to `WRITE_REFUSAL_KINDS`:

| New kind / exact DETAIL | Condition |
|---|---|
| `platform-acknowledgment-required` | Start without `has_platform_acknowledgment(p_account_id)` |
| `no-such-need` | Need absent from the target organisation |
| `need-already-exists` | Existing need receives a different start command |
| `need-revision-conflict` | New mutation names an outdated revision |
| `command-id-reused` | Actor reuses a command id with different normalized input |
| `missing-description` | First submission has whitespace-only description |
| `missing-title` | First submission has whitespace-only title |
| `tier2-acknowledgment-required` | New metadata association after Tier-2 classification |

The definer also raises existing DETAIL values:

- `no-account`, `account-deactivated`, `not-an-ngo-account`
- `no-such-organisation`, `not-a-member`, `not-an-admin`
- `invalid-request`
- `email-unverified`
- `daily-allowance-exhausted`

Authorization uses SQLSTATE `42501`; invalid payloads use `22023`; revision, duplicate-id and submission-condition refusals use `P0001`; missing organisation or need uses `23503`. Every explicit raise supplies the exact DETAIL above. Schema constraint failures remain structural errors rather than pretending to be new domain refusals.

Missing-description isolation is structural: the pure SQL helper takes only title and description, and the definer invokes it before checking email or capacity. The test independently proves valid email and positive allowance and compares the specific refusal. Raw text is not normalized; blank detection uses one documented SQL whitespace predicate.

## Suite contract and evidence

`_contract.ts` imports shipped domain and refusal types and uses aliases only:

```ts
type NeedsSut = Pick<OrganizationsSut,
  | 'provisionNgo'
  | 'provisionVolunteer'
  | 'setMembershipRoleAsOperator'
  | 'readAllowance'
> & {
  command(
    session: Session | null,
    command: NeedCommand,
  ): Promise<NeedOutcome>;

  read(
    session: Session | null,
    needId: string,
  ): Promise<NeedReadOutcome>;

  reopenSession(session: Session): Promise<Session>;

  classifyTier2AsOperator(needId: string): Promise<void>;

  snapshotAsOperator(needId: string): Promise<Snapshot | null>;

  attemptDefinerAsOperator(input: {
    accountId: string;
    command: unknown;
  }): Promise<DefinerOutcome>;

  attemptNeedMutationAsOperator(input: {
    needId: string;
    changes: Record<string, unknown>;
  }): Promise<OperatorWriteOutcome>;

  attemptSnapshotMutationAsOperator(
    needId: string,
  ): Promise<OperatorWriteOutcome>;
};
```

`reopenSession` performs a real second login at integration, not a copied handle. Because REQ-002 keeps tokens inside its live factory, its factory needs a narrowly scoped test-only session bridge shared with REQ-003. That bridge stays in adapter implementation code; tokens and generic HTTP executors do not enter the SUT contract.

Files:

- `_bind.ts`, `_contract.ts`, `_fixture.ts`, `_live.ts`, `_pending.ts`
- `_source-intake.ts`
- `a-capture.test.ts`: .01, .02, .04
- `b-autosave.test.ts`: .03, .05
- `c-labels.test.ts`: .17
- `d-references.test.ts`: .07, .09
- `e-hardening.test.ts`: .10
- `f-submission.test.ts`: .11, .12
- `g-audit.test.ts`: .14, .16

That is **13 suite files, containing exactly 13 `atTest` registrations**. No retired ids are registered.

Both adapters export `requirement = 'req-003' as const`; `_bind.ts` binds `sut: 'needs'`; `AdapterModules` registers the fixture module. Reuse REQ-002 provisioning, allowance and world infrastructure without creating a new harness world or capability mechanism.

Loop runs the shipped `writePipeline`, parsers and disclosure projection over adapter-owned Maps. Its SQL behavior is an explicitly limited reference model, supported by source assertions; it does not claim to execute SQL. Integration proves the authoritative transaction through deployed routes and direct-definer bypass probes.

`_source-intake.ts` returns a problem list and throws on unreadable or missing source. Its harness selftest injects missing description checks, an accepted label field, mutable snapshot operations, missing acknowledgment calls and bypassed route registration. Source checks supplement, rather than substitute for, integration enforcement.

Within existing AT bodies, integration additionally tests concurrent edits/submits, cross-target need ids, stale revisions, retry after subsequent edits, SQL-only role refusals, snapshot uniqueness and failed audit mutation.

## Expected manifest and red set

Author `tests/at/expected/req-003.json` before running:

```json
{
  "requirement": "003",
  "tiers": {
    "loop": {
      "green": [
        "AT-003.01", "AT-003.02", "AT-003.03", "AT-003.04",
        "AT-003.05", "AT-003.07", "AT-003.09", "AT-003.10",
        "AT-003.11", "AT-003.12", "AT-003.14", "AT-003.16",
        "AT-003.17"
      ],
      "red": {}
    },
    "integration": {
      "green": [
        "AT-003.01", "AT-003.02", "AT-003.03", "AT-003.04",
        "AT-003.05", "AT-003.11", "AT-003.12",
        "AT-003.14", "AT-003.16", "AT-003.17"
      ],
      "red": {
        "AT-003.07": {
          "kind": "capability-pending",
          "capabilities": ["storage.reference-upload"]
        },
        "AT-003.09": {
          "kind": "capability-pending",
          "capabilities": ["ui.intake-upload-surface"]
        },
        "AT-003.10": {
          "kind": "capability-pending",
          "capabilities": [
            "discovery.tier2-classification",
            "ui.intake-upload-surface"
          ]
        }
      }
    }
  }
}
```

These are suite-local missing-surface names passed to existing `CapabilityPending`, not new harness capabilities.

- **.07:** metadata association cannot prove that a file was uploaded.
- **.09:** serving shipped copy cannot prove its rendering.
- **.10:** operator classification proves consumption of the fact; it proves neither the producer event nor the hardened screen.

Each integration body first checks its available backend behavior, then calls `awaiting(...)` with exactly the manifest’s ordered names. Per-tier registrations use `default` plus `integration`, avoiding a missing drill arm. No pending body calls `notLanded`.

The local stage supports .11 and .12 at both tiers under the brief’s explicit design choice. It does not discharge the manifest’s eventual lifecycle-engine integration or wired acceptance gate.

## Constraint compliance and size

No grounding constraint is intentionally bent.

| Constraints | Design treatment |
|---|---|
| 1–8 | Registered JWT write wrapper; target organisation; existing admin decision; authoritative SQL recheck and refusal mapping |
| 9–10 | Same-migration RLS/grants, tenant catalog entry, existing viewer helpers |
| 11–12 | Private `needs`; metadata only; no prohibited project-state or storage surfaces |
| 13–17 | No notifications; owner-only audit append; separate enum migration; immutable audit; email-specific wording |
| 18–19 | Creation acknowledgment hook; existing allowance read with no copied grants |
| 20–26 | Adapter registration, 13 ids, exact manifest, pending shape, aliases and tested source oracle |
| 27–30 | Existing harness infrastructure; no `src` edits; no new stand-in; unchanged `write_standing` |

New production surface: **2 migrations, 1 table, 2 routes, 1 SECURITY DEFINER, 3 pure SQL functions, 1 trigger function, 1 trigger and 2 `_shared` modules**. Existing shared files receive the inventory, refusal and read-port additions. Testing adds 13 suite files, one expectation manifest and one harness oracle selftest, plus adapter registration, tenant catalog and the test-only live-session bridge.

# Synthesis decision

# Tradeoffs accepted

- We accept SQL-centered behavior and limited loop modeling in exchange for invariants that hold when callers bypass TypeScript.
- We accept optimistic conflicts between sessions in exchange for preventing silent stale overwrites.
- We accept retaining command receipts in audit history in exchange for durable retries without another table.
- We accept a JSON metadata object in exchange for one aggregate row and atomic reference/snapshot capture; SQL validates its complete shape.
- We accept operator-only snapshot retrieval in exchange for avoiding an unrequested platform export API.
- We accept three integration reds in exchange for truthful claims about storage, rendering and classification production.
- We accept a temporary local Discovery stage in exchange for proving submission now; the lifecycle engine must absorb it.
- We accept blocking new Tier-2 metadata associations until acknowledgment is implemented in exchange for having no ungated hardened path.

# Alternatives considered

- **Put intake on `projects`.** This hides little beyond row persistence while exposing workspace/public-read behavior to draft callers. It also conflicts with the existing project-state oracle and makes drafts publicly reachable.
- **Four command routes with separate definers.** Each verb is individually clear, but the surface repeats ownership, retry and audit coordination. One aggregate command hides those shared policies with fewer wrappers and no caller-managed transaction.
- **Separate immutable snapshot and receipt tables.** This gives stronger dedicated relational schemas but repeats append-only infrastructure and increases tenant-policy work. The existing audit table plus unique indexes already supports both dominant lookups.
- **Per-session persisted drafts merged on read.** This separates writes, but exposes unresolved content choices at submission and makes “return to my draft” ambiguous. One canonical intake version is a real shared invariant here.

# Open questions and risks

- Will the lifecycle owner adopt this need identity and local stage, or require an explicit migration to its canonical transition record?
- Does synthesis accept the brief’s local-transition interpretation of “Discovery begins,” with agent execution remaining outside this run?
- Should the eventual Tier-2 acknowledgment be retained per need, per administrator, or per policy version?
- Will REQ-032 preserve descriptor ids when replacing metadata-only associations with stored references?
- Does the platform need an authenticated snapshot-read route before operator retrieval becomes operationally insufficient?

# Next implementation step

Build the private need table, start/change command transaction and caller-bound read, then prove persistence, admin refusal and retry behavior through the first unit’s deployed-route and direct-SQL assertions.

# Per-unit plan

## 1. Capture and admin-only creation

- **Files:** Both migrations; `need-intake/index.ts`; `read-need/index.ts`; `_shared/need-intake.ts`; write inventory, read port, JWT config and tenant catalog.
- **SQL:** `needs`, `apply_need_intake` start/change arms, `guard_need_intake`; existing organization, membership and acknowledgment records.
- **Refusals:** Existing account/admin kinds; `platform-acknowledgment-required`, `need-already-exists`, `command-id-reused`, `invalid-request`.
- **Suite:** Shared scaffolding and `a-capture.test.ts`; .01, .02, .04 green at both tiers.
- **Lane:** **Hardest tasks, astra medium.** The writer must resolve the live-session composition seam and validate creation races against existing factory and locking behavior.

## 2. Description gate and autosave

- **Files:** Aggregate migration, `_shared/need-intake.ts`, `b-autosave.test.ts`, adapters and source oracle.
- **SQL:** Patch/revision logic in `apply_need_intake`; pure `need_submission_issue`; audit retry records.
- **Routes:** Existing command/read pair.
- **Refusals:** `missing-description`, `missing-title`, `need-revision-conflict`, `command-id-reused`.
- **Suite:** .03 and .05 green at both tiers. Unit 2 adds the failing-submit path; unit 6 completes successful submission.
- **Lane:** **Feature, astra low.** Patch, retry and isolated-description behavior follow the fixed contract.

## 3. Empty cause labels

- **Files:** Aggregate migration, need projection, `c-labels.test.ts`, source oracle.
- **SQL:** Empty-array column and hard zero-cardinality check; no producer function.
- **Routes:** Existing read route; command rejects unknown label fields as `invalid-request`.
- **Suite:** .17 green at both tiers, including an attempted direct mutation.
- **Lane:** **Feature, astra low.** No remaining design choice.

## 4. Reference association and base disclosure

- **Files:** Aggregate migration reference validation; `_shared/need-intake.ts`; `_shared/need-disclosure.ts`; `d-references.test.ts`.
- **SQL:** `reference_descriptors`, `need_references_valid`, reference arm of the existing definer.
- **Routes:** Existing command/read pair; no storage route.
- **Refusals:** `invalid-request`, `need-revision-conflict`.
- **Suite:** .07 and .09 green at loop; integration reds respectively on `storage.reference-upload` and `ui.intake-upload-surface`.
- **Lane:** **Feature, astra low.** The writer applies the explicitly metadata-only contract.

## 5. Classification-driven hardening

- **Files:** Aggregate classification guard; disclosure module; operator adapter commands; `e-hardening.test.ts`.
- **SQL:** `tier2_classified_at` and monotonic trigger rule; no product classification definer.
- **Routes:** Existing read route immediately serves hardened copy; reference command checks classification under lock.
- **Refusals:** `tier2-acknowledgment-required`.
- **Suite:** .10 green at loop; integration red on `discovery.tier2-classification`, then `ui.intake-upload-surface`.
- **Lane:** **Feature, astra low.** Operator stub and read-time derivation are fixed.

## 6. Submission starts the local Discovery stage

- **Files:** Aggregate migration submission arm and pure stage helper; command result parsing; `f-submission.test.ts`.
- **SQL:** `apply_need_intake`, `need_submission_stage`, `guard_need_intake`; existing Auth and allowance read.
- **Routes:** Existing command/read pair.
- **Refusals:** Description/title and revision kinds; existing `email-unverified` and `daily-allowance-exhausted`.
- **Suite:** .11 and .12 green at both tiers, including no-reference and metadata-reference cases, duplicate submit and concurrent submit.
- **Lane:** **Hardest tasks, astra medium.** The writer must validate transaction ordering against existing allowance and membership locks and finish the concrete SQL transition implementation.

## 7. Raw snapshot and immutable retention

- **Files:** Aggregate submission event/index/guard implementation; snapshot parser; operator adapter methods; `g-audit.test.ts`.
- **SQL:** Existing `audit_events`, owner-only `append_audit_event`, unique submitted-snapshot index; no new snapshot table or definer.
- **Routes:** Existing submit and working-content change operations; retrieval through operator SQL.
- **Refusals:** No additional domain kind; existing immutable-audit protections reject mutation.
- **Suite:** .14 and .16 green at both tiers. The minimal snapshot mechanism is part of unit 6’s atomic transition; this unit completes retention and later-edit evidence.
- **Lane:** **Feature, astra low.** The transaction and immutable storage contract are fixed by the preceding unit.