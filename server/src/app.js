import path from "node:path";
import express from "express";
import helmet from "helmet";
import cors from "cors";
import apiRouter from "./routes/api.js";
import { rateLimiter } from "./middleware/rateLimiter.js";

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
  app.use(cors());
  app.use(express.json());
}

export function createApp() {
  const app = express();

  configureSecurity(app);
  app.use("/api", rateLimiter, apiRouter);

  const clientPath = path.resolve(process.cwd(), "client");
  app.use(express.static(clientPath));

  return app;
}
