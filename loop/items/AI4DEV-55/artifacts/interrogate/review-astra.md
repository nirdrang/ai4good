## Findings

### 1. [warning] The static catalog guard checks historical statements, not the resulting security posture
**Location**: `tests/at/suites/req-001/_policy-scan.ts:195`, `scanTenantMigrations`

**Finding**: Later security changes can invalidate the tenant boundary while the CI guard remains green.

**Evidence**: Appending each of these statements independently to the migration input returned `[]`:
```sql
alter table public.projects disable row level security;
alter policy projects_select_org_member on public.projects using (true);
grant truncate on public.projects to authenticated;
grant execute on function public.viewer_is_org_member(uuid) to public;
```
The scanner records enables and policy creations but ignores their subsequent alteration. Function permission flags only accumulate, and isolated tables are checked for SELECT without rejecting additional privileges. The live check catches some policy changes, but checks neither TRUNCATE nor function execution privileges.

**Suggestion**: Track the resulting state for supported security statements and reject unsupported security mutations explicitly. Extend the live check to verify the stated privilege posture. Accepting a text-based guard does not justify silently accepting statements that undo what it checks.

### 2. [warning] The live adapter crosses 1,000 lines by absorbing another subsystem
**Location**: `tests/at/suites/req-001/_live.ts`, `createLiveAdapter`

**Finding**: This change grows the file from 839 to 1,078 lines, embedding tenant reads, response decoding, token refresh, public-page handling, and catalog inspection inside an already large authentication adapter.

**Evidence**: The new tenant methods form a cohesive subsystem, yet are added directly to the large `accounts` object. Three surface methods repeat JSON parsing and success classification. Catalog inspection introduces another unrelated responsibility into the same factory. Future read changes now require navigating authentication and operator provisioning machinery.

**Suggestion**: Extract the tenant-read adapter and its response decoders into a focused module. Supply the stack and token resolver, then compose its methods into `accounts`. This preserves the existing contract while removing the new subsystem from the oversized factory.

### 3. [critical] The kernel workaround also silently bypasses command permissions
**Location**: `loop/work/grok-shim/grok:37`, `loop/work/grok-shim/grok:47`

**Finding**: The wrapper broadens execution authority independently of whether Landlock is unavailable.

**Evidence**: Every `--permission-mode acceptEdits` argument becomes `--permission-mode bypassPermissions`, and every invocation exports `GROK_SANDBOX_AUTO_ALLOW_BASH=1`. Neither operation is conditional on the kernel probe. A caller requesting automatic edit approval therefore receives unrestricted permission handling, including on a host where the requested sandbox works.

**Suggestion**: Preserve the caller’s permission mode and command approval settings. Keep the kernel compatibility adjustment separate from any explicitly requested permission bypass.

### 4. [warning] The public-field leak assertions inspect a sanitized harness projection
**Location**: `tests/at/suites/req-001/_live.ts`, `publicProjectPage`; `_integration.ts`, `at00122`

**Finding**: The integration test cannot detect extra private fields returned by the deployed public endpoint.

**Evidence**: `publicProjectPage` reconstructs `page` using only `projectId`, `projectName`, and `organizationName`. `at00122` then checks that `organizationId` and `assignedVolunteerId` are absent from that reconstructed object. If the endpoint returned either private field, the adapter would discard it before the assertion. Comparing authenticated and anonymous response bytes would also pass if both leaked the same fields.

**Suggestion**: Assert the exact keys and forbidden-field absence on `JSON.parse(asVisitor.answer.body)`, before any harness projection. The acceptance test must inspect what crossed the public boundary.

### 5. [warning] The assigned-volunteer read conjunct has no regression test
**Location**: `tests/at/suites/req-001/_integration.ts`, `at00123`

**Finding**: The test exercises the write trigger but never establishes that assignment stops granting access after the account ceases to be a volunteer.

**Evidence**: The body successfully seats a volunteer and rejects seating an NGO account. It never changes the seated volunteer’s account type. Removing `and public.viewer_is_volunteer()` from the SQL policy would therefore leave these assertions green: assignment equality admits the volunteer, while the separate trigger still rejects the NGO write. The static scanner does not require this conjunct either.

**Suggestion**: After the successful assigned-project read, change that account to a non-volunteer type through the operator connection without changing the assignment. Assert that both its caller-bound project read and workspace request are denied. This tests the distinct read-time protection the design explicitly retains.