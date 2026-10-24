import { writeRoute } from "../_shared/edge.ts";
import { decidePrdMessage, projectTarget, renderPrdTurn } from "../_shared/prd/routes.ts";

// The write-route scan matches the characters Deno.serve(writeRoute(.
// prettier-ignore
Deno.serve(writeRoute({
  name: "prd-message",
  target: projectTarget,
  decide: decidePrdMessage,
  render: renderPrdTurn,
}));
