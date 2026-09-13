I have the write frame, the thirty constraints, and the suite shape. The design below pushes one route and a TypeScript decision module as far as that frame allows.

# Rationale: project need intake (thin SQL, one route)

## Problem

This tree has no intake surface. There is no need row, no draft posture, no upload path, and no lifecycle engine. Every product write must still be one `writeRoute`, one `WRITE_ROUTES` row, and one SECURITY DEFINER that calls `assert_account_active` and re-checks the admin role under a row lock. The NGO-profile oracles forbid storage calls, document-content columns, and any `lifecycle` / `state` / `status` column on a table whose name holds `project`. `public.projects` is a volunteer seat. Its comment says product creation is not landed there, and `public-project` treats every `projects` row as world-readable. The thirteen P0 ids must register in a new suite copied from the NGO-profile suite. An id whose full proof waits on another surface must be red by shape, not faked.

The write frame itself is the non-obvious constraint: `decide` sees the request body and `write_standing`, and it never sees the current need row. Row-dependent facts (does this id exist, has it already been submitted) cannot be judged in `decide`. They land in a pure apply helper that the loop Maps run and that SQL mirrors. Request-shaped facts (admin role, verb, urgency token, missing description on submit, forbidden cause keys) land in `decide` and never in SQL.

## Usage (caller's view)

The wiring leaf, and every acceptance body, call one function.

```
POST /functions/v1/need-intake
Authorization: Bearer <access token>
Content-Type: application/json

{ "organizationId": "<uuid>", "verb": "start" | "patch" | "attach" | "submit" | "read", ... }
```

Success is `{ ok: true }` plus a `NeedView`. Refusal is `{ ok: false, kind, reason }`. There is no second write URL. There is no save verb. A patch is the autosave. A second session observes with `verb: "read"`.

The listed write verbs are `start`, `patch`, `attach`, and `submit`. `read` is the observe half of the same surface. Without it the wiring leaf would invent a second route. `discovery-allowance` already uses one write route for `read` and `debit`.

### README

```ts
import { decideNeedIntake, renderNeedIntake } from '../_shared/need-intake.ts';
import { writeRoute } from '../_shared/edge.ts';
import { organizationIdField } from '../_shared/write-routes.ts';

Deno.serve(writeRoute({
  name: 'need-intake',
  target: organizationIdField,
  decide: decideNeedIntake,
  render: renderNeedIntake,
}));
```

Call sites the screen will issue:

```http
POST /functions/v1/need-intake
{ "verb": "start", "organizationId": "…", "title": "Grant Deadline Dashboard", "description": "We miss grant deadlines.", "urgency": "soon" }

POST /functions/v1/need-intake
{ "verb": "patch", "organizationId": "…", "needId": "…", "description": "We miss grant deadlines every quarter." }

POST /functions/v1/need-intake
{ "verb": "attach", "organizationId": "…", "needId": "…", "reference": { "originalName": "grants-tracker.xlsx", "byteLength": 12044, "mediaHint": "spreadsheet" } }

POST /functions/v1/need-intake
{ "verb": "submit", "organizationId": "…", "needId": "…", "title": "Grant Deadline Dashboard", "description": "We miss grant deadlines every quarter.", "urgency": "soon" }

POST /functions/v1/need-intake
{ "verb": "read", "organizationId": "…", "needId": "…" }
```

Every success body includes `causeLabels: []` and a `disclosure` object with `kind` and `copy`. The screen renders `disclosure.copy`. It does not store a second copy.

### Seven unit call sites (test form)

Unit 1 — capture and the admin gate (AT-003.01, .02, .04)

```ts
atTest('AT-003.01', 'an NGO admin of any tier starts a need with title and description, and both persist', async ({ open }) => {
  const { w, sut } = await open();
  const ngo = await sut.provisionNgo(w.email('ngo-01'), { emailVerified: false });
  const started = await sut.intake(ngo.session, {
    verb: 'start',
    organizationId: ngo.organizationId,
    title: 'Grant Deadline Dashboard',
    description: 'We miss grant deadlines.',
  });
  expect(started).toMatchObject({ ok: true, title: 'Grant Deadline Dashboard', description: 'We miss grant deadlines.', intakeStage: 'draft' });
  if (!started.ok) return;
  const again = await sut.intake(ngo.session, { verb: 'read', organizationId: ngo.organizationId, needId: started.needId });
  expect(again).toMatchObject({ ok: true, title: 'Grant Deadline Dashboard', description: 'We miss grant deadlines.' });
});

atTest('AT-003.02', 'urgency persists and is present on the draft the route returns', async ({ open }) => {
  const { w, sut } = await open();
  const ngo = await sut.provisionNgo(w.email('ngo-02'), { emailVerified: true });
  const started = await sut.intake(ngo.session, {
    verb: 'start', organizationId: ngo.organizationId, title: 'Deadline board', description: 'Deadlines slip.',
  });
  if (!started.ok) return;
  const patched = await sut.intake(ngo.session, {
    verb: 'patch', organizationId: ngo.organizationId, needId: started.needId, urgency: 'this-quarter',
  });
  expect(patched).toMatchObject({ ok: true, urgency: 'this-quarter' });
});

atTest('AT-003.04', 'a member, a volunteer, and a visitor cannot start a need', async ({ open }) => {
  const { w, sut } = await open();
  const ngo = await sut.provisionNgo(w.email('ngo-04'), { emailVerified: true });
  await sut.setMembershipRoleAsOperator(ngo.organizationId, ngo.accountId, 'member');
  const volunteer = await sut.provisionVolunteer(w.email('vol-04'));
  const asMember = await sut.intake(ngo.session, { verb: 'start', organizationId: ngo.organizationId, title: 'X', description: 'Y' });
  expect(asMember).toMatchObject({ ok: false, kind: 'not-an-admin' });
  const asVolunteer = await sut.intake(volunteer, { verb: 'start', organizationId: ngo.organizationId, title: 'X', description: 'Y' });
  expect(asVolunteer).toMatchObject({ ok: false, kind: 'not-an-ngo-account' });
  const asVisitor = await sut.intake(null, { verb: 'start', organizationId: ngo.organizationId, title: 'X', description: 'Y' });
  expect(asVisitor).toMatchObject({ ok: false, kind: 'unauthenticated', status: 401 });
});
```

