# Discovery documentation checks

Date: 2026-09-20. Decision: d92.

The PRD assembly check passes after normalizing source line endings in the assembler.
Before the content changes, that normalization reproduced the existing PRD exactly.
The final assembly has 30 requirement headings, no banned words, and 62 valid roadmap references.
The six affected requirement extracts were regenerated from that source.

The decomposition check passes for all 30 requirements and finds no dependency cycle.
Discovery retains 58 P0 acceptance identifiers; the organization requirement retains 27.
The new item and design documents have valid local links.
The canonical PRD no longer contains the old 30-turn vetted grant or funded-only routing.

The registered-test check passes for the organization requirement: 27 P0 identifiers match.
Registered-test checks cannot run for Discovery, lifecycle, fuel, gateway, or attribution because their suite directories do not exist.
No runtime acceptance pass is claimed. Existing tests must be revised and executed for the changed behavior.

The design contract and change order are complete.
The conversation prototype is preserved as a layout reference; its old funding arithmetic is superseded.
The canonical screen has not been emitted or implemented. Claude Design and Lovable capabilities are unavailable in this session.

Only this documentation bundle is included in its commit. Existing unrelated working changes remain outside the bundle.
