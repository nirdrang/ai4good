import {
  KEY_TOPICS,
  openingDocument,
  plannedOpeningTopics,
  type BriefVersion,
  type TopicPlan,
} from '../../../supabase/functions/_shared/discovery-brief.ts';

export const TEST_TOPIC_PLAN: TopicPlan = {
  keyTopics: {
    priority: {
      question: 'What should improve first?',
      options: ['Less coordination time', 'Fewer unfilled shifts'],
      suggested: 'Less coordination time',
      recommendation: 'Suggested: less coordination time. Your intake says scheduling takes four hours each week.',
      uncertaintyHelp: 'To find out: ask your coordinators which problem causes the most work.',
    },
    info: {
      question: 'What volunteer information will the tool keep?',
      options: ['Name and phone only', 'Name, phone and email'],
      suggested: 'Name and phone only',
      recommendation: 'Suggested: name and phone are enough to fill a shift.',
      uncertaintyHelp: 'To find out: list the fields your rota uses today.',
    },
    owner: {
      question: 'Who will look after the tool?',
      options: ['Our operations lead', 'Our coordinators'],
      suggested: 'Our operations lead',
      recommendation: 'Suggested: your operations lead already handles access.',
      uncertaintyHelp: 'To find out: ask who fixes a problem when a coordinator is away.',
    },
  },
  topics: [
    {
      id: 'booking',
      dependsOn: [],
      title: 'Who books shifts',
      why: 'This decides who needs access and which rules we ask about next.',
      question: 'Who should book volunteers into shifts?',
      options: ['Volunteers book themselves', 'Coordinators book shifts'],
      suggested: 'Volunteers book themselves',
      recommendation: 'Suggested: volunteers book themselves, and coordinators handle exceptions.',
      uncertaintyHelp: 'To find out: check whether your volunteers can book online.',
    },
    {
      id: 'measure',
      dependsOn: ['priority'],
      title: 'Success measure',
      why: 'You can use this target to check whether the first version helps.',
      question: 'What weekly scheduling time would count as success?',
      options: ['Two hours a week, down from four', 'One hour a week'],
      suggested: 'Two hours a week, down from four',
      recommendation: 'Suggested: two hours a week, down from four.',
      uncertaintyHelp: 'To find out: ask the people who schedule shifts how long last week took.',
    },
    {
      id: 'rules',
      dependsOn: ['booking'],
      title: 'Booking rules',
      why: 'Clear limits keep the rota fair, whoever books the shifts.',
      question: 'Which booking rules should the tool enforce?',
      options: ['Weekly shift limit', 'No weekly limit'],
      suggested: 'Weekly shift limit',
      recommendation: 'Suggested: a weekly shift limit keeps the rota fair.',
      uncertaintyHelp: 'To find out: ask how many shifts one volunteer may take.',
    },
  ],
  fileExamples: ['rota', 'sign-up sheet', 'volunteer rules'],
};

export const TEST_TOPIC_IDS: readonly string[] = plannedOpeningTopics(TEST_TOPIC_PLAN).map((topic) => topic.id);


export function testOpening(need: string): BriefVersion {
  const topics = plannedOpeningTopics(TEST_TOPIC_PLAN).map((topic) => topic.id === 'info' ? { ...topic, dependsOn: ['owner'] } : topic);
  return openingDocument({ need, topics });
}

export function planToolInput(plan: TopicPlan): { topics: Record<string, unknown>[]; fileExamples: string[] } {
  return {
    topics: [
      ...KEY_TOPICS.map((key) => ({ id: key.id, title: key.title, why: key.why, dependsOn: [], ...plan.keyTopics[key.id] })),
      ...plan.topics,
    ],
    fileExamples: plan.fileExamples,
  };
}
