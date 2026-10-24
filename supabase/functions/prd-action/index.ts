import { writeRoute } from "../_shared/edge.ts";
import { decidePrdAction, projectTarget, renderPrdAction } from "../_shared/prd/routes.ts";

// prettier-ignore
Deno.serve(writeRoute({
  name: "prd-action",
  target: projectTarget,
  decide: decidePrdAction,
  render: renderPrdAction,
}));
