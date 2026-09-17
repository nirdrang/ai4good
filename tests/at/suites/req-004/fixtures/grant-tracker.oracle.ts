import { parseElicitation } from '../../../../../supabase/functions/_shared/discovery-prompt.ts';

const facts = [
  { name: 'funder reporting deadlines', matches: (text: string) => /funder|grant/i.test(text) && /report/i.test(text) && /deadline|due date/i.test(text) },
  { name: 'two staff', matches: (text: string) => /two|2|both/i.test(text) && /staff|people|person|colleague/i.test(text) },
  { name: 'no developer', matches: (text: string) => /no developer|without (?:a )?developer|no .*technical|without coding/i.test(text) },
  { name: 'reminders before deadlines', matches: (text: string) => /remind|email|notif/i.test(text) && /before|advance/i.test(text) && /deadline|due|report/i.test(text) },
];
const allowed = new Set(`a an the as i we us our my one two 2 both all each every only and or to for of in on at by with without no not
want need needs should must can able be is are has have so that when before after seven 7 days day week time
staff member members person people colleague colleagues ngo developer developers technical coding code writing maintain maintenance
tool tracker track tracking funder funders grant grants reporting report reports deadline deadlines due date dates
shared same list names name add adding change changing update updating edit editing see view show shows visible
know receive receives received reach reaches sent send sends email emails addresses address reminder reminders notification notifications
prepare preparation keep up it them their ourselves themselves simple easily easy use using manage management
stored stores store information details entry entries record records save saved new existing successful success
schedule scheduled automatically automatic includes include contains display displayed upcoming sorted chronological order
from a into then given when will user users access open enter set gets get out check checks daily missing miss missed
requires require requiring does do any`.split(/\s+/));

export function grantTrackerOracleProblems(input: unknown): string[] {
  const elicitation = parseElicitation(input);
  if (!elicitation) return ['not a complete elicitation shape'];
  const problems: string[] = [];
  if (elicitation.openQuestions.length) problems.push('essential questions remain open');
  for (const fact of facts) {
    if (!elicitation.facts.some(fact.matches)) problems.push(`missing fact: ${fact.name}`);
    if (!elicitation.userStories.some((story) => fact.matches(story.story) && fact.matches(story.acceptanceCriteria.join(' ')))) {
      problems.push(`missing story or acceptance criterion: ${fact.name}`);
    }
  }
  if (!elicitation.constraints.some(facts[2].matches)) problems.push('missing no-developer constraint');
  for (const fact of elicitation.facts) {
    const concepts = facts.filter((rule) => rule.matches(fact));
    if (!concepts.length || !concepts.every((rule) => elicitation.userStories.some((story) => rule.matches(story.story) && story.acceptanceCriteria.length))) {
      problems.push(`fact has no grounded story: ${fact}`);
    }
  }
  for (const story of elicitation.userStories) {
    if (!story.acceptanceCriteria.length || story.acceptanceCriteria.some((criterion) => !criterion.trim())) problems.push('story has no usable acceptance criterion');
    const text = [story.story, ...story.acceptanceCriteria].join(' ').toLowerCase();
    const unknown = [...new Set((text.match(/[a-z]+|\d+/g) ?? []).filter((word) => !allowed.has(word)))];
    if (!facts.some((fact) => fact.matches(text)) || unknown.length) problems.push(`story exceeds intake: ${story.story} (${unknown.join(', ')})`);
    if (/remind[^.]*\bafter\b|email[^.]*\bafter\b|\b(?:not|never)\s+(?:before|two|both)\b/.test(text)) {
      problems.push(`story contradicts intake: ${story.story}`);
    }
  }
  return problems;
}
