# Unit 4 report

Commit: `c2353b3d659f2eedf1120b5882fb475eb8749e2f`

Branch: `lane/ai4dev-132`. One implementation commit. This report was written after the
commit to include its final hash and is uncommitted, following the earlier unit reports.

## Files built or changed

- `supabase/functions/_shared/discovery-skills/01-elicit.md`, `02-ground-the-scope.md`,
  `03-write-stories.md`, `04-complete-the-record.md`, `05-plain-language.md`: five short
  instruction sets, 1963 body characters in total, without long dashes.
- `supabase/functions/_shared/discovery-skills.ts`: pure ordered heading renderer and skill
  type. `tests/at/harness/discovery-skills.ts`: synchronous Node reader of the same folder.
  `discovery-skills.selftest.ts`: file order, headings, minimum file count and size bound.
- `supabase/functions/_shared/discovery-prompt.ts`: real role and completion instructions,
  cached template plus skills, uncached need, strict record tool schema and boundary parser.
  Every schema object refuses additional properties and requires every declared property.
- `supabase/functions/_shared/discovery-turn.ts`: block-array model requests with the tool,
  skills in preparation, streaming action, elicitation in settlement, conversation projection.
  An invalid record tool input settles completed with null elicitation and retains the text.
  A tool-only answer settles an empty assistant string. The API stop reason is preserved;
  a cancelled stream uses `user_stopped`.
- `supabase/functions/_shared/discovery-reads.ts`: caller-authorized allowance RPC contract.
- `supabase/functions/_shared/anthropic-messages.ts`: cached system content blocks and tools
  on generation and counting; first tool-use result; beta streaming helper with cumulative
  usage tracking; raw streaming compatibility fallback. Client construction remains lazy,
  retries remain disabled, and beta and provider fallback settings remain on.
- `supabase/functions/_shared/discovery-stream.ts`: pure SSE part encoders, opt-in detection
  and the four UI message stream response headers.
- `supabase/functions/_shared/write-routes.ts`: shared settle result type and optional
  streaming action. `edge.ts`: ordered Deno skill reader, caller-JWT allowance RPC, all-state
  turn read, inline streaming response after reserve. Connected streams emit text parts,
  the rendered settled answer as `data-turn`, finish and done. Definite failures settle
  failed; uncertain failures retain the open turn. Cancellation aborts generation and
  registers the ongoing model-and-settle promise with `EdgeRuntime.waitUntil`.
- `supabase/functions/discovery-message/index.ts`: skills loaded once in request preparation,
  streaming action beside the JSON action, retaining the standard write-route constructor.
- `supabase/functions/discovery-conversation/index.ts`: authenticated read function with the
  standard method, body, UUID, tenant 404 and backend 502 behavior.
- `supabase/migrations/20260922120000_discovery_conversation.sql`: read-only membership-checked
  security definer, empty search path, public execute revoked, authenticated execute granted,
  today's allowance computed with the existing high-water grant rule, schema reload.
- `supabase/config.toml`: JWT verification for the read function and markdown static assets
  for the send function. `tests/at/suites/req-001/_integration.ts`: viewer function allowlist.
- `tests/at/harness/contracts.ts`: shared block-array request type, streaming port, optional
  text on a scripted tool reply so recordings retain their closing text. `vendors.ts`:
  scripted stream pieces of at most twenty characters, cancellation and detached request
  recording. `vendors.selftest.ts`: updated request shape, streaming and cancellation cases.
- `tests/at/harness/discovery-stream.selftest.ts`: SSE shapes, headers and Accept detection.
  `discovery-elicitation.selftest.ts`: invalid shapes, extra fields, empty tool-only text,
  invalid-tool settlement and stopped-turn stop reason.
- `tests/at/suites/req-004/fixtures/grant-tracker.ts`: six NGO messages, six scripted answers,
  a final tool call with closing text, and a separate handwritten positive oracle example.
  Fixture source is **handwritten**.
- `fixtures/record-grant-tracker.ts`: Bun recorder using the live adapter, vetted NGO,
  deployed send route, measured replies and usage, oracle gate and source rewrite. It needs
  the harness's `AT_SUPABASE_*` coordinates, a running deployed stack and the provider key
  in both the script environment and function environment. It preserves the independent
  positive oracle example and refuses to label a fallback-model recording as the pinned model.
- `fixtures/grant-tracker.oracle.ts`: required facts, no-developer constraint, story and
  acceptance coverage, unsupported-story vocabulary and contradictory reminder timing.
  `tests/at/harness/req004-oracle.selftest.ts`: positive, missing-fact, invented-story and
  reversed-timing cases. This is a deliberately bounded fixture oracle, not a general
  semantic judge; a valid paraphrase outside its vocabulary may require review.
- `tests/at/suites/req-004/_contract.ts`: imported product conversation type and allowance
  in the read result. `_fixture.ts`: skills, persisted elicitation, conversation projection,
  new-session actor mapping, original inner allowance session resolution and seeded rows.
  `_live.ts`: deployed conversation read and operator inserts of settled rows with measured
  usage. Inserts do not require disabling the update/delete immutability trigger.
- `tests/at/suites/req-004/d-conversation.test.ts`: the bounded conversation and oracle body;
  resume through a new session, operator ledger rollover, equal persisted rows and six
  prior messages. Integration seeds rows, reads the deployed route, reserves to inspect the
  context and settles that reservation failed in a finally block.