Unit 2 — isolated description gate and autosave (AT-003.03, .05)

```ts
atTest('AT-003.03', 'an email-verified admin with remaining Discovery credits is blocked on an empty description, and the kind names the description only', async ({ open }) => {
  const { w, sut } = await open();
  const ngo = await sut.provisionNgo(w.email('ngo-03'), { emailVerified: true });
  const allowance = await sut.readAllowance(ngo.session, ngo.organizationId);
  expect(allowance.ok && allowance.allowance.remaining > 0).toBe(true);
  const started = await sut.intake(ngo.session, {
    verb: 'start', organizationId: ngo.organizationId, title: 'Deadline board', description: '', urgency: 'soon',
  });
  if (!started.ok) return;
  const submitted = await sut.intake(ngo.session, {
    verb: 'submit', organizationId: ngo.organizationId, needId: started.needId,
    title: 'Deadline board', description: '', urgency: 'soon',
  });
  expect(submitted).toMatchObject({ ok: false, kind: 'description-required' });
  expect(submitted.ok === false && /description/i.test(submitted.reason) && !/email/i.test(submitted.reason) && !/credit/i.test(submitted.reason)).toBe(true);
});

atTest('AT-003.05', 'a patch without a save verb is what a second session reads back', async ({ open }) => {
  const { w, sut } = await open();
  const ngo = await sut.provisionNgo(w.email('ngo-05'), { emailVerified: true });
  const started = await sut.intake(ngo.session, { verb: 'start', organizationId: ngo.organizationId, title: 'A', description: '' });
  if (!started.ok) return;
  await sut.intake(ngo.session, {
    verb: 'patch', organizationId: ngo.organizationId, needId: started.needId,
    title: 'Grant Deadline Dashboard', description: 'We miss grant deadlines.',
  });
  const ngoAgain = await sut.provisionNgoSession(ngo.accountId); // same account, new session handle
  const read = await sut.intake(ngoAgain, { verb: 'read', organizationId: ngo.organizationId, needId: started.needId });
  expect(read).toMatchObject({ ok: true, title: 'Grant Deadline Dashboard', description: 'We miss grant deadlines.' });
});
```

(`provisionNgoSession` is optional sugar. The live adapter may instead sign the same user in again. The contract is: a second session handle, not a clock, and not a save verb.)

Unit 3 — zero cause labels (AT-003.17)

```ts
atTest('AT-003.17', 'a fresh draft returns no cause labels', async ({ open }) => {
  const { w, sut } = await open();
  const ngo = await sut.provisionNgo(w.email('ngo-17'), { emailVerified: true });
  const started = await sut.intake(ngo.session, {
    verb: 'start', organizationId: ngo.organizationId, title: 'Deadline board', description: 'Deadlines slip.',
  });
  expect(started).toMatchObject({ ok: true, causeLabels: [] });
  const withCause = await sut.intake(ngo.session, {
    verb: 'start', organizationId: ngo.organizationId, title: 'X', description: 'Y', cause: 'food-security',
  });
  expect(withCause).toMatchObject({ ok: false, kind: 'invalid-request' });
});
```

Unit 4 — attach metadata and base disclosure (AT-003.07, .09)

```ts
atTest('AT-003.07', 'attach records reference metadata on the draft', {
  default: async ({ open }) => {
    const { w, sut } = await open();
    const ngo = await sut.provisionNgo(w.email('ngo-07'), { emailVerified: true });
    const started = await sut.intake(ngo.session, { verb: 'start', organizationId: ngo.organizationId, title: 'X', description: 'Y' });
    if (!started.ok) return;
    const attached = await sut.intake(ngo.session, {
      verb: 'attach', organizationId: ngo.organizationId, needId: started.needId,
      reference: { originalName: 'grants-tracker.xlsx', byteLength: 12044, mediaHint: 'spreadsheet' },
    });
    expect(attached).toMatchObject({
      ok: true,
      reference: { originalName: 'grants-tracker.xlsx', byteLength: 12044, mediaHint: 'spreadsheet' },
    });
  },
  integration: awaiting(AWAITED.referenceUpload),
});

atTest('AT-003.09', 'the route serves the base data-responsibility copy on the upload surface payload', async ({ open }) => {
  const { w, sut } = await open();
  const ngo = await sut.provisionNgo(w.email('ngo-09'), { emailVerified: true });
  const started = await sut.intake(ngo.session, { verb: 'start', organizationId: ngo.organizationId, title: 'X', description: 'Y' });
  if (!started.ok) return;
  expect(started.ok && started.disclosure.kind).toBe('base');
  expect(started.ok && started.disclosure.copy).toMatch(/redacted or sample data only/i);
  expect(started.ok && started.disclosure.copy).toMatch(/ai4good/i);
  expect(started.ok && started.disclosure.copy).toMatch(/volunteer/i);
});
```

Unit 5 — Tier-2 copy already present (AT-003.10)

```ts
atTest('AT-003.10', 'after a stubbed Tier-2 classification, the next read already serves the hardened copy, with no attach in between', async ({ open }) => {
  const { w, sut } = await open();
  const ngo = await sut.provisionNgo(w.email('ngo-10'), { emailVerified: true });
  const started = await sut.intake(ngo.session, { verb: 'start', organizationId: ngo.organizationId, title: 'X', description: 'Y' });
  if (!started.ok) return;
  await sut.classifyNeedAsOperator(started.needId, 'tier-2');
  const read = await sut.intake(ngo.session, { verb: 'read', organizationId: ngo.organizationId, needId: started.needId });
  expect(read).toMatchObject({ ok: true, disclosure: { kind: 'tier-2' } });
  expect(read.ok && read.disclosure.copy).toMatch(/fixtures/i);
});
```

