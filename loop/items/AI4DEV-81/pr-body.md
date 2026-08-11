## What this pull request builds

Two work streams share this branch as a declared batch.

**Per-item integration verification.** The goal step of every item produces two exact-match
results: the loop tier (stubs — unchanged, and still the whole of CI's required check) and the
integration tier against the item's reserved database slot — wiped, rebuilt, identity-proven,
and graded per acceptance id with the same exact-match strictness. The first concrete scope
migrates the live-proof checks of three finished auth items — the GitHub sign-in checks, the
email verification checks, and the sessions checks (expiry at the boundary instant, logout scope
with a sibling-session control, atomicity leaving zero rows) — into integration-mode test
bodies. The one-off live-proof script is demoted to its one honest use: measuring vendor
behaviour when a plan needs a fact before deciding.

**The CI job timeout that counted queue time.** The verify job's `timeout-minutes` was raised
from 15 to 30 by the change that routed CI to a self-hosted runner behind a repository variable;
that raise is the batch partner's remedy, verified on this branch to sit inside the 30–45 minute
range the partner item asked for, with the runaway bound kept and without picking either of the
two undistinguished failure stories. No further code change was needed for it; this pull request
closes the partner deliberately with the line below.

Closes AI4DEV-45

## Record

Plan, rulings, gate prompts and phase state: `loop/items/AI4DEV-81/`.
