import type { PrdUIMessage, QuestionId, Role, TopicId, TurnId } from "../../../src/lib/prd-stream";
import {
  availableMicros,
  firstName,
  topicState,
  waitingDependency,
  type PrdRecord,
  type QuestionRecord,
  type StoredMessage,
  type TopicRecord,
} from "../../../src/lib/prd-rules";

type Part = PrdUIMessage["parts"][number];

export const AI_LABEL = "ai4good AI";
export const DEV_LABEL = "Priya (Dev)";
export const NGO_LABEL = "Maya (NGO)";

export const TOPIC = {
  users: "users" as TopicId,
  shifts: "shifts" as TopicId,
  notify: "notify" as TopicId,
  data: "data" as TopicId,
  scope: "scope" as TopicId,
  success: "success" as TopicId,
} as const;

export const QUESTION = {
  retention: "retention" as QuestionId,
  logo: "logo" as QuestionId,
  success: "success" as QuestionId,
} as const;

const TITLES: Record<TopicId, string> = {
  [TOPIC.users]: "Users and roles",
  [TOPIC.shifts]: "Shift scheduling rules",
  [TOPIC.notify]: "Notifications",
  [TOPIC.data]: "Data handling",
  [TOPIC.scope]: "Technical scope",
  [TOPIC.success]: "Success criteria",
};

export const REPLY_COST_MICROS = 514_250;
export const REPLY_HOLD_MICROS = 550_000;
export const ALLOCATION_MICROS = 20_000_000;
export const THRESHOLD = "[THRESHOLD — pilot decision]";

const USERS_LINES = [
  "Three roles: the kitchen coordinator, shift leads, and volunteers.",
  "About 60 active volunteers and 3 shift leads. Maya is the coordinator.",
  "A shift lead sees and marks attendance for their own shift only.",
  "Volunteers sign in with email. There is no public sign-up.",
];

const NOTIFY_LINES = [
  "An email reminder goes to each volunteer 24 hours before their shift.",
  "The coordinator gets an email when a Saturday shift is still short 48 hours ahead.",
  "Text messages are a later option, not part of the first version.",
];

const STACK_LINE =
  "Stack: Lovable app on Supabase, with a one-time import from the kitchen’s Google Sheet.";
const SPLIT_LINE =
  "Build split: Lovable builds the volunteer and coordinator screens; Claude Code builds the reminder job and the Saturday shortage check.";
const EXPORT_LINE = "Only the coordinator can export the volunteer list.";

const GAPS: Record<string, string> = {
  [TOPIC.shifts]:
    "Discovery says the kitchen closes on 6 public holidays a year. The PRD only lets the coordinator cancel one shift at a time.",
  [TOPIC.users]:
    "Discovery mentions volunteers aged 16 and 17. Users and roles does not say whether they can join.",
};

export const GAP_FIXES: Record<string, string> = {
  [TOPIC.shifts]:
    "Holidays: the coordinator sets the closed days once a year, and no shifts are published on them.",
  [TOPIC.users]:
    "Volunteers aged 16 and 17 can join with a parent’s consent, which the coordinator records.",
};

type QuestionScript = {
  topicId: TopicId;
  blocking: boolean;
  text: string;
  why: string;
  options: string[];
  aside: string;
  asides: string[];
  impact: string;
  openPoint: string | null;
  expand: Record<string, string>;
};

const QUESTIONS: Record<QuestionId, QuestionScript> = {
  [QUESTION.retention]: {
    topicId: TOPIC.data,
    blocking: true,
    text: "How long should the kitchen keep a volunteer’s contact details?",
    why: "only the kitchen can decide what it keeps about people.",
    options: [
      "12 months after their last shift",
      "Until the volunteer asks to be removed",
      "24 months after their last shift",
    ],
    aside:
      "Yes. A volunteer can always ask to be removed earlier, and the coordinator then deletes their details. That is their right, separate from the rule you set here.",
    asides: ["removed earlier", "ask to be removed", "delete their details"],
    impact:
      "Data handling gets its retention rule, and the export story must drop volunteers past it.",
    openPoint:
      "Should the coordinator’s export follow the same rule, or keep everyone for the yearly report?",
    expand: {},
  },
  [QUESTION.logo]: {
    topicId: TOPIC.notify,
    blocking: false,
    text: "Should reminder emails show the kitchen’s logo?",
    why: "a small branding choice for the reminder emails. It does not block anything.",
    options: ["Yes, show the logo", "No, plain text emails"],
    aside:
      "The logo only changes how the email looks. The text and the reminder times stay the same.",
    asides: ["what does the logo change", "does the logo change", "change the text"],
    impact: "One line in Notifications about the reminder email layout.",
    openPoint: null,
    expand: {},
  },
  [QUESTION.success]: {
    topicId: TOPIC.success,
    blocking: true,
    text: "What would show the kitchen that the tool works?",
    why: "success criteria must come from the kitchen, not from the developer.",
    options: [
      "Every Saturday shift is full 48 hours ahead",
      "The coordinator spends under 1 hour a week on scheduling",
      "Both of these",
    ],
    aside: "The app counts this for you each week; nobody has to count by hand.",
    asides: ["who counts", "count it by hand", "count this by hand", "who has to count"],
    impact: "Success criteria gets its measures, and the build needs a way to check them.",
    openPoint:
      "How do we measure it? I suggest a weekly count of Saturday shifts that were full 48 hours ahead.",
    expand: {
      "Both of these":
        "every Saturday shift is full 48 hours ahead, and the coordinator spends under 1 hour a week on scheduling",
    },
  },
};

