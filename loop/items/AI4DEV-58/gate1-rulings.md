# AI4DEV-58 (GitHub sign-in, mandatory GitHub link) — GATE 1 RULINGS

**Sitting 2 of the item: DRAFT. Ruled by the `orchestrator` definition on fable (claude-fable-5,
effort xhigh).**

**Reviewed:** `loop/items/AI4DEV-58/plan.md` at `b29c46e` (the head that carried the gate-1
artifacts; the plan itself is unchanged since `2569f24`).
**Reviewer:** sol (codex, gpt-5.6, effort xhigh, read-only sandbox). 5 findings, its own severity
scale: high = acceptance can be violated despite a green gate; medium = material integrity gap;
low = misleading execution guidance.
**Raw output and distillate:** `loop/items/AI4DEV-58/artifacts/gate1-sol-raw.txt`,
`loop/items/AI4DEV-58/artifacts/gate1-sol-distilled.md`. Every claim below is quoted from the raw
file.

Five findings, five rulings: **two accepted, one accepted with a different remedy, two rejected
with written reasons** — one of the rejections files a real product question that is another
item's to answer, and the other is accompanied by a plan strengthening that makes the disputed
reading impossible to hold against the record. Finding 2 is the sharpest in the set: a one-line
SQL constraint that would have silently enforced nothing on the exact input it exists to refuse.

Every structural fact I relied on was read in the tree **this sitting**: the acceptance text
(`.taskmaster/docs/acceptance/at-req-001.md` lines 12–13 and the retired AT-001.08 at line 16),
the load-bearing comment at `tests/at/suites/req-001/a-signup-and-signin.test.ts` lines 151–163,
and the volunteer half of AT-001.03 at lines 221–231.

---

## F1 — onboarding fires at completion, not at the link event · **REJECT**, with a strengthening amendment

> "The plan moves onboarding from the GitHub-link completion event to a later `complete-signup`
> request, contrary to AT-001.05's required firing point." *(high)*
>
> "If linking succeeds but the browser closes or the completion request fails, Auth retains the
> linked identity while no profile import exists. Step 5 always performs completion after linking,
> and marking AT-001.05 backend means the later wiring leaf will not test this missing transition."

Rejected, on three grounds.

1. **The state the reviewer describes violates nothing AT-001.05 says.** Its Given is *"a
   volunteer signup where GitHub is linked"* and its Then requires the handle and stats
   *"observably populated on the profile"*. When a link succeeds in Auth and the completion
   request never arrives, **no account row, no profile surface and no acknowledgment exist at
   all** — there is no profile to be unpopulated. That is an unfinished signup, not a completed
   link whose import went missing. "Queued-but-empty" names an import deferred after an account
   exists; the plan's design has no queue and no account until completion, so the forbidden state
   is unrepresentable — which is stronger than testable. AT-001.04's own text closes the loop:
   *"linking completes signup"* — within the signup flow the two moments the reviewer separates
   are the same moment.
2. **The proposed firing point cannot be executed by any code this repository ships.** The link
   happens inside Supabase Auth's OAuth round trip; no webhook, hook or event reaches server
   code (D-C states this, and the reviewer names no mechanism). The plan gate's own contract
   makes "anything no tool can actually do" its target failure — firing at the link event is
   exactly that, short of a poller or a queue, and a queue manufactures the exact state the
   criterion forbids.
3. **The wiring-leaf half of the claim is inverted.** AT-001.02 and AT-001.04 are marked `ui`
   and re-run `--wired`; the screen flow .04 drives is precisely link → completion, and
   completion is the importer — so the "missing transition" is the very thing the wired re-run
   exercises. AT-001.05's observable is row contents, provider- and screen-independent, the same
   reasoning that left .06 backend.

**What the reviewer is right about is that the plan let this misreading stand.** Amended, as
strengthening rather than concession: D-C now states the abandoned-flow analysis in words, and
AT-001.05's oracle gains a **pre-completion negative** — after `linkGithubIdentity` and before
completion, `volunteerProfile(accountId)` is null — proving population is *caused by* completion
and that nothing sits queued. A reader who holds the reviewer's reading now finds the answer in
the plan, and the test proves the causal claim instead of implying it.

## F2 — `array_length(...) >= 1` passes the empty array · **ACCEPT, FIXED DIFFERENTLY**

> "The proposed `array_length(top_languages, 1) >= 1` constraint does not reliably reject an
> empty PostgreSQL array." *(high, unverified-runtime-claim: yes)*
>
> "PostgreSQL returns `NULL` for the first dimension of an empty array, and a CHECK passes when
> its expression is null; a direct `complete_signup` call can therefore persist
> `top_languages = '{}'`, defeating the claimed structural 'queued-but-empty fails' guarantee."

The claim is correct as written: `array_length('{}'::text[], 1)` is NULL because an empty array
has no dimensions, and a CHECK constraint whose expression evaluates NULL **passes** — SQL's
three-valued logic treats NULL as not-false. The planned constraint would have enforced nothing
on the one input it exists to refuse, and nothing downstream would ever have noticed: the stub
stats are non-empty by construction, so every test would stay green while the structural
guarantee was a fiction. This is the exact defect class the reviewer's severity scale names —
acceptance violated despite a green gate.

**Fixed differently:** not a coalesce around `array_length`, but `cardinality(top_languages) >= 1`
— `cardinality` returns **0** for an empty array, never NULL, so the comparison is two-valued on
exactly the input that matters. The same rule is mirrored in the function body: the volunteer
branch raises when `p_github_top_languages` is null **or empty**, so a caller gets a stated
reason rather than a bare constraint violation. D-E and step 6(d) amended.

