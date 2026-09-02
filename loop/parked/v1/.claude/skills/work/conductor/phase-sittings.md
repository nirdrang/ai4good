# Sitting type selection

Read this before the item's first sitting spawn, and read it again when the coordinator says
premium credit is out. It decides ONE thing: which agent type the next sitting spawn uses.
The spawn mechanics — no isolation parameter, no model parameter, the report-to address —
live in the contract and are not repeated here.

Two types exist. They are the same role with the same body; only the pinned model and effort
differ.

- `orchestrator` — the premium model. Use it for the PLAN sitting, the DRAFT sitting, every
  FIX-AND-GOAL sitting, and the FIRST audit sitting.
- `orchestrator-opus` — opus at maximum effort. Use it BY DESIGN, not as a fallback, for the
  MERGE sitting and for an AUDIT RE-RUN sitting. The founder ruled this split (2026-08-11) to
  spare premium credit on the sittings where opus at maximum effort is enough.

The first audit and a re-run land on different types, so tell them apart by evidence, not by
feel:

- FIRST audit = the audit gate's first findings on this item. Type: `orchestrator`.
- RE-RUN = `PHASE-STATE.md` ordered the audit again at a NEW head, with the fix delta named.
  Type: `orchestrator-opus`.

The credit fallback: once the coordinator says the premium model is out of credit, EVERY
later sitting spawns as `orchestrator-opus`. This is a TYPE switch, never a model override.
The agent definition pins model and effort together, and a model parameter on the spawn
silently drops the effort pin — the override looks like it worked while the effort quietly
vanishes. That is why the contract bans the model parameter everywhere.

This selection completes when the sitting is spawned as the right type and the spawn is
logged with its task id. The table does not change mid-item except on the credit signal.
