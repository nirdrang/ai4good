import { Button } from "@/components/ui/button";
import { SCREEN } from "./a11y";

export function DiscoveryReview({ onBackToChat }: { onBackToChat: () => void }) {
  return (
    <main aria-label={SCREEN.review.name} className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold">{SCREEN.review.name}</h1>
      <Button type="button" variant="outline" className="self-start" onClick={onBackToChat}>
        {SCREEN.reviewBack.name}
      </Button>
    </main>
  );
}