Unit 6 — submit starts Discovery, file optional (AT-003.11, .12)

```ts
atTest('AT-003.11', 'submit with no reference moves the need to discovery_in_progress', async ({ open }) => {
  const { w, sut } = await open();
  const ngo = await sut.provisionNgo(w.email('ngo-11'), { emailVerified: true });
  const started = await sut.intake(ngo.session, {
    verb: 'start', organizationId: ngo.organizationId, title: 'Deadline board', description: 'Deadlines slip.', urgency: 'soon',
  });
  if (!started.ok) return;
  const submitted = await sut.intake(ngo.session, {
    verb: 'submit', organizationId: ngo.organizationId, needId: started.needId,
    title: 'Deadline board', description: 'Deadlines slip.', urgency: 'soon',
  });
  expect(submitted).toMatchObject({ ok: true, intakeStage: 'discovery_in_progress', reference: null });
  const again = await sut.intake(ngo.session, {
    verb: 'submit', organizationId: ngo.organizationId, needId: started.needId,
    title: 'Deadline board', description: 'Deadlines slip.', urgency: 'soon',
  });
  expect(again).toMatchObject({ ok: true, intakeStage: 'discovery_in_progress', needId: started.ok ? started.needId : '' });
});

atTest('AT-003.12', 'submit moves draft to discovery_in_progress', async ({ open }) => {
  // same submit path as .11; asserts intakeStage on the view and on the operator row
});
```

Unit 7 — snapshot (AT-003.14, .16)

```ts
atTest('AT-003.14', 'submit writes a raw-intake snapshot equal to the submitted fields', async ({ open }) => {
  const { w, sut } = await open();
  const ngo = await sut.provisionNgo(w.email('ngo-14'), { emailVerified: true });
  const started = await sut.intake(ngo.session, {
    verb: 'start', organizationId: ngo.organizationId, title: 'Deadline board', description: 'Deadlines slip.', urgency: 'soon',
  });
  if (!started.ok) return;
  await sut.intake(ngo.session, {
    verb: 'submit', organizationId: ngo.organizationId, needId: started.needId,
    title: 'Deadline board', description: 'Deadlines slip.', urgency: 'soon',
  });
  const snap = await sut.intakeSnapshotAsOperator(started.needId);
  expect(snap).toMatchObject({ title: 'Deadline board', description: 'Deadlines slip.', urgency: 'soon', reference: null });
});

atTest('AT-003.16', 'a later patch changes working content and leaves the snapshot unmodified', async ({ open }) => {
  const { w, sut } = await open();
  const ngo = await sut.provisionNgo(w.email('ngo-16'), { emailVerified: true });
  const started = await sut.intake(ngo.session, {
    verb: 'start', organizationId: ngo.organizationId, title: 'Deadline board', description: 'Deadlines slip.',
  });
  if (!started.ok) return;
  await sut.intake(ngo.session, {
    verb: 'submit', organizationId: ngo.organizationId, needId: started.needId,
    title: 'Deadline board', description: 'Deadlines slip.',
  });
  await sut.intake(ngo.session, {
    verb: 'patch', organizationId: ngo.organizationId, needId: started.needId, description: 'Edited after Discovery began.',
  });
  const working = await sut.intake(ngo.session, { verb: 'read', organizationId: ngo.organizationId, needId: started.needId });
  expect(working).toMatchObject({ ok: true, description: 'Edited after Discovery began.' });
  const snap = await sut.intakeSnapshotAsOperator(started.needId);
  expect(snap).toMatchObject({ description: 'Deadlines slip.' });
});
```

## Shape

### Where the need lives

A new table `public.needs`. It does not join `public.projects`. It has no `project_id` column yet.

`public.projects` is the single-developer seat. Its comment says product creation is not landed there. A draft stored as a `projects` row would be world-readable by id through `public-project`. Constraint 11 forbids a `state` / `status` / `lifecycle` column on any table whose name holds `project`. A join would force this run to insert seat rows that no product path creates.

The lifecycle engine later may insert a `projects` row at publish and add `needs.project_id`. This run does not.

`needs` is `unreachable-by-client-roles`, same posture as `org_vetting` and `discovery_spend`. Every product read goes through the one route as `verb: "read"`. Row level security stays on as defence. There is no `grant select` to `authenticated`, and no fourth `viewer_*` helper.

### Tables

**`public.needs`** (migration `20260917120000_need_intake.sql`)

| column | type | notes |
|---|---|---|
| `id` | `uuid` PK `gen_random_uuid()` | |
| `org_id` | `uuid not null references organizations(id) on delete cascade` | |
| `title` | `text not null default ''` | empty allowed on a draft |
| `description` | `text not null default ''` | empty allowed on a draft |
| `urgency` | `text null` | `soon` \| `this-quarter` \| `no-deadline` |
| `intake_stage` | `text not null default 'draft'` | `draft` \| `discovery_in_progress`. Not named `state`, `status`, or `lifecycle`. |
| `submitted_at` | `timestamptz null` | set once, never cleared |
| `sensitivity_class` | `text null` | stub. `null` or `tier-2`. Operator writes it. |
| `reference_original_name` | `text null` | not a forbidden document-content name |
| `reference_byte_length` | `integer null` | claimed size, not stored bytes |
| `reference_media_hint` | `text null` | `spreadsheet` \| `document` \| `image` \| `other`. Never a quoted `application/pdf`. |
| `reference_declared_at` | `timestamptz null` | |
| `created_at` | `timestamptz not null default now()` | |
| `updated_at` | `timestamptz not null default now()` | |

Checks:

