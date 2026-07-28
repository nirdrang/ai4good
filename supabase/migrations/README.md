# Database migrations

The schema lives here as code, and only here. There is no hand-shaped database anywhere that
counts as the real one: what these files replay IS the schema.

**Every requirement that needs database structure writes its migration as part of its own work.**
A table, a column, a policy, an index, a trigger — it arrives in a timestamped `.sql` file in
this directory, in the same change bundle as the code that needs it. Nothing gets added by
clicking around a dashboard, because a click leaves no file and the next rebuild loses it.

**The local test database is built by replaying these files from empty.** `bun run db:reset`
drops the local database and replays every migration in filename order; `bun run at:verify
<requirement> --tier integration` runs against what comes out. That is why the acceptance tests
need a LOCAL stack rather than a shared hosted one — the tests wipe and rebuild the database on
every run, which is not something you can do to a database anyone else is using.

A migration is append-only once it has been replayed anywhere but your own machine: fix a
mistake with a new migration, never by editing one that already ran.
