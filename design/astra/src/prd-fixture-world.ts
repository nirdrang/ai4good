import {
  scopeKey,
  type Action,
  type ActionKind,
  type ChatScope,
  type PrdMessageMeta,
  type PrdSendBody,
  type PrdSnapshot,
  type PrdUIMessage,
  type QuestionId,
  type Result,
  type Role,
  type TopicId,
  type TurnId,
  type Viewer,
} from "../../../src/lib/prd-stream";
import {
  CLOSE_TARGET,
  FUNDS_REASON,
  allRequiredConfirmed,
  askTarget,
  briefRows,
  canAffordReply,
  checkPassedForRevision,
  closeBlock,
  closeRemaining,
  confirmBlock,
  firstName,
  holdReply,
  issueToken,
  markDependents,
  openPointCount,
  questionTarget,
  refusal,
  releaseHolds,
  sendRefusal,
  settleReply,
  spend,
  topicState,
  topicTarget,
  toSnapshot,
  verifyAction,
  type PrdRecord,
  type QuestionRecord,
  type TopicRecord,
} from "../../../src/lib/prd-rules";
import {
  GAP_FIXES,
  QUESTION,
  REPLY_COST_MICROS,
  TOPIC,
  aiMessage,
  answersReply,
  checkHead,
  checkStartLine,
  clean,
  closeCheckLines,
  closeCheckStart,
  confirmCheckLines,
  devMessage,
  eventMessage,
  finalWordingLine,
  firstEntryRecord,
  gapFixReply,
  mainReplyLines,
  ngoMessage,
  prdTodayRecord,
  refreshOpeners,
  rewriteSections,
  scoreGaps,
  settleLines,
  shared,
  sideOpener,
  sideReply,
  textParts,
  topicNoteReply,
  updatedPart,
  answerUsedLines,
  writeAnswer,
  THRESHOLD,
} from "./prd-fixture-data";
import { MODEL_CALL_PROBE } from "./givens";
import {
  PRD_GIVEN,
  PRD_SCENARIOS,
  type PrdModelCall,
  type PrdPace,
  type PrdScenario,
} from "./prd-givens";

type Part = PrdUIMessage["parts"][number];
type KeyValueStore = Pick<Storage, "getItem" | "setItem" | "removeItem">;

type Later = { call: PrdModelCall; finish: (record: PrdRecord, at: string) => PrdRecord };

type Begun =
  | { kind: "replay"; message: PrdUIMessage }
  | {
      kind: "started";
      record: PrdRecord;
      call: PrdModelCall;
      aiId: string;
      finish: (record: PrdRecord, at: string) => { record: PrdRecord; message: PrdUIMessage };
    };

function topicOf(record: PrdRecord, id: TopicId): TopicRecord {
  const topic = record.topics.find((item) => item.id === id);
  if (!topic) throw new Error(`no topic ${id}`);
  return topic;
}

function questionOf(record: PrdRecord, id: QuestionId): QuestionRecord | undefined {
  return record.questions.find((item) => item.id === id);
}

function chat(record: PrdRecord, key: string) {
  record.chats[key] ??= [];
  return record.chats[key];
}

function closeAskPart(record: PrdRecord, checkId: string): Part {
  const target = askTarget(checkId);
  return {
    type: "data-close-ask",
    data: {
      checkId,
      revision: record.revision,
      closeAnyway: { kind: "close-anyway", token: issueToken(record, "close-anyway", target) },
      keepWorking: { kind: "keep-working", token: issueToken(record, "keep-working", target) },
    },
  };
}

function runCheck(record: PrdRecord): { gaps: number; checkId: string } {
  const gaps = scoreGaps(record);
  const ids = new Set(gaps.map((gap) => gap.topicId));
  record.topics = record.topics.map((topic) => {
    const gap = gaps.find((item) => item.topicId === topic.id);
    return gap ? { ...topic, gap: gap.text, confirmed: false, review: true } : topic;
  });
  record.checkRuns += 1;
  const checkId = `check-${record.checkRuns}`;
  record.check = {
    id: checkId,
    revision: record.revision,
    passed: gaps.length === 0,
    coverageText: gaps.length > 0 ? "84%" : "91%",
    thresholdText: THRESHOLD,
    gaps: record.topics
      .filter((topic) => ids.has(topic.id))
      .map((topic) => ({
        topicId: topic.id,
        title: topic.title,
        text: topic.gap ?? "",
        fixed: false,
      })),
  };
  return { gaps: gaps.length, checkId };
}

