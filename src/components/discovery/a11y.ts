/** Names and copy for the Discovery screen. No imports: the acceptance tests compile this file without the DOM library. */

export type Role =
  | "log"
  | "region"
  | "complementary"
  | "dialog"
  | "form"
  | "group"
  | "button"
  | "textbox"
  | "checkbox"
  | "progressbar"
  | "img"
  | "listitem"
  | "article"
  | "main";

export type Landmark = { readonly role: Role; readonly name: string };

export const SCREEN = {
  progress: { role: "region", name: "Discovery progress" },
  finish: { role: "button", name: "Finish Discovery" },
  conversation: { role: "log", name: "NGO and AI conversation" },
  composer: { role: "form", name: "Your reply" },
  messageBox: { role: "textbox", name: "Your message" },
  questions: { role: "region", name: "Questions" },
  questionsFull: { role: "dialog", name: "Questions" },
  openQuestions: { role: "button", name: "Open the questions" },
  usage: { role: "region", name: "Discovery usage" },
  openBrief: { role: "button", name: "Open your live brief" },
  briefSide: { role: "complementary", name: "Your live brief" },
  briefFull: { role: "dialog", name: "Your live brief" },
  backToChat: { role: "button", name: "Back to chat" },
  files: { role: "region", name: "Your files" },
  addFile: { role: "button", name: "Add a file" },
  chooser: { role: "dialog", name: "Add a file" },
  chooseFile: { role: "button", name: "Choose a file" },
  cancelAdding: { role: "button", name: "Cancel adding this file" },
  fileAnswer: { role: "textbox", name: "Your answer about this file" },
  review: { role: "main", name: "Review before you finish" },
  reviewOpen: { role: "region", name: "Open questions" },
  confirmation: { role: "region", name: "Confirm Discovery" },
  reviewBack: { role: "button", name: "Back to the chat" },
  document: { role: "region", name: "Your Discovery document" },
  findVolunteer: { role: "button", name: "Find a volunteer" },
} as const satisfies Record<string, Landmark>;

/** Names of repeated controls. The argument is the visible text the name is built from. */
export const NAME = {
  option: (label: string, suggested: boolean) => (suggested ? `${label} Suggested` : label),
  writeOwn: "Write my own",
  ownAnswer: (question: string) => `Your own answer to: ${question}`,
  answerRow: (question: string) => `Answer: ${question}`,
  viewRow: (question: string) => `View your answer in the chat: ${question}`,
  editSection: (title: string) => `Edit ${title}`,
  fileChat: (fileName: string) => `File chat: ${fileName}`,
  reading: (fileName: string) => `Reading ${fileName}`,
  openFileChat: (fileName: string) => `Open the file chat for ${fileName}`,
  useSuggestion: "Use the suggestion",
  answerInChat: "Answer in the chat",
  notSure: "I'm not sure",
  aiReply: "AI reply",
  yourTurn: "You",
} as const;

export const IMPORTANCE = {
  needed: "Needed before build",
  suggested: "A suggestion exists",
  later: "Can wait",
} as const;
export type Importance = keyof typeof IMPORTANCE;

export const QUESTION_STATUS = {
  answered: "Answered",
  notSure: "Not sure",
  open: "Open",
  ready: "Ready to send",
  next: "Coming next",
} as const;
export type QuestionStatus = keyof typeof QUESTION_STATUS;

export const BRIEF_STATUS = {
  agreed: "Agreed",
  notSure: "Not sure yet",
  open: "To be discussed",
  suggestion: "Suggestion · waiting for you",
} as const;

export const TEXT = {
  suggested: "Suggested",
  added: "Added to brief",
  carried: "Still open from last round",
  changing: "Changing your earlier answer",
  freeReceipt: "Free reply · no charge",
  fileQuestion: "What should we know about this file?",
  acceptedTypes: "PDF, images, CSV, TSV, TXT, Word, or Excel.",
  sampleData: "Use sample or redacted data, not real records. ai4good and your volunteer will see it.",
  fileLimit: "Free projects can add 3 files in Discovery.",
  fileStatus: {
    asking: "Setting up",
    readingPrefix: "Reading…",
    reading: (percent: number) => `Reading… ${percent}%`,
    waiting: "A question for you",
    ready: (facts: number) => `Ready · ${facts} facts`,
  },
  source: {
    intake: "From your intake",
    chat: (round: number) => `From the chat, round ${round}`,
    accepted: "Suggestion you accepted",
    edit: "Your edit",
    file: (fileName: string) => `From ${fileName}`,
  },
  revision: (n: number) => `Revision ${n}`,
  editsFree: "Edits are free.",
  oneAtATime: "One question at a time",
  showTogether: "Show questions together",
  nextQuestion: "Next question",
  buyFuel: "Buy fuel",
  buyFuelNote: "The minimum is $50. Fuel does not add free replies.",
  send: "Send",
  sendPaid: "Send paid reply",
  notePlaceholder: "Add a note to your answers (optional)",
  replyPlaceholder: "Reply to ai4good AI",
  usageValues: { daily: "Free today", beta: "Beta", fuel: "Fuel" },
  ack: {
    reviewed: (revision: number) =>
      `I have reviewed revision ${revision}. It describes the first version we need.`,
    gaps: (open: number) =>
      `I understand that ${open === 1 ? "1 question" : `${open} questions`} remain open. I choose to finish Discovery anyway and keep them in the brief.`,
    data: "Our NGO takes responsibility for data access and keeps only the personal information this tool needs.",
  },
  finished: "Discovery finished",
  finishedOpen: "Discovery finished with open questions",
  dataTier: {
    0: "Data: Tier 0. The tool keeps no personal information.",
    1: "Data: Tier 1. The tool keeps ordinary personal information. Keep only what it needs.",
    2: "Data: Tier 2. The tool handles sensitive personal information. During the build, the volunteer uses sample data only. Your NGO connects real data after handoff.",
  },
  fit: {
    fits: "Fit: a staff member can look after this tool by chat after the volunteer leaves.",
    declined: "Fit: this need needs ongoing developer work, so ai4good cannot take it on.",
  },
} as const;
