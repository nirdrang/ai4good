# Unit 5: abuse guardrails, the per-NGO kill switch, the two absence arms

You are the writer for unit 5 of the credits engine run. You work in this worktree on branch
`lane/ai4dev-132`, whose head is the unit 4 closure commit `2dca867`. You may edit, create and
run anything under it. Use PowerShell syntax if you shell out; you are on Windows. Never use
Bash syntax. The local stack is up and serves this worktree's functions. This unit adds a
route folder, so the deployed route answers 404 until the lead restarts the stack; your
integration runs will show that for the new route only. Do not stop or start the stack.

## Read first, in this order

1. `loop/items/AI4DEV-132/design/SYNTHESIS.md`: corrections 9 and 12, the "Kill switch" and
   "Absence arms" bullets, the "Per-unit plan and lanes" row for unit 5.
2. `loop/items/AI4DEV-132/design/candidate-4-reserve-settle.md`: "Unit 5, abuse guardrails"
   (the AT-004.42 body and the sentences after it), the `organizations` columns SQL, reserve
   order step 2, the `set_organization_discovery` paragraph, the `set-organization-discovery`
   route paragraph, the `_source-absences.ts` paragraph under "Suite", and the paragraphs
   "The kill switch" and "The two absence arms". Where SYNTHESIS is silent, the base holds.
   One correction to the base: the three switch columns did NOT land in unit 1; this unit
   adds them and replaces the reserve definer to read them.
3. `.taskmaster/docs/acceptance/at-req-004.md`, criteria 41 to 45.
4. `loop/items/AI4DEV-132/reports/unit1.md`, `unit2.md`, `unit4.md`, `unit4-fix.md`.
5. `supabase/migrations/20260908120000_account_lifecycle_audit_and_contact_transfer.sql`
   (`audit_event_kind`, `append_audit_event`), the migration defining
   `set_organization_vetting` (grep; the platform-admin template), `20260920120000_discovery_turns.sql`
   and `20260921120000_discovery_funded_routing.sql` (the reserve definer you replace again).
6. `supabase/functions/_shared/write-routes.ts`, `edge.ts`, `anthropic-messages.ts`,
   `discovery-metering.ts`, `supabase/functions/set-organization-vetting/index.ts` and its
   `_shared` decide module (the shape you copy for the switch).
7. `tests/at/suites/req-004/` in full; `tests/at/suites/req-002/_source-absences.ts`
   (`discoveryWalletProblems`, the scanning style you copy) and `_source-pins.ts`;
   `tests/at/suites/req-001/_write-route-scan.ts`, and every place req-001 enumerates
   `set-organization-vetting`: `_fixture.ts`, `_integration.ts`, `_live.ts` (the deactivated
   account probe of AT-001.29 walks every edge row of `WRITE_ROUTES`, so the new route needs
   the same treatment).
8. `tests/at/expected/req-004.json`; `.claude/skills/verify-ai4good/features/README.md`.

## What you build

1. **Migration one** `supabase/migrations/20260923120000_audit_event_kind_discovery_switch.sql`:
   `alter type public.audit_event_kind add value 'org_discovery_switched';` and nothing
   else. The value must be its own migration (constraint 28: an added enum value cannot be
   used in the transaction that adds it).
2. **Migration two** `supabase/migrations/20260923120100_organization_discovery_switch.sql`:
   - the three columns on `organizations` with the whole-or-nothing check, exactly the
     base's SQL;
   - `public.set_organization_discovery(p_account_id uuid, p_organization_id uuid,
     p_enabled boolean, p_reason text) returns jsonb`, SECURITY DEFINER, `search_path = ''`,
     from the platform-admin template of `set_organization_vetting`: the same admin check
     and refusals, `p_reason` trimmed non-empty else `22023 invalid-request`, organisation
     `for update`, idempotent (`changed: false`, no audit row when the state already
     matches), otherwise set the three columns (nulls when enabling) and `perform
     public.append_audit_event('org_discovery_switched', p_account_id, null,
     p_organization_id, p_reason, jsonb_build_object('enabled', p_enabled,
     'previously_disabled_at', v_previous))`. Return `{ organization_id, discovery_enabled,
     changed, disabled_at }`. Revoke and grant like its template;
   - `create or replace function public.discovery_turn_reserve(...)`, the unit 2 body plus
     step 2 of the base's order: read `discovery_disabled_at` from the organisation row
     under the share lock it already takes, and when not null raise
     `P0001 discovery-disabled` with a sentence that names the reason column's value and
     says a platform admin switched Discovery off for this organisation. This check runs
     before the email floor. Re-revoke and re-grant execute as unit 2 did;
   - `notify pgrst, 'reload schema'`.
3. **`_shared/discovery-switch.ts`** (pure): `decideOrganizationDiscovery`, its args type,
   `renderDiscoverySwitch`, in the shape of the vetting decide module. Request
   `{ organizationId, enabled: boolean, reason: string }` with `reason` trimmed non-empty.
4. **`write-routes.ts`**: the row `set-organization-discovery`, `{ surface: { kind: 'edge',
   rpc: 'set_organization_discovery' }, standing: { kind: 'account-required', admits:
   ['platform_admin'] } }`; `WRITE_REFUSAL_KINDS` gains `discovery-disabled`.
   **`supabase/functions/set-organization-discovery/index.ts`**: one `Deno.serve(writeRoute(...))`.
   **`config.toml`**: `[functions.set-organization-discovery] verify_jwt = true`.
