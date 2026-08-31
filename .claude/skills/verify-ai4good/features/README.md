# Feature map

One file per user-facing feature. Each answers, from the user's point of view: what it is,
how to reach it, how to drive it with the HTTP harness, and what observable end state proves
it works. This map is the maintained verification source — a proof that drives one convenient
entry point is incomplete when the map lists others. Keep it honest with
`/pstack:maintain-verification-skill` as the app changes.

| feature | file |
|---|---|
| Email signup and confirmation | [email-signup-and-confirmation.md](email-signup-and-confirmation.md) |
| NGO signup completion | [ngo-signup-completion.md](ngo-signup-completion.md) |
| Volunteer signup and the GitHub gate | [volunteer-signup-github-gate.md](volunteer-signup-github-gate.md) |
| Create organization (NGO-only action) | [create-organization.md](create-organization.md) |
| Update organization (admin-only rename) | [update-organization.md](update-organization.md) |

Not mapped yet, deliberately: the web UI (a placeholder page today) and the Google/GitHub
OAuth round trips (consent is a human browser step; configuration well-formedness is checkable,
the handshake is not).
