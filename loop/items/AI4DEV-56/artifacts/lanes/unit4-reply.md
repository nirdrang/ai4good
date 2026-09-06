229dc8d7cfdc88433f09f4940216cd2764f58bcd
typecheck: 0; at:check: 0; at:selftest: 0; at:verify: 0
The tracker gained `baselineServiceRole`, filled on `revoke all` the same way as `anon`; later-file revokes already counted, so no overlay rule was added.
Nothing was unsure: the real migrations still yield no problems because overlay `20260906120000` already revokes from `service_role`.
loop/items/AI4DEV-56/artifacts/lanes/unit4-report.md