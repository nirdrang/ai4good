# Discovery funding and interface update

AI4DEV-132 (Discovery funding) requires another implementation pass under decision d92, dated 2026-09-20.
This document records the accepted amendment. It is not a controller brief or evidence of shipped behavior.

The founder requested PRD integration, updates to the item documents and Linear, and reopening of affected completed items.

## Required behavior

The initial beta admits 20 NGOs, with one sponsored project each.
Each project receives 10 free turns per UTC day and 50 across the beta.
One completed AI reply consumes one free turn. Token counts do not determine free usage.
The total initial beta grant is 1,000 turns, not a guaranteed dollar subsidy ceiling.

Use free capacity first, including on funded projects. After either free cap, use project fuel in USD.
A daily reset returns to free mode only while beta capacity remains.
Buying fuel, vetting, reopening Discovery, and recreating projects never issue another grant.
Atomic reservations prevent two requests from taking the last free turn.
A free reply cannot become partly paid. Failed replies release their free reservation.

Paid turns use reported API usage and the applicable versioned rates.
Price uncached input, cache reads, cache writes by duration, output, and billed tools without double counting.
Add the existing 15% fee, locked for the turn, as a separate amount at consumption.
Keep fractional cents. Settle once, keep missing usage pending, and reconcile with provider billing through adjustments.
Free calls use the platform budget and never reduce NGO fuel.

The Discovery interface follows the [agreed contract](../../../design/discovery-ui-contract.md).
It shows only the current gate gauge, free counters, paid USD balance, and next reply mode.
Use green below 80% consumed, yellow through 95%, and red above 95%.
Inherit the application font and theme from `src/styles.css`.
The NGO confirms the current brief before Discovery completes.
Available paid allocation carries forward after approval; unsettled reservations remain reserved.

## Sources and acceptance

- [Discovery requirement](../../../.taskmaster/docs/requirements/req-004.md).
- [Discovery acceptance criteria](../../../.taskmaster/docs/acceptance/at-req-004.md).
- [Discovery implementation breakdown](../../decomp/req-004.md).
- [Organization grants](../../../.taskmaster/docs/requirements/req-002.md).
- [Lifecycle confirmation](../../../.taskmaster/docs/requirements/req-005.5.md).
- [Money ledger](../../../.taskmaster/docs/requirements/req-006.md).
- [Usage attribution](../../../.taskmaster/docs/requirements/req-034.md).
- [Design change order](../../../design/change-orders/008-discovery-free-first.md).

The former cost-to-credit ratio, vetted 30-turn grant, and funded-only dollar routing are superseded.
Existing payment minimums, abuse blocks, publishing permissions, and build gateway accounting remain in force.

## Work ownership

| Item | Required amendment |
| --- | --- |
| AI4DEV-107 (beta grants) | Project enrollment and 10 daily / 50 beta counters; no vetting increase. |
| AI4DEV-108 (allowance remedies) | Paid continuation and applicable daily reset. |
| AI4DEV-109 (daily reset) | Preserve beta usage across the UTC reset. |
| AI4DEV-117 (beta enrollment) | Admit at most 20 NGOs and one sponsored project each. |
| AI4DEV-138 (free turn metering) | One completed reply, atomic reservation, failure release. |
| AI4DEV-139 (free-first paid routing) | Funding source separation, actual USD settlement, reconciliation. |
| AI4DEV-140 (exhausted allowance display) | Preserve drafts and show only applicable remedies. |
| AI4DEV-141 (Discovery question flow) | Dependency-first questions, answers, live brief, persistence. |
| AI4DEV-142 (free conversation limits) | Apply limits by turn mode, including funded free turns. |
| AI4DEV-144 (file consumption) | Charge file-bearing replies according to selected mode. |
| AI4DEV-156 (Discovery abuse controls) | Preserve admission and grant bounds. |
| AI4DEV-157 (Discovery usage display) | Current-gate gauge, counters, dollars, next mode, existing theme. |
| AI4DEV-158 (Discovery interface wiring) | Wire the agreed layout and review flow through edge functions. |

The related requirement covers own lifecycle confirmation, ledger integration, and attribution.
Implementation is pending. Documentation checks do not prove the runtime behavior.
