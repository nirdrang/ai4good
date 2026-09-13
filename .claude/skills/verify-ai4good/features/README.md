# Feature map

One file per user-facing feature. Each answers, from the user's point of view, four questions.
What is it. How to reach it. How to drive it with the HTTP harness. What observable end state
proves it works. This map is the maintained verification source. A proof that drives one
convenient entry point is incomplete when the map lists others. Keep it honest with
`/pstack:maintain-verification-skill` as the app changes.

## Shared mechanics

Every write route runs the same pipeline (`writeRoute` in
`supabase/functions/_shared/edge.ts`), in this order. 405 for a method other than POST. 401
when no `Authorization` header reaches the function. 400 for a body that is not a JSON object.
400 `invalid-request` for an organization, account or from id that is not a uuid. Then one
`write_standing` read. Then the gate. The gate answers 502 `refused` when the standing is
unreadable. Then it answers 403 `account-deactivated`. Then 409 `no-account`. Then 403 for the
wrong account type (`not-a-platform-admin` or `not-an-ngo-account`). Then the route's own
decision. Then one RPC as the service role. A database refusal with a five-character SQLSTATE
maps to 409 with `kind` taken from the exception's `DETAIL` (`refused` when the DETAIL is not a
known kind). Any other RPC failure is 502 `refused`. A refusal decided by the gate, the route or
the database has the shape `{ok: false, kind, reason}`. A transport refusal (405, 401, the 400
for the body, and the tenant reads' 404 and 502) has the shape `{ok: false, reason}` with no
`kind`.

A platform administrator has no product path and no seed (`supabase/config.toml` names
`seed.sql`; the file does not exist, and `complete_signup` refuses the type). Obtain one in
two steps. First, an Auth user, either through signup and confirmation or through the admin
users API. The admin users API is `POST /auth/v1/admin/users` with the service-role key and
`email_confirm: true`, as `scripts/drive-vetting.ts` does. Second, the operator insert over
`DB_URL`:
`insert into public.accounts (id, account_type) values ('<auth user id>', 'platform_admin');`.
Then sign in over the password grant like any other caller. This is the one sanctioned bypass
of the evidence standard in `SKILL.md`. The evidence must name it. Project creation goes
through `project-need` `start`, a product path (see `need-intake.md`). Volunteer seating on a
project is still operator SQL (see `project-workspace.md`).

| feature | file |
|---|---|
| Email signup and confirmation | [email-signup-and-confirmation.md](email-signup-and-confirmation.md) |
| NGO signup completion | [ngo-signup-completion.md](ngo-signup-completion.md) |
| Volunteer signup and the GitHub gate | [volunteer-signup-github-gate.md](volunteer-signup-github-gate.md) |
| Create organization (NGO-only action) | [create-organization.md](create-organization.md) |
| Update organization (admin-only rename) | [update-organization.md](update-organization.md) |
| Project need intake (start, autosave, attach, submit, snapshot) | [need-intake.md](need-intake.md) |
| Organization dashboard (member and platform-admin read) | [organization-dashboard.md](organization-dashboard.md) |
| Project workspace (assigned volunteer, member and platform-admin read) | [project-workspace.md](project-workspace.md) |
| Public project page (token-free read) | [public-project.md](public-project.md) |
| Transfer organization contact (admin-only seat repoint) | [transfer-organization-contact.md](transfer-organization-contact.md) |
| Set escalation contact (admin-only upsert) | [set-escalation-contact.md](set-escalation-contact.md) |
| Set account lifecycle (admin-only deactivate and reactivate) | [set-account-lifecycle.md](set-account-lifecycle.md) |
| Set organization profile (five fields, all or nothing) | [set-organization-profile.md](set-organization-profile.md) |
| Set organization vetting (admin-only vet and unvet, audited) | [set-organization-vetting.md](set-organization-vetting.md) |
| Discovery allowance (daily credits, read and debit) | [discovery-allowance.md](discovery-allowance.md) |

Not mapped yet, deliberately: the web UI (a placeholder page today) and the Google/GitHub
OAuth round trips. Consent is a human browser step. Configuration well-formedness is checkable;
the handshake is not.
