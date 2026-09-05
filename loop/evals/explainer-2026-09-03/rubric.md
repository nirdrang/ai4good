# Rubric for the explanation review (held back from the writers)

Variant under test: which model writes the how explainer's explanation from four explorer notes. Three explanations of the same tree at commit f81062e, from the same four notes, by three writers the reviewer never learns.

Criteria, each scored per explanation on one scale (0 to 5, 5 best), with evidence:

1. **Factual accuracy against the code.** Every claim that names a file, function, line, port, count, or default is checked against the tree. Count the errors. 5 = none found in a full read; 0 = five or more.
2. **Coverage of the notes.** Every fact in the four explorer notes that the question needs (what depends on what, what can be parked, what stays green) appears in the explanation. Count the omissions. 5 = none; 0 = five or more.
3. **No unsupported claims.** Claims that neither the notes nor the code support. Count them.
4. **Dependency map.** The explanation says, for each thing the question names (slot machinery, v1 agents and scripts, the CI twin-guard step, the harness freeze, the one stack), what it touches and what touches it, well enough to plan the parking without reading the code. 5 = complete and correct; 0 = absent.
5. **Reader load.** A senior engineer new to the area can follow it front to back without re-reading; the structure matches the question; nothing is padded.

The reviewer reads all three in one pass, scores all five criteria for each on the same scale, lists the errors and omissions with file and line evidence, then ranks the three with one sentence per rank.
