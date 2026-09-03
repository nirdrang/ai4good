# Cloud sessions - how to bring one up, and where each value goes

This file explains how to create a Claude Code cloud environment for this repository, what
goes into each configuration surface, and what a session start should look like. The setup
script itself is the tracked template beside this file: `.claude/cloud-environment-setup.sh`.

## The three surfaces, and what each one carries

A cloud environment has three places to put things, and they do not overlap:

| surface | runs | carries |
|---|---|---|
| **Setup script** (web form) | once per environment, BEFORE Claude Code launches; the filesystem is then snapshotted | VM provisioning: the codex, opencode and grok CLIs, PowerShell, the docker shim, image and package caches, the OpenCode Go credential |
| **Environment variables** (web form) | copied into every SESSION at start | nothing today; the harness reads no environment variable for the database |
| **SessionStart hook** (tracked, `.claude/hooks/session-start-banner.sh`) | every session start and resume, inside the session | per-session processes and status: starts dockerd, installs node_modules if missing, reports whether the pstack marketplace is present, and reports codex, grok and opencode login state |
| **Tracked project files** (`.claude/settings.json`, `.claude/pstack-models.md`, `CLAUDE.md`) | read by Claude Code inside every session | the pstack plugin and where to fetch it, the model sheet, the way of work |

Two boundaries explain the split, both learned by watching the wrong version fail:

- **The setup script cannot see the environment variables.** Variables are copied into the
  session; the script runs before any session exists. The script defines what it needs
  inline.
- **The setup script has no repository.** Its working directory is not a checkout. It fetches
  the two files it needs (`package.json`, `bun.lock`) from `main` over HTTPS instead.

## Bring-up, step by step

1. On claude.ai/code, create (or edit) a cloud environment. Network access: the default
   Trusted level is enough; Full also works.
2. Leave the **Environment variables** box empty. Do NOT put the OpenCode Go key there - see Secrets below.
3. Copy the full contents of `.claude/cloud-environment-setup.sh` into the **Setup script**
   box.
4. In the pasted text, replace `PASTE_YOUR_OPENCODE_GO_KEY_HERE` with the real OpenCode Go
   key. In the web form only - never in the tracked file. The script refuses to run while
   the placeholder is still there.
5. Save, and start a new session. The first session pays the build: about 3 minutes
   (installs, 8.4 GB of Supabase images, an 800 MB bun package cache). It ends with a
   `setup complete` line that counts the cached images. Anthropic then snapshots the
   filesystem, and every later session boots from that snapshot and skips the script.
6. If the build fails, the error is shown, nothing is snapshotted, and the script runs
   again on the next session. Fix and retry.
7. Restart the first session once. The pstack plugin is installed by Claude Code inside
   the session, and in the first session of a fresh environment it is not active yet (see
   "pstack, in cloud" below). The banner line `pstack: marketplace NOT cloned yet` says so.
8. Run the two subscription logins that session needs: `codex login --device-auth` and
   `grok login --device-auth`. The banner says which ones are missing.

## Secrets

**There is no secrets store.** The documentation is explicit that both the variables box
and the setup script "live in the environment configuration, where anyone who uses the
environment can read them". So the rules are about damage control, not concealment:

- **The OpenCode Go key** goes in the setup script, in the web form. Not in the variables
  box (opencode never reads a variable by that name - it reads the `auth.json` the script
  writes, so a copy in the box is exposure that buys nothing). Not in the tracked template
  (repository readers are a wider audience than environment users). Treat any key placed in
  an environment as disclosed, and rotate it when that matters.
- **The codex ChatGPT login cannot be stored at all.** It is an OAuth session credential.
  Run `codex login --device-auth` once per fresh VM; the session banner says when this is
  needed. Device code authorization must be enabled once in the ChatGPT account's security
  settings.
