# AT-REQ-001 — User Authentication & Org Membership

Source: prd-mvp.md REQ-001 (+ Promise §9 acknowledgment cadence; NFR Security/audit). Dependencies: none.

**Boundary note [cx]:** REQ-001 owns *identity capture* on acknowledgments. The acknowledgment **content gates** (first-funding/match-acceptance copy and non-reuse, Promise §9) are tested in AT-REQ-006; the volunteer first-match-consent disclaimer in AT-REQ-007; time-bounded file links + current-membership checks in AT-REQ-032.

## A. Signup & sign-in

- **AT-001.01 (P0)** — Given a visitor, When they sign up as an NGO via email/password, Then an account with global type `NGO` is created, an org membership with the `admin` role is created for their NGO, and the ToS + Platform Promise acknowledgment is required and recorded (timestamp, IP, text version) before any project creation is possible; a later sign-in with the same email/password succeeds. [cx]
- **AT-001.02 (P0)** — Given a visitor, When they sign up via GitHub OAuth as a volunteer, Then an account with global type `volunteer` is created, the GitHub identity is linked to it, and a later sign-in via GitHub returns to the same account. [cx]
- **AT-001.03 (P0)** — Given a visitor, When they sign up via Google as either account type, Then the account is created and sign-in via Google succeeds on return visits.
- **AT-001.04 (P0)** — Given a visitor completing volunteer signup by email or Google (no GitHub identity yet), When they attempt to finish signup without linking a GitHub account, Then completion is blocked with the GitHub-link requirement stated; linking completes signup.
- **AT-001.05 (P0)** — Given a volunteer signup where GitHub is linked, When the link completes, Then volunteer GitHub onboarding fires [cross: REQ-007]: the linked handle AND the imported public stats (top languages, repository count, contribution summary) are observably populated on the profile — a queued-but-empty import fails this test. [cx]
- **AT-001.06 (P0)** — Given an existing account of type `volunteer`, When it attempts an NGO-only action (create an org profile / project need), Then the action is rejected — one account holds exactly one global type; the NGO path requires a separate account.
- **AT-001.07 (P0)** — Given the public signup surfaces, When exercised, Then no path yields a `platform admin` account.
- **AT-001.08 [retired — cx: the PRD defines no identity-collision/linking policy; re-add if the PRD ever specifies one]**

## B. Email verification

- **AT-001.09 (P0)** — Given a fresh NGO signup, When the account is created, Then it is email-unverified until the emailed verification link is used; using it flips the account to verified.
- **AT-001.10 (P0)** — Given an unverified NGO account, When it attempts to send any Discovery message, Then the attempt is blocked with verification named as the remedy [cross: REQ-002/004].
- **AT-001.11 (P1)** — Given an expired or already-used verification link, When it is opened, Then verification does not occur and a re-send path is offered.

## C. Sessions & password reset

