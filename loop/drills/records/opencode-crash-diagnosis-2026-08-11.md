# The flash-lane fatal crashes — vendor diagnosis and the fixes taken (2026-08-11)

Four review runs died mid-flight across two items (two audit seats on the sessions item, two
gate seats on the integration-verification item): process exits, stdout empty, no verdict, and
a wrapper-reported ripgrep output-size error. The founder put a diagnosis prompt to the opencode
CLI agent; its findings, verified against the v1.18.15 source, are recorded here because they
drove contract changes.

## Root cause, in one paragraph

opencode's grep tool bounds match COUNT (100), match line TEXT (2,000 chars) and each ripgrep
JSON RECORD (64 KiB) — but the record guard fires only after the record is fully buffered. A
grep matching a file whose single LINE is huge makes ripgrep emit one record holding the whole
line; far above the guard the process dies at runtime level (memory spike, no recovery path, no
setting converts it into a tool error). The death is grep-pattern-dependent, which produced our
roughly one-in-three failure rate.

## Our exposure, measured in this repository

The single-line giants are OUR OWN COMMITTED EVIDENCE: codex stderr logs under
`loop/items/*/artifacts/` carry single lines up to 1,048,353 characters — sixteen times the
64 KiB guard. `*.log` is gitignore-matched, and the crashes happened anyway, so the tool reads
ignore-matched files; ignore rules are not a fence here.

## Fixes taken (all in the same commit as this record)

1. **The `reviewer-flash` cage gains GREP DISCIPLINE**: every grep names a path or include
   filter; never a bare pattern at repo root; NEVER grep or read `loop/items/*/artifacts/` or
   any `*.log`; large files by offset and limit; a record-size error means narrow, never repeat.
2. **The runner's opencode recipe gains `--print-logs --log-level DEBUG`**, so a runtime death
   leaves its story in the stderr capture — and on an empty or dead gate in this lane the runner
   now captures the newest `*_server.log` and any fresh `tool_*` spill file into the artifacts
   before reporting, because those expire in seven days.
3. **opencode upgraded 1.18.15 → 1.18.16** — the vendor reworked tool-output bounding after
   1.18.15; re-test before filing anything upstream.

## Left deliberately undone

- No `.gitignore` additions: the giants are already ignore-matched and the tool reads them
  regardless, so the prompt-level ban is the working fence.
- Nothing filed upstream yet: the vendor's own advice is upgrade-and-retest first; the next
  crash, if any, now leaves the logs a report needs.