5. **The model override for testing** (founder ruling 2026-09-17: verification runs on the
   Haiku model for the lowest price). In `anthropic-messages.ts` only: the model sent to the
   API is `Deno.env.get('DISCOVERY_MODEL') ?? DISCOVERY_CLIENT_MODEL`, read inside the call.
   The pin constant, the prices and the row's `request_settings.model` do not change;
   `served_model` records what answered. Add `DISCOVERY_MODEL=` with a two-line comment to
   `.env.example` beside `ANTHROPIC_API_KEY=` saying it is for local testing and unset in
   production. `childEnv` in `tests/at/harness/local-stack.ts` must not pass it; confirm.
6. **`tests/at/suites/req-004/_source-absences.ts`**: `noSupplementalGrantPathProblems()`,
   `noPlatformBreakerProblems()`, `freeCreditsOutsideMoneyProblems()` exactly as the base's
   paragraph with SYNTHESIS correction 12 applied to the grant scanner. Each throws when it
   cannot read the tree. Selftest `tests/at/harness/req004-absences.selftest.ts`: each arm
   is empty on the real tree, and each fires on a synthetic input that violates it (give the
   scanners a pure inner function over text, like `scanDiscoveryWallet`).
7. **req-001**: the new route joins the deactivated-account walk the way
   `set-organization-vetting` does, in `_fixture.ts`, `_integration.ts` and `_live.ts`, and
   the write-route scan passes. Say in the report which req-001 ids you touched and whether
   any tier result changed (none should).
8. **`_fixture.ts`**: `switches: Map<orgId, { disabledAt; disabledBy; reason }>`,
   `setDiscoverySwitch` through `writePipeline` with the new decide, `discoverySwitchAuditEvents`
   over the inner audit map, the reserve twin refusing `discovery-disabled` 409 before the
   email floor, `setEmailVerifiedAsOperator` flipping the actor's flag. **`_live.ts`**:
   `setDiscoverySwitch` posts to the deployed route, `discoverySwitchAuditEvents` reads
   `audit_events` as the operator, `setEmailVerifiedAsOperator` updates
   `auth.users.email_confirmed_at` as the operator.
9. **`e-guardrails.test.ts`**: real bodies for 41, 42, 43, 44, 45 per the base. AT-004.41:
   an unverified NGO, a need, a send refused 409 `email-unverified` with a reason matching
   `/verif/i` and `/email/i`, no turn row, no ledger delta, then `setEmailVerifiedAsOperator`
   and a send that succeeds at loop; at integration the second send goes through
   `reserveTurnAsOperator` (the keyless route answers 502 from the count), settled failed
   afterwards, and the id is green. AT-004.42 as the base's body, green at both tiers (at
   integration the blocked send is proven through `reserveTurnAsOperator` the same way, and
   the route is proven on the switch call itself). AT-004.43, .44: the arms are empty at both
   tiers. AT-004.45: `discoveryWalletProblems()` and `freeCreditsOutsideMoneyProblems()`
   empty, then at integration `throw new CapabilityPending([AWAITED.projectFuelCheckout])`.
10. **`tests/at/expected/req-004.json`**: loop 41 to 45 green; integration 41, 42, 43, 44
    green, 45 red on `["checkout.project-fuel"]`. Nothing else moves.
11. **`.claude/skills/verify-ai4good/features/set-organization-discovery.md`** and a README
    row; one refusal line in `discovery-message.md` for `discovery-disabled`.

## Must-nots

- The switch is per organisation. No platform-wide flag, no cron, no breaker of any name;
  your own absence arm must stay empty on your own diff.
- No notification on the switch (no taxonomy row fits; it is a "Not done here" line).
- No change to `discovery_turn_settle`, `discovery_allowance`, or the fuel routing.
- No message body in any audit event.
- No `Deno` outside `anthropic-messages.ts`, `edge.ts`, `notification-provider.ts` and
  route index files. No key in any file. No `10` or `30` in a test body. No narrating
  comments. Exactly fifty-eight `atTest(` call sites stay.
- Do not touch `loop/items/` except to write your report.

## Checks you run

From this worktree: `bun run typecheck`, `bun run at:check req-004`, `bun run at:check req-001`,
`bun run at:selftest`, `bun run at:verify req-004 --tier loop --expect`,
`bun run at:verify req-001 --tier loop --expect`, `bun run at:verify req-002 --tier loop --expect`.
Run them until green. The lead restarts the stack and runs the integration tier.

## Commit

One commit on `lane/ai4dev-132` when the seven checks are green. Message:

```
AI4DEV-132: unit 5, the per-NGO kill switch and the guardrail absence arms

<six to ten lines in plain sentences.>
```

No other item id anywhere in the message.

## Report

Write `loop/items/AI4DEV-132/reports/unit5.md`: what you built by file, every deviation with
its reason, the req-001 places you touched, the output of the seven checks (exit code and
last lines), the commit hash, and open questions. Reply with five lines: the commit hash, the
check results, deviations, blockers, the report path.
