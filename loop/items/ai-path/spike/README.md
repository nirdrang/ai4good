# Throwaway spike: three AI paths behind one edge function

This spike is throwaway. It exists to make the decision in `../memo.md`. No product code imports it.

## What is here

- `spike-ai/index.ts` is one Supabase edge function. The request body picks the path: `anthropic` (Claude API with our tool loop), `openrouter` (OpenRouter with our tool loop), or `managed` (Claude Managed Agents). Every path holds money before the call, streams in the same UI message stream format as Discovery, and settles each receipt once.
- `ledger.sql` is a throwaway `spike` schema. It has a hold before the call, a settle that is unique per path and receipt, pending for a missing cost, and a one-time reconcile.
- `ledger-check.sh` exercises the ledger on the local database. Its output is `ledger-check.out`.
- `placeholder-run.sh` calls each path once in the real edge runtime with placeholder keys. Its output is `placeholder-run.out`.
- `setup-managed.ts` creates the Managed Agents environment and agent once.
- `run.ts` is the live driver. It sends three chat replies and one act request per path. It records the time to the first text and the total time. It reads back the GitHub commit and the Linear issue, compares each settled OpenRouter amount with the generation lookup, reports Managed Agents' own `list_cost` beside the settled sum, and searches the browser bytes for every key. It refuses to start without every key.

## Run the ledger check (no keys needed)

```bash
bun run db:start
loop/items/ai-path/spike/ledger-check.sh
```

## Run the live comparison

The live run needs these environment variables. Add them as network secrets in the cloud environment settings, then start a new session.

| Variable | What it is |
| --- | --- |
| `SPIKE_ANTHROPIC_PROJECT_KEY` | A Claude API key in a throwaway workspace with Managed Agents access |
| `SPIKE_OPENROUTER_PROJECT_KEY` | An OpenRouter key with a small credit limit |
| `SPIKE_LINEAR_API_KEY` | A Linear personal API key |
| `SPIKE_LINEAR_TEAM_ID` | The id of a Linear test team. The workspace has none today, only AI4DEV and AI4PM. |
| `SPIKE_GITHUB_REPO` | `owner/name` of a sandbox repository |
| `SPIKE_GITHUB_TOKEN` | A fine-grained token with contents read and write on that repository only |

In this cloud container, the egress proxy adds its own GitHub credentials. A placeholder token reached `api.github.com` as the founder's account. A live run therefore writes to GitHub as the founder. Point `SPIKE_GITHUB_REPO` only at a sandbox repository.

```bash
deno run -A loop/items/ai-path/spike/setup-managed.ts   # prints the two SPIKE_MANAGED_* ids
# stage the function without the repo package.json, then start it in the edge runtime
stage=$(mktemp -d); mkdir -p $stage/loop/items/ai-path $stage/supabase/functions/_shared
cp -r loop/items/ai-path/spike $stage/loop/items/ai-path/
cp supabase/functions/_shared/discovery-stream.ts $stage/supabase/functions/_shared/
docker run -d --name spike-ai --network host -v $stage:/w --env-file spike.env \
  public.ecr.aws/supabase/edge-runtime:v1.74.2 start --main-service /w/loop/items/ai-path/spike/spike-ai -p 9000
SPIKE_DB_URL=postgresql://postgres:postgres@127.0.0.1:44322/postgres deno run -A loop/items/ai-path/spike/run.ts
```

`SPIKE_RUNS` sets the chat replies for each path (default 3). `SPIKE_PATHS` limits the paths. The live run spends real money on all three providers.