function checkPart(record: PrdRecord, checkId: string): Part {
  return {
    type: "data-check",
    data: { checkId, gaps: (record.check?.gaps ?? []).map((gap) => ({ ...gap })) },
  };
}

function confirmCheckFinish(record: PrdRecord, at: string, id: string): PrdRecord {
  const next = structuredClone(record);
  delete next.busy.main;
  if (next.closed !== null) return { ...next, funds: settleReply(next.funds, 0) };
  const total = next.topics.filter((topic) => topic.required).length;
  const { gaps, checkId } = runCheck(next);
  const parts: Part[] = [
    ...textParts([checkHead(next.revision, gaps, false), ...confirmCheckLines(total, gaps)]),
    gaps > 0
      ? checkPart(next, checkId)
      : {
          type: "data-recommendation",
          data: {
            revision: next.revision,
            close: { kind: "close", token: issueToken(next, "close", CLOSE_TARGET) },
          },
        },
  ];
  chat(next, "main").push(shared(aiMessage(id, at, parts)));
  next.funds = settleReply(next.funds, REPLY_COST_MICROS);
  return next;
}

function revise(record: PrdRecord, changed: readonly TopicId[]): void {
  record.revision += 1;
  record.topics = markDependents(record.topics, changed);
}

/** Validates a chat send and records its start: the person's message, the held funds, and the busy chat. */
export function startSend(
  record: PrdRecord,
  role: Role,
  body: PrdSendBody,
  clientMessageId: string | null,
  at: string,
): Result<Begun> {
  const key = scopeKey(body.scope);
  const prior = record.requests[body.requestId];
  if (prior) {
    if (prior.chat !== key) return refusal("invalid", "This request belongs to another chat.");
    const reply = (record.chats[key] ?? []).find((stored) => stored.message.id === prior.reply);
    if (!reply) return refusal("busy", "This message is still being answered.");
    return { ok: true, value: { kind: "replay", message: structuredClone(reply.message) } };
  }
  const blocked = sendRefusal(record, role, key);
  if (blocked && (blocked.kind === "closed" || blocked.kind === "forbidden")) {
    return { ok: false, refusal: blocked };
  }
  const intent = body.intent;
  const dev = firstName(record, "dev");
  const ngo = firstName(record, "ngo");
  const humanId = clientMessageId ?? `${body.requestId}-you`;
  let human: PrdUIMessage;
  if (intent.kind === "text") {
    if (intent.text.trim().length === 0) return refusal("invalid", "Write a message first.");
    human =
      role === "dev"
        ? devMessage(humanId, at, textParts([intent.text]))
        : ngoMessage(humanId, at, intent.text);
  } else if (intent.kind === "answers") {
    if (body.scope.kind !== "topic") return refusal("invalid", "Answers belong in a section chat.");
    const topicId = body.scope.topicId;
    const asked = record.devQuestions.filter(
      (question) => question.topicId === topicId && question.answered === null,
    );
    if (asked.length === 0 || asked.some((question) => !intent.picks[question.id])) {
      return refusal("invalid", "Pick an answer for each question first.");
    }
    const lines = asked.map(
      (question) => `${question.text.replace(/\?$/, "")}: ${intent.picks[question.id]}`,
    );
    if (intent.text.trim()) lines.push(intent.text.trim());
    human = devMessage(humanId, at, textParts(lines));
  } else if (intent.kind === "use-answer") {
    if (body.scope.kind !== "main")
      return refusal("invalid", "An answer is used in the main chat.");
    const question = questionOf(record, intent.questionId);
    if (!question || question.status === "used")
      return refusal("stale", "This answer was already used.");
    if (question.status !== "complete")
      return refusal("invalid", `${ngo} has not completed this answer.`);
    if (question.using) return refusal("busy", "This answer is already being used.");
    if (body.baseRevision !== record.revision)
      return refusal("stale", "The PRD changed. Review the answer again.");
    const answer = intent.answer?.trim() || question.answer || "";
    const ngoMessages = (record.chats[`side:${question.id}`] ?? []).filter(
      (stored) => stored.message.metadata?.actor === "ngo",
    ).length;
    human = devMessage(humanId, at, [
      ...textParts([
        `I’m using ${ngo}’s answer for ${topicOf(record, question.topicId).title}. Brief:`,
      ]),
      {
        type: "data-brief",
        data: {
          questionId: question.id,
          rows: briefRows(record, question, { answer, note: intent.note.trim(), ngoMessages }),
        },
      },
    ]);
  } else {
    if (body.scope.kind !== "main")
      return refusal("invalid", "The completion check runs in the main chat.");
    if (body.baseRevision !== record.revision)
      return refusal("stale", "The PRD changed. Close again.");
    human = eventMessage(
      `${body.requestId}-event`,
      at,
      `${dev} pressed Close PRD · revision ${record.revision}`,
      null,
    );
  }
  if (blocked) return { ok: false, refusal: blocked };

  const next = structuredClone(record);
  chat(next, key).push(shared(human));
  next.requests[body.requestId] = { chat: key, reply: null };
  next.busy[key] = body.requestId;
  next.funds = holdReply(next.funds);
  if (body.scope.kind === "side") {
    const question = questionOf(next, body.scope.questionId);
    if (question && question.status === "posted") question.status = "answering";
  }
  if (intent.kind === "use-answer") {
    const question = questionOf(next, intent.questionId);
    if (question) question.using = true;
  }
  const aiId = `${body.requestId}-ai`;
  const call: PrdModelCall =
    body.scope.kind === "side"
      ? "prd-side-chat"
      : intent.kind === "close-check"
        ? "prd-check"
        : "prd-chat";
  return {
    ok: true,
    value: {
      kind: "started",
      record: next,
      call,
      aiId,
      finish: (current, finishedAt) => finishSend(current, body, human.id, aiId, finishedAt),
    },
  };
}