export function topicTitle(id: TopicId): string {
  return TITLES[id] ?? id;
}

export function money(micros: number): string {
  return `$${(micros / 1_000_000).toFixed(2)}`;
}

export function clean(text: string): string {
  const trimmed = text.trim().replace(/[.;,\s]+$/, "");
  return trimmed ? `${trimmed.charAt(0).toUpperCase()}${trimmed.slice(1)}.` : "";
}

function lower(text: string): string {
  return `${text.charAt(0).toLowerCase()}${text.slice(1)}`;
}

export function textParts(lines: readonly string[]): Part[] {
  return lines.map((text) => ({ type: "text", text }));
}

export function updatedPart(titles: string): Part {
  return { type: "data-line", data: { text: `Updated in the PRD: ${titles}`, topicId: null } };
}

export function aiMessage(id: string, at: string, parts: Part[]): PrdUIMessage {
  return { id, role: "assistant", metadata: { actor: "ai", name: AI_LABEL, at }, parts };
}

export function devMessage(id: string, at: string, parts: Part[]): PrdUIMessage {
  return { id, role: "user", metadata: { actor: "dev", name: DEV_LABEL, at }, parts };
}

export function ngoMessage(id: string, at: string, text: string): PrdUIMessage {
  return {
    id,
    role: "user",
    metadata: { actor: "ngo", name: NGO_LABEL, at },
    parts: [{ type: "text", text }],
  };
}

export function eventMessage(
  id: string,
  at: string,
  text: string,
  topicId: TopicId | null,
): PrdUIMessage {
  return {
    id,
    role: "system",
    metadata: { actor: "system", name: "", at },
    parts: [{ type: "data-line", data: { text, topicId } }],
  };
}

export function shared(message: PrdUIMessage): StoredMessage {
  return { message, forRole: null };
}

function topicRecord(
  id: TopicId,
  fields: Partial<TopicRecord> & Pick<TopicRecord, "body" | "sources">,
): TopicRecord {
  return {
    id,
    title: topicTitle(id),
    required: true,
    dependsOn: id === TOPIC.scope ? [TOPIC.shifts] : [],
    drafted: true,
    aiReady: false,
    confirmed: false,
    review: false,
    gap: null,
    gapClosed: false,
    ngoBody: null,
    added: [],
    stories: null,
    ...fields,
  };
}

function shiftPicks(record: PrdRecord): {
  done: boolean;
  swap: string | null;
  publish: string | null;
} {
  const shifts = record.devQuestions.filter((question) => question.topicId === TOPIC.shifts);
  const pick = (id: string) => shifts.find((question) => question.id === id)?.answered ?? null;
  return {
    done: shifts.length > 0 && shifts.every((question) => question.answered !== null),
    swap: pick("swap"),
    publish: pick("publish"),
  };
}

function swapLine(swap: string | null): string {
  if (!swap) return "the swap story";
  if (swap.startsWith("No swaps")) return "no swap story, because volunteers cancel instead";
  if (swap.includes("coordinator")) return "the swap approval story";
  return "the story for volunteers swapping with each other";
}

function used(record: PrdRecord, id: QuestionId): QuestionRecord | null {
  const question = record.questions.find((item) => item.id === id);
  return question && question.status === "used" ? question : null;
}

function stories(record: PrdRecord): string[] {
  const picks = shiftPicks(record);
  const swap =
    !picks.done || !picks.swap || picks.swap.startsWith("No swaps")
      ? null
      : picks.swap.includes("coordinator")
        ? "A volunteer asks to swap a shift, and the coordinator approves it"
        : "Two volunteers swap a shift with each other";
  return [
    "A volunteer signs in with email",
    "A volunteer sees the shift calendar",
    "A volunteer claims an open slot",
    ...(swap ? [swap] : []),
    "The coordinator cancels a shift, and its volunteers get an email",
    "A volunteer gets a reminder 24 hours before a shift",
    "The coordinator gets an email when a Saturday is still short 48 hours ahead",
    "The roster is imported once from the kitchen’s Google Sheet",
    ...(used(record, QUESTION.retention)
      ? ["Volunteer contact details are removed after the retention period"]
      : []),
    ...(used(record, QUESTION.success)
      ? ["The coordinator sees the weekly success count in the app"]
      : []),
  ];
}

