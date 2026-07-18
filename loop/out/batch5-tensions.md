# Batch-5 PRD tensions (surfaced by AT round-1 critique, REQ-030..034)

Numbering continues from batch 4 (T1-T3).

## T4 — REQ-030 "no operator paging" vs REQ-009 watchdog "the admin is paged"

**The collision (codex round-1, AT-030.03):** REQ-030: "No monitoring framework in v1 — no job heartbeats, invariant pagers, or operator paging; detection is the daily dashboard read, error-spike alerts (NFR), and automatic reconciliation." REQ-009 (fuel-stop watchdog, d69): when provider usage data goes stale or a key flip cannot be confirmed, "the admin is paged." Both cannot pass as written.

**Proposed resolution (editorial candidate):** REQ-030's ban targets a routine monitoring FRAMEWORK (heartbeat/pager infrastructure watching ordinary jobs). The watchdog page is a named money-safety fail-closed alarm — the same family as the error-spike alerts and large-drift admin notifications REQ-030 itself already permits, delivered through the ordinary REQ-016 platform-admin channel, not through a paging system. Minimal PRD change: (a) REQ-030's monitoring line enumerates its alert exceptions and includes the REQ-009 watchdog alarm; (b) REQ-009's "the admin is paged" is reworded to "the platform admin is notified (REQ-016)" so no paging infrastructure is implied. AT-030.03 then keeps its three absence probes with the watchdog alarm named as a permitted notification.

## T5 — REQ-033 "from in_progress onward" vs REQ-006/012 completion effects

**The collision (codex round-1, AT-033.03):** REQ-033 makes the assistant available "from in_progress onward" and it is billable (fuel-metered, no free credits). But at completion REQ-006/012 release leftover project fuel to the general balance, terminate project keys, and archive the provider workspace — no funded metering path exists on a completed project, and post-completion paid work is explicitly a NEW project. A billable assistant on a completed project has nothing to meter against.

**Proposed resolution (two candidates, breaker to rank):**
- (a) **Availability ends at completion:** the clause becomes "available while the project is in_progress" — the assistant is a build-phase companion; the completed page already carries the static status surfaces. Minimal change: one REQ-033 availability line.
- (b) **Visible but permanently non-billable at completion:** the surface remains with billable requests permanently declined (the zero-fuel stop becomes terminal) and a completed framing. No new money path; but it keeps a dead chat surface and needs a non-billable rendering defined.

Lean: (a) — simplest true statement; (b) preserves "onward" at the cost of defining a non-billable mode the PRD never asked for.

---

**T4/T5 RESOLVED** by the first breaker pass (batch5-tension-verdict.json): both editorial, both amended — T4 registers the watchdog-failed-closed event in REQ-016's static taxonomy (no paging integration anywhere); T5 uses a first-kickoff-to-terminal availability interval. Folded as d78.

## T6 — break-glass repo hide vs Promise §2 / REQ-008 public-repo invariant (from 031 round-2)

**The collision (codex round-2, AT-031.03/06):** d75's break-glass hides "the repository when one exists," but Promise §2 says "every repo is public MIT" / "v1 is public-only," and REQ-008 carries the public-repo invariant with continuous verification (AT-008.27 already carves out the authorized emergency hide at the AT layer — the PRD text itself carries no carve-out).

**Proposed resolution (editorial candidate):** d75 already DECIDED the behavior (founder ruling); the PRD wording merely lacks the exception. Name the active founder break-glass hide (REQ-031) as the one authorized TEMPORARY exception: (a) Promise §2 gains a clause — public from setup validation onward, except while an audited founder break-glass hide (REQ-031) is active; (b) REQ-008's visibility invariant names the same carve-out (its remediation preserves the authorized hide — the AT already tests this); (c) REQ-031 already states reversibility, so the exception is bounded by the hide's lifetime. No behavior change anywhere — wording alignment with d75.
