import { mkdirSync } from "node:fs";
import { chromium } from "playwright-core";

// usage: node capture.mjs <port> <outDir>
const [port, outDir] = process.argv.slice(2);
const url = `http://127.0.0.1:${port}/#discovery`;
const out = outDir.endsWith("/") || outDir.endsWith("\\") ? outDir : `${outDir}/`;
mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe" });

async function scenario(page, id) {
  await page.getByTestId("open-review-tools").click();
  await page.getByTestId("fixture-scenario").selectOption(id);
  await page.getByTestId("apply-fixture-scenario").click();
  await page.goto(url);
  await page.waitForTimeout(400);
}

async function settle(page) {
  await page.waitForTimeout(400);
  const toast = page.getByTestId("dismiss-notice");
  if (await toast.count()) await toast.first().click();
  await page.evaluate(() => document.activeElement?.blur());
}

async function shoot(page, name) {
  await settle(page);
  await page.evaluate(() => window.scrollTo(0, 0));
  const width = page.viewportSize().width;
  const height = await page.evaluate(() => document.documentElement.scrollHeight);
  await page.setViewportSize({ width, height });
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${out}${name}.png` });
  await page.setViewportSize({ width, height: width > 500 ? 900 : 844 });
  console.log("saved", name);
}

async function shootViewport(page, name, scrollFraction) {
  await settle(page);
  await page.evaluate((f) => window.scrollTo(0, document.documentElement.scrollHeight * f), scrollFraction);
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${out}${name}.png` });
  console.log("saved", name);
}

for (const [tag, viewport] of [["desktop", { width: 1366, height: 900 }], ["phone", { width: 390, height: 844 }]]) {
  const ctx = await browser.newContext({ viewport });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => console.log("pageerror", e.message));
  await page.goto(url);
  await shoot(page, `${tag}-1-fresh`);

  await page.getByTestId("suggested-answer").first().click();
  await page.getByTestId("send-discovery-round").click();
  await page.waitForTimeout(2500);
  await shoot(page, `${tag}-2-after-first-answer`);

  if (tag === "desktop") {
    await scenario(page, "daily-empty");
    await shoot(page, `${tag}-3-daily-limit-no-fuel`);
    await scenario(page, "normal");
    await scenario(page, "almost-finished");
    await shoot(page, `${tag}-4-one-topic-left`);
  }

  await scenario(page, "ready-to-finish");
  await shoot(page, `${tag}-5-ready-to-finish`);

  await page.getByTestId("finish-discovery").click();
  await shoot(page, `${tag}-6-scope-review`);
  if (tag === "phone") await shootViewport(page, `${tag}-6b-scope-review-scrolled-halfway`, 0.4);
  await ctx.close();
}
await browser.close();
