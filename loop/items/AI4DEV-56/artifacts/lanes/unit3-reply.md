de1df4a9bb6ce22e74828c1b44f35913fa3c5350
typecheck: 0; at:check: 0; at:selftest: 0; at:verify-loop: 0; db:stop: 0; db:start: 0; db:reset: 0; at:verify-integration: 0
Product membership inserts record a null actor labelled operator, because this unit does not set the actor in complete_signup or create_organization.
A later reader of the audit table cannot tell a product membership grant from an operator grant, because both record the operator.
loop/items/AI4DEV-56/artifacts/lanes/unit3-report.md