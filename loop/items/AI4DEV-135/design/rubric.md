# Rubric for the scope-run design arena

Success: one design that all six units can be built against in order, each unit green before
the next, without a scrap mid-run. Score each criterion 1 to 5.

1. **Constraint fidelity.** The design honours the immutable turn ledger, the three free-billing
   CHECKs that fight a zero-cost free turn, the tenant read posture, the write-route inventory,
   the taxonomy rules, and the fixed stream format. Name every place it breaks one, or would
   have to change one, and whether it says so.
2. **Interface depth.** The public surface (routes, reads, model tools, stream parts) is small and
   hides the complexity. One flow (generate, regenerate, remove a label, hit the ceiling) is
   traceable in three files or fewer.
3. **Provability.** Each of the sixteen acceptance ids has a concrete loop-tier proof through
   the stand-in and an honest integration-tier claim (green, or red under a named pending
   capability with a reason). The model-judgment ids (label reuse) split the two tiers cleanly.
4. **One model for versions.** Scope versions, regeneration count, the logged reason, zero
   cost, escalation, and the system-error retry live under one mental model, not four.
5. **Blast radius.** How much tested code from the credits and intake runs changes. Fewer
   migrations touching `discovery_turns`, fewer changes to the settle RPC and its CHECKs,
   no risk to AT-004.10, AT-004.49, AT-003.17, and the write-route and sole-writer scans.
6. **Smallness.** No speculative flexibility. Every table, column, route, and tool earns its
   place in a named acceptance id.