function shiftsBody(record: PrdRecord): string[] {
  const picks = shiftPicks(record);
  const open = `open question for ${firstName(record, "dev")}`;
  return [
    "Saturdays: two shifts, 8:00 to 12:00 and 12:00 to 16:00, 6 volunteers each.",
    "Weekdays: one evening shift, 17:00 to 20:00, 4 volunteers.",
    "The coordinator can cancel a single shift; its volunteers get an email.",
    `Swaps: ${picks.done ? picks.swap : open}.`,
    `Publishing: ${picks.done ? picks.publish : open}.`,
  ];
}

function scopeBody(record: PrdRecord, list: readonly string[]): string[] {
  const picks = shiftPicks(record);
  return picks.done
    ? [
        `${list.length} user stories, listed below, with ${swapLine(picks.swap)}.`,
        STACK_LINE,
        "Complexity: small.",
        SPLIT_LINE,
      ]
    : [
        "7 user stories so far, listed below; the swap rule may add one.",
        STACK_LINE,
        "Complexity: small.",
      ];
}

const WAITS_ON: Record<string, string> = {
  [QUESTION.retention]: "how long the kitchen keeps volunteer data",
  [QUESTION.success]: "what success means for the kitchen",
};

function waitingBody(
  record: PrdRecord,
  id: QuestionId,
): Pick<TopicRecord, "body" | "ngoBody"> | null {
  const question = record.questions.find((item) => item.id === id);
  if (!question || question.status === "used") return null;
  const dev = firstName(record, "dev");
  const ngo = firstName(record, "ngo");
  const subject = WAITS_ON[id] ?? question.text;
  return question.status === "complete"
    ? {
        body: [
          `No text yet. ${ngo} answered on ${subject}. It waits for ${dev} to use the answer.`,
        ],
        ngoBody: [
          `Sent to ${dev} · waiting for ${dev} to use it. The AI writes this section from your answer on ${subject} once ${dev} uses it.`,
        ],
      }
    : { body: [`No text yet. It waits for ${ngo}’s answer on ${subject}.`], ngoBody: null };
}

/** Rewrites the sections whose text follows recorded decisions: the shift rules, the scope, and each question's state. */
export function rewriteSections(record: PrdRecord): TopicRecord[] {
  const list = stories(record);
  const retention = used(record, QUESTION.retention);
  const success = used(record, QUESTION.success);
  const logo = used(record, QUESTION.logo);
  return record.topics.map((topic) => {
    switch (topic.id) {
      case TOPIC.shifts:
        return { ...topic, body: shiftsBody(record) };
      case TOPIC.scope:
        return { ...topic, body: scopeBody(record, list), stories: list };
      case TOPIC.notify:
        return { ...topic, body: [...NOTIFY_LINES, ...(logo ? [clean(logo.answer ?? "")] : [])] };
      case TOPIC.data: {
        if (retention) {
          return {
            ...topic,
            drafted: true,
            body: [clean(retention.answer ?? ""), EXPORT_LINE],
            ngoBody: null,
          };
        }
        const waiting = waitingBody(record, QUESTION.retention);
        return waiting ? { ...topic, ...waiting } : topic;
      }
      case TOPIC.success: {
        if (success) {
          return { ...topic, drafted: true, body: [clean(success.answer ?? "")], ngoBody: null };
        }
        const waiting = waitingBody(record, QUESTION.success);
        return waiting ? { ...topic, ...waiting } : topic;
      }
      default:
        return topic;
    }
  });
}

function openerLine(record: PrdRecord, topic: TopicRecord, role: Role): string {
  const dev = firstName(record, "dev");
  const ngo = firstName(record, "ngo");
  if (role === "ngo") {
    return topic.gap !== null
      ? `The completion check found a gap here: ${topic.gap} ${dev} covers it.`
      : `${dev} works on this section with the AI. Questions for you are under Questions.`;
  }
  if (topic.gap !== null) {
    return `The completion check found a gap here: ${topic.gap} Tell me how to cover it.`;
  }
  const asked = record.devQuestions.some(
    (question) => question.topicId === topic.id && question.answered === null,
  );
  if (asked) return "Two decisions are still open. Pick an answer for each one, then send.";
  const state = topicState(topic);
  if (state !== "confirmed" && waitingDependency(record, topic) !== null) {
    return "This section waits on the shift rules, because the swap rule changes which stories we need.";
  }
  if (state === "ready" || state === "needs-review") {
    return "Every decision is recorded. Read the section above, then confirm it or tell me what to change.";
  }
  if (state === "confirmed") {
    return "This section is confirmed. If you change something here, it goes back to you for review.";
  }
  const waiting = record.questions.some(
    (question) => question.topicId === topic.id && question.blocking && question.status !== "used",
  );
  if (waiting) {
    return `This section waits for ${ngo}’s answer to a blocking question. You can still discuss it here.`;
  }
  return "Tell me what to change, or ask me anything about this section.";
}

