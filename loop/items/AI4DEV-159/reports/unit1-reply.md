A signed-in NGO admin can chat with Discovery at `/discovery/:organizationId/:projectId` through the two edge functions, with `useChat` and no server secret.
Installed `ai` 7.0.102, `@ai-sdk/react` 4.0.105, `react-markdown` 10.1.0; moved `@supabase/supabase-js` into `dependencies`.
`typecheck` 0, `build` 0 (Nitro skipped), `at:check req-004` 0; `at:selftest` 1 — pre-existing discovery-skills line-ending mismatch, 444 passed, not this unit.
Did not wrap `fetch`: the transport already throws the response body as `Error.message`. This commit mixes `src/` with `.claude/` and `loop/`; a single pull request will fail the ownership guard.
`loop/items/AI4DEV-159/reports/unit1.md`