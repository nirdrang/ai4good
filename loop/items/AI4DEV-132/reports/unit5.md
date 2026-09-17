# Unit 5 report

Commit: `2d88cae402c8a72c9fe2b6835699ff89523c6af2`

Branch: `lane/ai4dev-132`. One implementation commit was created. This report was written
after the commit so it can record the final hash; the report itself is uncommitted.

## Files built or changed

- `supabase/migrations/20260923120000_audit_event_kind_discovery_switch.sql`: adds the
  `org_discovery_switched` audit kind and nothing else.
- `supabase/migrations/20260923120100_organization_discovery_switch.sql`: the three
  organisation switch columns with the whole-or-nothing check;
  `set_organization_discovery` from the platform-admin template, idempotent, audited;
  `create or replace` of `discovery_turn_reserve` with the switch check before the email
  floor; execute revoked and granted again; schema reload.
- `supabase/functions/_shared/discovery-switch.ts`: `decideOrganizationDiscovery` and
  `renderDiscoverySwitch`. Request `{ organizationId, enabled, reason }` with a trimmed
  non-empty reason.
- `supabase/functions/set-organization-discovery/index.ts`: one `Deno.serve(writeRoute(...))`.
- `supabase/functions/_shared/write-routes.ts`: inventory row
  `set-organization-discovery`, `admits: ['platform_admin']`. Refusal kind
  `discovery-disabled`.
- `supabase/config.toml`: `[functions.set-organization-discovery] verify_jwt = true`.
- `supabase/functions/_shared/anthropic-messages.ts`: the model sent to the API is
  `Deno.env.get('DISCOVERY_MODEL') ?? DISCOVERY_CLIENT_MODEL`, read inside the call. The
  pin, the prices, and `request_settings.model` do not change. `served_model` still records
  what answered.
- `.env.example`: `DISCOVERY_MODEL=` with a two-line comment beside `ANTHROPIC_API_KEY=`.
  Inspected `tests/at/harness/local-stack.ts`: `childEnv` does not pass it; that file was
  not changed.
- `tests/at/suites/req-004/_source-absences.ts`: `noSupplementalGrantPathProblems`,
  `noPlatformBreakerProblems`, `freeCreditsOutsideMoneyProblems`. Each throws when it
  cannot read the tree. The grant scanner applies the correction that
  `apply_discovery_grant_mark` is called only with a vetted boolean.
- `tests/at/harness/req004-absences.selftest.ts`: each arm is empty on the real tree and
  fires on a synthetic violation.
- `tests/at/suites/req-004/_fixture.ts`: switch map, `setDiscoverySwitch` through
  `writePipeline`, switch audit rows, reserve twin refuses `discovery-disabled` before
  email, `setEmailVerifiedAsOperator` flips the actor flag.
- `tests/at/suites/req-004/_live.ts`: `setDiscoverySwitch` posts to the deployed route,
  `discoverySwitchAuditEvents` reads `audit_events` as the operator,
  `setEmailVerifiedAsOperator` updates `auth.users.email_confirmed_at`.
- `tests/at/suites/req-004/e-guardrails.test.ts`: real bodies for 41 to 45.
- `tests/at/expected/req-004.json`: loop 41 to 45 green; integration 41, 42, 43, 44 green;
  45 red on `["checkout.project-fuel"]`. Nothing else moved.
- `.claude/skills/verify-ai4good/features/set-organization-discovery.md` and a README row.
  One refusal line in `discovery-message.md` for `discovery-disabled`.

No change to settle, the allowance definer, or the fuel routing. Fifty-eight `atTest(`
call sites remain.

## Req-001 places touched

The new route joins the deactivated-account walk the way `set-organization-vetting` does:

- `tests/at/suites/req-001/_contract.ts`: the write-subject variant.
- `tests/at/suites/req-001/_fixture.ts`: the write-pipeline spec and the attempt.
- `tests/at/suites/req-001/_integration.ts`: the deactivated subject, the snapshot, and
  the active control.
- `tests/at/suites/req-001/_live.ts`: the deployed-route attempt.

The ids that walk every write are AT-001.29 (deactivated write gate) and, through the
same helper, AT-001.30. Loop AT-001.29 stayed green. The req-001 expected file was not
changed. No tier result changed.

## Deviations

1. The switch columns land in this unit, not in the first unit of this run. The brief
   named that correction.
2. When the Discovery actor is verified and the inner auth user is not, the loop reserve
   twin writes today's spend row as the operator instead of calling `debitAllowance`.
   `debitAllowance` still reads the inner confirmation. The operator method on this suite
   flips only the Discovery actor. The live adapter updates `auth.users`, so this path is
   loop-only.
3. The live adapter signs a provisioned platform administrator in a second time and keeps
   that bearer. The intake adapter's bearer map does not hold administrator tokens, and
   the switch call must post to the deployed route.
4. Criteria 43, 44 and 45 call `open()` so the harness records a world. The scanners do
   not use the world.
5. The grant-call scanner matches `perform` and `select` only. A revoke or grant
   signature that names the function is not a call.

## Checks

`bun run typecheck`: exit 0.

```text
=== typecheck: app (tsconfig.json) ===
=== typecheck: acceptance tests (tests/at/tsconfig.json) ===
=== typecheck: verify drive (.claude/skills/verify-ai4good/scripts/tsconfig.json) ===
typecheck OK: all three projects clean
```

`bun run at:check req-004`: exit 0.

```text
at:check req-004 — 58 P0 in the acceptance file, 58 registered in the suite
RESULT: 58 P0 ids in bijection
```

`bun run at:check req-001`: exit 0.

```text
at:check req-001 — 38 P0 in the acceptance file, 38 registered in the suite
RESULT: 38 P0 ids in bijection
```

`bun run at:selftest`: exit 0.

```text
 Test Files  33 passed (33)
      Tests  443 passed (443)
```

`bun run at:verify req-004 --tier loop --expect`: exit 0.

```text
  58 P0: 19 green, 39 red, 0 missing
  EXPECTED: the run matches ...\tests\at\expected\req-004.json exactly (19 declared green, 39 declared red)
```

`bun run at:verify req-001 --tier loop --expect`: exit 0.

```text
  38 P0: 33 green, 5 red, 0 missing
  EXPECTED: the run matches ...\tests\at\expected\req-001.json exactly (33 declared green, 5 declared red)
```

`bun run at:verify req-002 --tier loop --expect`: exit 0.

```text
  27 P0: 20 green, 7 red, 0 missing
  EXPECTED: the run matches ...\tests\at\expected\req-002.json exactly (20 declared green, 7 declared red)
```

No integration-tier verify. The new route answers 404 until the lead restarts the stack.
The lead runs the integration tier after that restart.

## Blockers and open questions

None for this unit's loop checks.

The new function folder is not in the running bundle until the stack restarts. Integration
proof of the switch call and of the reserve refusal on the real definer belongs to the
lead. Criteria 41 and 42 at integration drive the blocked send through
`reserveTurnAsOperator` because a keyless send answers 502 from token counting.

`DISCOVERY_MODEL` is for local testing and must stay unset in production.
