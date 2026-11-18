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
    // Server warming up; network failure handled
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

async function navigateAndPrepare(page) {
  await page.goto(TARGET_URL, { waitUntil: "networkidle" });
  await page.waitForFunction(() => {
    const textReady = document.body && document.body.innerText.trim().length > 50;
    const badge = document.getElementById("aqi-badge");
    return textReady && badge && !badge.textContent.includes("Loading");
  });
  await page.evaluate(() => new Promise((res) => requestAnimationFrame(() => requestAnimationFrame(res))));
  await page.waitForTimeout(1000);
}

async function runAqiSearchStep(page) {
  const cityInput = page.locator("#city-input");
  await cityInput.click();
  await cityInput.fill("");
  await cityInput.pressSequentially("Mumbai", { delay: 90 });
  await page.locator("#btn-fetch-aqi").click();

  await page.waitForFunction(() => {
    const label = document.getElementById("aqi-location-label");
    return label && label.textContent.includes("Mumbai");
  });
  await page.waitForTimeout(1500);
}

async function runCalculatorStep(page) {
  const kmInput = page.locator("#calc-weekly-km");
  await kmInput.click();
  await kmInput.fill("");
  await kmInput.pressSequentially("120", { delay: 90 });

  await page.locator("#calc-target-mode").selectOption("bus");
  await page.locator("#calc-chk-purifier").click();
  await page.locator("#btn-calculate").click();

  await page.waitForFunction(() => {
    const savings = document.getElementById("res-co2-savings");
    return savings && savings.textContent !== "--" && savings.textContent !== "-- kg";
  });
  await page.waitForTimeout(1500);
}

async function runGenAiPlanStep(page) {
  await smoothScrollTo(page, 420, 1000);
  await page.locator("#chk-children").check();
  await page.locator("#chk-asthma").check();
  await page.locator("#commute-mode-select").selectOption("motorcycle");

  await page.locator("#btn-generate-plan").click();
  await page.waitForFunction(() => {
    const box = document.getElementById("ai-plan-container");
    return box && !box.textContent.includes("Generating") && box.children.length > 0;
  });
  await page.waitForTimeout(2000);
}

async function runProtocolsAndEnd(page) {
  const maxScroll = await page.evaluate(() => document.body.scrollHeight);
  await smoothScrollTo(page, maxScroll, 1200);
  await page.waitForTimeout(2500);

  await smoothScrollTo(page, 0, 1000);
  await page.waitForTimeout(1000);
}

async function performWalkthrough(page) {
  await navigateAndPrepare(page);
  await runAqiSearchStep(page);
  await runCalculatorStep(page);
  await runGenAiPlanStep(page);
  await runProtocolsAndEnd(page);
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

void recordDemo();
