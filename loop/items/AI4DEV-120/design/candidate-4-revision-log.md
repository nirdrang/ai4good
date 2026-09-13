# Candidate 4: the need intake as an append-only revision log

Structural direction: the need's content is never updated in place. Every autosave appends a row. The current draft is the latest row. Submission pins the row that was submitted, and the log prefix up to that pin is the raw-intake snapshot. Nothing updates a revision, so the snapshot cannot change. Reads fold the log into one draft object. Every path below is relative to the worktree root.

## Problem

REQ-003 needs a place for a draft need, a write path for autosave, an admin gate, a description gate isolated from every other gate, a reference-file attach with a disclosure that hardens on a Tier-2 classification, a submission that moves the need into Discovery, and a raw-intake snapshot that later edits cannot touch. The tree has none of it, and the frame is strict: every write is one `Deno.serve(writeRoute(...))` over one SECURITY DEFINER function that calls `assert_account_active`; every new table joins the tenant posture and `TENANT_CATALOG`; `projects` is the developer seat, is world-readable by id through `public-project`, and may carry no `state`, `status` or `lifecycle` column (constraint 11); no column may hold document bytes or a storage key (constraint 12); `write_standing` carries no need id, so the definer must re-check the need's organisation under a row lock (constraint 5); the lifecycle engine, the storage primitive, the Tier-2 classifier and the cause-label producer all belong to other requirements. The thirty constraints in `loop/items/AI4DEV-120/how/explanation.md` bind this design. The shape below honours every one; the one place it bends is named in "Where the log shape breaks".

The non-obvious part is the snapshot. An aggregate row plus a copy in `audit_events` gives two statements of the intake and a copy that can drift from its source. A log gives one statement: the rows are the intake, and the snapshot is a pointer into them. That is the bet this candidate makes, and it pays for it with a head table it must still keep and a read that folds rows instead of selecting one.

## Usage (caller's view)

The wiring leaf's screen sees four calls and one object. It never sees a revision.

```ts
// The autosave. The first call carries no needId and creates the need; every later call carries it.
// The body is the whole form, every time. The answer says whether a row was appended.
POST /functions/v1/save-need-draft
  { organizationId, needId?, title, description, urgency }            // urgency: 'soon' | 'this-quarter' | 'no-deadline' | null
  -> { ok: true, needId, revisionId, seq, appended, stage }           // stage: 'draft' | 'discovery_in_progress'
  -> { ok: false, kind, reason }                                      // not-an-admin, not-a-member, not-an-ngo-account, no-such-need, invalid-request, ...

// The reference file, by name. No bytes travel here; REQ-032 owns the bytes.
POST /functions/v1/add-need-reference
  { organizationId, needId, fileName, mediaType, byteSize, note? }
  -> { ok: true, needId, revisionId, seq, disclosure }                // disclosure: the copy the upload surface shows now

// The submission. It carries the form as it stands, so the last keystroke and the pin are one write.
POST /functions/v1/submit-need
  { organizationId, needId, title, description, urgency }
  -> { ok: true, needId, stage: 'discovery_in_progress', submittedRevisionId, submittedAt, changed }
  -> { ok: false, kind: 'description-missing' | 'title-missing' | ..., reason }

// The draft, folded. This is what the screen renders.
POST /functions/v1/need-draft
  { needId }
  -> { ok: true, needId, organizationId, stage, title, description, urgency,
       causeLabels: [], references: [{ revisionId, seq, fileName, mediaType, byteSize, note, addedAt, addedByAccountId }],
       sensitivityTier, disclosure: { level, acknowledgmentRequired, heading, body, acknowledgment },
       submittedRevisionId, submittedAt }
  -> 404 { ok: false, reason: 'no such thing is visible to this caller' }
```

The seven unit call sites, in test form. `sut` is `harness.sut.needIntake`; `w.email` is the world's address.

```ts
// Unit 1 — AT-003.01: any NGO admin, even unverified and unvetted, starts a need with a title and a description.
const ngo = await sut.provisionNgo(w.email('ngo-01'), { emailVerified: false });
const saved = await sut.saveDraft(ngo.session, { organizationId: ngo.organizationId, title: 'Grant deadline dashboard', description: 'We miss reporting deadlines because the tracker lives in six inboxes.', urgency: null });
expect(saved).toMatchObject({ ok: true, appended: true, seq: 1, stage: 'draft' });
if (!saved.ok) return;
const draft = await sut.draft(ngo.session, saved.needId);
expect(draft.ok).toBe(true);
if (!draft.ok) return;
expect(draft.value.title).toBe('Grant deadline dashboard');
expect(draft.value.description).toMatch(/six inboxes/);

// Unit 1 — AT-003.02: urgency persists and renders on the draft; a second save changes it.
await sut.saveDraft(ngo.session, { organizationId, needId, title, description, urgency: 'this-quarter' });
expect((await sut.draft(ngo.session, needId)).value.urgency).toBe('this-quarter');
await sut.saveDraft(ngo.session, { organizationId, needId, title, description, urgency: 'soon' });
expect((await sut.draft(ngo.session, needId)).value.urgency).toBe('soon');

// Unit 1 — AT-003.04: a member, a volunteer and a visitor are refused; the gate is the admin role.
await sut.setMembershipRoleAsOperator(ngo.organizationId, ngo.accountId, 'member');
expect(await sut.saveDraft(ngo.session, start)).toMatchObject({ ok: false, kind: 'not-an-admin', status: 403 });
expect(await sut.saveDraft(volunteer, start)).toMatchObject({ ok: false, kind: 'not-an-ngo-account', status: 403 });
expect(await sut.saveDraft(null, start)).toMatchObject({ ok: false, kind: 'unauthenticated', status: 401 });

// Unit 2 — AT-003.03: a verified admin with capacity, a full title and urgency, and a blank description, is blocked by the description gate alone.
const ngo = await sut.provisionNgo(w.email('ngo-03'), { emailVerified: true });
const allowance = await sut.readAllowance(ngo.session, ngo.organizationId);
expect(allowance.ok && allowance.allowance.remaining > 0, 'the Given: Discovery capacity').toBe(true);
const saved = await sut.saveDraft(ngo.session, { organizationId, title: 'Volunteer roster', description: '', urgency: 'soon' });
const blocked = await sut.submit(ngo.session, { organizationId, needId: saved.needId, title: 'Volunteer roster', description: ' ', urgency: 'soon' });
expect(blocked).toMatchObject({ ok: false, kind: 'description-missing' });
expect((await sut.draft(ngo.session, saved.needId)).value.stage).toBe('draft');
const definer = await sut.attemptSubmitAsOperator({ accountId: ngo.accountId, request: { organizationId, needId: saved.needId, title: 'Volunteer roster', description: '', urgency: 'soon' } });
expect(definer).toMatchObject({ ok: false, kind: 'description-missing' });

// Unit 2 — AT-003.05: content typed with no save action survives a new session; an identical autosave appends nothing.
await sut.saveDraft(ngo.session, { organizationId, needId, title: 'Volunteer roster', description: 'We schedule', urgency: null });
const twice = await sut.saveDraft(ngo.session, { organizationId, needId, title: 'Volunteer roster', description: 'We schedule', urgency: null });
expect(twice).toMatchObject({ ok: true, appended: false });
const again = await sut.signInAgain(ngo);
const back = await sut.draft(again, needId);
expect(back.ok && back.value.description).toBe('We schedule');

// Unit 3 — AT-003.17: a fresh draft carries zero cause labels through the API.
expect((await sut.draft(ngo.session, needId)).value.causeLabels).toEqual([]);

// Unit 4 — AT-003.07 and AT-003.09: a reference attaches to the draft; the read and the upload answer carry the base disclosure.
const added = await sut.addReference(ngo.session, { organizationId, needId, fileName: 'grants-tracker.xlsx', mediaType: 'text/csv', byteSize: 2048, note: 'Sample rows of the tracker' });
expect(added).toMatchObject({ ok: true, seq: 2, disclosure: BASE_REFERENCE_DISCLOSURE });
const draft = await sut.draft(ngo.session, needId);
expect(draft.value.references.map((r) => r.fileName)).toEqual(['grants-tracker.xlsx']);
expect(draft.value.disclosure).toEqual(BASE_REFERENCE_DISCLOSURE);
expect(draft.value.disclosure.body).toMatch(/redacted or sample data only/i);
expect(draft.value.disclosure.body).toMatch(/ai4good and .*volunteer/i);

// Unit 5 — AT-003.10: after the classification row lands, the next read is already hardened, before any further upload.
await sut.classifyTier2AsOperator(needId);
const hardened = await sut.draft(ngo.session, needId);
expect(hardened.value.disclosure).toEqual(TIER2_REFERENCE_DISCLOSURE);
expect(hardened.value.disclosure.acknowledgmentRequired).toBe(true);

// Unit 6 — AT-003.11 and AT-003.12: a complete draft, no file or one file, submits; the stage moves; a second submit changes nothing.
const submitted = await sut.submit(ngo.session, { organizationId, needId, title, description, urgency: 'soon' });
expect(submitted).toMatchObject({ ok: true, stage: 'discovery_in_progress', changed: true });
const second = await sut.submit(ngo.session, { organizationId, needId, title, description, urgency: 'soon' });
expect(second).toMatchObject({ ok: true, changed: false, submittedRevisionId: submitted.submittedRevisionId });

// Unit 7 — AT-003.14 and AT-003.16: the snapshot equals the submitted intake; NGO edits and a direct write leave it unchanged.
const snapshot = await sut.intakeSnapshot(needId);
expect(snapshot).toMatchObject({ title, description, urgency: 'soon', submittedRevisionId: submitted.submittedRevisionId });
await sut.saveDraft(ngo.session, { organizationId, needId, title: 'Renamed after Discovery began', description, urgency: 'soon' });
await sut.addReference(ngo.session, { organizationId, needId, fileName: 'later.csv', mediaType: 'text/csv', byteSize: 10 });
expect(await sut.intakeSnapshot(needId)).toEqual(snapshot);
const tamper = await sut.attemptRevisionUpdateAsOperator(snapshot.submittedRevisionId, { title: 'tampered' });
expect(tamper.ok).toBe(false);
expect(await sut.intakeSnapshot(needId)).toEqual(snapshot);
```