**The verify-first the reviewer asked for is folded into the step where it proves the most:**
step 6(d) gains a direct service-role call with `'{}'::text[]` languages, expected to raise —
the empirical confirmation on the migrated database that the reviewer's SELECT would only have
shown in the abstract. The executor checks this before the fix sitting closes; if the empty-array
call somehow commits, the plan was wrong again and comes back to be re-ruled, not patched
silently.

## F3 — manual linking enables unlinking, and nothing guards it · **REJECT for this item; the product question is FILED**

> "Enabling manual identity linking without an unlink guard does not preserve the specification's
> 'no unlinked volunteer accounts' invariant after signup." *(high, unverified-runtime-claim: yes)*
>
> "An email- or Google-established volunteer has multiple identities after linking GitHub; if
> Auth permits that user to unlink the GitHub identity, the volunteer account and imported
> profile remain while the mandatory identity disappears."

**The invariant as stated does not exist in the specification.** What the requirement states is a
signup-time mandate: AT-001.04 gates completion on the link, AT-001.05 fires onboarding at that
completion, and the coverage map's clause reads *"GitHub link mandatory at volunteer signup"*.
No acceptance id in AT-REQ-001 addresses post-signup identity lifecycle, and the file carries
direct evidence the omission is deliberate: AT-001.08 is retired with *"the PRD defines no
identity-collision/linking policy; re-add if the PRD ever specifies one"*
(`.taskmaster/docs/acceptance/at-req-001.md` line 16). A guard against post-signup unlinking
would be shipped behaviour no ratified text asks for — scope growth introduced by a reviewer,
which is still scope growth. Building it here would also be guessing at a product answer
(refuse the unlink? cascade-close the account? re-block the volunteer?) that belongs to the PRD,
not to this leaf.

Two narrowing facts, recorded so the filed question is honest about its size: nothing this item
ships calls the unlink surface, and an unlink would remove the return-visit sign-in path while
the imported profile row — handle and stats — persists in `public.volunteer_profiles`. The
account does not silently lose its onboarding data; it loses an Auth identity.

**Filed, not ruled away:** the question — *should Auth permit a volunteer to unlink the GitHub
identity after signup, given the PRD currently says nothing?* — goes up through PHASE-STATE.md
for the coordinator to file as its own board item. The reviewer's verify-first (measure the
unlink on the live stack) is deliberately **not** adopted into this item's proof script: it
gathers evidence for a question no id this leaf owns asks, and the executor's budget is bounded.
The item that picks up the filed question measures it first.

## F4 — the backstop proves existence, not ownership · **ACCEPT**

> "The database backstop checks only that some GitHub identity exists and never verifies that
> `p_github_handle` is the handle belonging to that identity." *(medium)*
>
> "A service-role caller bypassing the edge function can supply a linked account id with a
> different non-empty handle and stats, and `complete_signup` will commit a profile for the
> wrong handle."

Correct. As planned, the defence-in-depth answered "is *a* GitHub identity linked?" while the
row it guards records *a specific handle* — the gap between those two questions is exactly a
profile committed under a handle the account never linked, and the edge-function path never
exercises the gap because it derives the handle from the same identity it checks, so no test
would have caught it.

**Amended:** the D-E check now binds the handle — the `auth.identities` row must have
`provider = 'github'` **and** `identity_data->>'user_name' = p_github_handle`. That is the same
field the shipped extractor reads, one fact with two readers, and risk 3 is extended to name
both: if GoTrue's field is not `user_name` when a real OAuth app first arrives, the one-line
change is now a two-place change (extractor + a follow-up migration recreating the function).
Step 6(d) gains the mismatched-handle negative: identities row fabricated with handle X, direct
service-role call with handle Y and non-empty stats → raises.

## F5 — the provider comment is still true, and the plan would have rewritten it · **ACCEPT**

> "The plan classifies the existing statement that the signup path never receives the session
> provider as obsolete even though the proposed API adds only `githubHandle`, not
> `SessionProvider`." *(low)*
>
> "Rewriting that load-bearing comment as false would misdescribe AT-001.03's coverage: the
> decision path still cannot branch on whether the session was established by email or Google,
> which is the reason that test's equivalence claim remains narrow."

Correct, and verified against the comment itself
(`tests/at/suites/req-001/a-signup-and-signin.test.ts` lines 151–163). D-B adds a fact about
**linked identities** — `caller: { githubHandle: string | null }` — not the session's
establishing provider. After this item the decision path still cannot distinguish an
email-established session from a Google-established one, so the comment's core claim — *"the
shipped path ignores the provider BECAUSE IT NEVER RECEIVES ONE"* — remains true and remains
load-bearing for why AT-001.03's equivalence comparison is narrow. D-I as written lumped it in
with the genuinely falsified comments, and executing that would have turned a true record false
— the audit's first box, self-inflicted.

**Amended:** D-I now names the comment as **retained**. One mechanical clause inside it does go
stale — *"the adapter's `completeSignup` passes only `session.accountId`"* — and is updated to
name the caller fact, with one added sentence stating the distinction: a linked-GitHub fact is
not the session provider, and the equivalence claim stays exactly as narrow as before. The
genuinely false statements (the file-header sentence "the other three belong to the GitHub
leaf", the `notLanded` stubs, the pending markers) are corrected as D-I always said.

---

## What I changed on my own authority, no finding attached

Nothing. The five amendments above (D-C's abandoned-flow paragraph and the .05 pre-completion
negative; D-E's `cardinality` constraint and the function-body empty raise; D-E's handle-binding
check and risk 3's extension; D-I's retained comment; section 5's filed-question line) each
trace to a ruling, and no other plan text changed meaning.
