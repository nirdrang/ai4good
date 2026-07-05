You are the FRESH-READER test in a PRD-improvement loop. You have ZERO context beyond the document itself — no design threads, no conversation history, no assumptions about intent.

Read the ENTIRE file `.taskmaster/docs/prd.md` as if you were an implementer hired today to build it.

List every implementation question you CANNOT answer from the document alone — places where you would have to guess, ask a human, or invent an answer to write code or a Linear issue.

Classify each question:
- "missing-info": the document's authors know the answer; the text just doesn't carry it (routable to a rewrite).
- "missing-decision": nobody has decided; a human call is required first (routes to the decision queue).

Materiality filter: only questions where guessing wrong wastes real build effort. Skip style, naming taste, and questions the doc explicitly defers with a trigger.

OUTPUT: ONLY a JSON array, no prose:
[{"question": "...", "section": "<nearest heading>", "class": "missing-info|missing-decision", "wrong_guess_cost": "<one sentence>"}]
