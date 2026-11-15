import { Button } from "@/components/ui/button";
import { getSupabase } from "@/lib/supabase";
import { TEXT } from "./a11y";

export function Refused() {
  return (
    <section role="alert" className="mx-auto flex max-w-md flex-col gap-3 py-8">
      <h1 className="m-0 text-xl font-semibold">{TEXT.refused.title}</h1>
      <p className="m-0 text-sm">{TEXT.refused.body}</p>
      <div className="flex flex-wrap gap-2">
        <Button type="button" onClick={() => void getSupabase().auth.signOut()}>
          {TEXT.refused.signOut}
        </Button>
        <Button asChild variant="outline">
          <a href="/">{TEXT.refused.home}</a>
        </Button>
      </div>
    </section>
  );
}
