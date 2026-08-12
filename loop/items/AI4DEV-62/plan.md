# Plan — AI4DEV-62 (per-organisation roles and membership isolation), batch with AI4DEV-63 (single seat per org, single developer per project)

Branch: `nirdrang/ai4dev-62-per-organisation-roles-and-membership-isolation-d3l1`, cut from main
at `ea4f345`. Reserved database slot: **slot 2**, reserved under the primary; the one slot serves
the pair. The partner item rides this branch and pull request. The pull request will close the
partner with the one sanctioned closes-line; that line is NOT in the body at open — the plan
sitting opens the pull request with non-closing references only, and the line is added before the
merge ruling declares it.

**Amended by the DRAFT sitting after gate 1** (rulings in `loop/items/AI4DEV-62/gate1-rulings.md`,
all four findings accepted): the operator surface gains a sixth method that creates an UNSEATED
organisation (ruling 2); AT-001.16's not-a-member arm targets a third organisation instead of
contradicting its own Given (ruling 1); AT-001.17 gains a source arm over `src/routes/` and the
generated route tree (ruling 3); migration B revokes table privileges explicitly and step 7 gains
verify-first (f) for the post-reset catalog check (ruling 4). This amended plan is what gets
built.

## What the board items ask

**AI4DEV-62** (primary, manifest leaf D3.L1 of `loop/decomp/req-001.md`): admin and member roles
within an NGO, isolation between multiple organisation memberships, and the invariant that a
volunteer can never hold a per-organisation role. Verify: AT-001.16, AT-001.36, AT-001.37.

**AI4DEV-63** (partner, leaf D3.L2, blocked only by the primary): the single-seat NGO — no invite
capability at all — and single-developer projects, where no second volunteer can be attached.
Verify: AT-001.17, AT-001.32.

The acceptance texts are in `.taskmaster/docs/acceptance/at-req-001.md` lines 34–37 and 66.

## Facts established against the tree (evidence by pointer)

- **F1 — the schema base exists; the semantics do not.** Migration
  `supabase/migrations/20260808120000_accounts_org_membership_and_acknowledgments.sql`: the
  `account_type` and `org_role` enums (lines 27, 31), `accounts` (38), `organizations` (47),
  `org_memberships` with composite primary key `(org_id, account_id)` (57–63) — and its own
  comment (53–56) states AT-001.16 and .36 are "neither … landed here". RLS is enabled with ZERO
  policies (313–322); `org_memberships` has no Data API grant at all; the service role's only
  table privilege is `select` on `accounts` (353); execute on every function is revoked from
  public (370–376).
- **F2 — `complete_signup` is now the 9-argument form** (migration
  `20260809090000_volunteer_github_link_and_imported_profile.sql`, body 352–380, revoke 421). A
  volunteer completion writes `volunteer_profiles`, never a membership, and a volunteer
  completion carrying an organisation name is refused. This item does not touch
  `complete_signup`.
- **F3 — nothing writes `'member'`, anywhere.** Every membership write is `role='admin'`. No
  invite code exists (the only `invite` hits in the tree are English prose). No projects table
  and no assignment code exist; the only mention of projects is migration-1 line 85 prose.
- **F4 — isolation today is deny-all, and the policy set is another leaf's.** The
  tenant-isolation policy set (who may read what) is assigned to deliverable D5, which is
  blocked-by D3.L1 (`loop/decomp/req-001.md:37`). So this leaf proves isolation through the
  operation surface, not through row policies.
