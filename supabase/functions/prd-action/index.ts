import { prdRelay, writeRoute } from "../_shared/edge.ts";
import { decidePrdAction, prdActionPrepare, projectTarget, renderPrdAction } from "../_shared/prd/routes.ts";

const relay = prdRelay();

// prettier-ignore
Deno.serve(writeRoute({
  name: "prd-action",
  target: projectTarget,
  decide: decidePrdAction,
  prepare: prdActionPrepare(relay),
  render: renderPrdAction,
}));
