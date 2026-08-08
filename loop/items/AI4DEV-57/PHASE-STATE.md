# AI4DEV-57 (email + Google signup, three account types) — phase state

**Phase just completed:** a short **CREDENTIAL sitting (sitting 6)**, inserted between the audit and
the merge because a new fact arrived that changes what the merge ruling is allowed to claim. The
founder created the Google OAuth client; step 7 was re-run against a stack restarted with it; **check
(f2) moved from an honest SKIP to a PASS.** No code changed — this sitting's diff is records only.
The audit sitting before it ruled all 7 audit findings in `audit-rulings.md`, plus one finding of its
own the audit could not have made.
**Phase next:** **continuous integration on the new head, then the MERGE sitting.** There is still no
second audit, and this sitting did not spend that cap either — the reasoning is below and the merge
sitting may disagree with it.
**Branch:** `nirdrang/ai4dev-57-email-and-google-signup-and-the-three-account-types-d1l1`
**Chain, derived from the branch:** AI4DEV-57 (email + Google signup, three account types) →
AI4DEV-51 (accounts and sign-in container) → AI4DEV-50 (auth dev-tree root) → AI4PM-19 (the
authentication requirement). No `attr:` label anywhere on the chain. Product work under a real
requirement; this leaf itself closes on a merged pull request.

**This chain line names three other board items on purpose, and that is CORRECT — do not "fix" it.**
The audit called it a violation because the audit brief's rule was written too broadly; the rule is
corrected in `audit-brief.md` and the reasoning is in `audit-rulings.md` finding 3. Linear links from
a pull request's title and body and from commit messages, never from file contents; the repository's
own guard reads only `.title + .body` from the GitHub API; and `main` already carries 65 distinct item
ids in its own files. Recording the derived chain is **required** by the way of work.

---

## THE OPUS FALLBACK IS IN FORCE FOR THIS ITEM, NOT JUST ONE SITTING

Fable is out of credit. Every orchestrator sitting on this item runs as `orchestrator-opus` (opus at
effort max), a different agent TYPE, never a model override on the fable definition. A fable ruling
and an opus ruling are not the same evidence: every decision in `plan.md`, all nine rulings in
`gate1-rulings.md`, all eight in `draft-rulings.md`, all thirty-odd in `fix-rulings.md` and all seven
in `audit-rulings.md` are opus rulings. A successor sitting that finds itself running as fable should
say so in its first line rather than assume continuity.

A session limit is not the same thing as being out of credit. If the reason ever reads
"You've hit your session limit · resets HH:MM", that is the account-wide five-hour window, it heals
itself, and an opus agent hits the same wall.

---

## STANDING HAZARD — STILL BINDING. READ BEFORE RUNNING A BUILD ON THIS BRANCH

**`bun run build` rewrites `src/routeTree.gen.ts`.** Ten lines, a stale `declare module` block,
deterministic, reproduced twice by the executor and reverted both times.

Continuous integration fails any pull request whose files match **both** `^src/` and
`^(supabase|tests|loop|\.claude|\.github)/`, and this branch is permanently on the wrong side of that
line. **So an unexamined `git add -A` after a build breaks the build**, for a reason that has nothing
to do with the change.

Build is not in step 8's done-criterion — that list is `typecheck`, `at:selftest`, `at:check` and
`at:verify --expect` for both requirements — and nothing ruled in this item touches anything a build
covers. Verified again at this close: `git diff main...HEAD --name-only` matches `^src/` **zero
times**.

Regenerating that file properly is a `src/`-only change belonging to a different pull request.
**Filed, not fixed.**

---

## A SECOND STANDING HAZARD, NEW AND EXPENSIVE — WRITING FILES THROUGH POWERSHELL CORRUPTS THEM

**The audit's most serious finding was character-encoding corruption**, and it is worth carrying
forward because nothing in this repository's verify surface can catch it.

Every em-dash in `tests/at/harness/type-invention.selftest.ts` had become `â€”` — 27 of them, the
UTF-8 bytes of an em-dash decoded as Windows-1252 and re-encoded. A four-line surgical change read as
31 changed lines. **All 251 self-tests passed and CI was green**, because the corruption landed in
comments, `it()` test names and assertion messages while the asserted `marker` strings contain no
em-dashes.

- **Never write a source file with `Set-Content`/`Out-File` defaults.** Use
  `[System.IO.File]::WriteAllText($path, $text, (New-Object System.Text.UTF8Encoding($false)))`.
