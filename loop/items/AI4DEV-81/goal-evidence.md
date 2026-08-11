# Goal-step evidence — AI4DEV-81 (per-item integration verification)

Plan step 9. Both tiers, both declaration manifests, exact-match, on this machine on 2026-08-11.

**Head the runs graded: `41bcadc`** — the last commit that changes code. This file is the only thing
added after it, so nothing the runs graded has moved.

Reserved database slot: **slot 1**, reserved under this item. The two integration runs were serial;
nothing else held the slot.

---

## The four exact-match results

| command | exit | result |
|---|---|---|
| `bun run at:verify req-001 --tier loop --expect` | 0 | 37 P0: 13 green, 24 red, 0 missing — matches exactly |
| `bun run at:verify req-016 --tier loop --expect` | 0 | 12 P0: 11 green, 1 red, 0 missing — matches exactly |
| `bun run at:verify req-001 --tier integration --expect` | 0 | 37 P0: 8 green, 29 red, 0 missing — matches exactly |
| `bun run at:verify req-016 --tier integration --expect` | 0 | 12 P0: 0 green, 12 red, 0 missing — matches exactly |

**No declaration was amended.** Every deviation the earlier runs reported was traced to code and
fixed there; the manifests are the ones authored before the first integration run.

---

## Loop tier — unchanged, as the plan requires

```
at:verify req-001 --tier loop
  37 P0: 13 green, 24 red, 0 missing
  EXPECTED: the run matches tests\at\expected\req-001.json exactly (13 declared green, 24 declared red)

at:verify req-016 --tier loop
  12 P0: 11 green, 1 red, 0 missing
  EXPECTED: the run matches tests\at\expected\req-016.json exactly (11 declared green, 1 declared red)
```

The loop-tier ledger is byte-identical to before this branch: `git diff 466880d...HEAD` over both
expected manifests shows insertions only, and the loop declarations and loop bodies are unchanged.

---

## Integration tier — req-001, with the slot evidence line

The run's own evidence line, verbatim, and the identity reads that precede it:

```
db-pool — slot 1 identity proven before the prepare: project ai4good-slot-1, api 55321, db 55322, containers supabase_imgproxy_ai4good-slot-1, supabase_pooler_ai4good-slot-1
db-pool — slot 1 identity proven before the reset: project ai4good-slot-1, api 55321, db 55322, containers supabase_imgproxy_ai4good-slot-1, supabase_pooler_ai4good-slot-1
db-pool — docker confirms slot 1's own database container before the reset: supabase_db_ai4good-slot-1
at:verify — 2 migrations expected, 2 applied — the rebuilt schema matches supabase/migrations exactly
at:verify — db slot 1 (ai4good-slot-1, api 55321) — reset OK — migrations: 2 expected, 2 applied
```

Per id, as the run reported them:

```
at:verify req-001 --tier integration
  AT-001.01    green    NGO email/password signup creates the account, org, admin membership and acknowledgment; sign-in returns
  AT-001.02    red      CapabilityPending: CAPABILITY PENDING — sut.accounts.registerWithGithub
  AT-001.03    red      CapabilityPending: CAPABILITY PENDING — sut.accounts.registerWithProvider
  AT-001.04    red      CapabilityPending: CAPABILITY PENDING — sut.accounts.registerWithProvider
  AT-001.05    red      CapabilityPending: CAPABILITY PENDING — vendors.github-public-statistics
  AT-001.06    green    a volunteer is refused the NGO-only action while an NGO account performs it successfully
  AT-001.07    green    a provisioned platform admin authenticates and carries the type; public signup offers only the two
  AT-001.09    green    a fresh email/password signup of either account type is unverified until the link is used
  AT-001.10    red      CapabilityPending: CAPABILITY PENDING — sut.accounts.sendDiscoveryMessage
  AT-001.38    green    sign-in with the correct email and a wrong password is rejected and creates no session
  AT-001.12    green    an expired or revoked session ends access — the next request re-authenticates
  AT-001.13    green    a session in continuous use refreshes without a forced mid-work re-login
  AT-001.14    green    after the emailed reset flow the new password works and the old one does not
  … the 24 unbuilt ids: AtPending [sut-missing], as declared
  37 P0: 8 green, 29 red, 0 missing
  EXPECTED: the run matches tests\at\expected\req-001.json exactly (8 declared green, 29 declared red)
```

---

## Integration tier — req-016

```
at:verify — db slot 1 (ai4good-slot-1, api 55321) — reset OK — migrations: 2 expected, 2 applied

at:verify req-016 --tier integration
  AT-016.01 … AT-016.12   red   CapabilityPending: CAPABILITY PENDING — fixtures.worlds, sut.notifications
  12 P0: 0 green, 12 red, 0 missing
  EXPECTED: the run matches tests\at\expected\req-016.json exactly (0 declared green, 12 declared red)
```

Every one of the twelve is red in the declared `capability-pending` shape, naming the two stand-ins
the suite still leans on. Five of them reach the refusal through a shared evidence capture, and the
refusal now travels through that capture unchanged — see the commit that made it declarable.

---

## The other checks at the same head

| check | result |
|---|---|
| `bun run typecheck` | `typecheck OK: both configs clean` |
| `bun run build` | `✓ built in 197ms` |
| `bun run at:selftest` | `Test Files 13 passed (13) · Tests 344 passed (344)` |
| `loop/work/twin-check.ps1` | `twin-check: SYNCED - 251 body lines identical apart from the declared differences` |

The selftest count was **327** before this sitting and is **344** after it: seventeen new tests, and
every one of the 327 still passes.

---

## What the integration green does and does not say

It says: against a database this run rebuilt from `supabase/migrations`, with the deployed edge
functions served by the slot's own edge-runtime container, eight of REQ-001's thirty-seven P0 ids
proved their full criteria — signup, the NGO-only refusal, the provisioned administrator, email
verification for both account types, the wrong-password refusal, session expiry and revocation,
automatic client refresh, and the emailed password reset.

It does not say REQ-001 works. Twenty-nine ids are red, each in a shape the manifest declares: two
provider handshakes nobody in this environment can perform, the GitHub statistics import that a
shipped stub answers, the Discovery route that exists in no requirement yet, and twenty-four
surfaces that have not landed.
