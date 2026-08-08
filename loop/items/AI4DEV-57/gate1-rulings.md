# AI4DEV-57 (email + Google signup, three account types) — GATE 1 RULINGS

**Sitting 2 of the item: DRAFT. Ruled by `orchestrator-opus` (Opus 5, effort max) because fable is
out of credit** — a different agent TYPE, not a model override on the fable definition, exactly as
the plan sitting ran.

**Reviewed:** `loop/items/AI4DEV-57/plan.md` at `878487c069b604d97f83829c56fa2c6b5f446fa6`.
**Reviewer:** sol (codex, gpt-5.6, effort xhigh, read-only sandbox). 9 findings, its own severity
scale: high = acceptance/security failure or required redesign; medium = material structural or
verification gap; low = localized weakness.
**Raw output and distillate** are committed beside this file: `gate1-sol.md`,
`gate1-sol.distilled.md`. Every claim below is quoted from the raw file.

Nine findings, nine rulings. **Six accepted outright, three accepted with a different remedy than
the one proposed. None rejected.** This was a strong review: two findings (4 and 5) change what
gets built, and one (6) removed a security claim that was false as written.

Every structural fact I relied on was read in the tree **this sitting**, not taken from the plan or
from the reviewer.

---

## F1 — the volunteer path has no GitHub gate · **ACCEPT, FIXED DIFFERENTLY**

> "`validateCompleteSignup` permits a volunteer signup without a GitHub identity, contradicting
> AT-001.04's mandatory GitHub-link gate." *(high)*

The fact is true. The remedy is not adding the gate here, for three reasons:

1. **AT-001.04 belongs to a different leaf, by the manifest.** `loop/decomp/req-001.md` D1 leaf L2
   reads `AT-001.02,04,05 · blocked-by: L1`. This leaf declares AT-001.04 **red** in the ledger, so
   nothing here claims that gate exists.
2. **Adding it would make this leaf's own AT-001.06 unproducible.** AT-001.06 needs "an existing
   account of type `volunteer`". A gate blocking volunteer completion until GitHub is linked, with
   GitHub OAuth itself sitting in L2, either makes AT-001.06 unreachable through the product path or
   drags GitHub OAuth into this leaf. That is scope growth into a sibling leaf, not a fix.
3. **There is no running system.** No deployment, no user, and `db:reset` replays from empty.
   "Invalid accounts requiring repair" describes a live database; there is not one.

What the reviewer is right about is that the plan never said any of this, so the next reader hits
the same objection. **Amended:** the seam is documented where the next author stands — a comment at
the volunteer branch of `validateCompleteSignup` naming AT-001.04 and D1.L2, the AT-001.04 stub
detail saying the same thing, and a line in the claims table. No unused parameter is added for a
future signature; that would be speculation, and L2 changing the signature is a small edit.

## F2 — AT-001.03 and AT-001.07 green with no product-facing proof · **ACCEPT (split)**

> "The plan declares AT-001.03 and AT-001.07 green without any product-facing proof of a Google
> return sign-in or a provisioned platform-admin sign-in." *(high)*

**AT-001.07 — accepted in full.** The reviewer is right that step 7 never provisioned an admin and
never signed one in, while the acceptance text's first clause is exactly that. It is provable
locally and cheap. Step 7 gains it: an admin provisioned the only legal way (a service-role write),
signing in with email/password against the live stack, reading back `account_type = platform_admin`.

**AT-001.03 — accepted in part; the missing half is named, never manufactured.** A real Google
consent round trip needs an OAuth client that may not exist — the founder question still open. What
the loop tier can honestly prove is that a session whose provider is Google completes signup through
the same shipped decision path, and **that is all this green will claim.** So the adapter may not
fabricate a "Google sign-in succeeded" oracle; the claims table names the unproved clause verbatim;
and the merge ruling repeats it. If an OAuth client exists before the merge sitting, step 7 proves
the round trip and the claim narrows no further.

I considered declaring AT-001.03 pending instead. I rejected that: `sut-missing` would be a false
phase word — the signup path does exist — and it contradicts the manifest's leaf assignment. A
bounded green that says what it does not prove is more honest than a red that misstates why.

