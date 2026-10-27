import { expect, it } from "vitest";
import { snapshotFromRecord } from "../../../supabase/functions/_shared/prd/snapshot.ts";

const QUESTION = {
  id: "q1",
  section: "data",
  text: "How long should the kitchen keep contact details?",
  why: "Only the kitchen can decide this.",
  blocking: true,
  options: ["12 months", "24 months"],
  anchors: [],
  introMessage: "m1",
  followUpOpen: false,
  answer: null,
  answerVersion: null,
  post: { allowed: false, reason: "forbidden", token: null },
  complete: { allowed: false, reason: "forbidden" },
  use: { allowed: false, reason: "forbidden" },
};

const FUNDS = {
  allocationMicros: 20_000_000,
  settledMicros: 11_150_000,
  pendingMicros: 50_000,
  replyHoldMicros: 50_000,
  availableMicros: 8_800_000,
  overrunMicros: 0,
  band: "green",
  replyFunded: true,
};

function record(questions: unknown[]) {
  return {
    sequence: 3,
    revision: 1,
    discoveryRevision: 1,
    people: [
      { role: "ai", name: "ai4good AI", label: "AI" },
      { role: "dev", name: "Priya Shah", label: "Developer" },
      { role: "ngo", name: "Maya Levi", label: "NGO" },
    ],
    project: { title: "Volunteer scheduling", organizationName: "Harbor Community Kitchen" },
    sections: [],
    chats: [],
    drafts: {},
    funds: FUNDS,
    devQuestions: [
      {
        id: "d1",
        section: "shifts",
        text: "Can volunteers swap?",
        why: "It decides the screens.",
        options: ["Yes", "No"],
        suggested: "Yes",
        answered: null,
        anchors: [],
      },
    ],
    questions,
  };
}

const DEV = { role: "dev", name: "Priya Shah" } as const;
const NGO = { role: "ngo", name: "Maya Levi" } as const;

it("maps the developer questions as the facts give them", () => {
  expect(snapshotFromRecord(record([]), DEV).devQuestions).toEqual([
    {
      id: "d1",
      topicId: "shifts",
      text: "Can volunteers swap?",
      why: "It decides the screens.",
      options: ["Yes", "No"],
      suggested: "Yes",
      answered: null,
    },
  ]);
});

it("offers post with the token the facts carry, and names the developer when it is refused", () => {
  const token = "post-question|question:q1|1|2";
  const offered = snapshotFromRecord(
    record([{ ...QUESTION, status: "suggested", post: { allowed: true, reason: null, token } }]),
    DEV,
  ).questions[0];
  expect(offered).toMatchObject({
    kind: "suggested",
    topicId: "data",
    introTurn: "m1",
    post: { kind: "available", action: { kind: "post-question", token } },
  });
  const refused = snapshotFromRecord(record([{ ...QUESTION, status: "suggested" }]), NGO)
    .questions[0];
  expect(refused).toMatchObject({
    kind: "suggested",
    post: { kind: "unavailable", reason: "Only Priya posts questions to Maya." },
  });
});

it("reads an open follow-up, the latest answer, and who may use it", () => {
  const answering = snapshotFromRecord(
    record([
      {
        ...QUESTION,
        status: "answering",
        followUpOpen: true,
        complete: { allowed: false, reason: "follow-up-open" },
      },
    ]),
    NGO,
  ).questions[0];
  expect(answering).toMatchObject({
    kind: "answering",
    followUp: "pending",
    complete: { kind: "unavailable", reason: "Answer the AI’s question first." },
  });
  const complete = snapshotFromRecord(
    record([
      {
        ...QUESTION,
        status: "complete",
        answer: "A year.",
        answerVersion: 1,
        use: { allowed: true, reason: null },
      },
    ]),
    DEV,
  ).questions[0];
  expect(complete).toMatchObject({ kind: "complete", answer: "A year.", canUse: true });
  const used = snapshotFromRecord(
    record([{ ...QUESTION, status: "used", answer: "A year.", answerVersion: 1 }]),
    NGO,
  ).questions[0];
  expect(used).toMatchObject({ kind: "used", answer: "A year.", briefTurn: "m1", changed: false });
});

