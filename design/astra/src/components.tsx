import type { ButtonHTMLAttributes, Dispatch, ReactNode, SetStateAction } from "react";
import { ArrowRight, Check, FileText } from "lucide-react";
import { z } from "zod";
import type { MockState } from "./model";

export const routeSchema = z.enum([
  "dashboard",
  "projects",
  "intake",
  "discovery",
  "scope",
  "publish",
  "funding",
  "build",
  "review",
]);
export type Route = z.infer<typeof routeSchema>;
export type ScreenProps = {
  state: MockState;
  setState: Dispatch<SetStateAction<MockState>>;
  navigate: (route: Route) => void;
  notify: (message: string) => void;
};

export function Button({
  testId,
  variant = "secondary",
  children,
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  testId: string;
  variant?: "primary" | "secondary" | "quiet";
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      {...props}
      data-testid={testId}
      className={`button ${variant} ${className}`}
    >
      {children}
    </button>
  );
}

export function PageTitle({
  eyebrow,
  title,
  children,
  action,
}: {
  eyebrow: string;
  title: string;
  children?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="page-heading">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        {children && <p className="description">{children}</p>}
      </div>
      {action}
    </div>
  );
}

export function Badge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "green" | "amber" | "red";
}) {
  return <span className={`badge ${tone}`}>{children}</span>;
}

export function Stages({ current }: { current: number }) {
  return (
    <ol className="stages" aria-label="Project stages">
      {["Intake", "Discovery", "Volunteer match", "PRD", "Design", "Build", "Handoff"].map((label, i) => (
        <li
          key={label}
          aria-current={i === current ? "step" : undefined}
          className={i < current ? "finished" : i === current ? "current" : ""}
        >
          <span className="stage-number">{i < current ? <Check size={12} /> : i + 1}</span>
          {label}
        </li>
      ))}
    </ol>
  );
}

export function Empty({
  title,
  children,
  action,
}: {
  title: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="empty" data-testid="empty-state">
      <FileText size={26} />
      <h3>{title}</h3>
      <p>{children}</p>
      {action}
    </div>
  );
}

export function Next({ children }: { children: ReactNode }) {
  return (
    <>
      {children}
      <ArrowRight size={16} />
    </>
  );
}

export const phaseLabel = {
  intake: "Draft",
  discovery: "In Discovery",
  scoped: "Scope confirmed",
  "under-review": "Under review",
};
