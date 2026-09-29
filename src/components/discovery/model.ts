import type {
  BriefQuestion,
  BriefSnapshot,
  DiscoveryFile,
  DiscoveryUIMessage,
} from "@/lib/discovery-stream";
import { TEXT } from "./a11y";

/** What the NGO has chosen for one current question but not yet sent. */
export type Draft =
  | { kind: "option"; optionId: string }
  | { kind: "own"; text: string }
  | { kind: "uncertain" };

/** The snapshot with the higher revision wins, whichever path delivered it. */
export function newerBrief(current: BriefSnapshot, incoming: BriefSnapshot): BriefSnapshot {
  return incoming.revision > current.revision ? incoming : current;
}

/** Asked questions whose topic is not agreed, plus any question Edit reopened. */
export function currentQuestions(
  brief: BriefSnapshot,
  reopened: readonly string[] = [],
): BriefQuestion[] {
  const again = new Set(reopened);
  return brief.questions.filter((question) => {
    if (again.has(question.id)) return true;
    const topic = brief.topics.find((item) => item.id === question.topicId);
    return topic !== undefined && topic.state.kind !== "agreed";
  });
}

export type PresentedMessage = {
  id: string;
  role: "user" | "assistant";
  paragraphs: string[];
  filed: string[];
  receipt: string | null;
};

function paragraphsOf(text: string): string[] {
  return text
    .split(/\n\s*\n/)
    .map((block) => block.trim())
    .filter((block) => block.length > 0);
}

/** The conversation a person reads. Question parts stay out of the bubbles. */
export function presentMessages(messages: readonly DiscoveryUIMessage[]): PresentedMessage[] {
  return messages.flatMap((message) => {
    if (message.role !== "user" && message.role !== "assistant") return [];
    const paragraphs: string[] = [];
    const filed: string[] = [];
    let receipt: string | null = null;
    for (const part of message.parts) {
      if (part.type === "text") paragraphs.push(...paragraphsOf(part.text));
      else if (part.type === "data-filed") {
        for (const topic of part.data.topics) filed.push(topic.title);
      } else if (part.type === "data-charge" && part.data.kind === "free") {
        receipt = TEXT.freeReceipt;
      }
    }
    return [{ id: message.id, role: message.role, paragraphs, filed, receipt }];
  });
}

export type FileRowView = {
  id: string;
  name: string;
  statusText: string;
  percent: number | null;
  canOpen: boolean;
};

function statusText(file: DiscoveryFile): string {
  if (file.origin === "intake") return TEXT.source.intake;
  switch (file.status.kind) {
    case "reading":
      return TEXT.fileStatus.reading(file.status.percent);
    case "waiting":
      return TEXT.fileStatus.waiting;
    case "ready":
      return TEXT.fileStatus.ready(file.status.facts);
    case "failed":
      return file.status.reason;
  }
}

function percentOf(file: DiscoveryFile): number | null {
  if (file.origin !== "discovery") return null;
  if (file.status.kind === "reading" || file.status.kind === "waiting") return file.status.percent;
  return null;
}

/** Intake files are listed and never counted. The limit of three applies only while the project is not funded. */
export function fileRows(files: readonly DiscoveryFile[], funded: boolean): {
  rows: FileRowView[];
  discoveryCount: number;
  canAdd: boolean;
  limitText: string | null;
} {
  const discoveryCount = files.filter((file) => file.origin === "discovery").length;
  return {
    rows: files.map((file) => ({
      id: file.id,
      name: file.name,
      statusText: statusText(file),
      percent: percentOf(file),
      canOpen: file.origin === "discovery",
    })),
    discoveryCount,
    canAdd: funded || discoveryCount < 3,
    limitText: funded ? null : TEXT.fileLimit,
  };
}