it("maps who can send from the facts, in the screen's words", () => {
  const snap = snapshotFromRecord(
    {
      ...record([]),
      chats: [
        { key: "main", messages: [], canWrite: true, send: { allowed: true, reason: null } },
        {
          key: "topic:booking",
          messages: [],
          canWrite: false,
          send: { allowed: false, block: "role", reason: "only-dev" },
        },
        {
          key: "side:q1",
          messages: [],
          canWrite: false,
          send: { allowed: false, block: "role", reason: "only-ngo" },
        },
        {
          key: "side:q2",
          messages: [],
          canWrite: false,
          send: { allowed: false, block: "role", reason: "not-open" },
        },
        {
          key: "topic:rules",
          messages: [],
          canWrite: false,
          send: { allowed: false, block: "closed", reason: "closed" },
        },
        {
          key: "side:q3",
          messages: [],
          canWrite: true,
          send: { allowed: false, block: "busy", reason: "busy" },
        },
      ],
    },
    DEV,
  );
  expect(snap.canWrite).toEqual({
    main: true,
    "topic:booking": false,
    "side:q1": false,
    "side:q2": false,
    "topic:rules": false,
    "side:q3": true,
  });
  expect(snap.send.main).toEqual({ kind: "available" });
  expect(snap.send["topic:booking"]).toEqual({
    kind: "unavailable",
    block: "role",
    reason: "Only Priya writes to the AI here.",
  });
  expect(snap.send["side:q1"]).toEqual({
    kind: "unavailable",
    block: "role",
    reason: "Only Maya answers in her side chat.",
  });
  expect(snap.send["side:q2"]).toEqual({
    kind: "unavailable",
    block: "role",
    reason: "This question is not open for an answer.",
  });
  expect(snap.send["topic:rules"]).toEqual({
    kind: "unavailable",
    block: "closed",
    reason: "The PRD is closed.",
  });
  expect(snap.send["side:q3"]).toEqual({
    kind: "unavailable",
    block: "busy",
    reason: "The AI is still answering in this chat.",
  });
});

it("offers complete-answer when the facts allow it, and keeps the existing refusal sentences", () => {
  const token = "complete-answer|question:q1|1|4";
  const offered = snapshotFromRecord(
    record([
      {
        ...QUESTION,
        status: "answering",
        complete: { allowed: true, reason: null, token },
      },
    ]),
    NGO,
  ).questions[0];
  expect(offered).toMatchObject({
    kind: "answering",
    complete: { kind: "available", action: { kind: "complete-answer", token } },
  });
  const reasonFor = (reason: string) =>
    snapshotFromRecord(
      record([{ ...QUESTION, status: "answering", complete: { allowed: false, reason } }]),
      NGO,
    ).questions[0];
  expect(reasonFor("invalid-request")).toMatchObject({
    kind: "answering",
    complete: { kind: "unavailable", reason: "Write your answer first." },
  });
  expect(reasonFor("busy")).toMatchObject({
    kind: "answering",
    complete: { kind: "unavailable", reason: "The AI is still answering." },
  });
  expect(reasonFor("forbidden")).toMatchObject({
    kind: "answering",
    complete: { kind: "unavailable", reason: "Only Maya marks her answer complete." },
  });
  expect(reasonFor("stale")).toMatchObject({
    kind: "answering",
    complete: {
      kind: "unavailable",
      reason: "The PRD changed since this was offered. Use the current version.",
    },
  });
});

