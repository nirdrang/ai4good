---
name: done
description: Complete the currently bound PM-tree requirement — the ONLY authority for Done on the PM board. Evidence gate (dev items closed + full AT suite green at integration tier) + founder attestation, then the completion record, then Done LAST.
---

# /done — complete the bound requirement (PM board)

## Ritual (execute in order; ANY gate failure → report the named failure and STOP — /done never partially applies)

1. **Lock.** `Acquire-WorkLock` (loop/work/work-lib.ps1). Not ok → report holder, STOP.
2. **Binding check.** `Read-Binding` must name the target item (bucket `task`). No binding or
   a different item → STOP (bind first; /done acts only on the pulled requirement).
3. **Evidence gate — all three, in this order:**
   a. **Dev tree closed:** every materialized AI4GOOD-DEV item for this requirement is Done or
      Cancelled (`list_issues` check). An open leaf is a NAMED gate failure.
   b. **Acceptance suite green:** run the manifest's verify command at integration tier and
      capture the summary. Until the AT harness (AI4DEV-3) exists this gate FAILS CLOSED —
      /done cannot pass, by design; say so plainly.
   c. **Founder attestation:** ask the founder explicitly to attest completion of THIS
      requirement in this session; record their exact words. No attestation → STOP.
4. **Completion comment** on the PM item: test-run summary, the dev-item list, the pull
   record's op UUID it closes, the attestation quote, a fresh completion op UUID.
5. **Attachment:** link the merged work / test output (where one exists).
6. **State Done — LAST**, after all evidence is durably on the item.
7. **Unbind** (`Clear-Binding`), release the lock, report.

## Never
- Never Done without 3a+3b+3c. Never reorder (Done before evidence). Never close dev items
  from here — dev leaves close on merge (vendor-native) or their own management.
