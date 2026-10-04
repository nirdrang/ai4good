# Wired Discovery screen

The signed-in NGO administrator opens `/discovery/:organizationId/:projectId` for a submitted project need. The route mounts `DiscoveryScreen` and `DiscoveryReview`. The port calls edge functions only: conversation, message, brief, file and allowance. The screen holds no service-role key. Technical scope belongs to the PRD step.

## Prepare and reach the screen

The one local stack must already be running from this checkout. Run the Doctor checks in the verify skill and confirm the functions mount. Do not restart a stack someone else started. Edge function changes need the stack owner to load the committed files. An integration acceptance run resets the database; finish that run before driving the screen.

Run `bun .claude/skills/verify-ai4good/scripts/prepare-chat-page.ts`. It follows email signup, mail confirmation, password sign-in, NGO completion, need start and submit. It prints a throwaway email, password and screen URL; keep those credentials out of evidence. Its setup transcript is redacted. The need describes volunteer scheduling across three kitchens.

Set the app's `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` to the local status values, then run `bun run dev` and open the printed URL. Sign in using the printed credentials. The automatic drive passes these settings directly to the app process it starts; it writes no environment file.

## Drive on desktop and phone

Run `bun .claude/skills/verify-ai4good/scripts/drive-discovery-screen.ts [outDir]`. It prepares two independent projects, starts its own app and browser processes, and stops only those processes. It drives the real route at 1440 by 1000 and 390 by 844, writes redacted setup and run transcripts plus screenshots, and exits 0 only if every end state below holds. It spends real provider usage using `DISCOVERY_PROVIDER` and `DISCOVERY_MODEL` from the edge environment. File ingestion costs no Discovery reply or fuel.

1. Sign in. The first AI reply and answerable question cards appear. The live brief exists. Daily replies equal the grant: the opening was free.
2. Select a Suggested answer and Send. The answer is agreed in the stored brief, the brief revision rises, and exactly one daily reply is used. Each question retains its reason, options and importance.
3. Add a sample text file through the file chooser. Reading progresses to Ready with facts. Its digest is stored, its facts reach the brief marked with the file source, and usage stays unchanged.
4. Reload and select Finish Discovery. One review page shows open questions before the brief. Reading and review cause no model call or charge.
5. Acknowledge the current revision, remaining gaps and data responsibility where shown. Finish records the current revision, approver, time and accepted gaps. Reload preserves Discovery finished. Usage stays unchanged.
6. Inspect exact refusal kinds through the same edge functions: `finished` for a further reply, `stale-revision` for an edit against an old revision, `invalid-request` for missing finish acknowledgements, and `no-such-project` for a project outside the named organisation. Each refusal has an error HTTP status.

The acceptance suite separately covers role and verification gates, the organisation kill switch, stale cost previews, limits, retries, paid USD display, file limits, both themes and dependent-topic review. This drive is the real product path, with no direct database writes for setup. Database reads prove the saved file facts.
