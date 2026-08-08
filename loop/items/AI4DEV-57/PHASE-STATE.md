# AI4DEV-57 (email + Google signup, three account types) — CLOSING STATE

**Phase just completed: the MERGE SITTING — the last one. There is no next phase.**

The merge is **ruled and authorised**. The ruling is `merge-ruling.md`, in this directory, and it is
published as a comment on the pull request. A mechanical executes the merge; the orchestrator never
runs that command (founder ruling, 2026-08-07).

**This file is committed before the merge runs, so it cannot say the merge happened** — for the same
structural reason it may not name the commit that carries it. **If you are reading this file on
`main`, the merge succeeded.** If you are reading it only on the branch, check the pull request: the
merge either had not run yet or was refused, and a refusal is a STOP that ends the sitting and gets
reported upward with the exact denial text.

**Branch:** `nirdrang/ai4dev-57-email-and-google-signup-and-the-three-account-types-d1l1`
**Chain, derived from the branch:** AI4DEV-57 (email + Google signup, three account types) →
AI4DEV-51 (accounts and sign-in container) → AI4DEV-50 (auth dev-tree root) → AI4PM-19 (the
authentication requirement). No `attr:` label anywhere on the chain. Product work under a real
requirement; this leaf closes on a merged pull request.

**This chain line names three other board items on purpose, and that is CORRECT — do not "fix" it.**
The audit called it a violation because the audit brief's rule was written too broadly; the rule is
corrected in `audit-brief.md` and the reasoning is in `audit-rulings.md` finding 3. The board links
from a pull request's title and body and from commit messages, never from file contents; this
repository's own guard reads only `.title + "\n" + (.body // "")` from the GitHub API; and `main`
already carries 65 distinct item ids in its own files. Recording the derived chain is **required** by
the way of work.

---

## THE OPUS FALLBACK WAS IN FORCE FOR THIS ENTIRE ITEM

Fable was out of credit throughout. Every orchestrator sitting ran as `orchestrator-opus` (opus at
effort max), a different agent TYPE — never a model override on the fable definition. **Every
decision in `plan.md`, all nine rulings in `gate1-rulings.md`, all eight in `draft-rulings.md`, the
code-critique rulings in `fix-rulings.md`, all seven in `audit-rulings.md` and the merge ruling
itself are opus rulings.** A fable ruling and an opus ruling are not the same evidence.

A session limit is not the same thing as being out of credit. If the reason ever reads "You've hit
your session limit · resets HH:MM", that is the account-wide five-hour window, it heals itself, and
an opus agent hits the same wall.

---

## What the merge sitting verified for itself, taking nothing from a report

| checked | result |
|---|---|
| local head, remote head and the pull request's head agree | all three `84b5cf9` |
| working tree clean before any of this sitting's own writes | `git status --porcelain` empty |
| the required check, read from the GitHub API against the head SHA | **`verify` — success**, `pull_request` event, attempt 1, **all 15 steps success** |
| what branch protection actually requires | exactly one check, `verify`; `strict` off; `enforce_admins` off — a convenience, never a licence |
| the live pull request body against `pr-body.md` | **character-identical**, measured through a different instrument than the previous sitting used |
| item ids on the surfaces that carry the hazard | title, body and **every** commit message name `AI4DEV-57` and nothing else |
| files under `src/` in the diff | **zero** |
| encoding corruption across all 53 changed files | **none** — the only two mojibake sequences are the record files deliberately *quoting* the corrupted sequence while describing it |
| the board link that closes the item | the pull request is already attached to the item in the tracker |

**The previous sitting reported the pull request body as 8942 characters; this sitting measures 8943
on both sides.** Recorded rather than smoothed over. What matters is that the live body and the file
are identical *now*, measured here, with a different instrument.

**One correction this sitting made before ruling.** The record obliged the merge sitting to carry the
rejected audit finding's claim **verbatim** into the pull request. Its verbatim text names three
foreign board ids, and the pull request body is the one surface the tracker reads and the repository's
guard fails on. Obeying literally would have turned the required check red and moved three other
items — the exact hazard the auditor named. **Ruled: quote the claim in full with the three ids
elided and described in words, say plainly that they were elided and why, and point at the unaltered
text in the committed record.** The body was rewritten accordingly and republished. This is written up
as a process finding for the coordinator, because it will recur on any item whose rejected finding
quotes an id.

