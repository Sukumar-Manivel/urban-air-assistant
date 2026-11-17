import { describe, it, expect } from "vitest";
import {
  calculateCo2,
  calculateInhalation,
  sanitizeInputs,
  computeSavings,
  computeImpact
} from "../src/services/calculatorService.js";

describe("Calculator Factors & Inhalation", () => {
  it("should calculate CO2 across transit modes and fallbacks", () => {
    expect(calculateCo2("car", 100)).toBe(19.2);
    expect(calculateCo2("motorcycle", 100)).toBe(10.3);
    expect(calculateCo2("carpool", 100)).toBe(6.4);
    expect(calculateCo2("bus", 100)).toBe(8.2);
    expect(calculateCo2("metro", 100)).toBe(2.8);
    expect(calculateCo2("bicycle", 100)).toBe(0);
    expect(calculateCo2("unknown_mode", 100)).toBe(19.2);
  });

  it("should calculate inhalation with masks and indoor purifiers", () => {
    const raw = calculateInhalation(200, 50, false, false);
    const protectedInhaled = calculateInhalation(200, 50, true, true);
    expect(raw).toBeGreaterThan(protectedInhaled);
  });
});

describe("Calculator Sanitization & Impact", () => {
  it("should sanitize and clamp input parameters", () => {
    const clamped = sanitizeInputs({ weeklyKm: 5000, aqi: 1000 });
    expect(clamped.weeklyKm).toBe(1000);
    expect(clamped.aqi).toBe(800);

    const defaultSanitized = sanitizeInputs();
    expect(defaultSanitized.weeklyKm).toBe(60);
    expect(defaultSanitized.aqi).toBe(180);
  });

  it("should compute savings without zero division errors", () => {
    const savings = computeSavings(10, 2, 500, 100);
    expect(savings.co2SavedKgPerWeek).toBe(8);
    expect(savings.co2ReductionPercent).toBe(80);

    const zeroSavings = computeSavings(0, 0, 0, 0);
    expect(zeroSavings.co2ReductionPercent).toBe(0);
  });

  it("should compute full impact comparison report", () => {
    const impact = computeImpact({
      currentMode: "car",
      targetMode: "metro",
      weeklyKm: 80,
      aqi: 220,
      usesMask: true,
      usesPurifier: true
    });
    expect(impact.savings.co2SavedKgPerWeek).toBeGreaterThan(0);
  });
});
