import type { TopicState } from "@/lib/prd-stream";
import type { Tone } from "./model";

export const TONE_TEXT: Readonly<Record<Tone, string>> = {
  muted: "text-muted-foreground",
  dev: "text-actor-dev",
  ngo: "text-actor-ngo",
  stop: "text-destructive",
  ok: "text-funds-ok",
};

export const STATE_BADGE: Readonly<Record<TopicState, string>> = {
  open: "border-border bg-muted text-foreground",
  draft: "border-dashed border-muted-foreground bg-background text-foreground",
  ready: "border-actor-dev-line bg-actor-dev-soft text-actor-dev",
  confirmed: "border-funds-ok/40 bg-funds-ok/10 text-funds-ok",
  "needs-review": "border-destructive/40 bg-destructive/10 text-destructive",
};

export const BAND_TEXT = {
  ok: "text-funds-ok",
  warn: "text-funds-warn",
  stop: "text-funds-stop",
} as const;

export const BAND_BAR = {
  ok: "bg-funds-ok",
  warn: "bg-funds-warn",
  stop: "bg-funds-stop",
} as const;

export const ACTION =
  "h-auto min-h-9 rounded-lg px-3.5 py-0 text-xs font-semibold aria-disabled:cursor-not-allowed aria-disabled:opacity-50 max-md:min-h-11 max-md:min-w-11 max-md:text-sm";

export const LINK =
  "h-auto min-h-8 justify-start rounded-sm p-0 text-xs font-normal text-foreground/80 hover:text-foreground max-md:min-h-11 max-md:min-w-11";