---

## STANDING HAZARDS — these outlived the item and should outlive this file

### `bun run build` rewrites `src/routeTree.gen.ts`

Ten lines, a stale `declare module` block, deterministic, reproduced twice and reverted both times.
Continuous integration fails any pull request whose files match **both** `^src/` and
`^(supabase|tests|loop|\.claude|\.github)/`. **So an unexamined `git add -A` after a build breaks the
build**, for a reason with nothing to do with the change. Build was deliberately never in this item's
done-criterion. Regenerating that file properly is a `src/`-only change for a different pull request.
**Filed, not fixed.**

### Writing files through PowerShell corrupts them, and the instruments lie in three different ways

**The audit's most serious finding was character-encoding corruption**, and nothing in this
repository's verify surface can catch it. Every em-dash in a harness self-test had become `â€”` — 27
of them, UTF-8 bytes decoded as Windows-1252 and re-encoded. A four-line surgical change read as 31
changed lines. **All 251 self-tests passed and continuous integration was green**, because the
corruption landed in comments, `it()` names and assertion messages while nothing asserted contains an
em-dash.

- **Never write a source file with `Set-Content`/`Out-File` defaults.** Use
  `[System.IO.File]::WriteAllText($path, $text, (New-Object System.Text.UTF8Encoding($false)))`.
- **`>` redirection here writes UTF-8 WITH a byte-order mark.** This produced a self-inflicted false
  finding during the repair: temp files written with `>` appeared to prove four files had lost a BOM,
  and one BOM was "restored" that `main` never had.
- **The console misrenders correct em-dashes as mojibake**, so healthy files look corrupt. Only
  `[System.IO.File]::ReadAllText` plus a real character-code comparison tells the truth.
- **Capturing a command's stdout into PowerShell loses leading whitespace** — which invented a
  20-line false difference between the body file and the live pull request body.

**That is three separate false findings in one item, all from a comparison whose reading side was the
corrupt half. Before believing any whitespace or encoding difference, re-measure it with a different
instrument.** This sitting did exactly that twice and both re-measurements came back clean.

### A user-level environment variable is invisible to every process already running

Windows never refreshes a running process's environment block, and children inherit the parent's
block rather than the registry — so every shell in a session tree is blind to a newly created
variable no matter how "fresh" it is. Read it explicitly from the `User` scope and use it in the
**same** invocation.

### An unset `env(...)` variable does not stop the Supabase stack

**The command-line tool passes the literal string `env(SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID)`
through as the value.** The stack starts, the settings endpoint reports the provider enabled, the
enabled-provider check passes — and a real sign-in returns `401 invalid_client`. The plan's risk 2
predicted the opposite failure and was wrong in an instructive direction: **the hazard is not a stack
that refuses to start, it is a stack that looks correctly configured while carrying a meaningless
credential.**

---

## THE DRAFT-CODE GATE HAS ONE READER, BY FOUNDER RULING — THIS IS THE DESIGN

**The second reader is stopped permanently. A single reader on the draft-code gate is the design going
forward, not a temporary degradation awaiting repair.** What this change received, stated as two
separate facts because averaging them hides which half is thinner:

- **SQL and configuration slice: ONE completed reader** — terra, 8 findings — where the two-reader
  design applied at the time.
- **TypeScript and tests slice: BOTH readers completed** — terra 11 findings, kimi 7.

The second reader exhausted its billing quota partway through the SQL slice and **never emitted a
verdict or a closing count line.** Its salvaged notes were treated as **leads to verify against the
tree**, not as a reviewer's findings; the method is in `fix-rulings.md` Part C so an auditor can check
the method rather than the outcome. **One of those leads produced the single most valuable check in
the item** — nothing anywhere proved that a **service-role** write into `public.accounts` is refused,
which is the load-bearing half of the "it is the only door" claim. That check now exists and passes.

---

## What is proved, and the one thing that is not

The full account is in `merge-ruling.md` sections 4 and 5, and in `plan.md` section 4, which is the
binding claims table. In short:

- The loop-tier green is a **declaration match**: 37 P0 ids, 4 green, 33 red, 0 missing, exit 0. It
  claims the four acceptance tests really assert and that the shipped decision logic behaves as they
  require. **It claims nothing about the migration, either edge function, row-level security,
  authentication configuration, or Google sign-in** — continuous integration has no database and
  never runs above the loop tier.