**This is the weakest of the four greens and the record says so rather than dressing it up.**

## F3 — the acknowledgment predicate enforces nothing · **ACCEPT, FIXED DIFFERENTLY**

> "`has_platform_acknowledgment(account_id)` merely reports acknowledgment state and does not
> enforce AT-001.01's requirement that acknowledgment precede every project creation." *(high)*

True, and unavoidable in this leaf: nothing in the tree creates a project, and building project
creation is another requirement's work entirely — none of REQ-001's 37 ids covers it.

The sharp end of the finding is fixable and is fixed: *"a predicate that always returns true — or is
never called — satisfies every planned check."* **Amended:** AT-001.01's oracle asserts the
predicate **discriminates** — false for an authenticated user who has not completed signup, true
after — so a constant-true implementation fails the test, and step 7 repeats it against the real
database. The structural half comes free from F5: the acknowledgment row is written inside the same
transaction as the account, so an NGO account without an acknowledgment cannot exist.

The clause "before any project creation is possible" is **not enforced by this leaf**, and the
claims table says so in those words rather than letting the predicate imply otherwise.

## F4 — AT-001.06 has no product operation to test · **ACCEPT** *(changes what gets built)*

> "AT-001.06 has no product operation to test because the plan creates only `complete-signup`, while
> the acceptance criterion and step 7 require an existing account to perform an NGO-only action with
> a working NGO control." *(high)*

Correct, and the most valuable finding in the set. Calling `ngoOnlyActionAllowed` directly does
prove a helper and not a boundary.

One correction to the reviewer's reasoning: **D6 does not reject a second edge function — it
prescribes one.** Its words are *"A second operation, a second function; not a switch."* What D6
forbids is a second operation smuggled into `complete-signup` behind a mode flag. The remedy the
reviewer believed was blocked is the one the plan already named.

**Amended: a second edge function, `supabase/functions/create-organization/`.** An authenticated
account creates an organisation profile; an `ngo` account succeeds and gets its `admin` membership,
a `volunteer` is refused with the one-type-per-account reason. That is the NGO-only action the
acceptance text names, its refusal decision comes from the shared module so the loop tier still
exercises shipped logic, and step 7 exercises the real boundary with a working control.

The "project need" half of the criterion's parenthesis is not built: no project or need table
exists and creating one belongs to another requirement. The org-profile half is the one this leaf
can honestly deliver — and it is the half whose table this leaf creates.

## F5 — four writes, no transaction · **ACCEPT** *(changes what gets built)*

> "The plan promises four database writes in one transaction but specifies neither a transactional
> database RPC nor a direct transactional connection from the edge function." *(high)*

Correct. Separate Data API calls are separate transactions, and the plan asserted an atomicity it
had not arranged.

**Amended:** the migration this leaf already writes gains one function, `public.complete_signup(…)`,
called once from the edge function — one round trip, one implicit transaction, all four rows or
none. The done-criterion is checkable rather than asserted: step 7 forces a completion that fails
partway and proves **no** partial state survives.

D4's split is unchanged. The shared TypeScript module still supplies every judgement and refuses
before the call; the database function supplies atomic storage and must not re-implement validation
— with exactly one deliberate exception, F6.

## F6 — the "second independent guard" was not one · **ACCEPT, FIXED DIFFERENTLY**

> "The absence of an `accounts` insert policy is not an independent barrier against public
> platform-admin creation because the public edge function must write with authority that bypasses
> that policy." *(medium — I would have called it high)*

Correct, and the plan's claim of two independent guards was **false as written**. Once the edge
function holds service-role authority, row-level security is not in that path at all, and
`parseAccountType` was the only thing standing between a request and a minted admin.

**Amended, in two parts.** The claim is corrected: the missing insert policy stops the anon and
authenticated key path — real, and step 7 proves it — and stops nothing on the service-role path.
And a genuinely independent guard is put on the path that matters: `public.complete_signup` refuses
`platform_admin` itself and raises. It lives in the database, it is on the only write path, and it
does not depend on the edge function's TypeScript, so an omitted or regressed `parseAccountType`
still cannot reach the schema. Step 7 calls the function directly with `platform_admin` and proves
the refusal.

