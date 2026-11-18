import { describe, it, expect } from "vitest";
import { createApp, getCorsOptions, notFoundHandler, errorHandler } from "../src/app.js";
import { startServer } from "../src/index.js";

describe("Express App Configuration", () => {
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

describe("Express App Error Handlers", () => {
  it("should handle 404 routes and global errors cleanly", () => {
    let capturedCode = 200;
    let capturedBody = null;
    const tracker = {
      status: (c) => { capturedCode = c; return tracker; },
      json: (b) => { capturedBody = b; return tracker; }
    };

    notFoundHandler({}, tracker);
    expect(capturedCode).toBe(404);
    expect(capturedBody.error).toBe("Route not found");

    errorHandler(new Error("Boom"), {}, tracker, () => {});
    expect(capturedCode).toBe(500);
    expect(capturedBody.error).toBe("Boom");

    let delegated = false;
    errorHandler(new Error("Next"), {}, { headersSent: true }, () => { delegated = true; });
    expect(delegated).toBe(true);
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
