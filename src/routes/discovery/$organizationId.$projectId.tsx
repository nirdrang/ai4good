import { useChat } from "@ai-sdk/react";
import { createFileRoute } from "@tanstack/react-router";
import { DefaultChatTransport, type UIMessage } from "ai";
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import Markdown from "react-markdown";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  isAllowance,
  isDiscoveryTurn,
  messagesFromTurns,
  parseConversationBody,
  pollUntilTurnSettled,
  refusalFromResponseText,
  type Allowance,
  type ConversationRead,
  type DiscoveryTurn,
  type Refusal,
} from "@/lib/discovery-chat";
import { getSupabase, supabasePublishableKey, supabaseUrl } from "@/lib/supabase";

export const Route = createFileRoute("/discovery/$organizationId/$projectId")({
  ssr: false,
  component: DiscoveryChatPage,
});

type SessionState = "unknown" | "signed-out" | "signed-in";
type HistoryState = { kind: "loading" } | ConversationRead;

function functionsUrl(name: string): string {
  return `${supabaseUrl().replace(/\/$/, "")}/functions/v1/${name}`;
}

function textOf(message: UIMessage): string {
  return message.parts.flatMap((part) => (part.type === "text" ? [part.text] : [])).join("");
}

function maxSeq(turns: DiscoveryTurn[]): number {
  let max = 0;
  for (const turn of turns) {
    if (turn.seq > max) max = turn.seq;
  }
  return max;
}

function jsonBodyHasReason(text: string): boolean {
  try {
    const parsed: unknown = JSON.parse(text);
    return parsed !== null && typeof parsed === "object" && typeof (parsed as { reason?: unknown }).reason === "string";
  } catch {
    return false;
  }
}

async function readConversation(projectId: string): Promise<ConversationRead> {
  try {
    const { data } = await getSupabase().auth.getSession();
    const token = data.session?.access_token;
    if (!token) return { kind: "failed", reason: "no session token" };

    const response = await fetch(functionsUrl("discovery-conversation"), {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        apikey: supabasePublishableKey(),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ projectId }),
    });
    const text = await response.text();
    return parseConversationBody(text);
  } catch (error) {
    return { kind: "failed", reason: error instanceof Error ? error.message : String(error) };
  }
}

