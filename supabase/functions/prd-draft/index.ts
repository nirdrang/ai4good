import { writeRoute } from "../_shared/edge.ts";
import { decidePrdDraft, projectTarget, renderPrdFacts } from "../_shared/prd/routes.ts";

// prettier-ignore
Deno.serve(writeRoute({
  name: "prd-draft",
  target: projectTarget,
  decide: decidePrdDraft,
  render: renderPrdFacts,
}));
