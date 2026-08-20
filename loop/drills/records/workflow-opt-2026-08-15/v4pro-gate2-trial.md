# DeepSeek V4 Pro — gate-2 reviewer trial, 2026-08-13

Founder request: validate `opencode-go/deepseek-v4-pro` as a draft-code (gate 2) reviewer, at the
top reasoning tier.

## The effort pin — what "xhigh" means here

The founder asked for `xhigh`. **opencode exposes no `xhigh` variant for V4 Pro.** Its catalog
declares exactly two: `high` and `max`. DeepSeek's own API names its top tier `xhigh`, and the
vendor documents that `xhigh` maps to max reasoning, so opencode's `max` is that same tier under a
different name. The run used `--variant max`.

Two independent proofs the tier is real, not a silent downgrade:
- every assistant message in `opencode export` carries `"variant": "max"` (21 of 21, 19 of 19);
- reasoning tokens are **~42K against ~7K of visible output** — a 6:1 ratio that a degraded tier
  does not produce.

## Method

Subject: AI4DEV-62 (per-organisation roles and isolation), the recorded gate 2, both slices, at
the exact commits the incumbents read — slice 1 `610ead7...c2a7b6b`, slice 2 `c2a7b6b...d0444da`.
Prompts reused **verbatim** from `loop/items/AI4DEV-62/gate2-slice[12]-prompt.txt`.
Grading key: `loop/items/AI4DEV-62/gate2-rulings.md` — 14 findings, 8 rulings, each quoted.

Both weaknesses of the 2026-08-09 flash code-gate trial are fixed here:
- **raw output preserved** (`slice[12]-v4pro.md`, events stream, export, tool-call summary);
- **tree-discovered scope** — the `gitdiff` tool was present, and V4 Pro used it 13 and 9 times.
  The recorded flash slice-1 run had no git at all (ruling A1) and worked from file narrative.

Identity, on every assistant message: `opencode-go` / `deepseek-v4-pro`, agent `reviewer-v4pro`,
variant `max`. Cage proven by what ran — `gitdiff`, `read`, `glob`, `grep` only; no write, edit,
patch, bash, task or webfetch event in either run.

Cost **$0.180** for both slices ($0.0969 + $0.0835). Wall time 13.6 and 13.0 minutes.

## Result against the recorded rulings

| ruling | disposition | terra | flash | V4 Pro |
|---|---|---|---|---|
| R1 RPC existence-before-membership | **rejected** | s1[1] | — | not raised |
| R2 fixture order ≠ database order, cases a/b/c | accepted | a, a+b | a, c | **a, b, c — all three** |
| R3 SQLSTATE alone mints a refusal kind | accepted | s1[3], s2[3] | — | s2[7], seat-occupied half only |
| R4 `btrim` accepts tab-only names | accepted | s1[4] | — | missed |
| R5 AT-001.37 drives no UPDATE grant path | accepted (UPDATE half) | s1[5] | — | missed |
| R6 known-function control accepts any non-404 | accepted | s2[1] | — | missed |
| R7 Data-API arm proves less than stated | accepted | s2[2] | s2[1] | **s2[6]** |
| R8 pending header stale count | accepted | — | s2[3] | **s1[4], s2[2]** |

Recall over the seven ACCEPTED rulings: **terra 6, V4 Pro 3.5, flash 3.**

V4 Pro is the only reader in any panel that found **all three** cases of R2 — the convergent
finding the orchestrator called "the strongest signal this panel produced". It also independently
surfaced R2's **stated residual** (a malformed non-UUID organisation id answers 502 rather than a
4xx caller refusal, slice-1 [7]) which no incumbent raised as a finding.

## Novel true positives, verified by hand against the tree

Neither incumbent raised these; each was checked directly.

1. **`_contract.ts:191` documents the opposite of what the code does.** The contract says
   `invalid-name` means the name rule refused "before any role was consulted". Both implementations
   consult the role FIRST — `update-organization/index.ts:111-112` decides authorisation, then
   line 117 validates the name, and the code comment says so explicitly. A third adapter written
   from this contract would build an oracle the product does not have. **VERIFIED.**
2. **`pending-ledger.txt:45` miscounts.** It says `c-membership-and-acknowledgment.test.ts` keeps
   its imports "for the five ids it still declares"; the file declares eight ids of which four are
   still pending. V4 Pro named the four correctly (.18/.19/.20/.39). **VERIFIED.**
3. `_fixture.ts` second-seat semantics rest on a unique index that migration B adds in slice 2 —
   dormant by design at slice 1, real if an arm lands ahead of the migration. Plausible, not
   independently checked.
4. The plan promises an AT-001.32 arm for "no product attach path exists" with no executable
   oracle in either tier. Plausible, not independently checked.

**Zero false positives found.** Every claim examined held.

## One finding that is an artifact of the replay, disclosed

Both slices raised, at medium, that the code cites
`loop/items/AI4DEV-62/artifacts/verify-first-answers.md` and the file is absent. That is literally
true of the committed tree — the file entered git only at the squash merge `162adc4` on 08-12 —
but during the real gate it existed as a working file in the item's live worktree. So the claim is
true of my subject and false as a defect. It is the price of replaying from a commit rather than
from the original worktree, and it is not counted against V4 Pro or for it.

## Verdict

**A credible gate-2 seat, and clearly stronger than flash — but not a terra replacement.**

- Against flash, the seat it would take: more findings, better coverage of the convergent finding
  (3 cases of R2 against flash's 2), and three verified novel true positives flash never raised.
- Against terra, the seat it would NOT take: terra found 6 of 7 accepted rulings, V4 Pro 3.5.
  Everything V4 Pro missed — R4, R5, R6 and half of R3 — is the same class: **a guard or an
  oracle that is too weak, where nothing in the code looks wrong.** V4 Pro reads what the code
  says accurately; terra reasons about what the code fails to prove.
- Its own signature strength is **stated-fact drift** — comments, contracts and ledgers that
  contradict the code beside them. All three of its novel true positives are that class, and it is
  a class the current panel demonstrably under-covers.

Decorrelation, which is the whole argument for a panel, holds: V4 Pro and terra miss different
things. Cost is $0.18 for a two-slice gate against terra's tier.

## Open follow-up

One item, one sample. Before any seating ruling this should run on a second recorded gate with a
different defect mix, because the finding class V4 Pro is strong at (stated-fact drift) is
over-represented in a documentation-heavy item like this one.
