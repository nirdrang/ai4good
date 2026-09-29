import { useEffect, useState } from "react";
import type { DiscoveryState } from "@/lib/discovery-stream";
import { Composer } from "./Composer";
import { Conversation } from "./Conversation";
import { FilesCard } from "./FilesCard";
import { currentQuestions } from "./model";
import type { DiscoveryPort } from "./port";
import { useDiscovery } from "./use-discovery";
import { useIsPhone } from "./use-is-phone";

export function DiscoveryScreen({
  port,
  organizationId,
  projectId,
}: {
  port: DiscoveryPort;
  organizationId: string;
  projectId: string;
}) {
  const [loaded, setLoaded] = useState<DiscoveryState | null>(null);
  const [failure, setFailure] = useState<string | null>(null);
  useEffect(() => {
    let live = true;
    port.load().then(
      (result) => {
        if (!live) return;
        if (result.ok) setLoaded(result.value);
        else setFailure(result.refusal.reason);
      },
      (error: unknown) => {
        if (!live) return;
        setFailure(error instanceof Error ? error.message : "Discovery did not load.");
      },
    );
    return () => {
      live = false;
    };
  }, [port]);
  if (failure) return <p role="alert">{failure}</p>;
  if (!loaded) return <p>Loading Discovery.</p>;
  return (
    <Loaded port={port} initial={loaded} organizationId={organizationId} projectId={projectId} />
  );
}

function Loaded({
  port,
  initial,
  organizationId,
  projectId,
}: {
  port: DiscoveryPort;
  initial: DiscoveryState;
  organizationId: string;
  projectId: string;
}) {
  const phone = useIsPhone();
  const discovery = useDiscovery(port, initial, { organizationId, projectId });
  const questions = currentQuestions(discovery.brief);
  return (
    <div className="flex flex-col gap-4">
      {discovery.refusal ? <p role="alert">{discovery.refusal.reason}</p> : null}
      <div
        className={
          phone
            ? "flex flex-col gap-4"
            : "grid grid-cols-[minmax(0,1fr)_20rem] items-start gap-4"
        }
      >
        <div className="flex min-w-0 flex-col gap-4">
          <Conversation
            messages={discovery.messages}
            questions={questions}
            drafts={discovery.drafts}
            onPick={discovery.pick}
          />
          <Composer
            text={discovery.composerText}
            canSend={discovery.canSend}
            onText={discovery.setComposerText}
            onSend={() => void discovery.send()}
          />
        </div>
        <FilesCard files={discovery.files} funded={discovery.project.funded} />
      </div>
    </div>
  );
}