- **`>` redirection in this environment writes UTF-8 WITH a byte-order mark.** This produced a second,
  self-inflicted false finding during the repair: temp files written with `>` appeared to prove that
  four files had lost a BOM, and one BOM was "restored" that `main` never had. The diff caught it. Do
  not compare `git show X > tmp` against a working file and trust the first bytes.
- **Detect it programmatically, never by eye:** the PowerShell console misrenders correct em-dashes
  as mojibake, so four healthy files looked corrupt. `[System.IO.File]::ReadAllText` plus a real
  character-code comparison is the only reading that is true.

---

## THE DRAFT-CODE GATE HAS ONE READER, BY FOUNDER RULING — THIS IS THE DESIGN NOW

**The second reader is stopped permanently. A single reader on the draft-code gate is the design going
forward, not a temporary degradation awaiting repair.** Do not attempt a second-reader launch on this
item, and do not describe the single reader as a shortfall in the merge ruling.

**What this particular change received, stated as two separate facts because averaging them hides
which half is thinner** — this is the founder's instruction and the pull request body follows it:

- **SQL and configuration slice: ONE completed reader** — terra, 8 findings — where the two-reader
  design applied at the time.
- **TypeScript and tests slice: BOTH readers completed** — terra 11 findings, kimi 7.

The second reader exhausted its billing quota partway through the SQL slice and **never emitted a
verdict or a closing count line**. Its salvaged notes were therefore treated as **leads to verify
against the tree**, not as a reviewer's findings — the method is written out in `fix-rulings.md`
Part C so an auditor can check the method rather than the outcome.

**One of those leads produced the single most valuable check in the item** (L3): nothing anywhere
proved that a **service-role** write into `public.accounts` is refused, which is the load-bearing half
of this item's "there is no key-reachable write path — it is the only door" security claim. Check (e)
only ever used the *authenticated* key. That check now exists and passes.

---

## What completes the next phase

**CI green on the new head, then the MERGE sitting.**

The merge sitting absorbs the audit's wait and CI's together. It must:

1. **Record the audit's verdict among the dispositions.** The audit found 7; five were accepted and
   fixed, one rejected with its claim recorded verbatim, one a stale reference corrected. That is
   evidence and belongs in the ruling, not a step that silently did not happen.
2. **State the gate coverage as two separate facts**, per the founder ruling above. Not blended.
3. **Describe check (f2) as a PASS — and describe precisely what it proves**, which is wiring and
   configuration, never sign-in and never "the provider is reachable". The Google credential section
   below is rewritten and is the binding text.
4. **Carry the rejected finding's claim verbatim into the pull request**, which
   `audit-rulings.md` finding 3 already quotes in full.
5. **Confirm the required check green on the exact merge SHA** and record both the run and the commit.
6. **Hand the merge to a mechanical.** The orchestrator never runs the merge command (founder ruling
   2026-08-07). If the mechanical reports a permission refusal, that is a STOP: report it upward with
   the exact denial text and end the sitting.

---

## The state of the code, honestly

**Tree clean at the close of this sitting. The pushed head is reported in this sitting's completion
report** — a state file cannot name the commit that carries it, because that SHA does not exist until
after this file is written. This line exists because the previous version of this file named a head
(`b4688fe`) that was stale by the time it was committed, which the audit correctly flagged as finding
7. Obtain the real head with `git rev-parse HEAD` on this branch, or from the conductor's record.

**Re-run by me at this head after every fix, and not taken from any report:**

| what | result |
|---|---|
| `bun run typecheck` | **exit 0** — app and acceptance-test projects both clean |
| `bun run at:selftest` | **exit 0 — 9 files, 251 tests passed** |
| `bun run at:check req-001` / `req-016` | **exit 0** — 37 and 12 P0 ids, both in bijection |
| `bun run at:verify req-001 --tier loop --expect` | **exit 0 — 37 P0: 4 green, 33 red, 0 missing**, matching the declaration exactly |
| `bun run at:verify req-016 --tier loop --expect` | **exit 0 — 12 P0: 11 green, 1 red**, identical to the step-0 baseline |

`req-016` being untouched is the control that says this sitting's edits reached nothing outside their
own item.

