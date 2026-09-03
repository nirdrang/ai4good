# Comment audit — diff `7d897b7...HEAD`

Scope: comments added or changed by the diff (`+` lines) under `tests/at/harness/`,
`tests/at/suites/req-001/_live.ts`, `.claude/skills/verify-ai4good/scripts/drive-ngo-signup.ts`,
and `tests/at/typecheck.ts`. Files under `loop/parked/` and `loop/items/` were not read.
No file was edited. No `eslint-disable`, `@ts-ignore` or `@ts-expect-error` was added by the diff.

Note on moved text: `local-stack.ts` and `stack-lock.ts` are new files and most of their prose was
lifted from the old `runner.ts`. It shows as `+` and is judged here as such.

Note on `no-empty`: `eslint.config.js` extends `js.configs.recommended`, which turns on `no-empty`
with `allowEmptyCatch: false`, and lints every `**/*.ts`. Five comments below exist only to make an
empty block non-empty. Each is marked MUST KILL with the statement that replaces it; deleting the
comment alone would fail lint.

Verified facts used below (checked in this tree, not remembered):
- `.env` line 1 sets `SUPABASE_PROJECT_ID`; `.env.example` line 8 sends secrets to `.env.local`.
- `supabase/config.toml`: `[db.pooler] enabled = false` (line 54), `[local_smtp]` at line 114 with
  `port = 44324` at line 117, `jwt_expiry = 120` at line 180.
- Real `supabase status -o json` output (`loop/items/AI4DEV-57/stack-up.txt` lines 31, 43, 45)
  prints `Stopped services: [supabase_imgproxy_<id> ...]` and emits both `INBUCKET_URL` and
  `MAILPIT_URL`.
- `CapabilityPending` and `AtPending` are defined in `tests/at/harness/pending.ts`; `registry.ts`
  only re-exports them. Nothing in `registry.ts` verifies a codepoint (grep `U+2014|u2014`).
- `AT_LOCK_DIR` is set by `runner.selftest.ts` lines 121 and 155, so the override is live.
- `loop/work/work-lib.ps1` exists.

Format: `file:line — "first words" — verdict — reason`. A KEEP marked "trim" keeps one sentence,
named in the reason, and the rest of the block dies.

## .claude/skills/verify-ai4good/scripts/drive-ngo-signup.ts

1. :10 — "check passed. Keys are read through `stackFromLocalStatus`" — MUST KILL — narrates line 76.
2. :65 — "/* ---- run */" — MUST KILL — section banner.
3. :94 — "/* not JSON — keep the string */" — MUST KILL — `no-empty` accommodation. Replace with
   `catch { body = health.text; }` and drop the pre-assignment at line 90. MUST KILL: the doctor
   block at lines 90-95.
4. :101 — "// (a2) Doctor: the catcher's own identification." — MUST KILL — `record('a2', 'mail identification', ...)` says it.
5. :112 — "// (a3) Doctor: the edge runtime mounts" — MUST KILL — `record('a3', 'edge runtime mount', ...)` says it.

## tests/at/harness/clock.ts

6. :1-4 — "The integration tier's clock. It is a different class so" — MUST KILL — a one-method
   class; the "why a separate class" is our own type design and `TierHarness` states it.

## tests/at/harness/conformance.selftest.ts

7. :156-157 — "Four dummy coordinates, no mail URL" — MUST KILL — the five assignments and
   `rejects.toThrow(/mail catcher/)` say it; "After the name-map item" is change history.

## tests/at/harness/contracts.ts

8. :12 — "and `refusing()` in `index.ts` is what stands where one" — MUST KILL — slice-history
   paragraph (H2/H3, AI4DEV-21, AI4DEV-38..42) in a types-only file; the sentence describes `index.ts`.
9. :164-170 — "A TYPE ALIAS, NOT AN INTERFACE" (170 changed) — KEEP, trim — one sentence: TypeScript
   interfaces are open to declaration merging and type aliases are not. Platform fact; a lint would
   otherwise reverse the choice. The attack story around it dies.
