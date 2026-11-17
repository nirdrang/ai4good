import { expect } from "vitest";
import { eventually } from "../../harness/screen.ts";
import type { PrdPage } from "./_screen.ts";
import {
  AI_ASIDE,
  AI_NAME,
  CHANGED_ROW,
  CHAT_HISTORY_LINE,
  CLOSE_PRD,
  CONFIRM_SECTION,
  DEV_NOTE,
  EDITED_ANSWER,
  FINAL_WORDING,
  FOLLOW_HINT,
  IMPACT,
  NGO_SECTION,
  ONLY_PRIYA_CLOSES,
  OPEN_POINT,
  OPEN_QUESTION,
  POST_TO_MAYA,
  PUBLISH_QUESTION,
  PUBLISH_WHY,
  REMOVED_EARLIER,
  REOPEN_SECTION,
  RETENTION_ANSWER,
  RETENTION_QUESTION,
  SATURDAY_LINE,
  SEVEN_STORIES,
  SHIFTS_OPENER,
  STILL_OPEN,
  SWAP_QUESTION,
  SWAP_WHY,
  TOPIC,
  TOPIC_NOTE,
  USE_ANSWER,
  VIEW_ANSWER,
  WORDING_CHANGED,
} from "./_phrases.ts";

const TOPICS = [
  TOPIC.users,
  TOPIC.shifts,
  TOPIC.notify,
  TOPIC.data,
  TOPIC.scope,
  TOPIC.success,
] as const;

async function showChat(prd: PrdPage): Promise<void> {
  await prd.phone.tab("chat");
  if ((await prd.topics.listVisible()) && (await prd.topic.pageCount()) === 0) {
    await prd.topics.openMain();
  }
}