function finishSend(
  record: PrdRecord,
  body: PrdSendBody,
  humanId: string,
  aiId: string,
  at: string,
): { record: PrdRecord; message: PrdUIMessage } {
  const next = structuredClone(record);
  const key = scopeKey(body.scope);
  const intent = body.intent;
  if (next.closed !== null) {
    next.requests[body.requestId] = { chat: key, reply: aiId };
    delete next.busy[key];
    next.funds = settleReply(next.funds, 0);
    return { record: next, message: aiMessage(aiId, at, []) };
  }
  const event = (text: string, topicId: TopicId) =>
    chat(next, "main").push(shared(eventMessage(`${body.requestId}-event`, at, text, topicId)));
  let parts: Part[];
  if (body.scope.kind === "side") {
    const question = questionOf(next, body.scope.questionId);
    const text = intent.kind === "text" ? intent.text : "";
    if (question) {
      const reply = sideReply(next, question, text);
      question.evidence = reply.evidence;
      question.followUp = reply.followUp;
      parts = textParts([reply.text]);
    } else {
      parts = textParts(["Noted."]);
    }
  } else if (body.scope.kind === "topic") {
    const topic = topicOf(next, body.scope.topicId);
    if (intent.kind === "answers") {
      for (const question of next.devQuestions) {
        const pick = intent.picks[question.id];
        if (question.topicId === topic.id && question.answered === null && pick)
          question.answered = pick;
      }
      const done = next.devQuestions
        .filter((question) => question.topicId === TOPIC.shifts)
        .every((question) => question.answered !== null);
      if (done) {
        next.topics = next.topics.map((item) =>
          item.id === TOPIC.shifts || item.id === TOPIC.scope
            ? { ...item, drafted: true, aiReady: true }
            : item,
        );
      }
      next.topics = rewriteSections(next);
      parts = textParts(answersReply(next));
      revise(next, [TOPIC.shifts, TOPIC.scope]);
      event("Shift scheduling rules and Technical scope updated in its section chat", TOPIC.shifts);
    } else {
      const text = intent.kind === "text" ? intent.text : "";
      if (topic.gap !== null) {
        parts = textParts(gapFixReply(topic, text));
        next.topics = next.topics.map((item) =>
          item.id === topic.id ? { ...item, gap: null, added: [...item.added, clean(text)] } : item,
        );
        if (next.check) {
          next.check.gaps = next.check.gaps.map((gap) =>
            gap.topicId === topic.id ? { ...gap, fixed: true } : gap,
          );
        }
        revise(next, []);
        event(`${topic.title} updated in its section chat · completion check gap closed`, topic.id);
      } else {
        parts = textParts([topicNoteReply(topic)]);
        next.topics = next.topics.map((item) =>
          item.id === topic.id
            ? { ...item, drafted: true, added: [...item.added, clean(text)] }
            : item,
        );
        revise(next, [topic.id]);
        event(`${topic.title} updated in its section chat`, topic.id);
      }
    }
  } else if (intent.kind === "use-answer") {
    const question = questionOf(next, intent.questionId);
    if (!question) throw new Error(`no question ${intent.questionId}`);
    const original = question.answer ?? "";
    const answer = intent.answer?.trim() || original;
    const note = intent.note.trim();
    const changed = answer !== original;
    const title = topicOf(next, question.topicId).title;
    parts = [
      updatedPart(title),
      ...textParts(answerUsedLines(next, question, { answer, changed, note })),
    ];
    question.status = "used";
    question.using = false;
    question.answer = answer;
    question.changed = changed;
    question.briefTurn = humanId as TurnId;
    question.pointOpen = question.openPoint !== null && note.length === 0;
    next.topics = next.topics.map((topic) =>
      topic.id !== question.topicId
        ? topic
        : {
            ...topic,
            added: note ? [...topic.added, clean(note)] : topic.added,
            aiReady: question.blocking ? !question.pointOpen : topic.aiReady,
          },
    );
    next.topics = rewriteSections(next);
    if (changed) {
      chat(next, `side:${question.id}`).push(
        shared(
          aiMessage(`${body.requestId}-wording`, at, textParts([finalWordingLine(next, answer)])),
        ),
      );
    }
    revise(next, [question.topicId]);
  } else if (intent.kind === "close-check") {
    const { gaps, checkId } = runCheck(next);
    const unconfirmed = next.topics
      .filter((topic) => topic.required && topic.gap === null && topicState(topic) !== "confirmed")
      .map((topic) => topic.title);
    const lines = closeCheckLines(next.revision, gaps, unconfirmed);
    parts = textParts([closeCheckStart(next.revision), ...lines.before]);
    if (gaps === 0 && unconfirmed.length === 0) {
      next.closed = { revision: next.revision, openPoints: 0 };
    } else {
      if (gaps > 0) parts.push(checkPart(next, checkId));
      parts.push(...textParts(lines.after), closeAskPart(next, checkId));
    }
  } else {
    const text = intent.kind === "text" ? intent.text : "";
    const point = next.questions.find(
      (question) => question.status === "used" && question.pointOpen,
    );
    if (point) {
      const title = topicOf(next, point.topicId).title;
      parts = [updatedPart(title), ...textParts(settleLines(title, text))];
      point.pointOpen = false;
      next.topics = next.topics.map((topic) =>
        topic.id === point.topicId
          ? { ...topic, aiReady: true, added: [...topic.added, clean(text)] }
          : topic,
      );
      revise(next, [point.topicId]);
    } else {
      parts = textParts(mainReplyLines(next, text, closeRemaining(next)));
    }
  }
  const message = aiMessage(aiId, at, parts);
  chat(next, key).push(shared(message));
  next.requests[body.requestId] = { chat: key, reply: aiId };
  delete next.busy[key];
  next.funds = settleReply(next.funds, REPLY_COST_MICROS);
  return { record: next, message };
}