export function topicOpeners(record: PrdRecord, topic: TopicRecord, at: string): StoredMessage[] {
  const asked = record.devQuestions
    .filter((question) => question.topicId === topic.id && question.answered === null)
    .map((question) => question.id);
  const roles: Role[] = ["dev", "ngo"];
  return roles.map((role) => ({
    forRole: role,
    message: aiMessage(`opener-${topic.id}-${role}`, at, [
      ...textParts([
        `This chat is about ${topic.title}. I read it against the current PRD and the Discovery document.`,
        openerLine(record, topic, role),
      ]),
      ...(asked.length > 0 ? [{ type: "data-dev-questions" as const, data: { ids: asked } }] : []),
    ]),
  }));
}

/** Rewrites each topic chat's opener from the topic's current state, while that chat holds nothing but its openers. */
export function refreshOpeners(record: PrdRecord): PrdRecord {
  const chats = { ...record.chats };
  for (const topic of record.topics) {
    const key = `topic:${topic.id}`;
    const stored = chats[key] ?? [];
    if (stored.some((entry) => !entry.message.id.startsWith(`opener-${topic.id}-`))) continue;
    const at = stored[0]?.message.metadata?.at ?? new Date(0).toISOString();
    chats[key] = topicOpeners(record, topic, at);
  }
  return { ...record, chats };
}

export function sideOpener(record: PrdRecord, question: QuestionRecord, at: string): StoredMessage {
  return shared(
    aiMessage(`opener-side-${question.id}`, at, [
      {
        type: "text",
        text: `${firstName(record, "dev")} asks: ${question.text} This matters because ${question.why} Pick an answer below or write your own.`,
      },
    ]),
  );
}

export function questionRecord(
  id: QuestionId,
  introTurn: string,
  status: QuestionRecord["status"],
): QuestionRecord {
  const script = QUESTIONS[id];
  if (!script) throw new Error(`no scripted question ${id}`);
  return {
    id,
    topicId: script.topicId,
    text: script.text,
    why: script.why,
    blocking: script.blocking,
    introTurn: introTurn as TurnId,
    options: [...script.options],
    impact: script.impact,
    openPoint: script.openPoint,
    status,
    followUp: "none",
    evidence: [],
    answer: null,
    briefTurn: null,
    changed: false,
    pointOpen: false,
    using: false,
  };
}

function isAside(script: QuestionScript, text: string): boolean {
  const said = text.toLowerCase();
  return script.asides.some((phrase) => said.includes(phrase));
}

/** The AI's scripted side-chat reply. A message the script lists as a question to the AI is an aside; anything else is part of the answer. */
export function sideReply(
  record: PrdRecord,
  question: QuestionRecord,
  text: string,
): { text: string; evidence: string[]; followUp: QuestionRecord["followUp"] } {
  const script = QUESTIONS[question.id];
  if (!script) return { text: "Noted.", evidence: question.evidence, followUp: question.followUp };
  if (isAside(script, text)) {
    return {
      text: `${script.aside}${question.evidence.length > 0 ? "" : " What is your answer?"}`,
      evidence: question.evidence,
      followUp: question.evidence.length > 0 ? "none" : "pending",
    };
  }
  const evidence = [...question.evidence, script.expand[text] ?? text];
  if (question.evidence.length > 0) {
    return {
      text: `Thanks, I have what I need. Mark the answer complete and I will write it up for ${firstName(record, "dev")}.`,
      evidence,
      followUp: "none",
    };
  }
  if (question.id === QUESTION.logo && /plain/i.test(text)) {
    return {
      text: `Noted: plain text emails, with no logo. That settles it. Mark the answer complete and I will write it up for ${firstName(record, "dev")}.`,
      evidence,
      followUp: "none",
    };
  }
  const follow: Record<string, string> = {
    [QUESTION.retention]:
      "That works for most kitchens. One check: does “contact details” mean email and phone only? I suggest keeping shift history without names after that, so your yearly numbers still add up. Is that all right?",
    [QUESTION.logo]:
      "Noted. If the logo file is not ready yet, the emails start in plain text and the logo comes later. Is that fine?",
    [QUESTION.success]:
      "Good. Someone has to count this. Should you see the number in the app each week, or is a monthly email to you enough?",
  };
  return { text: follow[question.id] ?? "Is that all?", evidence, followUp: "pending" };
}