export async function sideChatFlow(prd: PrdPage): Promise<void> {
  const before = await prd.modelCalls();
  await prd.phone.tab("questions");
  await prd.questions.open(RETENTION_QUESTION);
  expect(await prd.side.count(), "the question list opens a side chat").toBeGreaterThan(0);
  expect(await prd.side.optionCount(), "the side chat offers suggested answers").toBeGreaterThan(0);
  await prd.side.back();
  await prd.phone.tab("chat");
  await prd.questions.answerFromChat(RETENTION_QUESTION);
  expect(await prd.side.optionCount(), "Answer it opens the same side chat").toBeGreaterThan(0);
  await prd.side.write("a year");
  await prd.side.send();
  await eventually(
    "the AI asks a follow-up",
    () => prd.side.text(),
    (text) => text.includes("a year") && /\?\s*$/.test(text.trim()),
    15_000,
  );
  expect(await prd.side.completeEnabled(), "Mark answer complete waits for the follow-up").toBe(
    false,
  );
  expect(await prd.side.hint(), "the hint names the open follow-up").toBe(FOLLOW_HINT);
  expect(
    await prd.side.optionCount(),
    "the follow-up hides the first question's suggested answers",
  ).toBe(0);
  await prd.side.expectCompleteTarget();
  await prd.side.write(AI_ASIDE);
  await prd.side.send();
  await eventually(
    "the AI answers the aside in the side chat",
    () => prd.side.text(),
    (text) => text.includes(AI_ASIDE) && text.includes(REMOVED_EARLIER),
    15_000,
  );
  await eventually(
    "any reply from Maya turns Mark answer complete on",
    () => prd.side.completeEnabled(),
    (enabled) => enabled,
    15_000,
  );
  expect(await prd.side.hintCount(), "the hint leaves with the follow-up").toBe(0);
  await prd.side.write("Yes");
  await prd.side.send();
  await eventually(
    "the follow-up reply turns Mark answer complete on",
    () => prd.side.completeEnabled(),
    (enabled) => enabled,
    15_000,
  );
  const waiting = await prd.phone.badge();
  await prd.side.complete();
  if ((await prd.phone.barCount()) > 0) {
    await prd.phone.tab("prd");
    await eventually(
      "the answer is written while Maya reads the PRD",
      () => prd.phone.badge(),
      (badge) => badge !== waiting,
      15_000,
    );
    expect(await prd.phone.current(), "a tab chosen while the answer is written stays chosen").toBe(
      "prd",
    );
    await prd.phone.tab("questions");
    await prd.side.back();
  }
  await prd.phone.tab("questions");
  await eventually(
    "the sent answer is the clean retention rule",
    () => prd.questions.sent(RETENTION_QUESTION),
    (text) => text.includes(RETENTION_ANSWER),
    15_000,
  );
  const sent = await prd.questions.sent(RETENTION_QUESTION);
  expect(sent, "the aside stays out of the answer sent to Priya").not.toContain(REMOVED_EARLIER);
  expect(sent, "the question to the AI stays out of the answer").not.toContain(AI_ASIDE);
  const added = (await prd.modelCalls()).slice(before.length);
  expect(
    added.filter((kind) => kind === "prd-answer-write"),
    "writing the answer is one paid call",
  ).toEqual(["prd-answer-write"]);
  expect(
    added.filter((kind) => kind === "prd-side-chat").length,
    "the side chat pays for its replies",
  ).toBeGreaterThanOrEqual(2);
  expect(
    added.every((kind) => kind === "prd-side-chat" || kind === "prd-answer-write"),
    "the side chat does not call the main chat or the check",
  ).toBe(true);
  const beforeLink = await prd.modelCalls();
  expect(await prd.topic.sectionCount(), "no section is open before the link").toBe(0);
  await prd.questions.openSection(RETENTION_QUESTION, TOPIC.data);
  await eventually(
    "the sent question opens its section's document",
    async () => ((await prd.topic.sectionCount()) > 0 ? prd.topic.sectionText() : ""),
    (text) => text.includes(TOPIC.data),
    15_000,
  );
  if ((await prd.phone.barCount()) > 0) {
    expect(await prd.phone.current(), "the phone shows the PRD tab").toBe("prd");
  }
  expect(await prd.topic.composerCount(), "Maya reads the section without writing").toBe(0);
  expect(await prd.modelCalls(), "opening the section adds no model call").toEqual(beforeLink);
  await prd.viewAs("dev");
  await prd.phone.tab("questions");
  expect(
    await prd.questions.viewCount(RETENTION_QUESTION),
    "Dev can view the completed answer",
  ).toBe(1);
  expect(await prd.questions.useCount(RETENTION_QUESTION), "Dev can use the completed answer").toBe(
    1,
  );
}

export async function useAnswerFlow(prd: PrdPage): Promise<void> {
  await prd.phone.tab("questions");
  await prd.questions.view(RETENTION_QUESTION);
  expect(await prd.review.text(), "the review names the PRD impact").toContain(IMPACT);
  expect(await prd.review.text(), "the review names the open point").toContain(OPEN_POINT);
  expect(await prd.review.answer(), "the answer is editable and starts as Maya's words").toContain(
    "a year",
  );
  await prd.review.editAnswer(EDITED_ANSWER);
  await prd.review.note(DEV_NOTE);
  await prd.review.use();
  await showChat(prd);
  await eventually(
    "Use answer posts Dev's brief",
    () => prd.chat.briefText(),
    (text) => text.includes(EDITED_ANSWER) && text.includes(DEV_NOTE) && text.includes(CHANGED_ROW),
    15_000,
  );
  expect(await prd.chat.briefCount(), "one use posts one brief").toBe(1);
  const brief = await prd.chat.briefText();
  expect(brief, "the brief keeps the impact").toContain(IMPACT);
  expect(brief, "the brief keeps the open point").toContain(OPEN_POINT);
  await prd.phone.tab("prd");
  await prd.topics.open(TOPIC.data);
  await eventually(
    "the note is written into Data handling",
    () => prd.topic.text(),
    (text) => text.includes(DEV_NOTE) && text.includes(EDITED_ANSWER),
    15_000,
  );
  await prd.phone.tab("questions");
  expect(
    await prd.questions.useCount(RETENTION_QUESTION),
    "the used answer cannot be used again",
  ).toBe(0);
  await prd.questions.toggleAnswered();
  await prd.questions.openAnswered(EDITED_ANSWER);
  expect(await prd.chat.briefFocused(EDITED_ANSWER), "Answered focuses that brief").toBe(true);
  expect(await prd.chat.briefCount(), "opening Answered does not post a second brief").toBe(1);
  await prd.viewAs("ngo");
  await prd.phone.tab("chat");
  const maya = await prd.chat.text();
  expect(maya, "Maya sees the final wording").toContain(EDITED_ANSWER);
  expect(maya, "Maya is told the wording changed").toContain(FINAL_WORDING);
  await prd.phone.tab("questions");
  await prd.questions.expandAnswered();
  const list = await prd.questions.text();
  expect(list, "Maya's question names who changed the wording").toContain(
    `${WORDING_CHANGED} ${EDITED_ANSWER}`,
  );
}

