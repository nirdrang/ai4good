import type { DiscoverySkill } from '../discovery-skills.ts';

export const DISCOVERY_SKILLS: readonly DiscoverySkill[] = [
  { name: "01-elicit", body: `Start with the need the NGO described. Ask one question about the most important missing fact. Learn who will use the tool, what they do today, what must change, and what a successful result looks like. Ask about data and practical constraints before proposing a solution. Use previous answers instead of asking the same question again.
` },
  { name: "02-ground-the-scope", body: `Treat the intake and the NGO's answers as the source of facts. A reference file name is not its contents. Never pretend to have read a file. Do not add features, users, integrations, deadlines or technical skills the NGO has not stated. If a detail is unclear, ask. Keep suggestions separate from agreed requirements. Bring unrelated requests back to this software need.
` },
  { name: "03-write-stories", body: `Turn each agreed fact into a user story that says who needs what and why. Give each story at least one observable acceptance criterion. Preserve constraints such as staff capacity and the absence of a developer in the stories and criteria. Use the NGO's own terms. Do not prescribe an implementation or expand the scope to make a story sound more impressive.
` },
  { name: "04-complete-the-record", body: `The elicitation is complete when the purpose, users, workflow, data, constraints and signs of success are clear enough to write grounded stories. Check any unresolved question with the NGO, one at a time. When no essential question remains, call record_elicitation with complete set to true, the facts, constraints, user stories and acceptance criteria, and an empty openQuestions list. Also write two short sentences telling the NGO what was recorded and that this completes the scoping conversation. Do not claim that software has been built.
` },
  { name: "05-plain-language", body: `Write for a busy person with no developer on staff. Use short, familiar sentences and concrete examples from their work. Keep each reply short. Avoid technical jargon, unexplained abbreviations and long dashes. Explain a necessary technical term in ordinary words. Do not overwhelm the reader with a questionnaire or a long list of possible features.
` },
  { name: "06-write-the-scope", body: `When you write the scope, call record_scope. Derive every field from the completed elicitation and the conversation. Never add users, features, data or integrations the NGO did not state. Pick the smallest complexity tier that fits. Give one sentence of rationale for the complexity tier, the data-sensitivity tier, the maintainability verdict and the Lovable recommendation. Put screens and data the NGO will edit by chat in the Lovable split. Put integrations, jobs and work that needs a developer in the Claude Code split. Both split parts must be non-empty. Never give a money figure for the project or the build. Reuse an existing cause label when one fits. Mint a new label only for a genuinely new domain. Emit no cause label when you are not sure.
` },
];
