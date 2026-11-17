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

async function smoothScrollDown(page) {
  const steps = 4;
  for (let i = 0; i < steps; i += 1) {
    await page.evaluate(() => window.scrollBy({ top: 300, behavior: "smooth" }));
    await page.waitForTimeout(1200);
  }
}

async function fillAndSubmitForms(page) {
  const cityInput = page.locator("#city-input");
  await cityInput.fill("Delhi");
  await page.locator("#btn-fetch-aqi").click();
  await page.waitForSelector("#aqi-value", { state: "visible" });

  const asthmaCheck = page.locator("#chk-asthma");
  await asthmaCheck.check();
  await page.locator("#btn-generate-plan").click();
  await page.waitForSelector("#ai-plan-container", { state: "visible" });

  await page.locator("#btn-calculate").click();
  await page.waitForSelector("#res-co2-savings", { state: "visible" });
  await page.waitForLoadState("networkidle");
}

async function performWalkthrough(page) {
  await page.goto(TARGET_URL, { waitUntil: "networkidle" });
  await page.waitForTimeout(1500);

  await fillAndSubmitForms(page);
  await smoothScrollDown(page);
}

async function recordDemo() {
  ensureDirectory(OUTPUT_DIR);
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