- **F5 — harness invariants that bind every step here:** (a) a declared-red id that goes green
  FAILS `--expect` (`tests/at/harness/expected.ts:327-332`), so each id's declaration flips in
  the same change as its body; (b) the counts are arithmetically checked (`expected.ts:419-433`);
  (c) exactly one `atTest` call site and one vitest result per id (`tests/at/harness/check.ts:93-104`,
  `runner.ts:1111-1149`); (d) a per-tier body map must cover every tier or supply `default`
  (`registry.ts:766-783`); (e) a new SUT method must land in `_contract.ts`, `_fixture.ts` and
  `_live.ts` AND in `backedSutMethods.accounts` (`tests/at/suites/req-001/_live.ts:100-126`) —
  otherwise reading it at integration throws `CapabilityPending` (`capabilities.ts:629-664`), and
  a name enumerated but unimplemented is refused at construction; (f) `AtPending` and
  `CapabilityPending` are the only declarable red shapes; (g) vitest pins 30 s — integration
  bodies declare `timeoutMs` (precedent `_integration.ts:65`, 240 s); (h) AT-001.32's call site
  is `tests/at/suites/req-001/f-lifecycle-and-audit.test.ts:20`, not the membership file.
- **F6 — slot mechanics:** `occupy` derives the item from the branch and requires the existing
  reservation (`tests/at/harness/db-pool.ts:861-874`); slot 2 is reserved under the primary. The
  evidence line shape is `runner.ts:1362` / `db-pool.ts:1369-1373`. CI runs the loop tier only
  (`.github/workflows/ci.yml:195-217`); integration greens are produced locally at the goal step.
- **F7 — the app has no UI beyond a single heading route** (`src/routes/`: `__root.tsx`,
  `index.tsx`). AT-001.17's "UI absent" is true by construction today; nothing must be removed.
- **F8 — the operation pattern to follow:** edge entry → `resolveCaller` → typed decision in
  `supabase/functions/_shared/` → SECURITY DEFINER RPC with a database backstop
  (`supabase/functions/create-organization/index.ts:74-87`; migration-1 lines 246–306). The loop
  fixture imports the same shared decision modules, which is what makes a loop green grade the
  real decision logic.
- **F9 — `_pending.ts`'s own rule** (`tests/at/suites/req-001/_pending.ts:41-50`): a `LEAF` label
  with nothing pointing at it must be deleted in the landing change; the header count (currently
  24) moves with it.
- **F10 — precedent for provisioned Givens:** the merged integration-verification item recorded
  operator-provisioned Given states as fixture setup, stated in the body's evidence
  (`loop/items/AI4DEV-81/plan.md`, the AT-001.05 row and D6).

## Decisions

- **D1 — all five ids go green at BOTH tiers.** No environmental blocker exists: no vendor
  credential is needed, no absent route class is involved; every arm is provable against the slot
  stack. Declaring integration reds here would prove the ids against stand-ins only, which the
  goal-step doctrine refuses.
- **D2 — AT-001.36's member-role Given is provisioned by operator authority.** No product writer
  for `'member'` exists BY DESIGN — the single-seat invariant forbids invites — and the enum's
  member half exists exactly for this criterion. The Given (admin in A, member in B) is minted
  through the operator surface (D8) and stated in the body's evidence, per F10's precedent. The
  alternative — building a product path that mints members — would violate AT-001.17.
  **Construction under the one-seat index (gate-1 ruling 2):** the product path creates A and
  seats the actor as admin; `createOrganizationAsOperator` creates B with NO membership row; the
  operator grant then seats the actor as B's single `member`. The same method mints the
  organisation C that ruling 1's not-a-member arm targets.
- **D3 — the admin-only NGO-side action is organisation rename.** New edge function
  `update-organization` + SECURITY DEFINER RPC `update_organization` + a typed decision
  `orgAdminActionAllowed(role: 'admin' | 'member' | null)` in a new
  `supabase/functions/_shared/memberships.ts`, with two DISTINCT refusal kinds — not-a-member and
  not-an-admin. The distinct kinds are the oracle's teeth: .16 asserts the not-a-member refusal
  (authority never crosses organisations), .36 the not-an-admin refusal (role is per-organisation,
  exercised on a real `member` row). Organisation-name validation reuses
  `validateOrganizationName`.
- **D4 — AT-001.37 is enforced in the database.** A BEFORE INSERT OR UPDATE trigger on
  `org_memberships` refuses any grantee whose `accounts.account_type` is not `'ngo'`
  (`platform_admin` included — the criterion says per-NGO roles are NGO accounts only). Product
  paths already refuse (F2's guard; `create_organization`'s backstop); the trigger closes every
  SQL path, the operator's included, which is what "any path" means.
