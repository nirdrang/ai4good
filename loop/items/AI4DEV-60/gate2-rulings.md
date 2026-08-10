# AI4DEV-60 (session expiry, refresh, password reset) — GATE 2 RULINGS

**Sitting 3 of the item: FIX AND GOAL. Ruled by the `orchestrator` definition on fable
(claude-fable-5, effort xhigh).**

Two readers sat the draft-code gate, blind to each other: terra (codex, gpt-5.6-terra, effort
max) with six findings, and flash (opencode, deepseek-v4-flash, variant max) with three. The
distiller counts match both raw outputs (6 → 6, 3 → 3). Every finding below quotes the
reader's claim beside the ruling. Two pairs of findings converge on one defect each; each pair
is ruled once, and the convergence is named — a converged finding from two blind seats is the
strongest signal a panel gives.

## Evidence this sitting gathered before ruling

- **The pre-refactor `resolveCaller`**, read from the committed history
  (`git show 550b171:supabase/functions/_shared/edge.ts`):

  ```ts
  if (!response.ok) return null;

  const user = (await response.json()) as unknown;
  const id = (user as { id?: unknown }).id;
  if (typeof id !== 'string') return null;
  ```

  No null guard sits between the parse and the property read. A 2xx answer whose body is the
  JSON literal `null` parsed to `null`, and the `.id` read on `null` threw a TypeError, which
  `edgeHandler`'s catch turned into a 502. Every OTHER parseable non-object body — a number, a
  string, a boolean, an array — did NOT throw: a property read on a primitive boxes and yields
  `undefined`, which failed the string check and returned `null`, a 401. So `null` is the one
  parseable body whose old behaviour differed from the new module's.
- **The import grep** (this sitting's own run, not the reader's): `import type { Caller }`
  appears nowhere under `supabase/functions/` outside the comment that claims it. Both
  `complete-signup/index.ts` and `create-organization/index.ts` import only value names from
  `edge.ts` (`resolveCaller`, `json`, `refusal`, …).

## Ruling 1 — terra [1] and flash [2], CONVERGED: the 2xx JSON-`null` body is a second changed edge

> terra, medium, `edge.ts:171`: "A 2xx response whose valid JSON body is `null` now becomes a
> 401 refusal, whereas the old `user.id` read threw and became a 502; only unparseable 2xx
> bodies were accepted as a behavior change."

> flash, low, `edge.ts:178-183`, unverified-runtime-claim yes: "The accepted 'ONE EDGE
> CHANGES' description covers a 2xx with an unparseable body, but a 2xx whose body is
> parseable JSON `null` is a distinct input the claim does not name, and the pre-refactor
> code's handling of it is not determinable from this tree."

**ACCEPT, FIXED DIFFERENTLY.** Both seats found the same defect: the equivalence record names
one changed edge and there are two. Flash's verify-first question is settled by the history
read above — the old code had no null guard, so terra's stated old behaviour (throw → 502) is
confirmed first-hand. The behaviour itself is KEPT, not reverted: the old 502 was an accident
of an unguarded property read, a throw on the write path is not a refusal, and the new 401 is
the module's stated fail-closed promise. What changes is the RECORD: the `edge.ts` comment and
plan D-B now name BOTH changed edges — the unparseable 2xx body, and the 2xx body that is JSON
`null` — and state that every other parseable body behaves exactly as before (the boxing
argument above), so the completed claim is exhaustive this time. Both edges are fail-closed
and neither is reachable through GoTrue itself.

## Ruling 2 — terra [2]: the refusal-text equality assertion imports another id's criterion

> terra, medium, `b-verification-and-sessions.test.ts:308`: "AT-001.38 makes equality between
> wrong-password and unknown-address refusal text a pass/fail assertion, despite the plan
> saying that no-existence behavior is observed, not asserted."

**ACCEPT.** The amended plan pinned this exactly: "observed, not newly asserted." The body's
own comment says "observed here, not newly asserted" — and then the code asserts. Comment and
code disagree, which is this repository's untrue-stated-fact class, and the assertion makes
AT-001.21's no-existence-oracle criterion (another leaf's ground) a pass/fail condition of
AT-001.38. An implementation that satisfies both of .38's clauses could fail this body on
response-text policy alone. Remedy: remove the unknown-address probe and the equality
assertion; replace them with a comment that cites the fixture's deliberately single-reasoned
refusal (`_fixture.ts` `signInWithEmailPassword`, the one-reason branch) as AT-001.21's
ground, not asserted here. Plan D-E step 3 is amended to match.

**Removal condition (this ruling removes an assertion):** before removing, the executor
confirms both of the criterion's own clauses remain asserted — the wrong-password refusal
(`bad.ok` false) and the no-new-session count comparison — and that no other body reads the
unknown-address probe. If either check fails, stop and report; do not remove.

## Ruling 3 — terra [3] and flash [3], CONVERGED: the sign-in control does not prove minting

> terra, medium, `b-verification-and-sessions.test.ts:291`: "The correct-password control does
> not prove that sign-in minted a session, because `registerAndConfirm` already leaves the
> fixture's registration session live and `length > 0` passes without a before/after
> increase."

> flash, low, `b-verification-and-sessions.test.ts:287-291`: "Plan D-E's AT-001.38 control —
> 'sign-in with the correct password succeeds, and `sessionsOf` grows by one' — is not
> implemented: the body asserts only `sessionsAfterGoodSignIn.length > 0`."

