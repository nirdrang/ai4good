import { writeRoute } from "../_shared/edge.ts";
import { openAct } from "../_shared/prd/git.ts";
import { decidePrdOpen, projectTarget, renderPrdFacts } from "../_shared/prd/routes.ts";

const githubEnv = {
  PRD_GITHUB_ORG: Deno.env.get("PRD_GITHUB_ORG"),
  GITHUB_APP_ID: Deno.env.get("GITHUB_APP_ID"),
  GITHUB_APP_PRIVATE_KEY: Deno.env.get("GITHUB_APP_PRIVATE_KEY"),
  PRD_GITHUB_REPO_VISIBILITY: Deno.env.get("PRD_GITHUB_REPO_VISIBILITY"),
};

// prettier-ignore
Deno.serve(writeRoute({
  name: "prd-open",
  target: projectTarget,
  decide: decidePrdOpen,
  render: renderPrdFacts,
  settle: { rpc: "prd_facts", act: openAct(githubEnv, fetch) },
}));