- `needs_urgency_vocab`: `urgency is null or urgency in ('soon','this-quarter','no-deadline')`
- `needs_intake_stage_vocab`: `intake_stage in ('draft','discovery_in_progress')`
- `needs_sensitivity_vocab`: `sensitivity_class is null or sensitivity_class = 'tier-2'`
- `needs_reference_all_or_nothing`: the four reference columns are all null or all set; `reference_byte_length > 0`
- `needs_submitted_has_description`: `intake_stage = 'draft' or btrim(description) <> ''`
- `needs_submitted_at_matches_stage`: `intake_stage = 'draft' and submitted_at is null` or `intake_stage = 'discovery_in_progress' and submitted_at is not null`

No cause-label column. No cause-label table. A pre-Discovery draft cannot carry a label because nothing exists to hold one. `renderNeedIntake` always sets `causeLabels: []`. The Discovery-agent requirement later adds storage and changes render. This run deletes nothing for that arrival.

Index: `needs_org_id_idx (org_id)`.

Posture in the same migration: `revoke all from anon, authenticated, service_role`; `enable row level security`; no select grant; `TENANT_CATALOG.needs = 'unreachable-by-client-roles'`.

**No new snapshot table.** The snapshot is one `audit_events` row.

**`audit_event_kind` value** (migration `20260917110000_audit_event_kind_need_intake_submitted.sql`, its own file, before the definer):

```sql
alter type public.audit_event_kind add value 'need_intake_submitted';
```

The existing append-only triggers keep the snapshot unchanged. No definer updates or deletes `audit_events`. The platform retrieves it with operator SQL on `audit_events` filtered by `event_kind` and `detail->>'need_id'`.

### How the draft to `discovery_in_progress` transition is proven

A local `intake_stage` column plus a pure helper `transitionIntakeStage`. AT-003.11 and AT-003.12 are green at both tiers. The engine in the lifecycle requirement later absorbs this column into its table, deletes `intake_stage` and `transitionIntakeStage`, and keeps the two tokens as its first two stages. Submit does not debit Discovery credits and does not check email confirmation. Those gates are retired from this requirement on purpose. Isolation of AT-003.03 is by construction: verification and capacity are not rows in `SUBMIT_GATES`.

### What "attached" means

Attached means the four `reference_*` columns are populated. The NGO sends a JSON declaration: original file name, byte length, media hint. No bucket, no `bytea`, no forbidden column name, no `storage.from(`.

Loop proves the attach decision and the read-back. Integration cannot put a file in storage, so AT-003.07 is red at integration on `storage.reference-upload`. The need-attachments requirement later adds a list table and a storage primitive, and deletes these four columns.

### Disclosure: copy, not a flag

`DATA_RESPONSIBILITY` is a shipped constant in `need-intake.ts`. The words come from `design/screens/reference-files.html` (base notice and the Tier-2 modal body). The route returns `{ kind, copy }` on every `NeedView`. The screen later renders `copy`. Loop and integration pin the words. The wiring leaf's wired re-run later proves pixels. I disagree with the grounding note that AT-003.09 and AT-003.10 must be red on a `ui.*` surface: the brief says this pass proves the disclosure the route serves, and the wired re-run proves rendering. Classification is stubbed here, so those ids do not wait on the Discovery-agent event either.

### Tier-2 classification stub

Column `needs.sensitivity_class`. Product verbs do not write it. Loop: `classifyNeedAsOperator(needId, 'tier-2')` writes the Map. Integration: `update public.needs set sensitivity_class = 'tier-2'`. The next `read` (or `attach`, or `patch`) already returns `disclosure.kind = 'tier-2'`. No further attach is required. Hardening is `disclosureFor(sensitivity_class)`, a pure function of the stored class.

The Discovery-agent requirement later writes this column (or replaces it with an event table and then this column is deleted). The operator test hook can remain.

### Snapshot

On the first submit only, the definer calls `append_audit_event('need_intake_submitted', …)` with `detail` equal to the locked row's title, description, urgency, and reference declaration. A second submit does not insert a second row. Later patches update `needs` and never touch `audit_events`. Retrieval: `intakeSnapshotAsOperator` reads that row. Immutability is the existing append-only trigger, not a new mechanism.

### Autosave

`patch` is last-write-wins merge. Omitted keys stay. `null` from `decide` means omitted. An empty string is a value and can clear description. Two identical patches converge. Concurrent patches serialise on `FOR UPDATE`; the later commit wins per column. No revision number. No clock. A second session calls `read` and sees the committed row.

`submit` sends the current title, description, and urgency so `decide` can judge the description without loading the row. That is the write-frame limit: `decide` never sees the stored need. Autosave already persisted those fields. Submit is a last merge plus the transition.

### One route versus one route per verb

One route wins for the caller: one URL, one JWT block, one inventory row, one loop spec, one membership re-check. It loses inside SQL: the definer is a verb switch, and a later atomic debit-on-submit will want to replace that function rather than grow it. That loss is accepted and named. Four write routes would hide less, and would force the wiring leaf to coordinate several methods for one intake.

### SQL still protects what the policy scan demands

The single definer `public.need_intake`:

1. Calls `public.assert_account_active(p_account_id)`.
2. Locks `organizations` `for share`; missing org raises `no-such-organisation`.
3. Re-reads `org_memberships` `for share`; raises `not-a-member` or `not-an-admin` with those DETAIL values.
4. On `start`, calls `has_platform_acknowledgment`; false raises `refused`.
5. On every verb except `start`, locks the need `for update` and checks `org_id = p_organization_id`; mismatch or missing row raises `no-such-need`.
6. Applies the already-judged args. It does not judge description, urgency vocabulary beyond the CHECK, disclosure, or capacity.

That is as generic as the scan allows. A definer with no membership re-check fails constraint 8. A definer with no `assert_account_active` fails constraint 7.

Honest break of this lane: a service-role RPC that skips TypeScript can submit if the CHECK accepts the row. The product path never does that. `description-required` is a TypeScript kind. SQL does not raise it.

### Invariants in structure

