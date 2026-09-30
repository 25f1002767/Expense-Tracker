const jwt = require("jsonwebtoken");
const User = require("../models/User");

const COOKIE_NAME = "expense_session";
const SESSION_MAX_AGE = 7 * 24 * 60 * 60 * 1000;

function cookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  };
}

function signSession(userId) {
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
    throw new Error("JWT_SECRET must contain at least 32 characters.");
  }
  return jwt.sign({}, process.env.JWT_SECRET, { subject: String(userId), expiresIn: "7d" });
}

async function requireAuth(request, response, next) {
  const token = request.cookies?.[COOKIE_NAME];
  if (!token) return response.status(401).json({ message: "Please log in to continue." });

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(payload.sub);
    if (!user) return response.status(401).json({ message: "Your session is no longer valid." });
    request.user = user;
    return next();
  } catch {
    return response.status(401).json({ message: "Your session is invalid or has expired." });
  }
}

function verifyRequestOrigin(request, response, next) {
  const origin = request.get("origin");
  const expectedOrigin = process.env.FRONTEND_URL || "http://localhost:5173";
  if (origin && origin !== expectedOrigin) {
    return response.status(403).json({ message: "Request origin is not allowed." });
  }
  return next();
}

module.exports = { COOKIE_NAME, cookieOptions, requireAuth, signSession, verifyRequestOrigin };
