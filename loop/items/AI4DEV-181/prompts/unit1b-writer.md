# Writer brief: unit 1, continued (the brief store, steps 2 to 4)

Follow `loop/items/AI4DEV-181/prompts/unit1-writer.md` for the rules, the reading list, the build
steps, the tests and the checks, with these changes:

- Your working directory is the git worktree on branch `lane/ai4dev-181/unit1`. Step 1 is done and
  committed as `98dc1e50` ("loop: the discovery brief rules"): `supabase/functions/_shared/discovery-brief.ts`
  and `tests/at/harness/discovery-brief.selftest.ts` (at:selftest 485 passed). Read both first and
  build on them; change them only where steps 2 to 4 need it, and say what you changed.
- Do steps 2 (the migration), 3 (the `discovery-brief` edge function and the `write-routes.ts`
  registrations), 4 (`discovery-conversation` adds `brief`, `confirmation` and the person lines),
  then the live proof and all the checks.
- The previous run was stopped by a time limit before step 2. **Commit after each step**, so a stop
  loses nothing.
- `supabase/functions/.env` is already in your worktree (git-ignored; never print or commit it).
