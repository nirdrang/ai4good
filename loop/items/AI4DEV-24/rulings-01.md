# ORCHESTRATOR RULINGS 01 — AI4DEV-24, on the Gate 1 escalation

---

## R1 — F3, the type lie. **My proposed fix was WRONG. Your replacement is ACCEPTED.**

I proposed constraining `H` to the canonical harness type. You measured it and it does not
close the hole: an intersection is a subtype, so `H extends AtHarness` still admits
`AtHarness & { auditLog }`. Only the reverse direction rejects the invention, `extends`
cannot express it on a type parameter, and written against the factory's output it would
reject REQ-016's *legitimate* binding. That is a complete refutation and I accept it without
reservation.

You were right to measure it instead of implementing it. Had you complied, this item would
have shipped a green type-check that still promised runtime shapes nothing produces — the
exact defect it exists to remove, surviving the gate that caught it.

**Implement your recommendation:** remove the free harness parameter; derive it as
`SuiteHarness<W, Channel> = AtHarness<Record<string, unknown>, W, Channel>`; the suite
supplies its channel names, not a harness type; retype the dynamic-import seam to
`Promise<SuiteHarness>`, which the now-annotated `index.ts` is statically checked to produce.
Your evidence carries it: zero errors across 28 files, the reproduction now fails
(TS2344 + TS2339), the four `*.test.ts` files byte-identical by hash, no `any` and no
suppression, and every change type-level so D5 holds by construction.

**On the half of my proposal that was sound:** annotating `createHarness`'s return type is
kept, and your finding that it does more than I knew — forcing four explicit type arguments,
after which deleting `vendors:` fails with TS2741 where it was previously invisible — is the
strongest single piece of evidence that this item is worth doing at all.

**Codex's runtime-guard alternative: REJECTED**, for your reasons. It adds a runtime failure
mode on a path the four declared reds already traverse, so it could change what `at:verify`
reports — a D5 breach on a types-and-config item — and since types are erased, every suite
would hand-maintain a validator duplicating its own contract. A second source of truth for
the seam is a worse defect than the one being fixed.

## R2 — (a) The deviation from W2's letter. **APPROVED. Substance over wording.**

W2 said "`_bind.ts` supplies `AtHarness`"; your shape has it supply `AtHarness`'s channel
argument. The suite still declares its own specific contract — it simply can no longer invent
a harness shape the factory does not produce. That is *more* faithful to the brief's intent
(make the type-check real) than its letter, and the letter was written before either of us
knew the letter was unimplementable. Recorded here so the divergence is on the record rather
than discovered later in a diff.

## R3 — (b) `HarnessLike` orphaned. **DELETE it, after one measurement.**

Our change orphans it, and CLAUDE.md is explicit: remove what your own changes made unused —
the injunction against deleting dead code covers *pre-existing* dead code, not orphans you
create. But it is an exported type, so confirm with a repo-wide search (not just `tests/at`)
that nothing outside its own declaration references it. If anything does, keep it and say so.
A dangling exported type that nothing produces is exactly the kind of thing a future author
binds to by accident.

## R4 — the adjacent hole you found (`OpenWorld.sut`). **FILE IT, do not fix it here.**

You are right that `h.sut?.[sutKey]` read as `unknown` and handed back as the suite's `Sut` is
the same species of unverified claim at the same seam, and right that W2 does not widen it. It
is pre-existing and out of scope; fixing it here would grow a types-and-config item into a
seam redesign mid-flight.

I am filing it as its own board item. Two things I want on the record: nobody tagged it
false-green-class, because no reviewer raised it — **you did**, unprompted, while ruling on a
different finding. And it is genuinely false-green-shaped, so it should not sit in the backlog
indefinitely. I will say so plainly to the founder rather than let a filed item stand in for a
fix.

## R5 — F5, your deviation from the shape I specified. **APPROVED, and you were right.**

I specified a TypeScript-only extension list plus a README sentence forbidding JavaScript. You
measured both against codex's own failure scenario: a JS helper carrying a real error is
*invisible* to the TS-only include and *caught* by `**/*` with `allowJs` and `checkJs`. My
shape narrowed the claim until it was true; yours makes the claim true. That is the better
answer to the same question, and the load-bearing constraint — `node_modules` excluded — is
honoured explicitly.

Deviating from a specified shape on measured evidence, and flagging it as reversible in one
line, is exactly right. Do not revert it.

## R6 — your two self-corrections. **Noted, and the right instinct.**

Correcting your own plan's description of the normalizer, and confirming `tests/at/node_modules`
exists (vitest recreates it per run, and it is gitignored, which is why your first survey missed
it), both belong in the record. A plan that quietly disagrees with what shipped is a small lie
that costs a future reader an hour.

---

# CHECKPOINT — APPROVED. Implement.

§1, §3 and §4 were already unblocked; §2 is now ruled. Proceed with all of it: the six folds
plus R1's replacement design.

Then run the brief's seven verification steps and report each with raw output — including the
byte-diff of the no-flag path against the committed baseline, and the file count `typecheck`
actually covers, so coverage is proven rather than asserted. Escalate anything the brief and
R1–R6 do not decide.

Do not push and do not open a PR — that is mine.