## Shape

### Data structures

Two tables. One head, one log. The head is identity and the pin; the log is everything else.

```sql
-- supabase/migrations/20260917120000_need_intake_log.sql (one file, grown by each unit before merge, never edited after)

create table public.needs (
  id                    uuid primary key default gen_random_uuid(),
  org_id                uuid not null references public.organizations (id) on delete restrict,
  started_by_account_id uuid not null references public.accounts (id) on delete restrict,
  started_at            timestamptz not null default now(),
  submitted_revision_id uuid,           -- THE PIN. Null while a draft. Set once. FK added after the log exists.
  submitted_at          timestamptz,    -- the instant of the pin, set in the same statement
  constraint needs_pin_and_instant_together check ((submitted_revision_id is null) = (submitted_at is null)),
  constraint needs_id_org unique (id, org_id)
);

create table public.need_revisions (
  id                    uuid primary key default gen_random_uuid(),
  need_id               uuid not null,
  org_id                uuid not null,                       -- denormalised so the policy and the reads need no join
  seq                   integer not null,                    -- assigned by trigger, never supplied
  kind                  text not null,                       -- 'content' | 'reference' | 'classification'
  written_by_account_id uuid references public.accounts (id) on delete restrict,   -- null = the platform (operator stub today, Discovery agent later)
  written_at            timestamptz not null default now(),
  title                 text,            -- content
  description           text,            -- content; '' is "not typed yet"
  urgency               text,            -- content; null is "not chosen yet"
  file_name             text,            -- reference (metadata only; no bytes, no storage key: constraint 12)
  media_type            text,            -- reference
  byte_size             integer,         -- reference
  note                  text,            -- reference, optional
  sensitivity_tier      text,            -- classification
  constraint need_revisions_need_org foreign key (need_id, org_id) references public.needs (id, org_id) on delete restrict,
  constraint need_revisions_one_seq unique (need_id, seq),
  constraint need_revisions_id_need unique (id, need_id),
  constraint need_revisions_seq_positive check (seq > 0),
  constraint need_revisions_kind check (kind in ('content', 'reference', 'classification')),
  constraint need_revisions_shape check (
       (kind = 'content' and written_by_account_id is not null
          and title is not null and description is not null
          and (urgency is null or urgency in ('soon', 'this-quarter', 'no-deadline'))
          and file_name is null and media_type is null and byte_size is null and note is null and sensitivity_tier is null)
    or (kind = 'reference' and written_by_account_id is not null
          and file_name ~ '[^[:space:]]' and media_type ~ '[^[:space:]]' and byte_size > 0
          and title is null and description is null and urgency is null and sensitivity_tier is null)
    or (kind = 'classification'
          and sensitivity_tier ~ '[^[:space:]]'
          and title is null and description is null and urgency is null
          and file_name is null and media_type is null and byte_size is null and note is null)
  )
);

-- The pin can only name a revision of its own need. Structure, not a check somebody remembers.
alter table public.needs
  add constraint needs_pin_is_own_revision
  foreign key (submitted_revision_id, id) references public.need_revisions (id, need_id);

create index needs_org_id_idx on public.needs (org_id);
```

The log is one table with three row kinds and one CHECK per kind, the sum-type-in-a-row shape `org_vetting` already uses for its registration metadata. One table means one sequence, and one sequence is what makes the snapshot boundary a single number.

Three triggers make the invariants structural:

