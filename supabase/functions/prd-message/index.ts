import { writeRoute } from "../_shared/edge.ts";
import { decidePrdMessage, projectTarget, renderPrdTurn } from "../_shared/prd/routes.ts";

// prettier-ignore
Deno.serve(writeRoute({
  name: "prd-message",
  target: projectTarget,
  decide: decidePrdMessage,
  render: renderPrdTurn,
}));
