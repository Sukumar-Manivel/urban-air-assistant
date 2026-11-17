export const rateLimits = new Map();
const WINDOW_MS = 60 * 1000;
const MAX_REQUESTS = 60;

export function cleanExpiredEntries(now) {
  for (const [ip, data] of rateLimits.entries()) {
    if (now - data.startTime > WINDOW_MS) {
      rateLimits.delete(ip);
    }
  }
}

export function rateLimiter(req, res, next) {
  const now = Date.now();
  cleanExpiredEntries(now);

  const ip = req.ip || req.connection?.remoteAddress || "127.0.0.1";
  const entry = rateLimits.get(ip) || { count: 0, startTime: now };

  if (now - entry.startTime > WINDOW_MS) {
    entry.count = 1;
    entry.startTime = now;
  } else {
    entry.count += 1;
  }

  rateLimits.set(ip, entry);

  if (entry.count > MAX_REQUESTS) {
    return res.status(429).json({
      error: "Too Many Requests",
      message: "Rate limit exceeded. Please try again in 1 minute."
    });
  }

  next();
}

export function resetRateLimits() {
  rateLimits.clear();
}