```sql
-- 1. Nothing updates or deletes a revision. Same shape as audit_events.
create function public.need_revisions_are_append_only() returns trigger language plpgsql set search_path = '' as $$
begin
  raise exception 'public.need_revisions is append-only: % is refused — the raw intake is retained for audit (REQ-003, AT-003.16)', tg_op
    using errcode = '42501';
end; $$;
create trigger need_revisions_no_update_or_delete before update or delete on public.need_revisions for each row execute function public.need_revisions_are_append_only();
create trigger need_revisions_no_truncate before truncate on public.need_revisions for each statement execute function public.need_revisions_are_append_only();

-- 2. seq is assigned, monotone per need. A row cannot land below the pin after the fact.
create function public.need_revisions_assign_seq() returns trigger language plpgsql set search_path = '' as $$
begin
  new.seq := coalesce((select max(r.seq) from public.need_revisions r where r.need_id = new.need_id), 0) + 1;
  return new;
end; $$;
create trigger need_revisions_seq_is_assigned before insert on public.need_revisions for each row execute function public.need_revisions_assign_seq();

-- 3. The pin is set once. A second pin, or a moved instant, is refused.
create function public.needs_pin_is_set_once() returns trigger language plpgsql set search_path = '' as $$
begin
  if old.submitted_revision_id is not null
     and (new.submitted_revision_id is distinct from old.submitted_revision_id or new.submitted_at is distinct from old.submitted_at) then
    raise exception 'needs refuses a second submission pin on need %: the raw intake was pinned at %', old.id, old.submitted_at
      using errcode = '42501';
  end if;
  if new.org_id <> old.org_id or new.started_by_account_id <> old.started_by_account_id then
    raise exception 'needs refuses moving need % to another organisation or starter', old.id using errcode = '42501';
  end if;
  return new;
end; $$;
create trigger needs_pin_once before update on public.needs for each row execute function public.needs_pin_is_set_once();
-- each trigger function: revoke execute from public, as the projects trigger does
```

Posture, in the same migration (constraint 9): `revoke all` on both tables from `anon, authenticated, service_role`; `enable row level security` on both; `grant select` on both to `authenticated`; one policy per table `for select to authenticated using (public.viewer_is_org_member(org_id))`; and two rows in `TENANT_CATALOG`: `needs: 'tenant-isolated'`, `need_revisions: 'tenant-isolated'`. No fourth `viewer_` helper (constraint 10). `service_role` holds no privilege on either table; the definers run as owner.

The word "attachment" never appears in the migration, not even inside a string. The document oracle's column regex matches `attachment` followed by a space anywhere in a statement (`_source-documents.ts` line 45), and a `comment on` string would trip it.

**Invariants encoded in structure.** The snapshot cannot change: rows never update (trigger 1), later rows carry a larger seq (trigger 2), and the pin never moves (trigger 3). The pin names a row of its own need (composite FK). A revision belongs to the need's organisation (composite FK on `(need_id, org_id)`). A row is exactly one kind with exactly that kind's columns (the shape CHECK). Autosave twice converges: the definer compares the incoming content with the latest content row under the head lock and appends nothing when equal. Submit twice is safe: the definer sees the pin and returns it. The description gate is isolated from verification and capacity by construction: the submit path reads neither `auth.users.email_confirmed_at` nor `discovery_spend`; no other gate exists on that path in this run. A pre-Discovery draft cannot carry a label: no column, no row kind and no route can express one; `NeedView.causeLabels` is typed `readonly []`.

### The fold

```ts
// supabase/functions/_shared/need-intake.ts — pure, relative imports only, no Deno, no I/O

export const URGENCIES = ['soon', 'this-quarter', 'no-deadline'] as const;
export type Urgency = (typeof URGENCIES)[number];
export function parseUrgency(raw: unknown): Urgency | null;                 // null for null, undefined and every unknown value

export type NeedStage = 'draft' | 'discovery_in_progress';

/** The head row as PostgREST or postgres.js hands it over. */
export type NeedHeadRow = {
  id: string; org_id: string; started_by_account_id: string; started_at: string | Date;
  submitted_revision_id: string | null; submitted_at: string | Date | null;
};

/** One log row, parsed into its kind at the boundary. The shape CHECK guarantees exactly one arm fits. */
export type NeedRevisionRow =
  | { kind: 'content'; id: string; need_id: string; org_id: string; seq: number; written_by_account_id: string; written_at: string | Date;
      title: string; description: string; urgency: Urgency | null }
  | { kind: 'reference'; id: string; need_id: string; org_id: string; seq: number; written_by_account_id: string; written_at: string | Date;
      file_name: string; media_type: string; byte_size: number; note: string | null }
  | { kind: 'classification'; id: string; need_id: string; org_id: string; seq: number; written_by_account_id: string | null; written_at: string | Date;
      sensitivity_tier: string };

export function parseNeedHeadRow(raw: unknown): NeedHeadRow;               // throws on a shape that is not a head row
export function parseNeedRevisionRow(raw: unknown): NeedRevisionRow;       // throws on a row that fits no kind

export type NeedContent = { readonly title: string; readonly description: string; readonly urgency: Urgency | null };

export type NeedReference = {
  revisionId: string; seq: number; fileName: string; mediaType: string; byteSize: number; note: string | null;
  addedAt: string; addedByAccountId: string;
};

/** What the screen renders. The log never leaves this module. */
export type NeedView = {
  needId: string; organizationId: string; stage: NeedStage;
  title: string; description: string; urgency: Urgency | null;
  /** No representation of a cause label exists before Discovery. The type says so. REQ-004 widens it. */
  causeLabels: readonly [];
  references: readonly NeedReference[];
  sensitivityTier: string | null;
  disclosure: ReferenceDisclosure;
  submittedRevisionId: string | null; submittedAt: string | null;
};

/** draft while the pin is null; discovery_in_progress once it is set. The one place the stage is stated. */
export function needStageOf(head: Pick<NeedHeadRow, 'submitted_revision_id'>): NeedStage;

/**
 * Fold rows into the draft. Precondition: `rows` holds the need's latest content row and every non-content
 * row (the edge passes exactly that; the fixture passes the whole log). Content = the content row with the
 * greatest seq; references = reference rows in seq order; sensitivityTier = the classification row with the
 * greatest seq, or null; disclosure = referenceDisclosureFor(sensitivityTier). Throws when no content row is
 * present: the create arm writes seq 1 in the same transaction as the head, so that is a broken invariant.
 */
export function foldNeed(head: NeedHeadRow, rows: readonly NeedRevisionRow[]): NeedView;

export type IntakeSnapshot = {
  needId: string; submittedRevisionId: string; submittedAt: string;
  title: string; description: string; urgency: Urgency | null;
  references: readonly NeedReference[];
};

/**
 * The raw intake as submitted: the fold of every row with seq <= the pinned row's seq. Null while a draft.
 * The pinned row is the content row submission appended, so its title, description and urgency are the
 * submitted content, and every reference added before submission has a smaller seq. Classification rows in
 * the prefix are ignored: they are not intake.
 */
export function intakeSnapshotOf(head: NeedHeadRow, rows: readonly NeedRevisionRow[]): IntakeSnapshot | null;

export function contentEquals(a: NeedContent, b: NeedContent): boolean;   // byte equality on title and description; urgency by value

/** Blank means no non-space character; NBSP counts as space, as every btrim in this tree does. */
export type SubmissionGate = { ok: true } | { ok: false; kind: 'title-missing' | 'description-missing'; reason: string };
export function submissionGate(content: NeedContent): SubmissionGate;
```

```ts
// supabase/functions/_shared/reference-disclosure.ts — the copy, shipped once

export type DisclosureLevel = 'base' | 'tier2-hardened';
export type ReferenceDisclosure = {
  readonly level: DisclosureLevel;
  readonly acknowledgmentRequired: boolean;
  readonly heading: string;
  readonly body: string;
  readonly acknowledgment: string | null;   // the checkbox sentence; null on the base level
};
export const BASE_REFERENCE_DISCLOSURE: ReferenceDisclosure;    // "Redacted or sample data only. Files here are seen by ai4good and by your volunteer once matched. Never upload real names, ..." (design/screens/reference-files.html line 23, first three sentences; the download sentence is REQ-032's)
export const TIER2_REFERENCE_DISCLOSURE: ReferenceDisclosure;   // heading and body from lines 29 to 32, acknowledgment from line 34
export function referenceDisclosureFor(sensitivityTier: string | null): ReferenceDisclosure;   // 'tier2' hardens; anything else is base
```