export async function useAnswerPlain(prd: PrdPage, waitMs = 15_000): Promise<void> {
  await prd.phone.tab("questions");
  await prd.questions.use(RETENTION_QUESTION);
  await showChat(prd);
  await eventually(
    "Use answer from the list posts the original answer",
    () => prd.chat.briefText().catch(() => ""),
    (text) => text.includes(RETENTION_ANSWER),
    waitMs,
  );
  const brief = await prd.chat.briefText();
  expect(brief, "an unedited use has no change row").not.toContain(CHANGED_ROW);
  expect(await prd.chat.briefCount(), "the list use posts one brief").toBe(1);
}

export async function topicFlow(prd: PrdPage): Promise<void> {
  const before = await prd.modelCalls();
  await prd.phone.tab("prd");
  await prd.topics.open(TOPIC.scope);
  expect(await prd.modelCalls(), "opening a topic spends nothing").toEqual(before);
  expect(await prd.topic.sectionText(), "technical scope counts the stories so far").toContain(
    SEVEN_STORIES,
  );
  expect(await prd.topic.storyCount(), "the stories are numbered on the document").toBe(7);
  await prd.topics.open(TOPIC.shifts);
  const document = await prd.topic.text();
  expect(document, "the shift document keeps the Saturday rule").toContain(SATURDAY_LINE);
  expect(document, "the document leaves the swap open").toContain(OPEN_QUESTION);
  expect(document, "the document is not the chat history").not.toContain(CHAT_HISTORY_LINE);
  expect(document, "a chat question stays out of the document").not.toContain(
    "What stack do you suggest?",
  );
  const section = await prd.topic.sectionText();
  expect(section, "the document names its source").toMatch(/Discovery|chat/i);
  const chat = await prd.topic.chatText();
  expect(chat, "the topic chat opens on the two open decisions").toContain(SHIFTS_OPENER);
  expect(
    await prd.topic.questionCount(SWAP_QUESTION),
    "both shift questions are in this chat",
  ).toBe(1);
  expect(
    await prd.topic.questionCount(PUBLISH_QUESTION),
    "the publish question is with the swap question",
  ).toBe(1);
  expect(chat, "each question says why it is asked now").toContain(SWAP_WHY);
  expect(chat, "the publish question says why it is asked now").toContain(PUBLISH_WHY);
  expect(await prd.topic.suggestedCount(SWAP_QUESTION), "one option is suggested").toBe(1);
  expect(
    await prd.topic.suggestedCount(PUBLISH_QUESTION),
    "the publish question suggests one option",
  ).toBe(1);
  await prd.topic.write(TOPIC_NOTE);
  await prd.topic.send();
  await eventually(
    "the topic chat writes the change back as a statement",
    () => prd.topic.text(),
    (text) => text.includes(TOPIC_NOTE),
    15_000,
  );
  expect(await prd.topic.chatText(), "the change also stays in the topic chat").toContain(
    TOPIC_NOTE,
  );
  await prd.topics.open(TOPIC.users);
  await prd.topics.open(TOPIC.shifts);
  expect(await prd.topic.chatText(), "the topic chat is still there after leaving").toContain(
    TOPIC_NOTE,
  );
  await prd.reload();
  await prd.phone.tab("prd");
  await prd.topics.open(TOPIC.shifts);
  expect(await prd.topic.chatText(), "the topic chat survives reload").toContain(TOPIC_NOTE);
  expect(await prd.topic.text(), "the statement survives reload").toContain(TOPIC_NOTE);
}