10. :172-177 — "EVERY CAPABILITY CONTRACT IN THIS FILE IS AN ALIAS" — MUST KILL — history of an
    attack. MUST KILL: encode the rule as
    `@typescript-eslint/consistent-type-definitions: ['error', 'type']` scoped to `tests/at/harness`.
11. :206-210 — "`clock` and `vendors` are the two members" — MUST KILL — restates
    `Omit<..., 'clock' | 'vendors'> & { clock: RealClock }`.
12. :216-218 — "NOTHING ELSE FORKS" — MUST KILL — restates the same `Omit`.

## tests/at/harness/expected.selftest.ts

13. :10-14 — "verified by codepoint in `registry.ts`" (12 changed) — MUST KILL — false today:
    nothing in `registry.ts` verifies a codepoint; the dash is written in `pending.ts` line 16.

## tests/at/harness/expected.ts

14. :25-30 — "message text owned by `registry.ts`" (26, 30 changed) — MUST KILL — wrong owner: the
    text lives in `pending.ts`; `registry.ts` re-exports. A wrong pointer is worse than none.
15. :275-276 — "mirroring `CapabilityPending` in registry.ts" — MUST KILL — same wrong owner; the
    rebuilt string on the next code line is the fact.

## tests/at/harness/index.ts

16. :118 — "the coordinates the runner validated — never re-derived here" — MUST KILL — the type `Stack` says it.
17. :127 — "File presence of `_live.ts`. `openWorld` asks this" — MUST KILL — one `existsSync`; caller narration.
18. :135-137 — "ABSENCE IS NOT AN ERROR AT THIS LOADER" — MUST KILL — narrates the caller chain;
    `| null` here and the throw in `createHarness` say it.
19. :169 — "A typed seam for later slices" — MUST KILL — the Proxy trap that throws
    `CapabilityPending` says it; "later slices" is history.
20. :182-188 — "The return type is annotated, not inferred" (185-186 changed) — MUST KILL —
    do-not-remove sermon. MUST KILL: if the annotation must be guarded, turn on
    `@typescript-eslint/explicit-module-boundary-types` for the harness.
21. :209-210 — "The `sut.` prefix is composed onto a key only in `registry.ts`" — MUST KILL — narrates `sut: parts.adapter.sut`.
22. :214-219 — "'H3 sentinels' went from this list" (218 changed) — MUST KILL — corpse: describes a
    list that is now one name; the req-016 expectation lives in `tests/at/expected/req-016.json`.
23. :247-249 — "RealClock has now() only; Clock also declares" — MUST KILL — alibi for
    `new RealClock() as unknown as AtHarness['clock']`, a double cast that lies to the compiler.
    MUST KILL: `createHarness`/`finish` at index.ts:251 — type `finish` per tier (or build the two
    harness shapes without sharing it) so no cast exists.

## tests/at/harness/live-refusal.selftest.ts

24. :1-8 — "The above-loop refusal, through the real path" — MUST KILL — the `describe`/`it`
    titles carry the claim; "CI never runs the integration tier" is the CI workflow's fact.
25. :69 — "/* retry once */" — MUST KILL — `attempt < 2` says it; `no-empty` accommodation.
    Replace with `catch (err) { if (attempt === 1) throw err; }`.

## tests/at/harness/live-stack.selftest.ts

26. :1-7 — "Pure parts of the shared stack module" — MUST KILL — test narration.
27. :34-35 — "Soft break sits inside the `=3D` escape" — MUST KILL — duplicate of the protocol
    note kept at live-stack.ts:230; the fixture string and the title show it.

## tests/at/harness/live-stack.ts

28. :1-6 — "THE ONE CLIENT FOR THE RUNNING STACK" — MUST KILL — module inventory; "No provenance.
    No attestation." is the history of deleted modules.
