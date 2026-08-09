# AI4DEV-59 — Email verification, and the gate on unverified writing

Deliverable D2 leaf L1 of the authentication requirement (`loop/decomp/req-001.md`, revision
`0579425`): the email-verification flow for every email-capable account type, and the gate that
stops an email-unverified account writing Discovery messages.

**Acceptance ids this leaf owns:** AT-001.09, AT-001.10
(`.taskmaster/docs/acceptance/at-req-001.md`). It builds on the accounts leaf and the GitHub
leaf (pull requests #47 and #48), which landed signup, sign-in and the account types this flow
verifies.

**Status: built, reviewed twice, fixes applied.** The plan is at
`loop/items/AI4DEV-59/plan.md`. Two external review gates have run and both are ruled. The plan
gate raised four findings; the draft-code gate was a panel of two blind seats and raised twelve.
All sixteen are accepted — several fixed differently from the remedy the reviewer proposed — and
every disposition, with the finding quoted verbatim, is in the plan's rulings sections 7 and 8.
The fixes are applied and the live-stack proof is run. Still ahead of merge: the read-only audit,
and continuous integration green on the exact head. The merge ruling — what was built, every
review finding and its disposition, and exactly what the green does and does not claim, pinned to
the head it licenses — will be posted on this pull request before merge.

**The shape, in one paragraph.** "Verified" is Supabase Auth's own fact
(`email_confirmed_at`); this item ships no migration. The local auth config turns email
confirmations on — the change the suite's own header reserves for this leaf. The gate ships as
a shared decision module (`supabase/functions/_shared/verification.ts`) that the future
Discovery send route must call; no Discovery surface is built here, and no green from this item
may be read as "Discovery messaging is gated in production". The two acceptance tests go from
declared-pending stubs to real bodies at the loop tier (9 green / 28 declared red for the
requirement), and a live local-stack transcript carries the evidence the loop tier cannot
reach: the real confirmation email, the link flipping the account to verified, and sign-in
refused before confirmation.