- **The grok.com login cannot be stored either**, for the same reason. Run
  `grok login --device-auth` once per fresh VM; the banner says when. Grok tokens expire
  after 7 days, so a session that lives longer logs in again. Do NOT use an xAI API key
  (`XAI_API_KEY`) instead: it would work headless, but it bills console.x.ai per token,
  and the founder wants the subscription used, as with codex (founder 2026-09-03: *"i want
  to benefit from my grok sunscription like codex not pay per PAI"*).
- **`AT_JUDGE_API_KEY`** (the semantic judge's credential) has no reader: the judge is parked
  under `loop/parked/v1/`, and `.env.example` says so. Nothing needs it in the variables box.

## What a session start looks like

The SessionStart hook prints a banner on every start and resume:

```
== ai4good cloud session ==
docker: daemon started
pstack: marketplace present
codex: NOT logged in - run: codex login --device-auth
grok: NOT logged in - run: grok login --device-auth
opencode: OpenCode Go authenticated
```

- `docker: daemon started` is normal - a snapshot keeps files, never running processes, so
  dockerd is started fresh every session.
- `pstack: marketplace NOT cloned yet` appears in the first session of a fresh environment.
  Restart that session once and the line turns to `marketplace present`.
- `codex: NOT logged in` and `grok: NOT logged in` are expected on every fresh VM (see
  Secrets). Log in only if that session needs that lane. Every pstack item needs both.
- `opencode: OpenCode Go authenticated` should appear immediately - the credential file is
  in the snapshot. If it says NOT authenticated, the setup script did not run with a real
  key.
- A `node_modules: missing, installing...` line appears only when the clone lacks them;
  the warm bun cache makes it a local link operation, seconds not minutes.

## What persists where

- **The environment snapshot** is taken once, right after the setup script succeeds. It
  keeps files only: CLIs, caches, images, credentials written to disk. It is rebuilt when
  the setup script text changes, when the allowed network hosts change, or after roughly
  seven days. To force a rebuild - for example after a Supabase CLI bump lands on `main` -
  make any trivial edit to the setup script and start a new session.
- **The session disk** belongs to one session and survives its resumes. Anything a session
  installs or pulls stays with that session only and never reaches the snapshot.
- **Correctness never depends on either cache.** Every session runs
  `bun install --frozen-lockfile` against its own checkout's lockfile; a stale cache costs
  download time, never wrong versions.

## pstack, in cloud

The way of work runs on the pstack plugin. Four facts decide how it reaches a cloud session:

- **The plugin is installed per session, never by the setup script.** The tracked
  `.claude/settings.json` enables `pstack@open-pstack` and names the marketplace source
  (`extraKnownMarketplaces`). Claude Code reads that at session start, clones the marketplace
  into the session's plugin cache, and installs the plugin. The setup script runs before
  Claude Code exists and has no checkout, so it cannot do this, and the snapshot never holds
  the plugin. Every session therefore gets the current pstack, with no update step.
- **The first session of a fresh environment runs without it.** A known Claude Code defect:
  the marketplace clone lands after the first session has started. Restart once. The
  banner's `pstack:` line reports which state the session is in.
- **The model sheet is in the tree.** `.claude/pstack-models.md`, included from the project
  `CLAUDE.md`, so cloud and local read the same values. The plugin never opens the file
  itself; the sheet reaches the model only as text through that include. Change it with
  `/setup-pstack-project`, the tracked wrapper that runs the plugin's setup skill and
  redirects its two writes into the tree. The home `CLAUDE.md` must not include a sheet as
  well: two live includes make duplicate role rows, and the setup skill stops on those.
- **The grok lane needs the Grok CLI and a login.** The setup script installs the CLI; the
  login is per VM (see Secrets). The pstack runner never falls back, so a missing login is a
  loud dropout of every grok lane, not a silent model swap.

## The database, in cloud

One VM hosts one session and one stack, the one `supabase/config.toml` describes. The first
time a session needs an integration-tier database, run `bun run db:start` inside the session.
Every `bun run at:verify <req> --tier integration --expect` resets that stack.
