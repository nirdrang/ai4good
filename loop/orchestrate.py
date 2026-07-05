#!/usr/bin/env python3
"""PRD improvement loop — deterministic orchestrator (no LLM routing).

Commands:
  gate      run the deterministic gate only (no model calls)
  baseline  gate + full-doc baseline evaluation + adversarial pass + fresh-reader
            test; writes loop/out/baseline-report.md + loop/decision-queue.md and
            appends loop/state/scores.jsonl
  iterate   NOT ENABLED — generation is stubbed until the founder has reviewed
            baseline evaluator quality (run-1 scoping decision, 2026-07-05)

All model calls go through local CLIs (codex for evaluation) — no API keys here.
The loop never writes the canonical PRD; candidates land in loop/out/ only.
"""
import json
import re
import shutil
import subprocess
import sys
import time
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
LOOP = ROOT / "loop"
CFG = json.loads((LOOP / "config.json").read_text(encoding="utf-8"))
OUT = LOOP / "out"
STATE = LOOP / "state"

# ---------------------------------------------------------------- utilities

def read_prd():
    return (ROOT / CFG["prd_path"]).read_text(encoding="utf-8")


def utc_now():
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def log(msg):
    print(f"[loop] {msg}", flush=True)


def append_jsonl(path, obj):
    with open(path, "a", encoding="utf-8") as f:
        f.write(json.dumps(obj, ensure_ascii=False) + "\n")


# ---------------------------------------------------------------- leaf parsing

def parse_leaves(text):
    """Return [{id, heading, start, end}] for each leaf section."""
    patterns = [re.compile(p) for p in CFG["gate"]["leaf_heading_patterns"]]
    lines = text.split("\n")
    marks = []
    for i, line in enumerate(lines):
        if any(p.match(line) for p in patterns):
            marks.append((i, line.strip()))
    leaves = []
    for idx, (start, heading) in enumerate(marks):
        end = marks[idx + 1][0] if idx + 1 < len(marks) else len(lines)
        m = re.search(r"REQ-\d{3}(?:\.5)?", heading)
        leaf_id = m.group(0) if m else heading.lstrip("# ").split(":")[0].strip()
        leaves.append({"id": leaf_id, "heading": heading.lstrip("# ").strip(),
                       "start": start, "end": end,
                       "body": "\n".join(lines[start:end])})
    return leaves


# ---------------------------------------------------------------- gate checks

def gate(text):
    """Deterministic gate. Returns (ok, findings[])."""
    findings = []
    leaves = parse_leaves(text)

    # 1. validator must hold 100%
    try:
        r = subprocess.run(CFG["validator_cmd"], cwd=ROOT, capture_output=True,
                           text=True, encoding="utf-8", errors="replace", timeout=300)
        m = re.search(r'"percentage":\s*([\d.]+)', r.stdout)
        pct = float(m.group(1)) if m else -1.0
        if pct != 100.0:
            findings.append({"check": "validator", "detail": f"validate-prd at {pct}%, must be 100%"})
    except Exception as e:  # noqa: BLE001 — gate reports, never crashes the run
        findings.append({"check": "validator", "detail": f"validator failed to run: {e}"})

    # 2. required blocks per non-exempt REQ leaf
    exempt = set(CFG["gate"]["exempt_leaves"])
    for leaf in leaves:
        if not leaf["id"].startswith("REQ-") or leaf["id"] in exempt:
            continue
        for block in CFG["gate"]["required_blocks"]:
            if block not in leaf["body"]:
                findings.append({"check": "required-block", "leaf": leaf["id"],
                                 "detail": f"missing '{block}' block"})

    # 3. cross-references resolve
    known = {l["id"] for l in leaves if l["id"].startswith("REQ-")}
    for ref in sorted(set(re.findall(r"REQ-\d{3}(?:\.5)?", text))):
        if ref not in known:
            findings.append({"check": "xref", "detail": f"{ref} referenced but has no section"})

    # 4. terminology drift vs stored snapshot (counts may only decrease)
    snap_path = STATE / "term_snapshot.json"
    counts = {t: len(re.findall(t, text)) for t in CFG["gate"]["terminology_watch"]}
    if snap_path.exists():
        snap = json.loads(snap_path.read_text(encoding="utf-8"))
        for term, n in counts.items():
            if n > snap.get(term, 0):
                findings.append({"check": "terminology", "detail":
                                 f"'{term}' count rose {snap.get(term, 0)} -> {n} (legacy-architecture drift)"})
    else:
        snap_path.write_text(json.dumps(counts, indent=2), encoding="utf-8")
        log(f"terminology snapshot seeded ({len(counts)} terms)")

    # 5. [DECISION] markers intact vs previous snapshot
    mk_path = STATE / "decision_markers.json"
    markers = sorted(set(re.findall(CFG["gate"]["decision_marker"] + r"[^\]]*\]", text)))
    if mk_path.exists():
        prev = set(json.loads(mk_path.read_text(encoding="utf-8")))
        lost = prev - set(markers)
        for mkr in sorted(lost):
            findings.append({"check": "decision-marker", "detail": f"marker vanished: {mkr}"})
    mk_path.write_text(json.dumps(markers, indent=2), encoding="utf-8")

    return (len(findings) == 0, findings)


