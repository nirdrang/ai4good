import { useLayoutEffect, useRef, useState, type ChangeEvent } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { SCREEN, TEXT } from "./a11y";

export function Composer({
  text,
  canSend,
  paid,
  onText,
  onSend,
}: {
  text: string;
  canSend: boolean;
  paid: boolean;
  onText(text: string): void;
  onSend(): void;
}) {
  const fieldRef = useRef<HTMLTextAreaElement>(null);
  const [height, setHeight] = useState<number | null>(null);
  useLayoutEffect(() => {
    const field = fieldRef.current;
    if (!field) return;
    field.style.height = "auto";
    const next = Math.min(field.scrollHeight, 192);
    field.style.height = `${next}px`;
    setHeight(next);
  }, [text]);
  function onChange(event: ChangeEvent<HTMLTextAreaElement>) {
    onText(event.target.value);
  }
  return (
    <form
      role={SCREEN.composer.role}
      aria-label={SCREEN.composer.name}
      className="flex w-full min-w-0 items-start gap-2"
      onSubmit={(event) => {
        event.preventDefault();
        if (canSend) onSend();
      }}
    >
      <Textarea
        ref={fieldRef}
        aria-label={SCREEN.messageBox.name}
        rows={1}
        value={text}
        style={height === null ? undefined : { height }}
        className="min-h-0 min-w-0 flex-1 resize-none overflow-y-auto py-2 text-base leading-5"
        onChange={onChange}
      />
      <Button type="submit" className="h-auto min-h-11 shrink-0" disabled={!canSend}>
        {paid ? TEXT.sendPaid : TEXT.send}
      </Button>
    </form>
  );
}
