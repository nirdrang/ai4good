# Discovery model calls

This records the wired Discovery implementation. Sources are `discovery-turn.ts`, `discovery-reply.ts`, `discovery-brief.ts`, `discovery-files.ts`, `discovery-file-job.ts`, `discovery-model.ts` and `scope.ts` under `supabase/functions/_shared/`. The interface contract is [discovery-ui-contract.md](discovery-ui-contract.md).

| Operation | Trigger | Model output | Discovery charge |
| --- | --- | --- | --- |
| Opening reply | First load of a submitted project's empty conversation | One `reply` tool answer | Zero; idempotent opening |
| Answer or note | NGO selects answers or submits a note | One `reply` tool answer | One completed free reply, or funded paid USD usage |
| File read | File upload starts automatic background ingestion | `record_file_digest` per part | Zero replies and zero fuel |
| Review, edit, accept, remove label, finish | NGO uses the brief or review | No model call | Zero |
| Technical scope in the PRD step | Confirmed Discovery document | One `record_scope` tool answer | No Discovery credit |

## Reply and live brief

The opening and every chat turn use the same `reply` tool. It carries the NGO-facing text, questions with suggestions and importance, answers agreed on the turn, open questions, optional free-turn off-topic classification, and proposed cause labels. The parser rejects a missing tool or malformed input. The caller treats this as a system error and releases the original reservation; it does not publish a result.

The request carries settled conversation text, the current brief, cause-label vocabulary, recorded need and completed file digests. Skill 06, which writes technical scope, is excluded from reply prompts. Every answer submitted through a question card is applied before model updates, so the model cannot replace that human answer. A semantic document change creates a new brief revision in the turn settlement. The reply and brief come from one call.

The text streams from the tool's `text` field. Typed stream parts publish questions, filed topics, the receipt, ready state, brief and usage. The free opening asks for files while fewer than three Discovery files exist. It does not reserve or consume a daily reply. The reply reservation fixes Free or Paid before submission; a failed tool answer cannot become a charged successful result.

Cause labels stay in the live brief. The model reuses a matching vocabulary label, adds one only for a genuinely new domain, and emits none for a thin conversation. At most three labels, each at most 40 characters, are canonicalised and deduplicated. Removing a label records it as removed so later model proposals cannot restore it. Finish publishes the confirmed labels to the project and shared vocabulary transactionally. No human control creates or curates labels.

## Files

Choosing a file uploads it and starts its read immediately. There is no file conversation or question before ingestion. The background job reads large content in bounded parts, validates each digest tool answer, stores the part results and joins their facts into one digest. Progress reaches Ready with the number of facts.

Facts enter a new brief revision marked with their file source. They do not agree a required topic. Later chat turns carry only the digest, never the original file. The next main-chat reply reports what the file showed in one sentence. Reading consumes no Discovery reply or fuel. Closing a panel does not stop the read. Finish waits for reads to complete.

## Review and confirmation

There is no closing call or regeneration. Review reads the live brief, with open questions and their importance first. Manual edits and accepted suggestions create free revisions; they do not request an AI rewrite. Finish records the revision, actor, time and accepted gaps. Repeated finish is idempotent. The NGO confirms; AI readiness does not approve a document. Editing after confirmation invalidates that approval.

## PRD technical scope

The shared generator takes the brief at its confirmed revision and the confirmation with its accepted gaps. Each story names an agreed topic or a kept open question. The data tier and maintainability verdict stay consistent with that document. The generator rejects a missing or malformed `record_scope`, an ungrounded story, a missing build-split part or a forbidden money figure.

The PRD workspace is not built yet. The acceptance tests drive this shared generator at both tiers; the retained scope edge entry is keyed to the latest confirmed brief and has no Discovery-screen caller. It accepts generation only. Technical scope, complexity, stack, build split and Lovable maintenance guidance are rendered in the PRD step, outside the Discovery document. Cause labels are copied from the confirmed brief.

## Model adapters

Every model caller obtains its adapter from `discoveryModelPort()` and uses that port's model. `DISCOVERY_PROVIDER` selects:

| Value | Adapter | Settings |
| --- | --- | --- |
| unset or `anthropic` | `anthropic-messages.ts` | `ANTHROPIC_API_KEY`, `DISCOVERY_MODEL` |
| `openai-compatible` | `openai-compatible-messages.ts` | `DISCOVERY_BASE_URL`, `DISCOVERY_API_KEY`, `DISCOVERY_MODEL` |
| `openai-responses` | `openai-responses-messages.ts` | Same Discovery settings, optional `DISCOVERY_REASONING_EFFORT` |

The Responses adapter sends `tool_choice: auto` and asks for the required tool in instructions. Application parsers still require that tool and validate its complete answer. The integration stack uses this adapter with muse on opencode Go. No test substitutes an Anthropic response at integration tier. Credentials remain on the server.
