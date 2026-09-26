import { mkdirSync } from "node:fs";
import { chromium } from "playwright-core";

// usage: node capture-usage.mjs <port> <outDir>
const [port, outDir] = process.argv.slice(2);
const url = `http://127.0.0.1:${port}/#discovery`;
const out = /[\\/]$/.test(outDir) ? outDir : `${outDir}/`;
mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe" });

async function scenario(page, id) {
  await page.getByTestId("open-review-tools").click();
  await page.getByTestId("fixture-scenario").selectOption(id);
  await page.getByTestId("apply-fixture-scenario").click();
  await page.goto(url);
  await page.waitForTimeout(400);
}

async function shoot(page, name) {
  await page.waitForTimeout(400);
  const toast = page.getByTestId("dismiss-notice");
  if (await toast.count()) await toast.first().click();
  await page.evaluate(() => { document.activeElement?.blur(); window.scrollTo(0, 0); });
  const width = page.viewportSize().width;
  const height = await page.evaluate(() => document.documentElement.scrollHeight);
  await page.setViewportSize({ width, height });
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${out}${name}.png` });
  await page.setViewportSize({ width, height: width > 500 ? 900 : 844 });
  console.log("saved", name);
}

async function answerAndSend(page) {
  await page.getByTestId("suggested-answer").first().click();
  await page.getByTestId("send-discovery-round").click();
  await page.waitForTimeout(2500);
}

const states = [
  ["01-daily-limit-fuel-available", "daily-paid"],
  ["03-beta-limit-fuel-available", "beta-paid"],
  ["04-daily-limit-no-fuel", "daily-empty"],
  ["05-beta-limit-no-fuel", "beta-empty"],
  ["06-no-fuel-free-replies-left", "free-empty"],
  ["07-paid-usage-pending", "pending"],
  ["08-gauge-80-percent", "usage-80"],
  ["09-gauge-95.01-percent", "usage-95.01"],
  ["10-gauge-100-percent", "usage-100"],
];

for (const [tag, viewport] of [["desktop", { width: 1366, height: 900 }], ["phone", { width: 390, height: 844 }]]) {
  const ctx = await browser.newContext({ viewport });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => console.log("pageerror", e.message));
  await page.goto(url);
  await answerAndSend(page); // start mid-conversation with one free reply used

  for (const [name, id] of states) {
    await scenario(page, id);
    await shoot(page, `${tag}-${name}`);
    if (id === "daily-paid") {
      await answerAndSend(page);
      await shoot(page, `${tag}-02-after-a-paid-reply`);
    }
  }

  await scenario(page, "reply-fails");
  await page.getByTestId("suggested-answer").first().click();
  await page.getByTestId("send-discovery-round").click();
  await page.waitForTimeout(2500);
  await shoot(page, `${tag}-11-reply-failed`);
  await ctx.close();
}
await browser.close();