- The live-stack transcript — **14 checks, 14 passed** — is the only evidence for that other half, and
  it is one machine, one local stack, not reproducible by a reviewer.
- **AT-001.03's clause "sign-in via Google succeeds on return visits" is NOT proved by this item.**
  The credential now exists and the previously skipped check genuinely **passes** — the configured
  client id reaches the handshake redirect with the correct local callback — but that check reads a
  redirect composed by the **local** authentication server and **never contacts Google.** It proves
  wiring and configuration; it is not Google accepting the credential, and "the provider is reachable"
  overstates it. **Merging with the clause open is right because it is structurally unprovable by any
  agent** — consent is a person pressing a button — **and the claims table declared it unproved before
  the code was written rather than apologising afterwards.**
- **The acknowledgment records AN address, never a verified source address** — measured, not
  suspected. A spoofed header was stored verbatim; with no header the stored value was the Docker
  bridge, the gateway's own hop. This claim has now had to be narrowed twice after prose widened it.
  **Do not widen it a third time.**

---

## Filed, not built — carried forward, named rather than dropped

These are reproduced in `merge-ruling.md` as the founder-visible follow-ups. **None blocks the merge.**

1. **One human click closes the last open clause.** One real Google sign-in through the consent screen
   produces the evidence no agent can. Record it in `proof-local.txt` marked plainly as human evidence
   rather than a check result. **Opportunity, not blocker.**
2. **The address-trust model for a hosted deployment**, now with a real measurement behind it.
3. **A client-reachable read of an account's own type does not exist.** The type is carried for the
   **server** and for **no browser**. The screen-wiring leaf needs it, and it is a `supabase/`
   change that cannot ride in the same pull request as the screens.
4. **The edge-function-versus-server-function contradiction between two checked-in documents** is
   unresolved and **will bite the screen-wiring leaf squarely**, together with 3 and 6.
5. **`AGENTS.md` is badly stale** — four deleted commands, a deleted tool, and a corrupted table
   fragment at the end of its section 5. Pre-existing.
6. **A generated route file is stale and rewritten by every build.** See the standing hazard.
7. **The non-empty organisation-name rule has three near-copies and nothing tests the divergence.** No
   test attempts an NGO signup with an empty organisation name.
8. **Nothing in the process compares the local body file to the live pull request body.** That gap let
   a correction sit unpublished through a whole sitting and an audit; this sitting found a second
   omission the same way, by hand, which is evidence the gap is systemic. **Unchanged.**
9. **The verbatim-claim rule and the no-foreign-ids rule contradict each other** whenever a rejected
   finding quotes an item id. Ruled once here; needs reconciling centrally.
10. **Three local-development values are scrubbed forward, not rewritten out of history** — Supabase's
    published local JWT secret and two loopback-only storage keys. No hosted system, no rotation. If
    history is to be rewritten, **cheap before merge, expensive after.**
11. **The 4xx-to-409 status mapping in both edge functions** would mislabel a database-raised 400 or
    403. Rejected as speculative; it becomes real when a second caller of those database functions
    appears.

---

## Caps — final accounting

- **Executor: three attempts per invocation, three invocations per sitting.** The audit, credential
  and merge sittings invoked **no executor at all**; their changes were repairs, comments, records and
  evidence capture. Mechanicals did the housekeeping, which is what mechanicals are for.
- **The audit re-runs once per item, and only if code changed. NEVER USED, deliberately.** No shipped
  decision logic, SQL, assertion, expectation, test body or configuration changed after the audit read
  the tree. Every box it checked is untouched or **more** true than when it checked it. The merge
  sitting had the cap available, read the reasoning, and agreed.
- **A suspected CI flake gets one re-run with no new commit. NOT USED** — the check was green first
  time, first attempt.
- **A green local verify against a red CI gets two pushes, then escalation. NOT USED** — CI was never
  red on this item's final head.
- **Nothing was left undone for want of a round.** Everything not fixed is filed and named above,
  never recorded as invalid.

## Nothing escalated to the founder from this item

No finding contradicted ratified text and nothing was scope growth. Two things are **relayed**: the
one-click opportunity above, and the process findings in the filed list — which go to the coordinator
to fold, not to the founder as a decision.