### Where immutability by construction beats an append-only audit row

An audit row is a copy. `set_organization_vetting` serialises the aggregate into `detail` jsonb by hand, field by field, and `vettingAuditCurrentFromDetail` parses it back by hand; the two are a second statement of the row shape, and a definer that forgets one field ships a snapshot that is quietly not the intake. The audit table also carries no schema for `detail`, so nothing in the database refuses a malformed snapshot. Here the snapshot is not a copy. The rows that hold the intake are the rows the pin names; the CHECK constraints that shape the intake shape the snapshot; and a serialisation bug cannot exist because there is no serialisation. Where the audit row wins: `audit_events` is already unreachable by client roles and its append-only triggers are already pinned by `scanAuditAppendOnly` in CI, while `need_revisions` must be tenant-readable and carries its own trigger that no standing scan covers. That gap is closed behaviourally: `attemptRevisionUpdateAsOperator` drives the trigger at both tiers in AT-003.16. It also costs one enum migration less: no `audit_event_kind` value is added, so this run has one migration file, not two.

### Is a head table needed

Yes, and it is not a cache. A pure log has no row to lock, and three things need the lock: seq assignment under two concurrent autosaves (without the head lock, two appends compute the same seq and one fails on the unique index instead of queueing); constraint 5's re-check that the need belongs to `body.organizationId` (`where id = p_need_id and org_id = p_organization_id for update`); and the pin, which is one field set once, and a field is what a trigger can guard. The head also anchors the composite FK every row carries and the tenant policy's `org_id`. What the head does not hold is content, a stage, or a current-revision pointer. The current draft is `max(seq) where kind = 'content'`, an index-backed point read, so there is no pointer to keep in sync. The stage is derived from the pin in one function, `needStageOf`.

### What the read surface costs

A draft read is three caller-bound GETs where an aggregate would need one: the head, the latest content row (`kind=eq.content&order=seq.desc&limit=1`), and the non-content rows (`kind=neq.content&order=seq.asc`). Cost is O(1 + references), not O(revisions): the unique index on `(need_id, seq)` serves the latest-content read backwards, and the facet read returns a handful of rows. The log itself grows by one row per changed autosave; the dedupe in `save_need_draft` keeps identical saves from appending, so the log measures edits, not debounce ticks. The snapshot read is O(prefix), which is the intake session's history; it is an operator read, not a screen read. The second cost is exposure: the tenant posture the tree mandates (constraint 4, `callerReads` with the caller's JWT) means an organisation's members can GET their own needs' whole revision history through PostgREST, not only the current draft. That is their own content, but it is more surface than one row.

### Where the log shape breaks

Against the posture scans: it does not break, but it bends in one place. `scanAuditAppendOnly` proves `audit_events` append-only in CI; nothing in CI proves `need_revisions` append-only. The trigger is the guarantee and AT-003.16's operator arm is the proof; a static arm could pin the trigger's existence but would cost a `_source-*.ts` file and a selftest, which this run does not add. Against the definer's row lock: the pure log breaks, so the head exists (above). Against the wiring leaf's screen: the screen must send the whole form on every autosave, not a changed field. A field patch would make the definer merge into the latest row under the lock, and two sessions patching different fields would produce a row neither session ever saw; whole-document rows make every row a real state and the fold trivial. The screen already holds the whole form, so this is a rule, not a burden. Against REQ-032: when the storage primitive lands, its storage key must not go on a `need_revisions` row (constraint 12 refuses `storage_key` and its siblings on any table); REQ-032 owns that narrowing, and the `reference` row keeps only what the disclosure needs.

### SQL definers

```sql
-- Every definer: security definer, set search_path = '', calls public.assert_account_active first, revoke execute from
-- public, anon, authenticated, service_role, then grant execute to service_role (constraint 7). Lock order in all
-- three: organisation (for share), membership (for share), need head (for update). None reads email confirmation
-- or discovery_spend; none calls append_audit_event or emit_notification.

create function public.save_need_draft(
  p_account_id uuid, p_organization_id uuid, p_need_id uuid,   -- p_need_id null = start a need
  p_title text, p_description text, p_urgency text
) returns jsonb;  -- { need_id, revision_id, seq, appended, submitted_revision_id, submitted_at }
-- TODO body:
--   assert_account_active; org for share else 23503 'no-such-organisation';
--   role for share: null -> 42501 'not-a-member'; <> admin -> 42501 'not-an-admin';
--   p_title or p_description null -> 22023 'invalid-request'; urgency outside the three -> 22023 'invalid-request';
--   p_need_id null:
--     not has_platform_acknowledgment(p_account_id) -> 42501 'no-platform-acknowledgment'   (constraint 18)
--     insert needs (org_id, started_by_account_id) returning id
--   else:
--     select from needs where id = p_need_id and org_id = p_organization_id for update else 23503 'no-such-need'   (constraint 5)
--     latest content row; if title = p_title and description = p_description and urgency is not distinct from p_urgency
--       -> return that row with appended false (autosave twice converges)
--   insert need_revisions (need_id, org_id, kind 'content', written_by_account_id, title, description, urgency) returning *
--   return with appended true

create function public.add_need_reference(
  p_account_id uuid, p_organization_id uuid, p_need_id uuid,
  p_file_name text, p_media_type text, p_byte_size integer, p_note text
) returns jsonb;  -- { need_id, revision_id, seq, sensitivity_tier }
-- TODO body: gates as above; blank name or type, or byte_size <= 0 -> 22023 'invalid-request'; need for update else 'no-such-need';
--   insert kind 'reference'; sensitivity_tier := latest classification row's tier or null; return

create function public.submit_need(
  p_account_id uuid, p_organization_id uuid, p_need_id uuid,
  p_title text, p_description text, p_urgency text
) returns jsonb;  -- { need_id, submitted_revision_id, submitted_at, changed }
-- TODO body: gates as above; need for update else 'no-such-need'; v_recorded_at := clock_timestamp() after the lock;
--   if pinned: append a content row when the content differs from the latest (an edit after submission, never lost),
--     return the existing pin with changed false (submit twice is safe)
--   p_title blank -> 22023 'title-missing'; p_description blank -> 22023 'description-missing'   (blank = no non-space char, NBSP included)
--   insert content row with written_at = v_recorded_at returning id (ALWAYS appended, so every earlier reference is inside the prefix)
--   update needs set submitted_revision_id = that id, submitted_at = v_recorded_at where id = p_need_id
--   return changed true

create function public.read_need_intake_snapshot(p_need_id uuid) returns jsonb
language sql stable security definer set search_path = '';
-- { head: {...}, revisions: [every row with seq <= the pinned row's seq, in seq order] } or null while a draft or for no such need.
-- The platform's retrieval handle. Stable, so the write-gate scan skips it; revoke from public, grant to service_role.
```

Refusal kinds added to `WRITE_REFUSAL_KINDS` (constraint 6): `no-such-need`, `no-platform-acknowledgment`, `title-missing`, `description-missing`. Exact DETAIL per definer:

