# Send a Discovery message

An NGO administrator sends a message on a submitted need. The reply includes the turn's
cost and the remaining daily allowance. All turns in this unit use the free allowance.

## How to reach it

Complete NGO signup and email confirmation, then call `project-need` with `start` and
`submit`. Send `POST /functions/v1/discovery-message` with the NGO token and
`{ organizationId, projectId, message }`. Text must be non-empty and at most 4000 characters.

## Drive and readback

With the provider credential in the function environment, expect 200 with
`{ ok, turn, reply, elicitation, allowance }`. Read `discovery_turns` and `discovery_spend`
over the operator SQL connection. The turn is settled, its served model is recorded, and
the allowance has fallen by the charged credits. The reservation uses counted input plus
the fixed margin and bounded output. Unused reserved credits return to the same day row.

Without the credential, expect 502 from token-count preparation, no turn and no spend
change. A definite provider HTTP error after reservation settles as failed and releases
all reserved credits. A timeout or connection error leaves the turn open. Backdate its
opening as the operator with the immutability trigger disabled inside a transaction; the
next reservation on that project abandons it at its full reserved charge after the deadline.

## Refusals

The common write gate applies. Organisation membership and the admin role are required.
Preparation reads the need and settled history with the caller's token; an invisible project
answers 404. With token counting available, an unverified email answers 409
`email-unverified` with the verification remedy. A draft need answers `need-not-in-discovery`.
A second send while a young turn is open answers `turn-in-flight`. A stale counted sequence
answers `stale-context`. Settling twice answers `turn-not-open`. An unaffordable minimum
turn answers the existing allowance refusal and writes nothing. A last-credit turn may
instead lower its output cap. Settled turns reject updates and every turn rejects deletion.

Read both tables before and after refusals. Two projects under one NGO must share one daily
spend row. Use synthetic usage through the operator reserve and settle functions when the
provider credential is absent; that proves persistence and accounting, not a provider call.
