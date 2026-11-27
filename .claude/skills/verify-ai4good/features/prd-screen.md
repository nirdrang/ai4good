# PRD workspace screen

The Dev and the NGO administrator open `/prd/:organizationId/:projectId`. The Dev is the volunteer assigned to the project and is the person who writes. The NGO administrator reads along and answers questions in side chats. The route mounts the PRD workspace. The port in `src/lib/prd-port.ts` calls edge functions only. The screen holds no service-role key and does not touch the database.

The screen shows the main chat, one chat per topic, NGO question side chats, and the PRD panel. The panel has the topic list, the funds gauge, and Close PRD. A closed PRD shows a closed banner and stays frozen after reload. For the NGO administrator the main chat is read-only: the banner says "You can read along" and the main-chat composer is absent. On a phone the same workspace uses three tabs, Chat, PRD, and Questions. The phone layout starts at 767 pixels wide.

## Prepare and reach the screen

The one local stack must already be running from this checkout. Run the Doctor checks in the verify skill. Do not restart a stack someone else started.

Run `bun .claude/skills/verify-ai4good/scripts/prepare-prd-screen.ts`. It reuses Discovery setup, confirms one Discovery revision through the product path, then opens the PRD. A volunteer cannot finish signup without a linked GitHub identity, which this drive cannot produce, so the Dev's account row, acknowledgment row, project seat, and PRD fund credit are named operator steps in `setup.json`. Opening the PRD is a product call and creates a repository in the GitHub test organization. The command prints both people's credentials, the ids, the repository name, and the page URL. Keep the credentials out of evidence.

`bun .claude/skills/verify-ai4good/scripts/prepare-prd-screen.ts --delete <repoName>` deletes one repository created by a hand run of that prepare.

Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` from the local status, then run `bun run dev` and open the printed URL. Sign in with the printed credentials. The automatic drive passes those two settings to the app process it starts and writes no environment file.

## Drive on desktop and phone

Run `bun .claude/skills/verify-ai4good/scripts/drive-prd-screen.ts [outDir]`. It prepares one project per viewport, starts its own app, drives 1440 by 1000 and then 390 by 844, writes a redacted transcript and full-page screenshots, deletes the repositories it created, and exits 0 only when every check below passes. It spends one real Discovery reply per project, one PRD reply on desktop, and one completion check on desktop. The phone pass sends nothing.

Desktop, as the Dev and then as the NGO administrator:

1. The Dev signs in. The topic list, the main chat, and the PRD panel are on the page. `prd-snapshot` answers 200 and names the same topics.
2. The Dev sends one main-chat message. An AI reply appears, attributed to the AI. The turn row is settled, a provider ledger entry has real input tokens, and available funds fell by that turn's charge.
3. The Dev types a draft and does not send. After the save, a reload still shows the draft.
4. The NGO administrator signs in on the same route in a new browser context. The main chat says "You can read along" and has no composer.
5. The Dev opens Close PRD. The gaps warning shows Close anyway and Keep working. Close anyway leaves the PRD closed after reload for both people, and the repository has the close tag.
6. Five refusals go through the edge functions, each with an error status. The snapshot, the action, the message, and the draft each return a kind. The webhook refusal has no kind; the reason says the signature does not match. They are a snapshot of a project the caller cannot see, an action with a made-up token, a message after the close, a draft for another project, and a webhook with a bad signature. None of them calls the model.

Phone, as the Dev: sign in, the three tabs show, and switching them shows the chat, the PRD, and the questions. A fresh project has no messages, so the main chat is present and no turn was sent. This pass does not call the model.

The drive sums provider ledger entries that have real input tokens for its projects, adds the Discovery credits those projects used, prints both totals, and fails when the PRD provider spend passes 250,000 micros, which is 25 cents.