29. :16 — "Field to `AT_SUPABASE_*` name. `childCoordinates` writes" — MUST KILL — caller narration on a self-describing const.
30. :66 — "The five `AT_SUPABASE_*` values the runner hands the child" — MUST KILL — narration.
31. :124-127 — "The Mailpit `/api/v1/info` probe and its refusals" — MUST KILL — the four error messages say it.
32. :230-233 — "Quoted-printable is decoded in full: soft breaks first" — KEEP — protocol
    (RFC 2045): a soft line break can split an `=XX` escape, so unwrapping must precede decoding.
    The three chained `replace` calls are silent about why order matters.
33. :249 — "The same read, waited for up to 20 seconds" — MUST KILL — `deadlineMs = 20_000` and the loop say it.
34. :299 — "A URL with its fragment cut and every query VALUE replaced" — MUST KILL — the five-line body says it.

## tests/at/harness/local-stack.selftest.ts

35. :1-7 — "Tests OF the one-stack lifecycle" — MUST KILL — stale: "AI4DEV-3 has not built yet";
    "spawn a real child process" is false for this file (`stack-lock.selftest.ts` spawns).
36. :39 — "A config and a matching status for a stack that is demonstrably local" — MUST KILL — fixture narration.
37. :52 — "A `status -o json` result: the JSON on stdout" — MUST KILL — fixture narration; the
    non-zero-exit vendor fact is kept once at local-stack.ts:374.
38. :65-69 — "A proof, minted the only way one is" — MUST KILL — stale pointer: "the residual
    `runner.ts`'s brand docstring" — the brand (`PROVEN`) is in `local-stack.ts`.
39. :79-83 — "The catcher URL travels into the child" — MUST KILL — history ("It used to flow...").
40. :92 — "A REPORTED CATCHER THIS CONFIG CANNOT VOUCH FOR" — MUST KILL — the assertion text says it.
41. :96-97 — "And a stack that reports no catcher at all is not a failure" — MUST KILL — narration.
42. :120 — "The suffix is `_<project id>`" — MUST KILL — the `notdemo` fixture says it.
43. :122 — "No name at all is no evidence either way" — MUST KILL — narration.
44. :128-131 — "The tail of the pattern is anchored" — MUST KILL — bug history; the `it` title states the property.
45. :144-145 — "THE TARGET TRAVELS IN THE READ" — MUST KILL — narrates two `expect` lines.
46. :151-152 — "stdout is deliberately not JSON" — MUST KILL — the title says "BEFORE parsing".
47. :159-160 — "'Forgot to run db:start' is the most frequent way" — MUST KILL — the title says it.
48. :164-165 — "A CLI that could not be launched is not an identity mismatch" — MUST KILL — narration.
49. :172-176 — "Every local check passes on this result" — MUST KILL — incident narration; the title says it.
50. :190-194 — "THE SPREAD IS THE HONEST MISTAKE" — MUST KILL — duplicate of the platform note
    kept at local-stack.ts:773.
51. :212 — "ES modules are strict, so a write to a frozen object throws" — KEEP — platform:
    strict-mode semantics make the write throw; explains why `toThrow(TypeError)` is the assertion.
