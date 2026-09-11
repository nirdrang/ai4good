# The multi-model review of this item, 2026-09-11

Four models read the whole diff of this branch against `main`, at commit `426f2c1`, each with the
same prompt and neither seeing the others. A fifth model audited the comments. The founder then ruled
that the run acts on everything the reviewers raised.

## What each lane got

`reviewer-prompt.md` is the exact prompt, identical for all four. It carries the stated intent, the
pinned commit range, the review rubric and the code-quality lens, and neutral orientation about where
product code and tests live.

It deliberately does not say where to look. The founder refused an earlier draft that named the
places the lead most wanted attacked, on the ground that it would bias four independent readers
toward what the lead already suspected.

## The lanes

| report | model | route | findings |
|---|---|---|---|
| `reviewer-opus-xhigh.md` | Opus at xhigh | native Claude lane | 1 critical, 13 warnings, 4 nits |
| `reviewer-muse-spark-1.3-xhigh.md` | muse-spark 1.3 at xhigh | opencode, direct CLI | 15 warnings and nits |
| `reviewer-grok-4.6-xhigh.md` | Grok 4.6 at xhigh | grok CLI | 8 warnings |
| `reviewer-gpt-6-astra-medium.md` | GPT-6 Astra at medium | codex | 1 critical, 3 warnings |
| `comment-audit.md` | the mechanical model | native Claude lane | 7 false comments, 28 others |

The Astra receipt completed but could not verify which model served it. The other three verified the
served model from the provider's own report.

## What the lead did with them

The lead checked each finding against the code rather than taking it on trust, and reported to the
founder in four buckets: act on, consider, noted, dismissed. The founder chose to act on everything.

The fix units and what each closed are in `decisions.tsv` and in the `reports/fix*.md` files beside
this folder. One finding was deliberately left out: a request identity, so a retried vet or debit
cannot double-charge or double-notify. It needs a stored key and a replay rule, which is a product
decision no acceptance criterion asks for, and it goes to the founder as its own proposal.

## The agreement map

Three models independently found the refusal at the credit ceiling wrong. Three independently found
the email floor on spending duplicated and untested. Three independently said the source-arm file
was too large and its naming sweeps too broad. Two independently found the notification channel list
trusted from the caller, and two the duplicated vetting function body.

Agreement across families is the signal this station exists for. Every finding that two or more lanes
reached alone turned out to be real.
