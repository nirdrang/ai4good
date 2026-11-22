# Brief for AI4DEV-270 (Discovery reads all seven formats)

Chain: AI4DEV-258 (project need attachments root) > AI4DEV-262 (Discovery and build use of files) > AI4DEV-270 (Discovery reads all seven formats)
Branch: claude/project-thread-i4q9ha, which carries the first run's branch claude/project-thread-q6fpxo (a cloud thread branch with no item id; the pull request body carries `Closes AI4DEV-270`)
Base: origin/main at 79db31e

PRD slice: loop/out/pure-s6-req-027-036.md, REQ-032, the bullet:
- Discovery reads every uploaded file through a file chat and a stored digest (REQ-004); there is no visibility choice. The digests and the NGO's file-chat answers ride its context, and Discovery may cite files in its questions and the Discovery document. A file read never consumes credits or fuel and never interrupts; file-chat answers are Discovery turns.

Item text: File names and one-line descriptions ride the agent's context, with observable sentinels. Discovery questions and the scope document can cite files. Sentinels that sit only inside the content of all seven formats show up in output, which proves the files are read multimodally and not only listed.

**Verify:** AT-032.08, .12
Acceptance tests: AT-032.08 and AT-032.12, today pending stubs in tests/at/suites/req-032/z-pending.test.ts.

Reader (second run, 2026-11-22): the founder ruled "no haiku i want to use openAI since i have allowance for free API credit". The reader gets its own OpenAI setting (`OPENAI_API_KEY`, `FILE_READ_MODEL`) and no longer follows the Discovery provider. A PDF goes to OpenAI whole. Word, Excel, CSV, TSV and text keep the converters. Files stay in the private bucket. Reads meter no fuel.

## The ask
Run this item in poteto-mode and open one pull request from this branch. Name no item id in the pull request title or body except the line `Closes AI4DEV-270`.

## The evidence bar
- `bun run at:verify req-032 --tier integration --expect` and `--tier loop --expect` pass on the final head.
- CI is green on the final head.
- Discovered work goes in a "Not done here" list in the pull request body.
