## Per angle

Scores are **trace completeness / verifiability / non-obvious yield / honesty**, each out of 5.

| Angle | A | B | Decisive difference | Winner |
|---|---|---|---|---|
| 1: Database | 5 / 5 / 5 / 4 | 5 / 5 / 4 / 3 | A correctly challenges the recovery comment and identifies receipt replacement; B incorrectly says the first receipt wins. | **A** |
| 2: Application | 5 / 5 / 4 / 2 | 5 / 5 / 5 / 4 | Both trace the complete path, but A confidently invents crash durability and repeat taxonomy validation. | **B** |
| 3: Test seam and tiers | 5 / 5 / 4 / 4 | 5 / 5 / 5 / 4 | B identifies that delivery-based queries can hide orphan events and explains limits in report accounting. | **B** |
| 4: Reliability | 5 / 5 / 4 / 2 | 5 / 5 / 5 / 4 | B distinguishes independent witnesses from dependent reads; A repeats the false recovery guarantee. | **B** |

## Factual errors found

1. **A, angles 2 and 4:** Claims a crash after provider acceptance but before marking sent leaves a durable acceptance record. The receipt, timestamp, and sent state share one `UPDATE`. A crash before that update commits leaves no new acceptance record. A correctly identifies this contradiction in angle 1. B, angle 2, repeats the misleading comment without correcting it, although it labels it as a comment. See [`apply_delivery_results`](C:/Users/nirdr/Downloads/ai4good/supabase/migrations/20260913120000_notification_taxonomy_and_outbox.sql:257).

2. **B, angle 1:** Claims the first non-null receipt wins. SQL uses `coalesce(new_receipt, provider_receipt)`, so a later non-null receipt replaces the previous receipt. Only the timestamp and process stamp preserve their first non-null values. See [the acceptance update](C:/Users/nirdr/Downloads/ai4good/supabase/migrations/20260913120000_notification_taxonomy_and_outbox.sql:261).

3. **A, angle 2:** Says taxonomy validation happens again at emit time. `channelsFor()` only selects and copies channels. `assertTaxonomyIsLegal()` performs validation at module load; emit does not repeat that validation. See [`channelsFor`](C:/Users/nirdr/Downloads/ai4good/supabase/functions/_shared/notification-taxonomy.ts:209) and [`emit`](C:/Users/nirdr/Downloads/ai4good/supabase/functions/_shared/notifications.ts:374).

4. **A, angles 3 and 4; B, angle 4:** Their cleanup summaries say `clear()` disarms first or cannot leave an arming after refusal. It calls `armed.triggerCount()` first. The live counter can throw on witness disagreement, preventing disarm and reservation release. B’s detailed flow gives the correct order but misses this consequence. See [`clear`](C:/Users/nirdr/Downloads/ai4good/tests/at/harness/faults.ts:81) and [the live counter](C:/Users/nirdr/Downloads/ai4good/tests/at/suites/req-016/_live.ts:270).

5. **A and B, angle 3:** Describe `_bind.ts` as the suite’s only harness contact; A explicitly says other suite files do not import the harness. `_live.ts` imports runtime helpers and `CapabilityPending`; `_mail-witness.ts` imports HTTP helpers. `_bind.ts` centralizes registration, not every harness dependency. See [live imports](C:/Users/nirdr/Downloads/ai4good/tests/at/suites/req-016/_live.ts:74) and [mail imports](C:/Users/nirdr/Downloads/ai4good/tests/at/suites/req-016/_mail-witness.ts:22).

6. **B, angle 2:** Says `renderMessage()` applies encoded-word formatting to From, To, and Subject. Only Subject calls `encodedHeader()`. From and To interpolate addresses directly. See [`renderMessage`](C:/Users/nirdr/Downloads/ai4good/supabase/functions/_shared/notification-provider.ts:145).

7. **B, angles 1 and 2:** Says `JSON.stringify()` strips the `WriteSet` brand. No runtime brand exists to strip. `WRITE_SET` is a declaration, and the constructor returns an ordinary object through `as WriteSet`. See [the declaration](C:/Users/nirdr/Downloads/ai4good/supabase/functions/_shared/notifications.ts:155) and [the constructor return](C:/Users/nirdr/Downloads/ai4good/supabase/functions/_shared/notifications.ts:200).

8. **A, angle 1:** Gives the Message-ID format as `<key@notifications.ai4good.local>`. `messageIdFor()` replaces characters outside `[A-Za-z0-9.-]` with dots, including the stored key’s colons. `X-Notification-Key` preserves the original key. See [`messageIdFor`](C:/Users/nirdr/Downloads/ai4good/supabase/functions/_shared/notification-provider.ts:140).

9. **A, angle 1:** Describes the nullable unique constraint as enforcing “exactly one” ops row per event and says a nullable unique holds no restriction. It enforces **at most one** row per non-null event ID. Multiple null values are permitted. See [the ops table](C:/Users/nirdr/Downloads/ai4good/supabase/migrations/20260913120000_notification_taxonomy_and_outbox.sql:151).

10. **A, angle 1:** Says memory storage mirrors SQL semantics “one-for-one.” For an unknown delivery ID, memory `applyPassResults()` throws; SQL updates zero rows and continues. See [memory handling](C:/Users/nirdr/Downloads/ai4good/tests/at/suites/req-016/_fixture.ts:297) and [SQL handling](C:/Users/nirdr/Downloads/ai4good/supabase/migrations/20260913120000_notification_taxonomy_and_outbox.sql:255).

11. **B, angle 4:** Names `postgres.js` when discussing exception details. The live adapter uses Bun’s `SQL` constructor. B later names Bun correctly, creating an internal inconsistency. See [`sqlClient`](C:/Users/nirdr/Downloads/ai4good/tests/at/harness/live-stack.ts:322).

## Verdict

I would choose **B**. Both provide complete, checkable traces, but B adds stronger findings about witness dependence, hidden orphan rows, and test-only duplicate suppression. A’s database analysis is better, yet its other angles confidently repeat a false durability guarantee. **Could A replace B? No, without additional verification of reliability claims. Would running both add anything? Yes:** A supplies the receipt-replacement correction and explicitly disproves the recovery comment. That is useful complementary evidence, although most findings overlap.