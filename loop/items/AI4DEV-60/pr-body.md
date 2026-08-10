# AI4DEV-60 — Sessions: expiry and revocation, refresh, and password reset

Deliverable D2 leaf L2 of the authentication requirement (`loop/decomp/req-001.md`, revision
`0579425`): session expiry and revocation, automatic session refresh, password reset, and
rejection of a wrong password.

**Acceptance ids this leaf owns:** AT-001.12, AT-001.13, AT-001.14, AT-001.38
(`.taskmaster/docs/acceptance/at-req-001.md`). It builds on the accounts leaf, the GitHub leaf
and the verification leaf (pull requests #47, #48 and #49), which landed signup, sign-in,
account types and the email-verification flow this leaf's sessions sit on.

**Status: built, reviewed, audited — waiting on CI, then the merge.** The implementation is in
the tree. Three external gates ran and every finding was ruled: the plan gate, the two-reader
draft-code gate, and a two-seat audit of the record against the tree — nineteen adopted rulings
across the first three, six audit findings, all accepted as record repairs (stale comments and
status lines; no behaviour change). The verify surface at the final head: req-001 at 13 green /
24 declared red (exact declaration match), req-016 unchanged at 11 green / 1 red, typecheck
clean, the harness selftest at 264 tests in 11 files, and the live local-stack proof at 7
checks / 7 passed. The rulings and evidence live in `loop/items/AI4DEV-60/`.

**The shape, in one paragraph.** Sessions are Supabase Auth's own machinery; this item ships no
migration and no session table. The one shipped code change extracts the caller judgment from
the edge plumbing into a pure module (`callerFromAuthAnswer` — fail closed on any non-2xx auth
answer), so the judgment every deployed function runs on every authenticated request is
type-checked and sits on the tested path. The fixture gains a clock-driven session mirror
(issuance, expiry, revocation, refresh) and password-reset mirrors, each named in the fixture's
mirror section with the live-proof check that binds it. The four acceptance tests go from
declared-pending stubs to real bodies at the loop tier (13 green / 24 declared red for the
requirement), and a live local-stack transcript carries the evidence the loop tier cannot
reach: a revoked token refused by the real GoTrue and by a deployed function, an expired token
refused and then refreshed without credentials, and the emailed reset flow end to end. Two
retired acceptance ids (verification-link and reset-link lifetime semantics) stay deliberately
unasserted.
