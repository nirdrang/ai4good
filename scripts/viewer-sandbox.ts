import { Sandbox } from "@vercel/sandbox";
import { execSync } from "node:child_process";
import { writeFileSync } from "node:fs";

const TEAM_ID = "team_IIzpTbH8CVZmak0kXNVX1P23";
const PROJECT_ID = "prj_WJUA5DfSveWrCQJDBEQjgBAcccKD";
const REPO_URL = "https://github.com/nirdrang/ai4good.git";
const APP_PORT = 8080;
const LINK_FILE = "/tmp/viewer-url";

const token = process.env.VERCEL_TOKEN;
if (!token) {
  console.log("viewer: VERCEL_TOKEN is not set; no sandbox");
  process.exit(0);
}

const branch = execSync("git branch --show-current").toString().trim();
const name = `viewer-${branch.replace(/[^a-zA-Z0-9_-]/g, "-")}`.slice(-128);
const credentials = { token, teamId: TEAM_ID, projectId: PROJECT_ID };

const modelEnv = Object.fromEntries(
  ["DISCOVERY_API_KEY", "DISCOVERY_BASE_URL", "DISCOVERY_MODEL", "DISCOVERY_PROVIDER", "DISCOVERY_REASONING_EFFORT", "ANTHROPIC_API_KEY", "VIEWER_NGO_PASSWORD"]
    .filter((key) => process.env[key])
    .map((key) => [key, process.env[key] as string]),
);

async function run() {
  const started = Date.now();
  if (process.argv[2] === "stop") {
    const sandbox = await Sandbox.get({ ...credentials, name });
    await sandbox.stop();
    console.log(`viewer: stopped ${name}`);
    return;
  }

  writeFileSync(LINK_FILE, "starting\n");
  const sandbox = await Sandbox.getOrCreate({
    ...credentials,
    name,
    persistent: true,
    region: "fra1",
    resources: { vcpus: 4 },
    ports: [APP_PORT],
    timeout: 45 * 60 * 1000,
    source: { type: "git", url: REPO_URL, revision: branch, depth: 1 },
  });
  const appUrl = sandbox.domain(APP_PORT);

  const start = [
    "cd ai4good",
    "rm -f /tmp/viewer-seed.txt",
    `git fetch -q --depth 1 origin ${JSON.stringify(branch)}`,
    `git checkout -q -B ${JSON.stringify(branch)} FETCH_HEAD`,
    "git reset -q --hard FETCH_HEAD",
    "(pkill -f '^bash (.devcontainer/viewer.sh|scripts/viewer-stack.sh)' || true)",
    "(pkill -f '[v]ite dev' || true)",
    "setsid -f nohup bash scripts/viewer-stack.sh > /tmp/viewer.log 2>&1 < /dev/null",
  ].join(" && ");
  await sandbox.runCommand({ cmd: "bash", args: ["-c", start], cwd: "/vercel", sudo: true, env: { ...modelEnv, VIEWER_APP_URL: appUrl } });

  for (let attempt = 0; attempt < 120; attempt++) {
    const seed = await sandbox.runCommand({ cmd: "cat", args: ["/tmp/viewer-seed.txt"] });
    const path = (await seed.stdout()).match(/\/discovery\/[0-9a-f-]+\/[0-9a-f-]+/)?.[0];
    const app = path ? await fetch(appUrl).then((r) => r.status).catch(() => 0) : 0;
    if (path && app === 200) {
      const link = `${appUrl}${path}`;
      writeFileSync(LINK_FILE, `${link}\n`);
      console.log(`viewer: ${link} (ready after ${Math.round((Date.now() - started) / 1000)} s)`);
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 3000));
  }
  writeFileSync(LINK_FILE, `not ready after 6 minutes: ${appUrl}\n`);
  console.log(`viewer: ${appUrl} did not answer within 6 minutes`);
}

run().catch((error) => {
  writeFileSync(LINK_FILE, `failed: ${error instanceof Error ? error.message : String(error)}\n`);
  console.log(`viewer: sandbox failed: ${error instanceof Error ? error.message : String(error)}`);
});
