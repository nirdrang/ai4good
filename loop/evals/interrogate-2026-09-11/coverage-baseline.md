# Interrogate seat coverage, AI4DEV-56, from the lead's own verdict

Source: `loop/items/AI4DEV-56/artifacts/interrogate/verdict.md`. The verdict names, per act-on
item, which lane raised it. That makes marginal value measurable without an opinion.

The four lanes that ran: astra at medium, fable at medium, grok 4.6 at xhigh, opus at xhigh.
Muse ran later on the identical prompt, the identical diff, and the identical commit.

## Act-on items and who found each

| # | Act-on item | astra | fable | grok | opus |
|---|---|---|---|---|---|
| 1 | The transfer is one-shot per account (critical) | | 1 | 1 | 1 |
| 2 | Two races in the transfer definer (critical) | 1, 2 | | 2 | |
| 3 | Membership inserts attributed to the operator | 5 | 4 | 3 | yes |
| 4 | AT-001.33 proves neither the UPDATE half nor append-only | | 2 | 5 | 2 |
| 5 | The SQL scan forgets grants on `create or replace` | 4 | 3 | | |
| 6 | The write-route scan reads one file for three spellings | 3 | 5 | | 6 |
| 7 | `attemptWrite` duplication, `WriteSubject` nine-field bag | 6 | 7 | 7 | 9 |
| 8 | Unreachable `standing.kind !== 'account'` branches | | 9 | | 7 |
| 9 | AT-001.29 never drives `complete-signup` | | 13 | 4 | 8 |
| 10 | Restated writers raise without a kind in DETAIL | | | 6 | |
| 11 | A non-exception PostgREST failure answered as 409 | | 6 | | |
| 12 | `set_escalation_contact` overwrites with no audit row | | | | 5 |
| 13 | The virtual-key clause is discharged by a tautology | | | | 3 |
| 14 | Accepted nits | | 8, 10, 11, 12 | | 4, 11, 12, 13a, 13b |

## Score

| Lane | Act-on items covered | Items only this lane found |
|---|---|---|
| astra at medium | 5 | none |
| fable at medium | 9 plus 4 nits | 11 |
| grok 4.6 at xhigh | 7 | 10 |
| opus at xhigh | 9 plus 5 nits | 12 and 13 |

## What the seat questions are

**Can muse take the fable lane?** Muse must cover item 11, the one item fable alone found, and
enough of items 1, 3, 4, 5, 6, 7, 8, 9 that nothing else drops out.

**Can muse take the opus lane?** Muse must cover items 12 and 13, the two items opus alone
found. Item 13 is the harder one. It is not a code defect. It is the claim that an acceptance
body discharges a requirement by a tautology over a module nothing calls.

A finding muse raises that no lane raised, and that is real, counts as a gain.
A finding muse raises that is not real counts as a cost, because the lead must rule on it.
