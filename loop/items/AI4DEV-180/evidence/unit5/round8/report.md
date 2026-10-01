No new issues.

- **23: Fixed.** The kitchen-name question and its answer remain in the file transcript after reading finishes and after another reload. I checked answering directly, answering after reload, and answering after closing and reopening the file chat. All 18 cases pass: 1280×900, 390×844, and 320×700, each in light and dark themes. Screenshots: `1280-light-23-settled.png`, `1280-dark-23-settled.png`, `390-light-23-settled.png`, `390-dark-23-settled.png`, `320-light-23-settled.png`, and `320-dark-23-settled.png`.
- **21: Fixed in the spot check.** At 390×844 in dark theme, I closed a file during reading and confirmed Discovery. Reopening the file, including after reload, preserves its messages and finished notice without answer buttons or Send. Screenshot: `390-dark-21-confirmed-settled.png`.
- **22: Fixed in the spot check.** At 390×844 in dark theme, I reloaded during Reading at 35%. Reopening the file reaches the kitchen-name question with answer controls. It does not skip the question. Screenshot: `390-dark-22-paused.png`.

I completed eight interviews through the Discovery document and Volunteer match. These cover both question modes, desktop and phone, and both themes. Phone contexts use touch and a phone user agent. All checks use Node Playwright and `pace=demo`.

I opened all nine scenarios at all three widths in both themes. Further checks cover custom answers, uncertainty, Questions Answer and View, focus, live brief edits, review suggestions, review edits, Cancel, Save, and confirmation reloads. No horizontal page overflow appeared. The original suspected layout and reading-colour problems did not reproduce.

`results.json` records transcripts and measurements. `explore.mjs` contains the repeatable file checks, interview flows, and further exploration. Some initial captures caught opening animations; the settled screenshots named above show the final file layouts.

The approved server retry resolved sandbox dependency access. Browser locator corrections and one browser-tool timeout were exploration problems, not product findings. The fixture server is stopped. Only this evidence folder has workspace changes. Nothing was committed or pushed.