- Snapshot cannot change: append-only `audit_events` plus submit inserting once (`submitted_at` already set ⇒ skip append).
- Autosave twice converges: merge with identical values.
- Submit twice is safe: second submit is a no-op on stage and snapshot.
- Description gate is isolated: `SUBMIT_GATES` has one row; email and credits are not on this route.
- Pre-Discovery draft cannot carry a label: no storage for labels exists.
- Illegal submitted row without description cannot exist: CHECK.

### Interface depth

Public surface: one route, one SUT member `intake`, plus operator stubs. Hidden behind it: admin gate, forbidden-key check, urgency vocabulary, description gate, patch merge, disclosure selection, stage apply, snapshot-once, acknowledgment hook, row lock, org re-check. The wiring leaf does not coordinate those.

`decide` does not load the need. The stage machine therefore lives in `applyIntakeVerb`, which the loop Maps run and SQL mirrors. That is the write-frame limit, not a second public method.

### Core types (`supabase/functions/_shared/need-intake.ts`)

```ts
export const INTAKE_VERBS = ['start', 'patch', 'attach', 'submit', 'read'] as const;
export type IntakeVerb = (typeof INTAKE_VERBS)[number];

export const INTAKE_STAGES = ['draft', 'discovery_in_progress'] as const;
export type IntakeStage = (typeof INTAKE_STAGES)[number];

export const URGENCY_TOKENS = ['soon', 'this-quarter', 'no-deadline'] as const;
export type Urgency = (typeof URGENCY_TOKENS)[number];

export const MEDIA_HINTS = ['spreadsheet', 'document', 'image', 'other'] as const;
export type MediaHint = (typeof MEDIA_HINTS)[number];

export type ReferenceDeclaration = {
  readonly originalName: string;
  readonly byteLength: number;
  readonly mediaHint: MediaHint;
  readonly declaredAt?: string; // server sets this; callers do not
};

export type SensitivityClass = 'tier-2';

export type DisclosureKind = 'base' | 'tier-2';
export type Disclosure = { readonly kind: DisclosureKind; readonly copy: string };

export const DATA_RESPONSIBILITY: Readonly<Record<DisclosureKind, Disclosure>> = {
  base: {
    kind: 'base',
    copy:
      'Redacted or sample data only. Files here are seen by ai4good and by your volunteer once matched. ' +
      'Never upload real names, contact details, case notes or anything you would not hand to a stranger — ' +
      'make a copy with sample rows instead.',
  },
  'tier-2': {
    kind: 'tier-2',
    copy:
      'This project handles sensitive data — fixtures only. Nothing real, ever: no genuine names, addresses, ' +
      'health notes, case records or identifying details — not even one row to show the format. Upload fixtures: ' +
      'made-up records in the real structure. ai4good and your volunteer see everything you upload here.',
  },
};

export function disclosureFor(sensitivityClass: SensitivityClass | null): Disclosure {
  return sensitivityClass === 'tier-2' ? DATA_RESPONSIBILITY['tier-2'] : DATA_RESPONSIBILITY.base;
}

export const FORBIDDEN_INTAKE_KEYS = [
  'cause', 'causeLabel', 'causeLabels', 'causeTags', 'labels',
  'attachment', 'file', 'storageKey', 'storagePath', 'downloadUrl',
] as const;

export const SUBMIT_GATES = [
  {
    id: 'description',
    kind: 'description-required',
    status: 409,
    reason: 'need_intake refuses submit: the problem description is empty',
    holds: (fields: { description: string }) => fields.description.trim() !== '',
  },
] as const;
// Verification and capacity are not rows. REQ-005.5 adds them here, or replaces submit.

export type NeedFields = {
  readonly title: string;
  readonly description: string;
  readonly urgency: Urgency | null;
};

export type NeedRow = NeedFields & {
  readonly id: string;
  readonly orgId: string;
  readonly intakeStage: IntakeStage;
  readonly submittedAt: string | null;
  readonly sensitivityClass: SensitivityClass | null;
  readonly reference: ReferenceDeclaration | null;
};

export type NeedView = NeedFields & {
  readonly needId: string;
  readonly organizationId: string;
  readonly intakeStage: IntakeStage;
  readonly submittedAt: string | null;
  readonly causeLabels: readonly [];
  readonly reference: ReferenceDeclaration | null;
  readonly disclosure: Disclosure;
};

export type NeedIntakeArgs = {
  readonly p_account_id: string;
  readonly p_organization_id: string;
  readonly p_verb: IntakeVerb;
  readonly p_need_id: string | null;
  readonly p_title: string | null;
  readonly p_description: string | null;
  readonly p_urgency: string | null;
  readonly p_reference_original_name: string | null;
  readonly p_reference_byte_length: number | null;
  readonly p_reference_media_hint: string | null;
};

export function decideNeedIntake(input: AccountWriteRouteInput): WriteRouteDecision<NeedIntakeArgs>;
export function renderNeedIntake(value: unknown): NeedView;

export function transitionIntakeStage(
  from: IntakeStage | null, // null = no row yet
  verb: IntakeVerb,
): { ok: true; to: IntakeStage | null } | { ok: false; kind: 'invalid-request'; reason: string };
// start: null -> draft
// patch | attach | read: draft -> draft, discovery_in_progress -> discovery_in_progress
// submit: draft -> discovery_in_progress, discovery_in_progress -> discovery_in_progress (idempotent)

export function applyIntakeVerb(
  current: NeedRow | null,
  args: NeedIntakeArgs,
  nowIso: string,
): { ok: true; row: NeedRow; snapshot: IntakeSnapshot | null } | { ok: false; kind: WriteRefusalKind; reason: string };
// Loop Maps run this after writePipeline. SQL mirrors it. Snapshot is non-null only on first submit.

export type IntakeSnapshot = {
  readonly needId: string;
  readonly organizationId: string;
  readonly title: string;
  readonly description: string;
  readonly urgency: Urgency | null;
  readonly reference: ReferenceDeclaration | null;
};
```

