# AI4DEV-57 (email + Google signup, three account types) — THE MERGE RULING

Ruled by `orchestrator-opus` (Opus 5, effort max) — **the opus fallback, in force for this entire
item because fable is out of credit.** Every ruling on this item is an opus ruling: the plan's own
decisions, the nine plan-review rulings, the eight draft rulings, the code-critique rulings, the
seven audit rulings, and this one. A fable ruling and an opus ruling are not the same evidence, and
the record says so rather than letting the difference pass silently.

**This is the merge sitting, and it absorbs two waits at once** — the audit's and continuous
integration's — because the audit closed with all findings ruled and no re-run owed.

**The head this ruling pins is the head that carries this file.** A file cannot name the commit that
carries it; that SHA does not exist until after the file is written. The exact SHA and the exact
continuous-integration run are stated in the pull request comment that publishes this ruling, which
is composed after the push and therefore can name them. This is the same discipline audit finding 7
taught, and it is applied here rather than re-learned.

---

## VERDICT: MERGE

The required check is green on the exact head, the record is true of the tree, every finding from
every gate has a written disposition, and the one clause this item cannot prove is declared unproved
in the plan's claims table rather than talked into a pass.

---

## 1. What was built

The schema and the server-side path that turn an authenticated user into a typed account. **53 files,
9051 insertions, 8 deletions, across 22 commits — and zero files under `src/`.**

- **The first database migration of the product** — global account types (NGO, volunteer, platform
  administrator), organisations, per-organisation memberships with roles, and the terms-of-service
  and Platform Promise acknowledgment record carrying its timestamp, address and text version.
  Row-level security is on for every new table with **no policies at all**, so every client-key read
  and write is denied. All writing goes through two `SECURITY DEFINER` functions, and the service
  role holds no INSERT privilege anywhere in this schema — which is what puts the signup function's
  refusal to mint a platform administrator **on the only write path rather than beside one**.
- **Two edge functions.** `complete-signup` assigns the account type once and, for an NGO, creates
  the organisation, the administrator membership and the acknowledgment row in one transaction. Email
  and password and Google both authenticate upstream, so both arrive through this single code path.
  `create-organization` is the NGO-only action, added by the plan review rather than the original
  plan, because the acceptance criterion about a volunteer being refused an NGO-only action had no
  product operation to attempt and testing a helper directly would have proved a helper rather than
  an application boundary.
- **A shared decision module** that both edge functions and the acceptance adapter import, so the
  loop-tier green is a statement about code that ships rather than about a re-implementation living
  in a test fixture.
- **The first acceptance suite for a product requirement** — 37 P0 call sites in exact bijection with
  the acceptance file, of which 4 run for real and go green and 33 are declared pending, each naming
  the manifest leaf that will land it. That declaration is now the requirement's live progress
  ledger and continuous integration enforces it from here on.
- Google configured as an identity provider, and the two environment variables it needs documented in
  `.env.example` — with **no credential value in any file in this repository.**

**No `src/` changes, by decision and confirmed by the founder before any code was written.** The
signup screens belong to a later leaf. Three facts agree: the decomposition manifest assigns them
there; continuous integration fails any pull request touching both `src/` and `supabase/`; and while
the acceptance runner's `--wired` flag is implemented, the screen driver it needs does not exist, so
a screen built now could be verified by nothing.

## 2. Coverage — how much independent review this change actually received

**Stated as separate facts, never averaged, because averaging hides which half of the change is
thinner.** This is the founder's instruction and both the pull request body and this ruling follow it.

| gate | what read it | findings |
|---|---|---|
| **Plan review** | one reader (sol, effort xhigh), which is that gate's design | **9**, all ruled: 9 accepted, 3 of them fixed differently from the remedy proposed, 0 rejected |
| **Draft code — SQL and configuration slice** | **ONE completed reader** (terra), where the two-reader design applied at the time | **8** |
| **Draft code — TypeScript and tests slice** | **BOTH readers completed** (terra, kimi) | **11 and 7** |
| **Read-only audit of the finished tree** | one reader (luna, effort max), which is that gate's design | **7**, all ruled |

**The honest gap, named plainly: the SQL and configuration slice — the migration, both edge functions'
configuration and `config.toml` — got one completed independent reader where two were designed.** The
second reader exhausted its billing quota partway through that slice and **never emitted a verdict or
a closing count line.** Its salvaged output was therefore treated as **leads to verify against the
tree**, never as a reviewer's findings, and the method is written out in `fix-rulings.md` Part C so
that an auditor can check the method rather than merely the outcome.

