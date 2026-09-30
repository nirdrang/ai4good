import { useId } from "react";
import type { DiscoveryFile } from "@/lib/discovery-stream";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { SCREEN } from "./a11y";
import { fileRows } from "./model";

function FileRow({ name, status }: { name: string; status: string }) {
  const nameId = useId();
  return (
    <li aria-labelledby={nameId} className="flex flex-col">
      <span id={nameId}>{name}</span>
      <span className="text-sm text-muted-foreground">{status}</span>
    </li>
  );
}

export function FilesCard({ files, funded }: { files: readonly DiscoveryFile[]; funded: boolean }) {
  const view = fileRows(files, funded);
  const countText =
    view.limitText !== null ? `${view.discoveryCount} of 3 added` : `${view.discoveryCount} added`;
  return (
    <section role={SCREEN.files.role} aria-label={SCREEN.files.name} className="min-w-0 shrink-0">
      <Card>
        <CardHeader className="space-y-1 p-3">
          <h2 className="text-base font-semibold">{SCREEN.files.name}</h2>
          <p className="text-sm text-muted-foreground">{countText}</p>
          {view.limitText ? <p className="text-sm text-muted-foreground">{view.limitText}</p> : null}
        </CardHeader>
        <CardContent className="flex flex-col gap-2 p-3 pt-0">
          <ul className="flex flex-col gap-2">
            {view.rows.map((row) => (
              <FileRow key={row.id} name={row.name} status={row.statusText} />
            ))}
          </ul>
          <Button type="button" variant="outline" aria-disabled={view.canAdd ? undefined : true}>
            {SCREEN.addFile.name}
          </Button>
        </CardContent>
      </Card>
    </section>
  );
}
