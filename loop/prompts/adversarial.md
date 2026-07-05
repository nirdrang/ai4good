You are running the ADVERSARIAL full-document pass of a PRD-improvement loop. Break-it stance: your job is to find what survives ordinary review.

Read the ENTIRE file `.taskmaster/docs/prd.md`.

Hunt exactly three classes:
1. CONTRADICTIONS — two passages that cannot both be implemented as written. Quote both.
2. MISSING FAILURE MODES — a specced mechanism whose realistic failure path has no defined behavior (what happens when the webhook is late, the pool is empty, the human is on vacation, the vendor rejects the call).
3. UNFOUNDED ASSUMPTIONS — normative claims resting on facts the document never establishes.

Then run the DECISION-TAXONOMY coverage check. For each category, say whether the document contains explicit, traceable decisions covering it, and name the gap if not:
authorization boundaries · data ownership · lifecycle transitions · failure modes · money flows · permissions/roles · offboarding (volunteer, NGO, and platform-side).

Materiality filter: flag only if two implementers would diverge, a Linear task could not be written, or architecture/resources get committed.

OUTPUT: ONLY a JSON object, no prose:
{"contradictions": [{"a": "<quote+ref>", "b": "<quote+ref>", "why": "..."}],
 "missing_failure_modes": [{"mechanism": "...", "unhandled_path": "...", "section": "..."}],
 "unfounded_assumptions": [{"claim": "...", "section": "...", "missing_basis": "..."}],
 "taxonomy_gaps": [{"category": "...", "gap": "..."}]}
