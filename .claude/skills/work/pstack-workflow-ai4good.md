# The pstack workflow for ai4good

This file describes how ai4good runs one board item through open-pstack. This is workflow v2.
The file is live: it describes the machinery as it stands on main today. If you change any part
of the pstack flow, update this file in the same commit. Section 11 lists every change.

One document, three kinds of content, kept apart by section: sections 2 to 4 are reference and
only describe. Sections 5 to 9 explain the choices behind the reference. Section 10 is the
bring-up procedure.

Source of the pstack facts: [open-pstack](https://github.com/ericlitman/open-pstack) v1.2.0 as
installed in [`~/.claude/plugins/cache/open-pstack/pstack/1.2.0/`](file:///C:/Users/nirdr/.claude/plugins/cache/open-pstack/pstack/1.2.0/),
read file by file in session `ebf2407e` on 2026-08-27 to 2026-08-29. Founder rulings carry a
date and, where a message exists, a quote.

Every file reference is a link. Repository files link by relative path. Files outside the
repository link to this PC's copy with a `file:///` address.

Names used throughout. The **controller** is the local Claude Code session on this PC, on branch
`main`. The **mechanic** is the cloud Claude Code session that runs poteto-mode. Inside the
mechanic, pstack calls the top-level model the **lead**. A **sheet role** is one row of
[`~/.claude/pstack-models.md`](file:///C:/Users/nirdr/.claude/pstack-models.md). A **family** is
one row of the model matrix.

---

## 1. Installation status on 2026-08-29

| piece | state |
|---|---|
| plugin `pstack@open-pstack` v1.2.0 | installed and enabled in [`.claude/settings.json`](../../settings.json) |
| pstack session-start hook ([`hooks/hooks.json`](file:///C:/Users/nirdr/.claude/plugins/cache/open-pstack/pstack/1.2.0/hooks/hooks.json)) | live. The founder keeps it (2026-08-29). |
| model sheet [`~/.claude/pstack-models.md`](file:///C:/Users/nirdr/.claude/pstack-models.md) | not written. `/pstack:setup-pstack` is pending. |
| fourth matrix family | grok-4.6 through the codex router (founder choice, 2026-08-29). The row edit in [`provider-dispatch.md`](file:///C:/Users/nirdr/.claude/plugins/cache/open-pstack/pstack/1.2.0/skills/poteto-mode/references/provider-dispatch.md) is pending. |
| sheet shape for the first write | open. Shipped defaults are recommended. |
| the v1 hooks | stamp and local banner parked. Branch guard ([`guard-branch-switch.ps1`](../../../loop/work/guard-branch-switch.ps1)) live and skipped on cloud. Cloud banner ([`session-start-banner.sh`](../../hooks/session-start-banner.sh)) live on remote only. |
| verification skill [`verify-ai4good`](../verify-ai4good/) | not generated |
| controller skill `/controller` | written ([`.claude/skills/controller/SKILL.md`](../controller/SKILL.md)). Not yet run on an item. |

## 2. The shape: a local controller and a cloud mechanic

The chart shows every internal step of every phase. Section 3 gives the same stations as a
table. The controller's steps are the numbered steps of its manual.

The chart as an image, two ways to open it:

- **In the browser:** [open the chart on mermaid.ink](https://mermaid.ink/svg/pako:eJytWdty2zgS_RWUnyV5fE_0krIkx9Fu4iiSylbVZh8gEpQwJgkOQNrRpPLvexogqaYdl-Zhq3KReGk0us853Q39PIpMrI6GR0lqnqOttKVYjr7nQrhqvbGy2Irxcv75P9-PxiYvrUlTZYciNZFMhVPOaZP3xNrKPNqKTGp8OY7aB8V08v3ov2RMiFhbFZV4vDbPFphdw_xsK50S10MRq0jHSjxvZdm-_LvXhbg-wXtz5Uz6pES5VUKXKhN45LPOlYSbOu6JVK5V2hMbXY68l3cyUz3hSlnivzU28qisYwtdn8Log0wfRSGtyktRFc_SNoaEelJ2J1KdPwqT-EURM51zA2cwsCgRSLnWqS53Q5FpBCrf9MTE5Fh1DD8U4gOjxtY-xHDJFE5slVXc2Dlt0ZhSPOtyK3JTbmFIyLV5ou0OhXSP3ovEVHmMiBuY5u-fiH7_e_XHH2eI7Sn7fMY-n4enVR6_TMyoTcxoSDEDOJo4H8jNiHKDoItElYCGsXpD4MDbOeWigcxofn03_lTfPs66kRyd1jaejX0srVJCxnH7xR1Plzdfagv8rbOACmWfVH-yXqQIXoI4k-MBtxvkfiA-VmkqCmPS30d-RJEfp1JnFGSnN_B-mouZNRsL3PfEQpX9TyqNp91gjC4IPxYhwmqmOKZYBVeP11arZJDFw4CZnpjNJ8KlOgImPHRL9aPsCRlFqigJI7jgSuejRokOH9QT6EE319LydS89R7NMhxz5xYgM4QtFuyeKym35O1d456M1mX-oCSzcS2UFCvb7UWqqWBBOTq_mSsZvbknIPEaUU2gItjIIb_CV3vmkRMbGfq1aOsBQ_6bnk85fmc8UIpXrCCu8dp5Be8SgPWLQHp2zzxfs8yX7fMU-v3uTCg-U1q1Og9I0jglb5e4AFR6ICndGlDqD1PRAYvEsH1W_KtxAbLaisNi_K-HFlkJcUyLReez8WgUB1aq_KoCBLfVA7PhY095WCOHGiQ2WMV0PvXA0GS3qZH65WSyub2_ClzbRC1ydfr3rM9nGOsSna-GXp40lDV72MVAy2irX0SHI5Fpix9wQS9gDS9jD2ZtBH7f6MyZUGqf-qf6MKegfvfa8jKHwYdZ5HagG9szgmEI7rwJ3sBOd7OAUUboRkpccbYhmg-5AzSE73GIQJRnQf08mdSS9zy74PhALVCYog4oe3QcxngroDMSyNqx-yCh4_oGbPf_5_egWcoZi5cAp3PvV3iMhWiCoIS9Sp5VVr9DR5KkHTOqOx6QnAZ2A7UaJO2TM_VVJtx2IpTdBV31S3O-yMiZxWTwrVQzFXKUKWazlGBUQX22rnj2ELTN1DW_S0UMjkKpS1WHNTNnIGF_jnedAGtdVGlKNPEegaYza7cstldi24HJ3Q3nnxt7DWCtMDkBXKBOLarMh0NArOfSZ9zf8ZQbuMQP3mKnR-HyfN1wlIdjfu-je28HL_U0mV2MmV-N37PP7FyyaXe9vzjwv_K1Oa_flZvwJm_5So8FzDDrQBKHGnq9NbQlBIkrTz9A0_pPebkE8PBG3lnRhKI635vkAc2_pjc9EFVegfQrJatXH0_aUYHyOt92fBhdCDeUyfEsE_poTbYrUWOhRgb91qYVcxX2Tpzu0gVulSoFkKgHH2qe5JSLuDa6jYKuaCrXSQaC95nqXTL2YzD2rf2vam-C2ib3zWpRQ352Xl8KadYoKyLl8e1HvJ0JjAdbSbshq-OqQ2dJiO6TDQe-DZDB3AuLLLeqPrCXhsp-q3KF0oIhH3K3LJgGoKtist1rvdiiuIUNkEOOAQyNie-IOiEB5nmhHfa6KuSnGilvGilvGitvzfTxeIf-WFe3by-6DnD6L07dqyIKgcComilo4QZyXgKG0EIkS2PPROPaXD-By0uISu9ZP8FLWsaNJ4IwgeekTgrtyQJoT6xjS7CAbT4Q-RUxii0zIs-vWEXQSgAcwIEG8CiJJkIqD2_vEEiGsz6lMVQdl8qUlvhShOISgb1XcT1IJ4LqoqTBhqokal9Hrb6Xv5UDzitbROaCZhYIF7X6UG1yELBTGoqHGyGbw0emANapF_XILym-4WE98R20Nbv5ZxUQjh34Qjm9AjFphQ0AH4l_0AFGBml2LfCSJj03Te9SzWQNlXM_Lftg3X_GiRTL-cS-3KXxxNPQfnNaou0jpGnUK46KVSS09a2In1qMiHyY-DGEvwnsJIrOEo0I8kVBwCk-ufAeQWKryZKX0Hb2tuwyPwBAKbpjxZ8L4M2H8mbAed8LoMrncu_eSLpMrbvdN6hBqzlDsfSaLqgzdSUGae4AsSyLLiCZbGlcTbRFDV6rCDf305RDVhHIPsPcBdmZtSayYoocs4BDlmBoCh45AZni5lfxEkzQhLcCpSvXfngsIIuZDoiCwRTSkG9y2H83DY1mF-Ry08ScBw1Br6rwgc2XjYGMG2-CGCMqLjNamjclEdTkwECTW3hP7Afd34nm74--zvC5ZXpcsr8s3x_IFrX4u_JA59DJR5XBe4o8fMg7kZtUKWR0q2rW34Ke5YagTUBqRkeP0TKgfALekKBf1d9YEN7rHll6dNstAZnzOJYIUU9urYtbmuUI-585vIwSMBkHtTErP9f0lkqGu2K13nj-i3BV8u6uzZvi2fHPU_BIOqVXfa8gB98-ZKVm2A06wAYP82Yv9szorUL0BXIeYljrdvxRa9B7UgYZ0rh-ry_37VkFTS4K6Pysaff46_vfNhLrhJ-311_lTI-klCdCktPslkHjMkVmnxKyufIdBFtHaKZlzRVpR83zjIpl6BmB0oUxQ2-vQ51mpMW2pBCxALQJnYt8F-zaFUkB9VN-rlvcHtUQWGAyeDa6XwJELZz3YDpoQ7hKD_opBf8Wgv2KStmKStmJ98Opqv8mX8rZ6x9d4k0aUtQv0LUnSqUHukcbGAySan3RLix9dfAbDTO18zerYDbWc2Z0TQ26otLfJpbnDDy2gYfADVg0dHdLwCj8IWSL0WYg7qowfvrnRs580roPD8CWnkrVHDs_-nOVhzvIwf3MaXxBKL8PwutsPvHQQXNlERod0534fsgqED3N1X-rzjTEYDVJZ-QEjNlFp0FbG1GQF-kI-qs7h3L2PXHMQhlX83DIUn5bLmQcyNkuCg_pOokU1XVC3SniGX24gPsEPiLcTs1TukLjNFpWGjgADBPDm2vwA7F23Z7un6M6sQVihUhiaYh7T-3N_0lN67g7ESEaPzcBN-srtsOjfs-jfn-1Xeonqe86KkzezRH3GlVjQWJEfzMm3cITuA-TnGEdFDYRG10Xj8iup-tZiNtwT6wrDdgi1zygxX6bYP3-J7fbb23wkPXonpjmAa83Gi9Kx3n87sJXpfm6MTFGrdSBh3il1ZDL3LZ30CzO702ZutOCMeq7nRuZDe6Odudg0SXDEOAZCvJqppmetc7scTjg0JtD4iHCauwqaHlfoQCJfJ8NpCPiNbkfSKVAoJ3RISFfbS6jPBV_j_P82t00vSETyXf0Wx_iUVOCj_iHqBh-VKOheOBWig4QNkOPP2J6MrqUR0EDl5wyYMkxMGQOmrA5MGeKnF3vnXo2J00tu7E2A0QHPe7HY6gJtE_pLBKYv-4U9gKwZIQvqnZqCTm_7hHzKSA-spoteh7tw8zMKRh0O2tlp-BXtiVBC81tDoQw6hIGK02xGeJnxQ8u1iXdD8bAFzhaE755YWhkrkyTwY5RKPDKXsSYodY4Xw-9GGDri-mwx-IduAZ1vVjiPAy9YL38BmQU1C-NOON2rS5um49O66yhTf8RG7vF3_YEFQvz69LXtv9ix0kDc-RkZHSINXgMxMfRbVzhu4WYZaGYMNDMGmhkDzeziBRZuGVCaM4MwHnXwtKhlePkbyQ3tRufxeX1rfvbq1qRzqyPn9Z371y99q29947yorwX0c0Ozk87h3oiaHwHAavRzaCCG4VdKf7B3_4U-5OzAtj1TZecs3t7sIph5lT8dXqZeRqb8vQf_Hj_lH_sr49pSAtEg7IXfcbo7O-odIdeZ1PHR8OinX5XmmCHxLpFVCuX4dfTrf1L-tcA).
  This address carries the chart text itself, so it draws the chart as of the last render.
- **On this PC:** [`pstack-workflow-ai4good.svg`](file:///C:/Users/nirdr/Downloads/ai4good/.claude/skills/work/pstack-workflow-ai4good.svg),
  which the default handler for `.svg` opens, normally the browser.

Regenerate both after every chart edit with
[`loop/work/render-mermaid.ps1`](../../../loop/work/render-mermaid.ps1)
`-Markdown .claude/skills/work/pstack-workflow-ai4good.md`. The script writes the SVG, prints
the browser address to paste here, and fails on a syntax error in the chart.

```mermaid
flowchart TB
  subgraph CTRL["Controller: local session, branch main, /controller ID"]
    direction TB
    subgraph PA["Phase A: decide what"]
      direction TB
      A1["Resolve the item on Linear: id, label, gitBranchName, state, blockers"]
      A2["Walk parent upward, label every link of the chain"]
      A3["Startability: missing, Done, Cancelled, or blocked stops here"]
      A4["Root with nothing above it: ask the founder once"]
      A1 --> A2 --> A3 --> A4
    end
    subgraph PB["Phase B: start the item"]
      direction TB
      B1["git fetch origin, then git branch BRANCH origin/main"]
      B2["git worktree add worktrees/ITEM BRANCH"]
      B3["Reserve-DbSlot for the local gate. Full pool stops here"]
      B4["Claim: assign, In Progress, Set-HeldItem"]
      B5["Write loop/items/ITEM/brief.md: chain, PRD slice, item text, acceptance tests, the ask, the evidence bar"]
      B6["Commit the brief on the branch, push"]
      B7["From the worktree: claude --cloud 'Read loop/items/ITEM/brief.md and follow it.'"]
      B8["Record the session id and link in loop/items/ITEM/mechanic.md, push"]
      B1 --> B2 --> B3 --> B4 --> B5 --> B6 --> B7 --> B8
    end
    subgraph PW["While the mechanic runs"]
      direction TB
      W1["No timers, no wake-ups. gh pr list --head BRANCH finds the pull request"]
      W2["Founder rulings go to the mechanic with claude -p 'MESSAGE' --cloud SESSION-ID"]
      W3["A question from the mechanic reaches the founder verbatim"]
      W1 --> W2 --> W3
    end
    subgraph PC["Phase C: close the item"]
      direction TB
      C1["Fetch the pull request head into the worktree"]
      C2["Run the verify suite for the acceptance tests on the reserved slot"]
      C3["Read the Verification section. Same checks? CI green on the exact head?"]
      C4{"Gate passes?"}
      C5["Send the failure to the mechanic verbatim, wait"]
      C6["gh pr merge N --squash. The merge closes the item"]
      C7["Sweep: Release-DbSlot, Clear-HeldItem, remove the worktree, delete the remote branch"]
      C8["Fold upward: all children Done or Cancelled closes the parent"]
      C9["session is free. Suggest the next /controller"]
      C1 --> C2 --> C3 --> C4
      C4 -- no --> C5
      C4 -- yes --> C6 --> C7 --> C8 --> C9
    end
    PA --> PB
  end

  subgraph MECH["Mechanic: cloud session on the item branch, poteto-mode"]
    direction TB
    subgraph S1["1 Ground: /how"]
      direction TB
      G1["Lead splits the question into 2 to 4 disjoint slices"]
      G2["One explorer per slice, read-only, sheet role how explorer"]
      G3["Explainer merges the findings into one explanation, sheet role how explainer"]
      G4{"Request asks for problems?"}
      G5["One critic per how critics entry, each with the explanation, the paths, and the 6-lens rubric"]
      G6["Lead rules each finding: Act on, Consider, Noted, Dismissed"]
      G1 --> G2 --> G3 --> G4
      G4 -- yes --> G5 --> G6
      G4 -- no --> S2
    end
    subgraph S2["2 Design arena: /architect and /arena"]
      direction TB
      D1["Lead derives a rubric of 3 to 6 criteria. Candidates never see it"]
      D2["Architect runners fan out, one design each with its rationale, sheet role architect runners"]
      D3["Design-red-flags screen on every candidate: shallow module, information leakage, temporal decomposition, pass-through"]
      D4["Cross-judges score against the rubric. Judge provider differs from the parent and the front-runner"]
      D5["Lead reads every candidate end to end, picks a base, grafts the best parts of the others"]
      D6{"Candidates converge?"}
      D7["Reframe the task, run the arena again"]
      D1 --> D2 --> D3 --> D4 --> D5 --> D6
      D6 -- no --> D7 --> D2
    end
    subgraph S3["3 Throughput checkpoint"]
      direction TB
      T1["Blocking first steps: gates before fan-out"]
      T2["Independent workstreams: disjoint files parallelize, shared writes serialize"]
      T3["Shared mutable state: split the target before serializing"]
      T4["Smallest safe decomposition. One writer? say why"]
      T1 --> T2 --> T3 --> T4
    end
    subgraph S4["4 Write: one unit at a time"]
      direction TB
      X1["Lead writes the unit brief: paths it may write, the data shape, the acceptance criteria"]
      X2["Lead creates a dedicated worktree, spawns one writer in isolated-write mode, sheet role by task type"]
      X3["Writer writes the failing test from the acceptance criteria"]
      X4["Writer watches the test fail"]
      X5["Writer implements until the test passes, commits"]
      X6["Writer reports: done, BLOCKED, deviations, or a partial at the time limit"]
      X7{"Report clean?"}
      X8["Escalate: respawn fresh, raise effort, hardest tasks role, re-arena, or scrap. Two retries then replan"]
      X1 --> X2 --> X3 --> X4 --> X5 --> X6 --> X7
      X7 -- no --> X8 --> X2
    end
    subgraph S5["5 Diff against the sketch"]
      direction TB
      R1["Lead reads the writer's diff against the design"]
      R2["Each deviation is one of: sketch wrong, requirement missed, overreach"]
      R3{"A pattern of deviations?"}
      R1 --> R2 --> R3
    end
    subgraph S6["6 Verify on the real surface"]
      direction TB
      V1["Lead runs verify-ai4good: launch, doctor, drive the feature"]
      V2["Evidence on cloud: HTTP responses and database side effects. Headless Playwright where the sandbox has it"]
      V3{"Proof in hand?"}
      V4["Not done. Back to the unit"]
      V1 --> V2 --> V3
      V3 -- no --> V4 --> X1
    end
    subgraph S7["7 Sequence"]
      direction TB
      Q1["Rebase into small ordered commits"]
      Q2["Each commit builds and verifies alone"]
      Q1 --> Q2
    end
    subgraph S8["8 Interrogate: /interrogate"]
      direction TB
      I1["Lead scopes the diff and writes the intent paragraph"]
      I2["One reviewer per interrogate reviewers entry, read-only, identical rubric"]
      I3["Lead synthesizes: consensus, duplicates removed, disagreements listed, agreement map"]
      I4["Lead rules each finding: Act on, Consider, Noted, Dismissed"]
      I5{"Any Act on?"}
      I6["Fix through a writer. The changed head voids the verdict"]
      I1 --> I2 --> I3 --> I4 --> I5
      I5 -- yes --> I6 --> I2
    end
    subgraph S9["9 Ship: opening-a-pr"]
      direction TB
      P1["deslop, no-comments, unslop over the diff and the prose"]
      P2["Conventional commit messages"]
      P3["Pull request body: Why, Scope, Tradeoffs, Blast Radius, Verification with named checks and timestamps, Not done here"]
      P4["No other item's id in the title or body"]
      P5["Open the pull request from the item branch. Never a draft. Do not merge"]
      P1 --> P2 --> P3 --> P4 --> P5
    end
    G6 --> S2
    D6 -- yes --> S3
    T4 --> X1
    X7 -- yes --> R1
    R3 -- yes --> D1
    R3 -- no --> V1
    V3 -- yes --> Q1
    Q2 --> I1
    I5 -- no --> P1
  end

  B8 -- "dispatch: the cloud VM clones the item branch" --> G1
  P5 -- "the pull request is the signal" --> W1
  W1 --> C1
  C5 -- "fix and push" --> I1
```

The controller owns the board, the branch, the database slot, the brief, the gate, and the
merge. The mechanic owns everything between the brief and the pull request. The cloud
environment runs the Supabase pool in Docker and holds codex and opencode credentials.

The controller's manual is [`.claude/skills/controller/SKILL.md`](../controller/SKILL.md). The
controller starts the mechanic with `claude --cloud "Read loop/items/<item>/brief.md and follow
it."` from a linked
worktree on the pushed item branch, because a cloud session clones the remote at the current
directory's branch. It sends follow-ups with `claude -p "<message>" --cloud <session-id>`. The
cloud VM has its own one-slot database pool (`AT_DB_SLOT=1`). The controller's local slot serves
the local gate only.

Work that the mechanic discovers does not ride along. The mechanic lists it in its report. The
controller judges each entry as a filing candidate. The founder files items.

## 3. The nine stations

Each row gives the station, who acts, the sheet roles it uses, and the station's loop or exit.
The models behind each role are in the sheet-roles table below. "Lead" in the role column
means the lead does the work itself and no sheet role applies.

| # | station | who acts | sheet roles | loop or exit |
|---|---|---|---|---|
| 1 | Ground ([`/how`](file:///C:/Users/nirdr/.claude/plugins/cache/open-pstack/pstack/1.2.0/skills/how/SKILL.md)) | Two to four explorers with disjoint slices, then one explainer. Critics run only when the request asks for problems. | `how explorer`, `how explainer`, `how critics` | The lead rules each critic finding: Act on, Consider, Noted, or Dismissed. |
| 2 | Design arena ([`/architect`](file:///C:/Users/nirdr/.claude/plugins/cache/open-pstack/pstack/1.2.0/skills/architect/SKILL.md), [`/arena`](file:///C:/Users/nirdr/.claude/plugins/cache/open-pstack/pstack/1.2.0/skills/arena/SKILL.md)) | Runners fan out, each with a rationale. Cross-judges score against a rubric of three to six criteria that the runners never see. The design-red-flags screen runs on every candidate. The lead reads every candidate end to end, picks a base, and grafts the best parts of the others. | `architect runners`, `arena runners`, `arena cross-judge pool` | If the candidates converge, ship the design. If they diverge, reframe the task and run the arena again. |
| 3 | Throughput checkpoint | The lead writes four todos. A todo that does not apply stays as `n/a: <reason>`. | Lead | None. |
| 4 | Write | One delegated writer per unit, in its own worktree, in isolated-write mode. The writer is a leaf and spawns nothing. The writer first writes the failing test from the lead's acceptance criteria, watches it fail, then implements. | `feature, refactoring`, `bug-fix`, `perf-issue`, `hillclimb`, `hardest tasks` | The writer reports `BLOCKED`, a list of deviations, or a partial result at its time limit. The lead escalates (section 6). |
| 5 | Diff against the sketch | The lead reads the diff against the design. Each deviation is one of: the sketch was wrong, a requirement was missed, or the writer overreached. | Lead | A pattern of deviations sends the item back to station 2. |
| 6 | Verify | The lead drives [`verify-ai4good`](../verify-ai4good/) on the real surface. On cloud the evidence is HTTP responses and database side effects. Headless Playwright is used where the sandbox provides it. | Lead | No proof means not done. |
| 7 | Sequence | The lead orders commits so that each one builds and verifies alone. | Lead | None. |
| 8 | Interrogate ([`/interrogate`](file:///C:/Users/nirdr/.claude/plugins/cache/open-pstack/pstack/1.2.0/skills/interrogate/SKILL.md)) | A read-only panel. Every reviewer gets the same rubric. The lead merges the consensus, removes duplicates, and rules on each finding. | `interrogate reviewers` | pstack has no re-clearance loop. Our rubric adds one line: "A changed head voids the verdict. Re-panel." |
| 9 | Ship ([`opening-a-pr`](file:///C:/Users/nirdr/.claude/plugins/cache/open-pstack/pstack/1.2.0/skills/poteto-mode/playbooks/opening-a-pr.md)) | The lead runs deslop, no-comments, and unslop, writes conventional commits, and fills the sections Why, Scope, Tradeoffs, Blast Radius, and Verification. The pull request is never a draft. Opening a pull request and babysitting it are two verbs. | `judgment and prose` | Babysit is not used here. It is a second way to close work, which the way of work forbids. |

The verbs fix-ci, deslop, and recall run on the lead with no pin. pstack has no verifier role.
The verifier rule is a line in the user-level [`CLAUDE.md`](file:///C:/Users/nirdr/.claude/CLAUDE.md) (section 5).

The critic rubric ([`critique-rubric.md`](file:///C:/Users/nirdr/.claude/plugins/cache/open-pstack/pstack/1.2.0/skills/how/references/critique-rubric.md)) has six lenses: abstraction fit, data model, boundary discipline, evolution
readiness, complexity against value, and consistency. A critic uses the lenses that apply.

### The sheet roles

The sheet [`~/.claude/pstack-models.md`](file:///C:/Users/nirdr/.claude/pstack-models.md) has one row per role. The table gives every documented
role with three values. **pstack default** is the first-run value the plugin ships. **First
write** is what `/pstack:setup-pstack` will write for ai4good: the shipped defaults with the
grok family on the codex router (section 4). The sheet is not written yet. **Target** is the
sheet from section 6, applied on a rerun after one item has run on the first write.

Descriptor shorthand: `fable` is `claude:claude-fable-5`, `sol` is `codex:gpt-5.6-sol`, `grok`
is `codex:opencode-go-responses/grok-4.6`, and `opus` is `claude:claude-opus-5`. A list is a
panel, and the list length is the fan-out count.

| sheet role | station | pstack default | first write | target |
|---|---|---|---|---|
| `feature, refactoring` | 4 | grok@xhigh | grok@xhigh | grok@high |
| `bug-fix` | 4 | sol@max | sol@max | sol@high |
| `perf-issue` | 4 | sol@max | sol@max | sol@high |
| `hillclimb` | 4 | sol@max | sol@max | sol@high |
| `hardest tasks` | 4 | fable@max | fable@max | fable@max |
| `judgment and prose` | 9 | fable@max | fable@max | fable@max |
| `how explorer` | 1 | grok@xhigh | grok@xhigh | grok@high |
| `how explainer` | 1 | fable@max | fable@max | fable@max |
| `how critics` | 1 | fable@max, sol@max, grok@xhigh, opus@xhigh | same | fable@max, sol@max, grok@xhigh |
| `why investigators, synthesizer` | not a station | inherit-parent | inherit-parent | inherit-parent |
| `reflect tooling, judgment, divergent, synthesizer` | not a station | inherit-parent | inherit-parent | inherit-parent |
| `arena runners` | 2 | fable@max, sol@max, grok@xhigh, opus@xhigh | same | fable@max, sol@max, grok@xhigh |
| `arena cross-judge pool` | 2 | fable@max, sol@max, grok@xhigh, opus@xhigh | same | fable@max, sol@max, grok@xhigh, opus@xhigh |
| `swarm workers` | any `/swarm` call | grok@xhigh | grok@xhigh | grok@high |
| `architect runners` | 2 | fable@max, sol@max, grok@xhigh, opus@xhigh | same | fable@max, sol@max, grok@xhigh |
| `interrogate reviewers` | 8 | fable@max, sol@max, grok@xhigh, opus@xhigh | same | fable@max, sol@max, grok@xhigh |

The `why` and `reflect` rows stay `inherit-parent` because those skills need the MCP surface,
which external lanes never get. grok has no `max` in its selectable efforts, so its panel lanes
stay at `xhigh` in the target.

## 4. The model matrix as it will be configured

The shipped matrix lives in [`provider-dispatch.md`](file:///C:/Users/nirdr/.claude/plugins/cache/open-pstack/pstack/1.2.0/skills/poteto-mode/references/provider-dispatch.md)
(source: [GitHub](https://github.com/ericlitman/open-pstack/blob/main/skills/poteto-mode/references/provider-dispatch.md)). One row changes.

| family | provider | model | default effort | selectable efforts | route |
|---|---|---|---|---|---|
| fable | claude | claude-fable-5 | max | low, medium, high, xhigh, max | native agents `pstack-fable-<effort>` |
| sol | codex | gpt-5.6-sol | max | low, medium, high, xhigh, max | external runner |
| grok | codex | opencode-go-responses/grok-4.6 | xhigh | low, medium, high, xhigh | external runner. This is our change (founder 2026-08-29). |
| opus | claude | claude-opus-5 | xhigh | low, medium, high, xhigh, max | native agents `pstack-opus-<effort>` |

The sheet [`~/.claude/pstack-models.md`](file:///C:/Users/nirdr/.claude/pstack-models.md) maps
each role to one or more descriptors of the form `provider:model@effort`.
[`/pstack:setup-pstack`](file:///C:/Users/nirdr/.claude/plugins/cache/open-pstack/pstack/1.2.0/skills/setup-pstack/SKILL.md)
writes the sheet and adds one line, `@~/.claude/pstack-models.md`, to the user-level
[`~/.claude/CLAUDE.md`](file:///C:/Users/nirdr/.claude/CLAUDE.md). The project
[`CLAUDE.md`](../../../CLAUDE.md) is never touched. A role name that the sheet does not document is "inconsistent state" and
stops setup.

Other router models available for later trials: `opencode-go/deepseek-v4-pro` (high, max),
`opencode-go/kimi-k3` (low, high, max), `opencode-go/glm-5.3` (high, max), `gpt-5.6-luna` and
`gpt-5.6-terra` (low to max). This list is partial.
[`~/.codex/codex-router/merged-models.json`](file:///C:/Users/nirdr/.codex/codex-router/merged-models.json)
holds the full catalog.

## 5. Why the grok row changes, and how roles get their models

`/pstack:setup-pstack` probes all four families live before it writes anything. If one probe
fails, setup writes nothing. This machine has no Grok CLI, so the shipped grok row fails its
probe. The codex router serves grok-4.6 under the slug `opencode-go-responses/grok-4.6`, and
[`pstack-runner`](file:///C:/Users/nirdr/.claude/plugins/cache/open-pstack/pstack/1.2.0/skills/poteto-mode/scripts/runner/pstack-runner)
takes the model as a free string. So the row keeps its model and changes its
provider to codex. Every role that names grok keeps its meaning.

To add a model later, edit its matrix row, rerun setup, and let setup probe it. Custom rules
that pstack does not model, such as a verifier rule or a tier map, go in the user-level
[`CLAUDE.md`](file:///C:/Users/nirdr/.claude/CLAUDE.md) as plain lines. They do not go in the sheet.

## 6. The target sheet, and why it is shaped for escalation

The target sheet was designed on 2026-08-28. Its row values are the **target** column of the
sheet-roles table in section 3. Apply it on a rerun of setup after one item has run on the
first write.

- Writers run at `@high`, not `@max`. The unused effort is the first escalation step.
- `hardest tasks` is `claude:claude-fable-5@max`. It is the named escalation target.
- Every panel has three lanes from three vendors: fable, sol, and grok. Two lanes from one
  family do not add an independent view.
- Opus appears in `arena cross-judge pool` only. It is never a writer lane.
- Two lines in the user-level [`CLAUDE.md`](file:///C:/Users/nirdr/.claude/CLAUDE.md): "The verifier is a sonnet-class model from a different
  family than the writer." A tier map (docs, mechanical, standard, sensitive, each with a panel
  width) waits for a founder ruling, because it loosens the process.

Escalation happens after the fact, through reports, because a worker cannot ask a question.
The steps, from cheapest:

1. In the lane: the writer's own red-green loop and its retries.
2. The report: `BLOCKED`, a list of deviations, or a partial result at the time limit. Never
   silence.
3. The lead: respawn fresh, raise the effort, move the unit to `hardest tasks`, run the arena
   again, or scrap the loop.
4. A human: irreversible actions, calls that the lead cannot settle, batched at the gates.

After two retries of one unit, abandon it and replan.

## 7. How to test a candidate model for a sheet role

Run the cheapest test first. Stop when the candidate fails.

1. Replay one finished station with the candidate in that one seat. The receipts hold the
   inputs. Grade the output against the known-good answer.
2. Run an arena with the candidate and the incumbent as two lanes and one judge from a third
   family.
3. As the last confirmation, run one item end to end twice, in two cloud sessions. Do not use
   two worktrees on one machine, because the database slots and the CPU contend. Score each
   station from its receipts. Blind the run as the [eval playbook](file:///C:/Users/nirdr/.claude/plugins/cache/open-pstack/pstack/1.2.0/skills/poteto-mode/playbooks/eval.md) requires: no words like eval,
   test, judge, or candidate anywhere visible, organic prompts, sanitized directories, one
   blinded judge from another family, one pass, and verification read from the transcripts.

A false green disqualifies a candidate at any price. Cost decides only between candidates that
told the truth.

## 8. Context and cache discipline for the mechanic

- The project [`.claude/settings.json`](../../settings.json) sets `CLAUDE_CODE_PROMPT_CACHE_TTL=1h` and
  `CLAUDE_CODE_SUBAGENT_PROMPT_CACHE_TTL=1h` in its `env` block. The settings take effect from
  client 2.1.242.
- The mechanic ends when the item closes. At every phase boundary the lead writes a canon file.
  The canon file survives a compact and lets a fresh session resume after a crash. Autocompact
  stays on. The pstack session-start hook injects its mandate again after each compact.
- The controller cannot compact the mechanic from outside. When the mechanic's context is
  full, write the canon file and start a fresh session. Do not send wake-up messages to keep a
  cache warm.

## 9. Where our two gates fit

- Gate 1, the plan review, is the design arena plus one interrogate pass over the plan with our
  plan rubric.
- Gate 2, the diff review, is interrogate over the diff with one added rubric line: "A changed
  head voids the verdict. Re-panel."
- The brief carries the evidence bar: the named checks and their timestamps in the pull
  request's Verification section, and CI green on the final head. Before the merge, the
  controller runs the suite again locally on its reserved slot.

## 10. How to finish the bring-up

Done: the plugin is installed, the session-start hook is kept, the project [`CLAUDE.md`](../../../CLAUDE.md) is lean,
the stamp and the reply header are parked, the branch guard skips cloud sessions, and the cloud
banner is kept.

Do these steps in order:

1. In [`provider-dispatch.md`](file:///C:/Users/nirdr/.claude/plugins/cache/open-pstack/pstack/1.2.0/skills/poteto-mode/references/provider-dispatch.md),
   change the grok row to provider `codex` and model `opencode-go-responses/grok-4.6`.
2. Run [`/pstack:setup-pstack`](file:///C:/Users/nirdr/.claude/plugins/cache/open-pstack/pstack/1.2.0/skills/setup-pstack/SKILL.md).
   Answer the four effort questions, let the four probes run, confirm the rendered sheet, and
   let the smoke panel run.
3. Add the verifier line to the user-level [`~/.claude/CLAUDE.md`](file:///C:/Users/nirdr/.claude/CLAUDE.md).
4. Run [`/pstack:create-verification-skill`](file:///C:/Users/nirdr/.claude/plugins/cache/open-pstack/pstack/1.2.0/skills/create-verification-skill/SKILL.md)
   once and commit [`.claude/skills/verify-ai4good/`](../verify-ai4good/) as a repo product.
5. Run one item with [`/controller <id>`](../controller/SKILL.md). The controller writes the
   brief, spins the mechanic, and gates the pull request on return.

Three rulings are open and belong to the founder: who gates the merge (the recommendation is the
controller), the exact text of the evidence bar in the brief, and one pull request per item
against stacked pull requests.

## 11. Changes to this file

- 2026-08-29. Created from the education record. Recorded the grok row change, the parked
  stamp, local banner, and reply header, and the cloud-safe branch guard. Rewritten to the
  technical-writing standard the same day.
- 2026-08-29. Added the controller skill. Section 2 now names how the controller starts and
  steers the mechanic (`claude --cloud`, `claude -p --cloud`). The brief no longer carries
  `AT_DB_SLOT`. The cloud VM sets its own.
- 2026-08-29. Added the sheet-roles table: every role with its pstack default, the first
  write for ai4good, and the target. The stations table now names roles only.
- 2026-08-29. Every file reference is a link: relative for repository files, `file:///` for
  this PC's copies, GitHub for the plugin source.
- 2026-08-29. The flow chart shows every internal step of every phase: the controller's four
  phases and the mechanic's nine stations with their loops.
- 2026-08-29. The chart is also an SVG beside this file, rendered by
  `loop/work/render-mermaid.ps1`. Regenerate it after every chart edit.