/** The one clean answer the AI writes from the whole side chat. */
export function writeAnswer(question: QuestionRecord): string {
  const parts = question.evidence.map((item) => item.trim()).filter(Boolean);
  const first = (parts[0] ?? "").replace(/[.\s]+$/, "");
  const rest = parts.slice(1).join(". ");
  const yes = /^(yes|ok|okay|fine|sure|agreed?)\b/i.test(rest);
  if (question.id === QUESTION.retention) {
    const period = lower(first).replace(/^for /, "");
    return `Keep a volunteer’s ${yes ? "email and phone " : "contact details "}${/^until/.test(period) ? "" : "for "}${period}, then delete them.${yes ? " Shift history stays, without names." : rest ? ` ${clean(rest)}` : ""}`;
  }
  if (question.id === QUESTION.logo) {
    const plain = /plain|^no\b/i.test(first);
    const extra = rest && !yes && !/^(no|nope|nothing)\b/i.test(rest) ? ` ${clean(rest)}` : "";
    return `${plain ? "Reminder emails are plain text, with no logo." : `Reminder emails show the kitchen’s logo.${yes ? " Until the logo file is ready, they go out in plain text." : ""}`}${extra}`;
  }
  if (question.id === QUESTION.success) {
    const how = /month/i.test(rest)
      ? " Maya gets the count in a monthly email."
      : /week|app/i.test(rest) || yes
        ? " The coordinator sees the count in the app each week."
        : rest
          ? ` ${clean(rest)}`
          : "";
    return `Success means ${lower(first)}.${how}`;
  }
  return clean(parts.join(". "));
}

export function answerUsedLines(
  record: PrdRecord,
  question: QuestionRecord,
  use: { answer: string; changed: boolean; note: string },
): string[] {
  const title = topicTitle(question.topicId);
  const ngo = firstName(record, "ngo");
  const lines = [`Recorded in ${title}: ${clean(use.answer)}`];
  if (use.changed) {
    lines.push(`I will tell ${ngo} you adjusted her answer, so she sees the final wording.`);
  }
  if (use.note) lines.push(`Noted: ${use.note}`);
  if (question.openPoint !== null && !use.note) {
    lines.push(
      `One point to settle: ${question.openPoint} Answer here, and I will mark the section ready.`,
    );
  } else if (question.openPoint !== null) {
    lines.push(`Your note settles the open point. ${title} is ready for you to confirm.`);
  } else if (question.blocking) {
    lines.push(`${title} is ready for you to confirm.`);
  }
  return lines;
}

export function finalWordingLine(record: PrdRecord, answer: string): string {
  return `${firstName(record, "dev")} adjusted your answer before using it. The final wording: ${answer}`;
}

export function mainReplyLines(
  record: PrdRecord,
  text: string,
  remaining: readonly string[],
): string[] {
  if (/cost|price|charge|spend|money|fund/i.test(text)) {
    const left = availableMicros(record.funds) + record.funds.replyHoldMicros;
    return [
      `Each AI reply holds up to ${money(record.funds.replyHoldMicros)} of PRD funds until the real cost comes in; most replies cost about $0.50. The completion check costs about the same. ${money(left)} is left now, about ${money(Math.max(0, left - 510_000))} after this reply.`,
    ];
  }
  if (/block|missing|left|close|next|remain/i.test(text)) {
    return remaining.length > 0
      ? [
          `Still open: ${remaining.join("; ")}.`,
          "You can close the PRD at any time. Close PRD runs the completion check first and shows what is still open.",
        ]
      : ["Nothing is left. The completion check passed, so you can close the PRD."];
  }
  return ["Noted. I added this to the PRD notes. It does not change a confirmed topic."];
}

export function settleLines(title: string, text: string): string[] {
  return [`Recorded in ${title}: ${text}`, `${title} is ready for you to confirm.`];
}

export function answersReply(record: PrdRecord): string[] {
  const picks = shiftPicks(record);
  return [
    `Shift scheduling rules has every decision it needs now. I also updated Technical scope with ${swapLine(picks.swap)}, so that section is complete too.`,
    "This section is ready for you to confirm above. Technical scope is ready as well; open it on the left.",
  ];
}

export function topicNoteReply(topic: TopicRecord): string {
  return `Noted. I updated the ${topic.title} draft with this.${topic.confirmed ? " It changed a confirmed section, so it goes back to you for review." : ""}`;
}

export function gapFixReply(topic: TopicRecord, text: string): string[] {
  return [
    `Added to ${topic.title}: ${clean(text)}`,
    "The gap is closed. Read the section above and confirm it again.",
  ];
}

const NUMBER_WORDS = [
  "zero",
  "one",
  "two",
  "three",
  "four",
  "five",
  "six",
  "seven",
  "eight",
  "nine",
  "ten",
];

