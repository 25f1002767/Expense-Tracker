const attempts = new Map();

function authRateLimit(request, response, next) {
  const now = Date.now();
  const key = request.ip || "unknown";
  const current = attempts.get(key);
  const windowMs = 15 * 60 * 1000;
  const maxAttempts = 12;

  if (!current || now - current.startedAt >= windowMs) {
    attempts.set(key, { startedAt: now, count: 1 });
    return next();
  }
  if (current.count >= maxAttempts) {
    return response.status(429).json({ message: "Too many authentication attempts. Try again later." });
  }
  current.count += 1;
  return next();
}

module.exports = authRateLimit;
