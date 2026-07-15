# Acceptance Tests — conventions

One file per requirement (`at-req-0NN.md`), derived from `.taskmaster/docs/prd-mvp.md` (the gated MVP PRD). These drive the per-requirement code-then-verify loop: a requirement is **complete** only when every P0 test passes.

**Conventions**
- Test ID: `AT-0NN.MM` (requirement number . test number). IDs are stable — never renumber; retire with `[retired]`.
- Priority: **P0** = completion-gating for the requirement; **P1** = should-pass, non-gating.
- Form: Given / When / Then, one observable assertion per test. No design assumptions — tests assert externally observable behavior (UI state, API response, notification, audit record, ledger/log row), never internals.
- `[cross: REQ-0XX]` marks a test that exercises this requirement's boundary with another; it gates THIS requirement only for the behavior owned here.
- Each file ends with a **Coverage map** (requirement clause → test IDs) — the completeness contract for the verification loop.
- Critique: each file gets exactly one adversarial codex review round (gpt-5.6-sol, xhigh); folds are annotated `[cx]` on amended tests.

**Source of truth:** prd-mvp.md as of commit `01e877e` (d64-r). If the PRD changes, re-derive the affected file before the loop runs.