`decideNeedIntake` (request-shaped only):

1. Target org required; else `invalid-request` 400.
2. `orgExists`; else `no-such-organisation` 409.
3. `orgAdminActionAllowed(standing.orgRole)`; else that kind at 403.
4. Any `FORBIDDEN_INTAKE_KEYS` present; else `invalid-request` 400.
5. `verb` in `INTAKE_VERBS`; else `invalid-request` 400.
6. `start`: no `needId`; non-empty title; optional description; optional urgency in vocab; reference ignored.
7. Other verbs: `needId` present and UUID-shaped; else `invalid-request` 400.
8. `patch`: at least one of title, description, urgency may be present; each present field validated; omitted → null args.
9. `attach`: `reference.originalName` non-empty, `byteLength` a positive integer, `mediaHint` in vocab.
10. `submit`: run `SUBMIT_GATES` on the body fields (description first). Empty description → `description-required` 409. Then accept title/description/urgency as a last merge.
11. `read`: ids only.

`decide` does not look up the need. Existence and stage apply are `applyIntakeVerb` / SQL.

### Definer

```sql
create function public.need_intake(
  p_account_id uuid,
  p_organization_id uuid,
  p_verb text,
  p_need_id uuid default null,
  p_title text default null,
  p_description text default null,
  p_urgency text default null,
  p_reference_original_name text default null,
  p_reference_byte_length integer default null,
  p_reference_media_hint text default null
) returns jsonb
language plpgsql
security definer
set search_path = ''
```

Returns snake_case jsonb of the need row (`id`, `org_id`, `title`, `description`, `urgency`, `intake_stage`, `submitted_at`, `sensitivity_class`, the four reference columns). `renderNeedIntake` maps to `NeedView` and adds `causeLabels: []` plus `disclosureFor(sensitivity_class)`.

SQL DETAIL values this definer raises:

| DETAIL | when |
|---|---|
| `account-deactivated` | `assert_account_active` |
| `no-such-organisation` | org lock misses |
| `not-a-member` | no membership row |
| `not-an-admin` | membership role is `member` |
| `no-such-need` | need missing or `org_id` mismatch |
| `invalid-request` | verb not in the five tokens (closed backstop) |
| `refused` | `has_platform_acknowledgment` is false on start |

SQL does **not** raise `description-required`.

Apply sketch (SQL mirrors `applyIntakeVerb`):

```
-- assert_account_active; lock org; re-check admin
-- start: require acknowledgment; insert draft; return row
-- else: lock need; org must match
-- patch: title = coalesce(p_title, title), same for description and urgency; updated_at = clock_timestamp()
-- attach: set the four reference columns; declared_at = clock_timestamp()
-- submit: merge provided fields;
--         if submitted_at is null then set intake_stage, submitted_at, append_audit_event
--         else do not append
-- read: return row
```

### Route

| | |
|---|---|
| Folder | `supabase/functions/need-intake/index.ts` |
| Inventory | `WRITE_ROUTES['need-intake'] = { surface: { kind: 'edge', rpc: 'need_intake' }, standing: { kind: 'account-required', admits: ['ngo'] } }` |
| JWT | `[functions.need-intake] verify_jwt = true` |
| Target | `organizationIdField` (`body.organizationId`) |
| `write_standing` | unchanged |

Request bodies:

```ts
type IntakeRequest =
  | { verb: 'start'; organizationId: string; title: string; description?: string; urgency?: Urgency }
  | { verb: 'patch'; organizationId: string; needId: string; title?: string; description?: string; urgency?: Urgency }
  | { verb: 'attach'; organizationId: string; needId: string; reference: { originalName: string; byteLength: number; mediaHint: MediaHint } }
  | { verb: 'submit'; organizationId: string; needId: string; title: string; description: string; urgency?: Urgency }
  | { verb: 'read'; organizationId: string; needId: string };
```

Response: `{ ok: true } & NeedView` or `{ ok: false, kind: WriteRefusalKind | 'unauthenticated', reason: string }`.

### Refusal kinds added to `WRITE_REFUSAL_KINDS`

- `description-required` — decide only. Reason: `need_intake refuses submit: the problem description is empty`.
- `no-such-need` — SQL / apply. Reason: `need_intake refuses <id>: no such need in this organisation`.

Existing kinds reused: `invalid-request`, `not-a-member`, `not-an-admin`, `not-an-ngo-account`, `no-such-organisation`, `account-deactivated`, `unauthenticated` (adapter, 401).

### `_shared` modules

One new module: `supabase/functions/_shared/need-intake.ts`. Exports listed above. Do not add `lifecycle.ts`. Do not add a helper named `deliver`. Index is the canonical eight-line `writeRoute` leaf.

`callerReads` does not grow. Reads are the `read` verb. Constraint 4 holds.

### Suite SUT contract (`tests/at/suites/req-003/_contract.ts`)

Type aliases only. Import `WriteRefusalKind`, `Decision` if needed, `NeedView`, `IntakeVerb`, `Disclosure`, `IntakeSnapshot` from `need-intake.ts`.

```ts
export type IntakeOutcome = { ok: true } & NeedView | WriteRefusal;

export type NeedsSut = {
  provisionNgo(email: string, opts: { emailVerified: boolean }): Promise<NgoActor>;
  provisionVolunteer(email: string): Promise<Session>;
  provisionPlatformAdmin(email: string): Promise<Session>;
  setMembershipRoleAsOperator(organizationId: string, accountId: string, role: 'admin' | 'member'): Promise<void>;
  readAllowance(session: Session | null, organizationId: string): Promise<AllowanceOutcome>;

  intake(session: Session | null, request: IntakeRequest & Record<string, unknown>): Promise<IntakeOutcome>;
  needAsOperator(needId: string): Promise<NeedRow | null>;
  classifyNeedAsOperator(needId: string, sensitivityClass: 'tier-2'): Promise<void>;
  editNeedWorkingContentAsOperator(needId: string, fields: Partial<NeedFields>): Promise<void>;
  intakeSnapshotAsOperator(needId: string): Promise<IntakeSnapshot | null>;
};
```

