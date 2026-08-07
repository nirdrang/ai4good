Audit result: not mergeable as recorded. I did not run the suite or any `bun` command.

Findings:

1. Gate 2 fact 2 is false literally. `theArticleItself()` is a `CapabilityWitness` and returns `real`; three such witnesses are registered alongside `oracles.judge` ([capabilities.ts](C:/Users/nirdr/Downloads/ai4good/.claude/worktrees/agent-a3e39ea1bc6814000/tests/at/harness/capabilities.ts:96)). The accurate claim is that `oracles.judge` is the only evidence-derived or conditional real witness. The severity ruling remains sound.

2. A5 is incomplete. The contracts comment says every stubbed name comes from a value seam or module URL, but `oracles.judge` comes from tier and transport evidence ([contracts.ts](C:/Users/nirdr/Downloads/ai4good/.claude/worktrees/agent-a3e39ea1bc6814000/tests/at/harness/contracts.ts:327)). Its later paragraph admits this, so the comment contradicts itself.

3. Two residual comment inaccuracies remain: the ledger header says every capability carries a witness verdict although adapter-derived capabilities do not ([index.ts](C:/Users/nirdr/Downloads/ai4good/.claude/worktrees/agent-a3e39ea1bc6814000/tests/at/harness/index.ts:136)); and the conformance comment says there are four legal oracle combinations, while six combinations are accepted ([conformance.selftest.ts](C:/Users/nirdr/Downloads/ai4good/.claude/worktrees/agent-a3e39ea1bc6814000/tests/at/harness/conformance.selftest.ts:269)).

Everything else checked out:

- A1–A4 and A6 are implemented; the A2 regexes uniquely match the witness messages.
- Rejected claims remain rejected, including `fake` above loop.
- Forbidden files and acceptance-test hashes are unchanged.
- Scope and line endings are clean; no control residue remains.
- All eight negative-control assertions and their corresponding guards are present.
- I agree with the recorded MAJOR resolution of the terra/kimi disagreement.