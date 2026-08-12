# PHASE-STATE — AI4DEV-62 (per-org roles and isolation), batch with AI4DEV-63 (single seat, single developer)

**Phase: MERGE SITTING COMPLETE, AND IT DID NOT MERGE. The next event is the AUDIT RE-RUN — the
panel of two readers, at the new head.** Written by the MERGE sitting, orchestrator on **opus @
max** (the merge sitting runs on opus by design, founder 2026-08-11), 2026-08-12.

Chain, derived from the branch and confirmed against Linear:
`AI4PM-19 (auth and org membership)` > `AI4DEV-50 (auth root)` >
`AI4DEV-53 (org membership and seats)` > `AI4DEV-62 (per-org roles and isolation)`.
`AI4DEV-63 (single seat, single developer)` rides this branch.

## Why the merge did not happen

The pull request was UNMERGEABLE when this sitting opened. `AI4DEV-65 (who signed)` had landed on
main and edits the same shared req-001 acceptance suite. **The tree that would have merged was not
the tree that was verified or audited.** All rulings are in `merge-rulings.md`. In short:

1. Five files conflicted, including the declaration manifest. The conflict was additive in code and
   contradictory in one documentation block.
2. The merge changed every number a merge ruling would state: loop 18/19 → **21/16**, integration
   13/24 → **16/21**, migrations 4 → **5**.
3. **Two defects existed only in the merge**, and no audit reading a single tree could have seen
   either. A duplicate migration version left BOTH of this item's migrations out of the database
   the harness grades against. The acknowledgment-identity leaf made signer fields mandatory in the
   shared validator, which this branch's bodies predate.
4. CI then ran for the first time since the integration and went red on the **ownership guard**.
   The fix-and-goal sitting's deviation (iii), which committed `src/routeTree.gen.ts`, is
   **REVERSED** — that file has left the pull request.

Because code changed after the audit, this sitting ends here. **The audit re-run has NOT been used
and is now due.**

## The state at close — all verified, not assumed

- **The last CODE head is `4235a2e`**, pushed, tree clean. This state file rides in the close commit
  ON TOP of it; the conductor verifies the reported head against the remote.
- **The required check `verify` is GREEN on exactly `4235a2e`.** Confirmed three ways: the check run
  on that SHA concludes `success`; branch protection requires exactly `["verify"]`; `gh pr checks 55`
  reports `verify pass` (50s, run `31615606403`). Pull request `MERGEABLE`.
- **The close commit changes ONLY record files under `loop/items/AI4DEV-62/`.** So the audit
  instrument below returns an IDENTICAL result at the close head as at `4235a2e` — the record
  directory is not in the code territory. CI re-runs on the close head as a matter of course; the
  next merge sitting pins its own head and confirms green there.
- **No rebase happened.** `0b8517d` (the audited head), `65a9d4f` and main `390042c` are all still
  ancestors of HEAD, so every SHA in this record still means what it says.
- `git diff origin/main HEAD -- src/` is **EMPTY** — the item is wholly inside Claude territory.
- Four verification runs on the final tree, all exit 0, serial on slot **2**: req-001 loop 21 green
  / 16 red; req-001 integration 16 green / 21 red; req-016 loop 11 green / 1 red; req-016
  integration 0 green / 12 red. Both integration runs carry, verbatim:
  `at:verify — db slot 2 (ai4good-slot-2, api 56321) — reset OK — migrations: 5 expected, 5 applied`
- Record: `artifacts/goal-runs-after-merge.md`. Goal iterations this sitting: **ONE**.
- Executor invocations used: **2 of 3**.

## What completes the next phase — the AUDIT RE-RUN

**Both readers run again — never one seat.** luna via codex and flash via opencode, each launched by
its own reviewer-runner, each blind to the other, each handed its own brief. Raw output and
distillate into `loop/items/AI4DEV-62/artifacts/`; for the opencode reader also the tool-call
summary and identity extract.

### THE FIX DELTA, AND WHY THIS RE-RUN IS NOT SCOPED NARROW

Audited head **`0b8517d`** → new head **`4235a2e`**.