/** Validates an action and applies it. A paid follow-on, such as the completion check, comes back as `later`. */
export function applyAction(
  record: PrdRecord,
  role: Role,
  action: Action<ActionKind>,
  at: string,
): Result<{ record: PrdRecord; later: Later | null }> {
  const verified = verifyAction(record, role, action);
  if (!verified.ok) return verified;
  const target = verified.value.target;
  const next = structuredClone(record);
  const dev = firstName(next, "dev");
  const stale = refusal("stale", "This action is out of date.");
  const id = `act-${next.sequence}-${chat(next, "main").length}`;
  switch (action.kind) {
    case "post-question": {
      const question = next.questions.find((item) => questionTarget(item.id) === target);
      if (!question || question.status !== "suggested") return stale;
      question.status = "posted";
      chat(next, `side:${question.id}`).unshift(sideOpener(next, question, at));
      next.versions = spend(next.versions, target);
      return { ok: true, value: { record: next, later: null } };
    }
    case "confirm-topic": {
      const topic = next.topics.find((item) => topicTarget(item.id) === target);
      if (!topic) return stale;
      const block = confirmBlock(next, topic);
      if (block) return refusal(block.kind, block.reason);
      next.topics = next.topics.map((item) =>
        item.id === topic.id ? { ...item, confirmed: true, review: false } : item,
      );
      next.versions = spend(next.versions, target);
      chat(next, "main").push(
        shared(
          eventMessage(id, at, `${dev} confirmed ${topic.title} · revision ${next.revision}`, null),
        ),
      );
      if (!allRequiredConfirmed(next) || checkPassedForRevision(next)) {
        return { ok: true, value: { record: next, later: null } };
      }
      const total = next.topics.filter((item) => item.required).length;
      chat(next, "main").push(
        shared(aiMessage(`${id}-check`, at, textParts([checkStartLine(total)]))),
      );
      next.busy.main = id;
      next.funds = holdReply(next.funds);
      return {
        ok: true,
        value: {
          record: next,
          later: {
            call: "prd-check",
            finish: (current, finishedAt) =>
              confirmCheckFinish(current, finishedAt, `${id}-result`),
          },
        },
      };
    }
    case "reopen-topic": {
      const topic = next.topics.find((item) => topicTarget(item.id) === target);
      if (!topic || !topic.confirmed) return stale;
      next.topics = next.topics.map((item) =>
        item.id === topic.id ? { ...item, confirmed: false, review: true } : item,
      );
      next.versions = spend(next.versions, target);
      next.revision += 1;
      chat(next, "main").push(
        shared(eventMessage(id, at, `${dev} reopened ${topic.title} for review`, null)),
      );
      return { ok: true, value: { record: next, later: null } };
    }
    case "close": {
      const busy = closeBlock(next);
      if (busy) return { ok: false, refusal: busy };
      if (!checkPassedForRevision(next)) {
        return refusal("invalid", "Close PRD runs the completion check first.");
      }
      next.closed = { revision: next.revision, openPoints: 0 };
      next.versions = spend(next.versions, target);
      return { ok: true, value: { record: next, later: null } };
    }
    case "close-anyway":
    case "keep-working": {
      if (!next.check || target !== askTarget(next.check.id)) return stale;
      const busy = action.kind === "close-anyway" ? closeBlock(next) : null;
      if (busy) return { ok: false, refusal: busy };
      next.versions = spend(next.versions, target);
      if (action.kind === "close-anyway") {
        next.closed = { revision: next.revision, openPoints: openPointCount(next) };
      }
      return { ok: true, value: { record: next, later: null } };
    }
    case "complete-answer": {
      const question = next.questions.find((item) => questionTarget(item.id) === target);
      if (!question || question.status !== "answering") return stale;
      if (next.busy[`side:${question.id}`]) return refusal("busy", "The AI is still answering.");
      if (question.followUp === "pending")
        return refusal("follow-up-open", "Answer the AI’s question first.");
      if (question.evidence.length === 0) return refusal("invalid", "Write your answer first.");
      if (!canAffordReply(next.funds)) return refusal("funds", FUNDS_REASON);
      const key = `side:${question.id}`;
      next.versions = spend(next.versions, target);
      next.busy[key] = id;
      next.funds = holdReply(next.funds);
      return {
        ok: true,
        value: {
          record: next,
          later: {
            call: "prd-answer-write",
            finish: (current) => {
              const done = structuredClone(current);
              const written = done.questions.find((item) => item.id === question.id);
              if (done.closed !== null) {
                delete done.busy[key];
                done.funds = settleReply(done.funds, 0);
                return done;
              }
              if (written) {
                written.answer = writeAnswer(written);
                written.status = "complete";
                done.topics = rewriteSections(done);
              }
              delete done.busy[key];
              done.funds = settleReply(done.funds, REPLY_COST_MICROS);
              return done;
            },
          },
        },
      };
    }
  }
}

