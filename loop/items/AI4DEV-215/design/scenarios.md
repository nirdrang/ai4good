## The shared scenario table (the fixture writer builds these; the test writer opens them)

The shell URL is `/?scenario=<name>&pace=<test|demo>&viewer=<dev|ngo>#prd-workspace`. `viewer` is optional; each scenario has a default viewer. One fixture world per scenario is shared by both viewers, so switching the viewer (the shell chrome buttons with `data-testid="prototype-viewer-switch"`, one button per viewer, named "Priya (Dev)" and "Maya (NGO)") shows the same record to the other person. Each scenario also has a start view, which the screen opens first.

The sample is the canvas sample: Harbor Community Kitchen, Priya Shah (developer), Maya Levi (NGO coordinator), the AI. Use the canvas texts verbatim wherever the canvas has them (`design/canvas/prd-workspace/project/Main.dc.html` and `Phone.dc.html`).

| scenario | default viewer | start view | what it is |
|---|---|---|---|
| `first-entry` | dev | main | Developer enters PRD for the first time: six required topics derived from approved Discovery revision 12, all Open or Draft, the AI's opening message, nothing posted to Maya yet. |
| `prd-today` | dev | main | The canvas board's starting state: several days of history, mixed topic states (Open, Draft, Ready to confirm, Confirmed, Needs review all present), the retention question posted to Maya and blocking, the logo question posted and not blocking, the success question suggested in an AI reply and not posted. Funds: $8.80 left of $20.00. Two shift questions for Priya in the Shift scheduling rules topic chat. |
| `answer-complete` | dev | questions | As `prd-today`, but Maya completed the retention answer ("Keep a volunteer’s email and phone for a year, then delete them. Shift history stays, without names."). Priya sees View answer and Use answer. |
| `all-ready` | dev | main | Every required topic Ready to confirm except one Confirmed. Confirming the last one runs the completion check, which fails the first time with the canvas's two gaps (public-holiday closures in Shift scheduling rules; volunteers aged 16 and 17 in Users and roles). Fixing each in its topic chat closes the gap; confirming again runs the check, which passes at 91%. |
| `check-passed` | dev | main | All required topics Confirmed, the check passed for the current revision, and the AI's completion message carries the inline Close PRD recommendation. A message in the Shift scheduling rules chat changes a decision: that topic and its dependent Technical scope go to Needs review, the other four stay Confirmed. |
| `closed` | dev | main | Closed at revision 18 with 2 open points. |
| `queue` | dev | main | Like `prd-today`, but each scripted reply holds for 3 seconds so messages can be queued, edited and removed. |
| `funds-out` | dev | main | Available funds below one reply's hold: Send is off and the funds-out line shows. |
| `funds-79999`, `funds-80`, `funds-95`, `funds-95001` | dev | main | Settled spend at exactly 79.999%, 80%, 95% and 95.001% of the allocation, no pending. |

The model-call probe (the global name in `MODEL_CALL_PROBE` from `design/astra/src/givens.ts`) is called once per paid generation, with these names: `prd-chat` (main or topic chat reply), `prd-side-chat` (side chat reply), `prd-answer-write` (Mark answer complete), `prd-check` (completion check). Navigation, typing, opening questions and topics, and closing after a passed check call nothing.
