# Interrogate verdict for AI4DEV-120 (intake form and draft autosave)

Five lanes, one prompt (`reviewer-prompt.md`), the branch's diff against origin `main` after the
comment audit. Receipts and raw outputs in `out/`. The lead judged every finding against the tree,
not against the lanes' say-so.

## Intent

The paragraph in `reviewer-prompt.md`, section "Intent".

## Reviewers

- astra at medium (codex): 6 findings, 2 minutes.
- grok at xhigh: 8 findings, 18 minutes.
- muse at xhigh (opencode): 12 findings, 5 minutes.
- DeepSeek V4.1 Flash at max (opencode): 10 findings, 5 minutes.
- opus at xhigh (native): 14 findings, 13 minutes.

## Act on

1. **A malformed `projectId` reaches PostgREST and answers 409 `refused`** (astra 6, grok 1,
   DeepSeek 5, opus 1). Four lanes. The write frame shape-checks every other id; the read route
   checks this one. Fix: `uuidField` beside `stringField` in `write-routes.ts`, used by
   `decideProjectNeed` for `save`, `attach`, `submit`, and by `need-intake/index.ts`; one
   malformed-id case per action, 400 `invalid-request`.
2. **`submit` leaves `updated_at` on the last draft edit** (astra 5, grok 3, muse 6, DeepSeek 4,
   opus 10). Five lanes. `save` and `attach` set it; the fixture copied the omission. Fix: the
   submit update sets `updated_at = v_submitted_at`; the fixture too; AT-003.12 asserts it moves
   on the first submit and holds on the repeat.
3. **The assigned-volunteer policy is a table-reading subquery in USING** (astra 4, muse 2,
   DeepSeek 2, opus 2; grok read it as design). The design of record sanctioned it, and the lead
   overrules the design here: the tree's posture forbids the shape, the static scan cannot see
   it, nothing in this item seats a volunteer, and the requirement that seats one can add a
   `viewer_*` helper then. Fix: delete the policy. Two policies remain, org member and platform
   admin.
4. **`applyNeedPatch` reads the wall clock in a pure module** (grok 4, opus 3; the lead's own
   carried note). Fix: `applyNeedPatch(need, patch, now)`; the fixture passes its clock.
5. **The admin refusal says "may start a need" for every action** (grok 7, muse 9, opus 13).
   Fix: "may write a need" in the live definition and the fixture's operator arm.
6. **The classification trigger raises with no DETAIL kind** (grok 8, muse 5). Fix: `detail =
   'tier2-classification-immutable'`.
7. **The read route has no negative test** (opus 6a; grok 5 and muse 8 on the fixture modelling
   one policy). Fix: AT-003.01 reads the draft anonymous (401), as another organisation's admin
   (404), as a volunteer (404), and as a non-admin member of the owning organisation (200). The
   fixture models the member read already through `roles`; it drops nothing.
8. **Small and cheap, taken with the above**: `need_intake_save` guards `v_title is null` like
   `start` (muse 11); `read_public_project` gets its catalog comment back (opus 12); the two new
   `[functions.*]` blocks move beside the other twelve in `config.toml` (opus 14).

## Consider (listed in the pull request under "Not done here")

- **The draft read stitches two REST reads** (astra 3, grok 2). A save that lands between them
  can show title A with description B once. Real, narrow, self-healing on the next read. The fix
  is a PostgREST embed or an invoker function under RLS; it changes `callerReads` and the
  REQ-001 read inventory, so it is its own item.
- **The `start` arm is inlined in the dispatcher and copied through three migrations** (grok 6,
  DeepSeek 6, opus 5, muse 10). A `need_intake_start` helper would make the dispatcher four
  guards and a `case`. The one-migration-per-unit convention put the copies there; collapsing
  them is a decision for the founder, not the lead.
- **The live adapter copies REQ-002's provisioning and mints a second session per NGO** (opus
  7). The root cause is that REQ-002's live adapter hides its bearers. A `bearerOf` export there
  removes about sixty lines here. Touches a merged suite; its own item.
- **`edge.ts` imports the feature module to type `callerReads`; `NeedIntakeAnswer` restates
  `TenantReadAnswer`** (opus 9). The design froze `TenantReads`; the next read requirement
  should move `need` into it.
- **Four statements of the reference-file record shape; `ProjectNeedArgs` untagged** (opus 4).
  Valid; a refactor for the next touch of the module.
- **The Tier-2 trigger never runs at integration** (opus 6b), because AT-003.10 is red there by
  the founder's ruling. A trigger assertion on the operator path in a green id is possible; the
  lead leaves the ruling as it stands.
- **Test-only helpers live in the shipped module** (DeepSeek 7). The loop tier grades the
  TypeScript twin by design; the integration tier grades the SQL. Valid observation on module
  placement; not this item.

## Noted

- Acknowledgment re-checked on `start` only (muse 4, DeepSeek 1). By design: the projects table
  comment demands the hook at creation; the intent paragraph overstated it.
- Autosave is last-write-wins with no base version (astra 2, opus 8). SYNTHESIS rejected
  revision compare-and-swap; the acceptance ids retired crash and network recovery.
- No caps on `reference_files` (muse 7, DeepSeek 10). REQ-032 owns file policy.
- A render throw after a committed write answers 502 (DeepSeek 3). The write frame's behaviour
  for every route, not new here.
- JS `trim()` and SQL `btrim` disagree on exotic whitespace (muse 3). The edge is the only
  client path and it is the stricter one; the SQL backstop accepts an em-space title on the
  operator path only.
- The partial unique index admits many NULL project ids (muse 12). Operator path only.
- Base disclosure heading repeats the body's first sentence (opus 11). The copy is the design
  screen's.
- No behavioural test of the acknowledgment gate (DeepSeek 9). The append-only acknowledgment
  table makes the negative case unreachable through the adapters.

## Dismissed

- **The composite foreign key cannot reference a unique index** (muse 1, critical). Wrong:
  Postgres accepts a non-partial unique index as a foreign key target; the migration applied
  and the integration tier is green on every unit; grok checked the constraint on the stack.
- **Autosave is not implemented because the test calls `saveNeed`** (astra 1, critical). The
  data contract is the deliverable of this run; the screen is the wiring leaf, and the id
  carries the `ui` tag for the wired re-run. Settled in the brief.
- **`need_intakes.org_id` is a needless copy** (DeepSeek 8). SYNTHESIS correction 1: the copy
  exists so the member policy is a column comparison, which is the posture.

## Agreement map

Two findings reached four or five lanes (the `projectId` shape, `updated_at` on submit) and
both are taken. The volunteer policy reached four lanes as a defect and one as design; the lead
sided with the four. Every critical was a lone-lane claim and each failed verification against
the running stack or the brief. opus alone found the missing negative reads and the trigger
never executing; DeepSeek alone found the render-after-commit 502; muse alone found the null
title guard. grok alone declined to report design decisions as findings, which kept its list
short and every item real.
