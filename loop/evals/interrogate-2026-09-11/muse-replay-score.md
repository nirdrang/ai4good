# The replay score: muse as a fifth interrogate reviewer on AI4DEV-56

Same prompt as the four real lanes, same diff, same commit `d62a2d1`, read-only, its own
worktree. Exit 0, model verified from the provider's own export. Eight minutes, $0.036.
Nine findings: one critical, five warning, three nits.

## Coverage of the fourteen act-on items

| # | Act-on item | astra | fable | grok | opus | muse |
|---|---|---|---|---|---|---|
| 1 | The transfer is one-shot per account (critical) | | yes | yes | yes | **yes** |
| 2 | Two races in the transfer definer (critical) | yes | | yes | | no |
| 3 | Membership inserts attributed to the operator | yes | yes | yes | yes | **yes** |
| 4 | AT-001.33 proves neither half | | yes | yes | yes | no |
| 5 | The SQL scan forgets grants on `create or replace` | yes | yes | | | no |
| 6 | The write-route scan reads one file for three spellings | yes | yes | | yes | **yes** |
| 7 | `attemptWrite` duplication, `WriteSubject` bag | yes | yes | yes | yes | no |
| 8 | Unreachable `standing.kind` branches | | yes | | yes | no |
| 9 | AT-001.29 never drives `complete-signup` | | yes | yes | yes | no |
| 10 | Restated writers raise without a kind in DETAIL | | | yes | | no |
| 11 | A non-exception PostgREST failure answered as 409 | | **only fable** | | | no |
| 12 | `set_escalation_contact` overwrites with no audit row | | | | **only opus** | no |
| 13 | The virtual-key clause is a tautology | | | | **only opus** | no |
| 14 | Accepted nits | | 4 of them | | 5 of them | **2 of them** |

| Lane | Act-on items | Items only this lane found |
|---|---|---|
| fable at medium | 9 plus 4 nits | 11 |
| opus at xhigh | 9 plus 5 nits | 12 and 13 |
| grok 4.6 at xhigh | 7 | 10 |
| astra at medium | 5 | none |
| **muse 1.3 at xhigh** | **4 plus 2 nits** | none of the fourteen |

On raw recall muse is last of five. It found the flagship critical, item 1, with a derivation
as complete as any lane's. It missed both items opus alone found, and it missed the item fable
alone found.

## What muse added that no lane raised

These are gains. I verified each against the tree at the reviewed commit.

| Finding | Verified | How |
|---|---|---|
| The SQL backstop of `set_escalation_contact` refuses only a blank email; the TypeScript decision refuses an email with no `@`. A service-role caller stores a contact the product refuses. | YES | The definer's only `invalid-contact` raise is the blank check. No `@` test in the function. |
| The SQL gate scan reads `assert_account_active(` as a substring, so the call satisfies it from dead code, and nothing requires it to be the first statement. | YES | `_policy-scan.ts:602`, a bare regex over the statement text. |
| The same scan exempts any function marked `stable` or `immutable`, and a volatility marking does not stop a function writing. | YES | `_policy-scan.ts:601` and `:642`, the exemption is one keyword. |
| The success renders answer `?? null` with no fallback, so a definer anomaly returns `ok: true` with null identifying fields. | YES | `complete-signup/index.ts:32-34`. |

Muse found a real defect in `set_escalation_contact`, which is the one function opus alone
flagged. Muse missed what opus found there and found something else opus missed.

## The seat answer

**Muse for the fable lane.** Defensible. Dropping fable and seating muse loses one act-on item,
number 11, the PostgREST status mapping. It gains four verified new defects. Fable's own
measured marginal value in this seat was already small, and the sheet says so.

**Muse for the opus lane.** No. Opus was the strongest lane on this item. It alone found two
act-on items, and one of them, the virtual-key tautology, is not a code defect at all. It is
the claim that an acceptance body proves nothing. Nothing in muse's output is that kind of
finding.

**Muse as a fifth lane.** The cheapest option of all. Three and a half cents and eight minutes
buys four verified new defects. The cost is the lead's reading time, not tokens.
