# AI4DEV-79 — MERGE RULING

**A pool of local database slots, so items verify in parallel.**
Ruled by the merge sitting (`orchestrator` on fable, claude-fable-5, effort xhigh), 2026-08-10.

**Pinned head: `c01bc21b5f37de88afe01ab6a9b7de7cfc488426`.** That commit carries every line of
this item's work: all code, all fixes, all evidence, all rulings through both audit rounds.
The required check `verify` is green on exactly that commit: run 93420268343, started
2026-08-10T10:05:36Z, success at 10:06:18Z. One commit follows the pinned head: it carries
this ruling, the phase-state close, and the conductor's watcher-file drift (a tracked
housekeeping file that rewrites its own base pointer after every push — ruling E9). That
commit carries no code. The merge executes only after `verify` is also green on that final
tip; the pull-request comment that publishes this ruling records the final tip and its run id
in a postscript.

## Decision

**MERGE.** The required check is green on the pinned head. Every external finding across the
whole item — 15 at the plan gate, 22 at the draft-code gate, 6 at audit round one, 9 at audit
round two — is ruled, and every adopted ruling is implemented in the tree. The record matches
the code. One reviewer claim was rejected; it is quoted verbatim below with the written
reason. No reviewer maintained a disagreement after ruling, so none is carried.

## What was built

The machine has one personal local Supabase stack, and the founder's own dev data lives on
it. This item builds the founder-ruled pool of two standing local Supabase slot stacks, each
with its own project id (`ai4good-slot-N`) and its own port block. The coordinator reserves a
slot when an item starts (PowerShell helpers in the work library). The harness runner
occupies the slot per verify window with an atomic pid-stamped claim, mirrors the item tree's
own migrations in, regenerates the slot config with a port overlay, resets the slot, and
proves identity before every destructive act. The personal stack stays outside the pool,
untouchable, enforced in code by a personal-band port guard and a positive-identity wall.

**The item's history includes an incident, recorded in full in the plan's incident section
(plan §8).** During the draft, the isolation spike destroyed the personal local database: the
tracked `.env` carries the cloud project id, the Supabase CLI treats that variable as a
project-id override, and the hand-written spike script closed neither override route. The
founder ruled recovery is the founder's alone and the item continues. The wall was rebuilt as
positive identity (one shared invocation helper sets the slot's own project id, strips every
other `SUPABASE_*` variable, refuses on any identity mismatch before a destructive act) and
re-proven under the hostile condition with zero interaction with the personal stack beyond
docker-level reads. The committed spike transcript shows the slot-2 canary destroyed, the
slot-1 canary surviving, and the personal stack's docker identity equal on every field before
and after. After the incident, no role touched the personal stack again for the life of the
item — no start, stop, reset, connection, or write, through every remaining sitting including
this one.

## Every finding and its disposition

The full rulings, each with the reviewer's claim quoted verbatim, live in
`loop/items/AI4DEV-79/plan.md` §7 (plan gate), §9 (draft-code gate), §10 (audit round one),
§11 (audit round two). Totals: 52 external findings, 51 adopted, 1 rejected.

**Plan gate — one reader: sol via codex, read-only. 15 findings: 11 accepted, 4
accepted-fixed-differently, 0 rejected** (plan §7). In brief: a restart marker so the on-disk
config always describes the running stack [1]; ownership-checked release and occupancy
re-reads [2]; dead-pid-only takeover, never live-holder takeover [3]; the drill tier refuses
as infrastructure instead of reaching any stack [4]; the port overlay generalized to every
active port key [5]; a fail-closed path-closure scan after config regeneration [6]; a
vanishing slot-2 canary in the spike [7]; finally-guaranteed spike cleanup [8]; an end-to-end
integration-runner criterion, S8 [9]; a normalized main-vs-branch loop-tier oracle [10]; the
Dockerless selftest's claim narrowed to what it can prove [11]; a fail-closed branch parser
[12]; a lock-directory override for selftest isolation [13]; a credential scan as part of
every committed transcript's done-criterion [14]; the CI runner-label fact corrected [15].

