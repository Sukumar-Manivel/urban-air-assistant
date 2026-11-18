import { describe, it, expect, beforeEach } from "vitest";
import {
  buildVulnerabilityAlerts,
  buildCommuteAdvice,
  buildIndoorHacks,
  buildHourlyRoutine,
  generateDeterministicPlan,
  buildPrompt,
  generateGeminiPlan
} from "../src/services/geminiService.js";

describe("Gemini Rule-Based Builders", () => {
  it("should build alerts for children, elderly, and asthma", () => {
    const alerts = buildVulnerabilityAlerts({ hasChildren: true, hasElderly: true, hasAsthma: true }, 250);
    expect(alerts.length).toBe(3);
    expect(alerts[0]).toContain("rescue inhalers");

    const general = buildVulnerabilityAlerts({}, 90);
    expect(general[0]).toContain("General public alert");
  });

  it("should build commute advice for car, bike, and transit", () => {
    expect(buildCommuteAdvice("car").co2SavedKg).toBe(4.2);
    expect(buildCommuteAdvice("motorcycle").exposureSavedPercent).toBe(60);
    expect(buildCommuteAdvice("bus").co2SavedKg).toBe(0.8);
  });

  it("should build indoor hacks based on severity", () => {
    expect(buildIndoorHacks(250)[2].tip).toContain("Hermetic Door Sealing");
    expect(buildIndoorHacks(100)[2].tip).toContain("Strategic Ventilation");
  });

  it("should build hourly routines with risk levels", () => {
    expect(buildHourlyRoutine(220)[0].riskLevel).toBe("High");
    expect(buildHourlyRoutine(100)[0].riskLevel).toBe("Moderate");
  });
});

describe("Gemini Plan Generation & Prompting", () => {
  beforeEach(() => {
    delete process.env.GEMINI_API_KEY;
  });

  it("should generate deterministic action plan structure", () => {
    const plan = generateDeterministicPlan("Delhi", { aqi: 310, category: "Hazardous" }, { commuteMode: "car" });
    expect(plan.summary).toContain("Delhi");
    expect(plan.aqiLevel).toBe("Hazardous");
  });

  it("should build prompt string with proper variables and all pollutants", () => {
    const aqiData = {
      aqi: 200,
      category: "Unhealthy",
      pollutants: { pm25: 145.2, pm10: 210.5, co: 1200 }
    };
    const prompt = buildPrompt("Delhi", aqiData, { hasAsthma: true });
    expect(prompt).toContain("Has Asthma/Respiratory Illness: Yes");
    expect(prompt).toContain("US AQI: 200");
    expect(prompt).toContain("PM2.5: 145.2 ug/m3");
    expect(prompt).toContain("PM10: 210.5 ug/m3");
    expect(prompt).toContain("Carbon Monoxide (CO): 1200 ug/m3");
  });

  it("should fallback deterministically or invoke SDK cleanly", async () => {
    const fallback = await generateGeminiPlan("Delhi", { aqi: 180 }, {});
    expect(fallback.summary).toContain("Delhi");

    process.env.GEMINI_API_KEY = "test_key";
    const plan = await generateGeminiPlan("Delhi", { aqi: 180 }, {});
    expect(plan.summary).toBeDefined();
  });
});
