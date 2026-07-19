# Way-of-Work: Claude-Code-Driven Linear (no GitHub→Linear automation)

v4.4, 2026-07-19 — **GOVERNING AMENDMENT (founder ruling): the skill and attribution live
at TIER 1 = THE REQUIREMENT, only.** `/next` claims a REQUIREMENT (project started +
attribution bound); `/done` completes a REQUIREMENT (full AT suite at integration tier +
founder attestation); the stamp carries wave/project/bucket — NO issue IDs. TIER 2 —
everything inside the project (deliverable parents, leaf items) — is managed VANILLA:
plain Linear MCP calls as ordinary work actions plus the native GitHub integration as
Linear ships it (branch links, merge→Done); no pull records, no leaf bindings, no leaf
evidence gates, no detect-and-revert machinery. Code hygiene = CI checks required to
merge. The v4-era per-leaf apparatus (clean-branch-at-pull, base-OID pull records, R2'
reverts) applies ONLY at the requirement bracket, where it was load-bearing: §2's evidence
gate governs requirement completion; leaves are working notes, not governed objects.
Cadence remains skill-posted at tier 1 (project status updates reading Linear's own
progress data). Earlier v4.1–4.3 text below should be read through this amendment where
they conflict; product-side granularity (REQ-034/028 → deliverable-level binding) is a
pending d82 PRD fold awaiting the founder's mapping confirmation.
v4 baseline: all three codex breaker rounds complete (wow-breaker-r1/r2/r3.json).
Round 3's one critical + two majors are folded below (marked [r3]); per the founder's
3-round cap, the v3→v4 delta itself is NOT codex-re-evaluated — the residual risk is that
delta, and it is small and mechanical. v3's design shift stands: ONE control machine,
serial verbs, **remote-evidence-first** (Linear + GitHub are the durable records; local
files are caches only), no offline replay engine.

## Scope & assumptions

- A1. All buildout work — code, commits, PRs, merges (`gh`), Linear writes (MCP) — happens
  in Claude Code sessions on **ONE declared control machine** (v0). A second machine or
  contributor requires revisiting §9 first.
- A2. The founder may browse Linear anywhere but agrees not to hand-edit buildout issue
  STATUS outside sessions (mobile comments are fine). Violations are detected as
  end-state divergence (§5, narrowed claim) and corrected by the founder.
- A3. Linear structure per the decomposition plan; bindings and evidence use immutable
  UUIDs alongside human identifiers.
