Commit: `500040588c7a8ff7f2a0bfab22f6db68749d1551`

Checks: typecheck 0; at:check req-004 0 (58 bijection); at:selftest 0 (28 files, 417 tests); req-004 loop --expect 0 (10 green, 48 red); req-002 loop --expect 0 (20 green, 7 red); req-003 loop --expect 0 (13 green).

Deviations (4): unit 2 adds the migration unit 1 left out; the fuel sentence has no project id, no `%`, and no long dash; replace re-revokes execute so the catalog scan still sees the public revoke; integration proves the refusal on the operator reserve, not the deployed send, because prepare answers 502 without a key.

Blockers: none.

Report: `loop/items/AI4DEV-132/reports/unit2.md`