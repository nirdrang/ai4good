# Brief for AI4DEV-276 (topics fit each NGO need)

Chain: AI4PM-26 (free AI Discovery agent) > AI4DEV-131 (Discovery agent: dev root) > AI4DEV-276 (topics fit each NGO need)
Branch: claude/project-thread-udwcmc (cloud project thread; the Linear branch name is nirdrang/ai4dev-276-discovery-topics-come-from-each-ngos, and the pull request links the item with one line `Closes AI4DEV-276`)
PRD slice: loop/out/pure-s3-req-001-006.md, line 60, "Discovery completion" (on main). The phone redesign pull request (#111, open) changes it: completion needs an agreed answer to each key topic, the main priority, the information the tool handles, and who maintains the tool; "I'm not sure" does not settle a key topic; the key flag is set by code, not by the AI; it adds AT-004.81 as a pending test.
Item text:
Every Discovery starts from the same six topics, written for one sample NGO: a community kitchen that schedules volunteer shifts. An NGO that needs a donor tracker still gets "Who books shifts" and "Booking rules". The founder, 2026-11-18: "Nothing should be hard coded !"
What is hard-coded today: DEFAULT_TOPICS in supabase/functions/_shared/discovery-brief.ts; openingDocument's topics argument, which nothing passes; DISCOVERY_FILE_REQUEST in discovery-reply.ts ("A rota, a sign-up sheet, or your volunteer rules"); "a rota" as the prompt's example document.
What should happen: the topics for a project come from that project's need (intake, files, first exchange) and are stored on the brief. Three topics are the same for every project: main priority, information handled, maintenance owner. Only these carry the key flag that gates Finish. Their wording can still fit the need. The other topics, options and suggestions are generated per need and checked by code: a fixed schema, a count limit, no key flag. The file request names documents that fit the need.
Open design point: one opening model call with a topic-plan tool, or the first reply's tool call. Either way the model writes the topics, and code owns the key flag and the schema.
Acceptance tests: tests/at/suites/req-004/ (loop and integration tiers, --expect), tests/at/harness/discovery-brief.selftest.ts, tests/at/harness/discovery-reply.selftest.ts.
Founder direction for this run (2026-11-18): "Sure why do I need to govern this push things fwd". Decide routine choices; bring only product decisions.

## The ask
Run this item in poteto-mode and open one pull request from this branch. Name no item id in the pull request title or body except the one closes-line. Merge only when CI is green on the exact head and the founder says "merge".

## Cloud facts
- grok and codex writer lanes are not logged in here; a native Claude lane writes, and the pull request says so.
- Integration and live-model runs go in the cloud. The Discovery provider is OpenAI (gpt-6-luna).
- Use this thread's own dev server and browser for checks; start no Vercel Sandbox viewer.