52. :227 — "A catcher port that disappears is a change too" — MUST KILL — narration.
53. :234-236 — "The two literals ... used to be joined by prose alone" — MUST KILL — history.
54. :254-255 — "`exp` and `iat` come from the same token" — MUST KILL — history ("A five-second
    tolerance used to..."); the title says EXACTLY.
55. :279-280 — "The catcher URL is the one coordinate that is dropped silently" — MUST KILL — sermon.
56. :301-302 — "runSupabaseCli cannot be stubbed without a new parameter" — MUST KILL — confession;
    the test tests `stackFromParsedStatus`, which its title says.
57. :349 — "The line reads git, so it is not the pure formatter it looks like" — MUST KILL —
    our-code surprise: `evidenceLine` hides a git call. MUST KILL: `evidenceLine` at
    local-stack.ts:1030 — take the tree state as a parameter (the runner calls `treeState(REPO_ROOT)`),
    so the formatter is pure and the selftest needs no git.
58. :378-386 — "THE BASELINE IS OBSERVED, NEVER HARD-CODED" — MUST KILL — history sermon; the
    `expect` messages carry the property.
59. :388-389 — "Asserted so the title cannot pass vacuously" — MUST KILL — the `expect` messages say it.

## tests/at/harness/local-stack.ts

60. :1-26 — "The `integration` tier needs a real database" — MUST KILL — a four-step narrative of
    `prepareLocalStack`; "deliberately paranoid" is a sermon.
61. :37 — "How long the stack gets to become genuinely ready" — MUST KILL — the name says it.
62. :39 — "How long `supabase db reset` gets before it is assumed wedged" — MUST KILL — the name says it.
63. :42 — "`supabase status` reports these two as stopped because config.toml disables them" —
    MUST KILL — `DISABLED_SERVICES` says disabled; the vendor fact (non-zero exit) is kept once at :374.
64. :45-49 — "The pinned CLI, invoked directly — no shell" — MUST KILL — `INSTALL_ROOT` vs
    `REPO_ROOT` is our own naming (`check.ts`).
65. :52 — "/* ---- the child environment (leak) */" — MUST KILL — banner.
66. :54-64 — "The ONLY variables a child process inherits ... WHY AN ALLOWLIST: bun auto-loads" —
    KEEP, trim — the platform fact: bun loads `.env`/`.env.local` into `process.env`, and the
    tracked `.env` sets `SUPABASE_PROJECT_ID`, so spreading `process.env` would hand the hosted
    identity to the child. The "every test" sermon and the `--no-env-file` narration die.
67. :66, :81, :97 — "// process/platform basics", "// temp + home, which bun, vitest",
    "// how the Supabase CLI finds the container runtime" — MUST KILL (three) — list labels.
68. :104 — "Windows environment names are case-insensitive" — KEEP — platform fact that forces the lower-case match.
69. :114-119 — "The bun binary. Children are launched under bun deliberately" — MUST KILL —
    duplicates 66; the fallback branch reads on its own.
70. :134 — "/* ---- redaction */" — MUST KILL — banner.
71. :136 — "Strip anything key-shaped" — MUST KILL — the name says it.
72. :145 — "First non-empty line, redacted and length-capped" — MUST KILL — the body says it.
73. :155 — "/* ---- config.toml reading */" — MUST KILL — banner.
74. :161-165 — "`[auth] jwt_expiry` — the access-token lifetime the running Auth service reads at START" —
    MUST KILL — caller narration; the restart fact is in `lifetimePinProblem`'s message text.
75. :167-175 — "`[local_smtp] port` ... OPTIONAL, for the same reason" — MUST KILL — justification of a `?`.
76. :179-185 — "Ports and project id come from `supabase/config.toml`" — MUST KILL — narration.
77. :208-210 — "`[local_smtp]`'s FIRST port is the catcher's web API" — KEEP, trim — one sentence:
    in the CLI's config.toml, `[local_smtp] port` is the catcher's web-API port (the one reported as
    `MAILPIT_URL`); `smtp_port` and `pop3_port` are other ports. The clause "which is why this reads
    the first `port` key" is wrong: the `^port` anchor excludes them, not the `!mailPort` guard.
78. :224 — "/* ---- the stack's own report */" — MUST KILL — banner.
79. :231-244 — "WHERE THE STACK'S OWN MAIL CATCHER ANSWERS ... OPTIONAL, and that is not laziness" —
    MUST KILL — sermon; the rename fact is kept at :399.
80. :260-263 — "WHICH PROJECT an invocation acts on" — MUST KILL — sermon.
81. :265 — "The directory that CONTAINS the `supabase/` project folder" — MUST KILL — the `--workdir` usage shows it.
82. :267 — "The project id the invocation must resolve, stated POSITIVELY" — MUST KILL — narrates `supabaseInvocation`.
83. :277-304 — "THE ONE SEAM every Supabase CLI invocation is built at" — KEEP, trim — the two
    vendor facts only: (1) the CLI reads `SUPABASE_PROJECT_ID` as an override of config.toml's
    `project_id`, and the tracked `.env` sets it; (2) when the cwd is itself a Supabase project,
    `--workdir <other>` yields a hybrid (measured 2026-08-10). The incident story, the wall
    metaphor and "EVERY INVOCATION STATES A TARGET" die.
84. :328-329 — "Run the pinned CLI through the seam and hand back the RAW result" — MUST KILL — narration.
85. :342-345 — "Where the JSON object sits" — MUST KILL — the caller's message says "no stack is running".
86. :352-357 — "The status parser, separate from the invocation so that" — MUST KILL — design narration.
87. :374-375 — "The CLI exits non-zero merely because config.toml disables imgproxy and the pooler" —
    KEEP — vendor fact: a healthy stack exits non-zero from `status` when a disabled service is
    listed as stopped; this is why the exit code is ignored. Verified in config.toml and stack-up transcripts.
88. :399-401 — "BOTH NAMES, newest first. The CLI emits `MAILPIT_URL` today and still emits the older
    `INBUCKET_URL`" — KEEP — vendor fact, verified in real `status -o json` output.
89. :412-415 — "Pure mapping ... The drive's constructor cannot stub" — MUST KILL — confession.
90. :429 — "The drive's constructor: one CLI seam, then the mapping" — MUST KILL — narration.
91. :437 — "/* ---- proving the stack is the LOCAL one */" — MUST KILL — banner.
92. :451-454 — "Refuse to touch anything that is not demonstrably the local" — MUST KILL — the
    selftest at local-stack.selftest.ts:185 encodes "never the value".
93. :473-484 — "THE MAIL CATCHER URL IS CHECKED TOO (gate-2 ruling S1-6)" — MUST KILL — ruling
    citation plus "It used to flow" history.
94. :510 — "/* ---- readiness */" — MUST KILL — banner.
95. :518 — "Postgres itself answers a query" — MUST KILL — the name says it.
96. :534 — "One request that only succeeds if Kong routed it" — MUST KILL — the probe is readable; doubt is meat.
97. :550-554 — "Wait until the stack is genuinely usable" — MUST KILL — sermon.
98. :576 — "/* ---- the migration-set proof */" — MUST KILL — banner.
99. :578 — "Counted, not just proved" — MUST KILL — narration.
100. :584-588 — "The CLI names them `<timestamp>_name.sql` and records the timestamp as the applied
     version" — KEEP, trim — that one vendor sentence: it is why the regex captures 14 digits and
     compares them to `schema_migrations.version`. ".gitkeep and README.md are ignored" dies (the regex says it).
101. :598 — "What the database says it actually replayed" — MUST KILL — the name says it.
102. :610-612 — "A database that has never had a migration applied has no history table" — KEEP —
     vendor fact: `supabase_migrations.schema_migrations` does not exist before the first
     migration; forces the `does not exist` to `[]` mapping.
103. :621 — "Exact set equality, both directions" — MUST KILL — the body says it.
104. :631-638 — "Prove the rebuild actually replayed the migration set" — MUST KILL — sermon; the
     log line states the empty case.
105. :656 — "/* ---- reset */" — MUST KILL — banner.
106. :658-676 — "Rebuild the local database ... A TARGET COSTS A PROOF" — MUST KILL — ruling
     citations (B2, D13) and the brand essay duplicated from :773.
107. :678-680 — "Read through the descriptor rather than `PROVEN in read`" — KEEP — TypeScript
     narrows the `!(PROVEN in read)` branch to `never`, so `read.target` would not compile in the
     message; forces the descriptor read.
108. :691-692 — "progress is worth watching" — MUST KILL — narrates the `stdio` triple.
109. :704-705 — "Kill the TREE: the CLI shells out to the container runtime" — MUST KILL — the
     comment claims a tree kill; on non-Windows `child.kill('SIGKILL')` kills only the parent. An
     alibi for code that does not do what it says. MUST KILL: `resetLocalDatabase` timeout branch at
     :706-707 — spawn with `detached: true` and `process.kill(-child.pid, 'SIGKILL')`, or drop the claim.
110. :732 — "/* ---- the one stack: identity, coordinates, evidence */" — MUST KILL — banner.
111. :734-764 — "The Supabase container names in a piece of CLI output" — KEEP, trim — the vendor
     facts only: containers are named `supabase_<service>_<project id>`; `supabase status` prints
     `Stopped services: [...]` on stderr and error paths print `No such container: supabase_db_<id>`.
     Both incident dates, "MEASURED 2026-09-02" and the "Two residuals" paragraph die (the refusal
     at :872-878 already names the benign cause; "No such project exists on this machine" ages).
112. :773-783 — "THE BRAND ONLY THIS MODULE CAN SET" — KEEP, trim — the platform fact: TypeScript
     keeps a symbol-keyed member in a spread's type, so `{ ...read }` type-checks as a
     `StackIdentityRead`; the brand is therefore non-enumerable and read at use. The
     exported-`identityVerdict` confession and the threat-model paragraph die.
113. :786-790 — "WHAT THE IDENTITY READ PROVED, in full" — MUST KILL — `readonly` and the freeze say it.
114. :792 — "Set by `mintProvenRead` and by nothing else" — MUST KILL — module-private symbol; obvious.
115. :794 — "The target the read judged" — MUST KILL — the `CliTarget` type says it.
116. :796 — "The project id the identity read proved, from the CLI's own container names" —
     MUST KILL — false: `mintProvenRead` copies `target.projectId`; nothing derives it from the
     container names. MUST KILL: `StackIdentityRead.provenProjectId` — drop it (use
     `read.target.projectId`) or derive it from `containers`.
117. :798 — "The stack's own report. Never null" — MUST KILL — the type says it.
118. :800 — "The container names the CLI printed" — MUST KILL — narration.
119. :804 — "The one mint" — MUST KILL — the body says it.
120. :816-833 — "PURE. The verdict ... THE ORDER IS LOAD-BEARING" — MUST KILL — the order is proven
     by three selftests; the body reads top to bottom.
121. :884-888 — "THE READ THAT PRECEDES EVERY DESTRUCTIVE ACT" — MUST KILL — narration.
122. :898-906 — "THE LIFETIME IS PINNED ONCE" — MUST KILL — the returned message says all of it;
     "prose alone used to join them" is history.
123. :918-927 — "THE LOCKED SNAPSHOT MUST STILL BE THE FILE" — MUST KILL — rationale essay on a
     five-line diff function; the refusal in `prepareLocalStack` states it.
124. :941 — "What one integration run established" — MUST KILL — narration.
125. :947-974 — "Make the one stack's database be this tree's database ... WHAT IT DELIBERATELY DOES
     NOT DO" — MUST KILL — sermon plus a decision record (arena 2026-09-02, `docker ps`); decision
     records belong in `loop/items`, not in code.
126. :993-997 — "The coordinates a suite is allowed to see" — MUST KILL — narration.
127. :1010-1014 — "The tested commit and the tree state" — MUST KILL — the hex regex says it.
128. :1024-1029 — "The one line the verify transcript carries" — MUST KILL — "No slot number anywhere" is history.

## tests/at/harness/registry.ts

129. :151 — "/* ---- pending errors */" — MUST KILL — banner over two re-exports.
130. :247-248 — "The attack is recorded under `loop/parked/v1/tests/at/typeprobes/` and nothing
     executes it" — MUST KILL — pointer into parked (dead) text; the AI4DEV-37 reference two lines up is the live link.
131. :281-282 — same sentence — MUST KILL — same reason.
132. :666-669 — "Liveness is decided before anything is built" — MUST KILL — "keeps its
     (tier, live, sutKey) signature" is change narration.

## tests/at/harness/runner-blackbox.selftest.ts

133. :279-282 — "They are the run-time half of a pair" — MUST KILL — do-not-delete sermon.

## tests/at/harness/runner.ts

134. :10-11 — "The `integration` tier's one stack ... lives in `./local-stack.ts`" — MUST KILL — the import says it.
135. :397-399 — "THE ONE STACK, STATED POSITIVELY" (398-399 changed) — MUST KILL — sermon.

## tests/at/harness/stack-lock.selftest.ts

136. :1-3 — "Tests of the machine-wide stack lock" — MUST KILL — the file name and package.json say it.
137. :13 — "A key of its own" — MUST KILL — narration.
138. :22 — "A claim file exactly as it looks mid-write" — MUST KILL — the `it` title says it.
139. :53-56 — "Alive (this very process) and two days old. There used to be a second policy" —
     MUST KILL — history; the title says "there is no age rule and no option".
140. :72-75 — "AN EMPTY FILE IS WHAT A LIVE CLAIM LOOKS LIKE MID-WRITE" — MUST KILL — the title says it.
141. :92 — "Dead by pid" — MUST KILL — narration.
142. :106, :110 — "// a barrier, so both attempt at the same instant", "// hold it, so the loser meets
     a LIVE holder" — MUST KILL (two) — narration of the child script.
143. :113-114 — "spawn, NOT spawnSync" — MUST KILL — do-not-change sermon.
144. :125 — "Started together; the in-child barrier" — MUST KILL — narration.

## tests/at/harness/stack-lock.ts

145. :1-4 — "The machine-wide lock for the one stack" — MUST KILL — the key rationale is kept once at 154.
146. :10 — "The takeover gate is held for milliseconds" — MUST KILL — justification of a number.
147. :18-25 — "Where the machine-wide claim files live. `AT_LOCK_DIR` overrides it" — MUST KILL —
     narration; the override is live (`runner.selftest.ts` sets it).
148. :38 — "EPERM means it exists but belongs to someone else; ESRCH means it is gone" — KEEP —
     platform semantics of `process.kill(pid, 0)`; forces `return code === 'EPERM'`.
149. :43 — "The lock path for one stack. Machine-wide" — MUST KILL — narration.
150. :53 — "Set only on a claim that replaced a dead holder's" — MUST KILL — the name says it.
151. :57-63 — "THE ONE TAKEOVER RULE ... There used to be a second policy" — MUST KILL — history.
152. :77-81 — "A gate left behind by a process that died mid-takeover" — MUST KILL — sermon.
153. :90 — "// unreadable or already gone — the next pass finds out" — MUST KILL — `no-empty`
     accommodation. Replace with `catch { return; }`.
154. :94-99 — "Serialize every destructive run against one stack. The key is project id + api port
     because" — KEEP, trim — one sentence: a second checkout with the same `project_id` shares the
     CLI's containers and ports, so the lock is keyed the same way. "Mirrors `Acquire-WorkLock`"
     dies (the file exists; the sentence is still narration).
155. :101-118 — "TAKEOVER IS THE WHOLE DIFFICULTY ... So the takeover DECISION is serialized" —
     MUST KILL — a correctness essay for our own algorithm; the race selftest proves it. MUST KILL:
     `acquireStackLock` — extract the gate section (:232-261) into a named
     `takeOverDeadHolder(file, gate, claim)` so the protocol reads as steps.
156. :139-141 — "A takeover recorded ONLY on the console is lost" — MUST KILL — `tookOverFrom` says it.
157. :163 — "// already removed, or unreadable — nothing of ours left to release" — MUST KILL —
     `no-empty` accommodation. Replace with `catch { return; }`.
158. :171 — "The recorded holder, or null if the lock is gone" — MUST KILL — the return type says it.
159. :177 — "// unreadable or half-written: treat as an unidentifiable holder" — MUST KILL — narration.
160. :181 — "Bounded synchronous pause; a gate is held for milliseconds" — MUST KILL — busy-spin
     alibi. MUST KILL: `pause` — `Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms)`
     is a real synchronous sleep and removes the empty loop body.
161. :185 — "/* spin */" — MUST KILL — `no-empty` accommodation; gone with 160.
162. :189-204 — "AN UNIDENTIFIABLE HOLDER IS NEVER TAKEOVER-ELIGIBLE" — MUST KILL — the selftest
     "never takes over a claim file it cannot identify" proves it; the thrown message states the rule.
163. :210, :227, :246, :250, :254 — "// released while we looked", "// released between the failed
     claim", "// released while we were entering", "// refreshed under us", "// a third process
     claimed the free path first" — MUST KILL (five) — control-flow narration on `continue`; gone with 155.
164. :221 — "Bounded: every retry follows another process winning the gate" — MUST KILL — justification of `20`.
165. :232 — "Dead. Enter the takeover gate" — MUST KILL — becomes the extracted function's name (155).
166. :247 — "The same guard as above" — MUST KILL — narration.

## tests/at/harness/suite-adapters.ts

167. :10 — "That attack is recorded under `loop/parked/v1/...` and nothing executes it" — MUST KILL — pointer into parked text.

## tests/at/suites/req-001/_live.ts

168. :17-18 — "the database as the OPERATOR, over the connection string the runner validated" —
     MUST KILL — narration; `sqlClient(stack)` says it.
169. :20-22 — "==== WHAT IS NOT BACKED, AND WHY ====" — MUST KILL — banner rules inside a doc block
     (the list under it is pre-existing and out of scope).
170. :806-807 — "Written out because the integration manifest names each one" — MUST KILL — justification of six one-liners.

## tests/at/typecheck.ts

171. :2 — "the standard type-check, over three projects" — MUST KILL — `PROJECTS` has three entries.
172. :7-8 — "All three projects are always launched; the exit code is the aggregate" — MUST KILL —
     the loop and `failures` say it. (The "WHY THIS IS NOT `&&`" and "WHY IT LIVES HERE ...
     AI4DEV-24" paragraphs are pre-existing and out of scope; both are history.)

## Totals

- MUST KILL: 163 comments (156 entries; entries 67, 142 and 163 cover 3, 2 and 5 comments).
- KEEP: 16 comments (entries 9, 32, 51, 66, 68, 77, 83, 87, 88, 100, 102, 107, 111, 112, 148, 154);
  ten of them are "trim to one sentence".
- Skips: none inside the scope. `loop/parked/` and `loop/items/` were not reviewed, as instructed.

## MUST KILL code targets (rename, extract, type, or rearchitect; no code was touched)

- `tests/at/harness/index.ts:251` — `new RealClock() as unknown as AtHarness['clock']` in
  `createHarness`: type `finish` per tier so the double cast goes.
- `tests/at/harness/local-stack.ts:706-707` — `resetLocalDatabase` timeout branch: the non-Windows
  path kills only the parent; use `detached: true` plus `process.kill(-pid)` or drop the tree-kill claim.
- `tests/at/harness/local-stack.ts:796` — `StackIdentityRead.provenProjectId` is a copy of
  `target.projectId`; drop it or derive it from `containers`.
- `tests/at/harness/local-stack.ts:1030` — `evidenceLine` calls git; take the tree state as a parameter.
- `tests/at/harness/stack-lock.ts:182-187` — `pause` busy-spins; `Atomics.wait` sleeps.
- `tests/at/harness/stack-lock.ts:232-261` — the takeover gate inside `acquireStackLock`; extract it.
- `tests/at/harness/contracts.ts` — "contracts are aliases": encode as
  `@typescript-eslint/consistent-type-definitions: ['error', 'type']` for `tests/at/harness`.
- `tests/at/harness/index.ts:190` — the annotated return type of `createHarness`: if it must be
  guarded, `@typescript-eslint/explicit-module-boundary-types`.
- Five `no-empty` accommodations (drive-ngo-signup.ts:94, live-refusal.selftest.ts:69,
  stack-lock.ts:90, :163, :185): each needs the real statement named above, or the lint fails.