export async function topicReadOnly(prd: PrdPage): Promise<void> {
  await prd.phone.tab("prd");
  await prd.topics.open(TOPIC.shifts);
  expect(await prd.topic.text(), "Maya sees the same shift document").toContain(SATURDAY_LINE);
  expect(await prd.topic.composerCount(), "Maya cannot write in the topic chat").toBe(0);
  const text = `${await prd.topic.sectionText()}\n${await prd.topic.chatText()}`;
  expect(text, "Maya is pointed at Questions").toContain(NGO_SECTION);
}

export async function closeFlow(prd: PrdPage, waitMs = 15_000): Promise<void> {
  await prd.phone.tab("prd");
  expect(await prd.panel.remainingCount(), "Still open lists what is unfinished").toBeGreaterThan(
    0,
  );
  expect(await prd.panel.text(), "the panel says the PRD is still open").toContain(STILL_OPEN);
  expect(await prd.panel.closeCount(), "Close PRD is available before the check").toBe(1);
  const before = await prd.modelCalls();
  await prd.panel.close();
  await showChat(prd);
  await eventually(
    "Close PRD runs the completion check",
    async () => (await prd.modelCalls()).filter((kind) => kind === "prd-check").length,
    (checks) => checks > before.filter((kind) => kind === "prd-check").length,
    waitMs,
  );
  await eventually(
    "gaps warn with a choice",
    () => prd.chat.warningCount(),
    (count) => count > 0,
    waitMs,
  );
  await prd.chat.keepWorking();
  expect(await prd.banner.count(), "Keep working leaves the PRD open").toBe(0);
  await prd.phone.tab("prd");
  await prd.panel.close();
  await showChat(prd);
  await eventually(
    "the second close warns again",
    () => prd.chat.warningCount(),
    (count) => count > 0,
    waitMs,
  );
  await prd.chat.closeAnyway();
  await eventually(
    "Close anyway records the open points",
    () => prd.banner.text(),
    (text) =>
      /PRD closed at revision \d+ with \d+ open points/.test(text) && text.includes("UI Design"),
    waitMs,
  );
  expect(await prd.composer.count(), "the closed PRD has no composer").toBe(0);
}

export async function closePassedFlow(prd: PrdPage, waitMs = 15_000): Promise<void> {
  await showChat(prd);
  expect(await prd.chat.recommendationCloseCount(), "a passing check offers Close PRD inline").toBe(
    1,
  );
  const before = await prd.modelCalls();
  await prd.phone.tab("prd");
  await prd.panel.close();
  await eventually(
    "a passing check closes at once",
    () => prd.banner.text(),
    (text) => /PRD closed at revision \d+/.test(text),
    waitMs,
  );
  expect(await prd.modelCalls(), "closing after a passing check spends nothing").toEqual(before);
  expect(await prd.composer.count(), "the closed PRD has no composer").toBe(0);
}

export async function ngoCannotClose(prd: PrdPage): Promise<void> {
  await prd.phone.tab("prd");
  expect(await prd.buttonCount(CLOSE_PRD), "Maya has no Close PRD").toBe(0);
  expect(await prd.panel.text(), "Maya is told only Priya can close").toContain(ONLY_PRIYA_CLOSES);
  expect(await prd.buttonCount(CONFIRM_SECTION), "Maya cannot confirm a section").toBe(0);
  expect(await prd.buttonCount(REOPEN_SECTION), "Maya cannot reopen a section").toBe(0);
  expect(await prd.buttonCount(POST_TO_MAYA), "Maya cannot post a question").toBe(0);
  expect(await prd.buttonCount(VIEW_ANSWER), "Maya does not use an answer").toBe(0);
  expect(await prd.buttonCount(USE_ANSWER), "Maya does not claim an answer").toBe(0);
  expect(await prd.composer.count(), "Maya has no main composer").toBe(0);
}

