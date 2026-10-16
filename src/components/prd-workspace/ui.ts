import type { TopicState } from "@/lib/prd-stream";
import type { Tone } from "./model";

export const FOCUS =
  "outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background";

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

export const DEV_BUTTON = `inline-flex min-h-9 items-center max-md:min-h-11 max-md:min-w-11 max-md:text-sm justify-center rounded-lg bg-actor-dev px-3.5 text-xs font-semibold text-actor-on hover:opacity-90 aria-disabled:cursor-not-allowed aria-disabled:opacity-50 ${FOCUS}`;
export const NGO_BUTTON = `inline-flex min-h-9 items-center max-md:min-h-11 max-md:min-w-11 max-md:text-sm justify-center rounded-lg bg-actor-ngo px-3.5 text-xs font-semibold text-actor-on hover:opacity-90 aria-disabled:cursor-not-allowed aria-disabled:opacity-50 ${FOCUS}`;
export const PLAIN_BUTTON = `inline-flex min-h-9 items-center max-md:min-h-11 max-md:min-w-11 max-md:text-sm justify-center rounded-lg border border-input bg-background px-3.5 text-xs font-semibold text-foreground hover:bg-accent ${FOCUS}`;
export const LINK_BUTTON = `inline-flex min-h-8 items-center max-md:min-h-11 max-md:min-w-11 rounded-sm text-xs text-foreground/80 hover:text-foreground hover:underline ${FOCUS}`;