**Ruling: this fix is FAR-REACHING, so the re-run grades the FULL checklist. It does not carry
lines forward.** The re-run rule says a scoped fix earns a scoped re-read and a far-reaching one
does not. This one is far-reaching: five of the declared files were textually merged with main's
versions, a migration was renamed, test bodies gained mandatory fields, and one file left the
path-set entirely. The first pass cleared a tree that no longer exists in those places.

**Do NOT give the auditors `git diff 0b8517d...4235a2e`.** That range contains all of main's own
merged work, which this item did not write and must not be graded on. The correct instrument is
this item's contribution relative to main now:

```
git diff 390042c...4235a2e -- src supabase tests .github package.json bun.lock tsconfig.json
```

**The brief must not name `bun.lockb` or a root `vitest.config.ts`.** Neither exists in this tree.
The flash reader caught both in the first pass, correctly, and observed the claims were vacuously
true as a result. A claim that cannot fail proves nothing. The lock file is `bun.lock`.

**Execution evidence is CI's.** The brief must not ask a reader to run the suite. Cite the green
`verify` check on `4235a2e` and the recorded measurement files.

---

## THE REBUILT CLAIM CHECKLIST — grade every line by id, PASS / FAIL / COULD-NOT-VERIFY

### Box 1 — every adopted ruling is implemented as ruled

Carried from the first pass, re-anchored to the current tree. **C9, C13 and the migration filename
have CHANGED; C14 to C17 are new from this sitting.**

- **[C1]** (gate1 finding 1) AT-001.16 keeps its two-membership Given and drives THREE rename
  targets: organisation A (admin) succeeds; B (member) refuses not-an-admin and writes nothing;
  C (no membership) refuses not-a-member and writes nothing. Both tiers —
  `tests/at/suites/req-001/c-membership-and-acknowledgment.test.ts` (default body) and
  `_integration.ts` (`at00116`).
- **[C2]** (gate1 finding 2) `createOrganizationAsOperator(name)` exists on the SUT surface and
  creates an organisation with NO membership row: `_contract.ts`, `_fixture.ts` (direct state, no
  membership insert), `_live.ts` (operator SQL, no membership insert), and the name is in
  `backedSutMethods.accounts`.
- **[C3]** (gate1 finding 3) AT-001.17 carries a source arm running identically at both tiers, via
  `tests/at/suites/req-001/_source-scan.ts`: it enumerates `src/routes/` file names and the route
  paths in `src/routeTree.gen.ts` and asserts none matches invite or add-member naming. **The item
  no longer CHANGES that file; the arm still READS it.**
- **[C4]** (gate1 finding 4) `supabase/migrations/20260811130000_single_seat_org_and_single_developer_projects.sql`
  **line 123** runs `revoke all on table public.projects from anon, authenticated, service_role;`.
- **[C5]** (gate2 R2a) `_fixture.ts` `grantMembershipAsOperator` refuses in the database's order:
  account absent → `refused`; not NGO → `not-an-ngo-account`; organisation absent → `refused`;
  already seated → `org-already-seated`.
- **[C6]** (gate2 R2b) `_fixture.ts` `assignVolunteerAsOperator` refuses in the database's order:
  project absent → `refused`; seat occupied by a different account → `seat-occupied`; account
  absent → `refused`.
- **[C7]** (gate2 R2c, a REMOVAL) `_fixture.ts` `updateOrganization` holds NO organisation-existence
  pre-check. The condition was measured BEFORE the removal — `artifacts/gate2-verify-answers.md`
  v1, HTTP 403 kind `not-a-member` for a well-formed random uuid. Cite it; do not re-run it.
- **[C8]** (gate2 R3, both call sites) `_live.ts` classifies database refusals sentence-primary with
  SQLSTATE as agreement, at the membership-grant AND seat-assignment catch sites:
  `not-an-ngo-account` needs `/NGO accounts only/i` AND (no SQLSTATE OR `42501`);
  `org-already-seated` needs `/org_memberships_one_seat_per_org_idx/i` — the index's own name, not
  the generic duplicate-key half — AND (no SQLSTATE OR `23505`); `seat-occupied` needs
  `/single developer seat/i` AND (no SQLSTATE OR `42501`); anything else lands in `refused`.