export async function confirmReadyTopics(prd: PrdPage): Promise<boolean[]> {
  const chatShown: boolean[] = [];
  for (const title of TOPICS) {
    await prd.phone.tab("prd");
    await prd.topics.open(title);
    if ((await prd.topic.confirmCount()) === 0) continue;
    await prd.topic.confirm();
    const landed = await eventually(
      `the confirmation of ${title} lands`,
      async () => ({ chat: await prd.chat.shown(), reopen: await prd.topic.reopenCount() }),
      (state) => state.chat || state.reopen > 0,
      15_000,
    );
    chatShown.push(landed.chat);
  }
  await showChat(prd);
  return chatShown;
}

export const LIVE_WAIT_MS = 180_000;

async function aiReply(prd: PrdPage, marker: string, namesBefore: number): Promise<void> {
  await eventually(
    "a reply arrives and is attributed to the AI",
    () => prd.side.text(),
    (text) => text.includes(marker) && text.split(AI_NAME).length - 1 > namesBefore,
    LIVE_WAIT_MS,
  );
}

async function sideSettled(prd: PrdPage): Promise<boolean> {
  const settled = await eventually(
    "the side chat turn ends with Mark answer complete on or a follow-up hint",
    async () => ({ complete: await prd.side.completeEnabled(), hint: await prd.side.hintCount() }),
    (state) => state.complete || state.hint > 0,
    LIVE_WAIT_MS,
  );
  return settled.complete;
}

export async function sideChatFlowLive(prd: PrdPage): Promise<void> {
  const before = await prd.modelCalls();
  await prd.phone.tab("questions");
  await prd.questions.open(RETENTION_QUESTION);
  expect(await prd.side.count(), "the question list opens a side chat").toBeGreaterThan(0);
  expect(await prd.side.optionCount(), "the side chat offers suggested answers").toBeGreaterThan(0);
  await prd.side.back();
  await prd.phone.tab("chat");
  await prd.questions.answerFromChat(RETENTION_QUESTION);
  expect(await prd.side.optionCount(), "Answer it opens the same side chat").toBeGreaterThan(0);
  await prd.side.expectCompleteTarget();
  let namesBefore = (await prd.side.text()).split(AI_NAME).length - 1;
  await prd.side.write("a year");
  await prd.side.send();
  await aiReply(prd, "a year", namesBefore);
  let replies = 1;
  while (!(await sideSettled(prd)) && replies < 4) {
    namesBefore = (await prd.side.text()).split(AI_NAME).length - 1;
    const marker = "Keep contact details for 12 months after the volunteer's last shift, then delete them.";
    await prd.side.write(marker);
    await prd.side.send();
    replies += 1;
    await aiReply(prd, marker, namesBefore);
  }
  expect(await prd.side.completeEnabled(), "any reply from Maya turns Mark answer complete on").toBe(
    true,
  );
  const waiting = await prd.phone.badge();
  await prd.side.complete();
  if ((await prd.phone.barCount()) > 0) {
    await prd.phone.tab("prd");
    await eventually(
      "the answer is written while Maya reads the PRD",
      () => prd.phone.badge(),
      (badge) => badge !== waiting,
      LIVE_WAIT_MS,
    );
    expect(await prd.phone.current(), "a tab chosen while the answer is written stays chosen").toBe(
      "prd",
    );
    await prd.phone.tab("questions");
    await prd.side.back();
  }
  await prd.phone.tab("questions");
  await eventually(
    "the written answer shows in the Questions list",
    () => prd.questions.sent(RETENTION_QUESTION).catch(() => ""),
    (text) => text.trim().length > 0,
    LIVE_WAIT_MS,
  );
  await eventually(
    "the side chat pays for a reply and one answer write",
    async () => {
      const added = (await prd.modelCalls()).slice(before.length);
      return (
        added.filter((kind) => kind === "prd-answer-write").length === 1 &&
        added.filter((kind) => kind === "prd-side-chat").length >= 1 &&
        added.every((kind) => kind === "prd-side-chat" || kind === "prd-answer-write")
      );
    },
    (paid) => paid,
    LIVE_WAIT_MS,
  );
  const beforeLink = await prd.modelCalls();
  expect(await prd.topic.sectionCount(), "no section is open before the link").toBe(0);
  await prd.questions.openSection(RETENTION_QUESTION, TOPIC.data);
  await eventually(
    "the sent question opens its section's document",
    async () => ((await prd.topic.sectionCount()) > 0 ? prd.topic.sectionText() : ""),
    (text) => text.includes(TOPIC.data),
    LIVE_WAIT_MS,
  );
  if ((await prd.phone.barCount()) > 0) {
    expect(await prd.phone.current(), "the phone shows the PRD tab").toBe("prd");
  }
  expect(await prd.topic.composerCount(), "Maya reads the section without writing").toBe(0);
  expect(await prd.modelCalls(), "opening the section adds no model call").toEqual(beforeLink);
  await prd.viewAs("dev");
  await prd.phone.tab("questions");
  expect(await prd.questions.viewCount(RETENTION_QUESTION), "Dev can view the completed answer").toBe(
    1,
  );
  expect(await prd.questions.useCount(RETENTION_QUESTION), "Dev can use the completed answer").toBe(
    1,
  );
}

