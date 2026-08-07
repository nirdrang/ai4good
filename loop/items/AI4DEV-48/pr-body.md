The acceptance-test harness decided whether a capability was the real article or a stand-in by reading a word the caller passed in. The only validation was that the word was non-empty. So changing four wrappers in `tests/at/harness/index.ts` from stand-in to real emptied the list the integration-tier gate checks, and that gate — the one whose green is supposed to mean "earned against a real database and real product code" — passed with nothing behind it. No database touched, no product in existence, and nothing announcing it.

**This pull request now carries the finished change.** Provenance is a verdict the harness computes, never a word a caller supplies.

## What is in it

The `realCapability` / `standInCapability` pair is gone. One constructor computes a verdict from a witness registered per capability name, and there are three outcomes — the third one **refuses**, so a known name whose value cannot be classified is turned away rather than promoted. A capability name with no witness is refused, never defaulted: the name table is six exact names, with no prefix and no wildcard.

The clock and the vendor simulator are judged on the control seam they expose. A capability that can be commanded to jump forward is not the passage of time; one that can be told to reject the next N sends is a simulator. That is what gives the change teeth: faking either verdict means deleting the seam the test suites drive, so the lie reddens tests instead of hiding.

Fixture worlds and every system-under-test member left the name table for a separate route that carries the module URL actually imported. Those two routes are now disjoint and total — each refuses the names belonging to the other — so neither can be used to walk around the other. The harness also derives every capability it hands a suite from the ledger entry that judged it, so the object judged *is* the object handed over, by construction rather than by convention.

Six source files, 742 lines added and 81 removed, all under `tests/at/`. Eight new guards, each one observed rather than assumed: every guard was reverted, the suite run, the reds counted, then restored and confirmed back at 251 green before the next. Two of those observations are the empirical confirmation of a reviewer's claim — before this change, deleting either copy of the oracle witness's refusal branch left every test in the tree green.

The notification suite comes out unmoved: eleven green, one red on the still-unbuilt static provider scan, and the expected-state declaration byte-identical (blob `58408b86a6e8a772d8a3315e42b8a320369e1540`).

## How it was reviewed, in five sittings

**Sitting one — the plan.** An external reviewer read the plan before any code existed and returned twelve findings: six blockers, three majors, three minors. All twelve were adopted, two of them fixed differently than proposed. Three of the blockers were defects in *my own verification criteria*, not in the design: one check was empty by construction and could never have failed, another could not be executed at all as written, and the justification for not building a separate integration adapter cited a founder ruling that does not bear on the question. The plan now says plainly that the principle is extended by analogy on the orchestrator's authority, not the founder's.

**Sitting two — the draft.** The plan as amended was implemented, typechecking and building but with the verify suite deliberately not yet run, so the draft existed to be critiqued rather than to be green.

**Sitting three — the critique, the fixes and the goal.** Two reviewers read the diff in parallel, neither seeing the other, and returned seven findings covering five distinct defects. One of them mattered more than the rest, and the two reviewers disagreed sharply about how much (below). All were ruled, the fixes applied, and the suite driven green.

**Sitting four — the pre-merge audit.** A read-only auditor checked the *claim*, not the code's quality: is every adopted ruling actually in the tree, does the diff stay in its declared scope, is every stated fact about the code true. It returned "not mergeable as recorded" with three findings. All three were adopted (below).

**Sitting five — this one.** The merge ruling, pinned to the audited head.

## The disagreement that mattered, and how it was settled

One reviewer rated the oracle witness's accepting branch a **blocker**; the other read the same lines and rated it a **minor**, closing "no BLOCKER, no MAJOR". The ruling was **major** — not by splitting the difference, but because both were partly wrong.

**The first reviewer's structural claim was upheld**, verbatim:

> "`oracles.judge` reaches `real` on negative evidence: any non-`loop` tier plus any transport other than `replay-fs` is accepted, including the explicitly `fake` transport."

That is "I found no forbidden thing, therefore the thing is present" — the exact sentence that file's own header forbids — shipped inside the change whose subject line is *a green can be faked*. It is fixed: both axes now enumerate, and an unrecognised brand on either axis refuses and names which axis and which value.

**The same reviewer's semantic claim was rejected**, and here it is verbatim so the rejection can be judged rather than taken on trust:

> "`NEVER_TOUCHED` is `kind: 'fake'` in `oracles.selftest.ts:195-201`, yet lines 960-961 require it to be `real` at integration/drill."
>
> and its instruction: "an injected `kind: 'fake'` transport ... may not yield `provenance: 'real'`"

The reviewer presents this as a contradiction the draft introduced. It is not. At the merge base `fc8d50dd` the oracle constructor already did exactly this, and the rule is deliberate and argued in the tree: a `fake` transport is legal at every tier on purpose, because conformance fakes are the instrument the tier rules are proved *with*, and barring them would leave the rules untestable. The test cited as evidence of a bug is the encoding of that rule. Following the instruction would have reddened five assertions in a file this change is forbidden to touch, in order to overturn a rule this change never made. The reviewer maintained nothing afterwards; there is no live disagreement.

**The second reviewer's minor understated it** for a reason it named and then discounted: the evidence fields are declared plain strings, not the branded unions, so the exported constructor handed out a `real` verdict for a brand nobody has ever heard of, on its current source, with no edit at all.

