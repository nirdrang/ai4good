# Expected-state declarations

One file per requirement — `req-016.json` here declares what
`bun run at:verify req-016 --tier loop --expect` must find.

## 1. What a declaration is

A declaration is the committed answer to "what is this requirement's suite supposed to report
right now?" — which ids must be green, which must be red, and exactly why each red is red.

Without one, `at:verify` exits 1 whenever any id is red, and a requirement with honest reds waiting
on later capability slices can never gate anything: a machine cannot tell "the eight declared green
and the four declared reds" from "something broke". With one, it can.

`--expect` **refuses** rather than passes when the declaration cannot be honoured. All four of
these exit 2, having run no tests at all:

- there is no declaration file for the requirement;
- there is one, but it declares nothing for the tier being run;
- it is malformed — bad JSON, an unknown tier key, a red that is not a well-formed declaration;
- its ids are not in exact bijection with the acceptance file's P0 ids. A declaration that forgets
  an id must never silently pass: that id would simply not be checked.

Without `--expect`, `at:verify` behaves exactly as it always has. The flag is additive.

## 2. A red that turns green is a FAILURE

This surprises people, and it is deliberate. The declaration is the contract, so improving reality
means updating the contract **in the same change**. Without that rule the gate cannot tell an
improvement from a drift — and telling those apart is the entire point of the file.

So when a capability lands and an id goes green, the change that lands it moves the id from `red`
to `green` here. That is one line in the same commit, and it is the record of what changed.

## 3. How to write and update one

Run the suite and read what it actually reports:

```
bun run at:verify req-016 --tier loop
```

Then copy the cause out of the reported detail into the declaration. A red is declared as an
object carrying its **kind**, never as a free-text reason:

```json
"AT-016.11": { "kind": "capability-pending", "capabilities": ["H5 email provider simulator"] }
```

```json
"AT-016.05": { "kind": "pending", "phase": "sut-missing" }
```

**The match is exact, not a substring.** The first line the harness prints is rebuilt from what you
declare and compared:

- `capability-pending` must match the **whole first line**. The line is
  `CapabilityPending: CAPABILITY PENDING — ` followed by your capability names joined with `, ` in
  the order you list them. So the names must be complete and in the harness's order: declaring
  `H5 email provider` when the real detail says `H5 email provider simulator` fails, and so does
  listing two capabilities the other way round.
- `pending` must match `AtPending: <id> PENDING [<phase>] — ` as an **anchored prefix**. The class,
  the id and the phase are all matched exactly, from the first character. Only the trailing detail
  is free, because that tail is not something a declaration can determine: for `sut-missing` the
  suite supplies its own words, and for `harness-missing` it embeds a module-resolution message
  that differs by machine and checkout path. A declaration that could never be written on a second
  machine would be a broken rule, not a stricter one.

Why exact rather than a substring: a substring cannot establish that a red has its declared
**cause**. `H3 fault injection` as a free substring also matches
`Error: H3 fault injection: fixture reset failed` — so a brand-new harness defect would satisfy a
declaration that says "waiting on a capability", and the gate would pass. Matching the shape kills
that: a fixture-reset failure is an `Error`, not a `CapabilityPending`, and cannot match.

**A red whose detail fits neither shape is undeclarable, and therefore fails.** That is deliberate:
a red we cannot describe exactly is a red we do not understand, and it must not pass.

One consequence worth knowing: this couples declarations to the harness's message text. If that
text changes, declarations break loudly with a diff naming the id — the correct failure direction.
Machine-readable capability codes would decouple them and are filed as a follow-up.

## 4. Changing a declaration is a governance act

No current-state checker can prove a red is **honest**. Nothing here can distinguish "this id is
waiting on a capability that has not landed" from "someone broke this id and moved it to `red` with
a matching reason". The declaration is an author's claim about intent, and the answer to that is
review, not more machinery:

- treat a `green` → `red` move with more suspicion than a code change;
- a red that names a capability should point at the board item that will deliver it.

Making that reference mandatory and checking it is filed as a follow-up. Until then it is a
reviewer's job.

## 5. What `--expect` still cannot see

With `--expect`, the report's own arithmetic must add up against the declaration: failing tests
equal the declared reds, passing tests equal the declared greens, the total equals their sum, and
no test is skipped or todo. That closes the case where an extra failure no AT id claims — an
untagged `it()`, a failing hook — hides behind an expected red.

It does not close everything. **While any red is declared, the test process necessarily exits
non-zero, so a failure that fails no test and is never serialised into the JSON report — an
unhandled rejection, a hook error attributed to nothing — remains invisible to this gate.** Putting the raw vitest
output in front of CI (AI4DEV-26) covers part of it; closing it properly needs a reporter-side
envelope, which is filed.

## 6. Two known limits

**Redaction.** The reported detail passes through the harness's redactor, which rewrites any run of
40 or more `[A-Za-z0-9_-]` characters to `<redacted-token>`. If a detail ever contained such a run,
no declaration could reproduce the line and that id would be undeclarable rather than merely hard
to phrase. None of REQ-016's reds is affected — every detail contains spaces — but if you hit it,
that is the cause.

**Integration-tier declarations are unexercised.** `--expect` is tier-agnostic by construction, but
every conformance test runs at the loop tier, so the only integration-tier behaviour that has been
exercised is the "no declaration for this tier" refusal. That changes when integration-tier
declarations exist.
