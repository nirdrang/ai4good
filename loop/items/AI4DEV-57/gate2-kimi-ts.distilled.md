SOURCE   C:\Users\nirdr\Downloads\ai4good\.claude\worktrees\artifacts-AI4DEV-57\gate2-kimi-ts.stderr.log (see NOTES — findings actually extracted from the sibling .md file)
REVIEWER kimi (kimi-code/k3, effort high) — AI4DEV-57 Gate 2, TypeScript+tests slice, head 1782d7c1afd8b898320280905777b822ba09ce70
COUNT    7 findings declared (`CODE REVIEW: 7 FINDINGS`) → 7 extracted
NOTES    Source-assignment discrepancy, flagged rather than silently resolved: the task instructions state that
         gate2-kimi-ts.stderr.log holds the actual analytical content and the closing count line, and that
         gate2-kimi-ts.md is narration-only. Reading both files shows the opposite shape. gate2-kimi-ts.md
         contains the reviewer's final, formatted deliverable — a stated severity scale, a "what I checked that
         holds" paragraph, all 7 findings in the required structured format (severity, path:line, claim, why it
         matters, unverified-runtime-claim), an "outside the TypeScript" note, and the closing line
         "CODE REVIEW: 7 FINDINGS". gate2-kimi-ts.stderr.log contains the reviewer's working notes and
         chain-of-thought (~40 numbered "Q" analytical questions, draft finding language, arithmetic checks on
         the acceptance-id count, etc.) and never resolves into the formatted contract shape inside that file —
         it ends abruptly at a session-resume line ("To resume this session: kimi -r session_...") with no
         formatted findings block and no count line actually present in it (line 451 of that file only
         mentions the string "CODE REVIEW: 7 FINDINGS" inside the reviewer's own planning prose, as a
         placeholder — "(whatever final count)" — not as an emitted closing line).
         Given this, the 7 findings below were extracted from gate2-kimi-ts.md, the file that actually carries
         the structured contract output and the real closing count line. Findings [1]-[7] below correspond
         1:1 to the raw file's [1]-[7]; all 7 are extracted, matching the declared count. No truncation
         apparent in gate2-kimi-ts.md itself. The stderr.log's draft/reasoning content is not itself a second
         set of findings — it is the scratch work behind the same 7 — so it is not distilled separately, but
         its existence and content are recorded here per the no-silent-reconciliation rule.

[1] severity: medium   supabase/functions/create-organization/index.ts:56
    claim: "`accountTypeOf` returns null for ANY non-OK PostgREST response, so a failed account-type lookup is reported to the caller as \"complete signup before creating an organisation\" (409) — the exact conflation the function's own comment (lines 41-44) says must not happen."
    why-it-matters (as stated): "PostgREST returns 5xx (or the function is briefly unreachable and the fetch at line 46 answers !ok) → a completed NGO account is told to complete signup; retrying signup then fails with \"already completed\". The caller gets two contradictory remedies for an outage. `null` should mean only \"row absent\"; a failed read needs its own 502."
    unverified-runtime-claim: no
    raw: gate2-kimi-ts.md lines 22-33 (draft reasoning at gate2-kimi-ts.stderr.log lines 119, 287, 381, 414, 445)

[2] severity: medium   tests/at/suites/req-001/_fixture.ts:224
    claim: "the organisation-name judgement on the create-organization path exists in TWO places, neither of which is the shared module: the shipped copy sits in the edge-function entry point (create-organization/index.ts:77-80, a file no type-checker covers) and the suite's copy sits in the adapter — so AT-001.06's green grades the adapter's copy of that rule, not the shipped one. The same pattern repeats for `hasPlatformAcknowledgment` (_fixture.ts:243), which re-implements the SQL predicate's kind-match rule; the plan's per-id table then lists \"the predicate discriminates\" as proved AT LOOP TIER, where only the adapter's copy runs."
    why-it-matters (as stated): "the item's central claim is \"the adapter supplies storage and the shipped module supplies every judgement\". These two judgements escaped the module. If the shipped name check regresses (e.g. stops trimming, or is deleted), the loop-tier suite stays green, and since proof-local.ts has never been executed, nothing has ever exercised the shipped copy. The fix the design itself suggests is a fifth export in `_shared/accounts.ts` that both sides call."
    unverified-runtime-claim: no
    raw: gate2-kimi-ts.md lines 34-50 (draft reasoning at gate2-kimi-ts.stderr.log lines 69, 289, 367-371, 383, 415, 436, 447-449)

[3] severity: low   tests/at/suites/req-001/a-signup-and-signin.test.ts:125
    claim: "AT-001.03's comment overclaims falsifiability: \"if the shipped code ever grew a provider branch, these two results would differ and this test would go red\" is false for every location such a branch could actually live — `resolveCaller` reads `app_metadata.provider` into `Caller.provider` and neither entry point is exercised by this test, and the shared module never receives a provider at all (`CompleteSignupRequest` has no such field), so no provider branch is expressible in the only code the comparison drives."
    why-it-matters (as stated): "the plan's discipline is that no comment may claim more than the per-id table allows, and the table's wording (\"the same shipped path\") is accurate where the comment's is not. The comparison half of the test is near-vacuous as a guard; what actually carries weight in AT-001.03 is the pinned-value block at lines 176-182. The comment should say that."
    unverified-runtime-claim: no
    raw: gate2-kimi-ts.md lines 52-65 (draft reasoning at gate2-kimi-ts.stderr.log lines 73-75, 293, 295, 385)

