# Change order 014: background review instead of a publish gate; Discovery locks at consent

Date: 2026-10-06. Decision d96. AI4DEV-212 (background review instead of a publish gate).

## Founder rulings, in the founder's words

In the session of 2026-10-06, while the controller was checking whether the publishing requirement was ready to build:

- "With the new discovery we have review of the discovery all along. We should be able to let ngo review and edit the discovery through the discover screen this is our discovery editing panel of glass. Post volunteer match this screen should be in read only and not available for changes"
- Asked at which moment the screen becomes read-only, the founder chose the option "Volunteer consent (Recommended)".
- Asked whether an edit after publishing goes back to review, the founder answered: "Why the need for admin review". After the controller explained the d74 gate, the founder answered: "Review is a later stage that is not a gate to walk through this is a governance background guardrail"
- Asked whether the vetted-NGO publish gate stays: "Yes for 1."
- Asked when a published project enters the background review queue, the founder chose the option "First publish only".

These rulings loosen d74: publication no longer waits on a human decision. The loosening is the founder's explicit ruling above.

## What changes

- The Discovery screen is the one place the NGO reviews and edits the Discovery document, at `scoped` and at `open`. From volunteer consent it is read-only and shows the consented revision.
- There is no separate scope editor. Screen row 8 in `design/ui-ux-instructions.md` is retired.
- Publishing moves a project from `scoped` straight to `open`. The lifecycle has eight states; `triage` is gone.
- The NGO never sees an "under review" state. Screen row 9 becomes "Publish → live".
- The founder review queue (screen row 25) holds one item per first publish, already live. The founder keeps it, returns it to `scoped` before consent, or declines it. Problems found after consent go through the break-glass hide and the normal cancellation path.
- Later edits and republishes add no queue item. The accepted exposure is recorded in the risk list.

## Changed requirement text, verbatim

#### REQ-005: Project Publishing

The NGO publishes the confirmed Discovery document (REQ-004) to the marketplace. There is no separate scope editor: the NGO reviews and edits the document in the Discovery screen, which turns read-only at volunteer consent. Publishing needs no pre-funded fuel (fuel is required only at volunteer acceptance — match-first) and waits on no review.

- **All projects are public MIT (Platform Promise §2):** no visibility choice. Confidential-codebase needs are declined at Discovery (→ RM-2); sensitive *data* is served as Tier-2 fixtures-only (REQ-004).
- A project may stay `scoped` indefinitely; the NGO picks its fuel amount at match acceptance.
- Publishing requires vetted status and no fuel deposit; it moves the project directly to `open`, and the listing shows the latest confirmed revision of the Discovery document. The first publish enters the founder's background review (REQ-023), which never delays the listing.
- Before consent, a confirmed edit in the Discovery screen updates the live listing; an unconfirmed edit never reaches it.
- Unpublish to `scoped` any time before consent. A return to `scoped` by the founder's background review carries the reason note; the NGO edits in the Discovery screen and republishes.

#### REQ-023: Platform Background Review (governance guardrail after publication)

Publication is never gated. A published project lists at once; the founder reviews it afterwards as a background governance guardrail, catching policy violations and taking the project down when needed. **v1: every first publish is read by the founder-reviewer; an AI advisory pass assists but holds no authority.** Later edits and republishes are not queued. The autonomous screener is deferred (→ RM-64), where the v1 review records become its calibration dataset.

The acceptance criteria are in `.taskmaster/docs/requirements/req-023.md`.

#### REQ-004, the Discovery document (added sentences)

The Discovery screen is the one place the NGO reviews and edits the Discovery document, before and after publishing. From volunteer consent onward the screen is read-only: no chat turn, edit, or file change is accepted, and the document stays as consented.

#### REQ-005.5, the publish transition

- `scoped` → `open` on Publish (vetted only, owning NGO only). The project lists on the marketplace at once. A project's first publish adds one item to the founder's background review queue (an AI advisory pass attaches per-check evidence, never a decision — REQ-023); later edits and republishes add none. The review never blocks listing or matching. The reviewer keeps the project (no transition), returns it `open` → `scoped` with a reason note while no volunteer has consented (a pending match is notified and released), or declines it → `cancelled` (terminal; only for needs that editing cannot fix; ordinary cancellation side effects). After consent, a policy problem is handled by the break-glass hide (REQ-031) and the normal cancellation path.

## Contract edits

- `design/discovery-ui-contract.md`, section "After Discovery: volunteer matching": Find a volunteer publishes at once; the screen stays the editor until consent and is read-only after.
- `design/ui-ux-instructions.md`: the d96 note at the top; the admin role and navigation label; the Discovery-to-match paragraph; the lifecycle line; rows 8, 9 and 25.

## Acceptance tests

- New: AT-004.74 (the Discovery screen locks at consent, in the UI and at the API), AT-005.21 (a confirmed edit updates the live listing), AT-023.23 (later edits and republishes add no queue item).
- Retired: AT-005.01, .02, .03 and .04, each pointing to the Discovery test that covers it.
- Restated with a d96 tag: the publishing, review and lifecycle tests that assumed the gate, and the one-line mentions in the notification, dashboard, listing, operations, moderation and scope-addition suites.

## Canvas

Not revised in this change. The Discovery screen's read-only state and the publish-to-live flow need a canvas revision through the `ui-design` skill, as a screen design item.
