# Review prompt — AI4DEV-65

## Your contract

**Stateless — never resumed.** Every run is a fresh session, fully specified by four things: the
tree at a pinned commit, this prompt, the model and effort pins, and the launch cage — a read-only
sandbox, or an agent definition whose write tools are removed. A review
is a function of a commit. This deletes three hazards that cost real time: a resumed session
running as the wrong model because the resume was unpinned, a vendor refusing to resume outside
its creating directory, and recovering half-written output from a session store. If an output is
lost, re-run it — the result is a fresh sample of the same commit, not a reproduction, and say so.

**You read; you never execute.** You are not asked to run the test suite. If a claim depends on
runtime behaviour, **mark it as unverified** and state exactly what would settle it. That marker
is not a weakness — it becomes a *verify-first* ruling, and the executor checks it with first-hand
access. Reviewers assert; the executor verifies.

**NO WRITES — stated, not assumed.** The launch cage is the enforcement — a read-only sandbox, or
a removed tool set — and this sentence is the instruction; every launch prompt carries it
explicitly. A read-*intended* reviewer once
wrote probe files into the tree to check a finding empirically and cleaned up only by its own
choice (2026-08-05). Do not create, edit or delete anything in the tree — not a scratch file, not
a probe, not a temporary copy. If a claim can only be settled by writing something, that is a
*verify-first* finding for the executor, and saying so is the correct answer.

**Scope is the change, not the codebase.** You have whole-tree access because verifying a claim
needs context beyond a hunk. But a defect in code this branch never touched belongs to another
item — mention it once, outside your findings, and move on.

**Write paths relative to the repository root**, never the launcher's directory. A committed
prompt that names a worktree path has twice pointed reviewers at a directory that no longer
existed.

**Output is findings, not a transcript.** Your final message is the whole deliverable. A progress
line is not a critique; if you have no findings, say so in one line — an empty gate must be
visible as empty, never mistaken for a clean one.

**Do not pad, and do not suppress.** A qualifier, a naming preference, or a concern you cannot
state as a concrete failure is not a finding — do not manufacture one to look thorough. But a
concern you actually hold is never deleted to keep the list short: state it, and say plainly how
sure you are. **Dropping an observation is a ruling, and rulings belong to the orchestrator.** The
format below is the bar for how a finding is WRITTEN — a concrete location, a plausible failure,
something an engineer can act on — never a filter on whether it is reported at all.

**Assume you are the only reader this commit will get.** You will see other roles named in this
contract — someone verifies runtime claims, someone rules on what you report, someone reads your
output. None of them is a reason to leave anything out. **Never withhold a concern on the grounds
that it is someone else's department, that a later stage will catch it, or that it is not what you
were asked to look at.** A concern you decline to raise because you assume it is covered is a
concern nobody raises. If it falls outside your subject, say so beside the finding — but say it.

Every finding you report:

```
[n] severity: <your own scale, stated>    <path>:<line>
    claim: <one sentence, the defect itself>
    why it matters: <the concrete failure — inputs or state → wrong result>
    unverified-runtime-claim: yes | no
```

**Close with a count line, alone on the last line**, using the label your own section gives you —
`CLEAN`, or a count of findings. It is your own declared total, and it is what makes a cut-off file
tell on itself: output that stops after a complete finding looks whole, and only the missing
terminal line shows that it is not. The distiller compares it against what it extracted and
reports any mismatch.

---

## The AUDIT — critique of the CLAIM

