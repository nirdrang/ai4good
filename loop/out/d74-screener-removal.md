# Candidate ruling — remove the automated triage screener from the MVP PRD entirely (for adversarial challenge)

## The proposal

Delete the automated screener from v1. The TRIAGE GATE STAYS — every publish still lands in `triage` and nothing reaches the marketplace without review — but the reviewer is the founder, directly, for every publish. The screener (model, OD-8 threshold config, uncertainty routing, auto-approve path, screener audit records, post-hoc spot-check surface) moves to the roadmap, to be re-introduced when publish volume makes founder review a bottleneck.

Concretely:
- `scoped` → `triage` on Publish (unchanged). Every publish shows the NGO "under review" (the "clean publishes go live immediately" copy dies).
- The founder reviews the scope doc + intake + Discovery risk flags (all already visible to them) and gains a third outcome: **approve → `open`**, alongside the existing return → `scoped` and terminal decline → `cancelled`. The triage→open actor changes from screener to founder in REQ-005.5's table.
- Human-decision audit records stay (reviewer, timestamp, decision, reason, tier, scope snapshot). Tier-2-never-auto becomes moot (nothing is auto). d73's categorical-recommendation machinery becomes moot (the founder sees every case directly).
- An internal review-target (e.g. same/next business day) replaces "reviewed promptly" — an ops target, never an NGO-facing SLA.

## The reasoning FOR removal (challenge this)

1. **Volume reality.** Launch liquidity is low by the founder's own ruling (d68 killed the candidacy window on the same ground). Publishes at pilot scale ≈ a handful per week. An automated screener in front of that volume is machinery without a workload.
2. **The founder already reads everything.** v1 is founder-vetted NGOs, concierge-matched pairings, founder exception queue, and — decisively — REQ-023 already requires post-hoc spot-checks of auto-approvals. If auto-approvals get human eyes anyway, the screener changes WHEN the human looks (after public exposure) not WHETHER. Same human workload, worse timing, plus a whole ML subsystem.
3. **Untunable at launch.** OD-8 is "pilot-tuned" — but tuning needs labeled volume that doesn't exist on day one. There is no violation dataset, no false-positive base rate, nothing to calibrate an uncertainty threshold against. A manual-first phase GENERATES the labeled dataset (every founder decision is a training/eval example) that a future screener needs. Automation-first inverts the data dependency.
4. **Risk asymmetry.** The screener's only real power after d73 is auto-approving confident-clean Tier-1 cases (it can't terminate, Tier-2 never auto-approves). Its upside is saving the founder a click on the easiest cases; its downside is a policy-violating project publicly live under the platform's implicit endorsement. Concentrating the subsystem's entire risk in its only power is a bad trade at pilot.
5. **It's one of three AI gates.** v1 currently has the Discovery decline gate (in-conversation), the REQ-036 PRD completion scorer, and this screener. The Discovery gate already does the coarse policy filtering upstream (confidential-codebase, unfit needs are declined before a scope doc exists). The screener is the most redundant of the three.
6. **Consistency.** The founder's standing pattern is defer-machinery-until-volume (candidacy window removed d68; canary/self-audit, notification batching, observability cut in d26). The screener is the same shape of premature machinery.

## What the challenger must check in the repo

- `.taskmaster/docs/prd-mvp.md`: REQ-023 (the whole section), REQ-005.5 (screener named in transitions), REQ-036 (the "scorer shape applied to triage" cross-reference), REQ-004 (Discovery decline gate — does it really cover the policy surface upstream?), the OD register (OD-8), NGO-facing copy commitments, roadmap.
- `.taskmaster/docs/acceptance/at-req-023.md` (19 tests — most assert screener behavior) and `at-req-005.5.md` (.13–.19, .50 assert screener transitions).
- The d73 decision (screener-never-terminal) which this would supersede.

## Challenge ask

Attack the reasoning as hard as you can:
1. **Steelman the screener:** what does v1 actually lose? Founder-as-SPOF (illness/vacation freezes the marketplace pipeline?); review latency vs NGO momentum; consistency/bias of human-only decisions; the screener as founder-AID (pre-surfacing findings in the queue without decision power) — is there a cheap middle that keeps most value at little cost, and does rejecting it need better reasons?
2. **Check the workload math honestly:** is "same human workload" true, or does the spot-check-only-samples argument fail (spot-check ≠ review-every)?
3. **Hunt breakage:** every PRD/AT reference that dies or must change; whether removing the screener quietly weakens any Promise/acceptable-use commitment; whether the Discovery gate genuinely covers the policy checks (nonprofit purpose vs vetted profile? scope-vs-tier abuse? data-tier correctness?) or whether triage was the ONLY place some checks ran — list any check with no remaining automated home and say whether a human catches it reliably.
4. **Test the dataset argument:** is manual-first-generates-training-data sound, or rationalization?
5. **Verdict:** remove entirely / keep as decision-maker / keep as advisory aid only — rank the three and name the minimal PRD change set for the winner.

OUTPUT ONLY this JSON (no prose before/after):
{"verdict":"remove|keep-decision-maker|advisory-only","reasoning_holes":[".."],"steelman":[".."],"breakage":[{"where":"..","what":".."}],"checks_with_no_remaining_home":[".."],"workload_math":"..","dataset_argument":"sound|rationalization — why","ranking":["..",".."],"minimal_change_set":[".."],"rationale":".."}
