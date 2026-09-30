import type { ChatTransport } from "ai";
import type {
  BriefSnapshot,
  Confirmation,
  DiscoveryFile,
  DiscoveryRefusal,
  DiscoveryState,
  DiscoveryUIMessage,
  DiscoveryUsage,
  FileChatUIMessage,
} from "@/lib/discovery-stream";

export type Result<T> = { ok: true; value: T } | { ok: false; refusal: DiscoveryRefusal };

/** A source push after something the NGO did not just do: a read moved, or a stale write returned the current brief. */
export type ServerChange = {
  files?: DiscoveryFile[];
  brief?: BriefSnapshot;
  usage?: DiscoveryUsage;
  /** Chat lines saved with a brief edit or an accepted suggestion. No AI reply. */
  transcript?: DiscoveryUIMessage[];
};

export type FileChatTarget = { kind: "new"; file: File } | { kind: "existing"; fileId: string };

/** Everything the Discovery screen reads or writes. No member rewrites or regenerates. */
export interface DiscoveryPort {
  load(): Promise<Result<DiscoveryState>>;
  /** One main-chat turn per send. The only model call besides fileChat. */
  readonly chat: ChatTransport<DiscoveryUIMessage>;
  /**
   * One file-chat turn per answer. For a new file, the first answer uploads the file, creates it,
   * charges one turn, and starts the read, together. Refused at the three-file limit when not funded.
   */
  fileChat(target: FileChatTarget): ChatTransport<FileChatUIMessage>;
  subscribe(listener: (change: ServerChange) => void): () => void;
  saveBriefEdit(input: {
    sectionId: string;
    text: string;
    baseRevision: number;
  }): Promise<Result<BriefSnapshot>>;
  acceptSuggestion(input: { topicId: string; baseRevision: number }): Promise<Result<BriefSnapshot>>;
  /** Ask one open topic in the chat. No charge, and no new question when one already exists. */
  askTopic(input: { topicId: string }): Promise<Result<BriefSnapshot>>;
  removeCauseLabel(input: { label: string; baseRevision: number }): Promise<Result<BriefSnapshot>>;
  finish(input: {
    revision: number;
    acks: { reviewed: true; openGaps: boolean; data: true };
  }): Promise<Result<Confirmation>>;
}
