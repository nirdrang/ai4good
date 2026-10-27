import { edgeHandler, prdServiceRpc } from "../_shared/edge.ts";
import { handlePrdTools } from "../_shared/prd/mcp.ts";

Deno.serve(
  edgeHandler("prd-tools", (request) =>
    handlePrdTools(request, {
      rpc: prdServiceRpc(),
      fetch,
      key: Deno.env.get("PRD_GRANT_SIGNING_KEY")?.trim() ?? "",
      now: () => Date.now(),
      env: {
        PRD_GITHUB_ORG: Deno.env.get("PRD_GITHUB_ORG"),
        GITHUB_APP_ID: Deno.env.get("GITHUB_APP_ID"),
        GITHUB_APP_PRIVATE_KEY: Deno.env.get("GITHUB_APP_PRIVATE_KEY"),
        PRD_GITHUB_REPO_VISIBILITY: Deno.env.get("PRD_GITHUB_REPO_VISIBILITY"),
      },
    }),
  ),
);
