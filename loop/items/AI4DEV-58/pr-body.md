# AI4DEV-58 — GitHub sign-in, and the mandatory GitHub link for volunteers

Deliverable D1 leaf L2 of the authentication requirement (`loop/decomp/req-001.md`, revision
`0579425`): GitHub OAuth signup for volunteers, the mandatory GitHub link without which a
volunteer signup cannot complete, and the volunteer-onboarding profile import fired by the link —
asserted as observable firing against a **stub** import source, per the manifest's cross-contract
with the volunteer-profile requirement (real import arrives with that requirement, in a later
wave).

**Acceptance ids this leaf owns:** AT-001.02, AT-001.04, AT-001.05
(`.taskmaster/docs/acceptance/at-req-001.md`). It builds directly on the leaf that landed email
and Google signup and the three account types (merged as pull request #47).

**Status: built, verified, audited — awaiting the merge ruling.** All plan steps are at their
done-criteria. The verify suite is green: all six checks exit 0
(`loop/items/AI4DEV-58/verify-final.txt`), the authentication requirement's suite at exactly 7
green with the other 30 P0 ids declared red as pending, and the harness's own suite unchanged
from its baseline. The live local proof (`loop/items/AI4DEV-58/proof-local.txt`) ran 9 checks:
8 passed, 0 failed, 1 skipped — the skip is the GitHub authorize redirect, because no GitHub
OAuth app exists for this project yet; that is the expected case, stated rather than dressed up.

**Review record.** The plan critique returned five findings and the draft-code critique eight;
every one is ruled on in writing (`loop/items/AI4DEV-58/gate1-rulings.md`, `gate2-rulings.md`),
and five executor-reported deviations are ruled in the gate-2 addendum.

**The draft-code review gate is designed for two readers of different model families and ran
with ONE.** The second reader was stopped by founder ruling (2026-08-08, after it exhausted its
billing-cycle quota mid-gate). The cost is known, not assumed: on a previous item one reader
found a blocker on code where the other reported nothing — the panel has demonstrably caught
what a single reader missed — so the single-reader run is a deliberately weaker gate, recorded
here so the record states what the gate did and did not cover.

**A read-only audit** of the whole record returned three findings. Two were adopted and are
fixed on this head: a source comment cited the predecessor item's runnable proof script instead
of its transcript and understated what that superseded evidence no longer covers (corrected,
comment text only), and this description itself still presented the branch as deliberately
un-verified after verification had run (this rewrite). One finding was rejected, and per the
way of work the rejected claim stands here verbatim:

> "a credential is committed — The transcript embeds
> `postgresql://postgres:postgres@127.0.0.1...`. The changed tree contains a database
> username/password despite the no-credential requirement."
> (severity high, against `loop/items/AI4DEV-58/stack-up.txt` line 26)

The ruling (`loop/items/AI4DEV-58/audit-rulings.md`): the flagged string is the Supabase CLI's
fixed local-development database URL — printed identically for every developer on every machine
by `supabase start`, publicly documented, and reachable only on the loopback interface of
whoever runs their own local stack. GitHub push protection, which refused this transcript's
first capture over a real secret key, passes this string; the identical string is already on
main through pull request #47. It is a public constant, not a credential, and nothing was
redacted because nothing secret is present. Every actual key-shaped value in that transcript —
publishable key, secret key, JWT signing secret, both demo JWTs, both S3 credentials — is
redacted. A database URL with any non-default password or any routable host would be a
credential and would be redacted; this one is neither.

**What the green does and does not claim.** Claims: the three acceptance tests exist, execute,
open worlds and assert; the shipped decision modules (`accounts.ts`, `github.ts`) — byte for
byte the code the edge functions import — behave as the three criteria require; the volunteer
gate fails closed. Does not claim: that the migration is correct, that the edge functions work,
that Auth is configured, or that any OAuth handshake or real GitHub import works — that half's
only evidence is the live-stack transcript above, one machine's word, not reproducible by a
reviewer. The GitHub and Google handshakes are proved by nothing: no OAuth app or credential
exists for either, so "sign-in works" end to end is not claimed at any tier. The profile import
is asserted against a stub import source by design until the volunteer-profile requirement
lands the real one — no green here may be reported as "profile import from GitHub works." Also
not claimed (a draft-review ruling with the risk accepted in writing): that the database
authenticates the PROVENANCE of imported statistics — it enforces their shape and the identity
binding, and a caller holding the service-role key, the deployment's own authority, can commit
any shape-valid statistics for a correctly linked handle.

The merge ruling — what was built, every review finding and its disposition, and exactly what
the green does and does not claim, pinned to the exact head it licenses — will be posted on
this pull request before merge.
