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
