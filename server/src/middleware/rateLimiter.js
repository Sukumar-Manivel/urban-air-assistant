/**
 * Express in-memory rate limiting middleware.
 * Enforces per-IP request caps over sliding time windows.
 */
export const rateLimits = new Map();
const WINDOW_MS = 60 * 1000;
const MAX_REQUESTS = 60;

/**
 * Removes expired IP records from the rate limit tracker.
 * @param {number} now - Current UNIX timestamp in ms.
 */
export function cleanExpiredEntries(now) {
  for (const [ip, data] of rateLimits.entries()) {
    if (now - data.startTime > WINDOW_MS) {
      rateLimits.delete(ip);
    }
  }
}

/**
 * Rate limiter middleware function.
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 * @param {import("express").NextFunction} next
 */
export function rateLimiter(req, res, next) {
  const now = Date.now();
  cleanExpiredEntries(now);

  const ip = req.ip || req.socket?.remoteAddress || "127.0.0.1";
  const entry = rateLimits.get(ip) || { count: 0, startTime: now };
  entry.count += 1;
  rateLimits.set(ip, entry);

  if (entry.count > MAX_REQUESTS) {
    return res.status(429).json({
      error: "Too Many Requests",
      message: "Rate limit exceeded. Please try again in 1 minute."
    });
  }

  next();
}

/**
 * Resets the in-memory rate limit store (for testing/maintenance).
 */
export function resetRateLimits() {
  rateLimits.clear();
}