export async function useAnswerFlowLive(prd: PrdPage): Promise<void> {
  await prd.phone.tab("prd");
  await prd.topics.open(TOPIC.data);
  const beforeDoc = await prd.topic.text();
  await prd.phone.tab("questions");
  await prd.questions.view(RETENTION_QUESTION);
  expect(await prd.review.answer(), "the answer is editable and starts as Maya's words").toContain(
    "a year",
  );
  await prd.review.editAnswer(EDITED_ANSWER);
  await prd.review.note(DEV_NOTE);
  await prd.review.use();
  await showChat(prd);
  await eventually(
    "Use answer posts Dev's brief",
    async () => ((await prd.chat.briefCount()) > 0 ? prd.chat.briefText() : ""),
    (text) => text.includes(EDITED_ANSWER) && text.includes(DEV_NOTE) && text.includes(CHANGED_ROW),
    LIVE_WAIT_MS,
  );
  expect(await prd.chat.briefCount(), "one use posts one brief").toBe(1);
  await prd.phone.tab("prd");
  await prd.topics.open(TOPIC.data);
  await eventually(
    "the topic document changes after the answer is used",
    () => prd.topic.text(),
    (text) => text !== beforeDoc,
    LIVE_WAIT_MS,
  );
  await prd.phone.tab("questions");
  expect(await prd.questions.useCount(RETENTION_QUESTION), "the used answer cannot be used again").toBe(
    0,
  );
  await prd.questions.toggleAnswered();
  await prd.questions.openAnswered(RETENTION_ANSWER);
  const brief = await eventually(
    "opening Answered shows Dev's brief",
    () => prd.chat.briefText().catch(() => ""),
    (text) => text !== "",
    15_000,
  );
  expect(await prd.chat.briefCount(), "opening Answered does not post a second brief").toBe(1);
  expect(brief.match(new RegExp(CHANGED_ROW, "g"))?.length ?? 0, "the brief names the change once").toBe(
    1,
  );
  expect(brief, "the brief keeps the edited answer and the note").toContain(EDITED_ANSWER);
  expect(brief, "the brief keeps Dev's note").toContain(DEV_NOTE);
  await prd.viewAs("ngo");
  await prd.phone.tab("chat");
  const maya = await prd.chat.text();
  expect(maya, "Maya sees the edited answer").toContain(EDITED_ANSWER);
  expect(maya, "Maya sees that the wording changed").toContain(CHANGED_ROW);
  await prd.phone.tab("questions");
  await prd.questions.expandAnswered();
  expect(await prd.questions.text(), "Maya's list keeps the answer she sent").toContain(
    RETENTION_ANSWER,
  );
}