- `tests/at/expected/req-004.json`: only the requested expectations moved. Both conversation
  criteria are declared green at loop. Resume is declared green at integration; elicitation
  remains capability-pending on `vendors.anthropic`. These are authored expectations,
  not measured Vitest results. All fifty-eight registrations remain.
- `.claude/skills/verify-ai4good/features/discovery-message.md`: streaming opt-in, parts,
  cancellation, elicitation and paid per-turn regenerate. `discovery-conversation.md`: new
  read/resume recipe. `features/README.md`: new row. No drive script.

The reserve, settle and existing allowance definers were not changed. No table, tenant
catalog row or message-bearing audit event was added. Turn request settings retain their
three fields. No credential was written or copied.

## Deviations and implementation resolutions

Two supporting changes beyond the named edits:

1. The requested `.claude/skills/verify-ai4good/README.md` does not exist. The existing
   maintained index is `features/README.md`; it was read and updated instead.
2. The send function gains `static_files` in Supabase configuration. Without bundling the
   markdown files, the deployed file reader would not have its prompt assets. This follows
   the [Supabase static-file configuration](https://supabase.com/changelog/32815-add-static-files-to-edge-functions).

No departure from the synthesis corrections or founder streaming rulings. The read route
lands here as directed. The earlier email-before-count correction remains intact. A fixture
actor mapping and optional scripted tool text are necessary implementations of resume and
recording, respectively. No PM status authority or retired TaskMaster tooling was invoked.

## Streaming verification and recording

The shipped primary call is `client.beta.messages.stream(params, { signal })`. The installed
SDK exposes this helper and accepts the beta/fallback request types. The bridge observes
raw usage and text events and awaits `finalMessage()`. If the helper is absent, or rejects
the beta/fallback parameters before any message starts with a TypeError or HTTP 400, it
uses `client.beta.messages.create({ ...params, stream: true }, { signal })` and accumulates
raw events. No transport fallback is attempted after generation begins or on an uncertain
failure. The official [SDK helper documentation](https://raw.githubusercontent.com/anthropics/anthropic-sdk-typescript/main/helpers.md)
was also consulted.

**Not verified at runtime.** A read of the repository root `.env.local` found no
`ANTHROPIC_API_KEY` entry, so no live provider request was sent. The environment file was
read only in memory and was never printed or copied. The local stack probe at
`127.0.0.1:54321` found no listener. The recorder was not run; `source` remains
`handwritten`, with no `recordedWith` claim. The lead supplies live provider, cancellation
and deployed read/migration verification.

## Checks

Final `bun run typecheck`: exit 0.

```text
=== typecheck: app (tsconfig.json) ===
=== typecheck: acceptance tests (tests/at/tsconfig.json) ===
=== typecheck: verify drive (.claude/skills/verify-ai4good/scripts/tsconfig.json) ===
typecheck OK: all three projects clean
```

Final `bun run at:check req-004`: exit 0.

```text
at:check req-004 — 58 P0 in the acceptance file, 58 registered in the suite
RESULT: 58 P0 ids in bijection
```

Final `bun run at:check req-001`: exit 0.

```text
at:check req-001 — 38 P0 in the acceptance file, 38 registered in the suite
RESULT: 38 P0 ids in bijection
```

Additional static checks: the write-route and tenant-catalog scanners returned empty
problem lists; the positive oracle example returned no problems; pure-module forbidden-token
scan returned none; skill bodies total 1963 characters; registration count is 58; staged
whitespace check passed. The inline Bun scan also printed parent-directory EPERM diagnostics
after its JSON result, as earlier unit reports observed.

The SDK bridge and both function entry points passed an extra strict TypeScript check
against the installed SDK using temporary declarations for the runtime globals. Those
temporary files were removed. This is type evidence, not Deno or deployment evidence.
No Vitest, `at:selftest`, `at:verify`, migration execution or live function test was run.

The Git index is outside the writable worktree. Initial staging was refused by filesystem
permissions; the explicitly requested stage and commit succeeded with tool escalation.
The commit message was amended to remove PowerShell's leading byte-order mark. There is
one final implementation commit with the exact requested subject.

## Open questions and limitations

- Runtime evidence is pending for the beta helper, raw fallback, disconnect background
  settlement, deployment of static skills and the SQL viewer. These are lead verification
  items, not claims made by the three passing static checks.
- The requested abort rule sets output tokens to the request cap before any output usage
  delta. It preserves the last observed input usage, which is zero before message_start.
  That specified rule does not mathematically guarantee charging the entire reservation
  when its input component is large. The reserved bound still protects the pool. Charging
  exactly the full reservation would need an explicit treatment of unmeasured input usage.
- The existing two-number usage contract and fixed input price do not express separate
  cache creation/read prices or provider fallback iterations. This unit preserves that
  metering contract. Live cached and fallback billing should be checked before claiming
  exact invoice-cost reconciliation.
- The recorder deliberately refuses an oracle failure rather than replacing the fixture
  with an invalid recording. Its vocabulary is conservative and may flag valid synonyms.

No implementation blocker remains. The API key and running local stack are the blockers
to recording and live runtime verification in this session.