**That salvage produced the single most valuable check in the item.** Nothing anywhere proved that a
**service-role** write into `public.accounts` is refused — which is the load-bearing half of this
change's claim that the signup function is the only door. The check now exists and passes.

**The second reader is stopped permanently, by founder ruling. One reader on the draft-code gate is
the design going forward, not a temporary degradation awaiting repair.** So the table above records
what this change received; it is not a defect report against the process, and the merge is not
conditional on repairing it.

## 3. Every finding, and its disposition

**Plan review — 9 findings, 9 accepted, none rejected.** Three were accepted but fixed differently
from the remedy proposed. Two of them changed what got built: the NGO-only edge function exists
because of one, and the four separate writes became a single transaction because of another.

**Draft code — 26 findings across the three completed runs, plus 2 continuous-integration failures
and 5 salvaged leads.** Ruled in `draft-rulings.md` and `fix-rulings.md`. Of these, **one was
rejected with its reason written out** (a third near-copy of the organisation-name rule was ruled not
to be the same finding, and the residual was filed rather than dismissed); **two were accepted in
part** with the over-reaching half refused; **one was verified first and came back proven**, which
settled a claim against this item rather than for it — four independent readers had asserted that the
acknowledgment address is chosen by the caller and all four marked it unverifiable by reading, so it
was measured, and the measurement confirmed it. Three of the findings ruled in that phase were the
orchestrator's own rather than any reviewer's.

**Audit — 7 findings, all ruled. Six accepted, one rejected.**

1. **A surgical four-line change had grown to thirty-one — accepted, and the auditor understated it.**
   The twenty-seven extra lines were **character-encoding corruption**: every em-dash in a harness
   self-test had been destroyed by a PowerShell write with a default codepage. **All 251 self-tests
   passed and continuous integration was green the whole time**, because the damage sat in comments,
   test names and failure messages while nothing asserted contains an em-dash. Repaired; the file's
   diff against `main` is now exactly the four marker lines the original ruling described.
2. **A duplicate name check in SQL — the finding was right and the false sentence was in my own audit
   brief, so the record moved and the code correctly did not.** The SQL check is a deliberate database
   backstop on a `SECURITY DEFINER` function the service role can call with no TypeScript in the path,
   which is the exact shape an earlier ruling had made mandatory. Deleting it to make my careless
   sentence true would have implemented a regression against a standing ruling.
3. **Foreign board ids in a changed file — REJECTED.** The claim and the reasons are in section 6.
4. **Unredacted local-development values in a committed transcript — accepted and scrubbed.** They are
   Supabase's published local development JWT secret and two loopback-only storage keys. **No hosted
   system is involved and no rotation is required.** The defect that makes it real is not the
   sensitivity of the strings: the file's own header asserted that nothing key-shaped was committed
   while the file committed three key-shaped values, and **a false statement in the record is the one
   class this process never merges.** History is deliberately not rewritten — that would force-push a
   branch under review and invalidate the audited SHA — and the founder may still call for it before
   merge.
5. **Three comments still calling the acknowledgment address the "source address" — accepted.** That
   is exactly how a narrowed claim quietly widens again, and the narrowing rested on a measurement.
6. **An acceptance comment claiming fixture-only work as a shipped-module property — accepted.** The
   comment simultaneously disclaimed the strong version and asserted a weaker form of the same
   overclaim four lines above. Rewritten to separate the two strengths of evidence; no assertion moved.
7. **A state file naming a stale head — accepted**, and the fix was to stop naming a SHA a file cannot
   know. That lesson is applied at the top of this very ruling.

**Plus one finding the audit structurally could not make, because it is not in the tree: the live
pull request body had never been published.** A ruling had corrected the file; the file is a
convenience copy and the pull request body is the artifact, so three statements the ruling had
declared false stayed on the item's public face through an entire sitting and the audit. **A ruling is
implemented when the thing changes, not when a file changes.** Published, and verified by reading it
back rather than by the absence of an error.

## 4. What the green claims, and what it does not

**Repeated verbatim from the plan's claims table, which required exactly this:**

> **Claims:** the four acceptance tests exist, are executable, really open a world and really assert;
> and the shipped decision logic in `supabase/functions/_shared/accounts.ts` behaves as those four
> acceptance tests require.
>
> **Does not claim:** that the migration is correct, that either edge function works, that row-level
> security denies what it should, that Supabase Auth is configured, or that Google sign-in works.
> None of that is reachable by CI, which has no database and never runs above the loop tier. The only
> evidence for that half is the step-7 transcript, produced on one machine and not reproducible by a
> reviewer.

