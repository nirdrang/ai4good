# AI4DEV-60 (session expiry, refresh, password reset) — GATE 1 RULINGS

**Sitting 2 of the item: DRAFT. Ruled by the `orchestrator` definition on fable (claude-fable-5,
effort xhigh).** One reviewer sat this gate: sol (codex, gpt-5.6-sol, effort xhigh). Its raw
output, distillate and stderr log are committed in `loop/items/AI4DEV-60/artifacts/`. Five
findings; five rulings below. Each ruling quotes the reviewer's claim verbatim, then rules.
The plan amendments these rulings require are applied to `loop/items/AI4DEV-60/plan.md` in the
same commit as this file, before any code changes.

A record correction first: the plan sitting's close did not commit the gate-1 evidence files —
they sat untracked in `artifacts/`. Measured twice (`git status` and `git ls-files`). They are
committed with this file. No content was lost.

---

## Finding 1 — AT-001.13 declared green with no step testing automatic refresh

> severity: high · plan.md:320
> "AT-001.13 is declared green even though no step implements or tests automatic refresh."
> "Explicitly calling `refreshSession` and manually exchanging a refresh token both pass with no
> timer, activity hook, or client auto-refresh. Because the plan marks .13 `backend`, the wiring
> leaf will not rerun it, so the entire planned gate can pass while continuous work still ends
> in forced re-login."

**RULING: ACCEPT, FIXED DIFFERENTLY.**

