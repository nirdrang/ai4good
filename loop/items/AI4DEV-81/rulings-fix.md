# FIX-phase rulings — AI4DEV-81 (per-item integration verification)

Ruler: the FIX orchestrator sitting (fable). Subject: the judgments the executor raised in its
FIX-AND-GOAL report (final code head 41bcadc, evidence commit f11eaa1). The executor proposed;
the rulings are made here.

## RF-1 — the iteration count: THE CAP HELD

The executor flagged that counting its baseline suite run as an attempt makes req-001 four
cycles against the stated three. **Ruling: the baseline is measurement, not an attempt.** The
draft phase deliberately never ran the verify suite, so the first run of it establishes the
starting state — there is no fix in it to attempt. Three fix-and-verify cycles followed for
req-001 and one for req-016, inside the three-attempt cap, and the greens moved monotonically
with each cause traced to code. Flagging the ambiguity instead of absorbing it silently was the
correct behaviour.

## RF-2 — five live-adapter defects fixed by running: RATIFIED

All five live in this item's own new code and were found exactly the way the goal loop is
designed to find them — a divergence investigated as a defect first, cause traced to code, no
declaration bent (plan step 7's doctrine). The five, as code facts for the record:

1. Emailed links were never quoted-printable decoded (`type=3Dsignup` reached the HTTP call).
2. The deployed `create-organization` function reads the field `name`; the adapter sent
   `organizationName`.
3. The operator-written GitHub identity stored `identity_data` as a JSON **string**; Auth
   answered 500 for that user until the `::text::jsonb` cast.
4. The membership table's column is `organization_id`; the adapter's read said `org_id`.
5. `emailVerified` handed the shipped extractor a `Date` where it requires a string.

## RF-3 — the evidence-capture wrapper fix: RATIFIED

Not covered by any gate ruling, and rightly fixed: the capture wrapper turned
`CapabilityPending` into a plain `Error`, which made five req-016 ids red in a shape no
declaration can express — a direct contradiction of D2's declarability requirement, visible
only in an integration run. The two declarable refusal shapes now pass through unchanged;
ordinary failures are still wrapped; the logic is extracted pure (`captureFailure`) with three
selftests. Inside slice-1 territory; joins the audit claim checklist.

## RF-4 — the bounded mail poll: KEEP

The executor kept a time-bounded poll on mail-catcher reads although delivery measured at 4 ms,
and offered to remove it as speculative. **Ruling: keep it.** A live catcher is asynchronous by
nature; a bounded poll is measurement robustness against real-world timing variance, not a
speculative feature — and its comment records both the measurement and the reason for the
bound, so the next reader is not misled about why it exists.

## RF-5 — no direct-rpc atomicity arm: RATIFIED, the ruled remedy stands

The executor found the recorded live proof of mid-transaction rollback drove
`public.complete_signup` directly as operator, around the validator, and did not build that arm
because it exceeds ruling S2-3's remedy. **Ruling: correct on both counts.** The plan's table
conditions AT-001.01's green on the criterion's full text proved against the DEPLOYED surfaces;
an operator-authority rpc drive proves the database function, a different object than the
deployed path. The verify-first evidence (the validator's `trim()` strips a superset of what
`btrim` strips — the intersection is empty by construction) is recorded in `verify-first.md`
Part C, and the narrowed claim — in-transaction rollback is not externally drivable on the
deployed surface — joins the audit claim checklist verbatim. Extending the shared SUT contract
for one operator-authority arm would put a method on every tier's surface for a claim this tier
does not require.

## RF-6 — `src/routeTree.gen.ts` regeneration: CORRECT HANDLING, recorded

`bun run build` regenerates the file (appends a `declare module` block); pre-existing, unrelated
to this item; the executor restored it rather than committing it. That is the surgical-changes
rule applied. Noticed here so the observation is not lost: the generated file drifts from what
`main` holds whenever the build runs. Not this item's defect; not fixed here.
