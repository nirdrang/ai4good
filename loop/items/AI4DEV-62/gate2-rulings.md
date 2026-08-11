# Gate-2 rulings — AI4DEV-62 (per-org roles and isolation), batch with AI4DEV-63 (single seat, single developer)

Ruled by the FIX AND GOAL sitting, orchestrator on fable @ xhigh, 2026-08-11. The gate ran as
FOUR runs — two readers per slice, per the reviewers file's draft-code pins:

- slice 1 (`git diff 610ead7...c2a7b6b`): terra (gpt-5.6-terra via codex, max) — 5 findings;
  flash (opencode-go/deepseek-v4-flash, variant max, agent reviewer-flash) — 2 findings.
- slice 2 (`git diff c2a7b6b...d0444da`): terra — 4 findings; flash — 3 findings.

Fourteen findings, eight rulings: one four-way convergence is ruled once (R2), and one two-way
convergence is ruled once (R7). Each reviewer's claim is quoted verbatim beside its ruling. One
run anomaly is ruled first.

---

## A1 — the flash slice-1 run deviated from its pinned subject-acquisition method

Reported fact: the reviewer's cage had no git available, so it could not run the pinned
`git diff 610ead7...c2a7b6b`. Its own method note, verbatim:

> **Method note (read-only, no git available in this cage):** the tree I hold is the branch
> head, which contains the later slice-2 commits (AT-001.17/.32, migration B) as context. I
> could not execute `git diff`, so the subject's declarations were verified against the current
> files plus each file's own landing narrative (`_pending.ts`'s removed-label comments, the
> pending ledger, the 24→21→19 header count, which are all consistent with this commit flipping
> exactly AT-001.16/.36/.37 and removing `D3_L1`). The slice-2 material was treated as context
> per the contract.

**Ruling: the run stands as valid evidence; no re-run.** Three grounds. (1) Both of its findings
were independently reproduced: its finding 1 converges with terra slice-1 finding 2 and flash
slice-2 finding 2(a); its finding 2 converges with flash slice-2 finding 2(c) — and I verified
both against the code myself. (2) The slice was not left without a method-compliant reader:
terra reviewed the same slice under the pinned diff. (3) The deviation was stated openly in the
output, with its weaker point named — its slice-attribution checks rest on file-internal
narrative rather than on the diff. That weaker point is recorded here as the caveat: this run's
"declarations verified" boxes carry less weight than terra's, and nothing in this item leans on
them alone. The missing-git cage itself is a runner-environment defect, reported to the
conductor in this sitting's completion report — a process matter, not this item's code.

---

## R1 — terra slice-1 [1], high — the definer RPC's existence-before-membership ordering

Reviewer's claim, verbatim:

> `update_organization` checks organisation existence before caller membership, producing a
> distinct "no such organisation" error for an unknown ID.
>
> why it matters: A service-role RPC caller can distinguish an existing organisation they do not
> belong to from a nonexistent one, creating the existence oracle the edge path is meant to
> avoid. Verify by calling the RPC with the same account against an existing non-member target
> and an absent UUID.

