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

async function performWalkthrough(page) {
  await page.goto(TARGET_URL, { waitUntil: "networkidle" });
  await page.waitForTimeout(1000);

  const cityInput = page.locator("#city-input");
  await cityInput.fill("Delhi");
  await page.locator("#btn-fetch-aqi").click();
  await page.waitForTimeout(1000);

  const asthmaCheck = page.locator("#chk-asthma");
  await asthmaCheck.check();
  await page.locator("#btn-generate-plan").click();
  await page.waitForTimeout(1500);

  await page.locator("#btn-calculate").click();
  await page.waitForTimeout(1500);
}

async function recordDemo() {
  ensureDirectory(OUTPUT_DIR);
  const browser = await launchBrowser();
  const context = await browser.newContext({
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
