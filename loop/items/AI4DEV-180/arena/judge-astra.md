| Criterion | A: Astra | B: Fable | C: Grok | D: Opus |
|---|---:|---:|---:|---:|
| 1. Phase 3 changes only the data source | 5 | 3 | 5 | 5 |
| 2. Screen driver fits this harness | 3 | 1 | 1 | 3 |
| 3. Interface depth and simplicity | 2 | 2 | 3 | 4 |
| 4. Contract and acceptance correctness | 5 | 2 | 3 | 4 |
| 5. Small units with honest checks | 3 | 2 | 3 | 3 |
| **Total / 25** | **18** | **10** | **15** | **19** |

**A: Astra**

1. The source boundary covers chat, actions, subscriptions, and reload. Components need neither fixture branches nor database access.
2. Tracked browser resources and pending backend checks are sound proposals. However, it leaves Playwright typing unresolved, uses a development server, and misses fixture-only CI coverage.
3. Branded identifiers, operation queues, reconciliation, checkpoints, and several sequence domains create substantial machinery. The small component interface hides an oversized implementation.
4. It covers revision acknowledgments, dependent answers, suggestions, stable progress, funding, and staged files most completely. It also resolves phone usage visibility without abandoning the full-screen brief.
5. Checks target useful invariants, but the first domain unit is large. Much infrastructure must exist before the first visible interaction can pass.

**B: Fable**

1. A transport could hide edge-function routing, but the proposed upload method is absent from its interface. Transient usage and separate chat/review mounts also weaken the promised replacement boundary.
2. It adopts any server on port 4310 and relies on process-exit cleanup. Its model-call evidence, DOM-library fallback, layout example, and first `--expect` check are unsound.
3. One transcript appears simple, but free commands, background updates, uploads, and revisions require special message rules. Those rules move complexity into the transport and fold.
4. The finish request carries no reviewed revision, and revision counting has an unsafe fallback. Adding the file precedes its first answer without a cancellation command; the proposed phone usage footer also conflicts with the required placement.
5. Early fold tests are useful. However, unresolved SDK assumptions and incorrect expectations for the first browser check prevent a reliable sequence of small units.

**C: Grok**

1. The client hides edge functions and upload steps. Main chat, file chat, and review can retain the same components.
2. The proposed bodies neither open a world nor consume captured evidence. Receipt counting cannot prove model-call counts, and the driver adds fragile process management plus a prohibited sentinel.
3. The client usefully separates commands from chat. However, public `sendTurn`, `chatTransport`, `applyPart`, and `readFile` expose internal work; the unused edge class adds no present value.
4. Revision checks, file staging, suggestions, and intake exclusion are clear. The phone brief deliberately stops above the dock, contradicting the full-screen requirement; the paid gauge also lacks necessary allocation data.
5. Reducer checks provide a useful first unit. But the shell is mounted before the screen-building unit, and the browser dependency arrives after driver checks that require it.

**D: Opus**

1. The port cleanly separates transport, actions, subscriptions, and loading. Phase 3 can supply edge-function implementations without fixture conditions in components.
2. Built assets, an owned server, fresh contexts, geometry checks, and fixture-only CI coverage are strong choices. The unnecessary capability name, unused-world handshake, and teardown failure gap prevent a higher score.
3. A port, authoritative snapshots, and small derivations provide the best balance of interface size and hidden behavior. Sharing all expected copy with components weakens test independence.
4. Revision-bound review, suggestions, file limits, and review behavior are mostly explicit. However, unasked topics lack importance for early review, nullable suggested options violate the one-suggestion rule, and funding fields remain incomplete.
5. The checks are concrete, but building the driver and all thirteen bodies first is too large. The later check for .61 opens Finish before the Finish unit exists.

**Recommended base: D, with corrections.**

D gives a future maintainer the clearest ownership rules: the source owns durable facts, revisions order brief snapshots, and local state holds drafts. Its browser design also provides the strongest starting point for repeatable layout checks.

Before implementation, make these corrections:

- Keep .67/.68 pending with `AtPending(..., "sut-missing", ...)` after their screen assertions. Leave .69 pending without adding `discovery.file-read`.
- Give every unresolved topic enough information for review at zero coverage, including importance and its reason.
- Extend usage data with paid allocation and settlement information. Require exactly one suggested option where the contract requires it.
- Explicitly preserve file transcripts and chat drafts across panel closure and review navigation. Do not rely on an unverified SDK persistence claim.
- Check phone usage visibility while the full-screen brief is open. Make teardown failures fail the run; logging alone is insufficient.
- Start with one browser case through the complete path. Add each acceptance body when its required screen exists.

**Ideas to graft from the other candidates**

| Candidate | Best ideas |
|---|---|
| **A** | Track browser resources honestly in harness accounting, including teardown. Preserve drafts when a stale revision rejects an edit, without adopting the full operation framework. |
| **B** | Keep a pure fold for historical transcript presentation. Its separation of historical message content from visible cards is useful when limited to transcript facts. |
| **C** | Keep a selected file staged until its first accepted answer. Commit the file and answer together so cancellation requires no compensating deletion. |

**Claims checked and found false or insufficient**

- **B and C: one Chromium step completes CI coverage.** The current [CI filter](C:/Users/nirdr/Downloads/ai4good/.claude/worktrees/AI4DEV-180/.github/workflows/ci.yml) excludes `design/astra/`. Fixture-only pull requests skip the suite. A misses this too; D identifies it.
- **C: the proposed loop bodies can become green.** [Registry accounting](C:/Users/nirdr/Downloads/ai4good/.claude/worktrees/AI4DEV-180/tests/at/harness/registry.ts:525) rejects successful bodies with neither a world open nor captured evidence. `surface: "ui"` does not exempt them.
- **D: declarable partial results require `CapabilityPending`.** The [declaration rules](C:/Users/nirdr/Downloads/ai4good/.claude/worktrees/AI4DEV-180/tests/at/expected/README.md) explicitly support `AtPending` with `sut-missing`. The new capability is unnecessary.
- **B: a DOM reference is scoped to `screen.ts`.** A triple-slash library reference adds the library to the TypeScript program. It defeats the Node-only constraint in [the harness configuration](C:/Users/nirdr/Downloads/ai4good/.claude/worktrees/AI4DEV-180/tests/at/tsconfig.json).
- **B: its first browser check can pass `--expect` while .72 remains declared pending.** An assertion failure does not match pending; a passing body does not match a declared red.
- **B and C: request or receipt counts prove .61.** Edge requests can contain multiple model calls, and one receipt can cover them. A correctly limits its evidence; D’s fixture probe still needs actual backend evidence in phase 3.
- **B, C, and D: their retained usage type supports the proposed paid gauge.** [Current `DiscoveryUsage`](C:/Users/nirdr/Downloads/ai4good/.claude/worktrees/AI4DEV-180/src/lib/discovery-stream.ts) lacks allocation and settled-consumption fields.
- **B: visibility proves the .73 layout.** Two visible regions need not sit beside each other, and a visible dialog need not fill the screen. C’s phone check likewise checks width without proving full-screen height.

I read all four candidates and checked the repository without changing files. I did not reproduce D’s reported compiler probe.