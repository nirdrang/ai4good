# Proposed board item: a repeated request must not spend twice or notify twice

Raised by two of the four reviewers in the multi-model review of 2026-09-11, independently. The
founder ruled it out of that run, on 2026-09-11, because no acceptance criterion asks for it and it
needs a product decision. This file is the write-up to file from, not a decision.

## The problem

Two writes in this requirement are not safe to repeat.

**The Discovery debit.** A debit commits, and its answer is lost on the way back to the caller. The
caller repeats the same request. The ledger row increases a second time. One credit of intent has
spent two credits, and nothing in the row says the two requests were the same request.

**The vetting action.** A vet always writes the aggregate, appends an audit row and emits a
notification, even when the same vet already committed. A client timeout followed by a retry, which
is the ordinary case for an administrator pressing a button twice, produces two audit rows and two
notifications to the organisation for one intent.

The unvet path already has a no-change early return; the vet path has no counterpart.

## Why it is not a defect this run should have fixed

No criterion in REQ-002 names retries. The design of record does not consider them. Closing it
properly needs a stored request key and a rule for what a replay returns, which is a schema change
and a contract change to every caller, including a Discovery agent that does not exist yet.

Fixing it badly is worse than leaving it. A guess at the key's shape, taken now, is a guess every
later caller inherits.

## What a fix would have to decide

1. **Who mints the key.** The caller, or the route. A caller-minted key is the only one that
   survives a lost response, because the route cannot recognise a repeat it never answered.
2. **What a replay returns.** The original answer, or a refusal naming the first attempt. The first
   is kinder to a client; the second is easier to reason about.
3. **How long a key is remembered**, and what happens after it is forgotten.
4. **Whether a repeated vet with different evidence is a replay or a new action.** It is a new
   action, and the key must make that distinguishable.
5. **Whether the audit trail records the replay.** An append-only trail that hides a duplicate
   attempt is less honest than one that records it and marks it.

## Where the evidence is

`loop/items/AI4DEV-102/review/reviewer-gpt-6-astra-medium.md`, finding 2, and
`reviewer-muse-spark-1.3-xhigh.md`, finding 7.

## Suggested shape of the board item

One leaf under the requirement that owns the Discovery agent's per-turn contract, because that is
the caller whose retries matter, and a second leaf for the vetting action if the founder wants the
administrator path covered too. Blocked by nothing in this tree; it can be built as soon as the
shape above is decided.
