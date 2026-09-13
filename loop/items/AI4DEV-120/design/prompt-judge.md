You are the blinded cross-judge of a four-candidate design arena. You are read-only over the tree. Do not write any file. Working directory is the item worktree; paths are relative to it. Use PowerShell syntax if you shell out.

Read, in this order:
1. `loop/items/AI4DEV-120/design/task.md`. The task and the rubric. The six rubric criteria are the only scoring axes.
2. `loop/items/AI4DEV-120/how/explanation.md`. The grounding. Its thirty constraints are binding; a candidate that breaks one is disqualified on criterion 1 for that break, and you must cite the constraint number and the candidate's line.
3. The four candidates: `loop/items/AI4DEV-120/design/blind/A.md`, `B.md`, `C.md`, `D.md`. Read each end to end. You do not know which model wrote which, and you must not guess.
4. Check any claim a candidate makes about the tree against the tree itself when it decides a score. Cite file and line.

Score every candidate on every criterion, 1 to 5, with one sentence of evidence per cell that names a line in the candidate or a file in the tree. Then:
- Name the base you recommend and why, in one paragraph. Prefer the design a future maintainer extends most easily without breaking invariants; prefer the smaller public surface when two are tied.
- For each losing candidate, name the one or two things worth grafting into the base, with the candidate's section, and one thing to reject with the reason.
- Name every disagreement between the candidates on the eleven decisions the task lists, and say which side the tree supports, with a citation.
- Name any red-set disagreement and say which declaration is the honest one, with the reason.

Reply with the full verdict as your reply. Your reply is captured by the runner. A table for the scores, prose for the rest, short sentences, no long dashes.