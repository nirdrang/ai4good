import { useState, type ReactNode } from "react";
import {
  ArrowRight,
  BookOpen,
  Check,
  ChevronDown,
  ChevronRight,
  Circle,
  ClipboardList,
  FileCheck2,
  FileText,
  Folder,
  GitBranch,
  Kanban,
  Leaf,
  ListTree,
  LockKeyhole,
  Search,
  TestTube2,
  X,
} from "lucide-react";
import {
  acceptanceTests,
  devByCode,
  developmentPlans,
  devLeaves,
  flattenDev,
  itemLabel,
  requirementParents,
  requirements,
  type AcceptanceTest,
  type DevItem,
  type Requirement,
  type RequirementId,
  type RequirementParent,
} from "./build-fixtures";
import "./project-build.css";

type Board = "pm" | "dev" | "prd";
type Selection =
  | { kind: "pm"; item: Requirement; review: boolean }
  | { kind: "parent"; item: RequirementParent }
  | { kind: "dev"; requirementId: RequirementId; item: DevItem; brief: boolean }
  | { kind: "setup" }
  | { kind: "guide" };
type Stage = { label: string; tone: "green" | "amber" | "muted" };
const blocked = (item: DevItem) =>
  item.kind === "leaf" && (item.blockers.length > 0 || item.design !== null);

