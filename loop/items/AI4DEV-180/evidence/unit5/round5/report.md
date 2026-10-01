Round 5 confirms issues 19 and 20 fixed. Regression checks 13, 17, and 18 pass. One new major issue follows.

I completed eight interviews through Volunteer match. These cover both question modes, 1280×900 and 390×844, and light and dark themes. Phone contexts used touch and a phone user agent. All runs used Node Playwright and `pace=demo`.

I opened all nine scenarios in those four combinations and at 320×700. Further checks covered files, custom answers, uncertainty, suggestions, review edits, Cancel, confirmation, and reloads. The original suspected layout and reading-colour problems did not reproduce. No minor finding warrants reporting.

The requested checks pass:

- **19: Fixed.** Accept Booking rules in `finish-open`. Review and live brief both offer Edit. Questions offers View and highlights the accepted suggestion in chat. The controls work before confirmation, after confirmation, and after reload. Editing the accepted suggestion adds one new person-side line. Accepting all four suggestions also leaves every answered review section editable. Screenshots: `1280-light-all-suggestions.png`, `390-dark-19-brief.png`, `390-dark-19-confirmed-reload.png`.
- **20: Fixed.** Edit Main priority in `mid-interview`, select Fewer unfilled shifts, and save. View highlights the newest answer line. Repeat after confirmation and reload: View still works. Review-page saves also have working targets after reload. Each saved change adds one person-side line without a model call. All four display combinations pass. Screenshots: `1280-light-20-before.png`, `390-dark-20-after-reload.png`, `390-dark-review-edit-reload.png`.
- **13: Fixed.** At six agreed topics, the finish invitation replaces the composer in all eight interviews. Screenshot: `390-dark-together-round3.png`.
- **17: Fixed.** Manual edits leave daily replies at three, beta replies at 18, and fuel at $10.00. A paid-mode edit leaves $1.60 unchanged. No model call occurs. Screenshot: `1280-dark-17-paid-edit.png`.
- **18: Fixed.** After confirmation, both live-brief Edit and Questions Answer open usable questions. Saving clears confirmation and uses no model call. Screenshot: `390-dark-18-answer.png`.

21. **Major — File replies do nothing after Discovery confirmation.** Viewports: 1280×900 and 390×844, both themes. Open `finish-open`, tick all acknowledgments, and finish Discovery. Return to chat, select Add a file, and choose `sunday-gaps.csv`. Select These are the shifts we could not fill. Nothing happens. Type an answer and select the enabled Send button. Nothing happens again: the draft remains, no answer appears, and the status stays Setting up. No model call occurs. Cancel, reload the confirmed Discovery, and repeat: the same failure occurs. The contract says the file answer starts reading (`design/discovery-ui-contract.md:269`). The interface instead offers actions it cannot perform, with no explanation. This prevents the offered file action; it does not block Discovery completion. Screenshots: `1280-light-21.png`, `390-dark-21.png`, `390-dark-21-reload.png`. Reproduction and observations: `finding21.mjs` and `finding21.json`.

Scripts, screenshots, and browser observations are in this report's folder. An approved server retry resolved the dependency-access restriction. Browser selector and script errors were corrected; they are not product findings.

The fixture server and explorer browsers are stopped. Only this evidence folder has workspace changes. Nothing was committed or pushed.
