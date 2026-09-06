# Unit 4 record: leftover table privileges

The item asked for a migration. That migration would revoke leftover TRUNCATE, TRIGGER and REFERENCES grants on four tables.

The measurement is in `loop/items/AI4DEV-56/artifacts/measure/unit4-privileges-after-reset.txt`. After a reset, no client role holds those privileges on any public table. The overlay migration `20260906120000` already revoked all three client roles. A new migration would change no privilege.

The remaining gap is the static scan. Default ACL still grants those privileges to every new public table. The scan used to accept a leftover REFERENCES or TRIGGER grant to `service_role`. The scan also used to accept a baseline `revoke all` that named only `anon` and `authenticated`.

The scan now refuses both. `WRITE_PRIVS` includes `references` and `trigger`. The baseline check requires `revoke all` from `anon`, `authenticated` and `service_role` after `create table`. The code name `no-baseline-revoke` stays. This unit lands no migration.