**The live-stack evidence WAS re-run, in the credential sitting.** `proof-local.txt` now records 14
checks — **14 passed, 0 failed, 0 skipped**, plus 1 measurement that asserts nothing. The re-run
changed no code whatsoever; it changed which branch check (f2) took. Every row of the table above was
re-run beside it and every one is unchanged, `req-016` still bit-identical to the step-0 baseline.

---

## What step 7 MEASURED, which changes what a green may claim

**The acknowledgment IP is chosen by the caller.** Measurement (n), on the live local stack: a
spoofed `x-forwarded-for` was stored **verbatim**; with **no** header the stored value was
`172.18.0.1`, the Docker bridge — the gateway's own hop, not the client. Four reviewers asserted this
and all four marked it unverifiable by reading. **AT-001.01 may say the acknowledgment records an
address; it may never say a verified source address.** The code refuses anything that is not a
well-formed IP, so the column cannot hold garbage — but validity is not authenticity. The hosted
gateway is unobserved.

**Three comments that still said "source address" were corrected in this sitting** (audit finding 5).
This is the second time that claim has had to be narrowed after being widened by prose; the merge
ruling should not widen it a third time.

**The CORS preflight proves the LOCAL gateway only**, and the transcript records that Kong replaces
the function's `access-control-allow-methods` with its own longer list. The check asserts POST is
permitted rather than pinning the string, so it is unaffected.

Both are written into `plan.md` section 4, which is what the merge ruling gets checked against.

---

## Filed, not built — carried forward, named rather than dropped

1. **The `x-forwarded-for` trust model** (`fix-rulings.md` B3c, E1). Now with a real measurement
   behind it. Belongs to whoever lands the hosted deployment, with the deployed proxy chain in view.
2. **A client-reachable account-type read** (B4). Row-level security is on with no policies, no Auth
   metadata carries the type, no endpoint returns it — so the type is carried for the **server** and
   for **no browser**. The wiring leaf needs this and it is a `supabase/`-territory change, so it
   cannot ride in the same pull request as the screens. Discovering that at its merge would be late.
3. **The non-empty organisation-name rule now has THREE near-copies, and nothing tests the divergence**
   (E3, extended by audit finding 2). `validateOrganizationName` and `validateCompleteSignup`'s NGO
   branch both live in the shared module; `public.create_organization` carries a third in SQL as a
   deliberate backstop. **No test attempts an NGO signup with an empty organisation name**, so a
   divergence between any two of them would be caught by nothing. Deliberately not built at the close
   of an audit sitting; no reviewer raised it.
4. **Nothing in the process compares `pr-body.md` to the LIVE pull request body** — the gap that let
   B18's fix sit unpublished through an entire sitting and an audit. The audit brief scopes the
   auditor to the tree, so it structurally cannot catch this. A future item should either add it to
   the brief or make publishing part of the same step that edits the file.
5. **`AGENTS.md` is badly stale** — documents `/pm-next`, `/dev-start`, `/bind` and TaskMaster, all
   deleted, and its section 5 ends in a corrupted table fragment at line 93. Pre-existing.
6. **`src/routeTree.gen.ts` is stale** and is regenerated by every build. See the standing hazard.
7. **The 4xx→409 status mapping in both edge functions** is correct for every currently reachable
   case and would mislabel a database-raised 400 or 403. Rejected as speculative (B10); it becomes
   real when a second caller of those database functions appears, and is that change's to fix.
8. **Three unredacted local-development values were committed and are scrubbed forward, not rewritten
   out of history** (audit finding 4). They are Supabase's published local JWT secret and two
   loopback-only S3 keys; no hosted system is involved and no rotation is required. Rewriting history
   would force-push a branch under review and invalidate the audited SHA. **If the founder wants
   history rewritten it is cheap before merge** — named here rather than assumed away.

---

## Open questions for the founder — the conductor raises these, I do not

### 1. The signup SCREENS — ANSWERED and folded in. Closed.

### 2. The Google OAuth client — ANSWERED AGAIN: it now EXISTS, and check (f2) PASSED

**A PRIOR VERSION OF THIS SECTION SAID THE SKIP "may not be upgraded to a pass anywhere in the
record, by any later sitting, for any reason." I have overridden that, and it is deleted rather than
quietly worked around.** That instruction existed to stop a later sitting talking a skip into a pass
by argument, which would have been the item's worst failure. It did not survive contact with the one
event it did not anticipate: **the underlying fact changed.** The credential now exists, the check
ran for real, and it passed on evidence. An instruction written to protect a fact must yield when the
fact itself moves — but only to a measurement, never to a rereading. This override rests on a
transcript, not on an argument.