| definer | DETAIL values it raises |
|---|---|
| `save_need_draft` | `no-such-organisation`, `not-a-member`, `not-an-admin`, `invalid-request`, `no-platform-acknowledgment`, `no-such-need`, and `account-deactivated` from `assert_account_active` |
| `add_need_reference` | `no-such-organisation`, `not-a-member`, `not-an-admin`, `invalid-request`, `no-such-need`, `account-deactivated` |
| `submit_need` | `no-such-organisation`, `not-a-member`, `not-an-admin`, `invalid-request`, `no-such-need`, `title-missing`, `description-missing`, `account-deactivated` |

### Routes

Three write routes, one read route. Each write route is ten lines, the `set-organization-profile` shape.

```ts
// supabase/functions/save-need-draft/index.ts
Deno.serve(writeRoute({ name: 'save-need-draft', target: organizationIdField, decide: decideSaveNeedDraft, render: renderSaveNeedDraft }));
// supabase/functions/add-need-reference/index.ts
Deno.serve(writeRoute({ name: 'add-need-reference', target: organizationIdField, decide: decideAddNeedReference, render: renderAddNeedReference }));
// supabase/functions/submit-need/index.ts
Deno.serve(writeRoute({ name: 'submit-need', target: organizationIdField, decide: decideSubmitNeed, render: renderSubmitNeed }));
// supabase/functions/need-draft/index.ts — the project-workspace shape: resolveCaller, readJsonBody, uuid check, needDraft(callerReads(...), needId)
```

`WRITE_ROUTES` gains three edge rows, each `{ surface: { kind: 'edge', rpc: '<definer>' }, standing: { kind: 'account-required', admits: ['ngo'] } }`. `supabase/config.toml` gains four `[functions.<name>]` blocks with `verify_jwt = true` (constraint 2).

```ts
// need-intake.ts, the decisions and renders

export type SaveNeedDraftArgs = { readonly p_account_id: string; readonly p_organization_id: string; readonly p_need_id: string | null;
  readonly p_title: string; readonly p_description: string; readonly p_urgency: Urgency | null };
/** target null -> invalid-request 400; orgAdminActionAllowed(standing.orgRole) -> 403 (constraint 8); needId present but not a uuid -> invalid-request 400;
 *  title or description not a string -> invalid-request 400; urgency not null and not parseable -> invalid-request 400. Never trims: the text is the NGO's text. */
export function decideSaveNeedDraft(input: AccountWriteRouteInput): WriteRouteDecision<SaveNeedDraftArgs>;
export type SaveNeedDraftRender = { needId: string | null; revisionId: string | null; seq: number | null; appended: boolean; stage: NeedStage };
export function renderSaveNeedDraft(value: unknown): SaveNeedDraftRender;   // stage = needStageOf({ submitted_revision_id })

export type AddNeedReferenceArgs = { readonly p_account_id: string; readonly p_organization_id: string; readonly p_need_id: string;
  readonly p_file_name: string; readonly p_media_type: string; readonly p_byte_size: number; readonly p_note: string | null };
/** Refuses any key outside { organizationId, needId, fileName, mediaType, byteSize, note } with invalid-request: file content is not a request field,
 *  and a body that carried bytes must be refused, not dropped (the set-organization-vetting precedent). */
export function decideAddNeedReference(input: AccountWriteRouteInput): WriteRouteDecision<AddNeedReferenceArgs>;
export type AddNeedReferenceRender = { needId: string | null; revisionId: string | null; seq: number | null; disclosure: ReferenceDisclosure };
export function renderAddNeedReference(value: unknown): AddNeedReferenceRender;   // disclosure = referenceDisclosureFor(value.sensitivity_tier)

export type SubmitNeedArgs = SaveNeedDraftArgs & { readonly p_need_id: string };
/** Same validation as save, then submissionGate(content): title-missing 400, description-missing 400. The definer re-raises both. */
export function decideSubmitNeed(input: AccountWriteRouteInput): WriteRouteDecision<SubmitNeedArgs>;
export type SubmitNeedRender = { needId: string | null; stage: NeedStage; submittedRevisionId: string | null; submittedAt: string | null; changed: boolean };
export function renderSubmitNeed(value: unknown): SubmitNeedRender;
```

```ts
// supabase/functions/_shared/tenant-reads.ts grows (constraint 4: the selectors live in callerReads inside edge.ts)
export type TenantReads = { /* existing four */
  need(needId: string): Promise<ReadResult<Record<string, unknown>>>;                 // needs?id=eq.X&select=id,org_id,started_by_account_id,started_at,submitted_revision_id,submitted_at
  needLatestContent(needId: string): Promise<ReadResult<Record<string, unknown>>>;    // need_revisions?need_id=eq.X&kind=eq.content&order=seq.desc&limit=1&select=*
  needFacets(needId: string): Promise<ReadResult<Record<string, unknown>>>;           // need_revisions?need_id=eq.X&kind=neq.content&order=seq.asc&select=*
};
export type NeedDraftAnswer = { ok: true } & NeedView;
/** Zero head rows is TENANT_NOT_FOUND (row level security already filtered); any failed read is TENANT_READ_FAILED; rows are parsed, then folded. */
export async function needDraft(reads: TenantReads, needId: string): Promise<TenantReadAnswer<NeedDraftAnswer>>;
```

Interface depth, judged: the screen learns four verbs and one object. Behind them sit create-or-append, the dedupe, seq assignment, the head lock, the fold, disclosure selection, the pin, the prefix, and three triggers. Nothing on the public surface names a revision kind, a seq, or a trigger; `revisionId` and `seq` appear in answers only as receipts. The surface is no larger than the four things the screen does.

### The suite

`tests/at/suites/req-003/`, in the REQ-002 shape. SUT key `needIntake`; `_bind.ts` calls `bindSuite({ requirement: 'req-003', sut: 'needIntake', sutMissingDetail })`. `suite-adapters.ts` gains `'req-003': typeof import('../suites/req-003/_fixture.ts')`.