- **[C9]** (gate2 R4) **RENAMED FILE.** In
  `supabase/migrations/20260811125000_org_membership_ngo_only_and_organization_rename.sql`, function
  `update_organization` trims with an explicit whitespace set, `btrim(p_name, E' \t\r\n\f')`, in
  BOTH the emptiness check and the `v_name` assignment. Measured before/after in
  `artifacts/gate2-verify-answers.md` v3 (after: SQLSTATE `22023`).
- **[C10]** (gate2 R5, UPDATE half) `repointMembershipAsOperator(organizationId, accountId)` exists
  across `_contract.ts` (outcome union ok / `refused` / `not-an-ngo-account`), `_fixture.ts` (the
  database's order; the re-keyed row KEEPS its role), `_live.ts` (a single `update … returning`;
  zero rows → `refused`; the catch classifies per C8), and `backedSutMethods.accounts`. AT-001.37
  gains ONE arm at BOTH tiers: re-pointing a seated membership at the volunteer refuses with
  `not-an-ngo-account`, and read-backs prove the row still holds the control account with its role.
- **[C11]** (gate2 R6) `_integration.ts`, AT-001.17's known-function control asserts `.toBe(401)`,
  not merely non-404.
- **[C12]** (gate2 R7) `_integration.ts`, AT-001.17's Data-API arm asserts status `401` AND a body
  matching `/permission denied/i` — the MEASURED shape per the ruling's own disagreement rule.
- **[C13]** **CHANGED BY THE MERGE.** `tests/at/suites/req-001/_pending.ts` header states **21**
  written and **16** pending, its enumeration names 21 ids, and 21 + 16 = 37. Its `LEAF` map holds
  neither `D3_L1`, `D3_L2` nor `D4_L1`, and its comment says **SIX** labels are gone.
- **[C14]** **NEW — merge-rulings 8a.** This branch's migration is
  `20260811125000_org_membership_ngo_only_and_organization_rename.sql`. No migration shares a
  version stamp with another, and main's `20260811120000_acknowledgment_signer_identity.sql` is
  UNCHANGED by this branch. Five migrations exist.
- **[C15]** **NEW — merge-rulings 8b.** Every completion in this branch's bodies that must SUCCEED
  carries signer name, title and authority via the shipped-constant idiom. The two that must be
  REFUSED deliberately do NOT — `c-membership-and-acknowledgment.test.ts:271` and
  `_integration.ts:862`, the volunteer completion carrying an organisation name — because the
  refusal fires at `supabase/functions/_shared/accounts.ts:235`, before the identity checks, and
  `accounts.ts:200-206` states that ordering is load-bearing.
- **[C16]** **NEW — merge-rulings 1.** The header comment of
  `c-membership-and-acknowledgment.test.ts` states the MERGED truth: AT-001.16, .36, .37, .17, .19,
  .39 and .20 are landed and written, and AT-001.18 alone stays declared on `LEAF.D3_L3`. It takes
  neither pre-merge side.
- **[C17]** **NEW — merge-rulings 9.** The item changes NO file under `src/`.
  `git diff 390042c...4235a2e -- src` is empty.

