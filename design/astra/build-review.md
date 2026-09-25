# Project build view, revision 2

Author: Astra. Date: 2026-09-21. Status: draft awaiting founder review.

Open `http://127.0.0.1:4310/#build` in the local prototype.

## Requirement and development hierarchy

The PM view mirrors nested requirements in the sample PRD.
Two parent requirements contain five child requirements.
The completed PRD item appears separately as setup work.
Progress counts the five child requirements once. It excludes parents and setup.

The development view opens with the first requirement materialized.
Its tree contains one dev root, two deliverables, and three buildable leaves.
Each leaf links to acceptance tests. A test is not another dev item.
The five tests remain Not run, and executable cases are not implemented.

Both views default to expandable trees.
The board layout groups buildable work by status and preserves parent paths on cards.
Selecting a dev leaf shows its requirement, dev ancestors, dependencies, and acceptance tests.
A build brief preview carries that requirement and the leaf's test identifiers.

## Pulling a requirement

Before the first pull, the dev view is empty.
The conversation preview includes a Starting point control for that state.

The PM action opens the decomposition and its acceptance specifications.
Materializing the requirement creates its dev tree and test links in local fixture state.
Repeated visits open the existing tree. They do not add duplicate dev items.
Materialization leaves verified progress unchanged.
A materialized prerequisite does not satisfy a requirement dependency.

UI leaves also retain their Design sign-off dependency.
Completing a dev tree does not automatically verify its PM requirement.
The requirement still needs implementation evidence, acceptance evidence, and the required approval.

## Basis in the controller workflow

The controller distinguishes requirements without a decomposition, materialization, open leaves, and the requirement evidence gate.
The materialization script emits deliverable parents and buildable leaves from a requirement manifest.
The authentication decomposition assigns several acceptance tests to some leaves.
Its existing parent brief retains the chain from the PM requirement through the dev root and deliverable to each leaf.

Sources:

- [Controller workflow](../../.claude/skills/controller/SKILL.md)
- [Materialization script](../../loop/work/materialize.ps1)
- [Authentication decomposition](../../loop/decomp/req-001.md)
- [Existing parent brief](../../loop/items/AI4DEV-56/brief.md)
- [Original board structure](../../loop/decomp/TREE-REVIEW.md)

The original board structure groups PM requirements by project wave.
It does not establish nested PM requirements as an existing project fact.
Nested PM requirements are the design extension requested in this review.
The sample PRD and PM tree now use the same nesting.

The current PRD contract already creates a planning package.
This revision distinguishes that package from a requirement's materialized development tree.
Acceptance specifications in the package do not prove implementation or a passing test.

## Product boundary

This is a volunteer workspace for the fixed Harbor Community Kitchen sample.
The sample remains independent of Discovery answers and funding fixtures.
All board changes occur in local fixture state.
The screen does not write to Linear, start a worktree, or run acceptance tests.

The earlier interface instructions exclude development items from platform screens.
This draft follows the founder's request to show both boards in the volunteer view.
The production interface contracts require a separate implementation change.

The inline preview now bundles the same React screen as the repository prototype.
Generate it with `bun design/astra/scripts/build-inline.mjs <absolute-output-path>`.

## Verification

- TypeScript checks and the compiled prototype build pass.
- The first materialized requirement displays all six dev items in their parent hierarchy.
- The selected leaf shows two separate acceptance tests, both Not run.
- A test search retains the dev root and deliverable above its matching leaf.
- Collapsing a deliverable hides its leaves. Expand all restores them.
- Board cards retain their requirement and deliverable paths.
- Pulling the availability requirement adds four dev items and three test links.
- Verified progress remains zero after that materialization.
- The dependent assignment requirement remains waiting.
- The state before the first pull shows zero dev items.
- Pulling the first requirement creates its six dev items.
- The narrow layout fits a 320-pixel viewport without horizontal overflow.
- Light and dark appearances render with visible hierarchy and status labels.

These checks cover the interactive fixture. They do not establish production acceptance or design approval.