Loop: compose the REQ-002 fixture. `intake` runs `writePipeline(NEED_INTAKE_SPEC, …)` then `applyIntakeVerb` over a `Map<needId, NeedRow>` and an array of snapshots. Integration: `functionPost(stack, 'need-intake', body, bearer)` and `sqlClient` for operator members.

`bindSuite({ requirement: 'req-003', sut: 'needs' })`.

Register `'req-003': typeof import('../suites/req-003/_fixture.ts')` in `AdapterModules`. Both adapters export `requirement = 'req-003' as const`.

### Red set

| id | loop | integration | capability | reason |
|---|---|---|---|---|
| AT-003.01 | green | green | — | |
| AT-003.02 | green | green | — | |
| AT-003.03 | green | green | — | |
| AT-003.04 | green | green | — | |
| AT-003.05 | green | green | — | |
| AT-003.17 | green | green | — | |
| AT-003.07 | green | **red** | `storage.reference-upload` | metadata attach is proved; a file never leaves the test |
| AT-003.09 | green | green | — | served copy; pixels wait on the wiring leaf's wired re-run, no new id |
| AT-003.10 | green | green | — | stubbed class plus served copy |
| AT-003.11 | green | green | — | local `intake_stage` |
| AT-003.12 | green | green | — | local `intake_stage` |
| AT-003.14 | green | green | — | |
| AT-003.16 | green | green | — | |

`AWAITED.referenceUpload = 'storage.reference-upload'`.

Honest green count: **13 / 13 loop, 12 / 13 integration**. One red.

I disagree with the grounding note that .11/.12 wait on the engine, and that .09/.10 wait on UI plus the classification event. The brief tells this run to stub classification, to land a local transition or declare red, and to prove the copy the route serves. A local stage on `needs` is legal under constraint 11. Fewer reds here are honest, not optimistic.

### Manifest `tests/at/expected/req-003.json`

```json
{
  "requirement": "003",
  "tiers": {
    "loop": {
      "green": [
        "AT-003.01", "AT-003.02", "AT-003.03", "AT-003.04", "AT-003.17",
        "AT-003.05", "AT-003.07", "AT-003.09", "AT-003.10",
        "AT-003.11", "AT-003.12", "AT-003.14", "AT-003.16"
      ],
      "red": {}
    },
    "integration": {
      "green": [
        "AT-003.01", "AT-003.02", "AT-003.03", "AT-003.04", "AT-003.17",
        "AT-003.05", "AT-003.09", "AT-003.10",
        "AT-003.11", "AT-003.12", "AT-003.14", "AT-003.16"
      ],
      "red": {
        "AT-003.07": { "kind": "capability-pending", "capabilities": ["storage.reference-upload"] }
      }
    }
  }
}
```

### Suite files

- `tests/at/suites/req-003/_bind.ts`
- `_contract.ts`
- `_fixture.ts`
- `_live.ts`
- `_pending.ts`
- `_source-intake.ts` (throws if it cannot read; pins disclosure copy against the module; pins that `decideNeedIntake` refuses `cause`; empty list is the assertion)
- `a-capture.test.ts` (.01 .02 .04)
- `b-description-autosave.test.ts` (.03 .05)
- `c-labels.test.ts` (.17)
- `d-reference.test.ts` (.07 .09 .10)
- `e-submit.test.ts` (.11 .12)
- `f-snapshot.test.ts` (.14 .16)
- `tests/at/expected/req-003.json`
- `tests/at/harness/req003-intake-oracles.selftest.ts`
- `tests/at/harness/suite-adapters.ts` (one line)

Thirteen `atTest` call sites. None for 06, 08, 13, 15. Nothing under `src/`.

### Diff size

2 migrations, 1 route, 1 definer, 1 `_shared` module, 2 refusal kinds, 1 catalog row, 1 config block, ~12 suite files, 1 selftest, 1 adapter-map line. `callerReads` unchanged. `write_standing` unchanged. No stand-in. No notification. No bucket.

### Fit for what comes later

| later surface | this run keeps | this run deletes when it arrives |
|---|---|---|
| Lifecycle engine | tokens `draft`, `discovery_in_progress`; `submitted_at` | column `intake_stage`, helper `transitionIntakeStage`; may replace `need_intake` so submit can debit credits |
| Storage primitive | attach verb, declaration shape (name, length, hint) | four `reference_*` columns, replaced by a list table the attachments requirement owns |
| Label producer | `causeLabels: []` on the view | nothing; it adds a table or column and changes `renderNeedIntake` |
| Classification event | `sensitivity_class` and `disclosureFor` | the column, if the event table supersedes it |
| Wiring leaf | one POST, `NeedView` | nothing |

### Constraint compliance

All thirty hold. None bent.

The lane's honest break is not a constraint break: SQL does not raise `description-required`, and `decide` cannot see the stored row, so the stage machine sits in `applyIntakeVerb` rather than in `decide`. Reads run as the service role through the definer, so RLS is not the read backstop. Membership is re-checked on every verb, including `read`.

## Synthesis decision

*(arena fills this.)*

## Tradeoffs accepted

- We accept one verb-dispatch definer in exchange for one caller URL. The lifecycle engine will likely replace that function when submit must debit credits in the same transaction.
- We accept that `decide` cannot see the stored need, in exchange for not growing `write_standing`. Submit therefore carries the current fields so the description gate stays in TypeScript.
- We accept service-role reads in exchange for not adding a second route and not extending `callerReads`.
- We accept no join to `projects` in exchange for not making drafts world-public and not putting a stage column on a project-named table.
- We accept metadata-only attach in exchange for not turning the NGO-profile document oracle red. Integration AT-003.07 stays red.
- We accept a CHECK, not a SQL refusal kind, as the last line against an empty submitted description, in exchange for keeping that gate in `SUBMIT_GATES` only.
- We accept last-write-wins autosave with no occupancy, in exchange for no clock and no revision protocol.
- We accept `causeLabels: []` as a derived empty list with no column, in exchange for a draft that cannot carry a label even under operator SQL.

