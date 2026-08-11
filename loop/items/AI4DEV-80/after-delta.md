# after-delta.md — what the mechanism changed, measured at the audit-fix head

Written by the EXECUTOR of the fix-and-goal pass, 2026-08-11, and RE-MEASURED by the
executor of the audit-fix pass on the same day, at the head that carries the AUD-1 pin.
Every after-side number here comes from that re-measurement. The earlier numbers are quoted
only for comparison, and where they differ the reason is stated rather than smoothed away.

Evidence files, both committed beside this note:

- before: `report-before.txt` and `report-before-79.txt`, captured at S1 before any code
  changed;
- after: `report-after.txt` and `report-after-79.txt`, re-captured at the audit-fix head.

## 1. The headline, with BOTH denominators

The two percentages do not divide the same total, so neither is readable alone.

| | before (S1) | after (audit-fix head) |
|---|---|---|
| transcript files scanned | 479 | 924 |
| responses counted | 26352 | 49336 |
| output tokens counted | 39659466 | 50080087 |
| unattributed output tokens | 27986120 | 33795125 |
| **unattributed share** | **70.6%** | **67.5%** |

The after share is strictly lower, by 3.1 points. That is the whole movement in the
headline percentage, and it is SMALL. Ruling G1-8 requires that to be said plainly, so:
the percentage is not the evidence this item produced.

**The absolute unattributed number went UP**, from 27.99 million output tokens to 33.80
million. That is not a regression. 445 more transcript files are counted at all, and the
work inside them was previously invisible rather than attributed — some of it resolves an
item now, and some of it has nothing to resolve. A share whose denominator nearly doubles
cannot be compared to its old value without saying so.

## 2. The real movement: what is now ATTRIBUTED

| | before | after | change |
|---|---|---|---|
| attributed output tokens | 11673346 | 16284962 | +4611616, +39.5% |
| attributed responses | 10816 | 21345 | +10529, +97.3% |

Nearly twice as many responses now carry an item. That is the mechanism working, and it is
the honest headline of this item.

Where the attributed responses come from, at this head (24 distinct items carry rows):

| source | rows | responses | output tokens |
|---|---|---|---|
| own record branch | 20 | 11025 | 5640877 |
| the spawn tree | 14 | 4445 | 2053382 |
| the session stamp | 11 | 211 | 224337 |

The `tree` source did not exist before this item. It attributes 4445 responses across 14
items that resolved nothing on their own records.

## 3. The previous item, scoped — the same store seen twice

`-Item AI4DEV-79` (the pool item worked before this one) is the clearest single view.

| | before | after |
|---|---|---|
| responses | 249 (all `branch`) | 1935 (1576 `branch` + 359 `tree`) |
| output tokens | 65209 | 815888 |
| roles visible | 2 (conductor, coordinator) | 7 (orchestrator, executor, reviewer-runner, conductor, coordinator, mechanical, general-purpose) |

Before, that item's ledger showed a conductor and a coordinator and nothing else. The
sittings, the executor and the reviewer-runners that did the work were invisible. The role
table now shows the whole relay, which is what ruled bullet 3 asked for. That item is
finished, so its numbers are the same at this head as at the goal head.

## 4. The floors, restated at this head

- **Ambiguous agents: 2.** Two agent transcripts name two or more items in their own
  records. Their branchless responses stay unattributed, and — new at the fix pass, ruling
  G2-2 — their vendor spend stays unjoined too, rather than being credited whole to
  whichever item their last branch record named.
- **Metaless agents: 0.** Every agent transcript on this store has its meta file beside it,
  so no role reads `unmarked agent` today. The code still handles the case and still says
  so out loud, because zero is a measurement of this machine, not a guarantee.
- **Transcript files that could not be opened: 0.**
- Coordinator work on `main` that holds no item remains the large floor: the tree has
  nothing to hand down.

## 5. Why the after side was measured AGAIN, at the audit-fix head

The audit ruled AUD-1: the spawn context must pin the FIRST sighting of a spawn call, even
when the session had resolved nothing at that moment. The pin can only REMOVE an
attribution or leave it as it stood. It can never add one, because it replaces a later,
better-resolved sighting with an earlier, poorer one. A carried-over after side could
therefore state more attribution than the shipped code produces, so the after side is
re-measured here.

**Measured, not assumed.** The audited report code and the fixed report code were run back
to back against the live store, with identical parameters, minutes after the capture above.
Both printed 49342 responses, 50084141 output tokens, 33795125 unattributed output tokens,
67.5%, and the same 14 `tree` rows with 4451 responses. The pin changes NOTHING on this
machine's store today: no spawn call on this store is first sighted before its session
resolves an item. The pin is a correctness guard against a case this store does not yet
hold, and selftest assert A15 is what proves it works — red against the audited code, green
against the fixed code.

## 6. Why these numbers differ from the earlier measurements

| | draft head | goal head | audit-fix head |
|---|---|---|---|
| unattributed share | 67.7% | 67.6% | 67.5% |
| transcript files | 912 | 919 | 924 |
| responses | 48658 | 49071 | 49336 |
| `tree` responses | 3764 | 4188 | 4445 |

The store is LIVE. It grows while the item is worked, because the sittings, the readers and
the executors working this item write their own transcripts into the very store the report
reads. So a re-measurement can never reproduce an earlier one exactly, and the direction of
the drift is always more files and more responses. The two `before` captures in this record
differ from each other for the same reason: `report-before.txt` saw 479 files and
`report-before-79.txt`, run seconds later, saw 480.

One consequence worth naming: this report cannot be used to compare two heads unless both
captures are taken at the same moment. Within a single capture pair it is sound, and every
comparison in this note is drawn from the committed pair above. The section 2 breakdown
comes from a `-Json` run whose response total is 49336, the same total as the committed
capture.