**What arrived.** The founder created the OAuth client — Google project
`gen-lang-client-0617238024`, authorised redirect URI exactly
`http://127.0.0.1:54321/auth/v1/callback`, consent screen External and in Testing. It is installed as
**Windows user-level environment variables** and in no file at all. **Verified, not assumed: neither
credential value appears in any file in this worktree**, searched literally. `.env` is tracked by git
and carries no Google entries; `.env.local` still does not exist and is git-ignored.

- **Proved by (f):** the provider block is well-formed, the stack starts with it, and
  `/auth/v1/settings` reports Google enabled with apple untouched.
- **Proved by (f2), which now PASSES:** with the credential in the environment the stack was started
  with, `GET /auth/v1/authorize?provider=google` answers `302` to `accounts.google.com` carrying
  exactly the configured client id and `redirect_uri=http://127.0.0.1:54321/auth/v1/callback`.
- **NOT proved, and the merge ruling must not blur this:** (f2) reads a redirect composed by the
  **local** Auth server with `redirect: 'manual'` and **never contacts Google**. It proves wiring and
  configuration. It is **not** evidence that Google accepted the credential, and **"the provider is
  reachable" overstates it** — nothing in this item has successfully reached Google with this client.
- **Never provable by any agent:** the consent round trip. **AT-001.03's "sign-in via Google succeeds
  on return visits" clause stays unproved by this item**, exactly as before. The credential narrowed
  the gap and did not close it. Closing it needs a person to sign in once and that evidence recorded.

**The one attempt so far FAILED, and the reason is worth carrying.** The founder tried a real sign-in
before the stack was restarted and got `401 invalid_client`. The cause was environmental: **when the
variables are unset the Supabase CLI does not substitute an empty value — it passes the literal string
`env(SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID)` through as the client id**, and the stack starts
anyway and still reports `google: true`. The committed `config.toml` is correct as written; it uses
Supabase's documented `env()` syntax. **That failure is also the best proof in the item of what (f)
never established** — (f) passed the whole time the client id was meaningless.

**HOW TO REPRODUCE THIS, because it is not obvious and cost a wasted attempt.** A process only picks
up a user-level environment variable **when it starts**, and Windows never refreshes a running
process's block; children inherit the parent's block, not the registry. So every shell in this session
tree is blind to the variables no matter how "fresh" it is. Read them explicitly and start the stack
in the **same** invocation, from **this worktree** (the `[auth.external.google]` block exists only on
this branch):

```
$env:SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID = [Environment]::GetEnvironmentVariable('SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID','User')
$env:SUPABASE_AUTH_EXTERNAL_GOOGLE_SECRET    = [Environment]::GetEnvironmentVariable('SUPABASE_AUTH_EXTERNAL_GOOGLE_SECRET','User')
bunx supabase stop --no-backup; bunx supabase start
```

**Do not write either credential into any file in the tree.** `.env` is tracked; the explicit read
above needs neither it nor `.env.local`. `.env.example` names both variables, which is where a
newcomer learns they are wanted.

### 3. Edge function or `createServerFn` — STILL OPEN; nothing challenged the ruling

Server logic lives in `supabase/functions/`, because `createServerFn` lives in `src/`, which this
item may not touch. Nothing in the critique or the audit gave a reason to revisit it. The
contradiction between the two checked-in documents is real, is not this item's to fix, and **will bite
the screen-wiring leaf squarely** — together with items 2 and 7 in the filed list. Relayed, not
escalated.

---

## Facts established in the tree, which no later sitting should re-derive

Facts 1–16 from the previous sittings all still hold. Added by the audit sitting:

17. **The audit brief's foreign-item-id rule was wrong and is corrected.** Linear links from pull
    request title/body and commit messages, never from file contents. `.github/workflows/ci.yml`
    line 292 reads only `.title + "\n" + (.body // "")` from the GitHub API. `main` already carries
    **65 distinct board item ids** in its `.ts` and `.md` files.
18. **The SQL name check in `create_organization` is a deliberate backstop, not a B6 escapee**, and is
    the same shape B2 ruled mandatory. Do not delete it to make a claim tidy — that would implement a
    regression against a standing ruling.
19. **A ruling is implemented when the THING changes, not when the file changes.** B18 corrected
    `pr-body.md` and the live pull request body kept all three false statements through a whole
    sitting and an audit. Convenience copies are not artifacts.
