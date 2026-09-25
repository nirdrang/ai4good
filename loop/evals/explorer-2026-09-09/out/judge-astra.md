## Per angle

Scores appear in this order: **trace completeness, verifiability, non-obvious yield, honesty**.

| Angle | A | B | Decisive difference | Winner |
|---|---|---|---|---|
| 1: Database | 5, 5, 5, 3 | 4, 5, 4, 3 | A explains catalog enforcement and database edge cases more completely, although both contain factual errors. | **A** |
| 2: Application | 3, 4, 4, 4 | 5, 5, 5, 3 | B traces SMTP and provider-import enforcement more completely and clearly identifies duplicate prevention as test-adapter behavior. | **B** |
| 3: Test seam and tiers | 3, 5, 4, 3 | 5, 5, 5, 4 | B explains the actual expectation manifest, conditional type protection, and world-isolation limitations that A omits or misstates. | **B** |
| 4: Reliability | 5, 5, 5, 5 | 4, 5, 3, 2 | A identifies dependent atomicity observations, while B incorrectly calls them independent and says the transition commits before the fault. | **A** |

## Factual errors found

1. **B, angle 4 — independent atomicity witnesses.** B calls the four state reads independent. Live `events()` and `opsItems()` both filter through `notification_deliveries`. An event or operations item without a scoped delivery is invisible. Thus, four observations do not establish four independent witnesses. See [_live.ts](/C:/Users/nirdr/Downloads/ai4good/tests/at/suites/req-016/_live.ts:356), especially `events()` and `opsItems()`.

2. **B, angle 4 — transition commits before the fault.** B says the “transition upsert commits” before `nextval` and `RAISE`. The upsert executes inside the same transaction; it does not commit separately. The exception rolls it back. Only the sequence advance survives. See [fixture_commit_transition_and_emit](/C:/Users/nirdr/Downloads/ai4good/supabase/migrations/20260913121000_notification_fixture_producers.sql:43).

3. **B, angles 1 and 2 — receipt survives a crash before the sent mark.** Both repeat the migration comment’s incorrect recovery claim without identifying its contradiction. `accepted_at`, `provider_receipt`, and `state='sent'` are written together. A crash before that database update leaves no newly stored acceptance receipt. See [apply_delivery_results](/C:/Users/nirdr/Downloads/ai4good/supabase/migrations/20260913120000_notification_taxonomy_and_outbox.sql:257). The implementation contradicts the comment.

4. **A, angle 1 — first non-null receipt wins.** The SQL expression puts the incoming receipt first: `coalesce(nullif(v_result->'receipt', 'null'::jsonb), provider_receipt)`. A later non-null receipt replaces the previous receipt. Only the process stamp and acceptance timestamp preserve their first values. See [apply_delivery_results](/C:/Users/nirdr/Downloads/ai4good/supabase/migrations/20260913120000_notification_taxonomy_and_outbox.sql:260).

5. **A, angle 3; B, angles 3 and 4 — unacknowledged messages never reach the catcher.** Their wording confuses message arrival with acknowledgment visibility. The lost-ack decorator calls the inner provider, then returns `no_ack`. The integration test explicitly requires one physical message before retry. The catcher cannot identify acknowledgment loss, but it can observe the delivered message. See [_provider-faults.ts](/C:/Users/nirdr/Downloads/ai4good/tests/at/suites/req-016/_provider-faults.ts:127) and [_integration.ts](/C:/Users/nirdr/Downloads/ai4good/tests/at/suites/req-016/_integration.ts:339).

6. **A, angle 3 — integration misuse always fails compilation, with no throwing stubs.** Single-body procedures are typed at the loop tier. Only explicitly typed integration procedures receive the restricted type. At runtime, integration supplies a refusing `vendors.email` proxy. See [registry.ts](/C:/Users/nirdr/Downloads/ai4good/tests/at/harness/registry.ts:840) and [index.ts](/C:/Users/nirdr/Downloads/ai4good/tests/at/harness/index.ts:244).

7. **A, angle 1; B, angle 2 — JSON serialization removes the brand.** `WRITE_SET` is a type-only declaration. `prepareWriteSet()` constructs an ordinary object and casts it to `WriteSet`. No runtime symbol property exists for `JSON.stringify()` to remove. See [notifications.ts](/C:/Users/nirdr/Downloads/ai4good/supabase/functions/_shared/notifications.ts:155) and its return at line 205.

8. **A, angle 2 — nonexistent SMTP symbol.** A names `maxIdFor`. The actual function is `messageIdFor`; no `maxIdFor` exists in the cited module. See [notification-provider.ts](/C:/Users/nirdr/Downloads/ai4good/supabase/functions/_shared/notification-provider.ts:140).

9. **A, angle 2 — null process stamp proves no process has sent.** A repeats that `null` means “no process has sent yet.” A lost-ack send can physically arrive while this field remains null. The field records the first applied `accepted` result, not necessarily the first physical sender. See [_fixture.ts](/C:/Users/nirdr/Downloads/ai4good/tests/at/suites/req-016/_fixture.ts:297) and the [lost-ack decorator](/C:/Users/nirdr/Downloads/ai4good/tests/at/suites/req-016/_provider-faults.ts:127).

## Verdict

I would choose **A**, narrowly, because its reliability exploration correctly limits what the evidence proves. B provides stronger application and test-harness coverage, but its confident atomicity errors concern the subsystem’s central guarantees. **Could B replace A? No, not without additional factual review.** **Would running both add anything? Yes.** B adds the explicit expectation-manifest interpretation, conditional type protection, and fuller SMTP and source-scan traces. Those additions are useful, provided contradictions receive code checks.