# Technical scope in the PRD step

Discovery finishes with a confirmed need brief. Its screen has no scope, stack, build split, Lovable plan or regeneration control. The technical scope is produced from that confirmed brief revision in the PRD step.

The PRD workspace has not shipped. `generateConfirmedScope` in `supabase/functions/_shared/scope.ts` is the shared generator driven by AT-036.11 and AT-036.12 at both tiers. It rejects a stale confirmation, missing or malformed `record_scope`, stories without an agreed topic or accepted gap, changed data tier or fit verdict, missing build-split parts, and forbidden money figures. Every story carries its source topic id.

The retained `discovery-scope` edge entry accepts `generate` for a project keyed to its latest confirmed brief. There is no Discovery-screen caller. Its database gate requires the current confirmed revision; the old `regenerate` and `remove-label` actions are refused. Cause-label removal uses `discovery-brief`, action `remove-label`, with `baseRevision`. Scope generation has no Discovery allowance debit.

Run `bun run at:verify req-036 --tier loop --expect` and then `bun run at:verify req-036 --tier integration --expect`. Integration drives the shipped shared generator through `discoveryModelPort()` using the same provider environment as the stack. It makes a real model call for the confirmed document. The renderer is checked with the same three data-tier fixtures at both tiers. Expected result: two scope cases green, ten PRD workspace cases explicitly pending.

The result contains stories with nested criteria and Discovery source ids, stack, complexity with rationale and start-small advice, risk flags, the recorded data tier and maintainability verdict, Lovable recommendation and rationale, and both build-split parts. Rendering includes code ownership, maintenance by chat for about $25 a month paid directly to Lovable, and public pricing when recommended. It contains no project or build estimate. Tier 2 explains synthetic or anonymised fixtures during build and NGO connection of real records after completion.
