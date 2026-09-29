import type { Answers, QuestionId } from "./model";

export type Question = {
  id: QuestionId;
  title: string;
  text: string;
  reason: string;
  recommendation: string;
  uncertaintyHelp: string;
  dependencies: QuestionId[];
  options: { id: string; label: string; answer: string }[];
};
const option = (id: string, label: string, answer: string) => ({ id, label, answer });

export function questions(answers: Answers): Question[] {
  const selfBooking = answers.booking?.choice === "self";
  const coverage = answers.priority?.choice === "coverage";
  const customBooking = answers.booking?.choice === "custom";
  const list: Question[] = [
    {
      id: "priority",
      title: "Main priority",
      text: "What should improve first?",
      reason: "A clear priority keeps the first version small and useful.",
      recommendation: "Start with less coordination time. Your intake says scheduling takes four hours each week.",
      uncertaintyHelp: "Ask your coordinators which problem causes the most work: filling shifts or finding gaps.",
      dependencies: [],
      options: [
        option(
          "time",
          "Less coordination time",
          "Reduce the time coordinators spend filling shifts.",
        ),
        option("coverage", "Fewer unfilled shifts", "Fill volunteer shifts before they start."),
      ],
    },
    {
      id: "booking",
      title: "Who books shifts",
      text: "Who should book volunteers into shifts?",
      reason: "This determines who needs access and which booking rules we ask about next.",
      recommendation: "Let volunteers book themselves if they can use the tool. Coordinators should still manage exceptions.",
      uncertaintyHelp: "Check whether your volunteers can book online. Keep coordinator booking if they need help.",
      dependencies: [],
      options: [
        option(
          "coordinators",
          "Coordinators book shifts",
          "The NGO coordinators book volunteers into shifts.",
        ),
        option("self", "Volunteers book themselves", "Volunteers book their own shifts."),
      ],
    },
    {
      id: "owner",
      title: "Maintenance owner",
      text: "Who will look after the tool?",
      reason: "Your organisation needs someone to manage access and routine changes after handoff.",
      recommendation: "Name the operations lead if they already manage access and volunteer processes. Confirm their availability.",
      uncertaintyHelp: "Ask who can maintain access and routine settings after the volunteer developer leaves.",
      dependencies: [],
      options: [
        option(
          "coordinators",
          "Our coordinators",
          "The coordinators manage access and routine changes.",
        ),
        option(
          "operations",
          "Our operations lead",
          "The operations lead manages access and routine changes.",
        ),
      ],
    },
    {
      id: "measure",
      title: "Success measure",
      dependencies: ["priority"],
      text: coverage
        ? "How many shifts should be filled two days ahead?"
        : answers.priority?.choice === "custom"
          ? "Which measure will show that your chosen priority improved?"
          : "What weekly scheduling time would count as success?",
      reason: "You can use this target to check whether the first version helps.",
      recommendation: coverage
        ? "Start with 90% of shifts filled two days ahead. Confirm a target you can measure in the first month."
        : answers.priority?.choice === "custom"
          ? "Choose a first-month target that measures your stated priority. Use time saved only if that is the intended result."
          : "Start with two hours a week, down from four. Check the result after the first month.",
      uncertaintyHelp: "Use your current weekly scheduling time as the baseline. Ask the coordinators for a realistic first-month target.",
      options: coverage
        ? [
            option(
              "ninety",
              "90% of shifts",
              "Fill 90% of shifts two days ahead in the first month.",
            ),
            option(
              "ninetyfive",
              "95% of shifts",
              "Fill 95% of shifts two days ahead in the first month.",
            ),
          ]
        : answers.priority?.choice === "custom"
          ? [
              option(
                "two",
                "Time saved each week",
                "Reduce weekly scheduling from four hours to two in the first month.",
              ),
              option(
                "ninety",
                "Shifts filled in advance",
                "Fill 90% of shifts two days ahead in the first month.",
              ),
            ]
          : [
              option(
                "two",
                "Two hours a week",
                "Reduce weekly scheduling from four hours to two in the first month.",
              ),
              option(
                "one",
                "One hour a week",
                "Reduce weekly scheduling from four hours to one in the first month.",
              ),
            ],
    },
    {
      id: "rules",
      title: "Booking rules",
      recommendation: selfBooking
        ? "Keep any training restrictions you already use. Choose open shifts only if every volunteer can do every role."
        : customBooking
          ? "Start with coordinator approval until your team agrees which bookings need no approval."
          : "Keep the access rules your coordinators use today. Give access only to the sites they need.",
      uncertaintyHelp: selfBooking
        ? "Ask the person who fills shifts whether any role requires training. We will keep booking rules open until they confirm."
        : "Ask your operations lead which sites each coordinator manages. We will keep access rules open until they confirm.",
      dependencies: ["booking"],
      text: selfBooking
        ? "Can every volunteer book every type of shift?"
        : customBooking
          ? "Which restriction should apply to your booking process?"
          : "Can each coordinator manage every site?",
      reason: selfBooking
        ? "Some roles may require training. Keep the rules you use today."
        : customBooking
          ? "Your custom answer does not specify access rules. Confirm them before we complete the brief."
          : "This determines which schedules and volunteer details each coordinator can see.",
      options: selfBooking
        ? [
            option(
              "trained",
              "Some shifts need training",
              "Only volunteers with confirmed training can book trained roles.",
            ),
            option("open", "Every shift is open", "All volunteers can book all shift types."),
          ]
        : customBooking
          ? [
              option(
                "approval",
                "Coordinator approval required",
                "An NGO coordinator approves each booking.",
              ),
              option(
                "no-extra",
                "No additional restrictions",
                "No additional booking restrictions are required.",
              ),
            ]
          : [
              option(
                "shared",
                "Coordinators manage all sites",
                "Coordinators can manage schedules at every site.",
              ),
              option(
                "assigned",
                "Each has assigned sites",
                "Each coordinator manages only their assigned sites.",
              ),
            ],
    },
    {
      id: "data",
      title: "Information handled",
      recommendation: "Keep only the details needed to arrange shifts. Names and contact details may be enough for this project.",
      uncertaintyHelp: "Check your existing blank scheduling form with the operations lead. Do not paste real volunteer records into this chat.",
      text: "What information will the tool hold?",
      reason:
        "This determines the access safeguards and what sample data we can use during the build.",
      dependencies: ["owner"],
      options: [
        option(
          "none",
          "Schedules only, no personal details",
          "The tool stores schedules without names or personal details.",
        ),
        option(
          "ordinary",
          "Volunteer names and contact details",
          "The tool stores ordinary volunteer names and contact details.",
        ),
        option(
          "sensitive",
          "Sensitive records or large personal datasets",
          "The tool may handle sensitive records or large personal datasets. Build with fictional or anonymized records only.",
        ),
      ],
    },
  ];
  if (selfBooking && answers.rules?.choice === "trained")
    list.push({
      id: "training",
      title: "Training approval",
      recommendation: "Use NGO coordinators if they already check training. Otherwise, name your training lead.",
      uncertaintyHelp: "Ask who currently checks training before a volunteer takes a trained role. This person must confirm the responsibility.",
      dependencies: ["booking", "rules"],
      text: "Who confirms a volunteer's training?",
      reason: "You chose trained roles. The tool needs a named person who can confirm eligibility.",
      options: [
        option("coordinators", "NGO coordinators", "NGO coordinators confirm training."),
        option("lead", "Our training lead", "The NGO training lead confirms training."),
      ],
    });
  return list;
}

