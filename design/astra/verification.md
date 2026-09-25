# First Astra prototype verification

Date: 2026-09-21. Status: working draft, awaiting founder review.

## Build checks

- `bun run design:astra:check` passes.
- `bun run design:astra:build` passes.
- `bun run design:astra:export` creates the local review package.
- `git diff --exit-code -- design/screens` confirms that the Claude exports are unchanged.
- The prototype source contains no fetch, WebSocket, or Supabase calls.

## Browser checks

The compiled preview runs at `http://127.0.0.1:4310/`.
The following checks use the rendered interface:

| Check | Observed result |
| --- | --- |
| Dashboard through intake | Continue opens the saved project need. The intake form opens Discovery. |
| Draft persistence | Three selected answers and a note remain after a reload. |
| Dependent questions | Self-booking exposes booking rules. Trained roles expose training approval in the next round. |
| Free replies | A round uses one daily and one beta turn, including rounds with several answers. Paid fuel stays unchanged. |
| Scope approval | Confirmation stays disabled until the NGO checks the acknowledgment. Approval and its revision survive reload. |
| Fuel transfer | Approval sets aside $10 once for the next stage. Reload does not repeat the transfer. |
| Submission | Explicit acknowledgment enables submission. Submission displays the human review state without an external request. |
| Answer revision | Editing booking after approval clears approval, removes dependent answers, and uses no turn. |
| Paid reply | The receipt shows $0.040 usage plus $0.006 fee. The available balance becomes $9.954. |
| Failed reply | Answers remain. No turn is charged. Retry charges one free turn after success. |
| Exhausted beta and fuel | Sending remains disabled after all answers are selected. The draft stays available. |
| Sample top-up | Adding $50 enables paid sending. It does not renew free counters or erase the draft. |
| Usage pending | The panel labels the $0.25 reservation separately from settled usage. |
| Fit decline | The oversight notice appears. The composer is absent. |
| Reopened project | The original decline remains accessible. Free turns resume and the fuel balance is zero. |
| Narrow screens | All eight routes have no horizontal overflow at a 320-pixel viewport. |
| Mobile brief | View brief focuses the labeled brief without changing the Discovery route. |
| Themes | Light and dark Discovery layouts render at the narrow viewport. |
| Browser errors | The browser reports no captured errors or warnings during the checks. |

The browser viewport returns to its default after the checks.
The sample is reset for the founder's first review.

These checks cover the fixture mock only. They do not establish backend, payment, or production acceptance compliance.