```ts
// _contract.ts — type aliases only; judgement types imported from the shipped modules (constraint 25)
import type { IntakeSnapshot, NeedStage, NeedView, Urgency } from '../../../../supabase/functions/_shared/need-intake.ts';
import type { ReferenceDisclosure } from '../../../../supabase/functions/_shared/reference-disclosure.ts';
import type { WriteRefusalKind } from '../../../../supabase/functions/_shared/write-routes.ts';
import type { AllowanceOutcome, NgoActor, OperatorWriteOutcome, Session, TenantReadOutcome, WriteRefusal } from '../req-002/_contract.ts';

export type SaveDraftRequest = { organizationId: string; needId?: string; title: string; description: string; urgency: Urgency | null };
export type SaveDraftOutcome = { ok: true; needId: string; revisionId: string; seq: number; appended: boolean; stage: NeedStage } | WriteRefusal;
export type AddReferenceRequest = { organizationId: string; needId: string; fileName: string; mediaType: string; byteSize: number; note?: string };
export type AddReferenceOutcome = { ok: true; needId: string; revisionId: string; seq: number; disclosure: ReferenceDisclosure } | WriteRefusal;
export type SubmitRequest = { organizationId: string; needId: string; title: string; description: string; urgency: Urgency | null };
export type SubmitOutcome = { ok: true; needId: string; stage: NeedStage; submittedRevisionId: string; submittedAt: string; changed: boolean } | WriteRefusal;
export type SubmitDefinerOutcome = { ok: true } | { ok: false; kind: WriteRefusalKind; reason: string };

export type NeedIntakeSut = {
  // PROVISIONING, delegated inward to REQ-002's adapter and recorded here (the loop tier builds standing from what it provisioned)
  provisionNgo(email: string, opts: { emailVerified: boolean }): Promise<NgoActor>;
  provisionVolunteer(email: string): Promise<Session>;
  /** A second session for the same account: "leaving and returning" in AT-003.05. Live: a fresh password grant. Loop: a new handle. */
  signInAgain(actor: NgoActor): Promise<Session>;
  setMembershipRoleAsOperator(organizationId: string, accountId: string, role: 'admin' | 'member'): Promise<void>;
  /** The capacity Given of AT-003.03, .11 and .12, read through REQ-002's route (constraint 19). */
  readAllowance(session: Session | null, organizationId: string): Promise<AllowanceOutcome>;

  // PRODUCT OPERATIONS: the four routes
  saveDraft(session: Session | null, request: SaveDraftRequest): Promise<SaveDraftOutcome>;
  /** May carry keys the type does not name, so a body with file content can be sent and its refusal observed. */
  addReference(session: Session | null, request: AddReferenceRequest & Record<string, unknown>): Promise<AddReferenceOutcome>;
  submit(session: Session | null, request: SubmitRequest): Promise<SubmitOutcome>;
  draft(session: Session | null, needId: string): Promise<TenantReadOutcome<NeedView>>;

  // OPERATOR members: Givens no product path can write, and reads of what the product wrote
  /** public.submit_need with no TypeScript on the path: the definer's own description gate, AT-003.03's database arm. */
  attemptSubmitAsOperator(input: { accountId: string; request: SubmitRequest }): Promise<SubmitDefinerOutcome>;
  /** The REQ-004 classification event, stubbed: one classification row, tier2, written by the platform. */
  classifyTier2AsOperator(needId: string): Promise<void>;
  /** The platform's retrieval: read_need_intake_snapshot at integration, intakeSnapshotOf over the Maps at loop. */
  intakeSnapshot(needId: string): Promise<IntakeSnapshot | null>;
  /** A direct UPDATE of a revision, as the operator. The trigger must refuse it. */
  attemptRevisionUpdateAsOperator(revisionId: string, patch: { title: string }): Promise<OperatorWriteOutcome>;
};
```

