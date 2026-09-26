# Discovery revision 5: NGO usability critique

Date: 2026-09-26. Revision 5 author: Claude, working on Astra revision 4.
This folder holds the critique record for Discovery revision 5. The changes themselves are in `../src/`.
See [the Discovery review](../discovery-review.md) for the revision history and approval status.

## Method

An agent played Dana, a non-technical coordinator at the sample NGO.
The agent ran on DeepSeek V4.1 Flash at the max effort, through opencode, with no write tools.
The opencode export of each run confirms the served model and effort.
A script captured the Discovery states on desktop (1366 pixels) and on a phone-width screen (390 pixels).
The agent critiqued each set of screenshots. Claude then changed the layout.

| Round | Screens | Result | Record |
| --- | --- | --- | --- |
| 0 | Astra revision 4, main flow | 6 Major, 2 Minor | `round0-astra-revision4.md` |
| 1 | First Claude changes, main flow | 1 fixed, 6 partly fixed, 1 new Major. Verdict: not ready | `round1.md` |
| 2 | Second Claude changes, main flow | No Blocker or Major left. Verdict: ready | `round2.md` |
| 3 | Eleven usage and credit states | 3 Major, 6 Minor. Verdict: not ready | `round3-usage-states.md` |
| 4 | The same states after the fixes | All eleven states Clear. 3 Minor. Verdict: ready | `round4-usage-states-after-fixes.md` |

The founder allowed three rounds, then approved a fourth to review the round 3 fixes.

## Second critic: GPT-6 Astra at low, operating the mock

The founder then asked for a second critic that works in the mock, with up to three iterations.
GPT-6 Astra ran at the low effort through `codex exec`, read-only, as the same NGO persona.
It used its own browser tool (`cua_repl`) to click, type, and look at the page in Chrome.
It completed Discovery, confirmed the brief, tried five money situations, and repeated a short run at 390 pixels.
The prompt is `astra-prompt.txt`. Each later iteration also received the previous critique.

| Iteration | Browser actions | Result | Record |
| --- | --- | --- | --- |
| 1 | 68 | 3 Major, 3 Minor. Verdict: not ready | `astra-iteration1.md` |
| 2 | 78 | 2 fixed, 1 partly fixed. 1 Major, 4 Minor. Verdict: not ready | `astra-iteration2.md` |
| 3 | 82 | All Major problems fixed. 4 Minor. Verdict: ready | `astra-iteration3.md` |

Changes after iteration 1:

- A compact progress strip with Finish Discovery stays on screen after the progress panel scrolls away.
- The side menu uses the process bar's stage names and numbers: Intake 1, Discovery 2, Discovery review 2, Volunteer match 3.
- The review page explains Lovable in plain words.

Changes after iteration 2:

- The review page shows the standard Lovable subscription, about $25 a month, paid directly and never from fuel.
  The requirements already demand this disclosure. The earlier mock did not show it.
- The review page says ai4good gives no ongoing support after handoff in this version, and that larger work is a new project.

Remaining Minor findings, not acted on:

- The full usage card is below the brief, away from Send. The composer line shows the next-reply mode and, when paid, the fuel left.
- On a phone, the first question starts below the first screen.
- Amounts such as $0.046 have no cents equivalent. The contract requires fractional cents to stay visible.
- The process bar label "PRD" is not explained. The contract fixes the process bar labels.

Run notes: the browser tool used the founder's own Chrome, because the built-in browser was not available to `codex exec`.
In iteration 3, codex's automatic approval review stopped one paid send at phone width. The phone run therefore stopped at 83%.
The three runs read about 5.5 million input tokens each, almost all from cache.

## Findings not acted on

- The critic asked for the "revision" term to change. The acknowledgment uses that term, so it stays.
- The critic asked for a read-only first version summary. The contract makes the summary editable.
- The critic asked for the usage counters to be hidden. The contract requires all four values together.
- The fixture shows 0 of 10 daily turns next to 42 of 50 beta turns. This is fixture preset data, not layout.
- The 80% gauge bar reads dark amber, not clearly yellow.
- The phone "View brief" button position and the topic wording remain Minor findings.

## Evidence limits

The agent judged static screenshots only. It did not operate the screen or the Buy fuel checkout.
Full-length captures cannot show fixed elements while scrolling. One extra phone capture showed the fixed bar.
Three critic claims were wrong, and Claude checked each against the screenshots:

- Round 1: the data explanation was already above the confirm button.
- Round 3: the empty-fuel state shows no gauge, so it cannot say "Within allowance".
- Round 4: with the beta limit reached, the card already says a daily reset does not renew it.

The critic did not see the decline, reopened, reference-file, edit-after-confirmation, dark-mode, or keyboard states.

## Repeat the critique

The screenshots are not committed. The scripts regenerate them.
The capture scripts need `playwright-core` and a local Chrome. Install `playwright-core` in a scratch folder, not in the repository.

```powershell
bun run design:astra:build
bun run design:astra:preview
node capture.mjs 4310 <image-folder>
node capture-usage.mjs 4310 <image-folder>
```

`round.ps1` sends a prompt, the previous critique, and the screenshots to the critic.
Set `OPENCODE_EXPERIMENTAL_OUTPUT_TOKEN_MAX` to 96000 first. At the default of 32000, the model spends the whole budget on reasoning and returns no answer.
