# d71 candidate ruling — blockers + light liveness on public listing cards (for adversarial evaluation)

## The tension being resolved

- REQ-024 requires a blocker's presence, count, and highest severity to be observable "wherever the project is listed (the project page, the marketplace, and the NGO dashboard)".
- REQ-011 requires the open-project card to show "static attributes only, with no live stats, no dollar figure, and no candidate/interest count".

Both cannot govern the marketplace card as written.

## The candidate ruling (founder-leaning: live data allowed on public cards)

GitHub is the explicit presentation reference (standing decision d38: mimic GitHub project cards). GitHub's split: cards = identity + light recency (name, description, language, "updated X ago", stars/forks); the repo page = full operational surface (issue counts, PR counts, CI badges). GitHub never puts operational-health counts on cards; our in-progress showcase card is already deliberately richer than GitHub's cards (modeled on the repo-page header).

Ruled changes:

1. **Open-project card** (marketplace, `open` state, pre-build) gains exactly two live elements:
   - an "updated X ago" recency signal (covers scope re-edits/republish);
   - a **blocker chip — presence + count + highest severity — rendered only when count > 0** (absent when zero, like GitHub topics).
2. **In-progress showcase card** gains the same blocker chip alongside its existing live signals (task progress, cadence, stack, last activity, contributor).
3. **Unchanged bans on all cards:** no dollar figures, no candidate/interest counts, no popularity metrics (stars/forks/watchers).
4. **Wording:** REQ-011 "static attributes only" → "identity attributes plus light liveness signals (recency, blocker state) — never dollar figures, candidate counts, or popularity metrics". REQ-024's "wherever the project is listed" then holds literally with no carve-out.
5. **Tests:** AT-011.05 (exactly-seven-attributes) and AT-011.06 (no live stats even with retained history) loosen to admit exactly these two signals; AT-011.08 gains the chip; blocker-chip correctness is tested in the future REQ-024 suite.

## Context the evaluator must weigh (read these in the repo)

- `.taskmaster/docs/prd-mvp.md` — REQ-024 (blocker types, severities, lifecycle independence), REQ-011, REQ-010 (what the PUBLIC project page already shows: full task tree, fuel balance, unresolved-clarification flags), REQ-005.5 (which states a listed project can be in), Platform Promise (§2 transparency, §5 no popularity, §6 progress signals).
- `.taskmaster/docs/acceptance/at-req-011.md` — the tests this ruling would amend.
- Standing invariants: candidacies never surface publicly; NGO hard-exposure promise; the open card was deliberately hardened to static-only in an earlier founder pass (anti-noise); Goal-5 wants stale open projects matched, not stigmatized.

## Evaluation ask

Try to break the ruling. Specifically attack:
1. **Information-leak surface:** which REQ-024 blocker types could be visible on a PUBLIC card, and what does each leak? (e.g. a fuel-exhaustion blocker chip = the NGO's financial state visible to every browsing volunteer; "awaiting NGO clarification" = public shaming of a named NGO; severity taxonomy exposure.) Does anything conflict with the PRD's privacy/dignity posture, or is it all already public via the REQ-010 page one click deeper?
2. **Adverse selection / marketplace dynamics:** does a blocker chip (or staleness signal) on OPEN cards deter candidacy exactly where Goal-5 aging wants matches? Is "updated X ago" on an open card a stigma machine?
3. **State validity:** which blockers can even exist for a project in `open` (pre-build, pre-volunteer)? Is the open-card chip solving a real case or decorating an empty set? Check REQ-024's blocker catalog and REQ-005.5 abandonment→open (do blockers survive the return to open?).
4. **Consistency:** contradictions with the never-surface rules (candidacies, dollars), AT-011 assertions beyond 05/06/08, the GitHub-fidelity claim itself (is the plan actually GitHub-faithful, or is it citing GitHub while doing the opposite?), and REQ-024's dashboard/page wording.
5. **Chip semantics:** "rendered only when count > 0" — is a disappearing element an honest signal or an existence oracle problem? Severity display on a public surface: does the PRD define severity levels suitable for public rendering?
6. Alternatives: if the ruling breaks, name the minimal repair (e.g. chip on showcase only; chip counts only clarifying-type blockers; recency yes / chip no) and say which survives your own attacks best.

OUTPUT ONLY this JSON (no prose before/after):
{"verdict":"sound|needs-repair|broken","fatal":[".."],"serious":[".."],"leaks":[{"blocker_type":"..","what_it_leaks":"..","already_public_via_page":true}],"open_state_validity":"..","at_impact":[".."],"repair":"the minimal amended ruling that survives","rationale":".."}
