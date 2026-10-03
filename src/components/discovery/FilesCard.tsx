import { useId, type Ref } from "react";
import type { DiscoveryFile } from "@/lib/discovery-stream";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { NAME, SCREEN, TEXT } from "./a11y";
import { fileRows, type FileRowView } from "./model";

function FileRow({ row, onOpen }: { row: FileRowView; onOpen(fileId: string): void }) {
  const nameId = useId();
  return (
    <li aria-labelledby={nameId} className="flex min-w-0 flex-col gap-1">
      <div className="flex min-w-0 items-start gap-2">
        {row.canOpen ? (
          <Button
            id={`discovery-file-${row.id}`}
            type="button"
            variant="ghost"
            aria-label={NAME.openFile(row.name)}
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
      {row.percent !== null && row.tone ? (
        <Progress
          className="h-1"
          indicatorClassName="bg-progress-reading"
          value={row.percent}
          aria-label={NAME.reading(row.name)}
        />
      ) : null}
    </li>
  );
}

export function FilesCard({
  files,
  funded,
  finished = false,
  dense = false,
  addRef,
  onAdd,
  onOpen,
}: {
  files: readonly DiscoveryFile[];
  funded: boolean;
  finished?: boolean;
  dense?: boolean;
  addRef?: Ref<HTMLButtonElement>;
  onAdd(): void;
  onOpen(fileId: string): void;
}) {
  const view = fileRows(files, funded);
  const countText = view.limitText !== null ? `${view.discoveryCount} of 3 added` : `${view.discoveryCount} added`;
  const canAdd = view.canAdd && !finished;
  return (
    <section
      role={SCREEN.files.role}
      aria-label={SCREEN.files.name}
      className={dense ? "min-w-0 max-w-full shrink-0 max-h-28 overflow-y-auto" : "min-w-0 max-w-full shrink-0"}
    >
      <Card>
        <CardHeader className={dense ? "space-y-0 p-2" : "space-y-1 p-3"}>
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              <h2 className={dense ? "text-sm font-semibold" : "text-base font-semibold"}>{SCREEN.files.name}</h2>
              <p className="text-sm text-muted-foreground">{countText}</p>
            </div>
            <Button
              ref={addRef}
              type="button"
              variant="outline"
              className={`h-auto min-h-11 max-w-full whitespace-normal ${canAdd ? "" : "opacity-50"}`}
              aria-disabled={canAdd ? undefined : true}
              onClick={() => {
                if (canAdd) onAdd();
              }}
            >
              {SCREEN.addFile.name}
            </Button>
          </div>
          {finished ? (
            <p className="text-sm text-muted-foreground">{TEXT.filesFinished}</p>
          ) : view.limitText && !dense ? (
            <p className="text-sm text-muted-foreground">{view.limitText}</p>
          ) : null}
        </CardHeader>
        <CardContent className={dense ? "flex flex-col gap-1 p-2 pt-0" : "flex flex-col gap-2 p-3 pt-0"}>
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
