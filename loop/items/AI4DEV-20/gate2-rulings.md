# Gate 2 rulings — AI4DEV-20 (item agent: fable @ xhigh, 2026-08-05)

Reviewers: terra (codex gpt-5.6 @ max, read-only) — verdict "BLOCKING FINDINGS PRESENT";
Kimi kimi-code/k3 @ high — verdict "BLOCKING FINDINGS PRESENT". Full reports:
`gate2-terra.md`, `gate2-kimi.md`. **Terra's report is ruled COMPLETE by content** (structured
verdict, eight findings, explicit no-finding categories, residuals) — its small size is not a
gate-availability problem. Note for the record: Kimi verified two findings empirically by
writing probe files into the tree and cleaned up after itself (tree verified clean, recordings
dir holds only its README); the one-writer rule was not violated in effect, but the launch
prompt for future read-intended reviews should forbid writes explicitly.

Findings are clustered where the two reviewers hit the same defect. Dispositions:

## Cluster A — committed-store integrity (terra 1 BLOCKER + kimi 1 MAJOR + kimi 2 MINOR)
**ACCEPTED — fix round.** Three mechanical holes and one honest limit:
1. (kimi 1) `readRecordings` lets a second file DECLARE an existing key and silently shadow the
   real recording (sorted filename order, last write wins) — the exact quiet provenance failure
   F2 was ruled to prevent. Fix: refuse duplicate declared keys; refuse any file whose name is
   not `${key}.json`; conformance test writes exactly the shadow and asserts refusal.
2. (kimi 2) `isCommittedRecordingsDir` compares case-sensitively on a case-insensitive
   filesystem. Fails closed downstream, but the write-side guard must hold on THIS platform.
   Fix: compare canonical real paths case-insensitively on win32.
3. (terra 1) `writeRecording` trusts caller-supplied `recordedFrom: 'live'`. Fix: the RECORDER
   derives provenance from the transport it actually used — never caller-supplied; committed-dir
   writes go through that path only.
4. The residue both reviewers name: a hand-crafted committed file with a correctly derived key
   and a lying `recordedFrom: 'live'` is accepted — authenticity beyond self-consistency does
   not exist without signing. RULED ACCEPTED AS RESIDUAL: git review of the committed recordings
   directory is the stated boundary; `recordings/README.md` must say exactly that (the fix
   round updates its wording — its current "the store refuses them anyway" overclaims).

## Cluster B — transport seam vs tier semantics (terra 2 BLOCKER)
**ACCEPTED — fix round.** The conformance seams can hand a loop-tier capability a live
transport and an above-loop capability a replay transport, defeating the tier ruling from
outside. Fix: brand transports by kind ('replay-fs' | 'live' | 'fake'); the factory refuses a
live-branded transport at loop tier and a replay-branded one above loop; fake (conformance)
transports are legal anywhere by design — they are the instrument, and the tier rules they
exist to test are asserted through them. Negative tests both directions.

## Cluster C — credential hygiene in selftest children (terra 3 MAJOR + kimi residual)
**ACCEPTED — fix round.** Selftest-spawned children (the typeprobe compiler spawns, the
runner.selftest.ts real-child probes) inherit the parent environment, so a keyed developer's
conformance run is one regression away from a billed call. Fix: (a) file-level guard in
`oracles.selftest.ts` (beforeEach/afterEach) that strips `AT_JUDGE_API_KEY` for every test in
the file, not one; (b) `AT_JUDGE_API_KEY` joins the SENTINELS map in `runner.selftest.ts` so
the runner's allowlist is PROVEN to drop it from real children (test-only change; `runner.ts`
stays untouched — the F8 condition holds); (c) the typeprobe compiler spawn gets an explicit
env that omits both judge and provider keys.

## Cluster D — verdict parsing strictness (terra 4 + terra 5 MAJOR + kimi residual 4)
**ACCEPTED — fix round.** (terra 4) Content must not be touched before `stop_reason` is
checked — reorder, and test with content that throws on access. Kimi read this path as
correct; terra cites the exact line; the executor verifies at the line and fixes what is
actually there, recording which reviewer was right. (terra 5) Local re-validation must enforce
the FULL schema including unknown-property rejection at top level and per answer — otherwise
live (server-validated) and replay (locally-validated) can disagree about the same bytes.
Tests: extra fields on every path (live-shaped, replay, recording read).

## Cluster E — inert or mis-aimed tests (terra 6, terra 7 MAJOR + kimi 3, kimi 4 MINOR)
**ACCEPTED — fix round.** (terra 6) Replay-key test gains the renamed-slot case (same id and
version, different slot name → different key). (terra 7 + kimi 3) The comparator-leak test
gets unique sentinel values that cannot appear incidentally, asserted absent from the rendered
prompt; the dead `'10.5'` assertion goes. (kimi 4) `renderMaterial`'s declared-order claim
gets its two-slot reversed-key-order test.

## Cluster F — the P9 committed-dir test's blast radius (terra 8 MAJOR)
**ACCEPTED IN NARROWED FORM — fix round.** Terra's concurrency scenario (a recorder running
during a selftest) is out of scope — no key exists in CI and the recorder is a manual
parent-side tool; a lock is machinery for a situation the repo cannot reach. What IS accepted:
the test's write must be EXCLUSIVE-CREATE (refuse if the target exists) so it can never
overwrite a real recording, and cleanup targets exactly the file it created. Kimi's read
(cannot corrupt a real recording) then holds by construction rather than by key-collision
argument.

## Cluster G — the tie witness (kimi residual, promoted)
**ACCEPTED — fix round.** The majority rule and the odd-k validation currently protect each
other with no third witness. One unit-level test drives the aggregation function directly with
a crafted even tally and asserts a tie is a FAIL/refusal, never a pass. Cheap insurance
against a paired regression.

## Cluster H — the disposable skeleton that teaches the pattern wrong (kimi 5 MINOR)
**ACCEPTED — fix round.** `at-033-07.ts` gains a `recent_activity` material slot so the
no-fabrication criterion refers to material that exists. It stays DISPOSABLE; skeletons still
must not teach a wrong shape.

## Ruled NOT accepted / residual (recorded, no code change)
- Store authenticity beyond self-consistency (Cluster A.4) — impossible without signing;
  boundary is git review; README wording corrected to say so.
- Protecting `oracles.ts`-internal exported types with the alias probes (kimi residual) — the
  F11 ruled scope was the CONTRACT aliases, which is met; internal machinery types are not
  reachable through the harness surface by a suite. Residual, revisit only if one becomes
  reachable.
- Prompt-injection hardening of judged material (terra residual) — real, out of this item's
  scope; the judged material at loop tier is fixture-controlled, and adversarial-material
  concerns belong to the drill tier's future design. Recorded here so it is not lost.
- Live-path execution gaps (both reviewers' residuals) — already ruled and recorded (F1/§4h,
  live-smoke.md NOT-RUN record); unchanged.

## Fix round
One batch, executed by the same executor (context intact), per the per-cluster fixes above.
After the fix round the item agent rules each finding closed-or-rejected in writing; there is
NO reviewer confirmation step (founder 2026-08-05). The checks on the fixes are the verify
suite, luna's independent pre-merge audit, and the required CI check on the pinned head.
