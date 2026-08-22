Tenant isolation and visibility - the first row-level-security policy set in this repository.

Every table today has row-level security enabled with zero policies, which denies everybody. That
is the safe default, not the requirement. The requirement is that the right tenant reads and the
wrong one does not, so this branch both grants and denies.

**What it lands**

- one shipped decision module, `supabase/functions/_shared/visibility.ts`, holding the tenant-read
  rule, what a project shows the world, and the single refusal answer;
- a migration carrying the policy set, its helper predicates and its grants;
- three read surfaces - an organisation dashboard, a project workspace, and a public project page
  that answers an anonymous caller;
- test bodies at both tiers for the acceptance ids this branch verifies.

**The no-existence-oracle clause is structural.** One exported constant is the answer every
non-public surface returns both for a row that does not exist and for a row that is not yours.
There is nowhere in the surface to put a second refusal, so the two answers cannot drift apart by
an edit that looks harmless. The tests compare the two responses rather than assert that both
refused.

**This branch carries a batch of two leaves** - the denial half and the grant half of the same
deliverable, the second blocked by the first. The partner item is named in words throughout; it is
named by id exactly once, in the merge ruling's single sanctioned closes-line, which is added at
merge and is not in this body yet.

**Work in progress.** The plan is under review. Code has not been written.

Record: `loop/items/AI4DEV-66/`.