[4] severity: medium   supabase/functions/_shared/edge.ts:96
    claim: "the acknowledgment's `ip` is whatever the caller puts in the first `x-forwarded-for` entry — fully client-controlled on any path where no trusted proxy overwrites the header, and proof-local.ts:124 sets that header itself while check (a) (line 174) asserts only `ip !== null`, so nothing anywhere verifies the recorded address is the request's real source."
    why-it-matters (as stated): "AT-001.01 names IP as one of the three recorded fields; as shipped, a caller can mint an acknowledgment whose IP is fiction, and the live proof would still pass. The `inet` column at least rejects non-IP garbage, but any plausible address is accepted. What would settle it: against the live stack, call complete-signup with a spoofed header and read the row back (does Kong rewrite or prepend?), and pin the expected value in check (a) rather than non-null; the hosted-gateway behaviour is a separate question for the deployment record."
    unverified-runtime-claim: yes — as stated: "what the local Kong and the hosted edge runtime do to a client-supplied `x-forwarded-for` cannot be settled without running it."
    raw: gate2-kimi-ts.md lines 67-81 (draft reasoning at gate2-kimi-ts.stderr.log lines 95-97, 297, 299, 387)

[5] severity: low   supabase/functions/_shared/edge.ts:69
    claim: "unhappy-path robustness gaps in both entry points: a network throw from the `resolveCaller` fetch (Auth unreachable), from `accountTypeOf`'s fetch, or from the `JSON.parse` on a non-JSON success body at edge.ts:148 propagates out of the handler and becomes a bare 500 with no shaped refusal; and the blanket `outcome.status >= 400 && < 500 → 409` mapping (complete-signup/index.ts:71, create-organization/index.ts:92) would mislabel a database-raised 400/403 as 409 — currently unreachable only because the TypeScript layer pre-refuses those cases, a coupling nothing enforces."
    why-it-matters (as stated): "the functions are written so \"the reason travels, never a bare status\"; the transport-failure paths break that rule precisely when the caller most needs to tell refusal from outage."
    unverified-runtime-claim: yes — as stated: "the thrown-handler-→-500 behaviour is Deno.serve convention, not something I ran; one live request with the database stopped settles it."
    raw: gate2-kimi-ts.md lines 83-97 (draft reasoning at gate2-kimi-ts.stderr.log lines 185-187, 301, 305, 389)

[6] severity: low   tests/at/suites/req-001/a-signup-and-signin.test.ts:246
    claim: "AT-001.06 never asserts the refused volunteer left nothing behind — the weakest createOrganization that still passes writes the organisation and membership and then reports refusal. AT-001.07 does pin the no-leftover-account property for its own refusal (line 295), so the asymmetry reads as an omission rather than a policy."
    why-it-matters (as stated): "\"the action is rejected\" includes its writes not happening; the live proof's check (d) does assert `volunteerOrgs.length === 0`, so this is a loop-tier oracle gap the live tier currently covers — but the live proof has never been run, and the two tiers are supposed to be independently meaningful."
    unverified-runtime-claim: no
    raw: gate2-kimi-ts.md lines 99-109 (draft reasoning at gate2-kimi-ts.stderr.log line 405)

[7] severity: low   supabase/functions/_shared/edge.ts:47
    claim: "`Caller.email` and `Caller.provider` are computed by `resolveCaller` and read by neither edge function — dead fields on a shipped type."
    why-it-matters (as stated): "harmless today, but `provider` in particular invites a future reader to believe the provider participates in a decision somewhere on the signup path, which is exactly the branch AT-001.03's comment (finding 3) imagines being caught. Either delete the fields or say in one line why they are carried."
    unverified-runtime-claim: no
    raw: gate2-kimi-ts.md lines 111-118 (draft reasoning at gate2-kimi-ts.stderr.log lines 99, 309-311, 391)

ADDITIONAL NOTE (stated by reviewer outside the numbered findings, not counted toward the 7, extracted verbatim per the instruction to extract findings-adjacent material without judging it):
    "Outside the TypeScript, noted once as required and not counted: the migration's documented decision that
    `create_organization` performs no account-type re-check (unlike `complete_signup`) is sound given only
    `service_role` can execute it, but it means the NGO-only boundary has exactly one enforcement point — the
    untypechecked entry point — which is the same concentration-of-risk shape finding 2 describes; if a second
    service-role caller ever appears, the rule must move into the database then. Nothing else outside the diff
    caught my eye that the plan does not already file."
    raw: gate2-kimi-ts.md lines 121

SEVERITY SCALE (as stated by reviewer): "high = blocks the merge; medium = should be fixed or consciously accepted by the orchestrator; low = worth recording, not worth blocking on."