function DiscoveryChatPage() {
  const { organizationId, projectId } = Route.useParams();
  const [session, setSession] = useState<SessionState>("unknown");
  const [history, setHistory] = useState<HistoryState>({ kind: "loading" });
  const [loadToken, setLoadToken] = useState(0);

  useEffect(() => {
    const { data } = getSupabase().auth.onAuthStateChange((_event, next) => {
      setSession(next ? "signed-in" : "signed-out");
    });
    return () => data.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (session !== "signed-in") {
      setHistory({ kind: "loading" });
      return;
    }
    let cancelled = false;
    setHistory({ kind: "loading" });
    void readConversation(projectId).then((next) => {
      if (!cancelled) setHistory(next);
    });
    return () => {
      cancelled = true;
    };
  }, [session, projectId, loadToken]);

  if (session === "unknown") return null;

  if (session === "signed-out") {
    return <SignInForm />;
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col gap-4 p-4">
      <h1 className="text-xl font-semibold">Discovery</h1>
      <p className="text-sm text-muted-foreground">
        organisation {organizationId} · project {projectId}
      </p>
      {history.kind === "loading" ? <p>loading</p> : null}
      {history.kind === "failed" ? (
        <div className="flex flex-col gap-2">
          <p>{history.reason}</p>
          <Button type="button" onClick={() => setLoadToken((value) => value + 1)}>
            Retry
          </Button>
        </div>
      ) : null}
      {history.kind === "loaded" ? (
        <DiscoveryChat
          organizationId={organizationId}
          projectId={projectId}
          turns={history.turns}
          initialAllowance={history.allowance}
        />
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

function DiscoveryChat({
  organizationId,
  projectId,
  turns,
  initialAllowance,
}: {
  organizationId: string;
  projectId: string;
  turns: DiscoveryTurn[];
  initialAllowance: Allowance | null;
}) {
  const [allowance, setAllowance] = useState<Allowance | null>(initialAllowance);
  const [settling, setSettling] = useState(false);
  const [refusal, setRefusal] = useState<Refusal | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const knownMaxSeqRef = useRef(maxSeq(turns));
  const restoreDraftRef = useRef(false);
  const api = functionsUrl("discovery-message");
  const anonKey = supabasePublishableKey();

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api,
        headers: async () => {
          const { data } = await getSupabase().auth.getSession();
          return {
            Authorization: `Bearer ${data.session?.access_token ?? ""}`,
            apikey: anonKey,
            Accept: "text/event-stream",
          };
        },
        prepareSendMessagesRequest: ({ messages }) => {
          let message = "";
          for (let i = messages.length - 1; i >= 0; i--) {
            if (messages[i].role !== "user") continue;
            message = textOf(messages[i]);
            break;
          }
          return { body: { organizationId, projectId, message } };
        },
      }),
    [anonKey, api, organizationId, projectId],
  );

  const { messages, sendMessage, setMessages, status, stop } = useChat({
    messages: messagesFromTurns(turns),
    transport,
    onData: (part) => {
      if (part.type !== "data-turn") return;
      const data = part.data;
      if (data === null || typeof data !== "object") return;
      const record = data as { allowance?: unknown; turn?: unknown };
      if (isAllowance(record.allowance)) setAllowance(record.allowance);
      if (isDiscoveryTurn(record.turn) && record.turn.seq > knownMaxSeqRef.current) {
        knownMaxSeqRef.current = record.turn.seq;
      }
    },
    onError: (error) => {
      if (jsonBodyHasReason(error.message)) {
        setRefusal(refusalFromResponseText(error.message));
        setMessages((current) => {
          const last = current.at(-1);
          if (last?.role !== "user") return current;
          restoreDraftRef.current = true;
          setDraft(textOf(last));
          return current.slice(0, -1);
        });
        return;
      }
      setRefusal({ kind: null, reason: error.message });
      setSettling(true);
      void settle();
    },
  });

  const busy = settling || status === "submitted" || status === "streaming";
  const stopEnabled = status === "submitted" || status === "streaming";

  async function settle() {
    const next = await pollUntilTurnSettled(
      () => readConversation(projectId),
      knownMaxSeqRef.current,
      { deadlineMs: 20_000, intervalMs: 500 },
    );
    if (next.kind === "failed") {
      setNotice(next.reason);
    } else {
      setAllowance(next.allowance);
      if (next.kind === "still-open") {
        setNotice("the stopped turn is still settling; reload to see its charge");
      } else {
        knownMaxSeqRef.current = maxSeq(next.turns);
        setMessages(messagesFromTurns(next.turns));
        if (next.kind === "no-turn") setNotice("the stopped message did not reach Discovery; nothing was charged");
      }
    }
    setSettling(false);
  }

  async function onSend(event: FormEvent) {
    event.preventDefault();
    const text = draft.trim();
    if (!text || busy) return;
    restoreDraftRef.current = false;
    setRefusal(null);
    setNotice(null);
    try {
      await sendMessage({ text });
    } catch {
      setDraft(text);
      return;
    }
    if (!restoreDraftRef.current) setDraft("");
  }

  async function onStop() {
    setSettling(true);
    await stop();
    await settle();
  }

  return (
    <section className="flex flex-1 flex-col gap-4">
      {allowance ? (
        <p>
          {allowance.remaining} of {allowance.dailyGrant} credits today
          {allowance.vetted ? ", vetted" : ", not vetted"}
        </p>
      ) : (
        <p>allowance unavailable</p>
      )}
      <ol className="flex flex-col gap-3">
        {messages.map((message) => {
          const text = textOf(message);
          if (!text && message.role !== "assistant") return null;
          return (
            <li key={message.id}>
              {message.role === "user" ? (
                <p>{text}</p>
              ) : text ? (
                <Markdown>{text}</Markdown>
              ) : null}
            </li>
          );
        })}
      </ol>
      {notice ? <p>{notice}</p> : null}
      {refusal ? (
        <div>
          <p>{refusal.reason}</p>
          {refusal.kind ? <p className="text-xs">{refusal.kind}</p> : null}
        </div>
      ) : null}
      <form className="flex flex-col gap-2" onSubmit={onSend}>
        <Textarea
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          rows={4}
        />
        <div className="flex items-center gap-2">
          <Button type="submit" disabled={busy || draft.trim().length === 0}>
            Send
          </Button>
          <Button type="button" variant="outline" disabled={!stopEnabled} onClick={() => void onStop()}>
            Stop
          </Button>
          <span>{status}</span>
        </div>
      </form>
    </section>
  );
}