it("maps the funds the facts give, and says why a reply is not funded", () => {
  const funded = snapshotFromRecord(record([]), DEV);
  expect(funded.funds).toEqual({
    allocationMicros: 20_000_000,
    settledMicros: 11_150_000,
    pendingMicros: 50_000,
    replyHoldMicros: 50_000,
    availableMicros: 8_800_000,
    band: "green",
    replyFunded: true,
  });
  const out = snapshotFromRecord(
    {
      ...record([
        {
          ...QUESTION,
          status: "answering",
          complete: { allowed: false, reason: "funds", token: null },
        },
      ]),
      funds: {
        ...FUNDS,
        settledMicros: 20_030_000,
        availableMicros: -80_000,
        overrunMicros: 30_000,
        band: "red",
        replyFunded: false,
      },
      chats: [
        {
          key: "main",
          messages: [],
          canWrite: true,
          send: { allowed: false, block: "funds", reason: "funds" },
        },
      ],
    },
    NGO,
  );
  expect(out.funds).toMatchObject({ availableMicros: 0, band: "red", replyFunded: false });
  expect(out.canWrite.main).toBe(true);
  expect(out.send.main).toEqual({
    kind: "unavailable",
    block: "funds",
    reason: "Not enough left for another AI reply. The kitchen adds funds to continue.",
  });
  expect(out.questions[0]).toMatchObject({
    kind: "answering",
    complete: {
      kind: "unavailable",
      reason: "Not enough left for another AI reply. The kitchen adds funds to continue.",
    },
  });
  for (const funds of [undefined, { ...FUNDS, band: "blue" }, { ...FUNDS, settledMicros: 1.5 }]) {
    expect(() => snapshotFromRecord({ ...record([]), funds }, DEV)).toThrow();
  }
});

function topic(key: string, state: string, confirm: unknown, reopen: unknown) {
  return {
    key,
    title: key,
    required: true,
    state,
    document: { statements: [{ text: "One line.", sources: ["Discovery revision 1"] }], decisions: [] },
    confirm,
    reopen,
  };
}

it("offers confirm and reopen from the facts, and withholds both from the NGO", () => {
  const confirmToken = "confirm-topic|topic:booking|1|0";
  const reopenToken = "reopen-topic|topic:rules|1|0";
  const sections = [
    topic("booking", "ready", { allowed: true, reason: null, token: confirmToken }, {
      allowed: false,
      reason: "not-confirmed",
      token: null,
    }),
    topic("rules", "confirmed", { allowed: false, reason: "not-ready", token: null }, {
      allowed: true,
      reason: null,
      token: reopenToken,
    }),
  ];
  const dev = snapshotFromRecord({ ...record([]), sections }, DEV);
  expect(dev.topics[0]).toMatchObject({
    id: "booking",
    state: "ready",
    confirm: { kind: "available", action: { kind: "confirm-topic", token: confirmToken } },
    reopen: { kind: "unavailable", reason: "This section is not confirmed." },
  });
  expect(dev.topics[1]).toMatchObject({
    id: "rules",
    state: "confirmed",
    confirm: { kind: "unavailable", reason: "This section is not ready to confirm." },
    reopen: { kind: "available", action: { kind: "reopen-topic", token: reopenToken } },
  });
  const ngo = snapshotFromRecord(
    {
      ...record([]),
      sections: [
        topic("booking", "ready", { allowed: false, reason: "forbidden", token: null }, {
          allowed: false,
          reason: "forbidden",
          token: null,
        }),
        topic("rules", "confirmed", { allowed: false, reason: "forbidden", token: null }, {
          allowed: false,
          reason: "closed",
          token: null,
        }),
      ],
    },
    NGO,
  );
  expect(ngo.topics[0]).toMatchObject({
    confirm: { kind: "unavailable", reason: "Only Priya confirms sections." },
    reopen: { kind: "unavailable", reason: "Only Priya reopens sections." },
  });
  expect(ngo.topics[1]).toMatchObject({
    confirm: { kind: "unavailable", reason: "Only Priya confirms sections." },
    reopen: { kind: "unavailable", reason: "The PRD is closed." },
  });
});
