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
