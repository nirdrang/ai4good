## What this pull request builds

Two work streams share this branch as a declared batch.

**Per-organisation roles and membership isolation.** Admin and member roles within an NGO become
enforced semantics rather than an enum nothing reads: a new admin-only organisation operation
whose refusals distinguish "not a member of this organisation" from "not an admin in this
organisation", membership and role held per organisation with no authority crossing between
organisations, and a database-level guard making it impossible on any path — the operator's SQL
included — to grant a per-organisation role to a volunteer account.

**The single-seat and single-developer invariants.** Its batch partner — the single-seat item,
which rides this same branch — makes one seat per organisation structural (a unique index, plus
the absence of any invite capability at every layer) and lands the minimal projects surface on
which "no second volunteer can be attached" is structural and guarded.

Five acceptance ids move from declared-pending to green at both verification tiers — the loop
tier (CI's required check) and the integration tier against a reserved database slot.

## Record

Plan, rulings, gate prompts and phase state: `loop/items/AI4DEV-62/`.
