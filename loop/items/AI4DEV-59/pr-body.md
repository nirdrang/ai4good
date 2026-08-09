# AI4DEV-59 — Email verification, and the gate on unverified writing

Deliverable D2 leaf L1 of the authentication requirement (`loop/decomp/req-001.md`, revision
`0579425`): the email-verification flow for every email-capable account type, and the gate that
stops an email-unverified account writing Discovery messages.

**Acceptance ids this leaf owns:** AT-001.09, AT-001.10
(`.taskmaster/docs/acceptance/at-req-001.md`). It builds on the accounts leaf and the GitHub
leaf (pull requests #47 and #48), which landed signup, sign-in and the account types this flow
verifies.

**Status: plan phase.** The plan is at `loop/items/AI4DEV-59/plan.md` and is under external
review. The code comes after the plan review's findings are ruled on. This body will be brought
up to date as the item moves; the merge ruling — what was built, every review finding and its
disposition, and exactly what the green does and does not claim, pinned to the exact head it
licenses — will be posted on this pull request before merge.

**Planned shape, in one paragraph.** "Verified" is Supabase Auth's own fact
(`email_confirmed_at`); this item ships no migration. The local auth config turns email
confirmations on — the change the suite's own header reserves for this leaf. The gate ships as
a shared decision module (`supabase/functions/_shared/verification.ts`) that the future
Discovery send route must call; no Discovery surface is built here, and no green from this item
may be read as "Discovery messaging is gated in production". The two acceptance tests go from
declared-pending stubs to real bodies at the loop tier (9 green / 28 declared red for the
requirement), and a live local-stack transcript carries the evidence the loop tier cannot
reach: the real confirmation email, the link flipping the account to verified, and sign-in
refused before confirmation.