`_fixture.ts` composes `createFixtureAdapter` from `../req-002/_fixture.ts` and uses `inner.sut.organizations` for provisioning, role changes and the allowance. It keeps its own Maps: `sessions` (sessionId to accountId), `actors` (accountId to type, organisation and role, recorded by the provisioning wrappers), `heads` and `log`. A product write is `writePipeline(spec, { caller, standing, body, target, subject: null, ip: null })` with standing built from `actors`, then a `commit*` that mirrors the definer over the Maps (including trigger 2's seq, the dedupe, the pin-once rule and `submissionGate`), then the shipped `render*`. `draft` refuses a caller who is not a member of the head's organisation with `TENANT_NOT_FOUND`, then folds with the shipped `foldNeed`. The acknowledgment backstop is not modelled at loop: every provisioned NGO completed signup with it, and no id drives that refusal.

`_live.ts` composes `createLiveAdapter` from `../req-002/_live.ts` for the same four provisioning members and needs one addition there: the returned object gains `bearerOf(session: Session): string`, one line over its private `tokensOf`, so this suite can post to its own routes as a session REQ-002 provisioned. `signInAgain` is a password grant held in this adapter's own map; `bearerOf` here checks that map first. Product writes use `functionPost`; `draft` uses `functionPostRaw` on `need-draft`; `classifyTier2AsOperator` is `insert into public.need_revisions (need_id, org_id, kind, sensitivity_tier) select id, org_id, 'classification', 'tier2' from public.needs where id = $1` (the trigger assigns seq); `intakeSnapshot` calls `read_need_intake_snapshot` and folds the answer's rows with `intakeSnapshotOf`; `attemptRevisionUpdateAsOperator` is one `update` whose raise becomes `{ ok: false, reason }`.

`_pending.ts` at the merge head names two surfaces: `referenceUpload: 'storage.reference-upload'` and `referenceUploadSurface: 'ui.reference-upload-surface'`. While units land in order, ids of later units are registered with `awaiting()` on an interim name per unit (`need.gate-and-autosave`, `need.zero-labels`, `need.reference`, `need.submission`, `need.snapshot`); each unit deletes its name and moves its ids to green in the same commit group, so `--expect` holds at every unit boundary. Five test files, thirteen call sites: `a-capture.test.ts` (.01, .02, .04, .17), `b-gate-and-autosave.test.ts` (.03, .05), `c-reference.test.ts` (.07, .09, .10), `d-submission.test.ts` (.11, .12), `e-snapshot.test.ts` (.14, .16). No `_source-*.ts` arm and no selftest: the structural claims are proved by the operator arms, not by text.

The manifest at the merge head, `tests/at/expected/req-003.json`:

```json
{
  "requirement": "003",
  "tiers": {
    "loop": {
      "green": ["AT-003.01", "AT-003.02", "AT-003.03", "AT-003.04", "AT-003.17", "AT-003.05", "AT-003.07", "AT-003.09", "AT-003.10", "AT-003.11", "AT-003.12", "AT-003.14", "AT-003.16"],
      "red": {}
    },
    "integration": {
      "green": ["AT-003.01", "AT-003.02", "AT-003.03", "AT-003.04", "AT-003.17", "AT-003.05", "AT-003.11", "AT-003.12", "AT-003.14", "AT-003.16"],
      "red": {
        "AT-003.07": { "kind": "capability-pending", "capabilities": ["storage.reference-upload"] },
        "AT-003.09": { "kind": "capability-pending", "capabilities": ["ui.reference-upload-surface"] },
        "AT-003.10": { "kind": "capability-pending", "capabilities": ["ui.reference-upload-surface"] }
      }
    }
  }
}
```

Loop: thirteen green. Integration: ten green, three red.

### The eleven decisions

**Where the need lives.** Its own two tables, `needs` and `need_revisions`, with no join to `projects` yet. `projects` is the developer seat; its comment says creation is not landed there; a draft stored on it is world-readable by id through `public-project`; and constraint 11 forbids a state column on it, though this design needs none. The join arrives when a need becomes a project, which is a later stage of the lifecycle engine: it adds `needs.project_id` then, nullable, and nothing here changes.

**How the transition is proven until the engine exists.** The transition is the pin. `stage` is derived by `needStageOf` from `submitted_revision_id` and is stored nowhere; a need cannot be in `discovery_in_progress` without a submission, because the stage is a function of the submission. AT-003.11 and .12 are green at both tiers on the deployed `submit-need` and the deployed head row. REQ-005.5's engine later owns a state store for every stage after Discovery, takes `submit_need`'s pin as the `draft -> discovery_in_progress` event, puts its verification and capacity guards in front of `submissionGate` in `decideSubmitNeed` and `submit_need`, and deletes `needStageOf`. Nothing else is throwaway: the pin stays the fact the engine reads.

**What "attached" means with no storage primitive.** A `reference` row: `file_name`, `media_type`, `byte_size`, optional `note`, writer and instant. No bytes, no key, no path, so the document oracle stays green. Loop proves the shipped decision accepts a reference and the fold shows it on the draft; integration proves the deployed route writes the row, but no file leaves the test, so AT-003.07's "uploads a reference file" is red at integration on `storage.reference-upload`. When REQ-032 lands bytes, its key lives on REQ-032's surface, not on this row.

**What the upload route serves for the disclosure.** Both the copy and a flag, from one constant. `need-draft` and `add-need-reference` answer `disclosure: { level, acknowledgmentRequired, heading, body, acknowledgment }`, computed by `referenceDisclosureFor(sensitivityTier)`. The copy lives in `supabase/functions/_shared/reference-disclosure.ts` as `BASE_REFERENCE_DISCLOSURE` and `TIER2_REFERENCE_DISCLOSURE`, lifted from `design/screens/reference-files.html`. The screen renders the words the backend serves, so the wired re-run pins one source. The enforcement of the acknowledgment before an upload is REQ-032's hardening contract and is not done here.

**How the Tier-2 classification is stubbed.** As a row: `kind = 'classification'`, `sensitivity_tier = 'tier2'`, `written_by_account_id null`, appended by operator SQL at integration and by `classifyTier2AsOperator` over the Map at loop. The fold takes the latest classification row, so the very next read after the row lands carries the hardened disclosure with no upload in between: hardening triggers on the classification, by construction. When REQ-004 lands, its classifier appends the same row kind through its own definer; the stub member stays as the Given-maker, as `writeSpendRowAsOperator` did for the allowance.

**How zero cause labels are represented.** By having no representation. No column, no row kind, no route; `NeedView.causeLabels` is typed `readonly []` and the fold returns `[]`. A pre-Discovery draft cannot carry a label because the tree cannot express one. REQ-004 later adds a `cause_labels` row kind with a `labels text[]` column, widens the type, and takes the latest such row in the fold. Deletion-only correction fits the log: the NGO's removal appends a new labels row whose set is a subset of the previous row's, and the definer checks the subset; no route ever accepts a label from an NGO.

**Where the snapshot lives.** In the log, at the pin. The snapshot is the fold of every row with `seq <= pinned.seq`; the pinned row is the content row `submit_need` appended, so the submitted title, description and urgency are its columns, and every reference added before submission has a smaller seq. The platform retrieves it through `read_need_intake_snapshot(p_need_id)`, a stable definer granted to `service_role`, whose answer the shipped `intakeSnapshotOf` folds. Nothing is copied; nothing can be updated; no `audit_events` row and no new enum value.

**Autosave as a data contract.** Whole-document PUT semantics: every call carries title, description and urgency; nothing is patched. The definer appends a content row when the document differs from the latest content row and returns the latest row with `appended: false` when it is equal, both under the head lock, so autosave twice converges and the log holds edits, not debounce ticks. A second session reads back the latest content row through `need-draft`, with no merge and no ambiguity, because every row is a state a session actually held. The first call carries no `needId` and creates the need; that is where `has_platform_acknowledgment` fires.

**The refusal kinds.** Four added: `no-such-need` (the head is not this organisation's), `no-platform-acknowledgment` (the constraint 18 backstop), `title-missing` and `description-missing` (the submission gates, raised by `submit_need` with errcode `22023` and re-stated by `decideSubmitNeed` at 400). The table under "SQL definers" lists every DETAIL each definer raises. Everything else reuses existing kinds; an urgency outside the three and a reference with a blank name are `invalid-request`.

**The red set.** AT-003.07 red at integration on `storage.reference-upload`: no file leaves the test, and the criterion says one is uploaded. AT-003.09 and AT-003.10 red at integration on `ui.reference-upload-surface`: the criterion says the surface renders, and no screen exists; the deployed route serves the copy, so the founder may rule both green with a `surface: 'ui'` tag instead (open question). AT-003.10 is not red on a REQ-004 event: the manifest's cross-contract sanctions the stubbed classification fixture, and a stub that is proof at loop is proof at integration. Every other id is green at both tiers on surfaces this run ships.

**Which units go to which lane.** Unit 1 goes to the hardest-tasks lane: it lands the migration, the fold, the decisions, the reads, the routes and the whole suite skeleton, and the writer still shapes the fixture's mirror of the triggers and the composition seam with REQ-002's adapters. Units 2 to 7 go to the feature lane: each applies a fixed contract stated below, one definer or one member and its tests. Unit 2 lands `submit-need` in full, because a gate needs the verb it gates; unit 6 then proves the transition with tests only.

## Synthesis decision

## Tradeoffs accepted

- We accept three caller-bound GETs per draft read, and O(prefix) for the snapshot, in exchange for a copy-free snapshot and a full edit history.
- We accept that an organisation's members can read their needs' whole revision history through PostgREST, in exchange for the caller-bound read posture the tree mandates; the rows are their own content.
- We accept one content row that may duplicate the last autosave at every submission, in exchange for a prefix that always contains every reference added before submission.
- We accept whole-document autosave with no field patch, in exchange for a trivial fold and second-session reads with no merge.
- We accept a head table the pure log direction would rather not have, in exchange for the row lock constraint 5 demands, race-free seq assignment, and a pin a trigger can guard.
- We accept `on delete restrict` on the need's organisation and starter, in exchange for retention: an organisation with a submitted need cannot be deleted, which is what "retained for audit" means.
- We accept that the description gate is stated twice, in `submissionGate` and in `submit_need`, in exchange for the definer backstop; the two sentences are not pinned against each other.
- We accept a `title-missing` gate no id drives, in exchange for never sending a titleless need into Discovery; it cannot be the cause of AT-003.03's block because that id's Given carries a title.
- We accept that `need_revisions` append-only is proved by a trigger and an operator arm, not by a CI text scan, in exchange for no new `_source-*.ts` arm and no selftest.
- We accept that a submit after the pin appends an edit and reports `changed: false`, in exchange for never dropping typed content and a safe second submit.
- We accept one accessor added to REQ-002's live adapter (`bearerOf`), in exchange for not copying ninety lines of provisioning.
- We accept that unit 6 is tests only, in exchange for a submit route that lands whole in unit 2.

## Alternatives considered

- **An aggregate row updated in place, with the snapshot copied into `audit_events` at submission.** One GET per read and a scan-proven immutable table. It exposes the same four verbs but hides less: the snapshot is a second statement of the intake in untyped jsonb that a definer serialises by hand, history is lost, `changed` after submission is unobservable, and it costs a second migration for the enum value. Lost on the snapshot argument.
- **A sibling log for references and classification (`need_events`) beside a content-only `need_revisions`.** Two homogeneous tables, but two seq spaces; "as of submission" then needs a watermark per table or a timestamp comparison across tables, and two tables to secure and read. One log with a kind column gives the boundary as one number. Lost on the boundary.
- **No head at all: a pure event table where the first row mints the need id and a `submitted` row is the pin.** The purest form of this direction. It has no row to lock, so two autosaves race on seq and the organisation re-check of constraint 5 has no anchor; the pin's uniqueness needs a partial unique index instead of a field; and every read scans for the submitted row. The head is one row and gives all three. Lost on the lock.
- **Delta rows (field patches) instead of whole-document rows.** Smaller rows, and a screen can send one changed field. The fold becomes a reduce over patches, the snapshot a replay, and a malformed row poisons every later state; two sessions patching different fields produce rows nobody saw. Lost on reader load.
- **Content on `public.projects`.** Public by id through `public-project`, no state column allowed, and the table is the developer seat. Lost before scoring.

## Open questions and risks

- Should AT-003.09 and AT-003.10 be green at both tiers with `surface: 'ui'`, since the deployed route serves the exact copy and the manifest's wiring leaf is "wired re-run of ui-tagged P0s", or red at integration on the ui surface as AT-002.05 is? This design declares red and the bodies assert the copy in their `default` arm, so flipping is a two-line change.
- Should AT-003.07 be green at both tiers with the claim scoped to "a reference by name attaches", given the bytes are REQ-032's at both tiers alike?
- Compose REQ-002's live adapter through the one-line `bearerOf` accessor, or copy its provisioning into this suite's `_live.ts` as REQ-002 did with REQ-001?
- Should submission require an urgency? The PRD says intake captures it; no id tests a missing one. This design leaves it optional at submit.
- Does REQ-005.5 expect NGO edits to stay open through the same routes after submission, as AT-003.16 assumes, or does Discovery lock the draft? The design keeps `save-need-draft` and `add-need-reference` open after the pin.
- Retention over cascade: is `on delete restrict` on `needs.org_id` acceptable, or must organisation deletion cascade through needs, which the append-only trigger would refuse?
- Risk: PostgREST filter syntax in the three selectors (`kind=eq.content&order=seq.desc&limit=1`, `kind=neq.content`) is untested in this tree; the first integration run of unit 1 proves it.
- Risk: the BEFORE INSERT trigger fills a NOT NULL `seq`; PostgreSQL checks NOT NULL after BEFORE ROW triggers, so this works, but the writer must not add a default that hides a missing trigger.

## Next implementation step

Write the migration's two tables, three triggers and `save_need_draft`, and `need-intake.ts` with `parseNeedRevisionRow`, `foldNeed` and `decideSaveNeedDraft`, then the suite skeleton with thirteen call sites and the manifest, and run `at:check req-003` before any body is filled.

## Per-unit plan

**Unit 1 — capture title, description and urgency; only the NGO admin starts a need.** Files: `supabase/migrations/20260917120000_need_intake_log.sql` (both tables, three triggers, posture, `save_need_draft`); `supabase/functions/_shared/need-intake.ts` (types, parsers, `needStageOf`, `foldNeed`, `contentEquals`, `decideSaveNeedDraft`, `renderSaveNeedDraft`); `supabase/functions/_shared/reference-disclosure.ts` (both constants, `referenceDisclosureFor`, needed by the fold's type); `supabase/functions/_shared/tenant-reads.ts` (`TenantReads` selectors, `needDraft`); `supabase/functions/_shared/edge.ts` (three selectors inside `callerReads`); `supabase/functions/_shared/write-routes.ts` (row `save-need-draft`, kinds `no-such-need`, `no-platform-acknowledgment`); `supabase/functions/save-need-draft/index.ts`; `supabase/functions/need-draft/index.ts`; `supabase/config.toml` (two blocks); `tests/at/suites/req-001/_policy-scan.ts` (two catalog rows); `tests/at/harness/suite-adapters.ts` (one line); `tests/at/suites/req-002/_live.ts` (`bearerOf`); `tests/at/suites/req-003/_bind.ts`, `_contract.ts`, `_fixture.ts`, `_live.ts`, `_pending.ts`, `a-capture.test.ts`, `b-gate-and-autosave.test.ts`, `c-reference.test.ts`, `d-submission.test.ts`, `e-snapshot.test.ts` (thirteen call sites, ten on interim `awaiting()` names); `tests/at/expected/req-003.json`. Ids: AT-003.01, .02, .04 green at loop and integration. Lane: hardest tasks.

**Unit 2 — the missing-description block on its own; autosave without an explicit save.** Files: the migration grows `submit_need`; `need-intake.ts` gains `submissionGate`, `decideSubmitNeed`, `renderSubmitNeed`; `write-routes.ts` gains row `submit-need` and kinds `title-missing`, `description-missing`; `supabase/functions/submit-need/index.ts`; `config.toml` (one block); `_contract.ts`, `_fixture.ts`, `_live.ts` gain `submit`, `attemptSubmitAsOperator`, `signInAgain`; `b-gate-and-autosave.test.ts` bodies; `_pending.ts` drops `need.gate-and-autosave`; manifest. Ids: AT-003.03, .05 green at both tiers. Lane: feature.

**Unit 3 — a pre-Discovery draft carries zero cause labels.** Files: `a-capture.test.ts` body for .17 over the fold's `causeLabels: readonly []` from unit 1; `_pending.ts` drops `need.zero-labels`; manifest. Ids: AT-003.17 green at both tiers. Lane: feature.

**Unit 4 — optional reference upload attaches to the draft, with the base disclosure.** Files: the migration grows `add_need_reference`; `need-intake.ts` gains `decideAddNeedReference`, `renderAddNeedReference`; `write-routes.ts` row `add-need-reference`; `supabase/functions/add-need-reference/index.ts`; `config.toml` (one block); adapters gain `addReference`; `c-reference.test.ts` bodies for .07 and .09 as per-tier maps (`default` green, `integration: awaiting(...)`); `_pending.ts` drops `need.reference`, keeps `storage.reference-upload` and `ui.reference-upload-surface`; manifest. Ids: AT-003.07 green loop, red integration (`storage.reference-upload`); AT-003.09 green loop, red integration (`ui.reference-upload-surface`). Lane: feature.

**Unit 5 — the Tier-2 hardened disclosure is present before any further upload.** Files: adapters gain `classifyTier2AsOperator`; `c-reference.test.ts` body for .10 (per-tier map); manifest. The hardening rule (`referenceDisclosureFor` over the latest classification row) shipped in unit 1. Ids: AT-003.10 green loop, red integration (`ui.reference-upload-surface`). Lane: feature.

**Unit 6 — submission by a verified admin with capacity starts Discovery, file or no file.** Files: `d-submission.test.ts` bodies for .11 (no reference) and .12 (one reference, stage before and after, second submit `changed: false`); `_pending.ts` drops `need.submission`; manifest. No product file changes: `submit-need` landed in unit 2. Ids: AT-003.11, .12 green at both tiers. Lane: feature.

**Unit 7 — raw-intake audit snapshot at submission, unchanged under later edits.** Files: the migration grows `read_need_intake_snapshot`; `need-intake.ts` gains `intakeSnapshotOf`; adapters gain `intakeSnapshot`, `attemptRevisionUpdateAsOperator`; `e-snapshot.test.ts` bodies; `_pending.ts` drops `need.snapshot`; manifest. Ids: AT-003.14, .16 green at both tiers. Lane: feature.

Diff size at the merge head: one migration; four route folders; four SQL functions (three definers, one stable read) and three trigger functions; two new `_shared` modules and three edited (`edge.ts`, `tenant-reads.ts`, `write-routes.ts`); four `config.toml` blocks; two catalog rows; one adapter-map line; one accessor in REQ-002's live adapter; ten suite files and one manifest. Nothing under `src/`.
