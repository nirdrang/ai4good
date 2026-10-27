import {
  MANAGED_API,
  managedHeaders,
  prdAgentDefinition,
  prdEnvironmentDefinition,
} from "../supabase/functions/_shared/prd/managed.ts";

function env(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`set ${name}`);
  return value;
}

const apiKey = env("ANTHROPIC_API_KEY");
const toolsUrl = env("PRD_TOOLS_PUBLIC_URL");
if (!/^https:\/\/[^\s/]+/i.test(toolsUrl))
  throw new Error("PRD_TOOLS_PUBLIC_URL is an https address");

async function create(path: string, body: Record<string, unknown>): Promise<string> {
  const response = await fetch(`${MANAGED_API}${path}`, {
    method: "POST",
    headers: managedHeaders(apiKey),
    body: JSON.stringify(body),
  });
  const text = await response.text();
  if (!response.ok) throw new Error(`${path} answered ${response.status}: ${text}`);
  const id = (JSON.parse(text) as { id?: unknown }).id;
  if (typeof id !== "string" || id === "") throw new Error(`${path} answered without an id`);
  return id;
}

const environmentId = await create("/v1/environments", prdEnvironmentDefinition());
const agentId = await create("/v1/agents", prdAgentDefinition(toolsUrl));

console.log(`PRD_MANAGED_ENVIRONMENT_ID=${environmentId}`);
console.log(`PRD_MANAGED_AGENT_ID=${agentId}`);
