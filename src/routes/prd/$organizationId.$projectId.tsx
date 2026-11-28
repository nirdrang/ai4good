import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { PrdWorkspaceScreen } from "@/components/prd-workspace";
import type { PrdPort, Selection } from "@/components/prd-workspace/port";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { prdPort } from "@/lib/prd-port";
import { parseRefusal, type PrdRefusal, type PrdSnapshot, type Result } from "@/lib/prd-stream";
import { getSupabase, supabasePublishableKey, supabaseUrl } from "@/lib/supabase";

const START: Selection = { kind: "main" };
const OPEN_WHEN = ["the PRD is not open", "the PRD is still being set up"];

export const Route = createFileRoute("/prd/$organizationId/$projectId")({
  ssr: false,
  component: PrdPage,
});

function PrdPage() {
  const { organizationId, projectId } = Route.useParams();
  const [session, setSession] = useState<"unknown" | "signed-out" | "signed-in">("unknown");
  const port = useMemo(() => openingPort(organizationId, projectId), [organizationId, projectId]);

  useEffect(() => {
    const { data } = getSupabase().auth.onAuthStateChange((_event, next) => {
      setSession(next ? "signed-in" : "signed-out");
    });
    return () => data.subscription.unsubscribe();
  }, []);

  if (session === "unknown") return null;
  if (session === "signed-out") return <SignInForm />;
  return (
    <main className="flex h-dvh min-h-0 min-w-0 flex-col overflow-hidden bg-background p-3 text-foreground md:p-4">
      <PrdWorkspaceScreen port={port} start={START} />
    </main>
  );
}

function openingPort(organizationId: string, projectId: string): PrdPort {
  const port = prdPort(projectId);
  let opening: Promise<Result<PrdSnapshot>> | null = null;
  return {
    load() {
      return port.load().then((first) => {
        if (first.ok || !OPEN_WHEN.includes(first.refusal.reason)) return first;
        opening ??= openThenLoad(port, organizationId, projectId);
        return opening;
      });
    },
    chat: (scope) => port.chat(scope),
    act: (action) => port.act(action),
    saveDraft: (key, text) => port.saveDraft(key, text),
    subscribe: (listener) => port.subscribe(listener),
  };
}

async function openThenLoad(
  port: PrdPort,
  organizationId: string,
  projectId: string,
): Promise<Result<PrdSnapshot>> {
  try {
    const refusal = await openPrd(organizationId, projectId);
    if (refusal) return { ok: false, refusal };
  } catch (error) {
    const reason =
      error instanceof Error && error.message ? error.message : "The PRD did not open.";
    return { ok: false, refusal: { kind: "invalid", reason } };
  }
  return port.load();
}

async function openPrd(organizationId: string, projectId: string): Promise<PrdRefusal | null> {
  const { data } = await getSupabase().auth.getSession();
  if (!data.session) return { kind: "invalid", reason: "Sign in to open the PRD." };
  const response = await fetch(`${supabaseUrl().replace(/\/$/, "")}/functions/v1/prd-open`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${data.session.access_token}`,
      apikey: supabasePublishableKey(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ projectId, organizationId }),
  });
  const text = await response.text();
  if (response.ok) return null;
  return refusalFrom(text);
}

function refusalFrom(value: unknown): PrdRefusal {
  if (typeof value === "string") {
    try {
      return refusalFrom(JSON.parse(value));
    } catch {
      return { kind: "invalid", reason: value || "The PRD did not open." };
    }
  }
  const parsed = parseRefusal(value);
  if (parsed) return parsed;
  if (value !== null && typeof value === "object" && !Array.isArray(value)) {
    const reason = (value as { reason?: unknown }).reason;
    if (typeof reason === "string" && reason !== "") return { kind: "invalid", reason };
  }
  return { kind: "invalid", reason: "The PRD did not open." };
}

function SignInForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);
    const { error: signInError } = await getSupabase().auth.signInWithPassword({ email, password });
    setPending(false);
    if (signInError) {
      setError(
        (signInError.status ?? 0) >= 500
          ? "Sign-in is not available right now. Try again in a minute."
          : signInError.message,
      );
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-4 p-4">
      <h1 className="text-xl font-semibold">Sign in</h1>
      <form className="flex flex-col gap-3" onSubmit={onSubmit}>
        <label className="flex flex-col gap-1 text-sm">
          Email
          <Input
            type="email"
            autoComplete="username"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Password
          <Input
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
        </label>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        <Button type="submit" disabled={pending}>
          Sign in
        </Button>
      </form>
    </main>
  );
}
