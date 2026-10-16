import type { TopicState } from "@/lib/prd-stream";

export const STATE_LABEL: Readonly<Record<TopicState, string>> = {
  open: "Open",
  draft: "Draft",
  ready: "Ready to confirm",
  confirmed: "Confirmed",
  "needs-review": "Needs review",
};

export const STAGES = [
  "Intake",
  "Discovery",
  "Volunteer match",
  "PRD",
  "UI Design",
  "Build plan",
  "Build",
  "Handoff",
] as const;
export const CURRENT_STAGE = 3;

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export const COPY = {
  projectPrd: "Project PRD",
  revision: (revision: number) => `Revision ${revision}`,
  progressTail: "required topics confirmed",
  stillOpen: "Still open",
  readyToClose: "Ready to close · completion check passed",
  closedAt: (revision: number) => `Closed at revision ${revision}`,
  closePrd: "Close PRD",
  closeThePrd: "Close the PRD",
  closeReason: (revision: number) =>
    `The completion check passes for revision ${revision}. Closing freezes it, and UI Design starts from it.`,
  mainChat: "Main chat",
  topicsLabel: "PRD sections",
  funds: "PRD funds",
  fundsTail: (allocation: string) => ` left of ${allocation}`,
  pending: (amount: string) => ` · ${amount} pending`,
  fundsOut: "Not enough left for another AI reply. The kitchen adds funds to continue.",
  stagesLabel: "Project stages",
  stageChip: (index: number, total: number) => `PRD · stage ${index + 1} of ${total}`,
  closedBanner: (revision: number, openPoints: number) =>
    `PRD closed at revision ${revision}${openPoints > 0 ? ` with ${openPoints} open ${openPoints === 1 ? "point" : "points"}` : ""} · UI Design starts from it`,
  ngoOpensDesign: (dev: string) => `${dev} opens UI Design next.`,
  openUiDesign: "Open UI Design",
  readOnlyLead: (dev: string) => `${dev} works on the PRD with the AI here.`,
  readOnlyTail:
    "You can read along and browse topics. Your questions are in the list on the right.",
  readOnlyTailPhone: "You can read along. Your questions are under Questions.",
  closedReadOnly: "The PRD is closed. Its revision is frozen and nothing here can change.",
  composerHint: {
    idle: "Main chat: about the whole PRD. To work on one section, open it on the left.",
    busy: "The AI is answering. Send adds your message to the queue.",
    funds: "PRD funds are used up. The AI cannot answer until the kitchen adds funds.",
  },
  messageToAi: "Message to ai4good AI",
  writeToAi: "Write to the AI",
  send: "Send",
  addToQueue: "Add to queue",
  queued: (count: number) => `Queued (${count}) · each one sends on its own when the AI finishes`,
  edit: "Edit",
  remove: "Remove",
  answering: "Answering…",
  alreadyQueued: "This is already waiting in the queue.",
  replyFailed: "The reply did not finish.",
  updateUnreadable:
    "The latest update could not be read. Reload the page to see the PRD as it is now.",
  openLink: "Open",
  openTopicChat: (title: string) => `Open the ${title} chat`,
  openGap: (title: string) => `Open ${title}`,
  gapClosed: "Gap closed",
  closeAnyway: "Close anyway",
  keepWorking: "Keep working",
  answerIt: "Answer it",
  postTo: (ngo: string) => `Post to ${ngo}`,
  suggestedHeading: (ngoLabel: string) => `Suggested question for ${ngoLabel} · not posted yet`,
  postedHeading: (ngoLabel: string, blocking: boolean, status: string) =>
    `Question for ${ngoLabel} · ${blocking ? "blocking" : "not blocking"} · ${status.toLowerCase()}`,
  closePressed: (dev: string, revision: number) =>
    `${dev} pressed Close PRD · revision ${revision}`,
  usingAnswer: (ngo: string, topic: string) => `I’m using ${ngo}’s answer for ${topic}. Brief:`,
  prdSection: "PRD section",
  sources: (sources: string) => `Sources: ${sources}`,
  userStories: "User stories",
  confirmSection: "Confirm section",
  reopenSection: "Reopen for review",
  backToSections: "← PRD sections",
  backToSectionsName: "Back to PRD sections",
  sectionChat: "Section chat",
  topicInput: (title: string) => `Message to the AI about ${title}`,
  topicPlaceholder: "Write to the AI about this section",
  topicPickPlaceholder: "Pick an answer above for each question, then send",
  topicSend: "Send to the section",
  ngoTopicNote: (dev: string) => `${dev} works on this section with the AI. You can read along.`,
  whyNow: (why: string) => `Why now: ${why}`,
  suggested: "Suggested",
  people: "People",
  peopleLabel: "People in this PRD",
  devListTitle: (ngoLabel: string, open: number) => `Questions for ${ngoLabel} · ${open} open`,
  ngoListTitle: (toAnswer: number) => `Questions for you · ${toAnswer} to answer`,
  devListNote: (blocking: number, ngo: string) =>
    blocking > 0
      ? `${blocking} blocking. Keep working; use each answer when ${ngo} marks it complete.`
      : "No blocking question is open.",
  ngoListNote: "Open a question to answer it with the AI. Mark it complete when you are done.",
  blocks: (topic: string) => `Blocks ${topic}`,
  notBlocking: "Not blocking",
  sentTo: (dev: string) => `Sent to ${dev}:`,
  viewAnswer: "View answer",
  useAnswer: "Use answer",
  answered: (open: boolean, count: number) => `${open ? "▾" : "▸"} Answered (${count})`,
  answeredMeta: (topic: string) => `${topic} · used`,
  allQuestions: "← All questions",
  allQuestionsName: "All questions",
  status: {
    waitingFor: (ngo: string) => `Waiting for ${ngo}`,
    openAnswer: "Open · answer it",
    answering: (ngo: string) => `${ngo} is answering`,
    completeDev: (ngo: string) => `${ngo} marked it complete · use it`,
    completeNgo: (dev: string) => `Complete · waiting for ${dev} to use it`,
    used: (dev: string) => `Used by ${dev}`,
    suggested: "Not posted yet",
  },
  sideInput: "Your answer for the AI",
  sidePlaceholder: "Answer in your own words",
  sideSend: "Send the answer",
  markComplete: "Mark answer complete",
  sideNoteDev: (ngo: string) => `${ngo} answers here with the AI. You can read along.`,
  sideNoteComplete: (dev: string) =>
    `You marked this answer complete. ${dev} will use it and continue in the main chat.`,
  sideNoteUsed: (dev: string) => `${dev} used this answer. It is now in the main chat.`,
  reviewMarked: (ngo: string) => `· ${ngo} marked it complete`,
  reviewAnswer: (ngo: string) => `${ngo}’s answer · you can edit it`,
  reviewNote: "Note for the AI (optional)",
  reviewNotePlaceholder: "For example: the export follows the same rule",
  reviewHint: "Using it sends this to the AI as your message in the main chat.",
  howSheGotThere: "How she got there",
  howSheGotThereText: (count: number) =>
    `Settled with the AI in ${count} ${count === 1 ? "message" : "messages"}, then marked complete.`,
  whatItChanges: "What it changes",
  toDiscuss: "To discuss",
  tabs: {
    label: "Workspace",
    chat: "Chat",
    prd: (confirmed: number, total: number) => `PRD ${confirmed}/${total}`,
    questions: "Questions",
  },
  loading: "Loading the PRD workspace",
  loadFailed: "The PRD workspace did not load.",
  today: "Today",
  dismiss: "Dismiss",
} as const;

export function dayLabel(at: Date, now: Date): string {
  if (
    at.getFullYear() === now.getFullYear() &&
    at.getMonth() === now.getMonth() &&
    at.getDate() === now.getDate()
  ) {
    return COPY.today;
  }
  return `${WEEKDAYS[at.getDay()]} ${at.getDate()} ${MONTHS[at.getMonth()]}`;
}

export function money(micros: number): string {
  return `$${(micros / 1_000_000).toFixed(2)}`;
}
