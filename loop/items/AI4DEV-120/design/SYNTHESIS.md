# Design of record: the project need intake (REQ-003)

This file wins over anything that disagrees with it. The base is `candidate-2-project-row.md`. Read
that file in full, then apply every correction, graft and rejection below. The grounding is
`../how/explanation.md`; its thirty constraints bind every unit.

## The pick

The base is candidate 2, the need is the project from day one. The blinded judge
(`judge-verdict.md`, astra at medium) picked it, and the lead agrees after reading all four. The
reason is the domain: the acceptance id AT-003.12 says "the project state moves draft to
discovery_in_progress", and the PRD's lifecycle requirement owns states of a project. A need that
is its own entity would need a later "becomes a project" step nobody has specified. A project row
at intake inherits the single-developer seat, the three read policies, the dashboard list and the
workspace read with no new code. What a project row may not carry, the stage, the intake text,
the classification stub, the label stub and the file metadata, lives on the 1:1 companion
`public.need_intakes`, whose name holds no `project` token.

The lead's provisional pick before the judge was candidate 3, the thin-SQL one-route design, on
diff size. It lost on two facts the judge named: its submit request resends the editable content,
so a delayed retry overwrites edits made after submission (candidate-3 lines 364 and 590), and its
SQL cannot raise the description refusal, only a CHECK (line 383). Candidate 2 submits from the
stored row and raises the kind in SQL.

Scores, lead and judge, on the six rubric criteria (constraints, honest green, interface depth,
invariants in structure, fit for later, diff size):

| candidate | lead | judge |
|---|---|---|
| 1, aggregate (astra) | 3 4 3 5 3 2 = 20 | 1 4 3 5 3 2 = 18, disqualified on constraint 19 |
| 2, project row (fable) | 4 4 4 4 4 3 = 23 | 5 4 4 4 3 3 = 23 |
| 3, thin SQL (grok) | 5 4 4 3 3 5 = 24 | 4 2 4 2 3 5 = 20 |
| 4, revision log (opus) | 4 4 2 4 3 2 = 19 | 5 4 2 3 3 2 = 19 |

The lead's higher score for candidate 3 rested on its 12-of-13 integration count and its diff. The
judge's criterion-2 score of 2 for it is right: the retry defect is a correctness gap, not a
style choice.

## Corrections to the base

1. **No subquery in a policy.** Candidate 2 line 116 puts `viewer_is_org_member((select p.org_id
   from projects ...))` in a USING clause and names its own fallback at line 398. Take the
   fallback outright: `need_intakes.org_id uuid not null`, a unique index on `projects (id,
   org_id)`, a composite foreign key `(project_id, org_id) references projects (id, org_id)`, and
   policies of the shape the tree already has: `using (public.viewer_is_org_member(org_id))`,
   the assigned-volunteer policy through an `exists` on `projects`, and
   `viewer_is_platform_admin()`. The pair cannot drift because the foreign key holds it.
2. **The public read change touches three test sites, not one.** The judge found them:
   `tests/at/suites/req-001/d-tenant-isolation.test.ts` line 142,
   `tests/at/harness/shipped-tenant-reads.selftest.ts` lines 67 and 147, plus the REQ-001 fixture
   literal. Each source literal gains `need_stage: null`. The public response body keeps its
   exact three-field projection; `need_stage` never reaches the response. `projectIsPublic`
   becomes `source.need_stage === null`.
3. **The Tier-2 classification is monotonic.** Graft from candidate 1 line 190: a `before update`
   trigger on `need_intakes` refuses clearing or rewriting a non-null `tier2_classified_at`. One
   trigger function, execute revoked from public.
4. **One snapshot per need, structurally.** Graft from candidate 1 line 338: a partial unique
   index on `audit_events ((detail->>'project_id')) where event_kind = 'need_intake_submitted'`.
   Submit twice is a no-op in the helper and the index makes a second row impossible.
5. **The disclosure carries its acknowledgment sentence.** Graft from candidate 4 lines 318 to
   327. `Disclosure` is `{ level: 'base' | 'tier2-hardened'; acknowledgmentRequired: boolean;
   heading: string; body: string; acknowledgment: string | null }`. The copy constant
   `REFERENCE_FILE_DISCLOSURE` in `need-intake-copy.ts` holds both levels. The base body is the
   first three sentences of `design/screens/reference-files.html` line 23; the download sentence
   is REQ-032's and stays out (candidate 1's narrowing, judge line 16). The hardened heading and
   body come from lines 29 to 32 and the acknowledgment from line 34.