- A4. **(REVISED, founder ruling 2026-07-19 — the two-tier split):** Linear's GitHub
  integration IS installed, configured exactly as the product's d76 rule: merge→Done ON
  (tier-2 leaf closure), branch/PR→started OFF (In Progress remains `/next`'s monopoly).
  The integration can only ever touch LEAF work items (no PR maps to a deliverable or
  project); tier 1 is skill-enforced exclusively. Unmatched integration flips are
  detect-and-reverted by reconcile (§5), mirroring REQ-026.
- A5. **Attribution scope (founder decision):** the per-message stamp is ADVISORY in-band
  context — the client half of REQ-034 only. Transcripts retain it beside per-message
  usage for any later reader. No usage log or token accounting until the real gateway.
  Subagents inherit the stamp best-effort when spawned from stamped context. Stated
  non-goal, not a gap.

## 0. Activation prerequisites (ALL must hold)

- P1. Decomposition manifests exist (`loop/decomp/req-0NN.md`): REQ + AT ownership (verify
  set = test IDs + exact commands + the manifest's git revision), issue/project UUIDs,
  milestone, labels, dependencies, sync stamp. Field ownership: repo owns verify sets, AT
  ownership, dependencies; Linear owns status, assignee, comments, estimates.
- P2. `AGENTS.md`/`CLAUDE.md` §5 (stale TaskMaster lifecycle) replaced by this WoW — one
  task lifecycle, `/next` the sole pull authority.
- P3. GitHub branch protection on `main`: **PRs required (no direct pushes), no
  force-push, no deletion, bypass disabled.** This makes "direct-to-main completion"
  structurally impossible rather than merely prohibited.
- P4. `gh` authenticated; Linear MCP connected.
- P5. `design/design-session.md` commit convention amended to carry the issue identifier.
- P6. **Merge-authority decision recorded** (buildout-scoped decision dNN): v0 = founder
  self-merge via the session, PR checks required. (Aligned with, but not resolving, the
  product's OD-1 — that stays open for the product.)
- P7. **The toolset exists and passed a smoke test before activation**: hooks + skill +
  reconcile script installed, with three rehearsed drills — a crash simulated mid-`/done`,
  two concurrent sessions attempting `/next` on the same issue, and a revert of a merged
  linked PR. No activation on paper machinery.

## 1. The remote-evidence principle (round-2 design shift)

Every authority-bearing record lives in a system of record, never only on disk:

- **The PULL RECORD is a Linear comment** written by `/next` at claim time: branch name,
  base OID of `origin/main` at pull, **the decomp manifest revision + verify-set digest**
  [r3 — so `/done`, R3, and remote adoption can reconstruct the authoritative verifier
  with zero local state], pull timestamp, session marker, op UUID. Durable, visible to any
  future session/machine, survives all local loss.
- **The COMPLETION RECORD is the merged PR** (author, branch, base/head/merge OIDs,
  checks) **plus a Linear completion comment + PR-URL attachment** written by `/done`.
- Local files (`%LOCALAPPDATA%/ai4good-build/`) hold only: the binding CACHE (for
  stamping), the reconcile cursor, and a scratch log. Losing all of them loses nothing
  authoritative — any session can rebuild by reading Linear + GitHub.
- Consequence: there is NO offline spool and NO replay engine in v0. If the Linear MCP is
  down, Linear writes simply wait; the session banner lists pending intents; you perform
  them when it returns. Work continues meanwhile only on the already-claimed pull; new
  work runs as `exploration`/`unattributed` (no offline claims, no retroactive authority).

## 1a. Hierarchy & the verb level (founder clarifications, 2026-07-19)

Initiative (wave) → Project (REQ) → **DELIVERABLE (parent issue — MANDATORY tier)** →
**WORK ITEM (leaf)**. Every leaf belongs to exactly one deliverable (3–6 per REQ,
plain-language named), mirroring the product's one-parent-per-story / one-sub-per-AC tree.
`/next` and `/done` are an open/close BRACKET around ONE work item — the same object, the
same level, always; they never touch deliverables, projects, or waves. Everything above
the leaf is DERIVED: a deliverable closes automatically when its last child closes (the
session writes it with a comment referencing the children — its evidence IS the children);
a REQ project completes via its milestones, terminating in one ordinary final leaf —
**"REQ-NN integration gate"** (verify set = the full AT suite at integration tier;
UI-fronted REQs also carry a wiring leaf) — so even project completion is a normal `/done`
with a bigger verify set. One mechanism at every level.

**Two-tier progress & attribution (founder-as-NGO):** tier 1 — the founder tracks
DELIVERABLES: cadence and burn speak deliverable language, exactly as the NGO view does in
the product (REQ-034's aggregation boundary applied to ourselves). Tier 2 — leaf-level
detail exists in the stamps and the op-marker trail for drill-down, never as the headline.

## 2. Status authorities

- **In Progress — one authority: `/next`**, in two forms with ONE claim protocol:
  `/next` (automatic: highest-priority unblocked unclaimed leaf, confirm-or-skip) and
  `/next <issue>` (steered: the named item, after eligibility validation — unblocked,
  unclaimed, a leaf). Both are serialized by a machine-wide lock (a named
  mutex both verbs take, so two sessions cannot interleave claims): freshness-read
  (`get_issue`: unassigned + unstarted) → human confirm → `save_issue` (assign + In
  Progress) → **pull-record comment** (the op marker) → re-read. If the re-read shows
  another claimant's pull comment (belt-and-suspenders; the lock already prevents this on
  one machine), the later claimer surrenders: it posts nothing further, reverts ONLY a
  state it can prove it wrote (its own op UUID in the pull comment), else leaves state
  untouched and reports. Aborted claims are visible as an aborted-claim comment.
- **Done — split by tier (founder ruling, v4.3):**
  - **Leaf work items:** Done flips via the GitHub integration on PR merge. Rigor lives
    BEFORE the merge (branch protection: the manifest's named CI checks — the verify set —
    are REQUIRED to merge) and AFTER it (reconcile detect-and-revert: a flip without a
    matching pull record — wrong branch, no claim, unrelated PR — is reverted, § 5 R2').
    Leaf `/done` ceases to be a gate; the suggestive engine's ripeness nudge is "merge it."
  - **Deliverables (tier 1):** derive-close when the last child closes, PLUS the FOUNDER
    ATTESTATION — one confirmation per deliverable ("this is delivered"), recorded in the
    deliverable's closing comment. The attestation moves here from the leaf level: an NGO
    accepts deliverables, not commits.
  - **The requirement's integration-gate leaf** (and wiring leaf) remains fully
    skill-gated via `/done`'s evidence gate below — the integration never closes a
    requirement.
  - **`/done`'s evidence gate** (now applying to gate/wiring leaves and any leaf closed
    without CI, e.g. Wave 0 pre-CI). All of:
  - E1. A merged PR matching the pull record: opened from the RECORDED branch, which
    `/next` created (or verified) CLEAN — **recorded branch tip == the fetched base OID at
    pull; pre-existing commits on the branch abort the pull** [r3 — ancestry proves
    topology, not timing; a clean-at-pull branch makes "descends from base" mean "written
    after pull"]; PR author = the pulling account; **diff non-empty and not revert-only**;
    exact merge OID present on `origin/main` (fetched, ancestry-verified). One PR ↔ one
    issue; and at `/done` the founder CONFIRMS a one-line mapping — "this diff implements
    <issue> / its owned ATs" — recorded in the completion comment [r3 — the issue-scope
    attestation; work pre-existing in the base cannot be laundered through an unrelated
    non-empty PR without a false human attestation, which A2 excludes].
  - E2. The verify set green against the merge OID, with the VERIFIER PINNED AT PULL: the
    test files and runner are checked out from the manifest revision RECORDED IN THE PULL
    COMMENT [r3] into a clean temporary checkout and run against the merge OID — the
    completion PR cannot weaken the tests that judge it, and the authoritative verifier is
    reconstructible from remote evidence alone. Results must be machine-readable and list
    every manifest test ID; the completion comment records revision, command, toolchain
    identity, and the durable log (attachment). Once CI exists (Wave 0), the manifest's
    named CI checks on the merge OID are REQUIRED.
  - E3. Binding UUID == issue UUID; Linear still shows In Progress + expected assignee +
    OUR pull comment (compare-before-close). Structural drift (project/team moved,
    canceled) → refuse until an explicit audited rebind. Stamping never gates.
  - Write order (crash-safe): completion comment (op UUID = merge OID) → PR attachment →
    `save_issue`(Done) LAST → unbind after read-back. Recovery needs no local state:
    reconcile R3 finds half-bundles by reading the issue's own comments/attachments/state
    and repairs forward ONLY when the completion comment (the prepared op) exists and its
    evidence REVALIDATES; otherwise it proposes rollback to the founder.
- **Blocked** is a LABEL + comment, never the status field.
- **`/override` — cannot reach In Progress or Done. Ever.** It may set: Todo (return to
  backlog), Canceled, or Waived-equivalent, with a required reason, ledgered as an
  override comment. In Progress exists only via `/next`; Done only via the gate. There is
  no "exception Done."
- **Reopen-on-revert:** if a merged linked PR is later reverted, the issue MUST NOT remain
  Done: reconcile flags it and the founder chooses — return to Todo (replacement work will
  re-enter via a fresh `/next` + new pull record) or Canceled with reason. "Accept and
  stay Done" is not an option; Done always means shipped code that is still shipped.

## 3. Binding & hierarchical attribution (unchanged from v2 except storage role)

Bind cache: `%LOCALAPPDATA%/ai4good-build/<repo-id>/bindings/<worktree-id>.json` — issue
UUID + identifier, project UUID + REQ-NN, wave, session id, pull-comment op UUID, manifest
revision. The UserPromptSubmit hook stamps every message with identifiers only
(allow-listed charset, no titles, one stamp per message):
`<ai4good-attribution wave="foundation" project="REQ-006" deliverable="AI4-100" issue="AI4-123" bucket="task"/>`
(four levels — the deliverable is the founder-facing attribution tier; the issue is the
work tier; both ride every message)
Buckets `task` / `exploration` (optionally project-scoped) / `unattributed`. The stamp is
never absent. The agent never echoes it into commits/PRs/files. **Binding recovery/adoption
is remote-validated**: `/bind AI4-123` on a fresh machine/worktree re-reads the issue —
adoption succeeds only if Linear shows In Progress + our assignee + the pull comment, and
it NEVER creates a claim (that is `/next`'s monopoly).

## 4. The op-marker trail (replaces the local ledger)

Every authority-bearing write embeds its op UUID in the Linear comment it produces (pull
comment, completion comment, override comment, aborted-claim comment). The issue's own
comment stream IS the authorized-transition trail — durable, per-issue, machine-agnostic.
Local scratch logs are convenience copies. Reconcile reads the trail, not local state.

## 5. Reconcile (narrowed, honest claims)

- **Cheap (SessionStart):** bound issue only — state/assignee/pull-comment sanity; age of
  last full reconcile (warn > 48h).
- **Full (first session of the day / on demand):**
  - R1 merged-but-not-Done: enumerate PRs MERGED since the cursor via `gh` (strategy-
    independent — squash/rebase merges leave no merge commit to scan [r3]), verify each
    reported merge OID is reachable from `origin/main`, and for each with a matching pull
    record → "run /done".
  - R2 **end-state divergence** (narrowed claim): for every buildout issue, current status
    must be explainable by its op-marker trail (leaf Done ⇒ a merged PR matching the pull
    record [the integration's flip is legitimate exactly when this holds]; In Progress ⇒
    pull comment; else backlog/Canceled ⇒ none or override). Divergence → founder
    correction queue. Explicitly NOT claimed: detecting transient flip-flops that return
    to the ledgered state (accepted v0 gap, A2 makes it low-risk).
  - R2' **detect-and-revert (v4.3, mirrors REQ-026):** an integration Done flip with NO
    matching pull record (unclaimed issue, wrong branch, unrelated PR) is REVERTED to its
    prior state with an explanatory comment — the buildout's own version of the product's
    rule that a Done not backed by a verified matching merge never survives.
  - R3 half-bundle repair (per §2, remote-evidence based, revalidating).
  - R4 decomp↔Linear drift vs manifests.
  - R5 linked-PR reverts since cursor → the §2 reopen flow.
- **Cursor:** last-scanned main OID + timestamp, local (loss ⇒ full rescan — safe because
  findings are idempotent, keyed issue UUID + merge OID); ancestry-checked before
  incremental scans (P3 makes rewrites near-impossible; if ancestry fails anyway → full
  rescan + Done-evidence audit).

## 6. Failure & degradation

Linear MCP down → §1 (wait-and-list; no offline claims). GitHub down → no merges happen
anyway; `/done` names the missing evidence. Crash mid-`/done` → §2 write order + R3.
Forgotten `/done` → R1. Lost local state → rebuild from Linear + GitHub (§1).

## 7. Session lifecycle & the suggestive posture

SessionStart: banner (binding + cheap reconcile + pending-intents list). UserPromptSubmit:
the stamp. Verbs: `/next` (auto or steered), `/bind` (incl. remote-validated adoption),
`/done`, `/blocked`, `/override` (non-Done/non-InProgress states only).

**Suggestive engine (founder direction):** authority-bearing verbs are ALWAYS
human-invoked; the skill's job is to notice ripeness and PROPOSE. On each natural progress
signal — verify set green → "open the PR?"; PR merged → "this looks ready for `/done`";
`/done` complete → "pull the next? (`/next`)"; exploration turning into implementation →
"bind it?" — the agent suggests ONCE per signal, never executes, never repeats a declined
suggestion for the same signal. Written into the skill AND `CLAUDE.md` (P2 amendment).

**Progress cadence (founder-as-NGO, tier 1):** the reporting surface is the Linear PROJECT
STATUS UPDATE — the buildout's status panel. Posted by the session, never by hand:
automatically when a deliverable closes, plus a daily digest from the full reconcile. Its
vocabulary is the product's NGO cadence translated: last merge (↔ last commit) ·
deliverables done of total (↔ tasks done of total) · current deliverable + current work
item (↔ current task) · open blockers. Plain language, big items; leaf detail lives one
click down, never in the headline.

**Skill packaging (founder direction): one skill, shared core + two adapters.** The core
is portable (bind/stamp per worktree, the pull-bracket discipline, the suggestive engine,
honest buckets); the BUILDOUT adapter speaks Linear MCP + `gh` + this WoW's evidence gate;
the PRODUCT adapter (later) speaks the platform APIs + the gateway key and becomes
REQ-028's volunteer Skill — months of dogfooding pre-exercise AT-028's behaviors before
any volunteer touches it.

## 8. Non-goals (explicit)

Token counting/usage logs (A5); webhooks/daemons/servers; offline replay; multi-actor
concurrency; transient-transition forensics (R2's narrowed claim); enforcement beyond the
skill's own gestures.

## 9. Exit conditions for v0's simplifications

Adding a second control machine or contributor, or installing CI-driven auto-merge,
reopens: the machine-wide lock (needs a shared lease), A2's UI discipline (needs event
ingestion), and P6 (merge authority). None of these may be crossed silently — each is a
recorded decision first.
