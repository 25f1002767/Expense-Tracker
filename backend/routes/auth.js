const { Router } = require("express");
const bcrypt = require("bcryptjs");
const User = require("../models/User");
const { isValidTimeZone } = require("../utils/dates");
const { publicUser } = require("../utils/responses");
const { COOKIE_NAME, cookieOptions, requireAuth, signSession } = require("../middleware/auth");
const authRateLimit = require("../middleware/rateLimit");

const router = Router();
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

router.post("/register", authRateLimit, async (request, response) => {
  const { name, email, password } = request.body;
  const normalizedName = typeof name === "string" ? name.trim() : "";
  const normalizedEmail = typeof email === "string" ? email.trim().toLowerCase() : "";
  const timeZone = request.body.timeZone || "Asia/Kolkata";

  if (!normalizedName || normalizedName.length > 80) return response.status(400).json({ message: "Enter your name (up to 80 characters)." });
  if (!emailPattern.test(normalizedEmail) || normalizedEmail.length > 254) return response.status(400).json({ message: "Enter a valid email address." });
  if (typeof password !== "string" || password.length < 8 || Buffer.byteLength(password, "utf8") > 72) {
    return response.status(400).json({ message: "Password must be at least 8 characters and no more than 72 bytes." });
  }
  if (!isValidTimeZone(timeZone)) return response.status(400).json({ message: "Choose a valid time zone." });

  const passwordHash = await bcrypt.hash(password, 12);
  try {
    const user = await User.create({ name: normalizedName, email: normalizedEmail, passwordHash, timeZone });
    response.cookie(COOKIE_NAME, signSession(user._id), cookieOptions());
    return response.status(201).json({ user: publicUser(user) });
  } catch (error) {
    if (error.code === 11000) return response.status(409).json({ message: "An account with this email already exists." });
    throw error;
  }
});

router.post("/login", authRateLimit, async (request, response) => {
  const email = typeof request.body.email === "string" ? request.body.email.trim().toLowerCase() : "";
  const password = typeof request.body.password === "string" ? request.body.password : "";
  const user = await User.findOne({ email }).select("+passwordHash");
  const passwordMatches = user ? await bcrypt.compare(password, user.passwordHash) : false;
  if (!passwordMatches) return response.status(401).json({ message: "Email or password is incorrect." });

  response.cookie(COOKIE_NAME, signSession(user._id), cookieOptions());
  return response.json({ user: publicUser(user) });
});

router.get("/me", requireAuth, (request, response) => response.json({ user: publicUser(request.user) }));

router.post("/logout", (_request, response) => {
  response.clearCookie(COOKIE_NAME, { ...cookieOptions(), maxAge: undefined });
  return response.json({ message: "You have been logged out." });
});

module.exports = router;