function countWord(count: number): string {
  return NUMBER_WORDS[count] ?? String(count);
}

export function checkStartLine(total: number): string {
  return `All ${countWord(total)} sections are confirmed. I am running the completion check.`;
}

/** The scripted scorer: the first run finds the two canvas gaps, later runs find only the gaps still open. */
export function scoreGaps(record: PrdRecord): { topicId: TopicId; text: string }[] {
  if (record.checkRuns === 0) {
    return Object.entries(GAPS)
      .filter(([id]) => record.topics.some((topic) => topic.id === id))
      .map(([id, text]) => ({ topicId: id as TopicId, text }));
  }
  return record.topics
    .filter((topic) => topic.gap !== null)
    .map((topic) => ({ topicId: topic.id, text: topic.gap ?? "" }));
}

export function checkHead(revision: number, gaps: number, final: boolean): string {
  return `Completion check on revision ${revision}: the PRD covers ${gaps > 0 ? 84 : 91}% of the confirmed Discovery document. The configured threshold is ${THRESHOLD}, so it ${gaps > 0 ? (final ? "does not pass." : "does not pass yet.") : "passes."}`;
}

function blockingQuestions(count: number): string {
  const word = countWord(count);
  return count === 1
    ? "One blocking question is"
    : `${word.charAt(0).toUpperCase()}${word.slice(1)} blocking questions are`;
}

export function confirmCheckLines(
  total: number,
  gaps: number,
  blocking: { open: number; unposted: number },
): string[] {
  if (gaps > 0) {
    return [
      `I found ${countWord(gaps)} gaps, each in a section. Open each one, tell me how to cover it, then confirm the section again. The check runs again when all ${countWord(total)} are confirmed.`,
    ];
  }
  const confirmed = `All ${countWord(total)} required topics are confirmed`;
  if (blocking.open === 0 && blocking.unposted === 0) {
    return [`${confirmed} and no blocking question is open.`];
  }
  const open =
    blocking.open === 0
      ? "No blocking question is waiting for an answer."
      : `${blockingQuestions(blocking.open)} still open.`;
  const unposted =
    blocking.unposted === 0 ? "" : ` ${blockingQuestions(blocking.unposted)} not posted yet.`;
  return [`${confirmed}. ${open}${unposted}`];
}

export function closeCheckLines(
  revision: number,
  gaps: number,
  unconfirmed: readonly string[],
): { before: string[]; after: string[] } {
  if (gaps === 0 && unconfirmed.length === 0) {
    return {
      before: [
        checkHead(revision, 0, true),
        `The PRD is closed at revision ${revision}. UI Design starts from it.`,
      ],
      after: [],
    };
  }
  return {
    before: [
      checkHead(revision, gaps, true),
      ...(gaps > 0 ? [`It found ${gaps === 1 ? "one gap" : `${gaps} gaps`}:`] : []),
    ],
    after: [
      ...(unconfirmed.length > 0 ? [`Not confirmed yet: ${unconfirmed.join(", ")}.`] : []),
      "You can close anyway; these stay recorded as open in the closed revision. Or keep working and close later.",
    ],
  };
}

export function closeCheckStart(revision: number): string {
  return `I am running the completion check on revision ${revision} before closing.`;
}

export function closeCheckRepeat(revision: number): string {
  return `The completion check already ran on revision ${revision}, and the PRD has not changed since, so its result stands.`;
}

function stamp(day: string, minute: number): string {
  return `${day}T12:${String(minute).padStart(2, "0")}:00.000Z`;
}

function people(): PrdRecord["people"] {
  return [
    { role: "ai", name: "ai4good AI", label: "Drafts the PRD and helps both people" },
    { role: "dev", name: "Priya Shah", label: "Developer · works on the PRD with the AI" },
    { role: "ngo", name: "Maya Levi", label: "NGO · Harbor Community Kitchen · answers questions" },
  ];
}

const OPENING = [
  "I read the confirmed Discovery document, revision 12. I carried over 14 agreed answers, so nobody needs to repeat them.",
  "Six PRD topics are required: Users and roles, Shift scheduling rules, Notifications, Data handling, Technical scope, and Success criteria.",
];

function blankRecord(): Omit<PrdRecord, "topics" | "chats"> {
  return {
    sequence: 1,
    revision: 1,
    discoveryRevision: 12,
    project: { title: "Volunteer scheduling", organizationName: "Harbor Community Kitchen" },
    people: people(),
    devQuestions: [],
    questions: [],
    drafts: { dev: {}, ngo: {} },
    funds: {
      allocationMicros: ALLOCATION_MICROS,
      settledMicros: 0,
      pendingMicros: 0,
      replyHoldMicros: REPLY_HOLD_MICROS,
    },
    check: null,
    checkRuns: 0,
    closed: null,
    versions: {},
    requests: {},
    busy: {},
  };
}

