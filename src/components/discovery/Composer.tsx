import type { ChangeEvent } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { SCREEN } from "./a11y";

export function Composer({
  text,
  canSend,
  onText,
  onSend,
}: {
  text: string;
  canSend: boolean;
  onText(text: string): void;
  onSend(): void;
}) {
  function onChange(event: ChangeEvent<HTMLTextAreaElement>) {
    const field = event.target;
    field.style.height = "auto";
    field.style.height = `${Math.min(field.scrollHeight, 192)}px`;
    onText(field.value);
  }
  return (
    <form
      role={SCREEN.composer.role}
      aria-label={SCREEN.composer.name}
      className="flex flex-col gap-2"
      onSubmit={(event) => {
        event.preventDefault();
        if (canSend) onSend();
      }}
    >
      <Textarea
        aria-label={SCREEN.messageBox.name}
        rows={1}
        value={text}
        className="min-h-10 max-h-48 resize-none"
        onChange={onChange}
      />
      <Button type="submit" className="self-start" disabled={!canSend}>
        Send
      </Button>
    </form>
  );
}
