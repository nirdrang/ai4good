# Acceptance Tests — conventions

One file per requirement (`at-req-0NN.md`), derived from `.taskmaster/docs/prd-mvp.md` (the gated MVP PRD). These drive the per-requirement code-then-verify loop: a requirement is **complete** only when every P0 test passes.

**Conventions**
- Test ID: `AT-0NN.MM` (requirement number . test number). IDs are stable — never renumber; retire with `[retired]`.
- Priority: **P0** = completion-gating for the requirement; **P1** = should-pass, non-gating.
- Form: Given / When / Then, one observable assertion per test. No design assumptions — tests assert externally observable behavior (UI state, API response, notification, audit record, ledger/log row), never internals.
- `[cross: REQ-0XX]` marks a test that exercises this requirement's boundary with another; it gates THIS requirement only for the behavior owned here.
- Each file ends with a **Coverage map** (requirement clause → test IDs) — the completeness contract for the verification loop.
- Critique: each file gets exactly one adversarial codex review round (gpt-5.6-sol, xhigh); folds are annotated `[cx]` on amended tests.

**Source of truth:** prd-mvp.md. Each requirement is also **isolated** into `.taskmaster/docs/requirements/req-0NN.md` (verbatim extract) — the self-contained unit of work for AT-authoring, critique, and the coding loop. The PRD stays authoritative; re-extract an isolated file if its REQ section changes.

**Per-requirement pipeline (parallel across requirements):**
1. Isolate the REQ → `requirements/req-0NN.md`.
2. Author `acceptance/at-req-0NN.md` from the isolated requirement.
3. Codex adversarial critique (gpt-5.6-sol, xhigh) against the isolated req + PRD-for-conflicts-only — **two rounds**. Round 1 on the authored doc; round 2 on the folded doc (catches round-1 misses + edit-introduced issues; does not re-flag resolved items).
4. Fold after each round; annotate amended tests `[cx]`, dropped tests `[retired]`.
Steps run concurrently across different requirements; each requirement stays a separate file end-to-end.