export async function topicFlowLive(prd: PrdPage): Promise<void> {
  const before = await prd.modelCalls();
  await prd.phone.tab("prd");
  await prd.topics.open(TOPIC.scope);
  expect(await prd.modelCalls(), "opening a topic spends nothing").toEqual(before);
  expect(await prd.topic.sectionText(), "technical scope counts the stories so far").toContain(
    SEVEN_STORIES,
  );
  expect(await prd.topic.storyCount(), "the stories are numbered on the document").toBe(7);
  await prd.topics.open(TOPIC.shifts);
  const document = await prd.topic.text();
  expect(document, "the shift document keeps the Saturday rule").toContain(SATURDAY_LINE);
  expect(document, "the document leaves the swap open").toContain(OPEN_QUESTION);
  expect(document, "the document is not the chat history").not.toContain(CHAT_HISTORY_LINE);
  expect(document, "a chat question stays out of the document").not.toContain(
    "What stack do you suggest?",
  );
  const section = await prd.topic.sectionText();
  expect(section, "the document names its source").toMatch(/Discovery|chat/i);
  const chat = await prd.topic.chatText();
  expect(chat, "the topic chat opens on the two open decisions").toContain(SHIFTS_OPENER);
  expect(await prd.topic.questionCount(SWAP_QUESTION), "both shift questions are in this chat").toBe(
    1,
  );
  expect(
    await prd.topic.questionCount(PUBLISH_QUESTION),
    "the publish question is with the swap question",
  ).toBe(1);
  expect(chat, "each question says why it is asked now").toContain(SWAP_WHY);
  expect(chat, "the publish question says why it is asked now").toContain(PUBLISH_WHY);
  expect(await prd.topic.suggestedCount(SWAP_QUESTION), "one option is suggested").toBe(1);
  expect(
    await prd.topic.suggestedCount(PUBLISH_QUESTION),
    "the publish question suggests one option",
  ).toBe(1);
  const beforeDoc = await prd.topic.text();
  await prd.topic.write(TOPIC_NOTE);
  await prd.topic.send();
  await eventually(
    "the topic chat keeps the note",
    () => prd.topic.chatText(),
    (text) => text.includes(TOPIC_NOTE),
    LIVE_WAIT_MS,
  );
  await eventually(
    "the topic document changes after the note",
    () => prd.topic.text(),
    (text) => text !== beforeDoc,
    LIVE_WAIT_MS,
  );
  await eventually(
    "the topic send is one paid chat call",
    async () => (await prd.modelCalls()).slice(before.length),
    (added) => added.filter((kind) => kind === "prd-chat").length >= 1,
    LIVE_WAIT_MS,
  );
  await prd.topics.open(TOPIC.users);
  await prd.topics.open(TOPIC.shifts);
  expect(await prd.topic.chatText(), "the topic chat is still there after leaving").toContain(
    TOPIC_NOTE,
  );
  await prd.reload();
  await prd.phone.tab("prd");
  await prd.topics.open(TOPIC.shifts);
  expect(await prd.topic.chatText(), "the topic chat survives reload").toContain(TOPIC_NOTE);
  expect(await prd.topic.text(), "the changed document survives reload").not.toBe(beforeDoc);
}

export async function topicReadOnlyLive(prd: PrdPage): Promise<void> {
  await prd.phone.tab("prd");
  await prd.topics.open(TOPIC.shifts);
  expect(await prd.topic.text(), "Maya sees the same shift document").toContain(SATURDAY_LINE);
  expect(await prd.topic.composerCount(), "Maya cannot write in the topic chat").toBe(0);
  expect(await prd.banner.readOnlyText(), "Maya can read along").toContain("You can read along");
}
