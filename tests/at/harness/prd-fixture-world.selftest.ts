import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { MODEL_CALL_PROBE } from "../../../design/astra/src/givens.ts";
import {
  createPrdWorld,
  prdFixturePort,
  prdFixtureSelection,
  withoutFresh,
} from "../../../design/astra/src/prd-fixture-port.ts";
import {
  applyAction,
  forgetPrdWorld,
  seedRecord,
  startSend,
  type PrdWorld,
} from "../../../design/astra/src/prd-fixture-world.ts";
import { COPY } from "../../../src/components/prd-workspace/copy.ts";
import { present } from "../../../src/components/prd-workspace/model.ts";
import type { PrdPort } from "../../../src/components/prd-workspace/port.ts";
import {
  CHECK_FUNDS_REASON,
  closeRemaining,
  issueToken,
  topicTarget,
  toSnapshot,
  type PrdRecord,
} from "../../../src/lib/prd-rules.ts";
import {
  scopeKey,
  type Action,
  type ActionKind,
  type ChatScope,
  type PrdIntent,
  type PrdSendBody,
  type PrdSnapshot,
  type PrdUIMessage,
  type QuestionId,
  type RequestId,
  type TopicId,
} from "../../../src/lib/prd-stream.ts";

const MAIN: ChatScope = { kind: "main" };
const RETENTION = { kind: "side", questionId: "retention" as QuestionId } as const;
const LOGO = { kind: "side", questionId: "logo" as QuestionId } as const;
const SHIFTS = { kind: "topic", topicId: "shifts" as TopicId } as const;
const RETENTION_ANSWER =
  "Keep a volunteer’s email and phone for a year, then delete them. Shift history stays, without names.";

type Delivery = { ok: true; text: string } | { ok: false; kind: string; reason: string };

let calls: string[] = [];
let ids = 0;

beforeEach(() => {
  calls = [];
  (globalThis as Record<string, unknown>)[MODEL_CALL_PROBE] = (kind: unknown) => {
    calls.push(String(kind));
  };
});

afterEach(() => {
  delete (globalThis as Record<string, unknown>)[MODEL_CALL_PROBE];
});

function open(scenario: string): { world: PrdWorld; dev: PrdPort; ngo: PrdPort } {
  const world = createPrdWorld(scenario, { storage: null, pace: "test" });
  return { world, dev: prdFixturePort(world, "dev"), ngo: prdFixturePort(world, "ngo") };
}

function memoryStorage(): Pick<Storage, "getItem" | "setItem" | "removeItem"> {
  const items = new Map<string, string>();
  return {
    getItem: (key) => items.get(key) ?? null,
    setItem: (key, value) => {
      items.set(key, value);
    },
    removeItem: (key) => {
      items.delete(key);
    },
  };
}

const NOW = new Date("2026-10-16T12:00:00.000Z");

function confirmInRecord(record: PrdRecord, id: string): PrdRecord {
  const done = applyAction(
    record,
    "dev",
    {
      kind: "confirm-topic",
      token: issueToken(record, "confirm-topic", topicTarget(id as TopicId)),
    },
    NOW.toISOString(),
  );
  if (!done.ok) throw new Error(`${id} was refused: ${done.refusal.reason}`);
  return done.value.record;
}

function devView(record: PrdRecord): PrdSnapshot {
  const person = record.people.find((item) => item.role === "dev");
  return toSnapshot(record, { role: "dev", name: person?.name ?? "dev" });
}

async function snap(port: PrdPort): Promise<PrdSnapshot> {
  const result = await port.load();
  if (!result.ok) throw new Error(result.refusal.reason);
  return result.value;
}

function text(message: PrdUIMessage): string {
  return message.parts.map((part) => (part.type === "text" ? part.text : "")).join("\n");
}

function chatText(snapshot: PrdSnapshot, scope: ChatScope): string {
  return (snapshot.chats[scopeKey(scope)] ?? []).map(text).join("\n");
}

function parts<T extends PrdUIMessage["parts"][number]["type"]>(
  snapshot: PrdSnapshot,
  type: T,
): Extract<PrdUIMessage["parts"][number], { type: T }>[] {
  return (snapshot.chats.main ?? []).flatMap((message) =>
    message.parts.filter(
      (part): part is Extract<PrdUIMessage["parts"][number], { type: T }> => part.type === type,
    ),
  );
}

async function deliver(
  port: PrdPort,
  scope: ChatScope,
  intent: PrdIntent,
  baseRevision?: number,
  requestId = `test-${++ids}`,
): Promise<Delivery> {
  const revision = baseRevision ?? (await snap(port)).revision;
  try {
    const stream = await port.chat(scope).sendMessages({
      trigger: "submit-message",
      chatId: scopeKey(scope),
      messageId: undefined,
      messages: [],
      abortSignal: undefined,
      body: { scope, requestId: requestId as RequestId, baseRevision: revision, intent },
    });
    const reader = stream.getReader();
    let reply = "";
    for (;;) {
      const step = await reader.read();
      if (step.done) break;
      if (step.value.type === "text-delta") reply += step.value.delta;
    }
    return { ok: true, text: reply };
  } catch (error) {
    const refusal = JSON.parse(error instanceof Error ? error.message : String(error)) as {
      kind: string;
      reason: string;
    };
    return { ok: false, kind: refusal.kind, reason: refusal.reason };
  }
}

function topic(snapshot: PrdSnapshot, id: string) {
  const found = snapshot.topics.find((item) => item.id === id);
  if (!found) throw new Error(`no topic ${id}`);
  return found;
}

function question(snapshot: PrdSnapshot, id: string) {
  const found = snapshot.questions.find((item) => item.id === id);
  if (!found) throw new Error(`no question ${id}`);
  return found;
}

function confirmAction(snapshot: PrdSnapshot, id: string): Action<"confirm-topic"> {
  const confirm = topic(snapshot, id).confirm;
  if (confirm.kind !== "available") throw new Error(`${id} cannot be confirmed: ${confirm.reason}`);
  return confirm.action;
}

function closeAction(snapshot: PrdSnapshot): Action<"close"> {
  if (snapshot.close.kind !== "open" || snapshot.close.close.kind !== "available") {
    throw new Error("Dev has no Close PRD");
  }
  return snapshot.close.close.action;
}

