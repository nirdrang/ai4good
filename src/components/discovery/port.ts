import type { ChatTransport } from "ai";
import type {
  BriefSnapshot,
  Confirmation,
  DiscoveryFile,
  DiscoveryRefusal,
  DiscoveryState,
  DiscoveryUIMessage,
  DiscoveryUsage,
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

/** Everything the Discovery screen reads or writes. No member rewrites or regenerates. */
export interface DiscoveryPort {
  load(): Promise<Result<DiscoveryState>>;
  /** One main-chat turn per send. A file read is not a turn. */
  readonly chat: ChatTransport<DiscoveryUIMessage>;
  /**
   * Upload one file and start its read. The result carries the created file and its id.
   * Refused at the three-file limit when the project is not funded, and when the name is already listed.
   * The read uses no reply, no free turn, and no fuel.
   */
  addFile(file: File): Promise<Result<DiscoveryFile>>;
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