- **AT-001.12 (P0)** — Given a signed-in user, When their session expires or is revoked, Then access ends: the next request requires re-authentication (no stale-session writes) [NFR Security].
- **AT-001.13 (P0)** — Given an active session, When the user works continuously, Then the session refreshes automatically without forced re-login mid-work.
- **AT-001.14 (P0)** — Given a user who requests a password reset, When they complete the emailed reset flow, Then the new password works and the old one does not. [cx: audit claim dropped — password resets are not in the PRD's audit list]
- **AT-001.15 (P1)** — Given a password-reset link, When reused after success or after expiry, Then it is rejected.

## D. Two-layer authorization & multi-NGO

- **AT-001.16 (P0)** — Given an NGO-type user, When they belong to two different NGOs, Then membership and role are held per-NGO, and acting in NGO A never grants access to NGO B's data.
- **AT-001.17 (P0)** — Given v1 single-seat NGO, When the NGO account attempts to invite or add a second member to its org, Then no such capability exists (UI absent; API rejects).
- **AT-001.18 (P0)** — Given the single NGO account with each action's own preconditions met (vetted for funding, valid lifecycle state, an active match where required [cross: REQ-002/005.5]), When it performs each NGO-side action (funding, acknowledgment, scope edit, volunteer offboarding), Then all succeed under the one account — no action requires a second seat. [cx]
- **AT-001.19 (P0)** — Given any acknowledgment moment (signup, first funding, match acceptance), When the acknowledgment is submitted, Then the record captures the acting person's name, title, and authority attestation, and each acknowledgment is a distinct, non-reused record. [cx]
- **AT-001.20 (P0)** — Given acknowledgment copy, When displayed, Then shared credentials are stated as prohibited and an org email is recommended. [cx: promoted P1→P0 — explicit REQ clause]

## E. Tenant isolation & visibility

- **AT-001.21 (P0)** — Given NGO A and NGO B, When NGO B's account requests NGO A's non-public data (drafts, ledger, files, thread, dashboard) by UI or direct API/ID probing, Then access is denied and nothing leaks (no existence oracle beyond public surfaces).
- **AT-001.22 (P0)** — Given a volunteer not assigned to a project, When they request that project's non-public data (reference files, thread), Then access is denied; the public project page remains visible [cross: REQ-010].
- **AT-001.23 (P0)** — Given the assigned volunteer of a project, When they request that project's working data (reference files, thread, tasks), Then access succeeds, scoped to that project only.
- **AT-001.24 (P0)** — Given a logged-out visitor, When they browse, Then only public surfaces render (listings, project pages); every authenticated surface redirects to sign-in.

## F. Contact transfer / recovery (audited admin path)

- **AT-001.25 (P0)** — Given an NGO whose contact must change, When a platform admin runs the contact-transfer flow, Then ownership moves to the new account, the old account is deactivated, and all history (projects, ledger, acknowledgments, audit) is preserved and still attributed to the original acting humans.
- **AT-001.26 (P0)** — Given the transfer in AT-001.25, When it completes, Then an audit record captures who performed it, when, and the reason.
- **AT-001.27 (P0)** — Given a lost-access recovery request (original contact unreachable), When the admin recovery path runs, Then it behaves as AT-001.25 (same audited flow). [cx: promoted P1→P0]
- **AT-001.28 (P0)** — Given concierge onboarding, When completed, Then one non-login escalation contact is stored for the NGO. [cx: promoted P1→P0]
- **AT-001.35 (P0)** — Given the contact-transfer/recovery flow, When an NGO user, a volunteer, or an unauthenticated caller attempts to execute it, Then the attempt is rejected — only a platform admin can run it. [cx: added]

## G. Lifecycle state gates writes

- **AT-001.29 (P0)** — Given a deactivated account of ANY global type (NGO, volunteer, platform admin), When it attempts any write (edit, fund, comment, Discovery message, admin action), Then every write is rejected; the deactivated state is visible to the account. [cx: widened to all account types — "gates every write"]
- **AT-001.30 (P0)** — Given a volunteer deactivated under AUP [cross: REQ-007], When deactivation lands, Then platform writes are rejected immediately and the project's virtual keys are revoked [cross: REQ-009].
- **AT-001.31 (P0)** — Given a deactivated account, When a platform admin re-enables it, Then otherwise-authorized writes in valid lifecycle states work again (keys re-issued per the documented recovery [cross: REQ-030]); independent gates (terminal project states, vetting, role checks) remain enforced. [cx]
- **AT-001.32 (P0)** — Given a project with an assigned volunteer, When any path attempts to attach a second volunteer to the project, Then it is rejected — single-dev invariant (no collaborator seats).

## H. Audit & abuse controls

- **AT-001.33 (P0)** — Given the audit-mandated events owned here — role changes and contact transfer — When each occurs, Then an append-only audit record exists that cannot be altered or deleted [NFR Security]. [cx: scoped to the PRD's audit list; other listed events (fuel, transitions, credentials, webhook provenance) are tested with their owning REQs]
- **AT-001.34 (P0)** — Given the auth flow, When sign-in attempts exceed the configured rate limit, Then further attempts are rejected/throttled while legitimate use within the limit still works [NFR Security rate limits]. [cx: added]

## Coverage map

| REQ-001 clause | Tests |
|---|---|
| Two-layer authz (global type + per-NGO role) | 01, 06, 07, 16 |
| Multi-NGO membership; volunteers individual | 16, 06 |
| Sign-in: email/password, GitHub, Google (signup + return sign-in) | 01–03 |
| GitHub link mandatory at volunteer signup → REQ-007 onboarding | 04, 05 |
| Single-seat NGO + guards (attestation, shared-credential ban, transfer/recovery, escalation contact) | 17–20, 25–28, 35 |
| Single-dev projects | 32 |
| NGO data visible only to own account + assigned volunteer | 21–24 |
| Password reset, email verification, session management | 09–15 |
| Lifecycle state gates every write | 29–31 |
| Audit owned here (role changes, contact transfer) | 26, 33 |
| Auth rate limits (NFR) | 34 |
