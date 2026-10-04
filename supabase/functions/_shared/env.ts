/**
 * A required environment variable, or a loud failure at first use.
 *
 * `SUPABASE_SERVICE_ROLE_KEY` is accepted under either of its two names because the CLI has been
 * renaming its key vocabulary — newer versions inject `SUPABASE_SECRET_KEY` — and a function that
 * boots and then 500s on its first database call because it read `undefined` is much harder to
 * diagnose than one that says which variable it wanted.
 */
export function requireEnv(...names: string[]): string {
  for (const name of names) {
    const value = Deno.env.get(name);
    if (value && value.trim() !== '') return value;
  }
  throw new Error(`none of ${names.join(', ')} is set in this function's environment`);
}