function Pill({ children, tone = "muted" }: { children: ReactNode; tone?: Stage["tone"] }) {
  return <span className={`pb-pill ${tone}`}>{children}</span>;
}
function TestList({ tests }: { tests: AcceptanceTest[] }) {
  return (
    <ul className="pb-tests">
      {tests.map((test) => (
        <li key={test.id}>
          <div>
            <TestTube2 size={14} />
            <span>{test.id}</span>
            <Pill>Not run</Pill>
          </div>
          <h4>{test.title}</h4>
          <p>{test.expected}</p>
        </li>
      ))}
    </ul>
  );
}
function TreeRow({
  label,
  title,
  icon,
  meta,
  status,
  selected,
  onSelect,
  expanded,
  onToggle,
  children,
}: {
  label: string;
  title: string;
  icon: ReactNode;
  meta: ReactNode;
  status?: ReactNode;
  selected: boolean;
  onSelect: () => void;
  expanded?: boolean;
  onToggle?: () => void;
  children?: ReactNode;
}) {
  return (
    <li className="pb-tree-item">
      <div className={`pb-tree-row ${selected ? "selected" : ""}`}>
        {onToggle ? (
          <button
            type="button"
            className="pb-expander"
            aria-label={`${expanded ? "Collapse" : "Expand"} ${label}`}
            aria-expanded={expanded}
            onClick={onToggle}
          >
            {expanded ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
          </button>
        ) : (
          <span className="pb-expander-space" />
        )}
        <button type="button" className="pb-row-select" onClick={onSelect} aria-pressed={selected}>
          <span className="pb-row-icon">{icon}</span>
          <span className="pb-row-copy">
            <span className="pb-code">{label}</span>
            <strong>{title}</strong>
            <span className="pb-meta">{meta}</span>
          </span>
          {status && <span className="pb-row-status">{status}</span>}
        </button>
      </div>
      {expanded && children && <ul className="pb-children">{children}</ul>}
    </li>
  );
}

export function ProjectBuild({
  notify,
  initialMaterialized = true,
}: {
  notify: (message: string) => void;
  initialMaterialized?: boolean;
}) {
  const [board, setBoard] = useState<Board>(initialMaterialized ? "dev" : "pm");
  const [layout, setLayout] = useState<"tree" | "board">("tree");
  const [materialized, setMaterialized] = useState<Set<RequirementId>>(
    () => new Set(initialMaterialized ? ["shifts"] : []),
  );
  const [collapsed, setCollapsed] = useState<Set<string>>(() => new Set());
  const [query, setQuery] = useState("");
  const [selection, setSelection] = useState<Selection | null>(() => {
    const firstLeaf = devLeaves(developmentPlans.shifts)[0];
    return initialMaterialized && firstLeaf
      ? { kind: "dev", requirementId: "shifts", item: firstLeaf, brief: false }
      : { kind: "pm", item: requirements.shifts, review: false };
  });
  const [notice, setNotice] = useState("");
  const activeRequirements = Object.values(requirements).filter((item) =>
    materialized.has(item.id),
  );
  const devCount = activeRequirements.reduce(
    (sum, req) => sum + flattenDev(developmentPlans[req.id]).length,
    0,
  );
  const leafCount = activeRequirements.reduce(
    (sum, req) => sum + devLeaves(developmentPlans[req.id]).length,
    0,
  );
  const testCount = activeRequirements.reduce(
    (sum, req) => sum + acceptanceTests(developmentPlans[req.id]).length,
    0,
  );
  const search = query.trim().toLowerCase();
  const matches = (value: string) => value.toLowerCase().includes(search);
  const selectedCode = selection && "item" in selection ? selection.item.code : null;
  function pmStage(item: Requirement): Stage {
    if (materialized.has(item.id)) return { label: "In progress", tone: "green" };
    return item.blockers.length
      ? { label: "Waiting", tone: "amber" }
      : { label: "Ready to pull", tone: "muted" };
  }
  function toggle(code: string) {
    setCollapsed((previous) => {
      const next = new Set(previous);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
  }
  function select(next: Selection) {
    setSelection(next);
    setNotice("");
  }
  function openPm(item: Requirement) {
    setBoard("pm");
    select({ kind: "pm", item, review: false });
  }
  function openDev(requirementId: RequirementId, item: DevItem) {
    setBoard("dev");
    select({ kind: "dev", requirementId, item, brief: false });
  }
  function changeBoard(next: Board) {
    setBoard(next);
    setQuery("");
    setNotice("");
    if (next === "pm") setSelection({ kind: "pm", item: requirements.shifts, review: false });
    if (next === "dev")
      setSelection(
        activeRequirements[0]
          ? {
              kind: "dev",
              requirementId: activeRequirements[0].id,
              item: developmentPlans[activeRequirements[0].id],
              brief: false,
            }
          : null,
      );
    if (next === "prd") setSelection(null);
  }
  function materialize(item: Requirement) {
    setMaterialized((previous) => new Set([...previous, item.id]));
    setBoard("dev");
    setLayout("tree");
    setQuery("");
    setSelection({
      kind: "dev",
      requirementId: item.id,
      item: developmentPlans[item.id],
      brief: false,
    });
    setNotice(`${itemLabel(item)}: dev tree materialized. Acceptance tests remain Not run.`);
  }
  function pmRow(item: Requirement) {
    const stage = pmStage(item);
    return (
      <TreeRow
        key={item.id}
        label={itemLabel(item)}
        title={item.title}
        icon={<FileText size={15} />}
        selected={selectedCode === item.code}
        onSelect={() => openPm(item)}
        meta={
          <>
            PRD §{item.section}
            <span>·</span>
            {materialized.has(item.id)
              ? `${devLeaves(developmentPlans[item.id]).length} buildable leaves · ${acceptanceTests(developmentPlans[item.id]).length} tests`
              : "Dev tree not materialized"}
          </>
        }
        status={<Pill tone={stage.tone}>{stage.label}</Pill>}
      />
    );
  }
  function devRow(item: DevItem, req: RequirementId, showChildren = false): ReactNode {
    const showBranch =
      showChildren ||
      matches(itemLabel(requirements[req])) ||
      matches(`${itemLabel(item)} ${item.title}`);
    const visible =
      showBranch ||
      flattenDev(item).some((node) =>
        matches(
          `${itemLabel(node)} ${node.title} ${node.kind === "leaf" ? node.tests.map((test) => test.id + test.title).join(" ") : ""}`,
        ),
      );
    if (!visible) return null;
    const expanded = !!search || !collapsed.has(item.code);
    const isLeaf = item.kind === "leaf";
    return (
      <TreeRow
        key={item.code}
        label={itemLabel(item)}
        title={item.title}
        icon={isLeaf ? <ClipboardList size={15} /> : <Folder size={16} />}
        selected={selectedCode === item.code}
        onSelect={() => openDev(req, item)}
        meta={
          isLeaf ? (
            <>
              Buildable leaf<span>·</span>
              <TestTube2 size={12} />
              {item.tests.length} {item.tests.length === 1 ? "test" : "tests"}
            </>
          ) : (
            <>
              {item.kind === "root" ? "Dev root" : "Deliverable"}
              <span>·</span>0/{devLeaves(item).length} leaves merged
            </>
          )
        }
        status={
          isLeaf ? (
            <Pill tone={blocked(item) ? "amber" : "green"}>
              {blocked(item) ? "Waiting" : "Ready"}
            </Pill>
          ) : (
            <span className="pb-quiet">0/{acceptanceTests(item).length} tests run</span>
          )
        }
        expanded={expanded}
        onToggle={isLeaf ? undefined : () => toggle(item.code)}
      >
        {!isLeaf && item.children.map((child) => devRow(child, req, showBranch))}
      </TreeRow>
    );
  }
  function ancestry(root: DevItem, code: string, path: DevItem[] = []): DevItem[] {
    if (root.code === code) return path;
    if (root.kind === "leaf") return [];
    for (const child of root.children) {
      const result = ancestry(child, code, [...path, root]);
      if (result.length) return result;
    }
    return [];
  }
  const leafCards = activeRequirements
    .flatMap((req) => devLeaves(developmentPlans[req.id]).map((item) => ({ req, item })))
    .filter(({ req, item }) =>
      matches(
        `${itemLabel(req)} ${itemLabel(item)} ${item.title} ${item.tests.map((test) => test.id + test.title).join(" ")}`,
      ),
    );
  const visiblePm = Object.values(requirements).filter((item) =>
    matches(`${itemLabel(item)} ${item.title}`),
  );
  const visibleDev = activeRequirements.filter(
    (req) =>
      matches(itemLabel(req)) ||
      flattenDev(developmentPlans[req.id]).some((item) =>
        matches(
          `${itemLabel(item)} ${item.title} ${item.kind === "leaf" ? item.tests.map((test) => test.id + test.title).join(" ") : ""}`,
        ),
      ),
  );

  return (
    <div className="project-build" data-testid="project-build" data-viewer="volunteer">
      <div className="pb-breadcrumb">
        <span>My projects</span>
        <ChevronRight size={12} />
        <span>Project workspace</span>
        <span className="pb-fixture">Interactive mock</span>
      </div>
      <header className="pb-heading">
        <div className="pb-project-icon">
          <Leaf size={25} />
        </div>
        <div className="pb-grow">
          <h1>Volunteer scheduling</h1>
          <p>
            Harbor Community Kitchen <span>·</span> Volunteer workspace
          </p>
        </div>
        <button className="pb-button" onClick={() => select({ kind: "guide" })}>
          <BookOpen size={15} />
          Build guide
        </button>
      </header>
      <div className="pb-overview">
        <span>
          <Check size={15} />
          <strong>PRD materialized</strong>
          <span>Revision 1</span>
        </span>
        <span>
          <Circle size={13} />
          <strong>Build preparation</strong>
        </span>
        <span className="pb-progress-label">
          <strong>0 / 5</strong> requirements verified
        </span>
      </div>
      <div className="pb-intro">
        <div>
          <h2>
            {materialized.size ? "Ready for the first build" : "Start by pulling a PM requirement"}
          </h2>
          <p>
            {materialized.size
              ? `${materialized.size} of 5 requirements materialized · ${leafCount} buildable leaves · ${testCount} acceptance tests, all Not run`
              : "Review its decomposition and acceptance tests, then materialize its dev tree."}
          </p>
        </div>
        <button className="pb-button" onClick={() => openPm(requirements.shifts)}>
          {materialized.size ? "View PM requirement" : "Pull first requirement"}
          <ArrowRight size={14} />
        </button>
      </div>
      <nav className="pb-tabs" aria-label="Project views">
        <button aria-pressed={board === "pm"} onClick={() => changeBoard("pm")}>
          <FileText size={15} />
          PM items<span>8</span>
        </button>
        <button aria-pressed={board === "dev"} onClick={() => changeBoard("dev")}>
          <GitBranch size={15} />
          Dev items<span>{devCount}</span>
        </button>
        <button aria-pressed={board === "prd"} onClick={() => changeBoard("prd")}>
          <BookOpen size={15} />
          PRD reference
        </button>
      </nav>
      {notice && (
        <p className="pb-notice" role="status">
          <Check size={15} />
          {notice}
        </p>
      )}
      {board === "prd" ? (
        <section className="pb-prd">
          <div className="pb-section-head">
            <div>
              <span className="pb-eyebrow">PRODUCT REQUIREMENTS DOCUMENT</span>
              <h2>Volunteer scheduling</h2>
            </div>
            <Pill>Frozen revision 1</Pill>
          </div>
          <p>
            Coordinate 45 volunteers across three kitchens and reduce the time spent arranging
            shifts each week.
          </p>
          {requirementParents.map((parent) => (
            <section key={parent.code}>
              <h3>
                {parent.section}. {parent.title}
              </h3>
              <button
                className="pb-link"
                onClick={() => {
                  setBoard("pm");
                  select({ kind: "parent", item: parent });
                }}
              >
                {itemLabel(parent)}
                <ArrowRight size={13} />
              </button>
              {parent.children.map((id) => (
                <article key={id}>
                  <h4>
                    {requirements[id].section}. {requirements[id].title}
                  </h4>
                  <p>{requirements[id].summary}</p>
                  <button className="pb-link" onClick={() => openPm(requirements[id])}>
                    {itemLabel(requirements[id])}
                    <ArrowRight size={13} />
                  </button>
                </article>
              ))}
            </section>
          ))}
          <section>
            <h3>Outside this version</h3>
            <p>Payroll, volunteer recruitment, and a native mobile app.</p>
          </section>
        </section>
      ) : (
        <>
          <div className="pb-toolbar">
            <div className="pb-grow">
              <h2>{board === "pm" ? "Requirements follow the PRD" : "Development hierarchy"}</h2>
              <p>
                {board === "pm"
                  ? "Parent requirement → child requirement → linked dev tree"
                  : "Dev root → deliverable → buildable leaf"}
              </p>
            </div>
            <div className="pb-layout" aria-label="Board layout">
              <button aria-pressed={layout === "tree"} onClick={() => setLayout("tree")}>
                <ListTree size={15} />
                Tree
              </button>
              <button aria-pressed={layout === "board"} onClick={() => setLayout("board")}>
                <Kanban size={15} />
                Board
              </button>
            </div>
          </div>
          <div className="pb-search-row">
            <label className="pb-search">
              <Search size={14} />
              <input
                type="search"
                aria-label="Search board items"
                placeholder={board === "pm" ? "Search requirements…" : "Search dev items or tests…"}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </label>
            <button className="pb-link" onClick={() => setCollapsed(new Set())}>
              Expand all
            </button>
            <span className="pb-quiet">
              {board === "pm"
                ? "2 parents · 5 requirements · 1 setup item"
                : `${devCount} dev items · ${testCount} linked tests`}
            </span>
          </div>
          <div className={`pb-workspace ${selection ? "" : "without-detail"}`}>
            <div className="pb-work">
              {layout === "tree" ? (
                <div
                  className="pb-tree"
                  aria-label={board === "pm" ? "PM requirement hierarchy" : "Development hierarchy"}
                >
                  {board === "pm" ? (
                    <ul>
                      {requirementParents
                        .filter(
                          (parent) =>
                            matches(itemLabel(parent) + parent.title) ||
                            parent.children.some((id) => visiblePm.includes(requirements[id])),
                        )
                        .map((parent) => (
                          <TreeRow
                            key={parent.code}
                            label={itemLabel(parent)}
                            title={parent.title}
                            icon={<Folder size={16} />}
                            selected={selectedCode === parent.code}
                            onSelect={() => select({ kind: "parent", item: parent })}
                            meta={
                              <>
                                PRD §{parent.section}
                                <span>·</span>0/{parent.children.length} child requirements verified
                              </>
                            }
                            expanded={!!search || !collapsed.has(parent.code)}
                            onToggle={() => toggle(parent.code)}
                          >
                            {parent.children
                              .filter(
                                (id) =>
                                  matches(itemLabel(parent) + parent.title) ||
                                  visiblePm.includes(requirements[id]),
                              )
                              .map((id) => pmRow(requirements[id]))}
                          </TreeRow>
                        ))}
                      {matches("PM-01 project PRD Author the project PRD") && (
                        <TreeRow
                          label="PM-01 (project PRD)"
                          title="Author and materialize the PRD"
                          icon={<FileCheck2 size={15} />}
                          selected={selection?.kind === "setup"}
                          onSelect={() => select({ kind: "setup" })}
                          meta="Setup · Frozen revision and planning package"
                          status={<Pill tone="green">Complete</Pill>}
                        />
                      )}
                    </ul>
                  ) : activeRequirements.length ? (
                    visibleDev.map((req) => (
                      <section key={req.id} className="pb-dev-group">
                        <button className="pb-parent-link" onClick={() => openPm(req)}>
                          <FileText size={13} />
                          {itemLabel(req)}
                          <ArrowRight size={13} />
                        </button>
                        <ul>{devRow(developmentPlans[req.id], req.id)}</ul>
                      </section>
                    ))
                  ) : (
                    <div className="pb-empty">
                      <GitBranch size={26} />
                      <h3>No dev items materialized yet</h3>
                      <p>
                        Pull a PM requirement to create its dev root, deliverables, leaves, and
                        acceptance-test links.
                      </p>
                      <button
                        className="pb-button primary"
                        onClick={() => openPm(requirements.shifts)}
                      >
                        Choose first requirement
                        <ArrowRight size={14} />
                      </button>
                    </div>
                  )}
                  {search &&
                    ((board === "pm" &&
                      !visiblePm.length &&
                      !requirementParents.some((parent) =>
                        matches(itemLabel(parent) + parent.title),
                      ) &&
                      !matches("PM-01 project PRD Author the project PRD")) ||
                      (board === "dev" && !visibleDev.length)) && (
                      <div className="pb-empty">
                        <h3>No matching items</h3>
                        <button className="pb-link" onClick={() => setQuery("")}>
                          Clear search
                        </button>
                      </div>
                    )}
                </div>
              ) : (
                <div className="pb-kanban">
                  {["Ready", "In progress", "Waiting", "Done"].map((status) => {
                    const pmItems = visiblePm.filter(
                      (item) =>
                        (materialized.has(item.id)
                          ? "In progress"
                          : item.blockers.length
                            ? "Waiting"
                            : "Ready") === status,
                    );
                    const devItems = leafCards.filter(
                      ({ item }) => (blocked(item) ? "Waiting" : "Ready") === status,
                    );
                    const count = board === "pm" ? pmItems.length : devItems.length;
                    return (
                      <section key={status}>
                        <header>
                          <h3>{status}</h3>
                          <span>{count}</span>
                        </header>
                        {board === "pm"
                          ? pmItems.map((item) => (
                              <button
                                className="pb-work-card"
                                key={item.id}
                                onClick={() => openPm(item)}
                              >
                                <span className="pb-path">
                                  {
                                    requirementParents.find((parent) =>
                                      parent.children.includes(item.id),
                                    )?.title
                                  }
                                </span>
                                <span className="pb-code">{itemLabel(item)}</span>
                                <strong>{item.title}</strong>
                                <span>
                                  {materialized.has(item.id)
                                    ? "Dev tree materialized"
                                    : "Dev tree not materialized"}
                                </span>
                              </button>
                            ))
                          : devItems.map(({ req, item }) => (
                              <button
                                className="pb-work-card"
                                key={item.code}
                                onClick={() => openDev(req.id, item)}
                              >
                                <span className="pb-path">
                                  {req.title} /{" "}
                                  {ancestry(developmentPlans[req.id], item.code)
                                    .map((parent) => parent.title)
                                    .join(" / ")}
                                </span>
                                <span className="pb-code">{itemLabel(item)}</span>
                                <strong>{item.title}</strong>
                                <span>
                                  <TestTube2 size={12} />
                                  {item.tests.length} acceptance tests · Not run
                                </span>
                              </button>
                            ))}
                        {!count && (
                          <p className="pb-quiet">
                            No {board === "pm" ? "requirements" : "buildable leaves"}
                          </p>
                        )}
                      </section>
                    );
                  })}
                </div>
              )}
              <footer className="pb-work-footer">
                <TestTube2 size={13} />
                Acceptance tests are linked evidence. Each buildable leaf can cover several tests.
              </footer>
            </div>
            {selection && (
              <aside className="pb-detail" aria-label="Selected item details">
                <div className="pb-detail-top">
                  <span className="pb-eyebrow">
                    {selection.kind === "pm"
                      ? "PM REQUIREMENT"
                      : selection.kind === "parent"
                        ? "PARENT REQUIREMENT"
                        : selection.kind === "dev"
                          ? selection.item.kind === "leaf"
                            ? "BUILDABLE LEAF"
                            : selection.item.kind === "root"
                              ? "DEV ROOT"
                              : "DELIVERABLE"
                          : selection.kind === "setup"
                            ? "PROJECT SETUP"
                            : "BUILD GUIDE"}
                  </span>
                  <button
                    className="pb-icon-button"
                    aria-label="Close details"
                    onClick={() => setSelection(null)}
                  >
                    <X size={16} />
                  </button>
                </div>
                {"item" in selection && (
                  <>
                    <span className="pb-code">{itemLabel(selection.item)}</span>
                    <h2>{selection.item.title}</h2>
                  </>
                )}
                {selection.kind === "pm" &&
                  (() => {
                    const item = selection.item,
                      plan = developmentPlans[item.id],
                      stage = pmStage(item),
                      isMaterialized = materialized.has(item.id);
                    return (
                      <>
                        <Pill tone={stage.tone}>{stage.label}</Pill>
                        <p>{item.summary}</p>
                        <button className="pb-link" onClick={() => changeBoard("prd")}>
                          <BookOpen size={13} />
                          PRD §{item.section} · Revision 1
                        </button>
                        <section>
                          <h3>
                            {isMaterialized ? "Materialized work" : "Requirement materialization"}
                          </h3>
                          <div className="pb-plan-stats">
                            <span>
                              <strong>1</strong> dev root
                            </span>
                            <span>
                              <strong>
                                {
                                  flattenDev(plan).filter((node) => node.kind === "deliverable")
                                    .length
                                }
                              </strong>{" "}
                              deliverables
                            </span>
                            <span>
                              <strong>{devLeaves(plan).length}</strong> buildable leaves
                            </span>
                            <span>
                              <strong>{acceptanceTests(plan).length}</strong> acceptance tests
                            </span>
                          </div>
                          <p>
                            {isMaterialized
                              ? "The dev tree is ready. Build and verification still remain."
                              : "The PRD package supplies the plan. Pull this requirement to review the plan and create its dev tree."}
                          </p>
                        </section>
                        {item.blockers.length > 0 && (
                          <section>
                            <h3>Waiting for requirements</h3>
                            {item.blockers.map((id) => (
                              <button
                                key={id}
                                className="pb-dependency"
                                onClick={() => openPm(requirements[id])}
                              >
                                <LockKeyhole size={13} />
                                {itemLabel(requirements[id])}
                              </button>
                            ))}
                          </section>
                        )}
                        {selection.review && !isMaterialized && (
                          <section className="pb-plan-preview">
                            <h3>Review the decomposition</h3>
                            <ul>
                              {plan.kind !== "leaf" &&
                                plan.children.map((parent) => (
                                  <li key={parent.code}>
                                    <strong>{parent.title}</strong>
                                    <ul>
                                      {devLeaves(parent).map((leaf) => (
                                        <li key={leaf.code}>
                                          {leaf.title}
                                          <span>
                                            {leaf.tests.length}{" "}
                                            {leaf.tests.length === 1 ? "test" : "tests"}
                                          </span>
                                        </li>
                                      ))}
                                    </ul>
                                  </li>
                                ))}
                            </ul>
                            <h3>Acceptance tests</h3>
                            <TestList tests={acceptanceTests(plan)} />
                          </section>
                        )}
                        {isMaterialized ? (
                          <button
                            className="pb-button primary pb-full"
                            onClick={() => openDev(item.id, plan)}
                          >
                            Open dev tree
                            <ArrowRight size={15} />
                          </button>
                        ) : item.blockers.length ? (
                          <button className="pb-button pb-full" disabled>
                            <LockKeyhole size={14} />
                            Dependencies must finish first
                          </button>
                        ) : selection.review ? (
                          <button
                            className="pb-button primary pb-full"
                            onClick={() => materialize(item)}
                          >
                            Materialize dev items
                            <GitBranch size={15} />
                          </button>
                        ) : (
                          <button
                            className="pb-button primary pb-full"
                            onClick={() => select({ kind: "pm", item, review: true })}
                          >
                            Pull requirement
                            <ArrowRight size={15} />
                          </button>
                        )}
                        <section className="pb-completion">
                          <h3>Requirement completion</h3>
                          <p>
                            0/{devLeaves(plan).length} leaves merged · 0/
                            {acceptanceTests(plan).length} tests run
                          </p>
                          <p>
                            The requirement stays open until implementation, acceptance evidence,
                            and the required approval are complete.
                          </p>
                        </section>
                      </>
                    );
                  })()}
                {selection.kind === "parent" && (
                  <>
                    <Pill>0/{selection.item.children.length} child requirements verified</Pill>
                    <p>{selection.item.summary}</p>
                    <section>
                      <h3>Child requirements</h3>
                      {selection.item.children.map((id) => (
                        <button
                          className="pb-related"
                          key={id}
                          onClick={() => openPm(requirements[id])}
                        >
                          <span className="pb-code">{itemLabel(requirements[id])}</span>
                          <span>
                            {requirements[id].title}
                            <ArrowRight size={13} />
                          </span>
                        </button>
                      ))}
                    </section>
                    <section className="pb-completion">
                      <h3>Start with a child requirement</h3>
                      <p>
                        Each child has its own decomposition, dev tree, and acceptance evidence. The
                        parent shows their combined progress.
                      </p>
                    </section>
                  </>
                )}
                {selection.kind === "dev" &&
                  (() => {
                    const item = selection.item,
                      req = requirements[selection.requirementId],
                      parents = ancestry(developmentPlans[req.id], item.code);
                    return (
                      <>
                        <div className="pb-detail-path">
                          <button className="pb-link" onClick={() => openPm(req)}>
                            {itemLabel(req)}
                          </button>
                          {parents.map((parent) => (
                            <button
                              key={parent.code}
                              className="pb-link"
                              onClick={() => openDev(req.id, parent)}
                            >
                              <ChevronRight size={12} />
                              {itemLabel(parent)}
                            </button>
                          ))}
                        </div>
                        {item.kind === "leaf" ? (
                          <>
                            <Pill tone={blocked(item) ? "amber" : "green"}>
                              {blocked(item)
                                ? "Waiting for dependencies"
                                : "Ready for a build brief"}
                            </Pill>
                            <p>{item.summary}</p>
                            {blocked(item) && (
                              <section>
                                <h3>Before this work can start</h3>
                                {item.blockers.map((code) => {
                                  const dependency = devByCode(code);
                                  return (
                                    dependency && (
                                      <div key={code} className="pb-dependency">
                                        <LockKeyhole size={13} />
                                        {itemLabel(dependency)}
                                      </div>
                                    )
                                  );
                                })}
                                {item.design && (
                                  <div className="pb-dependency">
                                    <LockKeyhole size={13} />
                                    Design sign-off: {item.design}
                                  </div>
                                )}
                              </section>
                            )}
                            <section>
                              <div className="pb-section-head">
                                <h3>Acceptance tests</h3>
                                <span>{item.tests.length}</span>
                              </div>
                              <p className="pb-quiet">
                                Specified · Executable cases not implemented
                              </p>
                              <TestList tests={item.tests} />
                            </section>
                            {selection.brief ? (
                              <section className="pb-brief">
                                <h3>Build brief</h3>
                                <p>{item.summary}</p>
                                <dl>
                                  <dt>Requirement</dt>
                                  <dd>{itemLabel(req)}</dd>
                                  <dt>Verification</dt>
                                  <dd>{item.tests.map((test) => test.id).join(", ")}</dd>
                                  <dt>Work unit</dt>
                                  <dd>This leaf on one branch and worktree.</dd>
                                </dl>
                                <p>
                                  Implement the tests and work. Verify the change, merge after
                                  approval, then record completion evidence.
                                </p>
                                <Pill>Preview only · No work started</Pill>
                              </section>
                            ) : (
                              <button
                                className="pb-button primary pb-full"
                                disabled={blocked(item)}
                                onClick={() => select({ ...selection, brief: true })}
                              >
                                <ClipboardList size={15} />
                                Preview build brief
                              </button>
                            )}
                          </>
                        ) : (
                          <>
                            <Pill>Materialized · Build not started</Pill>
                            <section>
                              <h3>{item.kind === "root" ? "Deliverables" : "Buildable leaves"}</h3>
                              {item.children.map((child) => (
                                <button
                                  className="pb-related"
                                  key={child.code}
                                  onClick={() => openDev(req.id, child)}
                                >
                                  <span className="pb-code">{itemLabel(child)}</span>
                                  <span>
                                    {child.title}
                                    <ArrowRight size={13} />
                                  </span>
                                </button>
                              ))}
                            </section>
                            <section className="pb-completion">
                              <h3>Completion evidence</h3>
                              <p>
                                0/{devLeaves(item).length} leaves merged · 0/
                                {acceptanceTests(item).length} tests run
                              </p>
                              <p>
                                {item.kind === "root"
                                  ? "Choose a deliverable or leaf for a build brief. Completing this dev tree does not close the PM requirement."
                                  : "A deliverable run contains its open, unblocked leaves. Each leaf keeps its own acceptance tests."}
                              </p>
                            </section>
                          </>
                        )}
                      </>
                    );
                  })()}
                {selection.kind === "setup" && (
                  <>
                    <h2>Author and materialize the PRD</h2>
                    <Pill tone="green">Setup complete</Pill>
                    <p>PM-01 (project PRD)</p>
                    <section>
                      <h3>Project package</h3>
                      <ul className="pb-plain-list">
                        <li>Frozen PRD revision 1</li>
                        <li>Nested PM requirements</li>
                        <li>Decomposition plans and acceptance specifications</li>
                        <li>Design screen inventory</li>
                      </ul>
                    </section>
                    <p>
                      Pull individual requirements to materialize their dev trees. The five build
                      requirements remain unverified.
                    </p>
                    <button className="pb-button" onClick={() => changeBoard("prd")}>
                      Open PRD reference
                    </button>
                  </>
                )}
                {selection.kind === "guide" && (
                  <>
                    <h2>From requirement to verified work</h2>
                    <ol className="pb-guide">
                      <li>
                        <strong>Pull a PM requirement</strong>
                        <p>
                          Read its PRD scope. Write or review its decomposition and acceptance
                          tests.
                        </p>
                      </li>
                      <li>
                        <strong>Materialize its dev tree</strong>
                        <p>
                          Create the root, deliverables, and buildable leaves. Link tests to the
                          leaves that prove them.
                        </p>
                      </li>
                      <li>
                        <strong>Prepare a build brief</strong>
                        <p>
                          Choose a leaf or a deliverable with unblocked leaves. Keep the full parent
                          chain.
                        </p>
                      </li>
                      <li>
                        <strong>Build, verify, and merge</strong>
                        <p>
                          Implement the work and tests. Record each leaf's completion from its
                          merge.
                        </p>
                      </li>
                      <li>
                        <strong>Verify the PM requirement</strong>
                        <p>
                          Check the complete acceptance evidence and required approval before
                          closing the requirement.
                        </p>
                      </li>
                    </ol>
                    <button
                      className="pb-button"
                      onClick={() => {
                        notify(
                          "This is a local design fixture. No board items or worktrees have changed.",
                        );
                        setNotice(
                          "This is a local design fixture. No board items or worktrees have changed.",
                        );
                      }}
                    >
                      About this mock
                    </button>
                  </>
                )}
              </aside>
            )}
          </div>
        </>
      )}
    </div>
  );
}