**Ruling: reject — the ordering fact is true, the threat is not in this item's threat model, and
the risk is accepted.** The static fact needs no runtime verification: migration A raises
`23503 no such organisation` (line 136) before the membership read (line 144). But the ONLY
principal that can reach this function is a service-role key holder: execute is revoked from
public and granted to `service_role` alone. That principal is trusted infrastructure — it
already holds `select` on `org_memberships` and can invoke definer functions with arbitrary
arguments, so "which organisations exist" is not a secret the design keeps from it. The
existence oracle the design DOES avoid is the client-reachable one, and it is avoided: on the
product path a nonexistent well-formed organisation id is indistinguishable from a non-member
(403 `not-a-member` — R2's verify-first probe v1 measures exactly this). The distinct RPC
sentences are deliberate operator diagnostics, documented in the migration's own comment.
Collapsing them would cost diagnosis and protect nothing a service-role key does not already
expose.

## R2 — CONVERGENT, four runs — the fixture's refusal order is not the database's on three undriven paths

The strongest signal this panel produced: every run found part of it, and flash slice-2
finding 2 states the whole. Verbatim:

> the fixture's refusal ORDER differs from the database's on three operator paths, producing
> different kinds than the live tier would: (a) a grant into a nonexistent organisation with a
> non-NGO account — fixture answers `refused` (org check first), the database fires the BEFORE
> trigger first and answers `not-an-ngo-account` (42501); (b) an occupied project seat
> re-pointed at a nonexistent account — fixture answers `refused` (account check first), the
> database fires the guard trigger first and answers `seat-occupied`; (c) renaming a nonexistent
> organisation — fixture answers `refused`, the deployed function's REST read returns an empty
> set and answers `not-a-member`.

Convergent claims, verbatim, ruled here once:

- terra slice-1 [2] (medium): "The fixture checks whether an organisation exists before
  mirroring the NGO-only `BEFORE INSERT` trigger." — case (a).
- flash slice-1 [1] (low): "the fixture's operator grant checks organisation existence *before*
  the grantee-type rule, while the database's BEFORE trigger runs before the org foreign key is
  consulted, so the two surfaces answer differently for one input." — case (a).
- terra slice-2 [4] (medium): "The fixture checks parent/account existence before emulating the
  database `BEFORE` trigger conditions." — cases (a) and (b).
- flash slice-1 [2] (low): "the fixture's rename answers `refused` (\"no organisation … exists\")
  for a nonexistent organisation, while the deployed function answers 403 `not-a-member` for a
  well-formed-UUID nonexistent organisation, and the RPC backstop would answer \"no such
  organisation\" — three surfaces, three answers, and the fixture matches none of the two live
  ones." — case (c).

**Ruling: accept.** The divergences are real; I traced each against the migration, the driver
semantics recorded in verify-first answers (b) and (d), and the deployed function's read path.
The fixture's own comment claims "THE ORDER IS THE DATABASE'S ORDER" and is right about
trigger-before-index but wrong about the pre-checks. The fix makes the order the database's:

- **(a) `_fixture.ts` `grantMembershipAsOperator`** — order becomes: account absent → `refused`;
  account not NGO → `not-an-ngo-account`; organisation absent → `refused`; seat held →
  `org-already-seated`. (Database order: BEFORE trigger's two branches, then index/FK. The
  organisation-absent and seat-held cases are mutually exclusive — a seated organisation exists
  — so their relative order cannot diverge.)
- **(b) `_fixture.ts` `assignVolunteerAsOperator`** — order becomes: project absent → `refused`;
  seat occupied by a different account → `seat-occupied`; account absent → `refused`. (Database:
  a zero-row update fires nothing → `refused`; the guard trigger runs before the account foreign
  key.)
- **(c) `_fixture.ts` `updateOrganization`** — REMOVE the organisation-existence pre-check
  (current lines 1035–1036). An unknown organisation then flows to `orgAdminActionAllowed(null)`
  → `not-a-member`, which is the deployed function's decision. **This is a removal, so it
  carries a verification condition (v1), checked BEFORE the removal:** on slot 2, call the
  deployed `update-organization` with a valid session and a well-formed random UUID; the answer
  must be status 403, kind `not-a-member`. If it is not, the pre-check stays and the executor
  reports instead of removing. (This same probe settles flash slice-1 [2]'s flagged
  unverified-runtime-claim.)

**Residual, stated:** a MALFORMED (non-UUID) organisation id at integration answers 502
`refused` (the REST read fails at the parse layer), while the fixture would answer
`not-a-member`. No body drives malformed ids and the fixture's id namespace is not UUID-shaped;
modelling the wire's parse layer in the fixture would grade transport, not decision. Recorded,
not fixed. No new test arms are added for the reordered paths — no acceptance criterion reads
them; the alignment removes the latent disagreement the reviewers named.

## R3 — terra slice-1 [3] + terra slice-2 [3] — SQLSTATE alone can mint a meaningful refusal kind

Terra slice-1 [3] (medium), verbatim:

> The live adapter labels any SQLSTATE `42501` as `not-an-ngo-account` without requiring the
> NGO-only trigger's stated message. […] A different selective permission, policy, or trigger
> error for a volunteer can falsely satisfy AT-001.37's refusal arm while writing nothing; the
> NGO control can still succeed. Require the expected trigger message/identity together with the
> SQLSTATE.

Terra slice-2 [3] (medium), verbatim:

> SQLSTATE alone classifies arbitrary `42501` and `23505` failures as the expected membership
> refusal; the same `42501` shortcut classifies project-seat refusal at line 709. […] require
> the expected error message when a SQLSTATE is present, with message-only fallback only when it
> is absent.

**Ruling: accept — one ruling, both call sites.** Today no unrelated `42501`/`23505` source
exists on either operator statement (flash's directed answer 9 checked exactly this), so the
defect is drift exposure, not a live misread — but the tightening is cheap and strictly
stronger. Classification in `_live.ts` becomes sentence-primary with SQLSTATE agreement, at BOTH
catch sites (the membership grant and the seat assignment):

- `not-an-ngo-account`: message matches `/NGO accounts only/i` AND (no SQLSTATE was reported OR
  it is `42501`);
- `org-already-seated`: message matches `/org_memberships_one_seat_per_org_idx/i` — the
  index's own name, dropping the generic `duplicate key value` half, so an unrelated unique
  violation lands in `refused` — AND (no SQLSTATE OR `23505`);
- `seat-occupied`: message matches `/single developer seat/i` AND (no SQLSTATE OR `42501`);
- everything else stays `refused`.

## R4 — terra slice-1 [4], low — the RPC's `btrim` accepts tab-only names

Reviewer's claim, verbatim:

> The definer RPC's default `btrim` validation accepts tab-only names that
> `validateOrganizationName` rejects. […] A caller bypassing the edge through the permitted
> service-role RPC can rename an organisation to a visually blank name, so the database backstop
> does not preserve the shared validation rule. Verify with `p_name` set to a tab and read back
> the row.

**Ruling: accept.** The static reading is conclusive — `btrim(text)` strips SPACES only by
default — and the path is service-role-only, which caps severity exactly where the reviewer put
it. Fix in migration A's `update_organization`: trim with an explicit whitespace set,
`btrim(p_name, E' \t\r\n\f')`, in both the emptiness check and the `v_name` assignment.
Verify-first (v3), honouring the reviewer's flagged unverified-runtime-claim: before the fix,
confirm on slot 2 that a tab-only `p_name` currently succeeds; after the fix and a reset replay,
the same call refuses with `22023`. Both measurements recorded.

## R5 — terra slice-1 [5], medium — AT-001.37 drives neither `platform_admin` nor the UPDATE grant path

Reviewer's claim, verbatim:

> AT-001.37 tests only volunteer INSERT attempts, not `platform_admin` or an UPDATE that changes
> an existing membership's account. […] An INSERT-only trigger, or one that permits platform
> administrators, can leave both tiers green despite violating the planned NGO-only rule on
> every SQL path. Add direct operator arms for both cases with read-backs.

**Ruling: accept the UPDATE half, fixed as specified below; reject the `platform_admin` half,
with its residual stated.**

The UPDATE half is right and the migration itself names the attack: "without the update half, a
row could be inserted for an NGO account and then re-pointed at a volunteer, which is the same
grant reached in two statements." No test drives it, and re-pointing evades the one-seat index
(the row count does not change), so the trigger's UPDATE binding is the ONLY guard on a real
grant path — untested guards are what this gate exists to catch. Fix:

- **D8's method set grows to SEVEN (gate-2 amendment):** one new operator method — capability:
  re-point an organisation's existing membership row at a different account
  (`repointMembershipAsOperator(organizationId, accountId)`; exact name is executor latitude,
  the capability is fixed). Landed under F5e's rule: `_contract.ts` (outcome union: ok /
  `refused` / `not-an-ngo-account`), `_fixture.ts` (database order: no membership row →
  `refused`; new account absent → `refused`; new account not NGO → `not-an-ngo-account`; else
  re-key the row), `_live.ts` (`update public.org_memberships set account_id = … where
  org_id = …` returning the row; zero rows → `refused`; the catch classifies per R3), and
  `backedSutMethods.accounts`.
- **AT-001.37 gains one arm at BOTH tiers**, after the existing control seats the NGO account:
  re-point that seated membership at the volunteer → refused, kind `not-an-ngo-account`;
  read-back: the membership row still holds the control account with its role, and the
  volunteer's `membershipsOf` is still empty.

The `platform_admin` half is rejected on cost-to-provision against what it would pin. The
trigger's condition is one branch, `v_account_type <> 'ngo'`, and the volunteer arm drives that
exact branch; the fixture mirrors it as `accountType !== 'ngo'`. No path in this tree can mint a
`platform_admin` account — `complete_signup` refuses the type explicitly in both migration
versions ("a platform administrator is provisioned, never self-signed-up"), so the arm would
need a new operator provisioning path (an `auth.users` row plus a hand-built `accounts` insert)
whose only consumer is this arm. The criterion's own subject is the volunteer ("volunteer
accounts can never hold roles within an NGO"); refusing `platform_admin` is the migration's
deliberate stricter reading, documented in its comment. **Residual, stated for the merge
ruling:** a future rewrite that special-cases `platform_admin` would pass both tiers; what pins
the reading today is the migration's text and this record, not an executable arm.

## R6 — terra slice-2 [1], medium — the known-function control accepts any non-404

Reviewer's claim, verbatim:

> The known-function control accepts any non-404 response instead of the measured 401 response.
> […] A 500/502 or misrouted `create-organization` request passes the control, so the preceding
> 404 does not prove the functions router is live and resolving names; assert the recorded 401
> shape.

**Ruling: accept.** Verify-first answer (e) measured the deployed control's exact answer — 401
with a stated body — so asserting `.toBe(401)` costs nothing and makes the control prove the
router resolves names AND the resolved function runs. Fix in `_integration.ts`'s AT-001.17 arm 1
control. (Flash's directed answer 5 reported the same fact and judged the weaker assertion
adequate; that was a verdict, not a maintained finding, and the stronger assertion supersedes
it.)

## R7 — CONVERGENT, terra slice-2 [2] + flash slice-2 [1] — the Data-API arm proves less than the plan states

Terra slice-2 [2] (medium), verbatim:

> The Data API arm treats every HTTP error as privilege denial. […] A missing/stale table route
> (404) or server failure (5xx) passes, so AT-001.17 can green without proving `org_memberships`
> is unreachable because of its intended Data-API privilege posture.

Flash slice-2 [1] (low), verbatim:

> AT-001.17's Data-API arm asserts only `status >= 400`, so it cannot distinguish privilege
> denial from table absence or a down PostgREST; the plan's stated mechanism ("the membership
> table is unreachable through the Data API (F4's privilege layer)") is not what the assertion
> proves.

**Ruling: accept, ruled once.** The plan's claim is "unreachable because no privilege reaches a
client role", and `status >= 400` does not prove the BECAUSE. Verify-first (v2): measure on
slot 2 what the anon key actually receives reading `org_memberships` through the Data API —
status and body. The expected shape is 403 with a permission-denied body (the same privilege
layer verify-first answer (c) measured for the revoked service role); the arm is then pinned to
the MEASURED status and a body fragment naming the permission denial. If the measurement
disagrees with 403, the measured shape is what gets pinned, and the measurement goes in the
record either way.

## R8 — flash slice-2 [3], low — the pending header contradicts its own enumeration

Reviewer's claim, verbatim:

> the header sentence "Thirteen are written" contradicts the enumeration in the same paragraph,
> which names 18 written ids (7 + 2 + 4 + 3 + 2), followed by "The other 19" — 18 + 19 = 37, so
> the enumeration is the true state and "Thirteen" is a stale pre-slice-1 count.

**Ruling: accept.** Verified by my own read of `_pending.ts`: the enumeration names eighteen
ids and the count line says 19 remain; 18 + 19 = 37. Fix: "Thirteen are written" → "Eighteen
are written". One word; the file's F9 discipline is exactly why one stale word in it is worth a
finding.

---

**Dispositions: 14 findings → 8 rulings. Accepted: R2 (four-way convergence, carries removal
condition v1), R3 (two findings), R4 (carries verify-first v3), R6, R7 (two-way convergence,
carries verify-first v2), R8, and the UPDATE half of R5 (amends D8 to seven methods). Rejected:
R1 (threat outside the model — service-role-only path), and the `platform_admin` half of R5
(cost-to-provision against a branch already driven; residual stated). One run anomaly (A1)
ruled: the flash slice-1 run stands as evidence with its caveat recorded; no re-run.**

Verify-first conditions attached: v1 (R2c's removal — deployed rename of a nonexistent
well-formed UUID answers 403 `not-a-member`), v2 (R7 — the anon-key Data-API answer on
`org_memberships`, measured then pinned), v3 (R4 — tab-only `p_name` accepted before the fix,
refused `22023` after). The executor checks v1 and v3's before-half FIRST, before any fix.
