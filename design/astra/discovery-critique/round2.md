**Part 1 — my original eight problems**

1. **Final confirm buried on the phone — Fixed.** `phone-6b` still pins "Ready? Go to Finish Discovery →" along the bottom while I'm halfway down the document, and in `phone-6` it sits right above the confirm card.
2. **Turns, fuel and dollars — Partly fixed.** `desktop-3` now spells out "Your 42 remaining beta replies can only be used within each day's 10" and "No paid fuel is allocated to Discovery", but the "Beta free turns used · 16% used · Within allowance · 1 reply = 1 turn" bar in `desktop-1`/`desktop-2` still explains nothing.
3. **Dead button loudest on arrival — Partly fixed.** The disabled pill is clearly paler in `desktop-1` than the dark one in `desktop-5`, but `phone-1` still stacks a full-width grey Finish pill above the chat before the first question.
4. **"Finish" twice / navigation disagreeing — Fixed.** `desktop-6`'s breadcrumb reads "Discovery · last step", the chat card at 100% is now a small "Take me to Finish Discovery ↑" link instead of a second dark button (`desktop-5`), and `desktop-6`/`phone-6` open the confirm card with two empty checkboxes and no green check I can see.
5. **Brief read-only / buried on phone — Partly fixed.** The brief still comes before the usage card on `phone-1`/`phone-2` with "Edit" on filled rows, but "Revision 2" is still unexplained (and `desktop-5` says "Revision 3" with all six decisions), no row is highlighted, and I still can't tell what Edit opens.
6. **Checkbox promise — Partly fixed.** The "In practice your NGO decides who can see volunteer details…" sentence now sits directly under the checkbox in `desktop-6`/`phone-6`, but the checkbox itself still says our NGO "takes responsibility for data access".
7. **Which answer went where — Partly fixed.** `desktop-4`/`desktop-5` now show the questions in one message with a receipt "Added to your brief: Success measure, Booking rules, Information handled", but the combined answer bubble has no per-answer labels and "Answer 3 independent questions together" still sits under a single question in `desktop-1`/`desktop-2`/`phone-1`/`phone-2`.
8. **Small noise — Partly fixed.** Receipts say "Free reply · no charge" and the topics-left line is gone, but "Reference files · 0 shared with AI", "Suggested cause labels", "The draft needs a rewrite" and "Ask AI a question first" are all still on screen (`desktop-1`, `desktop-6`, `phone-1`, `phone-6`).

**Part 2 — the five new problems from last time**

1. **Blocked card contradicting the free turns — Fixed.** `desktop-3` now opens with the plain line about the daily 10 capping beta replies plus "No paid fuel is allocated to Discovery", so the 42 remaining beta turns no longer look spendable.
2. **Data explanation arriving after the promise — Fixed.** In `desktop-6`/`phone-6` the "In practice…" sentence now sits between the second checkbox and the grey confirm button.
3. **"View brief" as the first tappable thing on the phone — Not fixed.** `phone-1`/`phone-2` still show it as an outlined full-width button under the title, ahead of the stepper and progress card, pointing at six "To be discussed" rows.
4. **Desktop confirm not sticky — Not fixed as far as I can see.** `desktop-6` still shows the checkboxes only at the top of the right rail with no repeat at the end of the long document; I can't judge stickiness from a full-page capture.
5. **"Still needed" names — Partly fixed.** The receipts now use the brief's names ("Added to your brief: Main priority"), but `desktop-1`/`phone-1` still list "who books shifts, maintenance owner…" while the chat asks "Who should book volunteers into shifts?" and "Who will look after the tool?".

**Part 3 — new problems, most severe first**

1. **The confirm card makes me vouch for a revision I can't pin down — Minor.** `desktop-6` has the checkbox "I have reviewed revision 3" and the chip "Draft · revision 3", but `desktop-2` was "Revision 2" with one of six decided and `desktop-5` is "Revision 3" with six of six, so nothing tells me what a revision covers or what changed since I last looked. Fix: make the tick say "this brief", or show a one-line "what changed" next to it. Severity: Minor.
2. **The summary box on the confirm screen looks editable — Minor.** `desktop-6`/`phone-6` draw "First version summary" as a bordered box with a resize grip while every decision above it is static text, so I don't know whether I'm meant to rewrite it or whether typing changes the scope I'm confirming. Fix: render it as plain read-only text, or label it "read-only — change it in Discovery". Severity: Minor.
3. **My typed answers are signed "You · Harbor Community Kitchen" — Minor.** `desktop-2`/`desktop-4`/`desktop-5`/`phone-2` tag my answers that way while the intake bubble says "You · From your intake", so my own message reads as if the whole NGO sent it. Fix: use one source tag for both ("You · your answer" vs "You · from your intake"). Severity: Minor.

Verdict: ready
