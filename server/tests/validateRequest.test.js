import { describe, it, expect, vi } from "vitest";
import {
  validateActionPlan,
  validateCalculateImpact
} from "../src/middleware/validateRequest.js";

function mockRes() {
  const state = { code: 200, data: null };
  const chain = {
    json: (payload) => {
      state.data = payload;
      return chain;
    }
  };
  return {
    get statusCode() { return state.code; },
    get body() { return state.data; },
    status: (c) => {
      state.code = c;
      return chain;
    }
  };
}

describe("Action Plan Request Validation", () => {
  it("should reject non-object body or invalid household", () => {
    const next = vi.fn();
    const res1 = mockRes();
    validateActionPlan({ body: null }, res1, next);
    expect(res1.statusCode).toBe(400);

    const res2 = mockRes();
    validateActionPlan({ body: { household: null } }, res2, next);
    expect(res2.statusCode).toBe(400);

    const res3 = mockRes();
    validateActionPlan({ body: { household: [] } }, res3, next);
    expect(res3.statusCode).toBe(400);

    const res4 = mockRes();
    validateActionPlan({ body: { household: { hasChildren: "false" } } }, res4, next);
    expect(res4.statusCode).toBe(400);
    expect(next).not.toHaveBeenCalled();
  });

  it("should accept valid household payloads", () => {
    const next = vi.fn();
    const res = mockRes();
    validateActionPlan({ body: { city: "Delhi", household: { hasChildren: true } } }, res, next);
    expect(next).toHaveBeenCalledTimes(1);
    expect(res.statusCode).toBe(200);
  });
});

describe("Calculate Impact Rejections", () => {
  it("should reject non-objects or invalid numbers", () => {
    const next = vi.fn();
    const res1 = mockRes();
    validateCalculateImpact({ body: null }, res1, next);
    expect(res1.statusCode).toBe(400);

    const res2 = mockRes();
    validateCalculateImpact({ body: { weeklyKm: -5 } }, res2, next);
    expect(res2.statusCode).toBe(400);

    const res3 = mockRes();
    validateCalculateImpact({ body: { aqi: -10 } }, res3, next);
    expect(res3.statusCode).toBe(400);
    expect(next).not.toHaveBeenCalled();
  });

  it("should reject invalid modes and string booleans", () => {
    const next = vi.fn();
    const res1 = mockRes();
    validateCalculateImpact({ body: { currentMode: "rocket" } }, res1, next);
    expect(res1.statusCode).toBe(400);

    const res2 = mockRes();
    validateCalculateImpact({ body: { targetMode: "teleport" } }, res2, next);
    expect(res2.statusCode).toBe(400);

    const res3 = mockRes();
    validateCalculateImpact({ body: { usesMask: "false" } }, res3, next);
    expect(res3.statusCode).toBe(400);

    const res4 = mockRes();
    validateCalculateImpact({ body: { usesPurifier: "true" } }, res4, next);
    expect(res4.statusCode).toBe(400);
  });
});

describe("Calculate Impact Acceptances", () => {
  it("should accept valid calculation inputs", () => {
    const next = vi.fn();
    const res = mockRes();
    validateCalculateImpact({
      body: {
        currentMode: "car",
        targetMode: "metro",
        weeklyKm: 50,
        aqi: 150,
        usesMask: true,
        usesPurifier: false
      }
    }, res, next);
    expect(next).toHaveBeenCalledTimes(1);
  });
});
