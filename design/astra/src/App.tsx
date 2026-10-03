import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowUpRight,
  Check,
  ClipboardList,
  FlaskConical,
  FolderOpen,
  LayoutDashboard,
  Leaf,
  Kanban,
  Menu,
  Moon,
  RotateCcw,
  Sun,
  Wallet,
  X,
} from "lucide-react";
import manifest from "../screens.json";
import designPreviewUrl from "../design-review-preview.html?url";
import { Badge, Button, PageTitle, routeSchema, type Route, type ScreenProps } from "./components";
import { initialState, readState, refreshDay, storageKey, type MockState } from "./model";
import { DiscoveryReview, DiscoveryScreen, type DiscoveryPort } from "@/components/discovery";
import { confirmationCurrent } from "@/components/discovery/model";
import type { DiscoveryState } from "@/lib/discovery-stream";
import { fixturePort, fixtureSelection } from "./fixture-port";
import { openFixtureWorld } from "./fixture-world";
import { ProjectBuild } from "./ProjectBuild";
import { Dashboard, Funding, Intake, Projects, Publish } from "./screens";

function readRoute(): Route {
  return routeSchema.safeParse(location.hash.slice(1)).data ?? "dashboard";
}

function Review({ state, setState, navigate, notify }: ScreenProps) {
  const [resetting, setResetting] = useState(false);
  const [notes, setNotes] = useState(() => {
    try {
      return localStorage.getItem("ai4good.astra.review-notes.v1") ?? "";
    } catch {
      return "";
    }
  });
  function exportNotes() {
    const content = JSON.stringify(
      { ...manifest, reviewNotes: notes, exportedAt: new Date().toISOString(), fixture: state },
      null,
      2,
    );
    const url = URL.createObjectURL(new Blob([content], { type: "application/json" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "astra-design-review.json";
    link.click();
    URL.revokeObjectURL(url);
  }
  return (
    <>
      <PageTitle
        eyebrow="Astra design / Review tools"
        title="A working draft, ready to shape."
        action={<Badge tone="amber">Awaiting your review</Badge>}
      >
        This is Astra's fixture prototype. Claude Design exports keep their own source files.
      </PageTitle>
      <div className="form-grid">
        <div>
          <section className="panel">
            <div className="section-heading">
              <h2>Screens in this pass</h2>
              <span className="small muted">Author: Astra</span>
            </div>
            <div className="screen-inventory">
              {manifest.screens.map((screen) => (
                <div key={screen.id} data-testid="design-screen" data-testkey={screen.id}>
                  <div>
                    <h3>{screen.title}</h3>
                    <p className="small muted">
                      {"sourceAuthor" in screen ? "Astra source" : "Claude reference"}:{" "}
                      {screen.source}
                    </p>
                  </div>
                  {screen.id === "design" ? (
                    <a
                      className="text-button"
                      data-testid="open-design-screen"
                      data-testkey={screen.id}
                      href={designPreviewUrl}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Open
                      <ArrowUpRight size={14} />
                    </a>
                  ) : (
                    <button
                      type="button"
                      className="text-button"
                      data-testid="open-design-screen"
                      data-testkey={screen.id}
                      onClick={() => {
                        const route = routeSchema.safeParse(screen.id);
                        if (route.success) navigate(route.data);
                      }}
                    >
                      Open
                      <ArrowUpRight size={14} />
                    </button>
                  )}
                </div>
              ))}
            </div>
            <p className="small muted">
              This pass covers one NGO project and its volunteer build workspace after PRD
              materialization. All project data is a fixture.
            </p>
          </section>
          <section className="panel review-notes">
            <h2>Notes for the next design pass</h2>
            <label className="field">
              What should change?
              <textarea
                data-testid="review-notes"
                rows={5}
                value={notes}
                placeholder="Screen, what feels wrong, and what you want to try…"
                onChange={(e) => {
                  const value = e.target.value;
                  setNotes(value);
                  try {
                    localStorage.setItem("ai4good.astra.review-notes.v1", value);
                  } catch {
                    notify("Notes stay in this tab. Download them before closing.");
                  }
                }}
              />
            </label>
            <Button testId="download-design-review" onClick={exportNotes}>
              Download review and fixtures
              <ArrowUpRight size={15} />
            </Button>
            <p className="small muted">
              The download labels Astra as the author and includes your current sample state. Keep
              any Claude revision in a separate folder.
            </p>
          </section>
        </div>
        <aside>
          <section className="panel">
            <h2>Start the sample again</h2>
            <p className="small muted">
              Reset the project, answers, usage, and sample purchases. Your review notes stay saved.
            </p>
            {resetting ? (
              <div className="reset-confirm">
                <p>Reset this browser's Astra fixture?</p>
                <div className="row">
                  <Button
                    testId="confirm-reset-fixture"
                    onClick={() => {
                      setState(initialState());
                      setResetting(false);
                      navigate("dashboard");
                      notify("The sample project has been reset.");
                    }}
                  >
                    Reset sample
                  </Button>
                  <Button
                    testId="cancel-reset-fixture"
                    variant="quiet"
                    onClick={() => setResetting(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <Button testId="reset-fixture" onClick={() => setResetting(true)}>
                <RotateCcw size={15} />
                Reset sample
              </Button>
            )}
          </section>
          <p className="small muted aside-note">
            Shared Astra and Claude mock: design/astra/
            <br />
            Claude Design exports: design/screens/
          </p>
        </aside>
      </div>
    </>
  );
}

function DiscoveryRoutes({
  route,
  port,
  navigate,
  onBuyFuel,
}: {
  route: Route;
  port: DiscoveryPort;
  navigate: (next: Route) => void;
  onBuyFuel: () => void;
}) {
  const [returnFocus, setReturnFocus] = useState<{ questionId: string; nonce: number } | null>(null);
  const nonce = useRef(0);
  const showChat = route === "discovery";
  return (
    <>
      <div hidden={!showChat} className="flex min-h-0 min-w-0 max-w-full flex-1 flex-col overflow-hidden">
        <DiscoveryScreen
          port={port}
          active={showChat}
          returnFocus={returnFocus}
          onOpenReview={() => navigate("discovery-review")}
          onBuyFuel={onBuyFuel}
        />
      </div>
      {route === "discovery-review" ? (
        <DiscoveryReview
          port={port}
          onBackToChat={(questionId) => {
            setReturnFocus(questionId === null ? null : { questionId, nonce: ++nonce.current });
            navigate("discovery");
          }}
          onFindVolunteer={() => navigate("publish")}
        />
      ) : null}
    </>
  );
}

export default function App() {
  const [initial] = useState(readState);
  const [state, setState] = useState<MockState>(initial.state);
  const [warning, setWarning] = useState(initial.warning);
  const [route, setRoute] = useState<Route>(readRoute);
  const [notice, setNotice] = useState("");
  const [mobileNav, setMobileNav] = useState(false);
  const [dark, setDark] = useState(() => {
    let stored: string | null = null;
    try {
      stored = localStorage.getItem("ai4good.astra.theme");
    } catch {
      stored = null;
    }
    return stored === "dark" ? true : stored === "light" ? false : window.matchMedia("(prefers-color-scheme: dark)").matches;
  });
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(state));
    } catch {
      setWarning("Browser storage is unavailable. Your changes stay in this tab.");
    }
  }, [state]);
  useEffect(() => {
    const changed = () => {
      const next = routeSchema.safeParse(location.hash.slice(1));
      if (next.success) {
        setRoute(next.data);
        setMobileNav(false);
        window.scrollTo(0, 0);
      }
    };
    window.addEventListener("hashchange", changed);
    return () => window.removeEventListener("hashchange", changed);
  }, []);
  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    try {
      localStorage.setItem("ai4good.astra.theme", dark ? "dark" : "light");
    } catch {
      /* The theme still works in this tab. */
    }
  }, [dark]);
  useEffect(() => {
    const interval = setInterval(() => setState(refreshDay), 30_000);
    return () => clearInterval(interval);
  }, []);
  useEffect(() => {
    if (!notice) return;
    const timeout = setTimeout(() => setNotice(""), 6000);
    return () => clearTimeout(timeout);
  }, [notice]);
  function navigate(next: Route) {
    if (location.hash === `#${next}`) {
      setMobileNav(false);
      window.scrollTo(0, 0);
    } else location.hash = next;
  }
  const props = { state, setState, navigate, notify: setNotice };
  const selection = fixtureSelection();
  const world = useMemo(
    () => openFixtureWorld(selection.scenario, selection.pace),
    [selection.scenario, selection.pace],
  );
  const [discoveryState, setDiscoveryState] = useState<DiscoveryState>(() => world.read());
  const cameFrom = useRef<Route>("discovery");
  const discoveryPort = useMemo(
    () => fixturePort(selection.scenario, selection.pace),
    [selection.scenario, selection.pace],
  );
  useEffect(() => {
    setDiscoveryState(world.read());
    return world.subscribe(() => setDiscoveryState(world.read()));
  }, [world]);
  useEffect(() => {
    if (route === "discovery" || route === "discovery-review") cameFrom.current = route;
  }, [route]);
  const discoveryDone = confirmationCurrent(discoveryState.brief, discoveryState.confirmation);
  useEffect(() => {
    const restorePreview = () => setState(readState().state);
    window.addEventListener("ai4good:preview-restored", restorePreview);
    return () => window.removeEventListener("ai4good:preview-restored", restorePreview);
  }, []);
  const nav = [
    { route: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { route: "projects", label: "My projects", icon: FolderOpen },
    { route: "funding", label: "Project fuel", icon: Wallet },
  ].map((item) => ({ ...item, route: routeSchema.parse(item.route) }));
  const projectNav: { route: Route; label: string; step: number }[] = [
    { route: "intake", label: "Intake", step: 1 },
    { route: "discovery", label: "Discovery", step: 2 },
    { route: "discovery-review", label: "Discovery review", step: 2 },
    { route: "publish", label: "Volunteer match", step: 3 },
  ];

  return (
    <div className="app" data-design-author="Astra" data-runtime="fixtures-only">
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <header className="app-header">
        <button
          type="button"
          className="brand"
          data-testid="home"
          onClick={() => navigate("dashboard")}
          aria-label="ai4good home"
        >
          <span className="brand-mark">
            <Leaf size={19} />
          </span>
          ai4good
          <span className="brand-divider" />
          <span className="workspace-name">Harbor Community Kitchen</span>
        </button>
        <div className="header-actions">
          <button
            type="button"
            className="prototype-label"
            data-testid="open-review-tools"
            onClick={() => navigate("review")}
          >
            <FlaskConical size={13} />
            <span>Astra · fixture mock</span>
          </button>
          <button
            type="button"
            className="icon-button"
            data-testid="toggle-theme"
            aria-label={dark ? "Use light theme" : "Use dark theme"}
            onClick={() => setDark(!dark)}
          >
            {dark ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          <span className="avatar" aria-label="Sam Taylor">
            ST
          </span>
          <button
            type="button"
            className="icon-button mobile-menu"
            data-testid="toggle-navigation"
            aria-label={mobileNav ? "Close navigation" : "Open navigation"}
            aria-expanded={mobileNav}
            onClick={() => setMobileNav(!mobileNav)}
          >
            {mobileNav ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </header>
      <div className="app-body">
        <aside className={`sidebar ${mobileNav ? "is-open" : ""}`}>
          <div className="organisation">
            <span className="organisation-icon">
              <Leaf size={18} />
            </span>
            <div>
              <strong>Harbor Community Kitchen</strong>
              <span>{route === "build" ? "Volunteer workspace" : "NGO workspace"}</span>
            </div>
          </div>
          <nav aria-label="Workspace navigation">
            <p className="nav-label">WORKSPACE</p>
            {nav.map((item) => (
              <a
                key={item.route}
                href={`#${item.route}`}
                data-testid={`nav-${item.route}`}
                aria-current={route === item.route ? "page" : undefined}
                className={route === item.route ? "active" : ""}
              >
                <item.icon size={18} />
                {item.label}
              </a>
            ))}
            <p className="nav-label project-nav-label">CURRENT PROJECT</p>
            <div className="nav-project-name">{state.intake.title || "New project"}</div>
            {projectNav.map((item) => {
              const done =
                item.route === "intake"
                  ? state.phase !== "intake" || discoveryDone
                  : item.route === "discovery" || item.route === "discovery-review"
                    ? discoveryDone
                    : false;
              return (
                <a
                  key={item.route}
                  href={`#${item.route}`}
                  data-testid={`nav-${item.route}`}
                  aria-current={route === item.route ? "page" : undefined}
                  aria-label={done ? `${item.label}, done` : undefined}
                  className={`project-nav ${route === item.route ? "active" : ""}`}
                >
                  <span className={done ? "nav-step nav-step-done" : "nav-step"}>
                    {done ? <Check size={12} aria-hidden="true" /> : item.step}
                  </span>
                  {item.label}
                </a>
              );
            })}
            <p className="nav-label project-nav-label">VOLUNTEER PREVIEW</p>
            <a href={designPreviewUrl} target="_blank" rel="noreferrer" data-testid="nav-design">
              <ClipboardList size={18} />
              Design workspace
              <ArrowUpRight size={14} />
            </a>
            <a
              href="#build"
              data-testid="nav-build"
              aria-current={route === "build" ? "page" : undefined}
              className={route === "build" ? "active" : ""}
            >
              <Kanban size={18} />
              Project build
            </a>
          </nav>
          <div className="sidebar-footer">
            <a href="#review" data-testid="nav-review">
              <ClipboardList size={17} />
              Design review
              <ArrowUpRight size={14} />
            </a>
            <p>
              Astra draft · Sample data
              <br />
              Saved in this browser
            </p>
          </div>
        </aside>
        <main
          id="main-content"
          className={`main-content ${route === "discovery" || route === "discovery-review" ? "discovery-content" : ""} ${route === "build" ? "build-content" : ""}`}
          tabIndex={-1}
        >
          {warning && (
            <div className="callout warning" role="alert">
              {warning}
            </div>
          )}
          {route === "dashboard" && <Dashboard {...props} discovery={discoveryState} />}
          {route === "projects" && <Projects {...props} />}
          {route === "intake" && <Intake {...props} />}
          {(route === "discovery" || route === "discovery-review") && (
            <DiscoveryRoutes
              key={`${selection.scenario}:${selection.pace}`}
              route={route}
              port={discoveryPort}
              navigate={navigate}
              onBuyFuel={() => navigate("funding")}
            />
          )}
          {route === "publish" && <Publish {...props} port={discoveryPort} />}
          {route === "funding" && (
            <Funding
              usage={discoveryState.usage}
              navigate={navigate}
              notify={setNotice}
              returnTo={discoveryDone ? "discovery-review" : cameFrom.current}
              onPurchase={(amountMicros) => {
                world.buyFuel(amountMicros);
              }}
            />
          )}
          {route === "build" && <ProjectBuild notify={setNotice} />}
          {route === "review" && <Review {...props} />}
          <footer className="page-footer">
            <span>ai4good · Tools that serve your community.</span>
            <span>
              <Check size={12} />
              Astra design · Draft
            </span>
          </footer>
        </main>
      </div>
      {notice && (
        <div className="toast" role="status" data-testid="status-notice">
          <Check size={17} />
          <span>{notice}</span>
          <button
            className="icon-button"
            data-testid="dismiss-notice"
            aria-label="Dismiss notice"
            onClick={() => setNotice("")}
          >
            <X size={15} />
          </button>
        </div>
      )}
    </div>
  );
}