**Subject** · **THE CODE, ONLY THE CODE (founder ruling 2026-08-10: "I want auditor only in
code not on records at all").** Three product items in a row produced fourteen audit findings,
every one about the record's own prose — miscounted totals, citation wording, stale status
paragraphs — and zero about code, at a cost of roughly two extra hours per item. That class of
finding is now OUT OF YOUR SCOPE. You read the record only as the list of claims to test
against the tree; you never raise a finding about the record itself — not its counts, not its
citations, not its headers, not its phrasing.

**Your change-set instrument is a SOURCE-ONLY diff (founder ruling 2026-08-10).** Enumerate the
changes with the pinned range restricted to the code territory — the same path set CI's fast
lane derives from:

```
git diff <base>...<head> -- src supabase tests .github package.json bun.lockb tsconfig.json vitest.config.ts
```

The record directory (`loop/items/`) never enters the diff you read. The full tree stays open
for TRACING a claim through unchanged code — following an import, reading a caller — but the
list of what you audit comes from that command and nothing else.

Code quality is not your subject either. You are answering one question: **does the code match
what is claimed about it?**

- **Every adopted ruling is implemented as ruled.** A ruling recorded but not implemented in the
  code is a FAIL — this is the box no other check in the system covers.
- **The diff stays inside its declared scope.** Compare what changed against what the item says
  it changed.
- **Every stated fact about the CODE is true.** Trace the logic yourself, character by character
  where it matters — a shell trap, a regex, a guard's field handling. A false statement about
  code is a finding; a clumsy sentence about a true fact is not.

**The item's additions give you the CLAIM CHECKLIST — grade every line of it.** This item's
brief lists its specific testable claims: the rulings it adopted (by id), the code territory it
says it stayed inside, and each concrete fact it stated about the code. Confirm each against the
tree and answer it by name. The checklist is your FLOOR, never your ceiling — a false claim it
omits is still a finding — but nothing on it may go unanswered.

**On a RE-RUN, your change-set is the FIX DELTA, not the whole range.** The previous audit already
cleared the tree at the earlier head; only the fix moved it. Read `git diff <prev-audited-head>...<head>`
restricted to the code territory, and re-grade every checklist line the delta can REACH — not only
the files the delta edited, but any claim whose subject the delta could affect: a caller of a
changed function, an importer of a changed module, a reader of changed config or shared state.
**"Untouched" means the delta cannot reach the claim, NOT that the claim's file is byte-identical** —
a fix to a shared helper can falsify a claim about a file that never changed. Carry a line forward
only when you can say why the delta cannot reach it; when in doubt, re-grade it. **One box always
re-checks in full**: "diff stays in declared scope", against the full `<base>...<head>` file list
(still restricted to the code territory — the record directory never enters it), because a fix can
add a stray file the narrow delta would hide. Say which boxes you carried forward and on what
independence, rather than silently re-deriving them. This is what keeps the once-per-item re-run
cheap without making it blind: a scoped fix earns a scoped re-read, a far-reaching one does not.

**Do not run the test suite.** Execution evidence belongs to the required CI check on this
commit: cite it, do not re-derive it. This is a deliberate narrowing, measured across four items —
attempted execution here produced almost nothing but "could not verify", and once produced two
FAIL verdicts that were sandbox artifacts rather than defects, while every reading-and-tracing box
was answered every time.

**Verdict per box: PASS · FAIL · COULD-NOT-VERIFY**, each with the evidence you personally
gathered — the file and line, or the reasoning you traced. Then a final line: `AUDIT: CLEAN` or
`AUDIT: N FINDINGS`.

**You report; you rule on nothing.** The orchestrator rules, and it may dismiss your finding with
a written reason — that is its authority, and your claim will be recorded verbatim beside it.

---

## This item's additions — AI4DEV-65 RE-RUN, and the rebuilt CLAIM CHECKLIST

The item: every acknowledgment captures the signer's name, title and an attestation of
authority; omission rejects; the shipped copy prohibits shared credentials and recommends an
organisation email address. Acceptance ids AT-001.19, AT-001.20, AT-001.39.

**THIS IS THE ONCE-PER-ITEM RE-RUN.** The first audit ran at head
`6ee87419b88aa210b1d08003536469666b65fec0` and produced two accepted findings. Both fixes are
in. Your change-set is the FIX DELTA, per the re-run paragraph of your contract above:

```
git diff 6ee87419b88aa210b1d08003536469666b65fec0...9728a82f9361e5138f4f65ac51c637d3bf148551 -- src supabase tests .github package.json bun.lockb tsconfig.json vitest.config.ts
```

**Full pinned range**, for the one box that always re-checks in full (declared scope): base
`ea4f3453ed59081a3e24c035e6d321d1f2ebaa45`, head
`9728a82f9361e5138f4f65ac51c637d3bf148551`. Any branch commit after that head is record-only
(files under `loop/items/`, which the source-only diff excludes by construction). The record —
the claims you test — is `loop/items/AI4DEV-65/plan.md`, `gate1-rulings.md`,
`gate2-rulings.md` and `audit-rulings.md` at the branch head.

### Rebuilt checklist — the two rulings the first audit adopted

- **R9** (audit ruling on audit finding 1 — accept, comment-only): the migration's
  rolling-deploy paragraph (the "THE THREE NEW PARAMETERS CARRY `default null`" block in
  `supabase/migrations/20260811120000_acknowledgment_signer_identity.sql`) no longer claims the
  previous columns were nullable. It states the real prior mechanism: the previous defaults let
  an old five-named-argument call resolve; an NGO completion writes no `volunteer_profiles` row;
  volunteer completion was fail-closed in a mixed-plane window. It keeps the conclusion: no
  caller class avoids the three new columns, so the new defaults are call-signature tolerance
  and not a bridge.
- **R10** (audit ruling on audit finding 2 — accept, comment-only): the
  `AcknowledgmentRow.authorityAttestation` comment in `tests/at/suites/req-001/_contract.ts`
  scopes the exactly-one-value claim to the deployed path (`validateCompleteSignup`), names the
  service-role residual as accepted, and points at the migration's "WHERE THIS FILE'S AUTHORITY
  ENDS" section.

### Rebuilt checklist — new concrete facts the fix states about the code

- **F11**: the fix delta changes COMMENTS ONLY. Every changed line in the migration is a `--`
  comment line; every changed line in `_contract.ts` sits inside one JSDoc block. Zero SQL
  statements and zero TypeScript declarations change.
- **F12**: in the previous migration
  (`supabase/migrations/20260809090000_volunteer_github_link_and_imported_profile.sql`), all
  four `volunteer_profiles` content columns (`github_handle`, `top_languages`,
  `repository_count`, `contribution_summary`) are `not null`.
- **F13**: the previous migration's own bridge comment states the mechanism the rewritten text
  cites: the four github parameters carry `default null` so a five-named-argument call still
  resolves; the NGO path omits the github keys; the honest residual is volunteer completion
  unavailable (fail-closed) during a mixed-plane window.

### The first audit's checklist, reproduced for carry-forward

R1–R8, the 13-path territory and F1–F10 below are the FIRST audit's checklist, already graded
at the earlier head. Re-grade any line the fix delta can reach; carry the rest forward and say
on what independence. The declared-scope box re-checks IN FULL against the full-range file
list — the fix must add no fourteenth path.

### Checklist section 1 — adopted rulings, each to appear in the tree as ruled

- **R1** (gate 1 ruling 1): the three new `complete_signup` parameters carry `default null` for
  call-signature tolerance only; the migration's comments claim no rolling-deploy bridge; the
  three columns are `not null`.
- **R2** (gate 1 rulings 2 and 3): `validateCompleteSignup` imports
  `ACKNOWLEDGMENT_IDENTITY_COPY` and its fourth identity check refuses an attestation whose
  trimmed value is not exactly `authorityStatement`, with a refusal naming the mismatch; the
  copy module is thereby in the deployed function graph
  (`supabase/functions/complete-signup/index.ts` → `_shared/accounts.ts` →
  `_shared/acknowledgment-copy.ts`); AT-001.39's loop tier includes a wrong-content variant
  using the literal `'I am not authorized'`, refused with no writes; AT-001.20 asserts meaning
  by pattern (`/shared credential/i` and `/prohibit/i`; `/organi[sz]ation email/i` and
  `/recommend/i`), not mere existence.
- **R3** (gate 1 ruling 5): the migration ends with the re-stated revoke/grant tail and then
  `notify pgrst, 'reload schema';`.
- **R4** (gate 1 ruling 6): after EVERY refusal variant in AT-001.39, the assertions include:
  no account row, no acknowledgment rows, `hasPlatformAcknowledgment` false,
  `organizationsNamed(<the submitted NGO name>)` empty, and `membershipsOf` empty — at loop
  tier for all seven variants, at integration tier for the three omission variants.
- **R5** (gate 1 ruling 7): all three column constraints use the shape `col !~ '^\s*$'` —
  never one-argument `btrim`.
- **R6** (gate 2 ruling on terra's finding 1 — accept, FIXED DIFFERENTLY): the migration's
  `authority_attestation` comment block states the boundary ("WHERE THIS FILE'S AUTHORITY
  ENDS": constraints floor presence and nonblank; the content pin lives in
  `validateCompleteSignup`; the service-role residual is accepted). **The ABSENCE of any
  exact-statement check in SQL is the ruled state** — finding a database-level content pin
  would be a deviation from the ruling, not a fix.
- **R7** (gate 2 ruling on terra's finding 2 — verify-first, branch B held): the migration
  comment states the two blank floors ("THE TWO BLANK FLOORS ARE NOT THE SAME WIDTH", POSIX
  `[[:space:]]` vs ECMAScript `trim()`, U+FEFF measured) and points at the committed
  measurement file. **No constraint change was made — again, the absence is the ruled state.**
- **R8** (gate 2, flash's self-dismissed concern, dismissal ratified): the function body does
  NOT `btrim` the three new parameters — the trim guarantee belongs to the validation layer.
  The absence is the ruled state.

### Checklist section 2 — declared code territory

The source-only diff over the pinned range touches EXACTLY these thirteen paths and no others:

```
supabase/functions/_shared/accounts.ts
supabase/functions/_shared/acknowledgment-copy.ts
supabase/functions/complete-signup/index.ts
supabase/migrations/20260811120000_acknowledgment_signer_identity.sql
tests/at/expected/req-001.json
tests/at/suites/req-001/_contract.ts
tests/at/suites/req-001/_fixture.ts
tests/at/suites/req-001/_integration.ts
tests/at/suites/req-001/_live.ts
tests/at/suites/req-001/_pending.ts
tests/at/suites/req-001/a-signup-and-signin.test.ts
tests/at/suites/req-001/b-verification-and-sessions.test.ts
tests/at/suites/req-001/c-membership-and-acknowledgment.test.ts
```

In particular `src/routeTree.gen.ts` must NOT appear.

### Checklist section 3 — concrete facts the item states about the code

- **F1**: the recreated `complete_signup` reproduces every refusal of the previous definition
  word for word — the `platform_admin` guard, the unknown-type refusal, both NGO-name rules,
  the volunteer GitHub link refusal and the handle-binding backstop against `auth.identities`,
  the three import checks, and the already-completed refusal. Compare against the previous
  definition in `supabase/migrations/20260809090000_volunteer_github_link_and_imported_profile.sql`.
- **F2**: the drop names the exact previous signature
  `(uuid, text, text, text, inet, text, text[], integer, text)`; the recreate appends exactly
  three parameters `p_signer_name`, `p_signer_title`, `p_authority_attestation`, each
  `text default null`.
- **F3**: the privilege tail matches the previous migration's posture — revoke execute from
  public, grant execute to `service_role` only.
- **F4**: the edge function passes the JUDGED values (the validation decision's fields) as the
  three new arguments — never the raw body values.
- **F5**: `validateCompleteSignup` keeps every pre-existing check before the four new ones, and
  the new four run in the order name → title → attestation-present → attestation-match, each
  refusal naming its field. Requests refused by an earlier check never reach the new four —
  which is what keeps AT-001.01's, AT-001.04's and AT-001.07's pinned refusal reasons true.
- **F6**: the acknowledgment insert carries the three new columns and remains the LAST write in
  the function body.
- **F7**: `tests/at/expected/req-001.json` moves exactly AT-001.19, AT-001.20 and AT-001.39 to
  green in BOTH tiers and changes nothing else; `tests/at/expected/req-016.json` is untouched
  by the diff.
- **F8**: `_pending.ts` no longer contains the `D4_L1` leaf, and its header count went from 24
  to 21.
- **F9**: AT-001.19's integration body drives the email path only, and a comment beside it
  states the GitHub-path narrowing.
- **F10**: AT-001.03's shared request object stays byte-identical between its two calls after
  the ripple that added the three fields to completion requests.

Grade R9, R10, F11–F13 and the declared-scope box by name, PASS / FAIL / COULD-NOT-VERIFY with
your own evidence. For every carried-forward line, name it and state why the delta cannot reach
it. The checklist is your floor, never your ceiling — a false claim it omits is still a finding.

Your count line is `AUDIT: CLEAN` or `AUDIT: N FINDINGS`.
