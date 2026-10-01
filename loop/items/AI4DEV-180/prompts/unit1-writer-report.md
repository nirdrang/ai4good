Unit 1 of AI4DEV-180 (Discovery screen on fixtures) is committed on `lane/ai4dev-180/unit1`. The branch is not pushed.

**Commit**

`07265355d87307327916c1f70411142e7cb49e1c` — loop: the first Discovery reply runs in the fixture shell (AI4DEV-180)

**Checks**

| Check | Exit | Result |
|---|---|---|
| `bun install` | 0 | 641 installs across 745 packages, no changes |
| `bun run typecheck` | 0 | four projects clean |
| `bunx tsc --project design/astra/tsconfig.json` | 0 | no errors |
| `bun run at:selftest` | 0 | 35 files, 474 tests passed |
| `bun run at:check req-004` | 0 | 70 acceptance ids in bijection |
| `bun run at:verify req-004 --tier loop --expect` | 0 | 70 ids: 35 green, 35 red. AT-004.65 is green. The run matches the declaration. |

The fixture shell was opened at `http://localhost:4310/?scenario=first-reply&pace=demo#discovery`, then stopped. This session has no browser pane, so headless Chromium under Node loaded the page. At 1280×800 and at 390×844 the first reply, both questions, and the Your files card render. The suggested answer "Less coordination time" becomes pressed. Port 4310 is closed.

**Design points this unit does not follow**

- The type check covers four projects. The design text says five. This tree had three projects. The fixture shell is the fourth.
- The Node host loads Playwright with a function named `load`. A call named `require('playwright-core')` still pulls Playwright's DOM types into the acceptance-test project, even with `@ts-nocheck`. The host file keeps `@ts-nocheck` because its browser callback names `document`.
- `tests/at/harness/dom-names.d.ts` is still on disk. A delete was blocked. The file is only `export {}`, and it is not in the commit.
- The opening reply says "files that show how the NGO works today". The approved canvas says "how you work today". The acceptance text requires the NGO wording.
- A locator step can set `position` to `last`. The design lists role, name, and text. The test reads the latest message.
- If the static server is already stopped, close treats that as a finished close. The first close order failed the expect gate with `Server is not running.`

**Later units**

- Add a file does not open a chooser. The file-chat transport still throws.
- The screen hook keeps the main chat, the brief snapshot, answer drafts, and send. It does not keep file-chat state.
- The page object covers the chat, Send, and the file list. The host already accepts model calls, fill, press, box, files, and reload.
- `model.ts` has the four functions this unit uses. Progress, usage, and review helpers wait.
- Discovery review is a placeholder. The scenarios are `first-reply` and `first-reply-three-files`.
- AT-004.61 through AT-004.64 and AT-004.66 through AT-004.73 stay not yet.