class Seed {
  private count = 0;

  constructor(
    public record: PrdRecord,
    private readonly at: string,
  ) {}

  send(role: Role, scope: ChatScope, intent: PrdSendBody["intent"]): this {
    this.count += 1;
    const body: PrdSendBody = {
      scope,
      requestId: `seed-${this.count}` as PrdSendBody["requestId"],
      baseRevision: this.record.revision,
      intent,
    };
    const begun = startSend(this.record, role, body, null, this.at);
    if (!begun.ok) throw new Error(`seed send refused: ${begun.refusal.reason}`);
    if (begun.value.kind !== "started") throw new Error("seed send replayed");
    this.record = begun.value.finish(begun.value.record, this.at).record;
    return this;
  }

  act(role: Role, kind: ActionKind, target: string): this {
    const action = { kind, token: issueToken(this.record, kind, target) };
    const done = applyAction(this.record, role, action, this.at);
    if (!done.ok) throw new Error(`seed ${kind} refused: ${done.refusal.reason}`);
    this.record = done.value.later
      ? done.value.later.finish(done.value.record, this.at)
      : done.value.record;
    return this;
  }

  answer(id: QuestionId, replies: readonly string[]): this {
    for (const text of replies)
      this.send("ngo", { kind: "side", questionId: id }, { kind: "text", text });
    return this.act("ngo", "complete-answer", questionTarget(id));
  }

