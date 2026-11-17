import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const TARGET_URL = process.env.APP_URL || "http://localhost:8080";
const OUTPUT_DIR = path.resolve(process.cwd(), "demo-output");

function ensureDirectory(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

async function launchBrowser() {
  try {
    return await chromium.launch({ headless: true });
  } catch {
    return await chromium.launch({ headless: true, channel: "chrome" });
  }
}

async function warmupUrl(url) {
  try {
    await fetch(url);
  } catch {
    // Cold start warm-up attempt; ignore initial network failure
  }
}

async function smoothScrollTo(page, targetY, durationMs = 1500) {
  await page.evaluate(({ target, duration }) => {
    return new Promise((resolve) => {
      const start = window.scrollY;
      const diff = target - start;
      const startTime = performance.now();

      function step(now) {
        const elapsed = now - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const ease = progress < 0.5
          ? 2 * progress * progress
          : -1 + (4 - 2 * progress) * progress;

        window.scrollTo(0, start + diff * ease);
        if (progress < 1) {
          window.requestAnimationFrame(step);
        } else {
          resolve();
        }
      }
      window.requestAnimationFrame(step);
    });
  }, { target: targetY, duration: durationMs });
}

async function performScrollTour(page) {
  const scrollHeight = await page.evaluate(() => document.body.scrollHeight);
  const middleY = Math.max(0, Math.floor((scrollHeight - 720) / 2));
  const bottomY = Math.max(0, scrollHeight - 720);

  await smoothScrollTo(page, middleY, 1500);
  await page.waitForTimeout(2000);

  await smoothScrollTo(page, bottomY, 1500);
  await page.waitForTimeout(2500);

  await smoothScrollTo(page, 0, 1500);
  await page.waitForTimeout(1000);
}

async function waitForInitialDashboard(page) {
  await page.goto(TARGET_URL, { waitUntil: "networkidle" });
  await page.waitForFunction(() => {
    const badge = document.getElementById("aqi-badge");
    const val = document.getElementById("aqi-value");
    return badge && !badge.textContent.includes("Loading") && val && val.textContent !== "--";
  });
  await page.waitForTimeout(1800);
}

async function triggerGenAiAndActions(page) {
  const asthmaCheck = page.locator("#chk-asthma");
  if (await asthmaCheck.count() > 0) {
    await asthmaCheck.check();
  }

  await page.locator("#btn-generate-plan").click();
  await page.waitForFunction(() => {
    const container = document.getElementById("ai-plan-container");
    return container && !container.textContent.includes("Generating") && container.children.length > 0;
  });

  await page.locator("#btn-calculate").click();
  await page.waitForFunction(() => {
    const savings = document.getElementById("res-co2-savings");
    return savings && savings.textContent !== "--" && savings.textContent !== "-- kg";
  });
}

async function performWalkthrough(page) {
  await waitForInitialDashboard(page);
  await triggerGenAiAndActions(page);
  await performScrollTour(page);
}

async function recordDemo() {
  ensureDirectory(OUTPUT_DIR);
  await warmupUrl(TARGET_URL);

  const browser = await launchBrowser();
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    deviceScaleFactor: 1,
    recordVideo: { dir: "demo-output/", size: { width: 1280, height: 720 } }
  });

  try {
    const page = await context.newPage();
    await performWalkthrough(page);
    process.stdout.write("Demo recorded successfully in demo-output/\n");
  } catch (err) {
    process.stderr.write(`Demo recording failed: ${err.message}\n`);
    process.exit(1);
  } finally {
    await context.close();
    await browser.close();
  }
}

recordDemo();