This is the one place the database repeats a decision the shared module makes. **Deliberate:** a
defence in depth against privilege escalation is worth one duplicated check, and it is written down
here so a later reader does not "simplify" it away as redundant.

## F7 — the ui-marked selection is never committed · **ACCEPT**

> "The suite-construction steps never mark the signup and public-option tests with `surface: 'ui'`,
> although the scope reduction depends on the later wiring leaf selecting the UI-marked IDs."
> *(medium)*

Correct, and verified in the tree this sitting: `tests/at/harness/registry.ts` line 723 is
`surface: opts.surface ?? 'backend'`, and its `AtTestOptions` comment says `ui` "marks the test as
part of a wiring leaf's `--wired` re-run selection". Unmarked, D2's wiring leaf inherits no
selection from the leaf that authored the tests — and the whole D1 scope reduction rests on that
leaf being able to find them.

**Amended.** This leaf marks the ids it owns and no others: `surface: 'ui'` on **AT-001.01,
AT-001.03 and AT-001.07** — signup, Google signup and return sign-in, and the public signup options
are all auth screens the wiring leaf will drive. **AT-001.06 stays `backend`**: it is an
authorization boundary, not one of the four auth screens that leaf names. The 33 pending stubs carry
no surface option at all — marking an id whose leaf has not planned would be guessing on another
leaf's behalf, and the leaf that lands an id sets its surface in the same edit that writes the body.

## F8 — neither tsconfig covers what the plan claimed · **ACCEPT**

> "Importing `_shared/accounts.ts` from the acceptance adapter does not prove that module compiles
> under both TypeScript projects, and the planned edge-function entry point is covered by neither
> project." *(medium)*

Correct on both halves, verified this sitting. `bun run typecheck` is `bun tests/at/typecheck.ts`,
which does run `tsc -p` over both projects — but the root project's `include` is
`["src/**/*.ts", "src/**/*.tsx", "vite.config.ts", "eslint.config.js"]`, so nothing under
`supabase/` is in its program. The adapter's import pulls the shared module into the **tests/at**
program only, and the edge-function entry points are in neither.

**Amended.** Step 3's criterion no longer says "both": the shared module is checked by exactly one
project, `tests/at/tsconfig.json` — which is the strict one (`skipLibCheck: false`, `types: ["node"]`,
no DOM), so D4's constraint is the one actually enforced. Neither tsconfig is edited to cover
`supabase/**`: the root project is Lovable's territory, and putting Deno-targeted files into a DOM
program would trade one wrong answer for another. Step 5 instead runs a Deno type-check on both
entry points if one is reachable and records the exact command and result — and records plainly if
none is, rather than claiming coverage. Step 7 serves and exercises both functions either way, which
is stronger evidence than a type-check.

## F9 — no oracle for the stub details · **ACCEPT**

> "Step 2 has no oracle for the requirement that every pending stub's detail name its owning
> manifest leaf." *(low)*

Correct: `expected.ts` anchors on the `AtPending: <id> PENDING [<phase>] — ` prefix and ignores
everything after it, so a stub detail reading "todo" passes both stated commands. The ledger's whole
value is in those details.

**Amended, without new machinery** — a per-stub oracle is harness work and this is a
documentation-quality defect. Step 2 produces `pending-ledger.txt`, one line per pending id, and its
done-criterion is that all 33 name a deliverable-and-leaf that exists in `loop/decomp/req-001.md`,
with this leaf's own 4 ids absent. The manifest's coverage-check line supplies the mapping, so this
is a transcription with a source rather than an invention, and an auditor checks it by reading two
files.

---

## What I changed on my own authority, no finding attached

**The plan stated one thing about the code that is not true.** D1's third reason said the `--wired`
runner flag *"is not implemented"*. The flag **is** parsed and implemented; what does not exist is
the screen driver behind it — `runner.ts` line 970 returns **3** with *"the screen driver does not
exist yet"*. The conclusion is untouched (a screen built now could be verified by nothing), but the
audit checks whether every stated fact about the code is true, and this one was not.

**The founder answered the plan's headline question: the screens stay out of this leaf, follow the
manifest.** D1 is confirmed as written rather than merely proposed, and the plan now says so.