- **D5 — the single-seat invariant is structural.** A unique index on `org_memberships (org_id)`
  — strictly stronger than the composite primary key. Every existing path writes exactly one
  admin row per new organisation, so nothing on main can trip it. AT-001.17's refusal arms:
  capability absence (no invite surface, no deployed invite function), Data-API unreachability
  (F4's privilege layer), the index refusing a second seat on the operator path, and the source
  arm from gate-1 ruling 3 (no invite or add-member naming in `src/routes/` or the generated
  route tree — a naming oracle, residual stated in the ruling).
- **D6 — projects land minimally.** `projects (id, org_id references organizations, name,
  assigned_volunteer_id uuid null references accounts, created_at)`; RLS on, no grants, no
  policies, no product paths. Single-developer is structural — one nullable column can hold at
  most one developer — plus a guard trigger refusing an occupied seat being re-pointed to a
  different account (release to null stays allowed; offboarding belongs to the offboarding
  requirement). Deliberately absent, stated in migration prose: product project creation (the
  acknowledgment predicate `has_platform_acknowledgment` keeps its pending consumer — landing a
  table is not landing creation), and volunteer-type validation of the assignee (the matching
  requirement's concern).
- **D7 — AT-001.16 is graded through the membership model and the operation surface:** per-org
  role rows proved by read-backs, authority-never-crosses proved by the rename refusals, and
  refusal-writes-nothing proved by read-backs after each refusal. The broad data-class denial
  (drafts, ledger, files, no existence oracle) is D5.L1's, blocked by this leaf; this plan does
  not annex it. **Per gate-1 ruling 1**, the not-a-member refusal targets a third organisation C
  in which the actor holds no membership; the .16 green claims operation-surface isolation, and
  the merge ruling states that limit.
- **D8 — the SUT surface gains six methods** (five planned; the sixth added by gate-1 ruling 2),
  landed three-files-in-step plus the backed list
  (F5e): `updateOrganization(session, orgId, name)` (product path),
  `createOrganizationAsOperator(name)` (operator write — creates an organisation with NO
  membership row; product paths always seat their creator, so this method exists exactly to
  construct multi-membership Givens under the one-seat index),
  `grantMembershipAsOperator(orgId, accountId, role)` (operator write — provisioning AND the
  refusal probe), `createProjectAsOperator(orgId, name)`,
  `assignVolunteerAsOperator(projectId, accountId)`, and the read-back
  `projectAssignment(projectId)`. Exact names are executor latitude; the SET is fixed. Outcome
  types are discriminated unions (`type`, never `interface` — the contract file's own doctrine)
  whose refusal kinds distinguish not-a-member / not-an-admin / not-an-ngo-account /
  seat-occupied / org-already-seated. Existing read-backs (`membership`, `membershipsOf`,
  `organizationsNamed`) are reused, not duplicated.
- **D9 — bodies are per-tier maps `{ default, integration }`**, the migrated items' shape. Both
  bodies of an id cite the same acceptance text; shared arms may be factored into helpers. No
  `surface: 'ui'` tag — the wired leaf's set is D1/D2's. Integration bodies live in
  `_integration.ts` with `INTEGRATION_TIMEOUT_MS`.
- **D10 — declarations flip per slice with their bodies** (F5a). `_pending.ts` loses each `LEAF`
  label in the slice that lands it (F9), and the item writes its pending ledger.
- **D11 — slicing: yes, two slices along the item boundary**, so the code gate reads each item's
  diff whole. Slice 1 = AI4DEV-62: `memberships.ts`, migration A, `update-organization`, the
  role/isolation SUT surface in contract/fixture/live, bodies .16/.36/.37, their declaration
  flips, the `D3_L1` label deletion. Slice 2 = AI4DEV-63: migration B, the seats/projects SUT
  surface, bodies .17/.32, their flips, the `D3_L2` label deletion, the ledger.
- **D12 — two migrations, one per item**, so each item's schema change is attributable and each
  slice reviews whole.
- **D13 — one new grant: `select` on `org_memberships` to `service_role`**, mirroring the
  accounts-grant reasoning (migration-1 lines 340–352): the edge function's decision read needs
  it, it is read-only, and every write stays definer-only.

**Stated risk, carried openly:** the loop fixture models the new database semantics by hand (the
trigger, the index, the guard). A modeling divergence between fixture and database is exactly
what the integration tier exists to catch — both tiers run in the goal loop, so a divergence
fails there rather than shipping.

## Steps, each with its done-criterion

1. **The decision module.** New `supabase/functions/_shared/memberships.ts`:
   `orgAdminActionAllowed` with the two distinct refusal kinds (D3), consumable by the edge
   function and the fixture; reuse `validateOrganizationName` for the new name. Done: module
   exists, typed, imported nowhere yet breaks nothing; `bun run typecheck` green.
2. **The SUT surface, three files in step (D8).** `_contract.ts` gains the six methods and
   their outcome types; `_fixture.ts` implements all six with database-mirroring semantics
   (non-NGO grantee refused, second seat refused, occupied project refused — the same kinds D8
   names — and operator organisation-creation seats nobody); `_live.ts` implements all six
   (HTTP to the deployed `update-organization` for the
   product path; operator SQL over the slot's database URL for the rest) and
   `backedSutMethods.accounts` gains exactly these names. Done: typecheck green; the
   enumeration/adapter admission rule (F5e) satisfied by construction.
3. **Test bodies for AT-001.16, .36, .37 (slice 1) — the executable bodies, written now, not
   deferred.** Per-tier maps at the existing call sites in
   `c-membership-and-acknowledgment.test.ts`; integration procedures in `_integration.ts`.
   Oracles exactly as the table below states, including the refusal-writes-nothing read-backs
   and .36's operator-provisioned Given recorded in the body's evidence. Done: bodies exist at
   both tiers, typecheck green, one call site per id, `bun run at:check req-001` green.
4. **Test bodies for AT-001.17, .32 (slice 2), same discipline.** .17 at its
   `c-membership-and-acknowledgment.test.ts` call site; .32 stays at its
   `f-lifecycle-and-audit.test.ts` call site (F5h — kept in place, surgical). Arms per the
   table. Done: same criteria as step 3.
5. **Migration A (slice 1).** The NGO-only membership trigger (D4); `update_organization`
   definer RPC with the membership+role backstop; the D13 grant; execute revoked from public and
   granted to `service_role`; `notify pgrst, 'reload schema'`. **Verify first, before the design
   hardens:** (a) the BEFORE trigger fires under the operator connection (superuser) on the slot
   stack; (b) trigger-versus-foreign-key ordering when the grantee's accounts row is absent —
   whichever refuses, the refusal must be a stated kind, not an accident; (c) the service-role
   REST read of `org_memberships` genuinely requires the new grant (measured, not assumed).
   Done: `supabase db reset` replays clean on slot 2; the three answers recorded in the item
   record with command evidence.
6. **The `update-organization` edge function (slice 1).** `resolveCaller` → membership read
   (D13) → `orgAdminActionAllowed` → RPC; refusal kinds surfaced distinctly to the caller;
   success renames. Done: served from the mirrored `supabase/` on the slot stack; the live
   adapter's product path (step 2) drives it end to end.
7. **Migration B (slice 2).** The one-seat unique index (D5); the `projects` table with RLS on
   and an explicit `revoke all on table public.projects from anon, authenticated, service_role`
   (gate-1 ruling 4, mirroring migration 2's measured pattern at its line 443); the assignment
   guard trigger (D6); prose marking the deliberate absences.
   **Verify first:** (d) the unique-violation and trigger-refusal error shapes over the operator
   SQL path, as the live adapter must surface them; (e) the functions router's answer on the
   slot stack for a function name that does not exist — the shape .17's integration absence
   probe asserts; (f) after reset on slot 2, the catalog check
   (`has_table_privilege` or `information_schema.role_table_grants`) for `anon`, `authenticated`
   and `service_role` on `projects` returns ZERO privileges, recorded with command evidence
   (gate-1 ruling 4). Done: replays clean on reset; answers recorded.
8. **Declarations, pending map, ledger (per slice, D10).** `tests/at/expected/req-001.json`
   moves .16/.36/.37 then .17/.32 from red to green at BOTH tiers; `_pending.ts` loses `D3_L1`
   then `D3_L2` and its header count goes 24 → 21 → 19; `loop/items/AI4DEV-62/pending-ledger.txt`
   lists the 19 remaining ids with their leaves. Done: `at:check req-001` green; loop declares
   18 green / 19 red, integration 13 green / 24 red; the declaration↔acceptance bijection holds.
9. **Goal evidence (the fix sitting's goal loop, stated here so the green is defined).**
   `bun run at:verify req-001 --tier loop --expect` exit 0; `bun run at:verify req-001 --tier
   integration --expect` exit 0 on slot 2 with the evidence line naming slot 2; the same
   both-tier pair for `req-016` (untouched — must stay green); all four recorded in the item
   record at the final head. Done: four exit-0 runs recorded; CI's loop lane unchanged in
   behaviour and speed.

The draft pass is steps 1–8 with typecheck and build green and the suite deliberately not run;
step 9 defines the goal loop.

## Expected verification state per acceptance id

| id | loop | integration | the body's arms |
|---|---|---|---|
| AT-001.16 | green | green | one NGO account seated in two organisations with different roles (admin in A via the product path; member in B, operator-provisioned onto the unseated organisation B per D2); read-backs prove two independent rows (role held per org); rename of A as admin succeeds; rename of B refused with the not-an-admin kind and writes nothing (read-back) — admin standing in A does not carry into B; rename of C, a third operator-created organisation the actor holds no membership in, refused with the not-a-member kind and writes nothing (read-back) — no ambient authority (gate-1 ruling 1); the read-surface breadth of "never grants access to B's data" stays with the tenant-isolation leaf (D7) |
| AT-001.36 | green | green | Given admin-in-A and member-in-B (member seat operator-provisioned onto the unseated organisation B, D2, stated in body evidence); the admin-only action succeeds in A; the same action in B refused with the not-an-admin kind — distinct from not-a-member — and writes nothing |
| AT-001.37 | green | green | a volunteer account; product arms: the NGO-only organisation action refuses it, and a volunteer completion carrying an organisation name refuses (F2); operator arm: a direct membership grant is refused by the trigger (D4); read-back: zero membership rows exist for it |
| AT-001.17 | green | green | capability absence: the SUT surface holds no invite or add-member method, and no such deployed function exists (integration: the absence probe per verify-first (e); loop: the fixture surface's absence); operator arm: a second seat insert is refused by the one-seat index (D5); client arm: the membership table is unreachable through the Data API (F4); source arm (gate-1 ruling 3, in the `default` body, both tiers): `src/routes/` file names and the route paths in `src/routeTree.gen.ts` match no invite or add-member naming — a naming oracle, its residual stated in the ruling |
| AT-001.32 | green | green | Given a project with an assigned volunteer (operator-provisioned, D6); attaching a different volunteer over the occupied seat is refused by the guard trigger and writes nothing (read-back); structurally one nullable column holds at most one developer; no product attach path exists |
| every other req-001 id | unchanged | unchanged | the 13 loop and 8 integration greens stay green; every other red keeps its exact declared kind |
| req-016, all ids | unchanged | unchanged | both manifests must still exit 0 at both tiers |

Counts after this item: loop 18 green / 19 red; integration 13 green / 24 red.

## Proportionality and gates

This item reaches code (migrations, edge function, shared module, harness suites, manifests).
The code gate runs, per slice (D11). The plan gate reviews this file.

## Rides along

Nothing beyond the two board items. Machinery surprises found mid-build are filed, not built.

---

# AMENDMENT — the merge sitting, 2026-08-12. Integrate with main, then re-verify.

The merge sitting adds steps 10 to 14. Steps 1 to 9 are done and their evidence stands. The reason
for the amendment is in `merge-rulings.md`: main took the acknowledgment-identity leaf, that leaf
edits the same shared req-001 suite, and the pull request is now unmergeable. **Read
`merge-rulings.md` before starting.** It carries the per-hunk ruling you implement.

**Merge main INTO this branch. Do NOT rebase.** A rebase rewrites the audited commits, and every
SHA in this record — the audited head `0b8517d` above all — would stop being an ancestor. The pull
request squash-merges, so a merge commit costs nothing and keeps the evidence chain intact.

10. **Take main into the branch and resolve the five conflicts** (`git merge origin/main`, main at
    `390042c`). Resolve every hunk as `merge-rulings.md` section 1 rules it: union the manifest id
    lists; drop `D3_L1`, `D3_L2` and `D4_L1` from the `LEAF` map; union the added bodies with the
    one closing brace they need between them; keep ONE declaration each of `TEXT_VERSION`,
    `CLIENT_IP` and `PASSWORD`; merge the two `'./_integration.ts'` imports into one. **Rewrite the
    header comment of `c-membership-and-acknowledgment.test.ts` to the merged truth** — never take
    one side of it, because each side states something the merge makes false. Done: no conflict
    marker survives anywhere in the tree; `bun run typecheck` exit 0; `bun run build` exit 0.
11. **Restate every count the merge changes.** `_pending.ts`'s header says 21 written and 16
    pending, and its map comment says SIX labels are gone. `loop/items/AI4DEV-62/pending-ledger.txt`
    lists the 16 remaining ids with their leaves. The prose list of per-leaf ledgers in `_pending.ts`
    gains this item's own ledger, which this branch created but never listed. Done:
    `bun run at:check req-001` green; the declaration-to-acceptance bijection holds.
12. **The migration version collision — VERIFY FIRST, then act.** The merged tree holds
    `20260811120000_acknowledgment_signer_identity.sql` (from main) and
    `20260811120000_org_membership_ngo_only_and_organization_rename.sql` (this branch) under ONE
    version stamp. Measure what the merged set does on slot 2 before changing anything, and record
    the measurement. If the duplicate version breaks the apply, skips a migration, or reorders it,
    rename THIS branch's file to
    `20260811125000_org_membership_ngo_only_and_organization_rename.sql`. That stamp keeps main's
    migration first, which is the true order, and keeps this branch's own two in their order.
    **Never rename a migration that is already on main.** Done: the measurement is recorded, and
    the integration run reports 5 migrations expected and 5 applied.
13. **Re-run the goal at BOTH tiers, all four runs**, serially on reserved slot **2** — do not
    reserve another. `bun run at:verify req-001 --tier loop --expect`, `… req-001 --tier
    integration --expect`, `… req-016 --tier loop --expect`, `… req-016 --tier integration
    --expect`. Done: four exit-0 runs, matching the merged manifest exactly — **req-001 loop 21
    green / 16 red, req-001 integration 16 green / 21 red**, req-016 unchanged at 11 green / 1 red
    and 0 green / 12 red. Carry each integration run's slot evidence line VERBATIM into your report.
14. **Record and push.** Write `artifacts/goal-runs-after-merge.md` with all four runs, both slot
    evidence lines, the migration measurement from step 12, and your iteration count. Commit and
    push. Done: `git status --porcelain` empty; the head is on the remote.

**The counts after the merge, superseding the table above:** req-001 loop 21 green / 16 red;
req-001 integration 16 green / 21 red; 5 migrations. The old 18/19 and 13/24 describe this branch
before it took main, and they no longer license anything.

**What you must NOT do.** Do not touch the pull request, the board, or anything outside this tree.
Do not rebase. Do not reserve a second database slot. Do not "improve" main's code that arrives
with the merge — resolve the conflicts and stop. If first-hand contact contradicts any ruling
above, stop and report it to the orchestrator sitting by its agent id.
