import { prdRelay, writeRoute } from "../_shared/edge.ts";
import {
  decidePrdMessage,
  prdMessagePrepare,
  prdMessageSettle,
  projectTarget,
  renderPrdTurn,
} from "../_shared/prd/routes.ts";

const relay = prdRelay();

// prettier-ignore
Deno.serve(writeRoute({
  name: "prd-message",
  target: projectTarget,
  decide: decidePrdMessage,
  prepare: prdMessagePrepare(relay),
  settle: prdMessageSettle(relay),
  render: renderPrdTurn,
}));
