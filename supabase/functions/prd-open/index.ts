import { writeRoute } from "../_shared/edge.ts";
import { decidePrdOpen, projectTarget, renderPrdFacts } from "../_shared/prd/routes.ts";

// The write-route scan matches the characters Deno.serve(writeRoute(.
// prettier-ignore
Deno.serve(writeRoute({
  name: "prd-open",
  target: projectTarget,
  decide: decidePrdOpen,
  render: renderPrdFacts,
}));