The green is a **declaration match**, not a suite pass: 37 P0 ids, 4 green, 33 red, 0 missing, exit 0.
A reader who takes it for "the requirement works" has read it wrong, and the ledger is what stops
that reading drifting.

**The live-stack evidence stands beside the green and is weaker in kind, not in degree.** Fourteen
checks, all fourteen passed, on one machine, against one local Supabase stack, by a transcript no
reviewer can reproduce. It is the only evidence for the database, the edge functions and row-level
security, and it should be read as exactly that.

## 5. What remains unproved, and why merging is still right

**AT-001.03's clause "sign-in via Google succeeds on return visits" is NOT proved by this item.** It
was not proved before the credential arrived and it is not proved now.

The Google credential now exists — the founder created a real OAuth client after the audit closed, and
it lives in user-level environment variables with **no secret in this repository**, verified by
searching every file for the literal values rather than assumed. The previously skipped check now
genuinely **passes**: the configured client id reaches the handshake redirect, with the correct local
callback. The proof script was **not modified** to achieve that — the check was written with three
states from the start and simply took the branch a real credential selects, so **what changed is the
evidence and not the code.**

**The claim is deliberately narrow and must not be widened by anyone reading this later.** That check
reads a redirect composed by the **local** authentication server and **never contacts Google at all**.
It proves wiring and configuration. It is not evidence that Google accepted the credential, and "the
provider is reachable" overstates it.

**Why merging with that clause open is right rather than merely convenient:**

- **It is structurally unprovable by any agent.** Consent is a person pressing a button in a browser.
  No amount of further work by any machine in this process closes it.
- **The plan's claims table says so explicitly, in the column reserved for it, and has said so since
  before the code was written.** The item is not overclaiming and then apologising; it declared the
  boundary first and held it under pressure. It held even when the fact underneath moved — the
  credential's arrival upgraded one check from an honest skip to a real pass **on a measurement, never
  on an argument**, and it explicitly did not upgrade this clause.
- **The strongest evidence in the item is evidence against its own checks**, which is the reason to
  trust the rest. Before the stack was restarted, the Supabase command-line tool had been passing the
  literal unresolved string `env(SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID)` through as the client id —
  it does not substitute an empty value when the variable is unset — and a real sign-in returned
  `401 invalid_client` **while the settings endpoint still reported Google enabled and the
  enabled-provider check still passed.** That is a fact about the environment and the tool, not a
  defect in the committed configuration, which uses the documented syntax correctly. It is also the
  sharpest available demonstration of what that check never established on its own.
- **Nothing downstream depends on the clause being green.** It is declared, ledgered and visible.

**Also unproved and named rather than hidden:** the acknowledgment records **an** address and never a
**verified source** address — measured, not suspected: a spoofed header was stored verbatim, and with
no header the stored value was the Docker bridge, the gateway's own hop. What a hosted gateway would
do is unobserved. And the preflight check proves the **local** gateway only.

## 6. The one rejected finding, with the auditor's claim carried into the record

The auditor wrote:

> A changed file names foreign board items [three ids — this item's parent, its grandparent, and the
> requirement above them — elided, and the elision is explained below], contrary to the single-item
> scope rule.
> why it matters: Those IDs can link or move other work items even though the pull-request body and
> commit subjects use only `AI4DEV-57`.

**The three ids are elided here and in the pull request, and nowhere else.** Writing them into a pull
request body or comment would perform the exact act the auditor warns about, on the one surface where
the warning is correct. The unaltered sentence is in `audit-rulings.md`, committed in this pull
request, where it is inert. **This is a real conflict in the process and it is ruled, not evaded:** a
contract says a rejected finding's claim goes verbatim into the pull request, and a machine-enforced
rule says no foreign id may appear there. When the rejected finding is *itself about item ids*,
obeying the first literally violates the second and turns the required check red. The claim's meaning
is carried in full; three id strings are not.

**Rejected, because the hazard is real about the wrong surface.** The board links from a pull
request's title and body and from commit messages — **never from file contents.** This repository's
own guard reads only `.title + "\n" + (.body // "")` from the GitHub API and never looks at the diff,
and that guard is the authority on what the rule is. `main` already carries **65 distinct board item
ids** across its own files, three of them in the very file this branch edits. And the line objected to
is the item's **derived chain of parentage**, which the way of work positively requires a state file
to record — so the rule as my brief wrote it would have forbidden the process itself.