6. **Red set.** Three ids red at integration only:
   `AT-003.07` on `storage.reference-upload`; `AT-003.09` on `ui.reference-upload-surface`;
   `AT-003.10` on `ui.reference-upload-surface` alone. The classification stub is sanctioned by
   the manifest, so `discovery.tier2-classification` is not a proof obligation and is dropped
   from .10 (judge line 52). Zero red at loop. Thirteen green at loop, ten at integration.
   The lead asks the founder before unit 4 whether .09 and .10 should instead be green on the
   served copy; until that answer, the precedent of AT-002.05 stands.
7. **The ui tag.** AT-003.05, .07, .09 and .10 register with `surface: 'ui'`
   (`tests/at/harness/registry.ts` line 69) so the wiring leaf's `--wired` re-run selects them.
   The manifest's wiring leaf is "wired re-run of ui-tagged P0s (no new AT ids)".
8. **Nullable clearing is explicit.** A patch key present with `null` clears `urgency`; a
   description that trims to empty becomes `null`; an absent key is unchanged (judge line 38).
9. **Identical patches change nothing at all**, including `updated_at` (candidate 2 line 197
   already says so; keep it).
10. **`intakeSnapshotOf` and the audit detail are one shape.** The definer builds the detail with
    the same keys `IntakeSnapshot` names, snake_case, and `intakeSnapshotFromDetail` parses it
    back. AT-003.14 compares the parsed detail to `intakeSnapshotOf(submitted.need)` with
    `toEqual`.

## Rejections, with the source

- Command ids, receipts, and revision compare-and-swap (candidate 1 lines 438 to 452). Crash and
  network recovery were retired with AT-003.06; the contract is write, reopen, read.
- Email-verification and capacity checks inside submit (candidate 1 lines 436, 539, 540). Those
  gates belong to the lifecycle requirement, and constraint 19 forbids reading the ledger
  outside its two surfaces.
- Refusing a reference after Tier-2 until an acknowledgment lands (candidate 1 line 532). Unasked.
- A `read` verb on the write route with service-role reads (candidate 3 line 25). The tree's
  read path is `callerReads` with the caller's JWT and row level security; a caller-bound
  `need-intake` route is the shape.
- Whole-form autosave and a revision log (candidate 4). No criterion asks for edit history, and the
  tenant posture would expose the whole history to every member.
- A title-missing gate on submit (candidates 3 and 4). `projects.name` is non-empty at `start`
  and `save` refuses an empty title with `invalid-name`, so a submitted need always has a title
  and the description gate stays the only gate on submit.

## The eleven decisions, settled

1. **Where the need lives.** A `projects` row created at `start`, `projects.name` as the title,
   plus the 1:1 companion `need_intakes` with its own `org_id` (correction 1).
2. **The transition.** A local `stage` enum `need_stage` with `draft` and
   `discovery_in_progress` on the companion, `submitTransition` pure in TypeScript and restated
   in `need_intake_submit`. The lifecycle engine absorbs the column and deletes the helper.
3. **Attached** means a metadata entry appended to `need_intakes.reference_files jsonb`, a list
   of `{ id, file_name, media_type, byte_size, description, added_by_account_id, added_at }`.
   No byte path. Loop proves the append; integration is red on the storage primitive.
4. **The disclosure** is served as copy plus level on every `need-intake` read and on every
   write answer, shape per correction 5, constant in `need-intake-copy.ts`.
5. **The classification stub** is `tier2_classified_at timestamptz`, set by operator SQL at
   integration and by `classifyTier2AsOperator` at loop, monotonic (correction 3).
   `disclosureFor(tier2_classified_at)` derives the level at read time.
6. **Zero labels** is `cause_labels text[] not null default '{}'` with
   `check (stage <> 'draft' or cause_labels = '{}')`.
7. **The snapshot** is one `audit_events` row of kind `need_intake_submitted`, appended by
   `need_intake_submit` through `append_audit_event` in the same transaction as the stage change,
   unique per need (correction 4). Retrieval is operator SQL on `event_kind` and
   `detail->>'project_id'`.
8. **Autosave** is `save` with a patch, semantics per corrections 8 and 9, under `for update`
   on the companion row. A second session of the same admin reads the draft through
   `need-intake`.
9. **Refusal kinds** added to `WRITE_REFUSAL_KINDS`: `no-such-need`, `missing-description`,
   `platform-acknowledgment-missing`. SQL DETAIL per raise: `not-a-member`, `not-an-admin`,
   `platform-acknowledgment-missing`, `no-such-need` (42501); `no-such-organisation` (23503);
   `invalid-name`, `invalid-request` (22023); `missing-description` (P0001). `already-submitted`
   does not exist: a second submit answers `changed: false`.