**ACCEPT.** Both seats are right, and the convergence is noted. The registration-minted
session (the declared divergence) keeps the count above zero even if `signInWithEmailPassword`
minted nothing, so the assertion's own message ("a successful sign-in must mint a session")
overstates what it checks, and the plan's grows-by-one clause is unimplemented. Remedy:
`registerAndConfirm` returns `{ email, accountId }` instead of the address alone — the
accountId is live-faithful (a registered, unconfirmed user exists and has an id on the real
stack; the registration SESSION handle stays hidden, which was the helper's point and remains
true). AT-001.38 reads `sessionsOf(accountId)` after the confirm and before the good sign-in,
then asserts the after-count is exactly the before-count plus one. The failed-attempt
comparison stays pinned to the after-good-sign-in reading. The other three bodies destructure
`email` and change nowhere else.

## Ruling 4 — terra [4]: a resend retains the first reset link

> terra, medium, `_fixture.ts:833`: "A second password-reset request retains the first link in
> `byPasswordResetLink`, so the earlier link remains usable after a resend. … Reset A → reset
> B → complete reset A succeeds, which defines a resend policy even though reset-link resend
> semantics are retired and explicitly declared unmodeled."

**ACCEPT, FIXED DIFFERENTLY.** The mechanism is real: a re-request mints a new link,
overwrites `user.passwordResetLink`, and leaves the earlier map entry alive. But the remedy
the finding points toward — invalidating the earlier link — would MODEL resend-invalidation,
which is retired AT-001.15 ground (acceptance line 30) that this item is forbidden to model
or assert. No body requests a reset twice, and none may assert either retention or
invalidation without re-entering the retired ground, so the behaviour is unobservable inside
the rules. The defect that remains is the record's: the retention is an unstated behaviour on
retired ground. Remedy: one comment addition at `requestPasswordReset` naming it — a
re-request leaves any earlier link in the map, deliberately unmodeled and unasserted, because
clearing it would be the retired resend semantics. No behaviour change.

## Ruling 5 — terra [5]: the 3600-second boundary has no oracle

> terra, low, `b-verification-and-sessions.test.ts:358`: "Neither expiry body exercises the
> exact 3600-second boundary; both only test at 3601 seconds. … Changing the fixture's strict
> `< expiresAtMs` check to inclusive `<=` would allow access at expiry while all new bodies
> still pass."

**ACCEPT.** The fixture's `sessionIsLive` comment states the strict boundary and calls the
inclusive mutation "an off-by-one nobody could see from a test body" — with both bodies
advancing 3601, nobody looks, so the stated boundary is a promise with no oracle. Remedy:
AT-001.12's expiry advance becomes exactly `3600 * 1000` — the boundary instant, where strict
`<` refuses and inclusive `<=` would admit — with a comment saying the advance pins the
boundary; the `sessionIsLive` comment sentence is updated to cite AT-001.12 as the body that
now sees it; plan D-E .12 step 3 is amended (3601s → exactly 3600s). One boundary, one
oracle: AT-001.13 keeps its just-under/past pair, which discriminates refresh, not the
boundary.

## Ruling 6 — terra [6]: the preserved blank-id acceptance has no oracle

> terra, low, `shipped-caller.selftest.ts:51`: "The caller selftest never covers the
> explicitly preserved blank-string `id` case. … Tightening the judgment to reject `''` would
> leave the selftest green while breaking the stated deployed-behavior equivalence."

**ACCEPT.** `caller.ts` states the preservation as a decision ("A BLANK `id` IS ACCEPTED …
preserved, not tightened", draft ruling 2), and the selftest's own header says a promise with
no oracle is an untrue stated fact waiting to happen. Remedy: one selftest case — a 2xx body
whose `id` is `''` resolves a caller carrying `''` — with a comment citing `caller.ts`'s
stated preservation.

## Ruling 7 — flash [1]: the re-export comment states a false import fact

> flash, low, `edge.ts:112-115`: "The re-export comment asserts 'both say `import type
> { Caller } from '../_shared/edge.ts'` and both keep working' — neither deployed function
> imports the `Caller` type at all."

**ACCEPT.** Confirmed by this sitting's own grep (above). The re-export itself is sound and
stays; the justification sentence is corrected to the truth: neither deployed function imports
the type today — both import only value names — and the re-export keeps this module's surface
unchanged so either function may import the type from here without touching `caller.ts`.

## Disposition summary

| finding | ruling |
|---|---|
| terra [1] + flash [2] (converged) | accept, fixed differently — record completed, behaviour kept |
| terra [2] | accept — assertion removed, with removal condition |
| terra [3] + flash [3] (converged) | accept — grows-by-one implemented via `{ email, accountId }` |
| terra [4] | accept, fixed differently — comment names the unmodeled retention |
| terra [5] | accept — AT-001.12 advances exactly 3600s |
| terra [6] | accept — blank-id case added to the selftest |
| flash [1] | accept — comment corrected to the grep-verified fact |

No finding is rejected. No verify-first ruling remains open: the one unverified runtime claim
(flash [2]) was settled this sitting by reading the committed history, and the evidence is
quoted above. No maintained reviewer disagreement exists.
