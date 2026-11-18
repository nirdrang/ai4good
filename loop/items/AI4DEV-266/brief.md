# Brief for AI4DEV-266 (who may read a project's files) with AI4DEV-143 (Discovery reads every file)

Chain: AI4DEV-258 (project need attachments root) > AI4DEV-260 (who can read a file) > AI4DEV-266 (who may read a project's files)
Second unit chain: AI4DEV-131 (Discovery root) > AI4DEV-134 (reference files in Discovery) > AI4DEV-143 (Discovery reads every file)
Branch: claude/project-thread-q6fpxo (a cloud thread branch; it carries no item id, so attribution comes from this brief, and the pull request names AI4DEV-266 in its body and AI4DEV-143 in one closes-line)
Base: origin/main at c095bd6

PRD slice: loop/out/pure-s6-req-027-036.md, REQ-032, verbatim, and the reference-files bullet of REQ-004:

#### REQ-032: Project Need Attachments (NGO reference files for Discovery + build)
The NGO uploads reference files (screenshots, sample forms/data, mockups, requirements PDFs); Discovery reads them multimodally and the volunteer uses them at build.
- Files can be uploaded during Discovery (the agent may ask) or from the project page pre-completion; intake takes no files. Supported types include PDF, images, CSV/TSV, TXT, and DOCX/XLSX, under per-file and per-project size caps. While the project is not funded, the NGO can add at most three files during Discovery.
- Access is limited to the project's NGO account, the assigned volunteer, and the platform admin (the repo is public but the files are restricted); access is via short-lived authorized links and the UI never holds storage credentials.
- PII is governed by disclosure: the NGO is told to provide redacted/sample data only, not real beneficiary records, and that ai4good and the volunteer will see the files. Tier-2 adds a hard acknowledgment restating fixtures-only — the NGO connects real data itself, in its own environment, after completion. There is no upload scanning in v1; the NGO owns the risk per the data-responsibility acknowledgment (→ RM-37).
- Discovery reads every uploaded file through a file chat and a stored digest (REQ-004); there is no visibility choice. The digests and the NGO's file-chat answers ride its context, and Discovery may cite files in its questions and the Discovery document. A file read never consumes credits or fuel and never interrupts; file-chat answers are Discovery turns.
- The volunteer downloads files from the project page (→ RM-31); downloaded files are kept out of the repo's normal contents (an accidental-commit residual is accepted at pilot scale, mitigated by secret scanning and the fixtures-only rule).
- The project page lists reference files with their metadata (name, type, uploader, description); deleted files remain recoverable and deletion history remains auditable; uploads and deletes are audited.

From loop/out/pure-s3-req-001-006.md, REQ-004:

- **Reference files:** while the project has fewer than three Discovery files, the first AI reply asks for files that show how the NGO works today and names the kinds that would help this need. Adding a file opens a short file chat with one question: what should we know about this file, with suggested answers and free text. The answer starts the read. One read processes the whole file, in parts when the file is large, with the NGO's answers as its instruction, and stores a digest: the facts that matter for the need and the questions the file raises. If the AI needs more to finish the read, it pauses and asks in the file chat until the read is complete. Each NGO answer in the file chat is one Discovery turn, free or paid. The read itself consumes no turn and no fuel. The NGO can close the file chat and keep using the main chat during the read; the file list shows reading progress, a waiting question, and then the number of facts found. Later turns receive the digests, not the files. The next AI reply says what the file showed, and the AI may cite files. Every uploaded file is read; there is no visibility choice. While the project is not funded, the NGO can add at most three files in Discovery; intake files do not count (REQ-032).

Item text: see the Units. The pair was picked by the founder from the project chat as a cloud run: both block AI4DEV-270 (seven-format reads).
Acceptance tests: tests/at/suites/req-032/z-pending.test.ts (AT-032.04), tests/at/suites/req-004/z-later-runs.test.ts (AT-004.16, AT-004.18)

## Units

### Unit 1: AI4DEV-266 (who may read a project's files)
Item text: The project's NGO, the currently assigned volunteer and a platform admin can read the files. Another NGO, a volunteer who is not assigned, an unauthenticated caller and a released former volunteer are refused.

**Verify:** AT-032.04
**Blocked by:** D1.L1 (AI4DEV-264, Done).
Acceptance tests: AT-032.04, today a pending stub in tests/at/suites/req-032/z-pending.test.ts. Move it to a real suite file.
Facts: the developer seat is `projects.assigned_volunteer_id` (migration 20260811130000); a release sets it to null. `viewer_is_platform_admin()` and `viewer_is_volunteer()` exist (migration 20260907120000). Files live in the private bucket `discovery-files` at `<project id>/<file id>`, reached with the service key from edge functions only (founder ruling 2026-10-24). Short-lived links are the next leaf (AT-032.05); this unit decides who may read, not the link mechanism.

### Unit 2: AI4DEV-143 (Discovery reads every file)
Item text: Every uploaded file is read (d94). There is no Discovery-visible flag and no visibility choice. A sentinel file is cited in the reply or the Discovery document. The agent can ask for more material and the NGO uploads it mid-conversation.

The upload primitive and the access model belong to the need attachments requirement, not materialised. Decide in the design how file reading is proven until they exist.

**Verify:** AT-004.16, AT-004.18 (AT-004.17 is retired by d94)
**Blocked by:** D2.L1, plus the upload primitive and access model in the need attachments requirement
**Manifest:** `loop/decomp/req-004.md`, deliverable D3 leaf L1, revision `3faa044`
Acceptance tests: AT-004.16 and AT-004.18, today awaiting the `referenceUpload` capability in tests/at/suites/req-004/z-later-runs.test.ts.
Facts: the upload primitive landed (PR #102) and the background read to a digest landed with AT-004.65 to .70 (tests/at/suites/req-004/j-need-brief.test.ts; supabase/functions/discovery-file, discovery-file-read, _shared/discovery-file-*.ts). This unit proves reading with the reader that exists today. Replacing the reader (the Claude reader proposal) belongs to AI4DEV-270 and is not decided.

## The ask
Run this item in poteto-mode and open one pull request from this branch. One pull request is
a project rule; it overrides the playbook's preference for narrow pull requests.
Design once for both units, then build the units in order, one commit group per unit.
At every unit boundary, after the unit's commit is on the branch, stop at a gate. This is a
cloud thread: the AskUserQuestion tool does not reach the founder here, so the gate is a
decision card in the project thread with the same options (Continue, Stop), and its text
says what the unit landed and its commit.
Send lookups that do not depend on each other together in one message.
In the pull request title and body, name no item id except AI4DEV-266, plus the one line
`Closes AI4DEV-143` alone on its line, and name each unit by its short label in words.
Then close the item as the Closing section says.

## Closing (the git part is yours, the board is not)
1. Wait for CI to be green on the exact head of the pull request, and for the founder to
   say "merge". Both, never one.
2. Merge with a squash merge. The merge closes both items through the pull request links.
   Delete no branch.
3. Do the board steering of `/controller done`: confirm both items Done, fold upward, read
   the "Not done here" list, recommend; the founder files.

## The evidence bar
- The verify suite for the acceptance tests above passes on the final head, run as background
  shell commands. Name each check, its exit code, its counts and its timestamp in the
  Verification section.
- CI is green on the final head.
- Discovered work goes in a "Not done here" list in the pull request body, never in the diff.

## Environment facts
- One database, the stack `supabase/config.toml` describes. Start it with `bun run db:start`;
  every integration run resets it. Integration runs happen in this cloud VM, never on the
  founder's PC.
- Discovery in this cloud environment runs on OpenAI (DISCOVERY_PROVIDER=openai-responses).
- No IPv6: run Vite with `vite dev --host 127.0.0.1`.
- The grok and codex writer lanes are not logged in here; a native Claude delegate writes
  code instead, and the pull request says so.
- The verify skill for this project is `verify-ai4good`.
- Run the acceptance suite yourself: `bun run at:verify <req> --tier integration --expect`
  as background shell commands that write to a file. CI runs only the loop tier.
