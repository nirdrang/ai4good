# Gate-1 rulings — AI4DEV-62 (per-org roles and isolation), batch with AI4DEV-63 (single seat, single developer)

Ruled by the DRAFT sitting, orchestrator on fable @ xhigh, 2026-08-11. Reviewer: gpt-5.6-sol via
codex @ xhigh, read-only, single seat (the plan gate is one reviewer by design). Four findings,
four rulings, none removes work. The amended `plan.md` in this same commit carries every fix.

---

## Finding 1 — high — the AT-001.16 refusal arm contradicts its own Given

Reviewer's claim, verbatim:

> The AT-001.16 oracle cannot prove two-organisation data isolation because `updateOrganization`
> has no acting-organisation context and the planned B refusal treats the actor as a non-member
> after the Given seats that actor in B.
>
> why it matters: An implementation can authorize solely from the target organisation, reject one
> rename, yet leak B data through reads or other operations and still pass; using a different
> A-only caller avoids the contradiction but no longer tests AT-001.16's two-membership Given.

**Ruling: accept, fixed differently.** The contradiction is real. The Given seats the actor in B
as `member`, so a rename of B refuses with the not-an-admin kind — the planned not-a-member
refusal on B cannot occur. The reviewer's two escapes are both wrong under the one-seat index: a
"different A-only caller" cannot exist, because the actor holds A's only seat. The fix is a
different TARGET, not a different caller: a third organisation C, operator-created, in which the
actor holds no membership. The amended arms keep the two-membership Given intact:

- rename A as admin succeeds;
- rename B (where the actor is `member`) refuses not-an-admin and writes nothing — admin standing
  in A does not carry into B;
- rename C (no membership) refuses not-a-member and writes nothing — no ambient authority exists.

The read-leak half of the claim is **narrowed, not adopted**. "Leak B data through reads" needs a
read surface, and this tree has none: RLS is on with zero policies, `org_memberships` has no Data
API grant, and the tenant-isolation policy set is deliverable D5.L1's, blocked by this leaf
(plan F4, D7). The .16 green claims operation-surface isolation; the merge ruling will state
this limit. Authorising from the target organisation's membership row is not a defect — it IS
the per-organisation role model the criterion demands.

## Finding 2 — high — the member Given is unconstructible under the one-seat index

Reviewer's claim, verbatim:

> The fixed SUT surface leaves the operator-provisioned `member` Given undefined under the
> one-seat index.
>
> why it matters: Both product organisation-creation paths immediately insert an `admin`
> membership, while the unique `org_id` index rejects another row; constructing AT-001.16/.36
> therefore requires either converting the existing row or creating an unseated organisation, but
> neither behavior is promised by `grantMembershipAsOperator` and no other method provides it.

**Ruling: accept.** The gap is exact: every product path seats its creator as admin, the index
then refuses a second row, and no planned method creates an organisation without a seat. Fix:
D8's set grows to SIX methods — `createOrganizationAsOperator(name)` creates an organisation
with NO membership row (fixture: direct state; live: operator SQL). The Given construction is
now stated in D2: the product path creates A and seats the actor as admin; the operator surface
creates B unseated and grants the actor B's single `member` seat. The same method mints
finding 1's organisation C.

## Finding 3 — medium — AT-001.17's "UI absent" clause has no executable oracle

Reviewer's claim, verbatim:

> AT-001.17 has no executable oracle for its "UI absent" clause.
>
> why it matters: Absence from the fixture SUT, a missing edge-function probe, Data API denial,
> and the database index do not inspect `src/routes`; an invite or add-member UI could be
> introduced while both-tier tests remain green.

**Ruling: accept.** The criterion's parenthetical says "UI absent; API rejects", and the plan
oracled only the second half. Fix: AT-001.17 gains a source arm in its `default` body (it runs
identically at both tiers): enumerate `src/routes/` and read the generated route tree
(`src/routeTree.gen.ts`); assert no file name and no route path matches invite or add-member
naming. Recorded residual, stated openly: this is a NAMING oracle — a deliberately renamed
invite UI escapes it, as it escapes any static check; semantic absence stays with review, and
the merge ruling's "what the green claims" carries this limit.

## Finding 4 — medium — migration B's privilege posture is asserted, not verified

Reviewer's claim, verbatim:

> Migration B promises a `projects` table with no grants but neither commits to explicit
> revocation nor verifies the resulting catalog privileges.
>
> why it matters: The preceding migration documents that Supabase default privileges gave a new
> public table `REFERENCES`, `TRIGGER`, and `TRUNCATE` until `REVOKE ALL` ran, and RLS does not
> protect `TRUNCATE`; a reset plus the planned acceptance tests could pass while the stated
> privilege posture is false. This must be settled after reset with
> `information_schema.role_table_grants` or `has_table_privilege` checks for `anon`,
> `authenticated`, and `service_role`.

**Ruling: accept, with the reviewer's own verification condition attached (it flagged the claim
unverified-runtime-claim: yes).** The tree already proves the hazard: migration 2 line 443 runs
`revoke all on table public.volunteer_profiles from anon, authenticated, service_role` and its
comment records that the need was found by measuring. Fix, both halves: (i) migration B carries
the same explicit revoke-all line for `public.projects`; (ii) step 7 gains verify-first (f) —
after reset on slot 2, the catalog check for the three roles on `projects` must return zero
rows, recorded with command evidence in the item record.

---

**Dispositions: 4 accepted (1 and 3 fixed differently in part or whole; 4 carries a verify-first
condition), 0 rejected.** No ruling removes work, so no removal condition exists.
