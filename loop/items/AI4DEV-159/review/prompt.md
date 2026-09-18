You may read any file in the working directory to follow a call chain; it is the branch under review. Use PowerShell syntax if you shell out. Write nothing except your findings.

You are an adversarial code reviewer. Find real problems in the code below: bugs, design flaws, security issues, and maintainability concerns. You are not here to be helpful or encouraging. You are here to stress-test.

## Intent

The author's stated intent for this change:

> This branch adds one proof page to the ai4good front end (TanStack Start, React 19, Vite, deployed on Lovable or Vercel): a bare chat at `/discovery/:organizationId/:projectId` for a signed-in NGO admin, built on the Vercel AI SDK off the shelf (`useChat` from `@ai-sdk/react` with a `DefaultChatTransport` from `ai`) over the two shipped Supabase edge functions. `discovery-message` is POSTed with `Authorization: Bearer <session token>`, `apikey: <anon key>` and `Accept: text/event-stream`, and the body reshaped to `{ organizationId, projectId, message }`; it answers the Vercel UI message stream (parts `start`, `text-start`, `text-delta`, `text-end`, a `data-turn` part carrying the settled turn and the allowance, `finish`, `[DONE]`) or a JSON refusal `{ ok: false, kind, reason }` with a 4xx status before any stream byte (email unverified, zero credits with the tier remedies inside `reason`, fuel exhausted, Discovery switched off, and others). `discovery-conversation` is POSTed `{ projectId }` and answers every turn of the project plus the allowance. The page: a sign-in form on `@supabase/supabase-js` (`signInWithPassword`, session kept by the client, tokens refreshed by it; local tokens live 120 seconds), the history loaded once after sign-in and mapped to `UIMessage[]` (two messages per turn), the allowance line from the last `data-turn` part else from the read, `react-markdown` for assistant text, a Stop button that aborts the fetch (the server then settles the turn after the client is gone, so the page rereads the conversation until the last turn has left `open`), and a refusal shown as its `reason` text with `kind` in small print. Every call goes through an edge function; the page holds no server secret and uses no host-specific server API (`ssr: false` on the route, no server functions). Also in the branch: `prepare-chat-page.ts`, a verify-skill script that walks the product path (signup, mail confirmation, sign-in, complete-signup as NGO, need start and submit) and prints the ids and a throwaway password for a browser drive, with `--drain` to exhaust the daily grant; its recipe; a one-line CRLF normalisation in the harness's skills reader so the drift selftest passes on Windows checkouts; and the removal of the CI two-territory guard (src/ versus the rest), which assumed Lovable alone wrote src/ (the founder now builds the front end in this tree and deploys on Lovable or Vercel). Grounding for the route contract is `loop/items/AI4DEV-159/how/explanation.md`; the live browser drive evidence is `loop/items/AI4DEV-159/reports/live-verify.md`.

You are reviewing whether the code achieves this intent well. Do NOT question the intent itself. Assume the goal is correct and challenge the execution.