10. **Red set** per correction 6.
11. **Lanes.** Unit 1 is the hardest-tasks lane (astra at medium): it lands the table, the
    dispatcher, the public read change, both `_shared` modules, both routes, the suite's
    contract, fixture and live adapters, the manifest and all thirteen call sites. Units 2 to 7
    apply a fixed contract and go to the feature lane (astra at low).

## Routes, SQL and modules

Exactly as candidate 2's "Routes", "The one write definer and its private helpers" and
"`_shared` modules" sections, with the corrections above. Two routes: `project-need` (write,
actions `start`, `save`, `attach`, `submit`) and `need-intake` (caller-bound read). One SECURITY
DEFINER `public.project_need(p_account_id, p_organization_id, p_action, p_project_id, p_payload)`
and private non-definer helpers `need_intake_save`, `need_intake_attach`, `need_intake_submit`,
`need_intake_view`. `callerReads` in `edge.ts` gains one member, `need(projectId)`, and returns
`TenantReads & NeedReads`; `TenantReads` itself does not change. Modules
`supabase/functions/_shared/need-intake.ts` and `need-intake-copy.ts`.

Migrations, one per unit that changes SQL, forward only, as the vetting run did:
- unit 1: `need_stage` and `need_urgency` enums, `need_intakes` with posture and three policies,
  the unique index on `projects (id, org_id)`, the classification trigger, `read_public_project`
  with `need_stage`, `project_need` with the `start` arm and `need_intake_view`.
- unit 2: `need_intake_save` and `need_intake_submit` (gate and transition, no audit yet), the
  dispatcher redefined.
- unit 4: `need_intake_attach`, the dispatcher redefined.
- unit 7: the `audit_event_kind` value in its own file, then `need_intake_submit` redefined to
  append the snapshot, and the partial unique index.

Units 3, 5 and 6 add no migration.

## The suite

`tests/at/suites/req-003/` in the REQ-002 shape: `_bind.ts` (`sut: 'needs'`), `_contract.ts`,
`_fixture.ts` (composes the REQ-002 fixture for provisioning, roles and the allowance read, keeps
its own maps for needs and snapshots, runs `writePipeline` with the shipped `decideProjectNeed`),
`_live.ts` (`functionPost`, `sqlClient`), `_pending.ts` (`AWAITED.referenceUpload =
'storage.reference-upload'`, `AWAITED.uploadSurface = 'ui.reference-upload-surface'`, and the
per-unit `intake.<unit>` names for ids not yet built), `_source-need.ts` (one arm: the last
`project_need` definition contains `public.has_platform_acknowledgment(`), the harness selftest
`tests/at/harness/req003-need-oracles.selftest.ts`, six test files:

| file | ids |
|---|---|
| `a-capture.test.ts` | 01, 02, 04 |
| `b-gate-and-autosave.test.ts` | 03, 05 |
| `c-labels.test.ts` | 17 |
| `d-reference-files.test.ts` | 07, 09, 10 |
| `e-submission.test.ts` | 11, 12 |
| `f-snapshot.test.ts` | 14, 16 |

`tests/at/expected/req-003.json` with `"requirement": "003"`, written before the first run. Until
a unit lands, its ids are red at both tiers on `intake.<unit>` names, and the landing unit flips
them. The SUT contract is candidate 2's `NeedsSut` (lines 305 to 327).

## Per-unit plan

Candidate 2's "Per-unit plan" (lines 411 to 419 and on) with the corrections. Unit 6 lands the
`submit` action's happy path over the helper unit 2 wrote (transition, `changed: false` on a
second submit), and unit 7 adds the audit append and the index.

## Verification per unit

```
bun run typecheck
bun run at:check req-003
bun run at:selftest
bun run at:verify req-003 --tier loop --expect
bun run at:verify req-001 --tier loop --expect
bun run at:verify req-002 --tier loop --expect
bun run at:verify req-016 --tier loop --expect
bun run at:verify req-003 --tier integration --expect
bun run at:verify req-001 --tier integration --expect
bun run at:verify req-002 --tier integration --expect
bun run at:verify req-016 --tier integration --expect
```

## What each later requirement deletes

| later surface | keeps | deletes or replaces |
|---|---|---|
| lifecycle engine (REQ-005.5) | `projects` row, `need_intakes` text, the refusal kinds | `need_stage`, `stage`, `submitTransition`, `projectIsPublic`'s stage predicate |
| storage primitive (REQ-032) | the attach action, the metadata shape | `reference_files` jsonb, replaced by its own table with an object reference |
| label producer (REQ-004) | `cause_labels` and its draft check | nothing; it writes the array, or replaces it with a table |
| classification event (REQ-004) | `tier2_classified_at`, `disclosureFor` | the operator stub; the event writes the column |
| wiring leaf | both routes, `NeedIntakeView` | nothing |
