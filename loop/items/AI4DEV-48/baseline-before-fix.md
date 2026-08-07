# AI4DEV-48 — baseline evidence, captured at the pre-fix head

Captured at commit `219cae2307b3cecb70a61aec22972f4da354cbc2`, on 2026-08-07 (the date the environment
reported at capture time), by a mechanical acting under the orchestrator's instruction, BEFORE any
production code was changed.

## Step 1 — `git rev-parse HEAD`

Command:
```
git rev-parse HEAD
```

Exit code: 0

Output:
```
219cae2307b3cecb70a61aec22972f4da354cbc2
```

## Step 2 — `bun run at:verify req-016 --tier loop --expect`

Command:
```
bun run at:verify req-016 --tier loop --expect
```

Exit code: 0

Output (verbatim; the `bun :` / `NativeCommandError` lines are PowerShell's stderr wrapping of the
native `bun` process and are not evidence of failure — the process's own exit code was 0):
```
$ bun tests/at/harness/runner.ts "req-016" --tier loop --expect
At line:1 char:393
+ ... bc6814000"; bun run at:verify req-016 --tier loop --expect 2>&1 | Tee ...
+                 ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    + CategoryInfo          : NotSpecified: ($ bun tests/at/...r loop --expect:String) [], RemoteException
    + FullyQualifiedErrorId : NativeCommandError

JSON report written to C:/Users/nirdr/AppData/Local/Temp/at-verify-MYi0ow/vitest-report.json

at:verify req-016 --tier loop
  AT-016.01    red      CapabilityPending: CAPABILITY PENDING — H3 static provider scan
  AT-016.02    green    registered events equal the taxonomy exactly, are immutable, and carry no CR/scope-change event
  AT-016.03    green    every taxonomy row delivers to exactly its recipients on exactly its channels, with the named payloads
  AT-016.04    green    sensitive negatives: no candidacy to the NGO, no vetting outcome to the volunteer, no donation event
  AT-016.05    green    every critical class goes out by email; the low-tone event is in-app only
  AT-016.06    green    a documented delivery default exists for every taxonomy row
  AT-016.07    green    one logical event per committed event, one delivery per recipient-channel pair, across a restart
  AT-016.08    green    a comment burst delivers the count the pinned anti-spam configuration prescribes, on two different configurations
  AT-016.09    green    every guarded transition writes its notification event atomically under an induced fault
  AT-016.10    green    recipients resolve at event creation: the old holder receives, the new holder is excluded
  AT-016.11    green    sent only on provider acceptance; unconfirmed sends retry; a lost ack mints no duplicate
  AT-016.12    green    an escalation-tier event notifies both the NGO and the platform admin
  12 P0: 11 green, 1 red, 0 missing
  EXPECTED: the run matches C:\Users\nirdr\Downloads\ai4good\.claude\worktrees\agent-a3e39ea1bc6814000\tests\at\expected\req-016.json exactly (11 declared green, 1 declared red)
```

Per-id tally, verbatim: **`12 P0: 11 green, 1 red, 0 missing`**

## Step 3 — `bun run at:selftest`

Command:
```
bun run at:selftest
```

Exit code: 0

Output:
```
$ bunx vitest run --root tests/at --config vitest.config.ts harness/
At line:1 char:393
+ ... bc6814000"; bun run at:selftest *> "$env:TEMP\at-selftest-out.txt"; W ...
+                 ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    + CategoryInfo          : NotSpecified: ($ bunx vitest r...fig.ts harness/:String) [], RemoteException
    + FullyQualifiedErrorId : NativeCommandError


 RUN  v4.1.10 C:/Users/nirdr/Downloads/ai4good/.claude/worktrees/agent-a3e39ea1bc6814000/tests/at

 Test Files  9 passed (9)
      Tests  243 passed (243)
   Start at  12:11:31
   Duration  7.09s (transform 807ms, setup 0ms, import 5.41s, tests 13.76s, environment 1ms)
```

Summary line, verbatim: **`Test Files  9 passed (9)` / `Tests  243 passed (243)`**

## Step 4 — the exploit demonstration

Script written to the scratchpad (not into the repo) at:
`C:\Users\nirdr\AppData\Local\Temp\claude\C--Users-nirdr-Downloads-ai4good\e84c7677-8196-47fe-83da-14e2935f9ed0\scratchpad\exploit-probe.ts`

```ts
import { realCapability, stubbedCapabilityNames } from 'C:/Users/nirdr/Downloads/ai4good/.claude/worktrees/agent-a3e39ea1bc6814000/tests/at/harness/capabilities.ts';
const relabelled = [
  realCapability('clock.controlled', {}),
  realCapability('fixtures.worlds', {}),
  realCapability('vendors.email', {}),
  realCapability('sut.notifications', {}),
  realCapability('oracles.judge', {}),
];
console.log('stubbedCapabilityNames =', JSON.stringify(stubbedCapabilityNames(relabelled)));
```

Command:
```
bun run exploit-probe.ts
```

Exit code: 0

Output, verbatim:
```
stubbedCapabilityNames = []
```

This output shows that the capability API accepts a caller-supplied "real" label for all five names
the harness actually stands in for, and the resulting stand-in ledger is empty. It does NOT show that
the harness does this today — it does not; `index.ts` labels them stand-ins. The claim is about what
the API permits a caller to do, not about what the shipped harness currently does.

## Cleanliness check

Command:
```
git status --porcelain
```

Output: (empty — no stray files, run immediately before this baseline file itself was written)