**The auditor was invited in writing to disagree with this resolution and did not**, answering: "I agree with the recorded MAJOR resolution of the terra/kimi disagreement." Nothing else in this process re-examines that call, which is why it is recorded here.

## The audit, and the one thing it does not cover

Verdict, verbatim: "Audit result: not mergeable as recorded. I did not run the suite or any `bun` command."

Three findings, **all three adopted, and every one about prose describing the code rather than about the code**. It also confirmed the load-bearing facts: the merge-base fact the severity ruling rests on, that the new pins genuinely pin and their patterns match only the intended messages, that all eight guards and their assertions are present, and that the acceptance-test declaration and the scope are untouched.

1. A sentence claiming one witness was the only one that could reach `real` is false — three others return `real` unconditionally on every run. The accurate claim is that it is the only witness whose `real` verdict is *derived from evidence* rather than declared for a name. Rather than edit the single line handed over, the tree was swept: six instances, four of them wrong, including two shipped source comments the audit had not cited. The plan had it right all along as "genuinely evidenced"; the qualifier was dropped exactly once when a rulings file restated it, and every downstream copy inherited the weaker word. That is this change's own subject played out inside its own record — a claim true where it was measured, restated slightly stronger, then propagated until the word that made it true was gone.
2. A comment naming two sources for a stubbed capability name when there are three, refuting itself nine lines later. This one stings: that comment was *itself* a correction adopted in the previous round for overclaiming, and it came out inaccurate in a different way.
3. Two residual comment inaccuracies — a ledger header crediting a witness for two families that never see one, and a comment mistaking the four brand pairs it asserts for the six the tree accepts. Two assertions for the unpinned pairs were deliberately **not** added: they reach the same single final branch as an already-pinned pair, so they would buy assertions and no coverage. The comment now states the true count and names which pairs are refused, which forecloses the real hazard — a later reader believing only four are legal and "fixing" the witness to refuse the other two.

**Those comment corrections were made after the audit ran. They are not themselves audited, and no second audit was run on them.** The mechanism is audited and confirmed; the prose describing it, at its last revision, is not. What the corrections were subjected to is measurement rather than argument: the determination that they changed nothing executable was made falsifiable in advance, naming five values that had to be unchanged and stating that if any moved, the audit was owed again. The whole verify surface was then run before and after — typecheck, self-tests, verify, check, and the expected-state blob hash — and every value was identical, with line endings checked byte by byte. The full diff was read line by line: every added and removed line is a comment or markdown prose, with no statement, expression, type, assertion, import or string literal anywhere in it. A reader who wants to distrust one thing in this merge should distrust the comments, not the mechanism.

## What this green claims, and what it does not

**It claims** that no caller in this tree can name a capability's provenance; that a capability name nobody decided about is refused; that a known name whose value cannot be classified is refused rather than promoted; that the four reference capabilities cannot reach `real` through any route the API offers; that the integration-tier gate cannot be satisfied by the reference adapter under any relabelling; and that the object a witness judged is the object the suite receives.

**It does not claim that the harness cannot be faked.** The harness is source code. An author who edits a witness *and* the conformance test asserting it can still produce a false green; producer and witness can drift apart in future edits; a future value could collide with a witness's shape by accident. The honest ceiling is that the current assemblies are pinned by construction and by conformance assertions, while deliberate or future drift remains possible. What changes is the character of the act — it stops being a one-word relabel that reads like a routine promotion and becomes a multi-file edit that visibly disables a named guard.

It does not claim the self-defeating-lie property for all six capabilities, only for the two judged on a control seam; a reviewer caught that overreach in a comment and it was narrowed. It does not make the integration tier reachable — it makes that tier honestly unreachable, which it already was. And it does not claim the twelfth notification test passes: eleven of twelve are green, and the twelfth is red on a provider scan nobody has built, unchanged by this work.

## Verification

Required check `verify`, workflow run `31172391786`, conclusion **success** on commit `d831240e9908b74ecceb3b90f973c2cc2b024865` — the head the auditor read and the last commit here containing any executable content of this change. The merge ruling and this text ride in a record-only commit on top of it and are checked independently.

Locally at the same head: typecheck clean on both configs; self-tests 9 files, 251 passed; `at:verify req-016 --tier loop --expect` reporting 12 P0 as 11 green, 1 red, 0 missing; `at:check req-016` reporting 12 in the acceptance file and 12 registered.

## Left for filing, not built here

Three pieces of work this surfaced, recorded so they are not lost. **Recommend filing:** tier-specific fixture-adapter selection, so the tier decides which adapter file loads rather than every tier loading the reference one — deliberately rejected as this change's work, with a founder question open on whether to build it now; and the static provider scan, which has no board item at all and is the reason one notification test is red. **Recommend adding to an existing item** rather than filing fresh: a typed failure kind for stubbed capabilities, so a deeper-tier refusal is structurally declarable rather than matched as free-form text — close enough to the already-filed structured capability-codes work to belong there.

Record: `loop/items/AI4DEV-48/` holds the plan, the reviewer prompts, all four raw reviewer outputs with their distillates, the rulings for each round, the audit brief, the measured baseline, and the merge ruling.

Note on provenance of this work: every one of the five sittings was ruled by the opus fallback orchestrator, because the model normally used was out of credit for this item. An opus ruling and a fable ruling are not the same evidence, and the record says so throughout.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01DVE9Gg215tDXmRmB4RySGn
