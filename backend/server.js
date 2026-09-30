const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const helmet = require("helmet");
const crypto = require("crypto");

require("dotenv").config();

const authRoutes = require("./routes/auth");
const transactionRoutes = require("./routes/transactions");
const analyticsRoutes = require("./routes/analytics");
const budgetRoutes = require("./routes/budgets");

const { verifyRequestOrigin } = require("./middleware/auth");
const {
  errorHandler,
  notFound,
} = require("./middleware/errorHandler");

const app = express();

// =========================
// Configuration
// =========================

const PORT = process.env.PORT || 5000;

const FRONTEND_URL =
  process.env.FRONTEND_URL || "http://localhost:5173";

// =========================
// JWT Secret
// =========================

// Render may not provide JWT_SECRET.
// Generate one automatically if it is missing or too short.

if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  process.env.JWT_SECRET = crypto.randomBytes(32).toString("hex");

  console.log("JWT_SECRET generated automatically.");
}

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
  const mongoUri = process.env.MONGO_URI;

  // MongoDB URI is still required.
  if (!mongoUri) {
    throw new Error(
      "Set MONGO_URI in backend/.env before starting the server."
    );
  }

  console.log("Connecting to MongoDB...");

  try {
    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 10000,
    });

    console.log("Connected to MongoDB");
  } catch (error) {
    console.error(
      "\n========== MONGODB CONNECTION FAILED =========="
    );

    console.error("Error name:", error.name);

    const message = String(error.message || "").toLowerCase();

    let category;

    if (
      message.includes("authentication") ||
      message.includes("bad auth")
    ) {
      category =
        "Atlas rejected database authentication. Check the database username/password and MongoDB URI.";
    } else if (
      message.includes("whitelist") ||
      message.includes("ip address")
    ) {
      category =
        "Atlas Network Access rejected this connection. Check your Atlas IP access list.";
    } else {
      category =
        "MongoDB connection failed. Check the URI, Atlas Network Access, and database-user permissions.";
    }

    console.error("Diagnostic:", category);

    if (error.code) {
      console.error(
        "MongoDB error code:",
        error.code
      );
    }

    console.error(
      "================================================\n"
    );

    throw error;
  }

  // =========================
  // Start Express Server
  // =========================

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
    console.error(
      "\n========== SERVER STARTUP FAILED =========="
    );

    if (
      error.message?.startsWith("Set MONGO_URI")
    ) {
      console.error(error.message);
    } else {
      console.error(
        "The server could not start."
      );

      console.error(
        "Please check the MongoDB connection and environment variables."
      );

      console.error(
        "Error:",
        error.message
      );
    }

    console.error(
      "============================================\n"
    );

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