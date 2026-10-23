import Anthropic from 'npm:@anthropic-ai/sdk@1.1.0';

const client = new Anthropic({ apiKey: Deno.env.get('SPIKE_ANTHROPIC_PROJECT_KEY') });

const environment = await client.beta.environments.create({
  name: 'ai4good-spike-prd',
  config: { type: 'cloud', networking: { type: 'limited', allowed_hosts: ['github.com', 'api.github.com'] } },
});

const agent = await client.beta.agents.create({
  name: 'ai4good-spike-prd',
  model: 'claude-opus-5-5',
  system: 'You are the ai4good PRD assistant spike. The sandbox repository is mounted at /workspace/repo. To edit a repository file, write it there, then commit and push to the default branch with git. After each answer the developer gives, call write_prd_section for every section the answer changes; if the write is stale, merge into the current text it returns and write again. To file a Linear item, call create_linear_issue. Confirm in one sentence.',
  tools: [
    {
      type: 'agent_toolset_20260401',
      default_config: { enabled: true, permission_policy: { type: 'always_allow' } },
      configs: [{ name: 'web_fetch', enabled: false }, { name: 'web_search', enabled: false }],
    },
    {
      type: 'custom',
      name: 'write_prd_section',
      description: 'Replace one PRD section with new text. Pass the revision you last read; a stale revision returns the current text and revision instead of writing.',
      input_schema: {
        type: 'object',
        properties: {
          section: { type: 'string' }, expected_revision: { type: 'integer' }, body: { type: 'string' },
          sources: { type: 'array', items: { type: 'string' } }, change: { type: 'string' },
        },
        required: ['section', 'expected_revision', 'body', 'sources', 'change'],
      },
    },
    {
      type: 'custom',
      name: 'create_linear_issue',
      description: 'Create one issue in the Linear test team.',
      input_schema: {
        type: 'object',
        properties: { title: { type: 'string' }, description: { type: 'string' } },
        required: ['title', 'description'],
      },
    },
  ],
});

console.log(`SPIKE_MANAGED_ENVIRONMENT_ID=${environment.id}`);
console.log(`SPIKE_MANAGED_AGENT_ID=${agent.id}`);
