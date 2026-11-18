import { describe, it, expect } from "vitest";
import { createApp, getCorsOptions } from "../src/app.js";
import { startServer } from "../src/index.js";

describe("Express App Setup", () => {
  it("should configure security headers and middleware", () => {
    const app = createApp();
    expect(app).toBeDefined();
    expect(typeof app.use).toBe("function");
  });

  it("should handle CORS options correctly", () => {
    delete process.env.ALLOWED_ORIGINS;
    expect(getCorsOptions().origin).toBe(true);

    process.env.ALLOWED_ORIGINS = "*";
    expect(getCorsOptions().origin).toBe(true);

    process.env.ALLOWED_ORIGINS = "https://example.com, https://test.com";
    expect(getCorsOptions().origin).toEqual(["https://example.com", "https://test.com"]);
    delete process.env.ALLOWED_ORIGINS;
  });
});

describe("Express App Server Lifecycle", () => {
  it("should start and stop the server smoothly", async () => {
    const server = startServer(0);
    expect(server).toBeDefined();
    await new Promise((resolve) => server.once("listening", resolve));
    await new Promise((resolve) => server.close(resolve));
  });
});
