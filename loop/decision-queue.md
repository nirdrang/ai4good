# Decision queue — run smoke-2

## Q1 — REQ-001: User Authentication & Org Membership

**Question:** Is authorization modeled as global `profiles.user_type` plus `ngo_memberships.role`, or as org-scoped roles named `ngo_admin`, `volunteer`, and `platform_admin`?

**Source:** blocking-question

**Evidence:** *(see blocking_questions in leaf critique)*

---

## Q2 — REQ-001: User Authentication & Org Membership

**Question:** What exact invite lifecycle and storage should implement NGO teammate invitations before a membership exists?

**Source:** blocking-question

**Evidence:** *(see blocking_questions in leaf critique)*

---

## Q3 — REQ-001: User Authentication & Org Membership

**Question:** For which project statuses and tables does an assigned volunteer get NGO-data access, especially before funding and for private projects/files/comments/tasks?

**Source:** blocking-question

**Evidence:** *(see blocking_questions in leaf critique)*

---

## Q4 — REQ-001: User Authentication & Org Membership

**Question:** Is email verification only an account-level `profiles.email_verified_at` mirror, or is there an NGO-level email verification field used by lifecycle gates?

**Source:** blocking-question

**Evidence:** *(see blocking_questions in leaf critique)*

---

## Q5 — REQ-001: User Authentication & Org Membership

**Question:** Should REQ-001 implement NGO verification and Discovery-credit columns, or should those be owned by REQ-002/004/006?

**Source:** blocking-question

**Evidence:** *(see blocking_questions in leaf critique)*
