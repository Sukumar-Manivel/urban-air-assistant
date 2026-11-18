import { describe, it, expect, beforeEach } from "vitest";
import {
  rateLimiter,
  cleanExpiredEntries,
  resetRateLimits,
  rateLimits
} from "../src/middleware/rateLimiter.js";

describe("Rate Limiter Thresholds", () => {
  beforeEach(() => {
    resetRateLimits();
  });

  it("should allow requests under the limit", () => {
    let nextCalled = false;
    const req = { ip: "192.168.1.1" };
    const res = {};
    const next = () => { nextCalled = true; };

    rateLimiter(req, res, next);
    expect(nextCalled).toBe(true);
  });

  it("should block requests exceeding MAX_REQUESTS", () => {
    const req = { ip: "10.0.0.1" };
    let statusCode = 0;
    let jsonBody = null;
    const res = {
      status(code) {
        statusCode = code;
        return this;
      },
      json(payload) {
        jsonBody = payload;
        return this;
      }
    };
    const next = () => {};

    for (let i = 0; i < 62; i += 1) {
      rateLimiter(req, res, next);
    }

    expect(statusCode).toBe(429);
    expect(jsonBody.error).toBe("Too Many Requests");
  });
});

describe("Rate Limiter Window Expiration", () => {
  it("should reset window after expiration and clean expired entries", () => {
    let nextCount = 0;
    const next = () => { nextCount += 1; };
    const res = {};

    rateLimiter({ socket: { remoteAddress: "10.0.0.2" } }, res, next);
    rateLimiter({}, res, next);

    cleanExpiredEntries(Date.now() + 120000);

    rateLimits.set("10.0.0.3", { count: 3, startTime: Date.now() - 70000 });
    rateLimiter({ ip: "10.0.0.3" }, res, next);

    expect(nextCount).toBe(3);
  });
});