**Rejected rulings, listed so their absence is not read as a gap** — nothing to grade, residuals in
`gate2-rulings.md`: R1 (the definer RPC's existence-before-membership ordering, deliberate operator
diagnostics on a service-role-only path) and the `platform_admin` half of R5 (no arm; the
migration's comment is the pin).

### Box 2 — the diff stays inside the declared scope

The item declares its code territory is EXACTLY these **fourteen** files, and nothing else in the
source-only diff. **This is one fewer than the first pass, and one is renamed.**

```
supabase/config.toml
supabase/functions/_shared/memberships.ts
supabase/functions/update-organization/index.ts
supabase/migrations/20260811125000_org_membership_ngo_only_and_organization_rename.sql
supabase/migrations/20260811130000_single_seat_org_and_single_developer_projects.sql
tests/at/expected/req-001.json
tests/at/suites/req-001/_contract.ts
tests/at/suites/req-001/_fixture.ts
tests/at/suites/req-001/_integration.ts
tests/at/suites/req-001/_live.ts
tests/at/suites/req-001/_pending.ts
tests/at/suites/req-001/_source-scan.ts
tests/at/suites/req-001/c-membership-and-acknowledgment.test.ts
tests/at/suites/req-001/f-lifecycle-and-audit.test.ts
```

`src/`, `.github`, `package.json`, `bun.lock` and `tsconfig.json` are unchanged by this item.

### Box 3 — every stated fact about the code is true

- **[F1]** **REPLACED — the old F1 is reversed.** The item commits no change under `src/`.
  `bun run build` DOES regenerate `src/routeTree.gen.ts` (measured twice, the same ten-line
  type-only `declare module` block), and it is deliberately NOT committed. `bun run typecheck` and
  the four `at:verify` runs do NOT write that file.
- **[F2]** `supabase/config.toml` adds one function block, `[functions.update-organization]` with
  `verify_jwt = true`, and updates the surrounding comment's function count.
- **[F3]** In migration `20260811125000…`, `update_organization`'s execute is revoked from public
  and granted to `service_role` alone, and the function checks organisation existence (SQLSTATE
  `23503`, "no such organisation") BEFORE caller membership.
- **[F4]** The NGO-only trigger `org_memberships_grantee_must_be_ngo` (migration `20260811125000…`,
  **lines 95-96**) binds `before insert or update` on `public.org_memberships` — the UPDATE half is
  what refuses a re-pointed row.
- **[F5]** The one-seat guarantee is the unique index `org_memberships_one_seat_per_org_idx` on
  `org_id` alone (migration `20260811130000…`, line 41), and the project seat guard is the trigger
  `projects_single_developer_seat` (same migration, line 101).
- **[F6]** `public.projects` holds its developer as ONE nullable column, and no product path in this
  tree creates or assigns a project at either tier.

---

## After the re-run

- **Both readers clean:** a MERGE sitting (orchestrator-opus) merges. It must confirm `verify` green
  on the exact head it pins, state BOTH tiers' exact-match results for BOTH declaration manifests
  with the slot evidence line, and dispose of the residuals listed below.
- **Findings from either seat:** an AUDIT sitting (fable) rules on BOTH readers' findings. Note the
  audit re-run is once per item — a fix needing a SECOND re-run is scope growth and escalates.

**The `Closes AI4DEV-63` line is still ABSENT and that is deliberate.** This sitting ruled it stays
absent until the merge ruling that actually merges. The next merge sitting adds it, as one line of
exactly the shape `Closes AI4DEV-63`, alone on its line, at most one in the body. **No mechanical
was spawned this sitting**, because nothing was owed to the pull request.

## Residuals for the eventual merge ruling

1. The fixture's malformed-id transport divergence (gate-2 residual R2).
2. The `platform_admin` reading pinned by text, not by an arm (gate-2 residual R5).
3. AT-001.17's source arm is a naming oracle (gate-1 finding 3) — it proves the absence of invite
   NAMING, not of invite capability.
4. AT-001.16's green claims operation-surface isolation only (gate-1 finding 1); read-surface
   breadth stays with the tenant-isolation leaf.
5. The `runner.ts` stderr limit (merge-rulings 8a) — the CLI's failing statement never reaches the
   thrown message, because only the first non-empty stderr line is kept. Filed, not built.

## Process findings filed for the coordinator, not built here

1. **`bun run build` dirties a Lovable-territory file.** Every Claude-territory item that builds
   will regenerate `src/routeTree.gen.ts` and meet the ownership guard. Measured, and bounded:
   only the build writes it.
2. **`ci-status.ps1`'s standing hint mis-classifies the unmergeable pull request.** It prints "a
   dropped webhook never replays" whenever no run exists. An unmergeable pull request produces no
   `pull_request` run at all and looks identical. Reading `mergeable` / `mergeStateStatus`
   distinguishes them in one call. Following the hint here would have pushed an empty commit that
   could not have produced a run.

## Open questions

None for the founder. Nothing contradicts ratified text, and the integration work was normal
scope — main moved, and the item integrated with it.