  use(id: QuestionId, note: string): this {
    return this.send(
      "dev",
      { kind: "main" },
      { kind: "use-answer", questionId: id, answer: null, note },
    );
  }

  topic(id: TopicId, text: string): this {
    return this.send("dev", { kind: "topic", topicId: id }, { kind: "text", text });
  }

  confirmAll(): this {
    for (const topic of this.record.topics) {
      const state = topicState(topicOf(this.record, topic.id));
      if (state === "ready" || state === "needs-review")
        this.act("dev", "confirm-topic", topicTarget(topic.id));
    }
    return this;
  }
}

function settled(record: PrdRecord, micros: number): PrdRecord {
  return { ...record, funds: { ...record.funds, settledMicros: micros } };
}

function allReady(now: Date): Seed {
  const seed = new Seed(prdTodayRecord(now), now.toISOString())
    .send(
      "dev",
      { kind: "topic", topicId: TOPIC.shifts },
      {
        kind: "answers",
        picks: { swap: "The coordinator approves each swap", publish: "Two weeks ahead" },
        text: "",
      },
    )
    .answer(QUESTION.retention, ["a year", "Yes"])
    .use(QUESTION.retention, "the export follows the same rule")
    .act("dev", "post-question", questionTarget(QUESTION.success))
    .answer(QUESTION.success, ["Both of these", "In the app each week"])
    .use(QUESTION.success, "Use the weekly count in the app.")
    .answer(QUESTION.logo, ["Yes, show the logo", "Yes"])
    .use(QUESTION.logo, "");
  seed.record.topics = seed.record.topics.map((topic) =>
    topic.id === TOPIC.scope ? { ...topic, review: false } : topic,
  );
  seed.record = settled(seed.record, 11_200_000);
  return seed;
}

/** Builds a scenario's starting record. Later scenarios replay the scripted operations from the canvas board. */
export function seedRecord(scenario: PrdScenario, now: Date): PrdRecord {
  return refreshOpeners(scriptedRecord(scenario, now));
}

