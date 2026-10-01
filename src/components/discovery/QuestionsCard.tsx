import { useId } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { NAME, SCREEN } from "./a11y";
import { questionStatusText, type QuestionRow } from "./model";

const FULL_SCREEN =
  "inset-0 top-0 left-0 flex h-dvh w-screen max-w-none translate-x-0 translate-y-0 flex-col gap-0 rounded-none border-0 p-0 sm:rounded-none";

function Rows({
  rows,
  onAnswer,
  onView,
}: {
  rows: readonly QuestionRow[];
  onAnswer(questionId: string): void;
  onView(questionId: string): void;
}) {
  return (
    <ul className="flex flex-col gap-3">
      {rows.map((row) => (
        <Row key={row.topicId} row={row} onAnswer={onAnswer} onView={onView} />
      ))}
    </ul>
  );
}

function Row({
  row,
  onAnswer,
  onView,
}: {
  row: QuestionRow;
  onAnswer(questionId: string): void;
  onView(questionId: string): void;
}) {
  const labelId = useId();
  return (
    <li aria-labelledby={labelId} className="flex flex-col gap-1 border-b border-border pb-3 last:border-b-0">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p id={labelId} className="text-sm font-medium">
            {row.text}
          </p>
          <p className="text-sm font-semibold">{questionStatusText(row.status)}</p>
          <p className="text-sm text-muted-foreground">{row.note}</p>
        </div>
        {row.canAnswer && row.questionId ? (
          <Button
            type="button"
            variant="outline"
            className="h-auto min-h-11 shrink-0"
            aria-label={NAME.answerRow(row.text)}
            onClick={() => {
              if (row.questionId) onAnswer(row.questionId);
            }}
          >
            Answer
          </Button>
        ) : null}
        {row.canView && row.questionId ? (
          <Button
            type="button"
            variant="outline"
            className="h-auto min-h-11 shrink-0"
            aria-label={NAME.viewRow(row.text)}
            onClick={() => {
              if (row.questionId) onView(row.questionId);
            }}
          >
            View
          </Button>
        ) : null}
      </div>
    </li>
  );
}

export function QuestionsCard({
  rows,
  onAnswer,
  onView,
}: {
  rows: readonly QuestionRow[];
  onAnswer(questionId: string): void;
  onView(questionId: string): void;
}) {
  return (
    <section role={SCREEN.questions.role} aria-label={SCREEN.questions.name} className="min-h-0 min-w-0 flex-1 overflow-y-auto">
      <Card className="min-h-full">
        <CardHeader className="p-4">
          <h2 className="text-base font-semibold">{SCREEN.questions.name}</h2>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          <Rows rows={rows} onAnswer={onAnswer} onView={onView} />
        </CardContent>
      </Card>
    </section>
  );
}

export function QuestionsDialog({
  rows,
  onAnswer,
  onView,
  onClose,
}: {
  rows: readonly QuestionRow[];
  onAnswer(questionId: string): void;
  onView(questionId: string): void;
  onClose(): void;
}) {
  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className={FULL_SCREEN} onCloseAutoFocus={(event) => event.preventDefault()}>
        <div className="flex shrink-0 items-center gap-2 border-b p-3">
          <Button type="button" variant="outline" onClick={onClose}>
            {SCREEN.backToChat.name}
          </Button>
          <DialogTitle className="text-base">{SCREEN.questionsFull.name}</DialogTitle>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-3">
          <Rows rows={rows} onAnswer={onAnswer} onView={onView} />
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function questionCountLine(rows: readonly QuestionRow[]): string {
  const answered = rows.filter((row) => row.status === "answered" || row.status === "notSure").length;
  const open = rows.filter((row) => row.status === "open" || row.status === "ready").length;
  return `${answered} answered · ${open} open`;
}
