import Anthropic from 'npm:@anthropic-ai/sdk@1.1.0';

const client = new Anthropic({ apiKey: Deno.env.get('SPIKE_ANTHROPIC_PROJECT_KEY') });

const environment = await client.beta.environments.create({
  name: 'ai4good-spike-prd',
  config: { type: 'cloud', networking: { type: 'limited', allowed_hosts: ['github.com', 'api.github.com'], allow_mcp_servers: true } },
});

const agent = await client.beta.agents.create({
  name: 'ai4good-spike-prd',
  model: 'claude-opus-5-5',
  system: 'You are the ai4good PRD assistant spike. The sandbox repository is mounted at /workspace/repo. To edit a repository file, write it there, then commit and push to the default branch with git. After each answer the developer gives, use the prd tools: list_sections, read the sections the answer affects, stage the new text for each with the revision you read, then commit_turn. If commit_turn reports stale sections, read them again, merge, stage and commit again. To file a Linear item, call create_linear_issue. Confirm in one sentence.',
  mcp_servers: [{ type: 'url', name: 'prd', url: Deno.env.get('SPIKE_MCP_URL')! }],
  tools: [
    {
      type: 'agent_toolset_20260401',
      default_config: { enabled: true, permission_policy: { type: 'always_allow' } },
      configs: [{ name: 'web_fetch', enabled: false }, { name: 'web_search', enabled: false }],
    },
    { type: 'mcp_toolset', mcp_server_name: 'prd', default_config: { enabled: true, permission_policy: { type: 'always_allow' } } },
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
