const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const helmet = require("helmet");

require("dotenv").config();

const authRoutes = require("./routes/auth");
const transactionRoutes = require("./routes/transactions");
const analyticsRoutes = require("./routes/analytics");
const budgetRoutes = require("./routes/budgets");
const { verifyRequestOrigin } = require("./middleware/auth");
const { errorHandler, notFound } = require("./middleware/errorHandler");

const app = express();

// =========================
// Configuration
// =========================

const PORT = process.env.PORT || 5000;
const FRONTEND_URL =
  process.env.FRONTEND_URL || "http://localhost:5173";

// =========================
// Security & Middleware
// =========================

app.use(helmet());

app.use(
  cors({
    origin: FRONTEND_URL,
    credentials: true,
  })
);

app.use(cookieParser());

app.use(
  express.json({
    limit: "1mb",
  })
);

// Verify API requests
app.use("/api", verifyRequestOrigin);

// =========================
// Health Check
// =========================

app.get("/api/health", (_request, response) => {
  response.json({
    status: "ok",
    database:
      mongoose.connection.readyState === 1
        ? "connected"
        : "disconnected",
  });
});

// =========================
// API Routes
// =========================

app.use("/api/auth", authRoutes);
app.use("/api/transactions", transactionRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/budgets", budgetRoutes);

// =========================
// Error Handling
// =========================

app.use(notFound);
app.use(errorHandler);

// =========================
// MongoDB + Server Startup
// =========================

async function startServer() {
  // Use ONLY MONGO_URI.
  // This prevents an old MONGODB_URI environment variable
  // from overriding the current MongoDB connection string.
  const mongoUri = process.env.MONGO_URI;

  if (!mongoUri) {
    throw new Error(
      "Set MONGO_URI in backend/.env before starting the server."
    );
  }

  if (
    !process.env.JWT_SECRET ||
    process.env.JWT_SECRET.length < 32
  ) {
    throw new Error(
      "Set JWT_SECRET to a random value of at least 32 characters in backend/.env."
    );
  }

  console.log("Connecting to MongoDB...");

  try {
    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 10000,
    });

    console.log("Connected to MongoDB");
  } catch (error) {
    console.error("\n========== MONGODB CONNECTION FAILED ==========");
    console.error("Error name:", error.name);
    const message = String(error.message || "").toLowerCase();
    const category = message.includes("authentication") || message.includes("bad auth")
      ? "Atlas rejected database authentication. Check the database username/password and URL-encode reserved characters."
      : message.includes("whitelist") || message.includes("ip address")
        ? "Atlas Network Access rejected this connection. Add your current public IP to the project IP access list."
        : "MongoDB connection failed. Check the URI, Atlas Network Access, and database-user permissions.";
    console.error("Diagnostic:", category);
    if (error.code) console.error("MongoDB error code:", error.code);
    console.error("================================================\n");

    throw error;
  }

  const server = app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });

  return server;
}

// =========================
// Start Application
// =========================

if (require.main === module) {
  startServer().catch(async (error) => {
    console.error("\n========== SERVER STARTUP FAILED ==========");

    if (
      error.message?.startsWith("Set MONGO_URI") ||
      error.message?.startsWith("Set JWT_SECRET")
    ) {
      console.error(error.message);
    } else {
      console.error(
        "The server could not connect to MongoDB."
      );
      console.error("Please check the MongoDB error shown above.");
    }

    console.error("============================================\n");

    await mongoose.disconnect();

    process.exitCode = 1;
  });
}

// =========================
// Export
// =========================

module.exports = {
  app,
  startServer,
};