function withOpeners(record: PrdRecord, at: string): PrdRecord {
  const chats = { ...record.chats };
  for (const topic of record.topics) chats[`topic:${topic.id}`] = topicOpeners(record, topic, at);
  for (const question of record.questions) {
    if (question.status !== "suggested") {
      chats[`side:${question.id}`] = [
        sideOpener(record, question, at),
        ...(chats[`side:${question.id}`] ?? []),
      ];
    }
  }
  return { ...record, chats };
}

/** The developer's first entry: six topics from Discovery revision 12 and the AI's opening message. */
export function firstEntryRecord(now: Date): PrdRecord {
  const at = now.toISOString();
  const source = ["Discovery revision 12"];
  const record: PrdRecord = {
    ...blankRecord(),
    topics: [
      topicRecord(TOPIC.users, {
        body: [USERS_LINES[0]!, USERS_LINES[3]!],
        sources: ["Discovery revision 12", "Monday’s chat"],
      }),
      topicRecord(TOPIC.shifts, { drafted: false, body: [], sources: source }),
      topicRecord(TOPIC.notify, { drafted: false, body: [], sources: source }),
      topicRecord(TOPIC.data, { drafted: false, body: [], sources: source }),
      topicRecord(TOPIC.scope, { drafted: false, body: [], sources: source, stories: [] }),
      topicRecord(TOPIC.success, { drafted: false, body: [], sources: source }),
    ],
    chats: {
      main: [shared(aiMessage("t1", at, [updatedPart("Users and roles"), ...textParts(OPENING)]))],
    },
  };
  return withOpeners(record, at);
}