# ---------------------------------------------------------------- codex calls

def call_codex(prompt_text, label):
    """One evaluator call. Final message is read from a file (-o) — piping codex
    stdout wedges on Windows when the .CMD shim's node grandchild inherits the pipe."""
    cmd = list(CFG["evaluator"]["cmd_prefix"])
    # Windows: npm shims (codex.cmd) aren't launchable by bare name from CreateProcess.
    exe = shutil.which(cmd[0]) or shutil.which(cmd[0] + ".cmd")
    if exe is None:
        raise FileNotFoundError(f"evaluator CLI '{cmd[0]}' not found on PATH")
    cmd[0] = exe
    OUT.mkdir(exist_ok=True)
    out_file = OUT / f"lastmsg-{label}.txt"
    out_file.unlink(missing_ok=True)
    cmd += ["-o", str(out_file), prompt_text]
    timeout = CFG["evaluator"]["timeout_seconds"]
    log(f"codex[{label}] starting (timeout {timeout}s)")
    t0 = time.time()
    proc = subprocess.Popen(cmd, cwd=ROOT, stdout=subprocess.DEVNULL,
                            stderr=subprocess.DEVNULL, stdin=subprocess.DEVNULL)
    try:
        rc = proc.wait(timeout=timeout)
    except subprocess.TimeoutExpired:
        # kill the whole tree — TerminateProcess on the shim alone orphans node
        subprocess.run(["taskkill", "/T", "/F", "/PID", str(proc.pid)],
                       capture_output=True)
        log(f"codex[{label}] TIMED OUT after {timeout}s — process tree killed")
        return ""
    log(f"codex[{label}] done in {time.time() - t0:.0f}s (rc={rc})")
    if out_file.exists():
        return out_file.read_text(encoding="utf-8", errors="replace")
    return ""


def extract_json(raw, opener, closer):
    """Pull the outermost JSON payload out of possibly-noisy CLI output."""
    start, end = raw.find(opener), raw.rfind(closer)
    if start == -1 or end == -1 or end <= start:
        raise ValueError("no JSON payload found")
    return json.loads(raw[start:end + 1])


def call_codex_json(prompt_text, label, opener, closer):
    retries = CFG["evaluator"]["json_retry"]
    for attempt in range(retries + 1):
        raw = call_codex(prompt_text, f"{label}#{attempt}")
        try:
            return extract_json(raw, opener, closer)
        except (ValueError, json.JSONDecodeError) as e:
            log(f"codex[{label}] JSON parse failed ({e}); "
                + ("retrying" if attempt < retries else "giving up"))
            (OUT / f"raw-{label}-{attempt}.txt").write_text(raw, encoding="utf-8")
    return None


# ---------------------------------------------------------------- baseline run

