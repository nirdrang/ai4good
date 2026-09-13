import { decideProjectNeed, renderProjectNeed } from '../_shared/need-intake.ts';
import { writeRoute } from '../_shared/edge.ts';
import { organizationIdField } from '../_shared/write-routes.ts';

Deno.serve(writeRoute({
  name: 'project-need',
  target: organizationIdField,
  decide: decideProjectNeed,
  render: renderProjectNeed,
}));
