import path from "node:path";
import express from "express";
import helmet from "helmet";
import cors from "cors";
import apiRouter from "./routes/api.js";
import { rateLimiter } from "./middleware/rateLimiter.js";

/**
 * Resolves CORS options based on the ALLOWED_ORIGINS environment variable.
 * @returns {import("cors").CorsOptions}
 */
export function getCorsOptions() {
  const allowed = process.env.ALLOWED_ORIGINS;
  if (!allowed || allowed === "*") {
    return { origin: true, methods: ["GET", "POST", "OPTIONS"] };
  }
  const origins = allowed.split(",").map((o) => o.trim());
  return { origin: origins, methods: ["GET", "POST", "OPTIONS"] };
}

/**
 * Attaches security headers, CORS protection, and body parsers to the app.
 * @param {import("express").Express} app
 */
export function configureSecurity(app) {
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", "data:", "https:"],
          connectSrc: ["'self'", "https://air-quality-api.open-meteo.com", "https://geocoding-api.open-meteo.com"],
          fontSrc: ["'self'"],
          objectSrc: ["'none'"]
        }
      }
    })
  );
  app.use(cors(getCorsOptions()));
  app.use(express.json());
}

/**
 * 404 handler for unmatched API routes.
 * @param {import("express").Request} _req
 * @param {import("express").Response} res
 */
export function notFoundHandler(_req, res) {
  res.status(404).json({ error: "Route not found" });
}

/**
 * Global application error handler.
 * @param {Error & { status?: number }} err
 * @param {import("express").Request} _req
 * @param {import("express").Response} res
 * @param {import("express").NextFunction} _next
 */
export function errorHandler(err, _req, res, next) {
  if (res.headersSent) {
    return next(err);
  }
  return res.status(err.status || 500).json({ error: err.message || "Internal server error" });
}

/**
 * Factory function to create and configure the Express application instance.
 * @returns {import("express").Express}
 */
export function createApp() {
  const app = express();

  configureSecurity(app);
  app.use("/api", rateLimiter, apiRouter);
  app.use("/api", notFoundHandler);

  const clientPath = path.resolve(process.cwd(), "client");
  app.use(express.static(clientPath));

  app.use(errorHandler);

  return app;
}
