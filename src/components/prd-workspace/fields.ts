import { useLayoutEffect, useRef, type KeyboardEvent } from "react";

export function useGrowingField(text: string, max: number) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useLayoutEffect(() => {
    const field = ref.current;
    if (!field) return;
    field.style.height = "auto";
    field.style.height = `${Math.min(field.scrollHeight, max)}px`;
  }, [text, max]);
  return ref;
}

export function submitOnEnter(event: KeyboardEvent<HTMLTextAreaElement>, send: () => void) {
  if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
    event.preventDefault();
    send();
  }
}