function scriptedRecord(scenario: PrdScenario, now: Date): PrdRecord {
  switch (scenario) {
    case "first-entry":
      return firstEntryRecord(now);
    case "prd-today":
    case "queue":
      return prdTodayRecord(now);
    case "answer-complete":
      return new Seed(prdTodayRecord(now), now.toISOString()).answer(QUESTION.retention, [
        "a year",
        "Yes",
      ]).record;
    case "all-ready":
      return allReady(now).record;
    case "check-passed": {
      const seed = allReady(now)
        .confirmAll()
        .topic(TOPIC.shifts, GAP_FIXES[TOPIC.shifts]!)
        .act("dev", "confirm-topic", topicTarget(TOPIC.shifts))
        .topic(TOPIC.users, GAP_FIXES[TOPIC.users]!)
        .act("dev", "confirm-topic", topicTarget(TOPIC.users));
      return settled(seed.record, 11_200_000);
    }
    case "closed": {
      const seed = allReady(now)
        .topic(TOPIC.scope, "Import once, then the app is the only source.")
        .confirmAll()
        .send("dev", { kind: "main" }, { kind: "close-check" });
      const checkId = seed.record.check?.id ?? "";
      return seed.act("dev", "close-anyway", askTarget(checkId)).record;
    }
    case "funds-out":
      return settled(prdTodayRecord(now), 19_600_000);
    case "funds-79999":
      return settled(prdTodayRecord(now), 15_999_800);
    case "funds-80":
      return settled(prdTodayRecord(now), 16_000_000);
    case "funds-95":
      return settled(prdTodayRecord(now), 19_000_000);
    case "funds-95001":
      return settled(prdTodayRecord(now), 19_000_200);
  }
}

function storageKey(scenario: PrdScenario): string {
  return `ai4good.prd.fixture.v2.${scenario}`;
}

/** Forgets a scenario's saved record, so the next world opened for it starts from its seed. */
export function forgetPrdWorld(
  scenario: PrdScenario,
  storage: KeyValueStore | null = browserStorage(),
): void {
  try {
    storage?.removeItem(storageKey(scenario));
  } catch {
    return;
  }
}

function isRecord(value: unknown): value is PrdRecord {
  if (value === null || typeof value !== "object") return false;
  const record = value as Partial<PrdRecord>;
  return (
    typeof record.sequence === "number" &&
    typeof record.revision === "number" &&
    Array.isArray(record.topics) &&
    Array.isArray(record.questions) &&
    typeof record.chats === "object" &&
    typeof record.funds?.allocationMicros === "number"
  );
}

function loadStored(storage: KeyValueStore | null, scenario: PrdScenario): PrdRecord | null {
  if (!storage) return null;
  try {
    const raw = storage.getItem(storageKey(scenario));
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!isRecord(parsed)) return null;
    const requests = Object.fromEntries(
      Object.entries(parsed.requests).filter(([, request]) => request.reply !== null),
    );
    const questions = parsed.questions.map((question) => ({ ...question, using: false }));
    return { ...parsed, busy: {}, requests, questions, funds: releaseHolds(parsed.funds) };
  } catch {
    return null;
  }
}

async function reportModelCall(kind: PrdModelCall): Promise<void> {
  const probe = (globalThis as Record<string, unknown>)[MODEL_CALL_PROBE];
  if (typeof probe === "function") await probe(kind);
}

