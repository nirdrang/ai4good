# AUDIT RULINGS — AI4DEV-58 (GitHub sign-in, mandatory GitHub link), sitting 4

Orchestrator on fable (claude-fable-5 @ xhigh). Auditor: gpt-5.6-luna, read-only, one run,
3 findings (`loop/items/AI4DEV-58/artifacts/audit-luna-raw.txt`, distillate beside it).

**Heads.** The auditor read head `aa00f78`. This sitting rules at `543d578`, which differs from
the audited head by exactly one commit — the four audit-artifact files, verified by
`git diff --stat aa00f78 543d578` (4 files, all under `loop/items/AI4DEV-58/artifacts/`). The
audit's evidence therefore describes the code at this head without exception.

---

## Finding 1 — high, `supabase/functions/_shared/edge.ts:19` — **ADOPT**

> "R7 is not implemented as ruled — The comment cites the predecessor script `.ts`, not its
> transcript `.txt`, and omits that predecessor schema evidence is superseded. Reviewers may
> follow invalid predecessor evidence for the current edge/schema."

Checked against the ruled text, not the summary. Gate-2 ruling R7 (`gate2-rulings.md:196-202`)
required both comments to retain "the predecessor's **transcript** for exactly what only it
still covers … while stating that its **completion-path and schema evidence** is superseded."
The fixture (`tests/at/suites/req-001/_fixture.ts:32-35`) implements that sentence exactly:
transcript cited, "completion-path and schema evidence is SUPERSEDED." `edge.ts:19-21` does
not: it cites `loop/items/AI4DEV-57/proof-local.ts` — the runnable script, which exists but is
not evidence; the transcript is — and writes "its completion-path evidence is superseded,"
dropping schema. Two real deltas from the ruled text.

**Class: the record is false — an adopted ruling not implemented as ruled. Never mergeable
as-is.** Direction: the tree changes to match the record, because the ruling's text was and
remains right — the predecessor transcript is the evidence for `create-organization`, and its
schema evidence is superseded as a matter of fact (the `complete_signup` it exercised no longer
exists). The executor rewrites the sentence at `edge.ts:19-21` to cite
`loop/items/AI4DEV-57/proof-local.txt` and to state completion-path **and schema** evidence
superseded, mirroring the fixture's already-correct sentence. No executable line changes.

---

## Finding 2 — high, `loop/items/AI4DEV-58/stack-up.txt:26` — **REJECT (the auditor is wrong)**

> "a credential is committed — The transcript embeds
> `postgresql://postgres:postgres@127.0.0.1...`. The changed tree contains a database
> username/password despite the no-credential requirement."

Verified directly against the file, not the distillate. The flagged value, in full, is
`postgresql://postgres:postgres@127.0.0.1:54322/postgres`, at lines 26 and 41 (both CLI
captures) and discussed at header lines 13–15. A whole-item grep for `user:password@` URL
shapes finds these two occurrences and nothing else; every key-shaped value in the transcript
(`PUBLISHABLE_KEY`, `SECRET_KEY`, `JWT_SECRET`, both demo JWTs, both S3 credentials) is
redacted.

**The string is not a credential; it is a public constant.** Four independent measurements:

1. It is the Supabase CLI's fixed local-development database URL — `supabase start` prints the
   identical string, `postgres`/`postgres` at `127.0.0.1:54322`, for every developer on every
   machine, and Supabase's public documentation prints it too. Knowing it grants access to
   exactly one thing: a database bound to the loopback interface of a machine whose owner
   started their own local stack. It authenticates nothing anywhere else.
2. GitHub push protection — a second, mechanical instrument — scanned this very file, refused
   the first capture over the real secret key (stack-up header lines 8–11), and passes this
   string. The scanner that caught the real secret does not classify this as one.
3. The identical string is already on main, merged through pull request #47, in the predecessor
   item's stack-up transcript at its lines 41 and 62 — reviewed precedent, not an oversight:
   that transcript's redaction rule (which this file copies) states the judgment explicitly.
4. The audit brief's rule (brief line 110: "No credential, key or token in any changed file")
   is a secrecy rule. A value that is publicly documented, identical for everyone, and unlocks
   only the holder's own loopback carries zero secret information; redacting it would make the
   record claim a credential had been present where none was.

**The boundary of this ruling, stated so it cannot be read as loosening:** a database URL with
any NON-default password, any routable host, or any value the CLI did not print identically for
everyone IS a credential under the brief's rule and gets redacted. What is rejected is solely
the classification of this one public constant. The auditor's claim goes verbatim into the pull
request body beside this ruling, per contract; it contains no foreign item id, so nothing is
elided.

Box B's "secrets FAIL" verdict is discharged by this ruling: it rested entirely on this
finding.

---

## Finding 3 — low, `loop/items/AI4DEV-58/pr-body.md:14` — **ADOPT**

> "the live PR description is stale — The PR says verification has not run, although this head
> contains `verify-final.txt` and completed proof evidence. The PR presents the current branch
> as deliberately unverified."

True as stated. The head carries `verify-final.txt` (all six verify commands exit 0) and
`proof-local.txt` (9 checks, 8 passed, 0 failed, 1 skipped), while the live description of pull
request #48 still says the draft "is deliberately un-verified." PHASE-STATE had queued the
rewrite for the merge sitting; the audit is right that a false statement standing live on the
record should not wait for it. **Fix executed this sitting:** `pr-body.md` rewritten to the
current truth — verification state, the single-reader draft-code gate disclosure, what the
green does and does not claim (plan section 4, including the R2 provenance sentence), and the
rejected audit claim verbatim — and pushed to the live pull request by a mechanical.

---

## The second audit run — not spent, with the reasoning on the record

The audit re-runs at most once per item, and only if code changes. Ruling: **these fixes change
no code, and the re-run is not triggered.** The full post-audit diff consists of comment text
inside `edge.ts` (the very record-citation sentence the audit was auditing — two token-level
corrections, zero executable lines), `pr-body.md`, `audit-rulings.md`, and `PHASE-STATE.md`.
None of the audit's PASS verdicts — behaviour, territory, scope, foreign ids, Box C facts — can
be invalidated by record text, and its one FAIL box (R7) is discharged by making the tree read
exactly as the ruled sentence specifies, verified by this orchestrator reading the final hunk
against the ruling. Spending the item's single re-run to confirm a two-token record correction
would be ceremony out of proportion — and would consume the budget that must stay available in
case CI turns red at merge and forces a real code fix, which per contract does go back through
the audit. The merge sitting can re-verify the no-code claim in one command:
`git diff aa00f78..HEAD` touches no executable line.
