import type { ChatTransport } from "ai";
import type {
  Action,
  ActionKind,
  ChatScope,
  PrdRefusal,
  PrdSnapshot,
  PrdUIMessage,
  Result,
} from "@/lib/prd-stream";

export type { PrdRefusal, Result };

/**
 * Everything the PRD workspace screen reads or writes.
 * `chat` is one transport per conversation, and its body is a send body.
 * `act` runs the action the token names, at the revision that token was issued for.
 * `subscribe` reports the other viewer's work and AI turns the backend starts.
 */
export interface PrdPort {
  load(): Promise<Result<PrdSnapshot>>;
  chat(scope: ChatScope): ChatTransport<PrdUIMessage>;
  act(action: Action<ActionKind>): Promise<Result<PrdSnapshot>>;
  saveDraft(key: string, text: string): Promise<void>;
  subscribe(listener: (snapshot: PrdSnapshot) => void): () => void;
}
