import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { DiscoveryReview, DiscoveryScreen } from "@/components/discovery";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { discoveryPort } from "@/lib/discovery-port";
import { getSupabase } from "@/lib/supabase";

export const Route = createFileRoute("/discovery/$organizationId/$projectId")({
  ssr: false,
  component: DiscoveryPage,
});

function DiscoveryPage() {
  const { organizationId, projectId } = Route.useParams();
  const navigate = Route.useNavigate();
  const [session, setSession] = useState<"unknown" | "signed-out" | "signed-in">("unknown");
  const [review, setReview] = useState(() => location.hash === "#review");
  const [returnFocus, setReturnFocus] = useState<{ questionId: string; nonce: number } | null>(null);
  const nonce = useRef(0);
  const port = useMemo(() => discoveryPort({ organizationId, projectId }), [organizationId, projectId]);

  useEffect(() => {
    const { data } = getSupabase().auth.onAuthStateChange((_event, next) => {
      setSession(next ? "signed-in" : "signed-out");
    });
    return () => data.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const update = () => setReview(location.hash === "#review");
    window.addEventListener("hashchange", update);
    return () => window.removeEventListener("hashchange", update);
  }, []);

  if (session === "unknown") return null;
  if (session === "signed-out") return <SignInForm />;
  return (
    <main className="flex h-dvh min-h-0 min-w-0 flex-col overflow-hidden bg-background p-3 text-foreground md:p-4">
      <div hidden={review} className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <DiscoveryScreen port={port} active={!review} returnFocus={returnFocus} onOpenReview={() => { location.hash = "review"; }} />
      </div>
      {review ? (
        <DiscoveryReview port={port} onBackToChat={(questionId) => {
          setReturnFocus(questionId === null ? null : { questionId, nonce: ++nonce.current });
          location.hash = "";
        }} onFindVolunteer={() => { void navigate({ to: "/" }); }} />
      ) : null}
    </main>
  );
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
    const { error: signInError } = await getSupabase().auth.signInWithPassword({
      email,
      password,
    });
    setPending(false);
    if (signInError) setError(signInError.message);
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

