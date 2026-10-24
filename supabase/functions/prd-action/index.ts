import { writeRoute } from "../_shared/edge.ts";
import { decidePrdAction, projectTarget, renderPrdAction } from "../_shared/prd/routes.ts";

// The write-route scan matches the characters Deno.serve(writeRoute(.
// prettier-ignore
Deno.serve(writeRoute({
  name: "prd-action",
  target: projectTarget,
  decide: decidePrdAction,
  render: renderPrdAction,
}));
