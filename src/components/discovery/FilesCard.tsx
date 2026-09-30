import { useId } from "react";
import type { DiscoveryFile } from "@/lib/discovery-stream";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { NAME, SCREEN } from "./a11y";
import { fileRows, type FileRowView } from "./model";

function FileRow({ row, onOpen }: { row: FileRowView; onOpen(fileId: string): void }) {
  const nameId = useId();
  return (
    <li aria-labelledby={nameId} className="flex min-w-0 flex-col gap-1">
      <div className="flex min-w-0 items-start gap-2">
        {row.canOpen ? (
          <Button
            type="button"
            variant="ghost"
            aria-label={NAME.openFileChat(row.name)}
            className="h-auto min-h-11 min-w-0 flex-1 justify-start whitespace-normal px-1 text-left"
            onClick={() => onOpen(row.id)}
          >
            <span id={nameId}>{row.name}</span>
          </Button>
        ) : (
          <span id={nameId} className="min-w-0 flex-1 py-2 text-sm">
            {row.name}
          </span>
        )}
        <span className="shrink-0 py-2 text-sm text-muted-foreground">{row.sizeText}</span>
      </div>
      <span className="text-sm text-muted-foreground">{row.statusText}</span>
      {row.percent !== null ? (
        <Progress className="h-1" value={row.percent} aria-label={NAME.reading(row.name)} />
      ) : null}
    </li>
  );
}

export function FilesCard({
  files,
  funded,
  onAdd,
  onOpen,
}: {
  files: readonly DiscoveryFile[];
  funded: boolean;
  onAdd(): void;
  onOpen(fileId: string): void;
}) {
  const view = fileRows(files, funded);
  const countText = view.limitText !== null ? `${view.discoveryCount} of 3 added` : `${view.discoveryCount} added`;
  return (
    <section role={SCREEN.files.role} aria-label={SCREEN.files.name} className="min-w-0 max-w-full shrink-0">
      <Card>
        <CardHeader className="space-y-1 p-3">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              <h2 className="text-base font-semibold">{SCREEN.files.name}</h2>
              <p className="text-sm text-muted-foreground">{countText}</p>
            </div>
            <Button
              type="button"
              variant="outline"
              className={`h-auto min-h-11 max-w-full whitespace-normal ${view.canAdd ? "" : "opacity-50"}`}
              aria-disabled={view.canAdd ? undefined : true}
              onClick={() => {
                if (view.canAdd) onAdd();
              }}
            >
              {SCREEN.addFile.name}
            </Button>
          </div>
          {view.limitText ? <p className="text-sm text-muted-foreground">{view.limitText}</p> : null}
        </CardHeader>
        <CardContent className="flex flex-col gap-2 p-3 pt-0">
          <ul className="flex flex-col gap-2">
            {view.rows.map((row) => (
              <FileRow key={row.id} row={row} onOpen={onOpen} />
            ))}
          </ul>
        </CardContent>
      </Card>
    </section>
  );
}
