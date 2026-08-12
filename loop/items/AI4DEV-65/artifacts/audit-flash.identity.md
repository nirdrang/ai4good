# Identity extract — audit-flash (AI4DEV-65)

Source: `opencode export ses_00d7128e2ffekwMxy07Oi8zHqh` (run from tree root).

Session-level identity (opencode-go sessions carry one agent and one model for
their whole life; confirmed by every `stream ... agent=reviewer-flash` line in
the debug log as well):

```
"agent": "reviewer-flash",
"model": {
  "id": "deepseek-v4-flash",
  "providerID": "opencode-go",
  "variant": "max"
}
```

Pin required: `opencode-go/deepseek-v4-flash` · `--variant max` · agent `reviewer-flash`.

Match: providerID + "/" + id = `opencode-go/deepseek-v4-flash` — MATCH.
Match: variant = `max` — MATCH.
Match: agent = `reviewer-flash` — MATCH.

No mismatch found. This is a clean run under the pinned identity.
