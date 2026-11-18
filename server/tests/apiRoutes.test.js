import { describe, it, expect, vi } from "vitest";
import {
  handleHealth,
  handleAirQuality,
  handleActionPlan,
  handleCalculateImpact
} from "../src/routes/api.js";
import * as airService from "../src/services/airQualityService.js";
import * as calcService from "../src/services/calculatorService.js";

function createMockRes() {
  return {
    statusCode: 0,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    }
  };
}

describe("Health & Air Quality Endpoints", () => {
  it("should respond to health endpoint", () => {
    const res = createMockRes();
    handleHealth({}, res);
    expect(res.statusCode).toBe(200);
    expect(res.body.service).toBe("urban-air-assistant");
  });

  it("should handle air quality request with query and errors", async () => {
    const res1 = createMockRes();
    await handleAirQuality({ query: { city: "Delhi" } }, res1);
    expect(res1.statusCode).toBe(200);

    const res2 = createMockRes();
    await handleAirQuality({ query: {} }, res2);
    expect(res2.statusCode).toBe(200);

    const notFoundRes = createMockRes();
    const notFoundErr = new Error('Location "Tamil Nadu" not found.');
    notFoundErr.status = 404;
    vi.spyOn(airService, "getCityAirQuality").mockRejectedValueOnce(notFoundErr);
    await handleAirQuality({ query: { city: "Tamil Nadu" } }, notFoundRes);
    expect(notFoundRes.statusCode).toBe(404);

    const errRes = createMockRes();
    vi.spyOn(airService, "getCityAirQuality").mockRejectedValueOnce(new Error("Crash"));
    await handleAirQuality({ query: { city: "Delhi" } }, errRes);
    expect(errRes.statusCode).toBe(500);

    const noMsgRes = createMockRes();
    vi.spyOn(airService, "getCityAirQuality").mockRejectedValueOnce({ status: 503 });
    await handleAirQuality({ query: { city: "Delhi" } }, noMsgRes);
    expect(noMsgRes.statusCode).toBe(503);
    expect(noMsgRes.body.error).toBe("Air quality lookup failed");
  });
});

describe("Action Plan & Impact Endpoints", () => {
  it("should handle action plan with payload, defaults and errors", async () => {
    const res = createMockRes();
    await handleActionPlan({ body: { city: "Delhi" } }, res);
    expect(res.statusCode).toBe(200);

    const nullHouseholdRes = createMockRes();
    await handleActionPlan({ body: { city: "Delhi", household: null } }, nullHouseholdRes);
    expect(nullHouseholdRes.statusCode).toBe(200);

    const resDefault = createMockRes();
    await handleActionPlan({}, resDefault);
    expect(resDefault.statusCode).toBe(200);

    const errRes = createMockRes();
    vi.spyOn(airService, "getCityAirQuality").mockRejectedValueOnce(new Error("Crash"));
    await handleActionPlan({ body: {} }, errRes);
    expect(errRes.statusCode).toBe(500);
  });

  it("should handle impact calculation with and without body", () => {
    const res = createMockRes();
    handleCalculateImpact({ body: { weeklyKm: 50, aqi: 150 } }, res);
    expect(res.statusCode).toBe(200);

    const resEmpty = createMockRes();
    handleCalculateImpact({}, resEmpty);
    expect(resEmpty.statusCode).toBe(200);

    const errRes = createMockRes();
    vi.spyOn(calcService, "computeImpact").mockImplementationOnce(() => {
      throw new Error("Crash");
    });
    handleCalculateImpact({ body: {} }, errRes);
    expect(errRes.statusCode).toBe(400);
  });
});