20. **`bun run at:check` takes a requirement argument** (`at:check req-001`). Called bare it exits 2
    with `"undefined" is not a requirement`, which reads like a failure and is not one.

Added by the credential sitting:

21. **An unset `env(...)` variable does not stop the Supabase stack — the CLI passes the literal
    string through as the value.** The stack starts, the provider reports enabled, and a real sign-in
    returns `401 invalid_client`. Plan risk 2 predicted the opposite failure and was wrong in an
    instructive direction: the hazard is not a stack that refuses to start, it is a stack that looks
    correctly configured while carrying a meaningless credential.
22. **A user-level environment variable is invisible to every process already running**, including
    every shell any agent in this session can spawn, because children inherit the parent's environment
    block rather than the registry. Read it explicitly from the `User` scope and set it in the same
    invocation that needs it. This is written out with the exact commands in the Google section above.
23. **Check (f2) infers the stack's configuration from the SCRIPT's own environment** — it asserts
    that the redirect's `client_id` equals `process.env.SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID`. That
    makes a PASS trustworthy (the two agreeing means substitution really happened) and it makes a FAIL
    safe, but it means the check reports a boolean and never a value. The independent redirect
    observation recorded at the foot of `proof-local.txt` exists because of that, and it is what
    positively rules out the literal `env(...)` string.

---

## Caps, carried forward

- The executor gets three attempts to reach green inside one invocation, then reports. **Neither the
  audit sitting nor the credential sitting invoked an executor at all** — an audit sitting may make
  its own corrections, and in both cases every change was a repair, a comment or a record change
  rather than code to be written. The credential sitting used a **mechanical** for the evidence
  capture, which is what a mechanical is for.
- An orchestrator sitting may send the executor back twice — three invocations per sitting. **Unused
  in both sittings.**
- **The audit re-runs once per item, and only if code changed. STILL NOT USED, deliberately.** See
  below — the merge sitting may still spend it.
- A suspected CI flake gets one re-run of the check, with no new commit. **Not yet used.**
- A green local verify against a red CI gets two pushes, then escalation with the evidence. **Not yet
  used.**

### The audit cap is deliberately unused, and here is the reasoning to disagree with

No shipped decision logic, SQL, assertion, expectation, test body or configuration changed in the
audit sitting. The only executable-adjacent edits are **test names and failure messages** — text that
appears in output and never in a judgement. The em-dash repair *restores* text `main` already had.

**The credential sitting makes the case stronger rather than weaker, and it is a cleaner case.** Its
diff is **records only** — `plan.md`, `proof-local.txt`, `PHASE-STATE.md`, `pr-body.md`. Not one byte
of `supabase/`, `tests/` or `src/` moved, and `proof-local.ts` itself is byte-identical: the check
took the third branch of a conditional the code gate reviewed and the auditor read. What changed is
**evidence, not code**, and evidence moving in the direction of *more* proved is not a reason to
re-audit code nobody touched. The whole verify surface was re-run as the control and is unchanged.

Every box the auditor checked is therefore untouched or **more** true than when it checked it:
finding 1's box now passes exactly (the diff is four marker lines), finding 2's claim is corrected,
findings 5 and 6's comments now match the claims table. A second pass would re-derive the same
verdicts on the same code at cost.

**CI on the new head plus the merge sitting's own review is sufficient. The re-run remains available
if the merge sitting reads this and disagrees.**

When a cap fires: **stop working, do not stop judging.** What remains is written down as open items —
filed as separate work, or escalated as scope growth. "We ran out of rounds" is never recorded as
"the finding was invalid."

---

## Nothing escalates to the founder from either sitting

No finding contradicted ratified text, and nothing is scope growth. The audit sitting: five repairs,
one rejection with its written reason, one record correction, and one publish that should have
happened earlier. The credential sitting: one measurement and the record updates it forced.

**One thing to RELAY, not escalate, and the item does not wait for it.** AT-001.03's *"sign-in via
Google succeeds on return visits"* clause is closable now, cheaply, and only by the founder: the stack
is correctly configured for the first time, so **one human sign-in through the consent screen would
produce the evidence no agent can.** The item merges with that clause declared unproved either way —
this is an opportunity, not a blocker, and it must not be allowed to hold up the merge. If the founder
does click through, the place to record it is a new note in `proof-local.txt` marked plainly as human
evidence rather than a check result, because no agent witnessed it.