## Alternatives considered

- **Need as a `projects` row.** Rejected. Product creation is not landed. Drafts would be world-readable. A stage column on that table fails the absence oracle. Interface would look small and would leak the seat table into intake.
- **One route per verb (`start-need`, `patch-need`, …).** Rejected. The wiring leaf would coordinate several methods for one operation (shallow). Each route would repeat admin, lock, and org re-check. It hides less than one `decide` with a verb table.
- **Fat SQL that re-judges description, urgency, and stage.** Rejected by this lane. It would duplicate `SUBMIT_GATES` and hide policy in a language the loop Maps cannot run. The scan still requires the security backstops; it does not require SQL to own product gates.
- **AT-003.11 and .12 red on `lifecycle.transition-engine`.** Rejected. A local `intake_stage` on `needs` is legal, keeps both ids honest-green, and leaves a named deletion for the engine. Red here would wait on a surface this table can already express.
- **Own snapshot table.** Rejected. `audit_events` is already immutable and already operator-retrievable. A second immutability device is extra surface for the same fact.
- **Disclosure as a flag.** Rejected. The screen would own the words, and this run has no screen. Copy on the view is the deeper interface: one constant, loop-pinnable, wiring-leaf-ready.

## Open questions and risks

- If the founder wants AT-003.09 and AT-003.10 red until pixels exist, the capability name is `ui.intake-upload-surface`. This design treats served copy as this run's full proof. Should that call stand?
- When the lifecycle engine adds email and capacity gates, should they become new rows in `SUBMIT_GATES` on this same route, or should submit move to a new engine route so `need_intake` stays the draft editor only?
- `provisionNgoSession` is not in the NGO-profile SUT. The live adapter can sign the same user in a second time. Is a second `passwordGrant` enough for AT-003.05, or does the suite need an explicit re-login helper on `NeedsSut`?

## Next implementation step

Land migration `20260917110000` plus `20260917120000`, the `need-intake` inventory row, and `decideNeedIntake` far enough that AT-003.01, .02, and .04 run green at loop over Maps.

## Per-unit plan

### Unit 1 — capture title, description, urgency; only the NGO admin starts a need

- **Lane:** hardest tasks (astra at medium). The writer still places the table, the one route, and the start/read apply.
- **Ids:** AT-003.01, .02, .04. Green at loop and integration.
- **Files:** both migrations; `TENANT_CATALOG`; `WRITE_ROUTES` + `WRITE_REFUSAL_KINDS` (`no-such-need` at least); `supabase/functions/_shared/need-intake.ts` (verbs, types, `decideNeedIntake` start/patch/read, `renderNeedIntake`, `applyIntakeVerb` start/patch/read); `supabase/functions/need-intake/index.ts`; `config.toml` block; suite skeleton (`_bind`, `_contract`, `_fixture`, `_live`, `_pending`, `_source-intake`, selftest, `suite-adapters`, `expected/req-003.json`); `a-capture.test.ts`.
- **Tables / SQL / route / module / kinds:** `needs`; `need_intake`; `need-intake`; `need-intake.ts`; existing admin kinds plus `no-such-need`.

### Unit 2 — missing-description block, isolated; autosave

- **Lane:** feature (astra at low). Contract is `SUBMIT_GATES` plus patch merge.
- **Ids:** AT-003.03, .05. Green at both tiers.
- **Files:** `SUBMIT_GATES` and submit branch in `decideNeedIntake`; `description-required` kind; patch merge already in unit 1 completed if needed; `_live.ts` second-session login; `b-description-autosave.test.ts`.
- **No new table or route.**

### Unit 3 — pre-Discovery draft carries zero cause labels

- **Lane:** feature (astra at low).
- **Ids:** AT-003.17. Green at both tiers.
- **Files:** `FORBIDDEN_INTAKE_KEYS` + `causeLabels: []` in render (may already be in unit 1); `_source-intake.ts` pin; `c-labels.test.ts`.
- **No producer. No column.**

### Unit 4 — optional reference attach, base disclosure

- **Lane:** hardest tasks (astra at medium). Metadata shape and the integration red still need a careful hand.
- **Ids:** AT-003.07 loop green, integration red `storage.reference-upload`. AT-003.09 green at both tiers.
- **Files:** attach branch; four columns (already in the unit 1 migration — land them empty in unit 1, write them here); `DATA_RESPONSIBILITY.base`; `d-reference.test.ts`; `_pending.ts` `AWAITED.referenceUpload`.
- **No storage API. No forbidden names.**

### Unit 5 — Tier-2 hardened disclosure before any further upload

- **Lane:** feature (astra at low).
- **Ids:** AT-003.10. Green at both tiers.
- **Files:** `classifyNeedAsOperator`; `disclosureFor`; rest of `d-reference.test.ts`.
- **Stub column already in the unit 1 migration.**

### Unit 6 — submit starts Discovery, with or without a file

- **Lane:** hardest tasks (astra at medium). Idempotent submit and what the engine later deletes still need a careful hand.
- **Ids:** AT-003.11, .12. Green at both tiers.
- **Files:** `transitionIntakeStage`; submit arm in `applyIntakeVerb` and SQL; `e-submit.test.ts`. Still no debit and no email gate.

### Unit 7 — raw-intake snapshot, unchanged under later edits

- **Lane:** feature (astra at low).
- **Ids:** AT-003.14, .16. Green at both tiers.
- **Files:** `append_audit_event` on first submit (enum already in the first migration); `intakeSnapshotAsOperator`; `f-snapshot.test.ts`.
- **No new table.**