function answered(answers: Answers, id: QuestionId): boolean {
  return Boolean(answers[id]?.certain && answers[id]?.text.trim());
}

export function currentQuestions(answers: Answers): Question[] {
  return questions(answers)
    .filter((q) => !answered(answers, q.id) && q.dependencies.every((id) => answered(answers, id)))
    .sort((a, b) => Number(Boolean(answers[a.id])) - Number(Boolean(answers[b.id])));
}
export function briefReady(answers: Answers): boolean {
  return questions(answers).every((q) => answered(answers, q.id));
}

export function discoveryProgress(answers: Answers) {
  const all = questions(answers);
  const trainingRequired = all.some((question) => question.id === "training");
  const topics = all
    .filter((question) => question.id !== "training")
    .map((question) => ({
      id: question.id,
      title: question.title,
      complete:
        answered(answers, question.id) &&
        (question.id !== "rules" || !trainingRequired || answered(answers, "training")),
      detail:
        question.id === "rules" && trainingRequired && !answered(answers, "training")
          ? "Training approval still needs an owner."
          : "",
    }));
  const completed = topics.filter((topic) => topic.complete).length;
  return {
    topics,
    completed,
    total: topics.length,
    percent: Math.round((completed / topics.length) * 100),
  };
}

export function discoveryDataTier(answers: Answers): 0 | 1 | 2 {
  const data = answers.data;
  return !data?.certain || data.choice === "sensitive" || data.choice === "custom"
    ? 2
    : data.choice === "none"
      ? 0
      : 1;
}
