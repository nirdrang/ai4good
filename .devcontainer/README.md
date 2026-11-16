# Viewer codespace

A codespace runs the app for one branch: the local Supabase stack (migrations, edge functions,
the Harbor Community Kitchen sample NGO and project) and the Vite dev server on port 8080. The
port stays private, so only your GitHub login opens it.

## How it starts

- Every push to a `claude/**` branch runs the workflow "Viewer codespace". It finds the codespace
  for that branch, creates it if none exists, starts it if it is stopped, and puts a `viewer`
  status with the app link on the pushed commit. The status turns green when the app answers.
- Run the workflow by hand with `action: stop` to stop one early. A codespace also stops after 30
  idle minutes and is deleted 3 days after it stops. Its work is all on the branch already.
- Inside the codespace, `.devcontainer/viewer.sh` follows the branch every 10 seconds. It runs
  `bun install` when the lockfile changes and `supabase migration up` when a migration arrives.

Sign in as `preview-ngo@ai4good.example` with the `VIEWER_NGO_PASSWORD` Codespaces secret, or
`viewer-kitchen-2026` when it is not set. Logs are in `/tmp/viewer.log` and `/tmp/viewer-app.log`.

## Set by hand once

- Repository Actions secret `CODESPACES_TOKEN`: a personal access token (classic) with only the
  `codespace` scope.
- Codespaces secrets for this repository: `DISCOVERY_API_KEY` (and `ANTHROPIC_API_KEY` if a
  function needs it), and `VIEWER_NGO_PASSWORD` if you want your own password.
- Optional: a prebuild for `main` in Settings, Codespaces, to cut the first start.