describe("the PRD fixture world", () => {
  it("sends each main-chat message as its own paid request and refuses a second while one runs", async () => {
    const { dev } = open("prd-today");
    const first = deliver(dev, MAIN, { kind: "text", text: "First message" });
    const second = await deliver(dev, MAIN, { kind: "text", text: "Second message" });
    expect(second).toMatchObject({ ok: false, kind: "busy" });
    expect(await first).toMatchObject({ ok: true });
    expect(await deliver(dev, MAIN, { kind: "text", text: "Second message" })).toMatchObject({
      ok: true,
    });
    const chat = chatText(await snap(dev), MAIN);
    expect(chat.indexOf("First message")).toBeLessThan(chat.indexOf("Second message"));
    expect(calls).toEqual(["prd-chat", "prd-chat"]);
  });

  it("charges a repeated request once and replays its reply", async () => {
    const { dev } = open("prd-today");
    const before = (await snap(dev)).funds.settledMicros;
    const once = await deliver(
      dev,
      MAIN,
      { kind: "text", text: "Charge once." },
      undefined,
      "same",
    );
    const again = await deliver(
      dev,
      MAIN,
      { kind: "text", text: "Charge once." },
      undefined,
      "same",
    );
    expect(again).toEqual(once);
    const after = await snap(dev);
    expect(chatText(after, MAIN).split("Charge once.").length - 1).toBe(1);
    expect(calls).toEqual(["prd-chat"]);
    expect(after.funds.settledMicros - before).toBe(514_250);
    expect(after.funds.pendingMicros).toBe(0);
  });

  it("blocks Mark answer complete while the AI's follow-up is open, and any reply from Maya releases it", async () => {
    const { ngo } = open("prd-today");
    await deliver(ngo, RETENTION, { kind: "text", text: "a year" });
    let retention = question(await snap(ngo), "retention");
    expect(retention.kind).toBe("answering");
    if (retention.kind !== "answering") return;
    expect(retention.followUp).toBe("pending");
    expect(retention.complete).toEqual({
      kind: "unavailable",
      reason: "Answer the AI’s question first.",
    });
    const aside = await deliver(ngo, RETENTION, {
      kind: "text",
      text: "Can a volunteer ask to be removed earlier?",
    });
    expect(aside.ok && aside.text).toContain("removed earlier");
    retention = question(await snap(ngo), "retention");
    expect(retention.kind === "answering" && retention.followUp).toBe("none");
    expect(retention.kind === "answering" && retention.complete.kind).toBe("available");
    await deliver(ngo, RETENTION, { kind: "text", text: "Yes" });
    retention = question(await snap(ngo), "retention");
    expect(retention.kind === "answering" && retention.complete.kind).toBe("available");
    expect(calls).toEqual(["prd-side-chat", "prd-side-chat", "prd-side-chat"]);
  });

  it("writes one clean answer on Mark answer complete, without the aside", async () => {
    const { dev, ngo } = open("prd-today");
    for (const line of ["a year", "Can a volunteer ask to be removed earlier?", "Yes"]) {
      await deliver(ngo, RETENTION, { kind: "text", text: line });
    }
    const retention = question(await snap(ngo), "retention");
    if (retention.kind !== "answering" || retention.complete.kind !== "available") {
      throw new Error("Mark answer complete is not available");
    }
    const done = await ngo.act(retention.complete.action);
    expect(done.ok).toBe(true);
    const written = question(await snap(dev), "retention");
    expect(written).toMatchObject({ kind: "complete", answer: RETENTION_ANSWER, canUse: true });
    expect(calls.filter((kind) => kind === "prd-answer-write")).toEqual(["prd-answer-write"]);
    expect(await ngo.act(retention.complete.action)).toMatchObject({
      ok: false,
      refusal: { kind: "stale" },
    });
  });

  it("uses an edited answer with a note: one brief, the topic records both, and Maya sees the wording", async () => {
    const { dev, ngo } = open("answer-complete");
    const edited = "Keep contact details for one year, then delete them.";
    const note = "Apply the same rule to coordinator exports.";
    const used = await deliver(dev, MAIN, {
      kind: "use-answer",
      questionId: "retention" as QuestionId,
      answer: edited,
      note,
    });
    expect(used.ok && used.text).toContain(
      "I will tell Maya you adjusted her answer, so she sees the final wording.",
    );
    const after = await snap(dev);
    const briefs = parts(after, "data-brief");
    expect(briefs).toHaveLength(1);
    const rows = briefs[0]!.data.rows;
    expect(rows).toContainEqual({ label: "I changed it to", text: edited });
    expect(rows).toContainEqual({ label: "My note", text: note });
    expect(rows.map((row) => row.label)).toContain("To discuss");
    const data = topic(after, "data");
    expect(data.statements).toContain(edited);
    expect(data.statements).toContain(note);
    expect(data.state).toBe("ready");
    const retention = question(after, "retention");
    expect(retention).toMatchObject({ kind: "used", answer: edited, changed: true });
    const brief = (after.chats.main ?? []).find((message) =>
      message.parts.some((part) => part.type === "data-brief"),
    );
    expect(retention.kind === "used" && retention.briefTurn).toBe(brief?.id);
    expect(chatText(await snap(ngo), RETENTION)).toContain(`The final wording: ${edited}`);
    expect(
      await deliver(dev, MAIN, {
        kind: "use-answer",
        questionId: "retention" as QuestionId,
        answer: null,
        note: "",
      }),
    ).toMatchObject({ ok: false, kind: "stale" });
  });

  it("closes after a failing check only through Close anyway, and Keep working leaves it open", async () => {
    const { dev } = open("prd-today");
    const checked = await deliver(dev, MAIN, { kind: "close-check" });
    expect(checked.ok && checked.text).toContain("does not pass.");
    let current = await snap(dev);
    expect(current.check).toMatchObject({ passed: false });
    expect(current.check?.gaps.map((gap) => gap.topicId)).toEqual(["users", "shifts"]);
    expect(topic(current, "users").state).toBe("needs-review");
    let asks = parts(current, "data-close-ask");
    expect(asks).toHaveLength(1);
    expect((await dev.act(asks[0]!.data.keepWorking)).ok).toBe(true);
    current = await snap(dev);
    expect(parts(current, "data-close-ask")).toHaveLength(0);
    expect(current.close.kind).toBe("open");
    await deliver(dev, MAIN, { kind: "close-check" });
    current = await snap(dev);
    asks = parts(current, "data-close-ask");
    expect(asks).toHaveLength(1);
    expect((await dev.act(asks[0]!.data.closeAnyway)).ok).toBe(true);
    current = await snap(dev);
    expect(current.close).toEqual({ kind: "closed", revision: current.revision, openPoints: 6 });
    expect(current.canWrite.main).toBe(false);
    expect(calls).toEqual(["prd-check"]);
  });

  it("closes at once after a passing check for the current revision, with no model call", async () => {
    const { dev } = open("check-passed");
    const before = await snap(dev);
    expect(before.check).toMatchObject({ passed: true, revision: before.revision });
    expect(parts(before, "data-recommendation")).toHaveLength(1);
    expect((await dev.act(closeAction(before))).ok).toBe(true);
    expect((await snap(dev)).close).toEqual({
      kind: "closed",
      revision: before.revision,
      openPoints: 0,
    });
    expect(calls).toEqual([]);
  });

  it("sends a dependent topic to Needs review on a changed decision and keeps unrelated confirmations", async () => {
    const { dev } = open("check-passed");
    const result = await deliver(dev, SHIFTS, {
      kind: "text",
      text: "Swaps: volunteers cancel instead",
    });
    expect(result.ok).toBe(true);
    const after = await snap(dev);
    expect(topic(after, "shifts").state).toBe("needs-review");
    expect(topic(after, "scope").state).toBe("needs-review");
    for (const id of ["users", "notify", "data", "success"]) {
      expect(topic(after, id).state).toBe("confirmed");
    }
    expect(parts(after, "data-recommendation")).toHaveLength(0);
    expect(topic(after, "shifts").statements).toContain("Swaps: volunteers cancel instead.");
  });

  it("runs the completion check when the last required topic is confirmed", async () => {
    const { world, dev } = open("all-ready");
    for (const id of ["shifts", "notify", "data", "scope", "success"]) {
      expect((await dev.act(confirmAction(await snap(dev), id))).ok).toBe(true);
    }
    await world.idle();
    const after = await snap(dev);
    expect(calls).toEqual(["prd-check"]);
    expect(after.check?.gaps).toHaveLength(2);
    expect(chatText(after, MAIN)).toContain("so it does not pass yet.");
    expect(topic(after, "shifts").confirm.kind).toBe("unavailable");
  });

  it("refuses the NGO every developer action and every developer chat as forbidden, changing nothing", async () => {
    const { dev, ngo } = open("prd-today");
    const before = await snap(dev);
    const suggested = question(before, "success");
    if (suggested.kind !== "suggested" || suggested.post.kind !== "available") {
      throw new Error("the success question is not offered to post");
    }
    const actions: Action<ActionKind>[] = [
      closeAction(before),
      confirmAction(before, "notify"),
      suggested.post.action,
    ];
    for (const action of actions) {
      expect(await ngo.act(action)).toMatchObject({ ok: false, refusal: { kind: "forbidden" } });
    }
    expect(await deliver(ngo, MAIN, { kind: "text", text: "Maya writes here." })).toMatchObject({
      ok: false,
      kind: "forbidden",
    });
    expect(await deliver(ngo, SHIFTS, { kind: "text", text: "Maya writes here." })).toMatchObject({
      ok: false,
      kind: "forbidden",
    });
    expect(await deliver(dev, RETENTION, { kind: "text", text: "Priya answers." })).toMatchObject({
      ok: false,
      kind: "forbidden",
    });
    expect((await snap(dev)).sequence).toBe(before.sequence);
    expect(calls).toEqual([]);
  });

  it("refuses a used or outdated token as stale with no second effect", async () => {
    const { dev } = open("prd-today");
    const before = await snap(dev);
    const confirm = confirmAction(before, "notify");
    const close = closeAction(before);
    expect((await dev.act(confirm)).ok).toBe(true);
    const once = await snap(dev);
    expect(await dev.act(confirm)).toMatchObject({ ok: false, refusal: { kind: "stale" } });
    const twice = await snap(dev);
    expect(twice.sequence).toBe(once.sequence);
    expect(
      (twice.chats.main ?? [])
        .flatMap((message) => message.parts)
        .filter(
          (part) => part.type === "data-line" && part.data.text.includes("confirmed Notifications"),
        ),
    ).toHaveLength(1);
    await deliver(dev, SHIFTS, { kind: "text", text: "The kitchen posts the week on Friday." });
    expect(await dev.act(close)).toMatchObject({ ok: false, refusal: { kind: "stale" } });
    expect((await snap(dev)).close.kind).toBe("open");
  });

  it("seeds the scenario table", async () => {
    const today = await snap(open("prd-today").dev);
    expect(new Set(today.topics.map((item) => item.state))).toEqual(
      new Set(["open", "draft", "ready", "confirmed", "needs-review"]),
    );
    expect(today.funds.allocationMicros - today.funds.settledMicros).toBe(8_800_000);
    const closed = await snap(open("closed").dev);
    expect(closed.close).toEqual({ kind: "closed", revision: 18, openPoints: 2 });
    const first = await snap(open("first-entry").dev);
    expect(first.topics.every((item) => item.state === "open" || item.state === "draft")).toBe(
      true,
    );
    expect(first.questions).toEqual([]);
    const out = await snap(open("funds-out").dev);
    expect(out.funds.allocationMicros - out.funds.settledMicros).toBeLessThan(
      out.funds.replyHoldMicros,
    );
  });

  it("refuses to confirm a section while a section it depends on is neither ready nor confirmed", async () => {
    const { dev } = open("prd-today");
    const before = await snap(dev);
    const scope = topic(before, "scope");
    expect(scope.state).toBe("needs-review");
    expect(scope.confirm).toEqual({
      kind: "unavailable",
      reason: "Shift scheduling rules must be ready before you can confirm this section.",
    });
    for (const item of before.topics.filter((entry) => entry.state === "ready")) {
      expect(item.confirm.kind, item.id).toBe("available");
    }
    const answered = await deliver(dev, SHIFTS, {
      kind: "answers",
      picks: { swap: "The coordinator approves each swap", publish: "Two weeks ahead" },
      text: "",
    });
    expect(answered.ok).toBe(true);
    expect(topic(await snap(dev), "scope").confirm.kind).toBe("available");
  });

  it("keeps Close PRD unavailable while a reply runs, and a reply that finishes after close leaves the closed record alone", async () => {
    const { dev } = open("check-passed");
    const before = await snap(dev);
    const close = closeAction(before);
    const reply = deliver(dev, MAIN, { kind: "text", text: "One more note." }, before.revision);
    const during = await snap(dev);
    expect(during.close).toMatchObject({
      kind: "open",
      close: { kind: "unavailable", reason: "Wait for the AI to finish." },
    });
    expect(await dev.act(close)).toMatchObject({ ok: false, refusal: { kind: "busy" } });
    expect((await reply).ok).toBe(true);
    expect(closeAction(await snap(dev)).kind).toBe("close");
    const record = seedRecord("check-passed", NOW);
    const body: PrdSendBody = {
      scope: MAIN,
      requestId: "late" as RequestId,
      baseRevision: record.revision,
      intent: { kind: "text", text: "A late note." },
    };
    const begun = startSend(record, "dev", body, null, NOW.toISOString());
    if (!begun.ok || begun.value.kind !== "started") throw new Error("the send did not start");
    const closed: PrdRecord = {
      ...begun.value.record,
      closed: { revision: record.revision, openPoints: 0 },
    };
    const finished = begun.value.finish(closed, NOW.toISOString()).record;
    expect(finished.chats).toEqual(closed.chats);
    expect(finished.topics).toEqual(closed.topics);
    expect(finished.revision).toBe(closed.revision);
    expect(finished.busy).toEqual({});
    expect(finished.funds.pendingMicros).toBe(0);
  });

  it("marks the main chat busy while the automatic completion check runs", async () => {
    const { world, dev } = open("all-ready");
    for (const id of ["shifts", "notify", "data", "scope", "success"]) {
      expect((await dev.act(confirmAction(await snap(dev), id))).ok).toBe(true);
    }
    const during = await snap(dev);
    expect(during.send.main).toEqual({
      kind: "unavailable",
      block: "busy",
      reason: "The AI is still answering in this chat.",
    });
    expect(
      await deliver(dev, MAIN, { kind: "text", text: "While the check runs." }, during.revision),
    ).toMatchObject({ ok: false, kind: "busy" });
    await world.idle();
    expect((await snap(dev)).send.main).toEqual({ kind: "available" });
  });

  it("reserves an answer as soon as its use starts, so it cannot be used twice", async () => {
    const { dev } = open("answer-complete");
    const before = await snap(dev);
    const intent: PrdIntent = {
      kind: "use-answer",
      questionId: "retention" as QuestionId,
      answer: null,
      note: "",
    };
    const first = deliver(dev, MAIN, intent, before.revision);
    expect(question(await snap(dev), "retention")).toMatchObject({
      kind: "complete",
      canUse: false,
    });
    expect(await deliver(dev, MAIN, intent, before.revision)).toMatchObject({
      ok: false,
      kind: "busy",
    });
    expect((await first).ok).toBe(true);
    expect(question(await snap(dev), "retention").kind).toBe("used");
    expect(calls).toEqual(["prd-chat"]);
  });

  it("refuses the confirmation that would start the completion check when funds cannot pay for it", () => {
    let record = seedRecord("all-ready", NOW);
    for (const id of ["shifts", "notify", "data", "scope"]) record = confirmInRecord(record, id);
    record = {
      ...record,
      funds: { ...record.funds, settledMicros: record.funds.allocationMicros - 100_000 },
    };
    expect(topic(devView(record), "success").confirm).toEqual({
      kind: "unavailable",
      reason: CHECK_FUNDS_REASON,
    });
    const done = applyAction(
      record,
      "dev",
      {
        kind: "confirm-topic",
        token: issueToken(record, "confirm-topic", topicTarget("success" as TopicId)),
      },
      NOW.toISOString(),
    );
    expect(done).toMatchObject({ ok: false, refusal: { kind: "funds" } });
  });

  it("offers View answer when funds leave no room for Use answer", () => {
    const record = seedRecord("answer-complete", NOW);
    const out = { ...record, funds: { ...record.funds, settledMicros: 19_600_000 } };
    const entry = present(devView(out)).open.find((item) => item.question.id === "retention");
    expect(entry).toMatchObject({ canView: true, canUse: false });
  });

  it("keeps each completion check's gaps with its own message", async () => {
    const { dev } = open("prd-today");
    await deliver(dev, MAIN, { kind: "close-check" });
    const ask = parts(await snap(dev), "data-close-ask")[0];
    if (!ask) throw new Error("the first check did not ask to close");
    expect((await dev.act(ask.data.keepWorking)).ok).toBe(true);
    await deliver(dev, SHIFTS, {
      kind: "text",
      text: "Holidays: the coordinator sets the closed days once a year, and no shifts are published on them.",
    });
    await deliver(dev, MAIN, { kind: "close-check" });
    const current = await snap(dev);
    const checks = parts(current, "data-check");
    expect(checks.map((part) => part.data.gaps.map((gap) => gap.topicId))).toEqual([
      ["users", "shifts"],
      ["users"],
    ]);
    expect(current.check?.id).toBe(checks[1]?.data.checkId);
  });

  it("tells an aside from an answer by the script, not by a question mark", async () => {
    const { ngo } = open("prd-today");
    const answer = await deliver(ngo, RETENTION, { kind: "text", text: "a year?" });
    expect(answer.ok && answer.text).toContain("That works for most kitchens.");
    const aside = await deliver(ngo, RETENTION, {
      kind: "text",
      text: "Can a volunteer ask to be removed earlier",
    });
    expect(aside.ok && aside.text).toContain("removed earlier");
    const retention = question(await snap(ngo), "retention");
    expect(retention.kind === "answering" && retention.complete.kind).toBe("available");
  });

  it("counts Still open within the required sections only", () => {
    const record = seedRecord("prd-today", NOW);
    const changed: PrdRecord = {
      ...record,
      topics: record.topics.map((item) =>
        item.id === "users"
          ? {
              ...item,
              required: false,
              confirmed: false,
              gap: "A gap outside the required sections.",
            }
          : item,
      ),
    };
    expect(closeRemaining(changed, "dev")).toContain("3 sections still being written");
  });

  it("opens each topic chat with a line that matches the topic's state", async () => {
    const { world, dev } = open("all-ready");
    const start = await snap(dev);
    for (const id of ["data", "success"]) {
      const opener = chatText(start, { kind: "topic", topicId: id as TopicId });
      expect(topic(start, id).state).toBe("ready");
      expect(opener).toContain("Every decision is recorded.");
      expect(opener).not.toContain("waits for Maya");
    }
    for (const id of ["shifts", "notify", "data", "scope", "success"]) {
      await dev.act(confirmAction(await snap(dev), id));
    }
    await world.idle();
    const checked = await snap(dev);
    expect(topic(checked, "users").state).toBe("needs-review");
    expect(chatText(checked, { kind: "topic", topicId: "users" as TopicId })).toContain(
      "The completion check found a gap here",
    );
    const today = await snap(open("prd-today").dev);
    expect(chatText(today, { kind: "topic", topicId: "scope" as TopicId })).toContain(
      "waits on the shift rules",
    );
  });

  it("writes a waiting section's text from the state of the question it waits on", async () => {
    const { dev, ngo } = open("prd-today");
    const waiting =
      "No text yet. It waits for Maya’s answer on how long the kitchen keeps volunteer data.";
    expect(topic(await snap(ngo), "data").statements).toEqual([waiting]);
    await deliver(ngo, RETENTION, { kind: "text", text: "a year" });
    expect(topic(await snap(ngo), "data").statements).toEqual([waiting]);
    await deliver(ngo, RETENTION, { kind: "text", text: "Yes" });
    const retention = question(await snap(ngo), "retention");
    if (retention.kind !== "answering" || retention.complete.kind !== "available") {
      throw new Error("Mark answer complete is not available");
    }
    expect((await ngo.act(retention.complete.action)).ok).toBe(true);
    const answered = await snap(ngo);
    expect(topic(answered, "data").statements).toEqual([
      "Sent to Priya · waiting for Priya to use it. The AI writes this section from your answer on how long the kitchen keeps volunteer data once Priya uses it.",
    ]);
    expect(topic(answered, "data").statusText).toBe("Sent to Priya · waiting for Priya to use it");
    const devAnswered = await snap(dev);
    expect(topic(devAnswered, "data").statements).toEqual([
      "No text yet. Maya answered on how long the kitchen keeps volunteer data. It waits for Priya to use the answer.",
    ]);
    expect(topic(devAnswered, "data").statusText).toBe("Maya answered · Priya can use it");
    await deliver(dev, MAIN, {
      kind: "use-answer",
      questionId: "retention" as QuestionId,
      answer: null,
      note: "",
    });
    expect(topic(await snap(ngo), "data").statements).toContain(RETENTION_ANSWER);
    const success = question(await snap(dev), "success");
    if (success.kind !== "suggested" || success.post.kind !== "available") {
      throw new Error("the success question is not offered to post");
    }
    expect((await dev.act(success.post.action)).ok).toBe(true);
    expect(topic(await snap(ngo), "success").statements).toEqual([
      "No text yet. It waits for Maya’s answer on what success means for the kitchen.",
    ]);
  });

  it("tells Maya her finished answer is sent and waits for Priya, apart from the questions still waiting for Maya", async () => {
    const { dev, ngo } = open("answer-complete");
    const sent = "Sent to Priya · waiting for Priya to use it";
    const maya = present(await snap(ngo));
    const finished = maya.open.find((entry) => entry.question.id === "retention");
    expect(finished?.statusText).toBe(sent);
    expect(finished?.sent).toBe(RETENTION_ANSWER);
    expect(COPY.sentTo(maya.names.dev)).toBe(`${sent}:`);
    const waiting = maya.open.filter((entry) => entry.question.kind === "posted");
    expect(waiting.length).toBeGreaterThan(0);
    for (const entry of waiting) {
      expect(entry.statusText).not.toContain("Sent to");
      expect(entry.sent).toBeNull();
    }
    const priya = present(await snap(dev));
    expect(priya.open.find((entry) => entry.question.id === "retention")?.statusText).toBe(
      "Maya marked it complete · use it",
    );
  });

  it("confirms a reply that settles the question and lets Maya complete at once, but still asks after an unclear one", async () => {
    const { ngo } = open("prd-today");
    const reply = await deliver(ngo, LOGO, { kind: "text", text: "No, plain text emails" });
    expect(reply.ok && reply.text).toContain("Mark the answer complete");
    expect(reply.ok && reply.text.trim()).not.toMatch(/\?$/);
    const logo = question(await snap(ngo), "logo");
    expect(logo.kind === "answering" && logo.followUp).toBe("none");
    expect(logo.kind === "answering" && logo.complete.kind).toBe("available");
    const unclear = await deliver(ngo, RETENTION, { kind: "text", text: "a year" });
    expect(unclear.ok && unclear.text.trim()).toMatch(/\?$/);
    const retention = question(await snap(ngo), "retention");
    expect(retention.kind === "answering" && retention.followUp).toBe("pending");
  });

  it("writes each section's status for the viewer: the developer's action, or what the developer will do", async () => {
    const devOnly = /Read it|you can confirm|fix it in this section|settle in the main chat/;
    const seen = new Set<string>();
    for (const scenario of ["prd-today", "answer-complete", "all-ready", "check-passed"]) {
      const { world, dev, ngo } = open(scenario);
      const views = [await snap(ngo)];
      if (scenario === "all-ready") {
        for (const id of ["shifts", "notify", "data", "scope", "success"]) {
          await dev.act(confirmAction(await snap(dev), id));
        }
        await world.idle();
        views.push(await snap(ngo));
      }
      for (const view of views) {
        for (const item of view.topics) {
          seen.add(item.state);
          expect(item.statusText, `${scenario} ${item.id}`).not.toMatch(devOnly);
          expect(item.blocker ?? "", `${scenario} ${item.id}`).not.toMatch(devOnly);
        }
      }
    }
    expect(seen).toEqual(new Set(["open", "draft", "ready", "confirmed", "needs-review"]));
    const today = await snap(open("prd-today").ngo);
    expect(topic(today, "notify").statusText).toBe(
      "The AI checked this section: every decision is recorded. Ready for Priya to confirm.",
    );
    expect(topic(today, "scope").statusText).toBe(
      "Reopened. It waits on Shift scheduling rules before Priya can confirm it.",
    );
    const devToday = await snap(open("prd-today").dev);
    expect(topic(devToday, "notify").statusText).toBe(
      "The AI checked this section: every decision is recorded. Read it and confirm.",
    );
  });

  it("tells both viewers after close that no question can be answered or used any more", async () => {
    const invites = /to answer|answer it|is answering|waiting for|use it|mark it complete/i;
    const closeAnyway = async (dev: PrdPort) => {
      await deliver(dev, MAIN, { kind: "close-check" });
      const ask = parts(await snap(dev), "data-close-ask")[0];
      if (!ask) throw new Error("the check did not ask to close");
      expect((await dev.act(ask.data.closeAnyway)).ok).toBe(true);
    };
    const today = open("prd-today");
    await closeAnyway(today.dev);
    const unanswered = {
      retention: "Not answered · the PRD closed with it as an open point",
      logo: "Not answered · the PRD closed without it",
    };
    const maya = present(await snap(today.ngo));
    expect(maya.listTitle).toBe("Questions for you · PRD closed");
    expect(maya.badge).toBe(0);
    expect(maya.listNote).not.toMatch(invites);
    expect(
      Object.fromEntries(maya.open.map((entry) => [entry.question.id, entry.statusText])),
    ).toEqual(unanswered);
    const priya = present(await snap(today.dev));
    expect(priya.listTitle).toBe("Questions for Maya (NGO) · PRD closed");
    expect(priya.badge).toBe(0);
    expect(priya.listNote).not.toMatch(invites);
    expect(
      Object.fromEntries(priya.open.map((entry) => [entry.question.id, entry.statusText])),
    ).toEqual(unanswered);
    const answered = open("answer-complete");
    await closeAnyway(answered.dev);
    const mayaSent = present(await snap(answered.ngo));
    const sent = mayaSent.open.find((entry) => entry.question.id === "retention");
    expect(sent?.statusText).toBe("Sent to Priya · the PRD closed before Priya used it");
    expect(sent?.sentLabel).toBe("Sent to Priya · the PRD closed before Priya used it:");
    expect(sent?.sent).toBe(RETENTION_ANSWER);
    const priyaSent = present(await snap(answered.dev));
    expect(priyaSent.open.find((entry) => entry.question.id === "retention")?.statusText).toBe(
      "Maya answered · the PRD closed before you used it",
    );
    for (const view of [maya, priya, mayaSent, priyaSent]) {
      expect(view.badge).toBe(0);
      for (const entry of view.open) {
        expect(entry.statusText, entry.question.id).not.toMatch(invites);
        expect(entry.sentLabel, entry.question.id).not.toMatch(invites);
        expect(entry.canView || entry.canUse, entry.question.id).toBe(false);
      }
    }
  });

  it("shows the failed check again on Close PRD for the same revision, with no second model call", async () => {
    const { dev } = open("prd-today");
    await deliver(dev, MAIN, { kind: "close-check" });
    const first = await snap(dev);
    const ask = parts(first, "data-close-ask")[0];
    if (!ask) throw new Error("the first check did not ask to close");
    expect((await dev.act(ask.data.keepWorking)).ok).toBe(true);
    const kept = await snap(dev);
    const again = await deliver(dev, MAIN, { kind: "close-check" });
    expect(again.ok && again.text).toContain("does not pass.");
    let current = await snap(dev);
    expect(calls).toEqual(["prd-check"]);
    expect(current.funds.settledMicros).toBe(kept.funds.settledMicros);
    expect(current.funds.pendingMicros).toBe(0);
    expect(current.check?.id).toBe(first.check?.id);
    expect(parts(current, "data-close-ask")).toHaveLength(1);
    const listed = (current.chats.main ?? []).filter((message) =>
      message.parts.some((part) => part.type === "data-check"),
    );
    expect(listed).toHaveLength(2);
    expect(present(current).liveCheckMessage).toBe(listed[1]?.id);
    await deliver(dev, MAIN, { kind: "close-check" });
    current = await snap(dev);
    expect(parts(current, "data-close-ask")).toHaveLength(1);
    expect(calls).toEqual(["prd-check"]);
    await deliver(dev, SHIFTS, {
      kind: "text",
      text: "Holidays: the coordinator sets the closed days once a year, and no shifts are published on them.",
    });
    await deliver(dev, MAIN, { kind: "close-check" });
    expect(calls).toEqual(["prd-check", "prd-chat", "prd-check"]);
  });

  it("after the automatic check fails, Close PRD warns from that check with no new model call", async () => {
    const { world, dev } = open("all-ready");
    for (const id of ["shifts", "notify", "data", "scope", "success"]) {
      expect((await dev.act(confirmAction(await snap(dev), id))).ok).toBe(true);
    }
    await world.idle();
    expect(calls).toEqual(["prd-check"]);
    expect((await deliver(dev, MAIN, { kind: "close-check" })).ok).toBe(true);
    const after = await snap(dev);
    expect(calls).toEqual(["prd-check"]);
    const asks = parts(after, "data-close-ask");
    expect(asks).toHaveLength(1);
    expect((await dev.act(asks[0]!.data.closeAnyway)).ok).toBe(true);
    expect((await snap(dev)).close.kind).toBe("closed");
  });

  it("offers Close PRD after a failed check even with no funds left, and repeating that check calls no model", () => {
    const at = NOW.toISOString();
    const press = (record: PrdRecord, id: string) =>
      startSend(
        record,
        "dev",
        {
          scope: MAIN,
          requestId: id as RequestId,
          baseRevision: record.revision,
          intent: { kind: "close-check" },
        },
        null,
        at,
      );
    let record = seedRecord("prd-today", NOW);
    const first = press(record, "first");
    if (!first.ok || first.value.kind !== "started") throw new Error("the check did not start");
    expect(first.value.call).toBe("prd-check");
    record = first.value.finish(first.value.record, at).record;
    record = {
      ...record,
      funds: { ...record.funds, settledMicros: record.funds.allocationMicros - 100_000 },
    };
    expect(devView(record).close).toMatchObject({ kind: "open", close: { kind: "available" } });
    const again = press(record, "again");
    if (!again.ok || again.value.kind !== "started") throw new Error("the repeat did not start");
    expect(again.value.call).toBeNull();
    expect(again.value.record.funds).toEqual(record.funds);
  });

  it("writes every Still open line for the viewer: the developer's own work, or what Priya will do", async () => {
    const remaining = (snapshot: PrdSnapshot) =>
      snapshot.close.kind === "open" ? [...snapshot.close.remaining] : [];
    const today = open("prd-today");
    const answered = open("answer-complete");
    const gaps = open("prd-today");
    await deliver(gaps.dev, MAIN, { kind: "close-check" });
    const ask = parts(await snap(gaps.dev), "data-close-ask")[0];
    if (!ask) throw new Error("the check did not ask to close");
    expect((await gaps.dev.act(ask.data.keepWorking)).ok).toBe(true);
    const dev = [
      ...remaining(await snap(today.dev)),
      ...remaining(await snap(answered.dev)),
      ...remaining(await snap(gaps.dev)),
    ];
    const ngo = [
      ...remaining(await snap(today.ngo)),
      ...remaining(await snap(answered.ngo)),
      ...remaining(await snap(gaps.ngo)),
    ];
    expect(new Set(dev)).toEqual(
      new Set([
        "1 section ready for you to confirm",
        "1 section waiting on another section",
        "2 sections still being written",
        "3 sections still being written",
        "1 blocking question not posted to Maya",
        "1 blocking question waiting for Maya",
        "1 answer from Maya to use",
        "2 gaps from the completion check to fix",
        "Completion check runs when you close, or when all sections are confirmed",
      ]),
    );
    expect(new Set(ngo)).toEqual(
      new Set([
        "1 section ready for Priya to confirm",
        "1 section waiting on another section",
        "2 sections still being written",
        "3 sections still being written",
        "1 blocking question Priya has not sent you yet",
        "1 blocking question waiting for your answer",
        "1 answer you sent, waiting for Priya to use",
        "2 gaps from the completion check for Priya to fix",
        "Completion check runs when Priya closes, or when all sections are confirmed",
      ]),
    );
    for (const line of ngo) {
      expect(line).not.toMatch(/for you to|when you close|check to fix|Maya/);
    }
  });

  it("hides the first question's suggested answers once the AI follows up on an answer, and does not bring them back", async () => {
    const { ngo } = open("prd-today");
    const offered = question(await snap(ngo), "retention").options;
    expect(offered.length).toBeGreaterThan(0);
    await deliver(ngo, RETENTION, {
      kind: "text",
      text: "Can a volunteer ask to be removed earlier?",
    });
    const asked = question(await snap(ngo), "retention");
    expect(asked.kind === "answering" && asked.followUp).toBe("pending");
    expect(asked.options).toEqual(offered);
    await deliver(ngo, RETENTION, { kind: "text", text: "a year" });
    const following = question(await snap(ngo), "retention");
    expect(following.kind === "answering" && following.followUp).toBe("pending");
    expect(following.options).toEqual([]);
    await deliver(ngo, RETENTION, { kind: "text", text: "Yes" });
    const settled = question(await snap(ngo), "retention");
    expect(settled.kind === "answering" && settled.followUp).toBe("none");
    expect(settled.options).toEqual([]);
  });

  it("tells Maya in her list that Priya changed the wording, with the final wording, and only then", async () => {
    const edited = "Keep contact details for one year, then delete them.";
    const changed = open("answer-complete");
    await deliver(changed.dev, MAIN, {
      kind: "use-answer",
      questionId: "retention" as QuestionId,
      answer: edited,
      note: "Apply the same rule to coordinator exports.",
    });
    const maya = present(await snap(changed.ngo));
    const used = maya.answered.find((entry) => entry.question.id === "retention");
    expect(used?.wordingChanged).toBe("Priya changed the wording:");
    expect(used?.question.kind === "used" && used.question.answer).toBe(edited);
    const priya = present(await snap(changed.dev));
    expect(priya.answered.find((entry) => entry.question.id === "retention")?.wordingChanged).toBe(
      null,
    );
    const plain = open("answer-complete");
    await deliver(plain.dev, MAIN, {
      kind: "use-answer",
      questionId: "retention" as QuestionId,
      answer: null,
      note: "Apply the same rule to coordinator exports.",
    });
    const unchanged = present(await snap(plain.ngo));
    expect(
      unchanged.answered.find((entry) => entry.question.id === "retention")?.wordingChanged,
    ).toBe(null);
  });

  it("writes every section status and blocker after close as closed, for both viewers", async () => {
    const openWork =
      /confirm\.|can confirm|Ready for|Read it|Waiting for|is answering|not posted|fix it|fixes it|settle|can use|to use it|reviews and confirms|Waits on|ready for/i;
    const today = open("prd-today");
    await deliver(today.dev, MAIN, { kind: "close-check" });
    const ask = parts(await snap(today.dev), "data-close-ask")[0];
    if (!ask) throw new Error("the check did not ask to close");
    expect((await today.dev.act(ask.data.closeAnyway)).ok).toBe(true);
    const seeded = open("closed");
    const views = [
      await snap(today.dev),
      await snap(today.ngo),
      await snap(seeded.dev),
      await snap(seeded.ngo),
    ];
    const states = new Set<string>();
    for (const view of views) {
      expect(view.close.kind).toBe("closed");
      for (const item of view.topics) {
        states.add(item.state);
        const where = `${view.viewer.role} ${item.id}`;
        expect(item.statusText, where).not.toMatch(openWork);
        expect(item.blocker ?? "", where).not.toMatch(openWork);
        if (item.state === "confirmed") {
          expect(item.statusText, where).toBe("Confirmed by Priya.");
          expect(item.blocker, where).toBeNull();
        } else {
          expect(item.statusText, where).toContain("recorded as an open point");
          expect(item.blocker, where).toBe("Recorded as an open point when the PRD closed");
        }
      }
    }
    expect(states).toContain("confirmed");
    expect(states.size).toBeGreaterThan(2);
  });

  it("counts blocking questions not posted yet wherever it says no blocking question is open", async () => {
    const today = open("prd-today");
    expect(present(await snap(today.dev)).listNote).toBe(
      "1 blocking. Keep working; use each answer when Maya marks it complete. One blocking question is not posted yet.",
    );
    const used = open("answer-complete");
    await deliver(used.dev, MAIN, {
      kind: "use-answer",
      questionId: "retention" as QuestionId,
      answer: null,
      note: "",
    });
    expect(present(await snap(used.dev)).listNote).toBe(
      "No blocking question is waiting for Maya. One blocking question is not posted yet.",
    );
    expect(present(await snap(used.ngo)).listNote).not.toMatch(/no blocking question/i);
    let record = seedRecord("all-ready", NOW);
    record = {
      ...record,
      checkRuns: 1,
      questions: record.questions.map((item) =>
        item.id === "logo" ? { ...item, blocking: true, status: "suggested" } : item,
      ),
    };
    for (const id of ["shifts", "notify", "data", "scope"]) record = confirmInRecord(record, id);
    const last = applyAction(
      record,
      "dev",
      {
        kind: "confirm-topic",
        token: issueToken(record, "confirm-topic", topicTarget("success" as TopicId)),
      },
      NOW.toISOString(),
    );
    if (!last.ok || !last.value.later)
      throw new Error("the last confirmation did not run the check");
    const checked = last.value.later.finish(last.value.record, NOW.toISOString());
    for (const role of ["dev", "ngo"] as const) {
      const main = chatText(toSnapshot(checked, { role, name: role }), MAIN);
      expect(main, role).toContain(
        "All six required topics are confirmed. No blocking question is waiting for an answer. One blocking question is not posted yet.",
      );
      expect(main, role).not.toContain("no blocking question is open");
    }
  });

  it("says a section whose completion check gap was fixed has its gap closed, and keeps Reopened for a section Priya reopened", async () => {
    const { dev, ngo } = open("prd-today");
    await deliver(dev, MAIN, { kind: "close-check" });
    const ask = parts(await snap(dev), "data-close-ask")[0];
    if (!ask) throw new Error("the check did not ask to close");
    expect((await dev.act(ask.data.keepWorking)).ok).toBe(true);
    await deliver(
      dev,
      { kind: "topic", topicId: "users" as TopicId },
      {
        kind: "text",
        text: "Volunteers under 16 need a guardian's consent before their first shift.",
      },
    );
    const fixedDev = topic(await snap(dev), "users");
    expect(fixedDev.state).toBe("needs-review");
    expect(fixedDev.statusText).toBe("Gap closed. Read it again and confirm.");
    expect(fixedDev.blocker).toBe("Gap closed · Priya reviews and confirms again");
    const fixedNgo = topic(await snap(ngo), "users");
    expect(fixedNgo.statusText).toBe("Gap closed. Ready for Priya to confirm again.");
    expect(fixedNgo.blocker).toBe("Gap closed · Priya reviews and confirms again");
    expect((await dev.act(confirmAction(await snap(dev), "users"))).ok).toBe(true);
    const reopen = topic(await snap(dev), "users").reopen;
    if (reopen.kind !== "available") throw new Error("users cannot be reopened");
    expect((await dev.act(reopen.action)).ok).toBe(true);
    expect(topic(await snap(dev), "users").statusText).toBe("Reopened. Read it again and confirm.");
    expect(topic(await snap(ngo), "users").statusText).toBe(
      "Reopened. Ready for Priya to confirm again.",
    );
    expect(topic(await snap(ngo), "users").blocker).toBe(
      "Reopened · Priya reviews and confirms again",
    );
  });

  it("says a section sent back because a section it depends on changed was updated, not reopened", async () => {
    const { dev, ngo } = open("check-passed");
    await deliver(dev, SHIFTS, { kind: "text", text: "Swaps: volunteers cancel instead" });
    const lead = "Updated because Shift scheduling rules changed";
    const line = `${lead} · Priya reviews and confirms again`;
    const held = topic(await snap(dev), "scope");
    expect(held.state).toBe("needs-review");
    expect(held.statusText).toBe(
      `${lead}. It waits on Shift scheduling rules before you can confirm it.`,
    );
    expect(held.blocker).toBe(line);
    expect((await dev.act(confirmAction(await snap(dev), "shifts"))).ok).toBe(true);
    const scopeDev = topic(await snap(dev), "scope");
    expect(scopeDev.statusText).toBe(`${lead}. Read it again and confirm.`);
    expect(scopeDev.blocker).toBe(line);
    const scopeNgo = topic(await snap(ngo), "scope");
    expect(scopeNgo.statusText).toBe(`${lead}. Ready for Priya to confirm again.`);
    expect(scopeNgo.blocker).toBe(line);
    expect(topic(await snap(dev), "shifts").statusText).not.toContain("Updated because");
  });

  it("opens a section chat with the state of the blocking question the section waits on", async () => {
    const opener = (snapshot: PrdSnapshot, id: string) =>
      chatText(snapshot, { kind: "topic", topicId: id as TopicId });
    const { dev, ngo } = open("prd-today");
    expect(opener(await snap(dev), "success")).toContain(
      "This section waits on a blocking question you have not posted to Maya yet.",
    );
    expect(opener(await snap(ngo), "success")).toContain(
      "This section waits on a blocking question Priya has not sent you yet.",
    );
    expect(opener(await snap(dev), "success")).not.toContain("waits for Maya’s answer");
    expect(opener(await snap(dev), "data")).toContain(
      "This section waits for Maya’s answer to a blocking question.",
    );
    expect(opener(await snap(ngo), "data")).toContain(
      "This section waits for your answer to a blocking question.",
    );
    const success = question(await snap(dev), "success");
    if (success.kind !== "suggested" || success.post.kind !== "available") {
      throw new Error("the success question is not offered to post");
    }
    expect((await dev.act(success.post.action)).ok).toBe(true);
    expect(opener(await snap(dev), "success")).toContain(
      "This section waits for Maya’s answer to a blocking question.",
    );
    const answered = open("answer-complete");
    expect(opener(await snap(answered.dev), "data")).toContain(
      "Maya answered its blocking question. It waits for you to use the answer.",
    );
    expect(opener(await snap(answered.ngo), "data")).toContain(
      "You answered its blocking question. It waits for Priya to use your answer.",
    );
  });

  it("starts a scenario from its seed again when the shell URL asks for fresh", async () => {
    expect(prdFixtureSelection("?scenario=prd-today&viewer=dev&fresh=1")).toMatchObject({
      scenario: "prd-today",
      viewer: "dev",
      fresh: true,
    });
    expect(prdFixtureSelection("?scenario=prd-today").fresh).toBe(false);
    expect(
      withoutFresh("http://localhost:5173/?scenario=prd-today&viewer=dev&fresh=1#prd-workspace"),
    ).toBe("http://localhost:5173/?scenario=prd-today&viewer=dev#prd-workspace");
    const storage = memoryStorage();
    const first = createPrdWorld("prd-today", { storage, pace: "test" });
    const viewer = first.viewer("dev");
    await first.saveDraft(viewer, "main", "kept across reloads");
    expect(createPrdWorld("prd-today", { storage }).snapshot(viewer).drafts.main).toBe(
      "kept across reloads",
    );
    forgetPrdWorld("prd-today", storage);
    expect(createPrdWorld("prd-today", { storage }).snapshot(viewer).drafts.main).toBeUndefined();
  });
});
