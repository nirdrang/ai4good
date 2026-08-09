# AI4DEV-60 (session expiry, refresh, password reset) — DRAFT-SITTING RULINGS

**Sitting 2 of the item: DRAFT. Ruled by the `orchestrator` definition on fable (claude-fable-5,
effort xhigh).** The gate-1 rulings are in `gate1-rulings.md` and were pushed at `550b171`,
before any code. The executor (opus) then built the draft in one invocation, one commit per
step (`ee4b749`, `bb0da79`, `f1eb2f4`, `87b38aa`). Its report surfaced three matters that are
mine to rule, not its to decide. Ruled here so the record carries them.

## 1. `edge.ts`: a 2xx answer with an unparseable body now refuses (401) instead of throwing (502)

The executor reported this deviation from D-B's "behaviour unchanged" intent instead of
burying it. **ACCEPTED.** Handing the whole body to the pure module requires reading the body
before the status short-circuits, so the parse must not throw; the executor made it
non-throwing and `null`-on-failure, which keeps every refusal path byte-for-byte identical —
including an Auth outage answering HTML, which stays a 401. The one changed edge — 2xx plus
unparseable body — moves from 502 to a refusal, which is the fail-closed direction and matches
the module's stated promise. It is not reachable through GoTrue itself (JSON on both
branches). Preserving the old 502 exactly would need a status check in `edge.ts`, a second
copy of the 2xx rule outside the module — the exact defect the extraction removes. The plan's
D-B now records the accepted edge.

## 2. A blank-string `id` still yields a caller

**ACCEPTED — preservation, not tightening.** `''` is a string, so the old inline code accepted
it and the module accepts it, stated plainly in the module header. Nothing turns on it (GoTrue
answers a uuid; a blank id fails the database's own `uuid` cast). Refusing blank would be a
behaviour change no decision made. If a leaf ever wants it refused, that is a decision to
write down, not a side effect of moving code.

## 3. Proportionality re-decided at the measured diff: ONE SLICE, maintained

D-H estimated roughly 650 changed lines outside `loop/items/`; the draft measures 1,334
insertions there (1,605 total, 169 deletions). The one-slice decision is **MAINTAINED**, with
the reasoning written down rather than the estimate quietly forgotten: the diff is one concern
— the session machinery and the bodies that drive it — and slicing would separate the fixture
from the four bodies that are unreadable without it. The excess over the estimate is comment
weight in the fixture and contract, not additional logic. Both draft-code readers read the
whole diff. D-H now carries the measured number.

## The verify boundary, restated for the record

The verify suite was not run on the changed tree — the draft-code gate's pinned premise, per
the orchestrator contract. Consequences, so nobody reads more into this draft than it earned:
step 2's "still exits 0 before the bodies land" clause and step 3's "exactly 13 passed"
clause are UNESTABLISHED; the four new bodies have never executed; the nine existing greens
are unverified against the uniform-validation change (the executor traced all nine against
the new path by reading — none advances the clock — and that is reasoning, not measurement).
The FIX AND GOAL sitting establishes all of it, plus steps 4–6.

## Executor conduct noted for the record

One invocation, no dispute, caps untouched. It caught its own re-export defect (a
no-local-binding `export type ... from` that Deno would have rejected at serving time) and
proved the fix with a second instrument; it caught and fully repaired a PowerShell 5.1
encoding corruption before anything was committed, then swept all ten touched files clean.
Both incidents are in its report, which this sitting's completion text relays upward.