The defect is real, and it is the mark, not the missing timer. The criterion's "automatically"
is the client SDK's behaviour: supabase-js schedules the refresh; no code in this tree does.
The plan's per-id table says so honestly — but honesty is not ownership. The manifest's wiring
leaf finds its work by the `ui` mark (`loop/decomp/req-001.md` D2.LW: "wired re-run of D1/D2
ui-tagged P0s"), so a `backend` mark on .13 orphans the "automatically" clause: no dev leaf
ever exercises it, and the first thing that would is the requirement's far-away
integration-tier gate. That is the reviewer's point, and it stands.

The remedy the finding implies — implement or test a timer at loop tier — is not the remedy we
use. No client exists in this tree. A fixture that scheduled its own refresh would grade the
fixture, which is the puppet anti-pattern this harness exists to delete.

The fix: **AT-001.13's surface mark becomes `ui`.** The mark is the machine-readable handoff —
the wiring leaf must now find .13 and re-run it wired, where the real supabase-js client's
automatic refresh is the thing under test. D-I is amended to say this, the per-id table's
"not proved" cell for .13 now names the handoff instead of only the gap, and the body's own
comment states which half each tier proves. The loop-tier body still proves this leaf's half:
refresh extends a session with no credentials while an unrefreshed sibling of the same instant
dies.

## Finding 2 — the live checks do not bind GitHub-handle extraction across the refactored edge

> severity: high · plan.md:80
> "The live checks do not bind GitHub-handle extraction across the untyped `edge.ts` bridge
> changed by the refactor."
> "The selftest and fixture call `callerFromAuthAnswer` directly, while live checks (c)/(d)
> require only a usable caller id. An edge delegation that passes `{ id }` instead of the
> complete Auth body would pass every planned check but yield `githubHandle: null`, breaking
> deployed volunteer completion and the already-green AT-001.04/.05 paths. A live
> linked-volunteer control must cross the refactored edge."

**RULING: ACCEPT.**

Correct, and the sharpest finding of the gate. No type-checker covers `edge.ts` (its own
header says so). The refactor moves the judgment out and leaves an untyped delegation behind;
a delegation that pre-narrows the Auth body would lose `identities[]`, every planned check
would stay green, and the deployed volunteer gate would refuse every linked volunteer. The
predecessor item proved a linked volunteer through the DEPLOYED `complete-signup` (its check
(b)), but that evidence graded the pre-refactor bridge — this refactor supersedes it.

The fix: a new live check **(g)** in D-G — a linked-volunteer control across the refactored
edge. The recipe exists and is proven: `fabricateGithubIdentity` in
`loop/items/AI4DEV-58/proof-local.ts` (line ~140) inserts the identity row into
`auth.identities` with operator authority. This item's variant follows the confirmations-on
order: register, confirm via the catcher, fabricate the identity, sign in, then call the
DEPLOYED `complete-signup` with the live token and assert completion succeeds and the profile
row carries the handle and the shipped stub's exact statistics. A pre-narrowed bridge fails
this check; nothing else in the plan would catch it.

## Finding 3 — the .12/.13 bodies complete signup on the registration session

> severity: medium · plan.md:157
> "The AT-001.12 and AT-001.13 bodies complete signup using the registration session before
> performing a post-confirmation sign-in."
> "Under the plan's own premise at lines 117-122, confirmations-on signup returns no live
> session; nevertheless both setups order registration → confirmation → completion → sign-in.
> Since completion requires authentication, these bodies depend on the fixture-only
> registration handle to create the account used by subsequent write assertions, contradicting
> the claimed live public order. Sign-in must precede completion."

**RULING: ACCEPT.**

An internal contradiction, correctly caught. D-C promises every NEW body follows the live
public order; D-E's .12 and .13 setups then complete signup before signing in — on exactly the
registration-minted session the live stack never issues. The fix is the reviewer's own:
reorder both setups to register → confirm → sign in → complete under the signed-in session →
then the expiry, revocation and refresh games. For .13, both sign-ins happen first and
completion runs under one of them; the account is then completed for both sessions, which is
what the paired writes need. AT-001.38 and AT-001.14 never complete signup and are unaffected.
(AT-001.09's deliberate opposite order is the PREDECESSOR's body, stated and reasoned there;
nothing here touches it.)

## Finding 4 — "every new vendor mirror is live-bound" overreaches its cited checks

> severity: medium · plan.md:282
> "Step 2's blanket claim that every new vendor mirror is live-bound cites checks that do not
> measure several promised behaviors."
> "Checks (a)/(b) measure email/password sign-in issuance, not registration, provider, or
> administrator issuance; registration is expressly known to diverge. Check (d) proves
> refreshed access but not the promised same-session-row/session-id behavior. Check (e)
> exercises recovery for an existing address, not `requestPasswordReset` always succeeding for
> an unknown one. The fixture header could therefore label these mirrors bound and satisfy the
> done-criterion while their stated vendor behavior remains unmeasured; each needs a probe, a
> narrower contract, or an explicit unbound label."

**RULING: ACCEPT** — applying the reviewer's own menu, one choice per mirror:

- **Issuance** — narrower contract plus explicit unbound labels. (a)/(b) bind SIGN-IN issuance
  and the `auth.sessions` row, and the label now says sign-in only. Registration issuance is
  the DECLARED divergence (the fixture mints at registration; the live stack does not) — it
  stays in the honest-gap paragraph, never labelled bound. Provider issuance: unbound, no
  OAuth credential exists — same standing as the header's existing mirror 4. Administrator
  issuance: recipe-mirrored and unbound — live admin creation issues no session; nothing
  asserts one; the label says so, following the header's administrator paragraph precedent.
- **Refresh, same-session-row** — a probe. Check (d) gains one operator read: `auth.sessions`
  for the user before and after the refresh, asserting the same session row persists (no new
  row, same id). If the vendor rotates the row instead, the fail-and-re-pin protocol applies
  and the fixture mirror is corrected to match the measurement.
- **Reset for an unknown address** — a probe. Check (e) gains one call: `/auth/v1/recover`
  for a never-registered address, expecting the same 200 shape — the no-existence-oracle
  behaviour `requestPasswordReset` mirrors. Captured, one HTTP call.

Step 2's done-criterion is rewritten accordingly: every mirror is named with what binds it OR
an explicit unbound label — the standard the fixture header already practises.

## Finding 5 — "eleven" green ids; the ledger holds nine

> severity: low · plan.md:287
> "Step 2 incorrectly requires eleven existing acceptance ids to remain green."
> "The committed ledger contains nine green ids, and no new id lands until Step 3; Step 2 must
> therefore remain 9 green / 28 red. Read literally, its done-criterion is impossible without
> landing two unrelated ids early. The same stale 'eleven' appears at line 113."

**RULING: ACCEPT.**

Verified against `tests/at/expected/req-001.json`: nine green ids (AT-001.01–.07, .09, .10).
"Eleven" appears three times in the plan (the D-C bullet, step 2's done-criterion, section 5)
and is wrong in all three. All three become "nine". The 13-green / 24-red end state and
`_pending.ts`'s "thirteen written" are arithmetic on nine and were already correct.

---

## Disposition summary

| # | severity | ruling | fix lands in |
|---|---|---|---|
| 1 | high | accept, fixed differently — `ui` mark hands the automatic clause to the wiring leaf; no loop-tier timer theatre | D-I, per-id table, step 3 bodies |
| 2 | high | accept — live check (g): linked-volunteer control across the refactored edge | D-G, step 5 |
| 3 | medium | accept — sign-in precedes completion in the .12/.13 setups | D-E, step 3 bodies |
| 4 | medium | accept — probe (d)+(e) additions; narrowed and unbound issuance labels | D-C, D-G, step 2 done-criterion |
| 5 | low | accept — nine, not eleven, three places | D-C, step 2, section 5 |

No finding is rejected. No verify-first ruling: every claim was checkable against the tree and
was checked. No ruling removes work, so no removal-verification condition exists this gate.
