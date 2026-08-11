# AUDIT-phase rulings — AI4DEV-81 (per-item integration verification)

Ruler: the AUDIT sitting (fable). Subject: both audit seats' findings at head `1fef027`
(code head `41bcadc` — every commit after it touches only the record directory, so the
source-only diff is identical at both). The two briefs were byte-identical; both raw outputs
and both distillates are committed at `1fef027`. Seat one reported `AUDIT: 2 FINDINGS`;
seat two reported `AUDIT: 1 FINDING`. The seats CONVERGE on one defect (checklist line C5)
and DIVERGE on one (checklist line A12). Every finding is ruled below; the panel's clean
lines are recorded among the dispositions.

## AU-1 — seat one's finding [1], checklist A12: ACCEPTED — the code changes to match the record

The claim, verbatim from the distillate (severity high, `tests/at/suites/req-001/_live.ts:369`):

> claim: "`linkGithubIdentity` accepts a session handle without passing it through `tokensOf`."
> why it matters: "A registration handle with `sessionId: ''` reaches the operator
> `auth.identities` insert instead of refusing, allowing state mutation from a session the
> live stack never issued."

**Ruling: ACCEPTED.** This sitting verified the claim against the tree itself. Three pieces
of the record make `linkGithubIdentity` a session-taking operation in the record's own sense:

1. Draft ruling R-D3's text: "every session-taking operation refuses such a handle by name".
2. The contract doc (`_contract.ts:310-313`): a never-issued handle THROWS in `signOut` —
   "Same posture as `linkGithubIdentity`". The contract itself promises the refusal.
3. The sim fixture (`_fixture.ts:727-731`) applies "THE SAME UNIFORM VALIDATION every
   session-taking operation uses" and throws. The live adapter alone does not.

The class is *an adopted ruling not implemented* — the box no other check in the system
covers, and never mergeable as-is. The code changes to match the record.

**Remedy:** in the live `linkGithubIdentity`, before the operator insert, route the handle
through the one enforcement point: `tokensOf(sessions, session, 'link a GitHub identity')`.
The returned tokens are deliberately unused — the write itself is operator-level SQL and
needs none — and the comment must say exactly that: the validation is the point, not the
tokens. This keeps `tokensOf` "the one place the divergence is enforced" (`_live.ts:150`).

**Reachability, recorded beside the severity:** no exercised integration path passes a
registration handle to this method today. The greens pass signed-in sessions
(`_integration.ts:272` after `registerConfirmAndSignIn`, `:396` after a confirmed sign-in);
the reds AT-001.02/.03/.04 refuse at an unbacked establishment call before any link reaches
this method; AT-001.05 and AT-001.10 are synthetic `refusesWith` bodies that call nothing
else. The defect is the unimplemented ruling, not a currently reachable false green — the
seat's "high" is accepted for the class, with the exposure recorded as bounded.

**Verification condition, binding on the executor:** typecheck and build clean; harness
selftests still 344 (the guard is suite-adapter code, not harness code); all four
exact-match runs green at the new head with NO declaration amended. If any declared red's
kind shifts because the guard fires earlier than the declared refusal, STOP and report —
a declaration is never bent to fit a guard.

**Residual, noted and not acted on:** after gate-2 ruling S2-2 the live `sessions` map keeps
tokens through `signOut`, so a REVOKED handle passes `tokensOf`, while the sim fixture
refuses a dead session at link. That asymmetry sits on a path no test exercises, and R-D3's
subject is the registration handle class, not revocation. Written down here so it is an
observation on the record rather than a silent one; it does not join this fix.

## AU-2 — seat one's finding [2] and seat two's finding [1], CONVERGENT, checklist C5: ACCEPTED — the record changes to match the code

The two claims, verbatim from the distillates. Seat one (severity medium, `_live.ts:543`):

> claim: "The checklist's claim that the physical membership column is `organization_id` is
> false; the adapter queries `org_id AS organization_id`."
> why it matters: "The unchanged schema defines `org_memberships.org_id`; a query using
> physical `organization_id` would fail every membership read, although the current alias
> is correct."

Seat two (severity low, `_live.ts:543`, checklist line C5):

> claim: "C5 states the live adapter "reads the membership column `organization_id`"; the
> adapter reads `org_id` (aliased to `organization_id`): `select org_id as organization_id …
> from public.org_memberships where org_id = …`. The column is `org_id` per migration
> 20260808120000:57-62 (and 20260809090000:366-367), and the adapter's own comment says
> "THE COLUMN IS `org_id`, not `organization_id`" (_live.ts:537-540)."

**Ruling: ACCEPTED, as one defect.** Two seats converged independently on the same line —
the strongest signal a panel gives — at two severities; it is one ruling. The CODE is
correct and was exercised green (seat two: AT-001.06 in the recorded integration run). The
false statement is the claim about it. The truth: the physical column is `org_id`; the
adapter reads `org_id AS organization_id` because the CONTRACT's field is `organizationId`;
the code's own comment states the seam.

**Origin:** `rulings-fix.md` RF-2 item 4 inverted the two names ("The membership table's
column is `organization_id`; the adapter's read said `org_id`"), and the checklist's C5
sentence was written from it. Seat two's raw output identified the same origin.

**Remedy:** correct RF-2 item 4 in `rulings-fix.md`, carrying a visible correction marker
that names this ruling — the record changes to match the code in the open, never silently.
The sent briefs (`audit-luna.txt`, `audit-flash.txt`) stay byte-identical: they are the
historical record of what the panel was asked. The REBUILT checklist for the re-run carries
the corrected C5 text. No code change.

## Panel disposition notes

- **The seats diverged on A12.** Seat two graded A12 PASS by enumerating the `tokensOf`
  call sites (`:221`, `:401`, `:412`) and not checking `linkGithubIdentity` at `:369`.
  This sitting's own tree read confirms seat one's FAIL. Seat two's PASS on that line is
  recorded as incorrect — a clean line beside a failing line is evidence, never a veto.
- **Every other checklist line stands.** Seat one graded all remaining lines PASS except
  C6, C7, C9 = COULD-NOT-VERIFY — the expected honest markers for runtime and CI claims,
  whose evidence belongs to the required check. Seat two graded its full checklist with one
  finding. Those clean verdicts are part of this record.
- **Seat two's first-read caution.** Seat two noted its reading of the harness-machinery
  files was effectively the first landed one (its earlier attempt at those files terminated
  vendor-side, twice). Acknowledged — the brief carried that caution in advance. The A12
  miss is in suites territory (`_live.ts`), not harness, so it is an enumeration gap, not a
  first-read artifact. The harness verdicts stand as single-reading evidence, as the brief
  said they would.

## What follows

The executor applies AU-1 (one code edit) and AU-2 (one record correction) in one commit.
Fixes change code, so the once-per-item AUDIT RE-RUN of the whole panel follows at the new
head, scoped to the fix delta, with the rebuilt checklist. A further fix that would need a
second re-run is scope growth and escalates.