/** The canvas board's starting state, several days into the PRD. */
export function prdTodayRecord(now: Date): PrdRecord {
  const mon = (minute: number) => stamp("2026-10-05", minute);
  const tue = (minute: number) => stamp("2026-10-06", minute);
  const wed = (minute: number) => stamp("2026-10-07", minute);
  const today = (minute: number) => new Date(now.getTime() - (10 - minute) * 60_000).toISOString();
  const ask = (id: QuestionId): Part => ({ type: "data-ngo-question", data: { questionId: id } });
  const main: PrdUIMessage[] = [
    aiMessage("t1", mon(0), [
      updatedPart("Users and roles"),
      ...textParts([
        OPENING[0]!,
        `${OPENING[1]!} Discovery already answers everything Users and roles needs, so it is ready for you to confirm.`,
      ]),
    ]),
    devMessage(
      "h1",
      mon(4),
      textParts([
        "Some numbers before we start: about 60 active volunteers and 3 shift leads. Maya coordinates everything herself.",
      ]),
    ),
    aiMessage("a1", mon(5), [
      updatedPart("Users and roles"),
      ...textParts([
        "Added the numbers to Users and roles.",
        "One check: can a shift lead see only their own shift’s roster, or every shift?",
      ]),
    ]),
    devMessage(
      "h2",
      mon(8),
      textParts(["Only their own shift. They mark attendance for it and nothing else."]),
    ),
    aiMessage("a2", mon(9), [
      updatedPart("Users and roles"),
      ...textParts([
        "Recorded: shift leads see and mark attendance for their own shift only. Users and roles is ready for you to confirm.",
        "Discovery does not say how long the kitchen keeps volunteer data. Priya posted this question to Maya:",
      ]),
      ask(QUESTION.retention),
    ]),
    eventMessage("e1", mon(12), "Priya confirmed Users and roles · revision 4", null),
    devMessage(
      "t2",
      tue(0),
      textParts([
        "Reminders by email only. The coordinator also wants a warning when a Saturday is short.",
      ]),
    ),
    aiMessage("t3", tue(1), [
      updatedPart("Notifications"),
      ...textParts([
        "Notifications has every decision it needs: an email 24 hours before each shift, and a coordinator email when a Saturday shift is still short 48 hours ahead. It is ready for you to confirm.",
        "One optional detail is the kitchen’s choice. Priya posted it to Maya:",
      ]),
      ask(QUESTION.logo),
    ]),
    devMessage("h3", tue(9), textParts(["Could we add text messages later if the kitchen asks?"])),
    aiMessage(
      "a3",
      tue(10),
      textParts([
        "Yes. I noted text messages as a later option, not part of the first version. It adds a paid provider, so the kitchen would need to approve the cost first. Notifications is still ready for you to confirm.",
      ]),
    ),
    devMessage(
      "h4",
      tue(20),
      textParts([
        "What stack do you suggest? Maya’s team keeps the roster in a Google Sheet today.",
      ]),
    ),
    aiMessage("a4", tue(21), [
      updatedPart("Technical scope"),
      ...textParts([
        "I suggest a Lovable app on Supabase, with a one-time import from the Google Sheet.",
        "Keeping the sheet as the live source would make the Saturday shortage check unreliable, because anyone can edit the sheet without the app knowing. I added this as a draft to Technical scope.",
      ]),
    ]),
    devMessage("h5", tue(25), textParts(["Agreed. Import once, then the app is the only source."])),
    aiMessage("a5", tue(26), textParts(["Recorded. Technical scope is ready for you to confirm."])),
    eventMessage("e2", tue(28), "Priya confirmed Technical scope · revision 10", null),
    devMessage(
      "h6",
      wed(0),
      textParts([
        "Let’s do shifts. Saturdays have two shifts, 8:00 to 12:00 and 12:00 to 16:00, with 6 volunteers each.",
      ]),
    ),
    aiMessage("a6", wed(1), [
      updatedPart("Shift scheduling rules"),
      ...textParts([
        "Added to Shift scheduling rules: two Saturday shifts of 6 volunteers each.",
        "What about weekdays?",
      ]),
    ]),
    devMessage(
      "h7",
      wed(4),
      textParts(["Weekdays have one evening shift, 17:00 to 20:00, with 4 volunteers."]),
    ),
    aiMessage("a7", wed(5), [
      updatedPart("Shift scheduling rules"),
      ...textParts([
        "Added. That is 9 shifts and 48 volunteer slots a week.",
        "Shift scheduling rules is still a draft: the swap rule and the publishing window are open.",
        "The swap rule changes which stories Technical scope needs, so I sent Technical scope back for review. You can confirm it again once the shift rules are ready.",
      ]),
    ]),
    eventMessage(
      "e3",
      wed(6),
      "Technical scope reopened for review · it waits on Shift scheduling rules",
      null,
    ),
    devMessage("h8", wed(8), textParts(["Holidays? The kitchen closes on some public holidays."])),
    aiMessage(
      "a8",
      wed(9),
      textParts([
        "I suggest the coordinator can cancel a single shift, and the volunteers on it get an email. I added that to the draft. Tell me if the kitchen needs a full holiday calendar instead.",
      ]),
    ),
    aiMessage("t4", today(0), [
      ...textParts([
        "Two shift questions are ready for you, Priya, in the Shift scheduling rules chat.",
      ]),
      { type: "data-section-link", data: { topicId: TOPIC.shifts } },
    ]),
    aiMessage("t5", today(1), [
      ...textParts([
        "Success criteria must come from the kitchen. I suggest posting this question to Maya:",
      ]),
      ask(QUESTION.success),
    ]),
  ];
  const base: PrdRecord = {
    ...blankRecord(),
    revision: 13,
    topics: [
      topicRecord(TOPIC.users, {
        aiReady: true,
        confirmed: true,
        body: USERS_LINES,
        sources: ["Discovery revision 12", "Monday’s chat"],
      }),
      topicRecord(TOPIC.shifts, { body: [], sources: ["Wednesday’s chat", "today’s answers"] }),
      topicRecord(TOPIC.notify, {
        aiReady: true,
        body: NOTIFY_LINES,
        sources: ["Tuesday’s chat"],
      }),
      topicRecord(TOPIC.data, {
        drafted: false,
        body: [],
        sources: ["Maya’s side chat"],
      }),
      topicRecord(TOPIC.scope, {
        aiReady: true,
        review: true,
        body: [],
        sources: ["Tuesday’s chat", "today’s answers"],
      }),
      topicRecord(TOPIC.success, {
        drafted: false,
        body: [],
        sources: ["Maya’s side chat"],
      }),
    ],
    devQuestions: [
      {
        id: "swap",
        topicId: TOPIC.shifts,
        text: "Can volunteers swap a shift themselves?",
        why: "the swap rule decides which screens the stories need.",
        options: [
          "Volunteers swap with each other",
          "The coordinator approves each swap",
          "No swaps; volunteers cancel instead",
        ],
        suggested: "The coordinator approves each swap",
        answered: null,
      },
      {
        id: "publish",
        topicId: TOPIC.shifts,
        text: "How far ahead are shifts published?",
        why: "reminders and the Saturday shortage check count from this date.",
        options: ["Two weeks ahead", "One month ahead", "Every Monday for the next week"],
        suggested: "Two weeks ahead",
        answered: null,
      },
    ],
    questions: [
      questionRecord(QUESTION.retention, "a2", "posted"),
      questionRecord(QUESTION.logo, "t3", "posted"),
      questionRecord(QUESTION.success, "t5", "suggested"),
    ],
    funds: {
      allocationMicros: ALLOCATION_MICROS,
      settledMicros: 11_200_000,
      pendingMicros: 0,
      replyHoldMicros: REPLY_HOLD_MICROS,
    },
    chats: { main: main.map(shared) },
  };
  const record = { ...base, topics: rewriteSections(base) };
  return withOpeners(record, today(2));
}
