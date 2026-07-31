# Design gate report 005 — change order 007 (d89 decline-then-review)

Date: 2026-07-31 · Gate: UI WoW §3 step 2
Input: `discovery-chat.html` (41,247 → 57,091 bytes) and `scope-document.html`
(15,218 → 15,728), pulled byte-exact into the **design worktree** — first pull under the new
worktree discipline.

## Verdict: PASS on d89 — with one unrequested change to flag (see the last section)

## d89 requirements — each verified directly in the file

| d89 requirement | Result |
|---|---|
| Oversight sentence present **in the copy the NGO receives** (test-enforced) | **PASS** — verified by inspecting the markup, not the report: it is the last paragraph *inside* the message panel (`data-testid="fit-decline-notice"`), carried by its own handle `decline-oversight-notice`: *"A person reads every one of these decisions — if we got this wrong, we'll reach out."* The gray designer annotation is a **separate sibling div** that begins "Terminal in the moment…", so the sentence is genuinely NGO-facing. It is replayed verbatim in the reopened state's muted transcript. |
| Decline still carries cause + reshaping suggestion | **PASS** — both retained unchanged. |
| Decline reads final in the moment; no waiting state, pending badge, SLA or appeal affordance | **PASS** — composer still never returns in state G; the annotation states explicitly that the NGO sees no pending-review badge, no timeline, no appeal button. |
| New **reopened-after-overturn** state | **PASS** — state **I**, "Reopened after overturn". Notice (`decline-overturned-notice`): *"We were wrong — this project is open again."* followed by the human reason, and *"Your conversation is exactly as you left it… Nothing you wrote was lost."* |
| Reopened state runs on **free daily credits**, and must NOT imply fuel returned | **PASS** — gauge reads "Discovery credits: 9 of 10 today" (unitless); `reopen-credit-notice` states *"Discovery continues on your free daily credits, as before."* **Zero `$` characters anywhere in the state I block**, checked programmatically. |
| Same conversation resumes, transcript intact **including the original decline** | **PASS** — state I opens with an "earlier in this conversation" divider, the NGO's last turn, then the full original decline rendered muted and timestamped "Turn 8 · 27 July · declined", with turn 9 resuming below. The designer's stated principle: *"History is not rewritten."* |

## Mechanical scans

- **Rename-diff: CLEAN on both files.** discovery-chat 29 → 33 unique handles, **zero lost**; the four additions are all d89 (`decline-oversight-notice`, `decline-overturned-notice`, `reopen-credit-notice`, `discovery-transcript`). scope-document 21 → 22, zero lost. Fourth consecutive clean rename-diff.
- **Handle grammar:** clean — all kebab-case requirement vocabulary.
- **Money units:** clean — the reopened state is entirely unitless; "used 1 credit" and "attachments never use credits" carry no dollar sign.
- **State set now nine:** A streaming · B credits-exhausted-unvetted · C credits-exhausted-vetted · D funded · E off-topic decline · F turn ceiling · G fit decline · H finished · **I reopened after overturn**.

## Line-ending hygiene (incidental fix)

Earlier pulls wrote CRLF locally while the design project stores LF, so on-disk byte counts never matched the project's reported sizes even when content was identical. Both files are now LF and match exactly. Content fidelity in earlier gates was verified by content checks, so no prior verdict is affected — but future pulls should stay LF so size comparison remains a usable check.

## ⚠ UNREQUESTED CHANGE — founder ruling needed

`scope-document.html` changed, and **change order 007 did not ask for it.** The suggested-stack
block was reworked from *"Editable, but your volunteer gets the final word during kickoff"*
into a **ticked-by-default opt-out**: a new checkbox (`stack-auto-decide-checkbox`) reading
*"Let the system decide — recommended. Discovery picks the stack from the scope, and your
volunteer confirms it at kickoff. Untick only if your organisation already has a stack it
must fit"*, with the chips demoted to *"a preview, not a constraint"* while ticked.

This is a **behavioural change, not a visual one**: the spec (§11 screen 8) lists the suggested
stack as *editable*, and it is now auto-decided by default with editing behind a deliberate
opt-out. It may well be an improvement — it removes a decision most NGOs are unqualified to
make — but it is not in the spec or the PRD, and per the top-down rule it must not be absorbed
silently. **Founder: did you request this in the design chat?** If yes it needs a spec (and
likely REQ-005) fold; if no it should be reverted or ruled on. Not blocking anything else.