function pause(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export type SendReceipt = {
  messageId: string;
  metadata: PrdMessageMeta;
  replay: boolean;
  done: Promise<PrdUIMessage>;
};

/** The backend stand-in for one scenario, shared by both viewers. */
export type PrdWorld = {
  readonly scenario: PrdScenario;
  readonly pace: PrdPace;
  viewer(role: Role): Viewer;
  snapshot(viewer: Viewer): PrdSnapshot;
  load(viewer: Viewer): Promise<Result<PrdSnapshot>>;
  subscribe(viewer: Viewer, listener: (snapshot: PrdSnapshot) => void): () => void;
  act(viewer: Viewer, action: Action<ActionKind>): Promise<Result<PrdSnapshot>>;
  saveDraft(viewer: Viewer, key: string, text: string): Promise<void>;
  send(
    viewer: Viewer,
    body: PrdSendBody,
    clientMessageId: string | null,
  ): Promise<Result<SendReceipt>>;
  idle(): Promise<void>;
};

export type PrdWorldOptions = {
  storage?: KeyValueStore | null;
  pace?: PrdPace;
  now?: () => Date;
};

function isScenario(value: string): value is PrdScenario {
  return (PRD_SCENARIOS as readonly string[]).includes(value);
}

/** Opens a world. With `storage: null` it lives in memory only, which is how a Node test opens it. */
export function createPrdWorld(name: string, options: PrdWorldOptions = {}): PrdWorld {
  if (!isScenario(name)) throw new Error(`unknown PRD scenario ${name}`);
  const scenario: PrdScenario = name;
  const storage = options.storage ?? null;
  const pace = options.pace ?? "test";
  const now = options.now ?? (() => new Date());
  const replyMs = PRD_GIVEN[scenario].replyMs[pace];
  let state = loadStored(storage, scenario) ?? seedRecord(scenario, now());
  const listeners = new Set<{ viewer: Viewer; listener: (snapshot: PrdSnapshot) => void }>();
  const running = new Set<Promise<unknown>>();

  function view(viewer: Viewer): PrdSnapshot {
    return structuredClone(toSnapshot(state, viewer));
  }

  function save(): void {
    if (!storage) return;
    try {
      storage.setItem(storageKey(scenario), JSON.stringify(state));
    } catch {
      // A private window can refuse storage; the world still answers from memory.
    }
  }

  function commit(next: PrdRecord): void {
    state = refreshOpeners({ ...next, sequence: state.sequence + 1 });
    save();
    for (const entry of listeners) entry.listener(view(entry.viewer));
  }

  function track<T>(work: Promise<T>): Promise<T> {
    running.add(work);
    void work.finally(() => running.delete(work)).catch(() => undefined);
    return work;
  }

  async function runLater(later: Later): Promise<void> {
    await reportModelCall(later.call);
    await pause(replyMs);
    commit(later.finish(state, now().toISOString()));
  }

  return {
    scenario,
    pace,
    viewer(role) {
      const person = state.people.find((item) => item.role === role);
      return { role, name: person?.name ?? role };
    },
    snapshot: view,
    async load(viewer) {
      return { ok: true, value: view(viewer) };
    },
    subscribe(viewer, listener) {
      const entry = { viewer, listener };
      listeners.add(entry);
      return () => {
        listeners.delete(entry);
      };
    },
    async act(viewer, action) {
      const done = applyAction(state, viewer.role, action, now().toISOString());
      if (!done.ok) return done;
      commit(done.value.record);
      if (done.value.later) {
        const work = track(runLater(done.value.later));
        if (action.kind === "complete-answer") await work;
      }
      return { ok: true, value: view(viewer) };
    },
    async saveDraft(viewer, key, text) {
      state = {
        ...state,
        drafts: { ...state.drafts, [viewer.role]: { ...state.drafts[viewer.role], [key]: text } },
      };
      save();
    },
    async send(viewer, body, clientMessageId) {
      const begun = startSend(state, viewer.role, body, clientMessageId, now().toISOString());
      if (!begun.ok) return begun;
      const metadata: PrdMessageMeta = { actor: "ai", name: "ai4good AI", at: now().toISOString() };
      if (begun.value.kind === "replay") {
        const message = begun.value.message;
        return {
          ok: true,
          value: { messageId: message.id, metadata, replay: true, done: Promise.resolve(message) },
        };
      }
      const started = begun.value;
      commit(started.record);
      await reportModelCall(started.call);
      const done = track(
        (async () => {
          await pause(replyMs);
          const finished = started.finish(state, now().toISOString());
          commit(finished.record);
          return finished.message;
        })(),
      );
      return { ok: true, value: { messageId: started.aiId, metadata, replay: false, done } };
    },
    async idle() {
      while (running.size > 0) await Promise.allSettled([...running]);
    },
  };
}

const opened = new Map<string, PrdWorld>();

function browserStorage(): KeyValueStore | null {
  try {
    return typeof localStorage === "undefined" ? null : localStorage;
  } catch {
    return null;
  }
}

/** The shell's world for a scenario: one per page, saved in this browser. */
export function openPrdWorld(scenario: PrdScenario, pace: PrdPace): PrdWorld {
  const key = `${scenario}:${pace}`;
  const cached = opened.get(key);
  if (cached) return cached;
  const world = createPrdWorld(scenario, { storage: browserStorage(), pace });
  opened.set(key, world);
  return world;
}