## Code Under Review
```diff
diff --git a/.claude/skills/verify-ai4good/SKILL.md b/.claude/skills/verify-ai4good/SKILL.md
index 7da98be..1ce45a8 100644
--- a/.claude/skills/verify-ai4good/SKILL.md
+++ b/.claude/skills/verify-ai4good/SKILL.md
@@ -181,3 +181,6 @@ on PATH.
   GitHub gate refusals, create and update organisation with their refusals, the three tenant
   reads including the byte-identical 404s and the token-free public page, the catalog posture,
   and the three admin operations with their audit rows and the append-only proof.
+- [`scripts/prepare-chat-page.ts`](scripts/prepare-chat-page.ts) — email signup, confirmation,
+  NGO completion, a submitted need, and the chat page URL printed as JSON; `--drain` spends
+  the daily grant through JSON sends until the zero-credit refusal.
diff --git a/.claude/skills/verify-ai4good/features/README.md b/.claude/skills/verify-ai4good/features/README.md
index 452898b..f5ef199 100644
--- a/.claude/skills/verify-ai4good/features/README.md
+++ b/.claude/skills/verify-ai4good/features/README.md
@@ -54,6 +54,7 @@ project is still operator SQL (see `project-workspace.md`).
 | Discovery message (count, reserve, reply and settle) | [discovery-message.md](discovery-message.md) |
 | Discovery conversation (history, elicitation and today's allowance) | [discovery-conversation.md](discovery-conversation.md) |
 | Set organization Discovery (admin per-NGO switch, audited) | [set-organization-discovery.md](set-organization-discovery.md) |
+| Discovery chat page (browser) | [discovery-chat-page.md](discovery-chat-page.md) |
 
 Not mapped yet, deliberately: the web UI (a placeholder page today) and the Google/GitHub
 OAuth round trips. Consent is a human browser step. Configuration well-formedness is checkable;
diff --git a/.claude/skills/verify-ai4good/features/discovery-chat-page.md b/.claude/skills/verify-ai4good/features/discovery-chat-page.md
new file mode 100644
index 0000000..d068b29
--- /dev/null
+++ b/.claude/skills/verify-ai4good/features/discovery-chat-page.md
@@ -0,0 +1,28 @@
+# Discovery chat page
+
+A signed-in NGO administrator chats with Discovery on a submitted project. The page is
+`/discovery/:organizationId/:projectId`. It talks only to `discovery-conversation` and
+`discovery-message`. Prepare the user and project with
+`scripts/prepare-chat-page.ts` (add `--drain` before the zero-credit check). Open
+`http://localhost:8080` with `bun run dev`. Sign in on the page with the printed email
+and password.
+
+## Drive
+
+1. A real turn streams. Type a short project fact and press Send. Expect the status word
+   to become `submitted` then `streaming`, then assistant text to appear in pieces, then
+   `ready`. The allowance line falls by the charged credits.
+2. Stop mid-reply. Send a longer message. Press Stop while the reply is still streaming.
+   Expect the stream to halt, status `ready`, and no further tokens. After the page reloads
+   the conversation, the stopped turn is present with its (possibly longer) partial text.
+   Replies on the Haiku test model end within one to three seconds, faster than a Stop
+   pressed through a browser tool round trip. Press it from inside the page instead: a
+   script that clicks Send, then clicks Stop about 700 ms later (measured 2026-09-18; the
+   in-page timer fired at 1.1 to 1.4 s and still landed mid-stream). Read the turn row back:
+   `stop_reason = 'user_stopped'` is the proof, together with the allowance line matching
+   `granted - spent` in `discovery_spend`.
+3. Reload shows the history. Refresh the browser. Sign-in should not be required. The
+   earlier user and assistant messages are still on the page, including the stopped turn.
+4. The zero-credit refusal. On a grant drained by `prepare-chat-page.ts --drain`, send one
+   more message. Expect the refusal `reason` text on the page and `daily-allowance-exhausted`
+   in small print. The stream does not start.
diff --git a/.claude/skills/verify-ai4good/scripts/prepare-chat-page.ts b/.claude/skills/verify-ai4good/scripts/prepare-chat-page.ts
new file mode 100644
index 0000000..7470bea
--- /dev/null
+++ b/.claude/skills/verify-ai4good/scripts/prepare-chat-page.ts
@@ -0,0 +1,285 @@
+/**
+ * verify-ai4good — prepare a signed-in NGO admin and a submitted need for the Discovery chat page.
+ *
+ *   bun .claude/skills/verify-ai4good/scripts/prepare-chat-page.ts [outDir] [--drain]
+ *
+ * Walks the product path on the local stack: email signup, mail confirmation, password sign-in,
+ * complete-signup as an NGO, project-need start with a description, project-need submit. Prints
+ * one JSON object on stdout with email, password, organizationId, projectId, and pageUrl
+ * (http://localhost:8080/discovery/<org>/<project>) so a person or a browser drive can open the
+ * page. The password is a fresh random string for a throwaway local user; printing it is intended.
+ *
+ * With --drain, after that setup, send short JSON turns through discovery-message (no Accept
+ * header) until the send answers 409 daily-allowance-exhausted, at most 15 sends, and add
+ * drained: true and the send count to the JSON. The drain spends real provider credits on the
+ * Haiku test model — do not run --drain against a stack without a provider key in
+ * supabase/functions/.env.
+ *
+ * Writes a REDACTED transcript to outDir (default loop/verify-evidence/<timestamp>/). Run from
+ * the repo root with the stack up (bun run db:start).
+ */
+
+import { randomBytes } from 'node:crypto';
+import { spawnSync } from 'node:child_process';
+import { mkdirSync, writeFileSync } from 'node:fs';
+import { join, resolve } from 'node:path';
+import { fileURLToPath } from 'node:url';
+
+import { readLocalConfig, stackFromLocalStatus } from '../../../../tests/at/harness/local-stack.ts';
+import {
+  authPost,
+  followLink,
+  functionPost,
+  mailIdentification,
+  readJson,
+  redactString,
+  redactUrl,
+  redactValue,
+  verifyLinksFor,
+  type Stack,
+} from '../../../../tests/at/harness/live-stack.ts';
+
+import { ACKNOWLEDGMENT_IDENTITY_COPY } from '../../../../supabase/functions/_shared/acknowledgment-copy.ts';
+
+/* ----------------------------------------------------------------------------- reporting */
+
+type Check = { id: string; title: string; outcome: 'pass' | 'fail'; note: string };
+const checks: Check[] = [];
+const transcript: unknown[] = [];
+
+function record(id: string, title: string, passed: boolean, note: string): void {
+  checks.push({ id, title, outcome: passed ? 'pass' : 'fail', note: redactString(note) });
+  console.error(`${passed ? 'PASS' : 'FAIL'}  (${id}) ${title}\n        ${redactString(note)}`);
+}
+
+function fatal(message: string): never {
+  console.error(`\nABORT: ${redactString(message)}`);
+  flush();
+  process.exit(1);
+}
+
+function recordHttp(name: string, method: string, url: string, status: number, body: unknown): void {
+  transcript.push({
+    step: name,
+    request: { method, url: redactUrl(url) },
+    response: { status, body: redactValue(body) },
+  });
+}
+
+/* ----------------------------------------------------------------------------------- run */
+
+const repoRoot = resolve(fileURLToPath(new URL('.', import.meta.url)), '../../../..');
+const rawArgs = process.argv.slice(2);
+const drain = rawArgs.includes('--drain');
+const positionals = rawArgs.filter((arg) => arg !== '--drain');
+const outDir = resolve(
+  repoRoot,
+  positionals[0] ??
+    join('loop', 'verify-evidence', new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)),
+);
+
+let stack: Stack;
+try {
+  stack = stackFromLocalStatus(repoRoot);
+} catch (err) {
+  fatal((err as Error).message);
+}
+
+const stamp = Date.now();
+const email = `verify-chat-page-${stamp}@example.com`;
+const password = `Chat-${randomBytes(18).toString('base64url')}-Aa1!`;
+const orgName = `Verify Chat Page Org ${stamp}`;
+
+{
+  const url = `${stack.apiUrl.replace(/\/$/, '')}/auth/v1/health`;
+  const health = await readJson(url);
+  let body: unknown = health.text;
+  try {
+    body = JSON.parse(health.text);
+  } catch {
+  }
+  recordHttp('doctor-auth-health', 'GET', url, health.status, body);
+  record('a', 'auth health answers', health.status === 200, `GET /auth/v1/health -> ${health.status}`);
+  if (health.status !== 200) fatal('stack not healthy');
+}
+
+{
+  try {
+    const identification = await mailIdentification(stack);
+    record('a2', 'mail identification', true, identification);
+  } catch (err) {
+    record('a2', 'mail identification', false, (err as Error).message);
+    fatal((err as Error).message);
+  }
+}
+
+{
+  const projectId = readLocalConfig(repoRoot).projectId;
+  const inspect = spawnSync(
+    'docker',
+    ['inspect', `supabase_edge_runtime_${projectId}`, '--format', '{{json .Mounts}}'],
+    { encoding: 'utf8' },
+  );
+  const remedy = 'bun run db:stop then bun run db:start from this checkout';
+  const normalize = (value: string) =>
+    value.replace(/\\/g, '/').replace(/^\/run\/desktop\/mnt\/host\/([a-z])\//i, '$1:/').toLowerCase();
+  const root = normalize(repoRoot);
+  let source = '';
+  let ok = false;
+  let note = '';
+  if (inspect.error) {
+    note = `docker inspect could not be launched (${inspect.error.message}); ${remedy}`;
+  } else {
+    try {
+      const mounts = JSON.parse(inspect.stdout || '[]') as { Source?: string }[];
+      const functionsMount = mounts.find((mount) => normalize(String(mount.Source ?? '')).endsWith('supabase/functions'));
+      source = String(functionsMount?.Source ?? '');
+      ok = source.length > 0 && normalize(source).startsWith(root);
+      note = ok
+        ? `edge runtime functions mount ${source}`
+        : `edge runtime functions mount is ${source || 'missing'}; expected a Source ending in supabase/functions that starts with ${repoRoot}. ${remedy}`;
+    } catch (err) {
+      note = `docker inspect did not answer JSON mounts (${(err as Error).message}); ${remedy}`;
+    }
+  }
+  record('a3', 'edge runtime mount', ok, note);
+  if (!ok) fatal(note);
+}
+
+/* --------------------------------------------------------------- product path */
+
+const signup = await authPost(stack, '/auth/v1/signup', { email, password });
+recordHttp('signup', 'POST', signup.url, signup.status, signup.json);
+if (signup.status !== 200) fatal(`signup answered ${signup.status}`);
+record('setup-signup', 'email signup', signup.status === 200, `status ${signup.status}`);
+
+const links = await verifyLinksFor(stack, email, 'signup');
+const link = links[0] ?? null;
+transcript.push({ step: 'confirmation-link', link: link ? redactUrl(link) : null });
+if (!link) fatal('no confirmation email');
+const followed = await followLink(link);
+transcript.push({ step: 'verify-redirect', status: followed.status, location: redactUrl(followed.location) });
+if (!(followed.status >= 300 && followed.status < 400)) fatal('confirmation did not redirect');
+record('setup-confirm', 'mail confirmation', true, `status ${followed.status}`);
+
+const signedIn = await authPost(stack, '/auth/v1/token?grant_type=password', { email, password });
+recordHttp('signin', 'POST', signedIn.url, signedIn.status, signedIn.json);
+let accessToken = String(signedIn.json.access_token ?? '');
+if (!accessToken) fatal('sign-in produced no token');
+record('setup-signin', 'password sign-in', true, `status ${signedIn.status}`);
+
+const completed = await functionPost(
+  stack,
+  'complete-signup',
+  {
+    accountType: 'ngo',
+    organizationName: orgName,
+    acknowledgmentTextVersion: 'tos-platform-promise-v1',
+    signerName: 'Verify Chat Page',
+    signerTitle: 'Automated verifier',
+    authorityAttestation: ACKNOWLEDGMENT_IDENTITY_COPY.authorityStatement,
+  },
+  accessToken,
+);
+recordHttp('complete-signup', 'POST', completed.url, completed.status, completed.json);
+const organizationId = String(completed.json.organizationId ?? '');
+if (!organizationId) fatal('complete-signup named no organisation');
+record('setup-ngo', 'complete-signup as NGO', completed.status === 200, `organizationId ${organizationId}`);
+
+const started = await functionPost(
+  stack,
+  'project-need',
+  {
+    organizationId,
+    action: 'start',
+    title: 'Chat page need',
+    description: 'We miss funder reporting deadlines and need a shared reminder list.',
+    urgency: 'soon',
+  },
+  accessToken,
+);
+recordHttp('project-need-start', 'POST', started.url, started.status, started.json);
+const need = started.json.need as Record<string, unknown> | undefined;
+const projectId = String(need?.projectId ?? '');
+if (started.status !== 200 || !projectId) fatal(`project-need start answered ${started.status}`);
+record('setup-start', 'project-need start', true, `projectId ${projectId}`);
+
+const submitted = await functionPost(stack, 'project-need', { organizationId, action: 'submit', projectId }, accessToken);
+recordHttp('project-need-submit', 'POST', submitted.url, submitted.status, submitted.json);
+if (submitted.status !== 200) fatal(`project-need submit answered ${submitted.status}`);
+record('setup-submit', 'project-need submit', true, `status ${submitted.status}`);
+
+async function refreshAccessToken(): Promise<void> {
+  const again = await authPost(stack, '/auth/v1/token?grant_type=password', { email, password });
+  recordHttp('signin-refresh', 'POST', again.url, again.status, again.json);
+  accessToken = String(again.json.access_token ?? '');
+  if (!accessToken) fatal('sign-in refresh produced no token');
+}
+
+let sendCount = 0;
+let drained = false;
+if (drain) {
+  const maxSends = 15;
+  while (sendCount < maxSends) {
+    sendCount += 1;
+    if (sendCount === 1 || sendCount % 5 === 1) await refreshAccessToken();
+    const r = await functionPost(
+      stack,
+      'discovery-message',
+      { organizationId, projectId, message: `Short turn ${sendCount}. Please record this need.` },
+      accessToken,
+    );
+    recordHttp(`discovery-message-drain-${sendCount}`, 'POST', r.url, r.status, r.json);
+    if (r.status === 401) {
+      await refreshAccessToken();
+      const retry = await functionPost(
+        stack,
+        'discovery-message',
+        { organizationId, projectId, message: `Short turn ${sendCount}. Please record this need.` },
+        accessToken,
+      );
+      recordHttp(`discovery-message-drain-${sendCount}-retry`, 'POST', retry.url, retry.status, retry.json);
+      if (retry.status === 409 && retry.json.kind === 'daily-allowance-exhausted') {
+        drained = true;
+        break;
+      }
+      if (retry.status !== 200) fatal(`drain send ${sendCount} answered ${retry.status}`);
+      continue;
+    }
+    if (r.status === 409 && r.json.kind === 'daily-allowance-exhausted') {
+      drained = true;
+      break;
+    }
+    if (r.status !== 200) fatal(`drain send ${sendCount} answered ${r.status}`);
+  }
+  record('drain', 'daily allowance drained through JSON sends', drained, `sends=${sendCount} drained=${drained}`);
+  if (!drained) fatal(`drain did not reach daily-allowance-exhausted after ${sendCount} sends`);
+}
+
+const summary: Record<string, unknown> = {
+  email,
+  password,
+  organizationId,
+  projectId,
+  pageUrl: `http://localhost:8080/discovery/${organizationId}/${projectId}`,
+};
+if (drain) {
+  summary.drained = true;
+  summary.sendCount = sendCount;
+}
+
+transcript.push({ step: 'summary', body: redactValue(summary) });
+
+function flush(): void {
+  mkdirSync(outDir, { recursive: true });
+  writeFileSync(
+    join(outDir, 'transcript.json'),
+    JSON.stringify({ ranAt: new Date().toISOString(), email, orgName, organizationId, projectId, checks, transcript }, null, 2),
+  );
+  console.error(`\nevidence: ${join(outDir, 'transcript.json')}`);
+}
+
+flush();
+console.log(JSON.stringify(summary));
+const failed = checks.filter((c) => c.outcome === 'fail');
+process.exit(failed.length === 0 && checks.length > 0 ? 0 : 1);
diff --git a/.github/workflows/ci.yml b/.github/workflows/ci.yml
index 17ebb84..0d49cbc 100644
--- a/.github/workflows/ci.yml
+++ b/.github/workflows/ci.yml
@@ -210,73 +210,6 @@ jobs:
           fi
           exit $status
 
-      # One pull request may not change both territories. Lovable owns src/; Claude owns
-      # supabase/, tests/, loop/, .claude/ and .github/. Anything else is neither, and is ignored.
-      # The changed-file list comes from the pull request itself, which IS the base-to-head diff —
-      # so the guard never depends on how deep the checkout fetched.
-      - name: Guard against a pull request that changes both territories
-        if: github.event_name == 'pull_request'
-        shell: bash
-        env:
-          GH_TOKEN: ${{ github.token }}
-          REPOSITORY: ${{ github.repository }}
-          PR_NUMBER: ${{ github.event.pull_request.number }}
-        run: |
-          # ONE LINE PER CHANGED FILE, carrying both of its paths: a file MOVED out of src/ into
-          # tests/ changes both territories, and the API reports only its destination under
-          # `filename`. One line per FILE (not per path) is what makes the count below an entry
-          # count, so a pull request full of renames cannot falsely trip the ceiling.
-          if ! files=$(gh api "repos/${REPOSITORY}/pulls/${PR_NUMBER}/files" --paginate \
-              --jq '.[] | [.filename, (.previous_filename // "")] | @tsv'); then
-            echo "::error::the pull request's changed files could not be read from the GitHub API — the guard does not pass a change set it could not read"
-            exit 1
-          fi
-
-          count=$(printf '%s\n' "$files" | grep -c . || true)
-          echo "the pull request changes $count file(s)"
-          if [ "$count" -eq 0 ]; then
-            echo "::error::the GitHub API reported no changed files for this pull request — the guard does not pass a change set it could not read"
-            exit 1
-          fi
-          if [ "$count" -ge 3000 ]; then
-            echo "::error::the changed-file listing reached the GitHub API's 3000-file ceiling, so it is truncated and the guard cannot prove the two territories are separate"
-            exit 1
-          fi
-
-          # Both fields of every line are matched; the empty second field of an ordinary
-          # (non-renamed) file drops out here.
-          paths=$(printf '%s\n' "$files" | tr '\t' '\n' | grep . || true)
-
-          # THE GENERATED ROUTE MAP BELONGS TO NEITHER TERRITORY (founder ruling 2026-08-12).
-          # `bun run build` rewrites src/routeTree.gen.ts on every build - measured twice that day,
-          # the same ten-line `declare module` block returns each time, while typecheck and the
-          # acceptance runs never touch it. So every Claude-territory item that builds dirties a
-          # Lovable-territory file it never wrote, and this guard fails a pull request for a change
-          # nobody made. The guard protects AUTHORED code; derived output has no author to protect,
-          # and the next build overwrites a hand edit anyway. One exemption here replaces a
-          # restore-after-build ritual that every future item would have to remember.
-          paths=$(printf '%s\n' "$paths" | grep -v '^src/routeTree\.gen\.ts$' || true)
-
-          lovable=$(printf '%s\n' "$paths" | grep -E '^src/' || true)
-          claude=$(printf '%s\n' "$paths" | grep -E '^(supabase|tests|loop|\.claude|\.github)/' || true)
-
-          if [ -n "$lovable" ] && [ -n "$claude" ]; then
-            echo "::error::this pull request changes BOTH Lovable territory and Claude territory — split it into two pull requests"
-            echo "Lovable territory (src/):"
-            printf '%s\n' "$lovable" | sed 's/^/  /'
-            echo "Claude territory (supabase/, tests/, loop/, .claude/, .github/):"
-            printf '%s\n' "$claude" | sed 's/^/  /'
-            exit 1
-          fi
-
-          if [ -n "$lovable" ]; then
-            echo "ownership guard OK — this pull request stays inside Lovable territory"
-          elif [ -n "$claude" ]; then
-            echo "ownership guard OK — this pull request stays inside Claude territory"
-          else
-            echo "ownership guard OK — this pull request touches neither territory"
-          fi
-
       - name: Guard against a pull request that names an item it does not own
         if: github.event_name == 'pull_request'
         shell: bash
diff --git a/package.json b/package.json
index 8a5ef4f..25161a2 100644
--- a/package.json
+++ b/package.json
@@ -20,6 +20,7 @@
     "db:reset": "bunx supabase db reset"
   },
   "dependencies": {
+    "@ai-sdk/react": "^4.0.105",
     "@hookform/resolvers": "^5.2.2",
     "@radix-ui/react-accordion": "^1.2.12",
     "@radix-ui/react-alert-dialog": "^1.1.15",
@@ -47,11 +48,13 @@
     "@radix-ui/react-toggle": "^1.1.10",
     "@radix-ui/react-toggle-group": "^1.1.11",
     "@radix-ui/react-tooltip": "^1.2.8",
+    "@supabase/supabase-js": "^2.112.2",
     "@tailwindcss/vite": "^4.2.1",
     "@tanstack/react-query": "^5.83.0",
     "@tanstack/react-router": "^1.168.25",
     "@tanstack/react-start": "^1.167.50",
     "@tanstack/router-plugin": "^1.167.28",
+    "ai": "^7.0.102",
     "class-variance-authority": "^0.7.1",
     "clsx": "^2.1.1",
     "cmdk": "^1.1.1",
@@ -63,6 +66,7 @@
     "react-day-picker": "^9.14.0",
     "react-dom": "^19.2.0",
     "react-hook-form": "^7.71.2",
+    "react-markdown": "^10.1.0",
     "react-resizable-panels": "^4.6.5",
     "recharts": "^2.15.4",
     "sonner": "^2.0.7",
@@ -77,7 +81,6 @@
     "@anthropic-ai/sdk": "^0.115.0",
     "@eslint/js": "^9.32.0",
     "@lovable.dev/vite-tanstack-config": "^2.3.2",
-    "@supabase/supabase-js": "^2.112.2",
     "@types/node": "^22.18.0",
     "@types/react": "^19.2.0",
     "@types/react-dom": "^19.2.0",
diff --git a/src/lib/discovery-chat.ts b/src/lib/discovery-chat.ts
new file mode 100644
index 0000000..933ab32
--- /dev/null
+++ b/src/lib/discovery-chat.ts
@@ -0,0 +1,115 @@
+import type { UIMessage } from "ai";
+
+export type Allowance = {
+  organizationId: string;
+  utcDay: string;
+  vetted: boolean;
+  dailyGrant: number;
+  spentToday: number;
+  remaining: number;
+};
+
+/** The wire shape of DiscoveryTurnView in supabase/functions/_shared/discovery-turn.ts (a Deno tree this bundle cannot import). */
+export type DiscoveryTurn = {
+  id: string;
+  projectId: string;
+  seq: number;
+  status: "open" | "settled" | "failed" | "abandoned";
+  billing: "free" | "fuel";
+  utcDay: string;
+  userMessage: string;
+  assistantMessage: string | null;
+  elicitation: {
+    complete: true;
+    facts: string[];
+    constraints: string[];
+    userStories: { story: string; acceptanceCriteria: string[] }[];
+    openQuestions: string[];
+  } | null;
+  requestSettings: { model: string; maxTokens: number; effort: "low" };
+  maxOutputTokens: number;
+  estimatedInputTokens: number;
+  reservedCredits: number;
+  chargedCredits: number | null;
+  reservedMicros: number;
+  actualMicros: number | null;
+  overrunMicros: number | null;
+  inputTokens: number | null;
+  outputTokens: number | null;
+  stopReason: string | null;
+  servedModel: string | null;
+  openedAt: string;
+  settledAt: string | null;
+};
+
+export type Refusal = { kind: string | null; reason: string };
+
+export function messagesFromTurns(turns: DiscoveryTurn[]): UIMessage[] {
+  const messages: UIMessage[] = [];
+  for (const turn of turns) {
+    messages.push({
+      id: `${turn.id}:user`,
+      role: "user",
+      parts: [{ type: "text", text: turn.userMessage }],
+    });
+    if (typeof turn.assistantMessage === "string" && turn.assistantMessage.length > 0) {
+      messages.push({
+        id: `${turn.id}:assistant`,
+        role: "assistant",
+        parts: [{ type: "text", text: turn.assistantMessage }],
+      });
+    }
+  }
+  return messages;
+}
+
+export function refusalFromResponseText(text: string): Refusal {
+  try {
+    const parsed: unknown = JSON.parse(text);
+    if (parsed !== null && typeof parsed === "object" && "reason" in parsed) {
+      const reason = (parsed as { reason: unknown }).reason;
+      if (typeof reason === "string") {
+        const kind = (parsed as { kind?: unknown }).kind;
+        return { kind: typeof kind === "string" ? kind : null, reason };
+      }
+    }
+  } catch {
+  }
+  return { kind: null, reason: text };
+}
+
+function isAllowance(value: unknown): value is Allowance {
+  if (value === null || typeof value !== "object") return false;
+  const record = value as Record<string, unknown>;
+  return (
+    typeof record.organizationId === "string" &&
+    typeof record.utcDay === "string" &&
+    typeof record.vetted === "boolean" &&
+    typeof record.dailyGrant === "number" &&
+    typeof record.spentToday === "number" &&
+    typeof record.remaining === "number"
+  );
+}
+
+function allowanceFromTurnData(data: unknown): Allowance | null {
+  if (isAllowance(data)) return data;
+  if (data !== null && typeof data === "object" && "allowance" in data) {
+    const nested = (data as { allowance: unknown }).allowance;
+    if (isAllowance(nested)) return nested;
+  }
+  return null;
+}
+
+export function allowanceFromMessages(messages: UIMessage[]): Allowance | null {
+  for (let i = messages.length - 1; i >= 0; i--) {
+    const message = messages[i];
+    if (message.role !== "assistant") continue;
+    for (let j = message.parts.length - 1; j >= 0; j--) {
+      const part = message.parts[j];
+      if (part.type !== "data-turn") continue;
+      return allowanceFromTurnData(part.data);
+    }
+    return null;
+  }
+  return null;
+}
diff --git a/src/lib/supabase.ts b/src/lib/supabase.ts
new file mode 100644
index 0000000..ffc4f43
--- /dev/null
+++ b/src/lib/supabase.ts
@@ -0,0 +1,25 @@
+import { createClient, type SupabaseClient } from "@supabase/supabase-js";
+
+function requiredVite(name: "VITE_SUPABASE_URL" | "VITE_SUPABASE_PUBLISHABLE_KEY"): string {
+  const value = import.meta.env[name];
+  if (value === undefined) {
+    throw new Error(`${name} is missing`);
+  }
+  return value;
+}
+
+export function supabaseUrl(): string {
+  return requiredVite("VITE_SUPABASE_URL");
+}
+
+export function supabasePublishableKey(): string {
+  return requiredVite("VITE_SUPABASE_PUBLISHABLE_KEY");
+}
+
+let browserClient: SupabaseClient | undefined;
+
+export function getSupabase(): SupabaseClient {
+  if (browserClient) return browserClient;
+  browserClient = createClient(supabaseUrl(), supabasePublishableKey());
+  return browserClient;
+}
diff --git a/src/routes/discovery/$organizationId.$projectId.tsx b/src/routes/discovery/$organizationId.$projectId.tsx
new file mode 100644
index 0000000..6620b2d
--- /dev/null
+++ b/src/routes/discovery/$organizationId.$projectId.tsx
@@ -0,0 +1,341 @@
+import { useChat } from "@ai-sdk/react";
+import { createFileRoute } from "@tanstack/react-router";
+import { DefaultChatTransport, type UIMessage } from "ai";
+import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
+import Markdown from "react-markdown";
+
+import { Button } from "@/components/ui/button";
+import { Input } from "@/components/ui/input";
+import { Textarea } from "@/components/ui/textarea";
+import {
+  allowanceFromMessages,
+  messagesFromTurns,
+  refusalFromResponseText,
+  type Allowance,
+  type DiscoveryTurn,
+  type Refusal,
+} from "@/lib/discovery-chat";
+import { getSupabase, supabasePublishableKey, supabaseUrl } from "@/lib/supabase";
+
+export const Route = createFileRoute("/discovery/$organizationId/$projectId")({
+  ssr: false,
+  component: DiscoveryChatPage,
+});
+
+type SessionState = { kind: "signed-out" } | { kind: "signed-in" };
+type HistoryState =
+  | { kind: "loading" }
+  | { kind: "loaded"; turns: DiscoveryTurn[]; allowance: Allowance | null }
+  | { kind: "failed"; reason: string };
+
+function functionsUrl(name: string): string {
+  return `${supabaseUrl().replace(/\/$/, "")}/functions/v1/${name}`;
+}
+
+function textOf(message: UIMessage): string {
+  return message.parts.flatMap((part) => (part.type === "text" ? [part.text] : [])).join("");
+}
+
+async function readConversation(projectId: string): Promise<HistoryState> {
+  const { data } = await getSupabase().auth.getSession();
+  const token = data.session?.access_token;
+  if (!token) return { kind: "failed", reason: "no session token" };
+
+  const response = await fetch(functionsUrl("discovery-conversation"), {
+    method: "POST",
+    headers: {
+      Authorization: `Bearer ${token}`,
+      apikey: supabasePublishableKey(),
+      "Content-Type": "application/json",
+    },
+    body: JSON.stringify({ projectId }),
+  });
+  const text = await response.text();
+  if (!response.ok) {
+    return { kind: "failed", reason: refusalFromResponseText(text).reason };
+  }
+
+  let parsed: unknown;
+  try {
+    parsed = JSON.parse(text);
+  } catch {
+    return { kind: "failed", reason: text };
+  }
+  if (parsed === null || typeof parsed !== "object") {
+    return { kind: "failed", reason: text };
+  }
+  const body = parsed as {
+    ok?: unknown;
+    conversation?: { turns?: unknown };
+    allowance?: unknown;
+    reason?: unknown;
+  };
+  if (body.ok !== true) {
+    const reason = typeof body.reason === "string" ? body.reason : text;
+    return { kind: "failed", reason };
+  }
+  const turns = body.conversation?.turns;
+  if (!Array.isArray(turns)) {
+    return { kind: "failed", reason: "the conversation read named no turns" };
+  }
+  return {
+    kind: "loaded",
+    turns: turns as DiscoveryTurn[],
+    allowance: (body.allowance ?? null) as Allowance | null,
+  };
+}
+
+// The server settles a stopped turn after the browser has disconnected.
+async function readConversationOnceSettled(projectId: string): Promise<HistoryState> {
+  let next = await readConversation(projectId);
+  for (let tries = 0; tries < 10 && next.kind === "loaded" && next.turns.at(-1)?.status === "open"; tries++) {
+    await new Promise((resolve) => setTimeout(resolve, 500));
+    next = await readConversation(projectId);
+  }
+  return next;
+}
+
+function DiscoveryChatPage() {
+  const { organizationId, projectId } = Route.useParams();
+  const [session, setSession] = useState<SessionState>({ kind: "signed-out" });
+  const [history, setHistory] = useState<HistoryState>({ kind: "loading" });
+  const [chatGeneration, setChatGeneration] = useState(0);
+
+  useEffect(() => {
+    const { data } = getSupabase().auth.onAuthStateChange((_event, next) => {
+      setSession(next ? { kind: "signed-in" } : { kind: "signed-out" });
+    });
+    return () => data.subscription.unsubscribe();
+  }, []);
+
+  useEffect(() => {
+    if (session.kind !== "signed-in") {
+      setHistory({ kind: "loading" });
+      return;
+    }
+    let cancelled = false;
+    setHistory({ kind: "loading" });
+    void readConversation(projectId).then((next) => {
+      if (!cancelled) setHistory(next);
+    });
+    return () => {
+      cancelled = true;
+    };
+  }, [session.kind, projectId]);
+
+  const reloadAfterStop = useCallback(() => {
+    void readConversationOnceSettled(projectId).then((next) => {
+      setHistory(next);
+      setChatGeneration((value) => value + 1);
+    });
+  }, [projectId]);
+
+  if (session.kind === "signed-out") {
+    return <SignInForm />;
+  }
+
+  return (
+    <main className="mx-auto flex min-h-screen max-w-2xl flex-col gap-4 p-4">
+      <h1 className="text-xl font-semibold">Discovery</h1>
+      <p className="text-sm text-muted-foreground">
+        organisation {organizationId} · project {projectId}
+      </p>
+      {history.kind === "loading" ? <p>loading</p> : null}
+      {history.kind === "failed" ? <p>{history.reason}</p> : null}
+      {history.kind === "loaded" ? (
+        <DiscoveryChat
+          key={`${projectId}:${chatGeneration}`}
+          organizationId={organizationId}
+          projectId={projectId}
+          turns={history.turns}
+          allowance={history.allowance}
+          onStopSettled={reloadAfterStop}
+        />
+      ) : null}
+    </main>
+  );
+}
+
+function SignInForm() {
+  const [email, setEmail] = useState("");
+  const [password, setPassword] = useState("");
+  const [error, setError] = useState<string | null>(null);
+  const [pending, setPending] = useState(false);
+
+  async function onSubmit(event: FormEvent) {
+    event.preventDefault();
+    setPending(true);
+    setError(null);
+    const { error: signInError } = await getSupabase().auth.signInWithPassword({
+      email,
+      password,
+    });
+    setPending(false);
+    if (signInError) setError(signInError.message);
+  }
+
+  return (
+    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-4 p-4">
+      <h1 className="text-xl font-semibold">Sign in</h1>
+      <form className="flex flex-col gap-3" onSubmit={onSubmit}>
+        <label className="flex flex-col gap-1 text-sm">
+          Email
+          <Input
+            type="email"
+            autoComplete="username"
+            value={email}
+            onChange={(event) => setEmail(event.target.value)}
+            required
+          />
+        </label>
+        <label className="flex flex-col gap-1 text-sm">
+          Password
+          <Input
+            type="password"
+            autoComplete="current-password"
+            value={password}
+            onChange={(event) => setPassword(event.target.value)}
+            required
+          />
+        </label>
+        {error ? <p className="text-sm text-destructive">{error}</p> : null}
+        <Button type="submit" disabled={pending}>
+          Sign in
+        </Button>
+      </form>
+    </main>
+  );
+}
+
+function DiscoveryChat({
+  organizationId,
+  projectId,
+  turns,
+  allowance,
+  onStopSettled,
+}: {
+  organizationId: string;
+  projectId: string;
+  turns: DiscoveryTurn[];
+  allowance: Allowance | null;
+  onStopSettled: () => void;
+}) {
+  const [refusal, setRefusal] = useState<Refusal | null>(null);
+  const [draft, setDraft] = useState("");
+  const stoppingRef = useRef(false);
+  const api = functionsUrl("discovery-message");
+  const anonKey = supabasePublishableKey();
+
+  const transport = useMemo(
+    () =>
+      new DefaultChatTransport({
+        api,
+        headers: async () => {
+          const { data } = await getSupabase().auth.getSession();
+          return {
+            Authorization: `Bearer ${data.session?.access_token ?? ""}`,
+            apikey: anonKey,
+            Accept: "text/event-stream",
+          };
+        },
+        prepareSendMessagesRequest: ({ messages }) => {
+          let message = "";
+          for (let i = messages.length - 1; i >= 0; i--) {
+            if (messages[i].role !== "user") continue;
+            message = textOf(messages[i]);
+            break;
+          }
+          return { body: { organizationId, projectId, message } };
+        },
+      }),
+    [anonKey, api, organizationId, projectId],
+  );
+
+  const { messages, sendMessage, status, stop } = useChat({
+    messages: messagesFromTurns(turns),
+    transport,
+    onError: (error) => {
+      setRefusal(refusalFromResponseText(error.message));
+    },
+  });
+
+  const previousStatus = useRef(status);
+  useEffect(() => {
+    const previous = previousStatus.current;
+    previousStatus.current = status;
+    if (stoppingRef.current && previous !== "ready" && status === "ready") {
+      stoppingRef.current = false;
+      onStopSettled();
+    }
+  }, [onStopSettled, status]);
+
+  const busy = status === "submitted" || status === "streaming";
+  const shown = allowanceFromMessages(messages) ?? allowance;
+
+  async function onSend(event: FormEvent) {
+    event.preventDefault();
+    const text = draft.trim();
+    if (!text || busy) return;
+    setRefusal(null);
+    setDraft("");
+    try {
+      await sendMessage({ text });
+    } catch {
+    }
+  }
+
+  async function onStop() {
+    stoppingRef.current = true;
+    await stop();
+  }
+
+  return (
+    <section className="flex flex-1 flex-col gap-4">
+      {shown ? (
+        <p>
+          {shown.remaining} of {shown.dailyGrant} credits today
+          {shown.vetted ? ", vetted" : ", not vetted"}
+        </p>
+      ) : (
+        <p>allowance unavailable</p>
+      )}
+      <ol className="flex flex-col gap-3">
+        {messages.map((message) => {
+          const text = textOf(message);
+          if (!text && message.role !== "assistant") return null;
+          return (
+            <li key={message.id}>
+              {message.role === "user" ? (
+                <p>{text}</p>
+              ) : text ? (
+                <Markdown>{text}</Markdown>
+              ) : null}
+            </li>
+          );
+        })}
+      </ol>
+      {refusal ? (
+        <div>
+          <p>{refusal.reason}</p>
+          {refusal.kind ? <p className="text-xs">{refusal.kind}</p> : null}
+        </div>
+      ) : null}
+      <form className="flex flex-col gap-2" onSubmit={onSend}>
+        <Textarea
+          value={draft}
+          onChange={(event) => setDraft(event.target.value)}
+          rows={4}
+        />
+        <div className="flex items-center gap-2">
+          <Button type="submit" disabled={busy || draft.trim().length === 0}>
+            Send
+          </Button>
+          <Button type="button" variant="outline" disabled={!busy} onClick={() => void onStop()}>
+            Stop
+          </Button>
+          <span>{status}</span>
+        </div>
+      </form>
+    </section>
+  );
+}
diff --git a/tests/at/harness/discovery-skills.ts b/tests/at/harness/discovery-skills.ts
index b180385..6ca05fd 100644
--- a/tests/at/harness/discovery-skills.ts
+++ b/tests/at/harness/discovery-skills.ts
@@ -4,6 +4,6 @@ import type { DiscoverySkill } from '../../../supabase/functions/_shared/discove
 export function readDiscoverySkillsSync(): DiscoverySkill[] {
   const folder = new URL('../../../supabase/functions/_shared/discovery-skills/', import.meta.url);
   return readdirSync(folder).filter((name) => name.endsWith('.md')).sort().map((name) => ({
-    name: name.replace(/\.md$/, ''), body: readFileSync(new URL(name, folder), 'utf8'),
+    name: name.replace(/\.md$/, ''), body: readFileSync(new URL(name, folder), 'utf8').replace(/\r\n/g, '\n'),
   }));
 }
```

## Review Rubric

# Review Rubric

Review through whichever lenses are relevant. Not every lens applies to every change. Use judgment.

## Correctness

Does the code actually do what the intent says it should?

- Edge cases: empty inputs, nil/undefined, boundary values, concurrent access
- Error handling: are errors caught, propagated, or silently swallowed?
- Off-by-one, type coercion, integer overflow, string encoding
- State management: race conditions, stale closures, dangling references
- Does the happy path work? Does the sad path work?
- Idempotency: what happens if this operation runs twice, or if a previous run crashed halfway? If the answer is "it depends on what state was left behind," there's a missing reconciliation step.
- Concurrency: if multiple actors can touch the same mutable state (files, branches, shared data), is access serialized structurally (locks, sequential phases, exclusive ownership), or by conventions that won't hold?

When you find a potential bug, trace the execution path. Don't just flag "this could be nil". Show the call chain that makes it nil.

## Root Causes vs. Symptoms

Is the code fixing the actual problem or papering over a symptom?

Answering this often requires looking beyond the changed files. Read the surrounding code (callers, callees, type definitions, sibling modules) and understand the architecture the change lives in. Use the tools available to you (Read, Grep, Glob) to explore. Follow the call chain. Read the types. Understand why the code exists before judging whether the change addresses the right layer.

- Guard clauses that mask a deeper invariant violation
- Retry logic that hides a broken contract
- Type casts that silence a modeling error
- If you see a workaround, ask: why is the workaround needed? What would a proper fix look like?
- A fix in module A that should really be a fix in module B's contract
- Instructions where structure would be better: if the fix is a comment saying "don't do X" or a convention someone has to remember, ask whether it could instead be a type constraint, a lint rule, or a runtime check that makes the wrong thing impossible

## Structural Integrity

Does the code fit well into the system it's part of?

- Boundary discipline: is validation at system boundaries, or scattered through business logic? Validate data once where it enters the system, then trust it internally.
- Abstraction level: is the code mixing high-level orchestration with low-level detail?
- Coupling: does this change introduce dependencies that will make future changes harder?
- Data model fit: do the data structures match the actual access patterns? The right structure makes downstream code obvious. The wrong one fights you at every turn.
- Bolted-on vs. integrated: was the change patched onto the existing design, or does it read as if the design always accounted for it? If the new requirement had been known from the start, would the code look like this?
- Legacy dual-paths: does the change introduce a new API while keeping the old one alive? If there are no external consumers, migrate callers and delete the old path in the same wave. Don't leave compatibility layers that will become permanent.

Don't penalize simple code for lacking abstraction. Premature abstraction is worse than duplication.

## Verification

Can you tell that this code works from reading it?

- Are there tests? Do they test behavior or implementation details?
- Are there assertions/invariants that would catch regressions?
- If this is a bug fix: is there a test for the bug?
- If this touches an integration boundary: is the full path tested?
- Check the real thing, not a proxy. If the code checks liveness via file mtime or cached state instead of reading the actual value, that's a verification gap.
- For delegated or async work: does the code verify actual output artifacts, or does it trust self-reports and summaries?

## Complexity Budget

Is the complexity justified by what the code accomplishes?

- Code that could be simpler without losing correctness or clarity
- Abstractions that serve only one call site
- Configuration or parameterization for cases that don't exist yet
- Dead code, unused imports, vestigial parameters
- Over-engineering: "just in case" code paths with no current callers
- Obsolete compatibility paths kept alive for transitional stability that's no longer needed. If the migration is done, delete the scaffolding
- Does the user experience justify the complexity? Every feature, control, and option should earn its place. Half-finished features are worse than missing ones.

Simpler is better unless simpler is wrong. Three lines of duplication beat a premature abstraction.

## Security

Only flag security issues you can actually trace through the code. "This could be an injection vector" without showing the input path is not useful.

- User input flowing to dangerous sinks (SQL, shell, eval, innerHTML) without sanitization
- Authentication/authorization gaps in new endpoints
- Secrets in code, logs, or error messages
- TOCTOU (time-of-check-time-of-use) in security-critical paths


## Code Quality Lens

# Code Quality Review

Each reviewer applies this code-quality lens in addition to the rubric. It is a strict standard focused on implementation quality, maintainability, abstraction quality, and codebase health.

Above all, be ambitious about code structure. Do not merely identify local cleanup. Actively search for "code judo" moves, restructurings that preserve behavior while making the implementation dramatically simpler, smaller, more direct, and more elegant.

## Core Prompt

Start from this baseline:

> Perform a deep code quality audit of the current branch's changes.
> Rethink how to structure / implement the changes to meaningfully improve code quality without impacting behavior.
> Work to improve abstractions, modularity, reduce Spaghetti code, improve succinctness and legibility.
> Be ambitious, if there is a clear path to improving the implementation that involves restructuring some of the codebase, go for it.
> Be extremely thorough and rigorous. Measure twice, cut once.

## Dimensions

Each dimension is stated once. Apply the ones that are relevant.

0. **Be ambitious about structural simplification.** Do not stop at "this could be a bit cleaner." Look for reframings that make whole branches, helpers, modes, conditionals, or layers disappear. Assume a "code judo" move is often available. It uses the existing architecture more effectively and makes the change dramatically simpler. If you can delete complexity rather than rearrange it, push hard for that.

1. **Do not let a PR push a file from under 1k lines to over 1k lines without a very strong reason.** Treat this as a strong smell. Prefer extracting helpers, subcomponents, or modules. If the diff crosses that threshold, ask whether the code should be decomposed first. Waive only for a compelling structural reason where the resulting file stays clearly organized.

2. **Do not allow spaghetti growth in existing code.** Be suspicious of new ad-hoc conditionals, scattered special cases, or one-off branches inserted into unrelated flows. Treat "weird if statements in random places" as a design problem, not a style nit. Prefer pushing the logic into a dedicated helper, state machine, or module instead of tangling an existing path.

3. **Bias toward cleaning the design, not just accepting working code.** If behavior can stay the same while the structure becomes meaningfully cleaner, push for the cleaner version. Prefer simplifications that remove moving pieces over refactors that spread the same complexity around.

4. **Prefer direct, boring, maintainable code over hacky or magical code.** Treat brittle, ad-hoc, or "magic" behavior as a problem. Be skeptical of generic mechanisms that hide simple data-shape assumptions. Flag thin abstractions, identity wrappers, or pass-through helpers that add indirection without buying clarity.

5. **Push on type and boundary cleanliness when it affects maintainability.** Question unnecessary optionality, `unknown`, `any`, or cast-heavy code when a clearer type boundary could exist. Prefer explicit typed models over loosely-shaped ad-hoc objects. If a branch leans on a silent fallback to paper over an unclear invariant, ask whether the boundary should be made explicit.

6. **Keep logic in the canonical layer and reuse existing helpers.** Call out feature logic leaking into shared paths or implementation details leaking through APIs. Prefer existing canonical utilities over bespoke one-offs. Push code toward the right package, service, or module instead of normalizing drift.

7. **Treat unnecessary sequential orchestration and non-atomic updates as design smells when the cleaner structure is obvious.** If independent work is serialized for no reason, ask whether it should run in parallel. If related updates can leave state half-applied, push for a more atomic structure. Do not over-index on micro-optimizations, but do flag avoidable orchestration complexity that makes the code more brittle.

## Output Expectations

Prioritize structural code-quality regressions and missed simplifications first, then spaghetti and branching complexity, then boundary, type, and file-size concerns, then smaller modularity and legibility issues. Do not flood the review with low-value nits when larger structural issues exist. Prefer a few high-conviction comments over a long list of cosmetic notes.

## Approval Bar

Do not approve merely because behavior seems correct. Treat these as presumptive blockers unless the author can justify them: the PR keeps a lot of incidental complexity when a code-judo move would delete it. Pushes a file from below 1000 lines to above 1000 lines. Adds ad-hoc branching that tangles an existing flow. Scatters feature checks across shared code. Adds an unnecessary abstraction, wrapper, or cast-heavy contract, or duplicates an existing helper or puts logic in the wrong layer when there is a clear canonical home. If those conditions are not met, leave explicit, actionable feedback and push for a cleaner decomposition.

## Review Tone

Be direct, serious, and demanding about quality. Do not be rude, but do not soften major maintainability issues into mild suggestions. If the code is making the codebase messier, say so. If the implementation missed an obvious dramatic simplification, say that too. Do not be satisfied with "maybe rename this" when the real issue is structural.


## Instructions

Review the code through every lens in the rubric and the code-quality lens above that you find relevant. Do not force lenses that don't apply. A simple bug fix does not need paragraphs about architectural integrity.

For each finding, provide:

1. **Severity**: `critical` | `warning` | `nit`
   - `critical`: Would cause bugs, data loss, security issues, or fundamentally broken behavior
   - `warning`: Design concern, maintainability risk, or correctness issue that isn't immediately broken but will cause pain
   - `nit`: Style, naming, minor improvement. Only include nits if they're genuinely useful, not to pad your review.
2. **Finding**: What the problem is, in concrete terms. Reference specific lines/functions.
3. **Evidence**: Why you believe this is a problem. Show your reasoning. Don't just assert.
4. **Suggestion** (optional): What you'd do instead, if you have a concrete alternative. Skip this if you don't have a clear fix.

## What Makes a Good Finding

- It references specific code, not vague concerns ("this could be better")
- It explains WHY something is a problem, not just THAT it is
- It distinguishes between "this is broken" and "I would have done this differently"
- It considers the stated intent. A finding that ignores the context of what's being built is a bad finding

## What to Avoid

- Restating what the code does without identifying a problem
- Suggesting rewrites for working code because you'd prefer a different style
- Raising hypothetical issues ("what if someone passes null here") without evidence that the code path is reachable
- Praising the code. You're an adversary, not a cheerleader. If you find nothing wrong, say "no findings" and stop.

## Output

Return your findings as a structured list. If you have zero findings, say so. An empty review is a valid outcome.

```
## Findings

### 1. [Severity] Short title
**Location**: file:line or function name
**Finding**: What's wrong
**Evidence**: Why this matters
**Suggestion**: (optional) What to do instead

### 2. [Severity] Short title
...
```