**Draft sitting rulings** (plan §8): the incident rulings E1–E5 (the positive-identity wall,
the founder's decisions, the zero-touch re-proof shape) and the draft-pass ratifications
E6–E9 (the container-token identity instrument; its fail-closed bias; two extra selftests so
refusal tests cannot pass vacuously; watcher-file churn committed as housekeeping).

**Draft-code gate — a panel of two, blind to each other: terra via codex, flash via
opencode. Terra 13 findings: 8 accepted, 4 accepted-fixed-differently, 1 rejected. Flash 9
findings: 9 accepted; plus 4 notes, all ruled** (plan §9). The critical [T1]: an
unidentifiable lock holder was takeover-eligible under dead-pid-only; now never — a bounded
re-read, then a loud refusal. [T2] added positive container evidence plus a docker read
before every reset. Four convergences, the panel's strongest signal: the mirror carried CLI
runtime state into slots ([T3]/[F3]); the spike held no slot claims ([T4]/flash note 2); the
personal-block guard missed the exported destructive entry points ([T7]/[F1]); a vacuous
IDENTICAL on an empty docker snapshot ([T12]/[F2] second half). Flash note 4 is a clean
verdict on the wall itself from the seat seated to attack it — recorded as evidence. Fix
ratifications X1–X5 (plan §9): the bounded-wait completion of the reservation race fix,
measured eight of eight; S8's criterion corrected against the tree (the X2 row below); the
oracle baseline pinned to the merge base — the branch stays deliberately behind main, and
GitHub reports the pull request MERGEABLE and CLEAN as verified this sitting; the identity
instrument's own residual named; one pre-existing selftest wording defect fixed in passing.

**The one rejection, quoted verbatim beside its written reason (plan §9 [T9]):**

> **[T9] REJECT.** Claim: "`Release-DbSlot` checks occupancy and deletes the reservation
> without an atomic handoff."
> The TOCTOU window is real and changes nothing destructive. The serializer for destructive
> acts is the occupancy claim (dead-pid-only; a live holder is never displaced): a runner
> that slips into the window still holds its claim, so the worst outcome is the NEXT item's
> occupy refusing loudly until the window closes — a loud refusal, not a reset under a live
> run. An atomic two-file handoff in PowerShell 5.1 would buy no safety the claim does not
> already provide. Recorded as a residual beside the sweep helper's comment.

**One accepted claim carried a false half, recorded as such (plan §9 [T8]).** The claim read:
"`edge_runtime.inspector_port` is remapped from any value, including non-numeric values,
instead of refusing every value other than the ruled 8083." The non-numeric half is false:
the `!literal` branch at db-pool.ts:242 refuses before the inspector case is reached. The
numeric half is right and was fixed: the special case pins to exactly 8083; any other
inspector value falls through to the generic listener rule.

**Audit round one — a panel of two, blind to each other, read the record at head 63dfe3d.
Six findings, six accepted, zero rejected** (plan §10). Seat one (luna via codex): five
findings — a stale step criterion contradicting its own correction [A1] (record fix); an
unreadable reservation read as absent on the override path [A2]; the evidence line naming a
pre-prepare port [A3]; an unparseable occupancy claim read as no occupancy [A4]; a
prefix-parsed port value passing the personal-band guard [A5] (code fixes, all fail-closed).
Seat two (flash via opencode): one finding [AF1] — its own working file carried the tracked
`.env` content and must not land in the record — ruled as the verification it asks for and
measured; **every other box on flash's checklist came back PASS, except git-level facts
marked could-not-verify because its cage has no git tooling — expected, not a defect. The
clean boxes are recorded here as evidence.** Audit-fix ratifications AX1–AX8 (plan §10): the
strict read releases the claim before its refusal travels; the lenient view read stays and
still refuses by another route; the evidence-line helper prints the status verbatim rather
than throwing; trailing comments are dropped before the port token is judged; the config
rewrite handles underscored integers whole; the occupancy record carries the refusal; one
extra selftest kept; the watcher churn already ruled.

**Audit round two — the whole panel re-ran at head db4a451, the once-per-item re-run, now
spent. Neither seat came back clean: nine findings, nine accepted, zero rejected** (plan
§11). Seat one (luna): the committed reviewer stderr logs carried key-shaped values [B1] (the
disclosure below); the exported parameterized reset was callable without the identity proof —
adopted-ruling-absent, fixed so the skip is a compile error [B2]; a reservation file
containing JSON `null` took the absent branch [B3]; a claim with pid 0 read as no occupancy
[B4]; claim-directory enumeration errors read as empty [B5] (all fail-closed fixes, each
pinned by a selftest); the oracle header's commit count corrected to the measured eight [B6]
(record fix). Seat two (flash): the audit re-run's own working file again carried the `.env`
content [BF1] — verified absent from disk and index with two instruments, and its convergence
with [B1] recorded: the working file's existence while a concurrent reader runs is itself the
leak path; the integration transcript's DIRTY tree state now carries a postscript stating
exactly what the commit graph proves and cannot prove [BF2]; the pull-request body's stale
status paragraph rewritten [BF3]. Round-two fix ratifications BX1–BX4 (plan §11): the
unidentifiable-holder refusal carries its own words per condition; a non-destructive read is
unusable as a reset proof; five garbage shapes pinned, not one; a negative pid is
unidentifiable-live, never dead. Both seats' raw outputs and distillates are committed in the
record at 5018517.

## The disclosure from audit round two (plan §11 [B1])

The round-one committed reviewer stderr log carried 21 whole-token JWT-shaped matches; the
round-two log on disk carried 61 more of the same two values. Exactly two distinct values
existed across the record, both decoded during the ruling: (1) the cloud project's ANON
("publishable") key — the key Supabase designs to ship inside every client bundle, and a
value this repository already publishes deliberately, twice, in the TRACKED `.env` at the
repo root; zero incremental exposure resulted; (2) a 65-character token whose signature
segment decodes to the literal word "signature" — the redaction selftest's own deliberate
fixture, cryptographically invalid, not a credential. A wider secret battery over the record
found nothing else: no service-role key, no database password beyond fixtures and the
universal local default, no access token of any vendor shape.

Both stderr logs are redacted in place at the tip with named markers. **What redaction does
not do, stated plainly: the values remain in git history from commit 2e2a215 through db4a451,
on the remote. A pushed value cannot be un-pushed by a forward edit, and no history was
rewritten. No key rotation is warranted:** the exposed value is the publishable key, public
by design and published by this same repository in the tracked `.env`; the other token is not
a key. This is a hygiene defect in the record, not a credential incident, and the finding's
"critical = credential disclosure" severity was corrected on that evidence — the finding
itself was ACCEPTED, and its record-false half (a round-one scan claim that could not be
reproduced) was corrected in the plan.

## No third panel run — the residual, stated in the open

The once-per-item audit re-run is spent. The round-two code fixes [B2]–[B5] tighten guards
the record already rules fail-closed; they change what the guards REFUSE on edges no
committed transcript ever exercised, and they change nothing on any proven path. Each fix is
pinned by its own selftest; the four suites ran green at the fixed head; CI re-proves them on
the merge head. The residual — these four small fixes go unread by an external panel — is the
accepted cost of the re-run cap, weighed by the audit sitting and carried here so the founder
sees it with open eyes. A cap bounds effort, never truth: nothing was recorded as invalid
because a budget ran out.

## What the green does and does not claim

The required check `verify` on the pinned head runs four suites with no Docker and no live
stack: the TypeScript typecheck; the harness selftest (286 tests, including the pool's named
guard tests); the acceptance-suite check for the first requirement; and its loop-tier verify
with exact declaration match. **CI therefore proves the pool's claim logic and guards on temp
directories, and nothing else.**

Only the committed transcripts prove the rest, and they prove it on the dev machine at the
recorded commits, once: the setup transcript (real slot stacks on their own ports), the spike
transcript (the wall under the hostile condition, personal docker identity equal on every
field), the integration-run transcript (the changed runner path end to end — occupancy,
prepare, both identity instruments, the evidence line naming the slot, the suite executed on
the slot env, the claim released), and the loop-tier oracle (normalized main-vs-branch diff
EMPTY at the merge base c11e352).

**No integration-tier green for the first requirement exists or is claimed** (ruling X2): its
expected file declares the loop tier only, so the original "green integration-tier expect
run" criterion was unsatisfiable as written and was corrected to the end-to-end transcript
above; what the suite scored at integration tier is the requirement's own pre-existing state
on main, recorded for the requirement's own work. Two further bounds, stated so the green
stays honest: the integration transcript ran on a tree whose uncommitted delta is
unidentified — the commit graph bounds it, and CI re-proves the suites on clean committed
trees at every later head ([BF2]); and the identity-read instrument is coupled to the pinned
CLI's status output shape — a CLI upgrade must re-prove it, with the docker read as the
second instrument ([F4], X4).

## Dispositions of record

- 52 external findings across four gates: 51 adopted (accepted or accepted-fixed-differently),
  1 rejected ([T9], quoted above). 22 executor judgment calls ratified (E-series, X-series,
  AX-series, BX-series).
- Maintained reviewer disagreement: none. No seat maintained an unearned-green tag.
- Open founder questions: none.
- Caps: the once-per-item audit re-run is spent (used for round two); no other cap fired.
- The personal stack: touched once, by the draft spike — the incident, recorded in plan §8
  and disclosed above. Never again through the life of the item, including this sitting.
- Board: the merge closes this item through its own pull-request link. No other item's id
  appears in this ruling, in the pull-request title, or in the body — other work is named in
  words only.

## Filed for the coordinator as separate work — in words, never ids

1. The drill-tier stack decision: the drill tier now refuses as infrastructure; a follow-up
   item decides which stack the drill tier uses and replaces the refusal.
2. The pre-existing direct personal-stack paths named by flash's gate-two note 3:
   `package.json` scripts db:start, db:stop and db:reset reach the personal stack directly,
   and the runner selftest writes a probe file into the repo's `supabase/migrations`. Both
   predate this branch.
3. The conductor's watcher-file state possibly moving to an untracked path, so sittings stop
   committing its churn.
4. The reviewer-runner scrubbing key-shaped tokens from reviewer session logs at capture
   time, before anything lands in the artifacts directory.
5. One deliberate look at whether the tracked `.env` should carry even publishable keys.
