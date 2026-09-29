import { completeReply, initialState, type Answers, type MockState, type QuestionId } from "./model";
import { currentQuestions } from "./questions";

export const discoveryExamples = [
  { id: "guided", target: "interview", label: "Guided interview", note: "Start with three independent questions in one round. Choose trained roles to reveal a dependent question next." },
  { id: "followup", target: "interview", label: "A dependent follow-up", note: "This example starts at 83%. Training approval keeps booking rules open. Notice the single question asking who checks training." },
  { id: "uncertain", target: "interview", label: "An uncertain answer", note: "The NGO said they were not sure about booking rules. Coverage stays at 83%, and the AI keeps that question open." },
  { id: "free-low", target: "usage", label: "Free allowance low · 2 replies left", note: "Starts with 2 free replies and a yellow daily gauge at 80%. Free replies come first; paid fuel remains untouched." },
  { id: "paid-yellow", target: "usage", label: "Paid fuel low · 80% used", note: "Starts with a yellow gauge and $10.00 left. The next reply uses paid fuel because today's free allowance is exhausted." },
  { id: "paid-red", target: "usage", label: "Paid fuel critical · 97% used", note: "Starts with a red gauge and $1.50 left. That still covers the $0.25 hold, so paid replies remain available." },
  { id: "insufficient", target: "usage", label: "Too little fuel · $0.10 left", note: "Starts with $0.10, below the $0.25 hold. Notice “Not available now”. The draft stays saved while sending is paused." },
  { id: "beta-empty", target: "usage", label: "Beta allowance exhausted", note: "Starts with 0 of 50 beta replies and $0.00 fuel. A daily reset cannot restore beta replies. You can still finish Discovery." },
  { id: "ready-empty", target: "progress", label: "Ready to finish · no fuel", note: "Starts at 100% with no free replies or paid fuel. Finish Discovery stays active because review and confirmation are free." },
];

function answerRound(state: MockState, selected: Partial<Record<QuestionId, string>>) {
  const submitted: Answers = {};
  for (const question of currentQuestions(state.answers)) {
    const choice = selected[question.id];
    const option = question.options.find((candidate) => candidate.id === choice);
    if (option) submitted[question.id] = { choice: option.id, text: option.answer, certain: true };
    else if (choice === "uncertain")
      submitted[question.id] = { choice, text: "I'm not sure yet.", certain: false };
  }
  return completeReply(state, submitted, "free");
}

export function discoveryExample(id: string): MockState {
  let state = answerRound({ ...initialState(), phase: "discovery" }, {
    priority: "time", booking: "self", owner: "operations",
  });
  if (id === "followup" || id === "uncertain" || id === "ready-empty") {
    state = answerRound(state, {
      measure: "two", data: "ordinary",
      rules: id === "followup" ? "trained" : id === "uncertain" ? "uncertain" : "open",
    });
  }
  if (id === "free-low") state.usage = { ...state.usage, dailyUsed: 8, betaUsed: 38 };
  if (id === "paid-yellow" || id === "paid-red" || id === "insufficient") {
    state.usage = {
      ...state.usage, dailyUsed: 10, betaUsed: 38, allocation: 50_000_000,
      spent: id === "paid-yellow" ? 40_000_000 : id === "paid-red" ? 48_500_000 : 49_900_000,
    };
  }
  if (id === "beta-empty" || id === "ready-empty")
    state.usage = { ...state.usage, dailyUsed: 10, betaUsed: 50, allocation: 0, spent: 0 };
  return state;
}