def run_baseline():
    OUT.mkdir(exist_ok=True)
    text = read_prd()
    run_id = datetime.now(timezone.utc).strftime("%Y%m%d-%H%M%S")

    ok, findings = gate(text)
    log(f"gate: {'PASS' if ok else 'FAIL'} ({len(findings)} findings)")

    leaves = parse_leaves(text)
    eval_leaves = [l for l in leaves if l["id"].startswith("REQ-")
                   and l["id"] not in set(CFG["gate"]["exempt_leaves"])]
    log(f"{len(leaves)} leaves parsed; {len(eval_leaves)} in evaluation scope")

    # -- per-section baseline, batched
    batch_size = CFG["caps"]["baseline_batch_size"]
    eval_prompt = (LOOP / "prompts" / "evaluator.md").read_text(encoding="utf-8")
    sections = []
    calls = 0
    for i in range(0, len(eval_leaves), batch_size):
        batch = eval_leaves[i:i + batch_size]
        listing = "\n".join(f"- {l['heading']} (lines {l['start'] + 1}-{l['end']})" for l in batch)
        result = call_codex_json(eval_prompt.replace("{SECTION_LIST}", listing),
                                 f"eval-b{i // batch_size}", "[", "]")
        calls += 1
        if result:
            sections.extend(result)
        if calls >= CFG["caps"]["max_model_calls_per_run"] - 2:  # reserve 2 calls below
            log("call cap approaching; stopping batch evaluation early")
            break

    # -- adversarial full-doc pass
    adv = call_codex_json((LOOP / "prompts" / "adversarial.md").read_text(encoding="utf-8"),
                          "adversarial", "{", "}") or {}

    # -- fresh-reader test
    fresh = call_codex_json((LOOP / "prompts" / "fresh_reader.md").read_text(encoding="utf-8"),
                            "fresh-reader", "[", "]") or []

    # -- persist scores
    for s in sections:
        append_jsonl(STATE / "scores.jsonl", {"run": run_id, "iteration": 0, **s,
                                              "critique_n": len(s.get("critique", []))})

    # -- decision queue: unmade-decision critiques + missing-decision questions
    queue = []
    for s in sections:
        for c in s.get("critique", []):
            if c.get("label") == "unmade-decision":
                queue.append({"question": c.get("issue", ""), "section": s.get("section", ""),
                              "source": "evaluator", "evidence": c.get("evidence", "")})
    for q in fresh:
        if q.get("class") == "missing-decision":
            queue.append({"question": q.get("question", ""), "section": q.get("section", ""),
                          "source": "fresh-reader", "evidence": q.get("wrong_guess_cost", "")})

    write_queue(queue, run_id)
    write_report(run_id, ok, findings, sections, adv, fresh, queue)
    log(f"baseline complete: {len(sections)} sections judged, "
        f"{len(queue)} queue items, report at loop/out/baseline-report.md")


def write_queue(queue, run_id):
    lines = [f"# Decision queue — regenerated by run {run_id}", "",
             "Human-facing open decisions. Resolutions append to `loop/state/decisions.jsonl`;",
             "deferral-with-trigger is a valid resolution. The generator NEVER touches these.", ""]
    if not queue:
        lines.append("*(empty — no unmade decisions surfaced this run)*")
    for i, q in enumerate(queue, 1):
        lines += [f"## Q{i} — {q['section']}", f"**Question:** {q['question']}",
                  f"**Source:** {q['source']} · **Evidence:** {q['evidence']}", ""]
    (LOOP / "decision-queue.md").write_text("\n".join(lines) + "\n", encoding="utf-8")


def write_report(run_id, gate_ok, gate_findings, sections, adv, fresh, queue):
    L = [f"# Baseline report — run {run_id} ({utc_now()})", "",
         f"**Gate:** {'PASS' if gate_ok else 'FAIL'}"]
    for f in gate_findings:
        L.append(f"- gate finding: `{f}`")
    L += ["", f"**Sections judged:** {len(sections)} · **Queue items:** {len(queue)} · "
              f"**Fresh-reader questions:** {len(fresh)}", "", "## Sections, worst first", ""]
    for s in sorted(sections, key=lambda x: x.get("score", 0)):
        L.append(f"### {s.get('section', '?')} — {s.get('verdict', '?')} ({s.get('score', '?')})")
        for c in s.get("critique", []):
            L.append(f"- [{c.get('label')}] {c.get('issue')}  \n  ↳ {c.get('evidence', '')}")
        for q in s.get("blocking_questions", []):
            L.append(f"- ❓ {q}")
        L.append("")
    L.append("## Adversarial pass")
    for k in ("contradictions", "missing_failure_modes", "unfounded_assumptions", "taxonomy_gaps"):
        L.append(f"### {k} ({len(adv.get(k, []))})")
        for item in adv.get(k, []):
            L.append(f"- {json.dumps(item, ensure_ascii=False)}")
        L.append("")
    L.append("## Fresh-reader questions")
    for q in fresh:
        L.append(f"- [{q.get('class')}] **{q.get('section')}** — {q.get('question')} "
                 f"(cost: {q.get('wrong_guess_cost', '')})")
    (OUT / "baseline-report.md").write_text("\n".join(L) + "\n", encoding="utf-8")


# ---------------------------------------------------------------- entrypoint

def main():
    cmd = sys.argv[1] if len(sys.argv) > 1 else "gate"
    if cmd == "gate":
        ok, findings = gate(read_prd())
        print(json.dumps({"gate": "PASS" if ok else "FAIL", "findings": findings}, indent=2))
        sys.exit(0 if ok else 1)
    if cmd == "baseline":
        run_baseline()
        sys.exit(0)
    if cmd == "iterate":
        if not CFG["generator"]["enabled"]:
            print(CFG["generator"]["note"])
            sys.exit(2)
        print("iterate: generator routing not yet implemented (phase 2)")
        sys.exit(2)
    print(__doc__)
    sys.exit(1)


if __name__ == "__main__":
    main()