**Measured on the surfaces that do carry the hazard:** every commit message on this branch, the live
pull request title and the live pull request body name `AI4DEV-57` and nothing else. The audit brief's
overbroad rule is corrected in place, because leaving it would manufacture the same false finding on
every future item, and a rule that produces guaranteed false positives trains people to ignore the
audit.

## 7. The check, and what it is evidence of

The required check — the only one branch protection requires — ran on the exact head, on the
`pull_request` event, first attempt, and every one of its fifteen steps concluded `success`. It
type-checked both TypeScript projects, ran the 251 harness self-tests, checked both acceptance suites
against their acceptance files for exact bijection, verified both declared requirements at the loop
tier against their declarations, and passed both repository guards — the one that fails a pull request
touching two ownership territories, and the one that fails a pull request naming an item its branch
does not own.

**It was re-verified in this sitting from the GitHub API against the head SHA itself**, not taken from
any report, and the run identifier and SHA are recorded in the comment that publishes this ruling.

**No flake re-run was needed or used. No blind-debugging push was needed or used. The audit re-run
cap was available to this sitting and is deliberately not spent** — no shipped decision logic, SQL,
assertion, expectation, test body or configuration changed after the audit read the tree; the only
later changes were comments, test names, failure messages, redactions in an evidence transcript, and
the record itself. Every box the auditor checked is untouched or more true than when it checked it.

## 8. Merge mechanics

**I do not run the merge command.** A mechanical executes it (founder ruling, 2026-08-07). I decide
the merge and I verify the merged state afterwards. **If the mechanical reports a permission refusal,
that is a STOP** — it gets reported upward with the exact denial text and this sitting ends. A
boundary that holds against one actor and is walked around through another is decorative, and that is
the exact defect this process exists to delete from the work.

Squash merge, into `main`, with the branch deleted afterwards. The board item closes from the pull
request link; **nothing is hand-set.**

---

## Follow-ups for the founder — filed and named, none of them blocking

1. **One human click closes the last open clause.** The stack is correctly configured for the first
   time, so a single real Google sign-in through the consent screen would produce the evidence no
   agent can. **This is an opportunity, not a blocker**, and it must not hold up anything. If it is
   done, record it in `proof-local.txt` marked plainly as human evidence rather than as a check
   result, because no agent witnessed it.
2. **The address-trust model for a hosted deployment.** Now backed by a real measurement. Belongs to
   whoever lands the hosted deployment, with the deployed proxy chain in view.
3. **A client-reachable read of an account's own type does not exist.** Row-level security is on with
   no policies, no authentication metadata carries the type, and no endpoint returns it — so the type
   is carried for the **server** and for **no browser**. The screen-wiring leaf needs this, and it is
   a `supabase/`-territory change that therefore cannot ride in the same pull request as the screens.
   **Discovering that at that leaf's merge would be late**, which is why it is named now.
4. **The contradiction between two checked-in documents about where server logic belongs** — an edge
   function or a server function inside `src/` — is unresolved and nothing in the critique or the
   audit challenged the ruling this item made. **It will bite the screen-wiring leaf squarely**,
   together with items 3 and 6.
5. **`AGENTS.md` is badly stale** — it documents four deleted commands and a deleted tool, and its
   section 5 ends in a corrupted table fragment. Pre-existing and unrelated to this branch.
6. **A generated route file is stale and is rewritten by every build**, which makes an unexamined
   `git add -A` after a build fail the territory guard for reasons unrelated to the change.
   Regenerating it properly is a `src/`-only change belonging to its own pull request.
7. **The non-empty organisation-name rule now has three near-copies and nothing tests the
   divergence.** Two are in the shared module and the third is the deliberate SQL backstop. No test
   attempts an NGO signup with an empty organisation name.
8. **Nothing in the process compares the local pull request body file to the live pull request body.**
   That gap let a correction sit unpublished through a whole sitting and an audit. This sitting
   checked it by hand again — and found and repaired a second omission the same way, which is
   evidence the gap is systemic rather than a one-off. **The process gap is unchanged.** A future item
   should either add it to the audit brief or make publishing part of the same step that edits the
   file.
9. **A process finding for the way of work itself**, surfaced by section 6: the instruction to carry a
   rejected finding's claim *verbatim into the pull request* is unsatisfiable whenever that finding
   quotes a board item id, because a machine-enforced rule forbids exactly those strings on exactly
   that surface. The two rules need reconciling once, centrally, rather than re-ruled per item.
10. **Three local-development values sit in this branch's earlier commits**, scrubbed forward rather
    than rewritten out of history, for reasons recorded in the audit rulings. **If history is to be
    rewritten, it is cheap before merge and expensive after.**
