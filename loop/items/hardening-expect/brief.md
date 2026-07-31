# BRIEF — expected-state manifest + `at:verify --expect`

**Item:** hardening-1 of 3. No Linear id yet — the Linear connection was down when this
was authored; the board item is to be filed and linked before the merge ruling, and its
absence is a named deferral, not an oversight.

**Why this exists.** Today `at:verify` exits 1 whenever any acceptance id is red, and
REQ-016 legitimately has 4 honest reds waiting on later capability slices. So the
command cannot gate anything: a machine cannot tell "the declared 8 green and 4 honest
reds" from "something broke". Every claim of green is therefore a human reading a
table — which is exactly what codex's max-effort review named as the loop's most
dangerous residual failure mode, and why autonomous merge is currently switched off.
This item makes the expected state a committed, machine-checked contract.

**Done when:** `bun run at:verify req-016 --tier loop --expect` exits 0 against the
declaration, and every deviation from it exits non-zero with a precise reason.

---

## Decisions — all pre-made. Anything not decided here is an escalation.

### D1 — Manifest location and granularity
One file per requirement, all tiers inside it: `tests/at/expected/req-<NNN>.json`
(e.g. `tests/at/expected/req-016.json`). NOT one central file: at 30 requirements with
concurrent branches a single file is a merge-conflict magnet, and per-requirement files
keep ownership where the suite already lives.

### D2 — Schema (exact)
```json
{
  "requirement": "016",
  "tiers": {
    "loop": {
      "green": ["AT-016.02", "AT-016.03"],
      "red": {
        "AT-016.01": "H3 static provider scan"
      }
    }
  }
}
```
- `green` — ids that MUST report green.
- `red` — ids that MUST report red, each mapped to the reason that MUST appear.
- A tier absent from `tiers` means "no declaration for this tier" → `--expect` refuses
  (D5), never passes.

### D3 — Reason matching
The declared reason must appear as a **case-sensitive substring** of the reported detail
for that id. Rationale: an exact match is brittle against harmless rewording, while a
substring still fails when a red flips to a *different* cause — which is the case that
matters. Declare the capability names, not whole sentences.

### D4 — What `--expect` accepts and rejects
`bun run at:verify req-<NNN> --tier <tier> --expect` exits 0 **only when all hold**:
- the set of green ids equals `green` exactly;
- the set of red ids equals the keys of `red` exactly;
- each red's reported detail contains its declared reason;
- no id is missing and no unexpected id is registered.

Every deviation exits 1 and prints a precise diff naming each offending id and how it
differs. **A red that turned green is a FAILURE** — this is deliberate: the declaration
is the contract, so improving reality means updating the contract in the same change.
Without this rule the gate cannot distinguish improvement from drift, which is the whole
point of the item.

### D5 — Infrastructure refusals (exit 2, never a pass)
- No manifest file for the requirement → exit 2.
- Manifest present but the requested tier is absent → exit 2.
- Manifest malformed / unparseable → exit 2.
- The union of `green` + `red` keys is not in exact bijection with the acceptance
  file's P0 id set → exit 2 (a manifest that forgets an id must never silently pass).

### D6 — Default behaviour is untouched
Without `--expect`, `at:verify` behaves exactly as it does today (exit 1 on any red).
No existing selftest may change. `--expect` is additive.

### D7 — Scope boundary — do NOT build these
- No CI wiring (that is hardening item 2).
- No changes to harness capabilities, fixtures, clock, or the REQ-016 suite.
- No `tsconfig` changes (that is AI4DEV-24).
- Do not touch `src/`, `design/`, `supabase/`, or any other worktree.

### D8 — Conformance tests (required, black-box)
Follow the existing pattern in `tests/at/harness/runner-blackbox.selftest.ts`: build
disposable trees under a temp directory, drive the REAL runner via `AT_REPO_ROOT`, and
assert exit codes and printed output. Cases, each its own test:
1. declaration matches reality exactly → exit 0;
2. a declared red is actually green → exit 1, output names the id;
3. a declared green is actually red → exit 1, output names the id;
4. a red reports a DIFFERENT reason than declared → exit 1, output names the id;
5. manifest missing → exit 2;
6. manifest omits an id that the acceptance file lists → exit 2;
7. control: the same tree without `--expect` behaves as today (unchanged exit).

### D9 — The REQ-016 declaration ships with this item
Author `tests/at/expected/req-016.json` declaring the CURRENT true loop-tier state:
green = AT-016.02, .03, .04, .05, .06, .08, .10, .12; red = .01 (H3 static provider
scan / H3 sentinels / H5 email provider simulator), .07 (H3 fault injection), .09 (H3
fault injection), .11 (H5 email provider simulator). Declare reasons as short capability
names per D3 — read the actual reported details first and derive from them; do not
invent wording.

---

## Work items (commit one per item)

- **W1** — `tests/at/expected/req-016.json` + the manifest reader/validator in the
  harness (its own module; pure functions where possible so they are unit-testable).
- **W2** — `--expect` in the runner: flag parsing, the comparison, the precise-diff
  output, the exit codes of D4/D5.
- **W3** — the seven conformance tests of D8.
- **W4** — a short `tests/at/expected/README.md`: what the manifest is for, why a red
  turning green is a failure, and how to update a declaration.

## Verification — the expected state for THIS item

All must hold, and the executor reports raw output for each:
1. `bunx tsc --noEmit --pretty false` → exit 0.
2. `bun run at:selftest` → all pass: the existing 42 plus the new conformance tests.
3. `bun run at:check req-016` → 12 P0 ids in bijection.
4. `bun run at:verify req-016 --tier loop` → unchanged: 8 green, 4 red, exit 1.
5. `bun run at:verify req-016 --tier loop --expect` → **exit 0**.
6. `git diff --check` → clean.
7. Allowed paths only: `tests/at/**`, `loop/items/hardening-expect/**`. Nothing else.

## Escalate (do not decide)

- Any conflict between these decisions and what the code makes possible.
- Any temptation to change the REQ-016 suite, the harness capabilities, or existing
  selftests to make something pass.
- Any ambiguity in how the runner currently reports an id that makes D3/D4 unimplementable
  as written.
