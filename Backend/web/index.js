require("dotenv").config();

const express = require("express");
const cors = require("cors");
const path = require("path");
const analyzeRoutes = require("./routes/analyze.routes");
const { scheduleArchiveCleanup } = require("./utils/archiveCleanup");

const app = express();
const PORT = process.env.PORT || 3000;
const API_PREFIX = (process.env.API_PREFIX || "/api").replace(/\/+$/, "");
const ARCHIVE_DIR = path.join(__dirname, "..", "uploads", "archive");
const ARCHIVE_TTL_HOURS = Number(process.env.ARCHIVE_TTL_HOURS || 24 * 7);
const ARCHIVE_CLEAN_INTERVAL_HOURS = Number(process.env.ARCHIVE_CLEAN_INTERVAL_HOURS || 6);
const ARCHIVE_WARN_MB = Number(process.env.ARCHIVE_WARN_MB || 512); // cảnh báo khi archive > ngưỡng
const projectRoutes = require("./routes/project.routes");
// Hỗ trợ nhiều origin, phân tách bởi dấu phẩy để tiện dùng cho localhost và Vercel.
const ALLOWED_ORIGINS = (process.env.CORS_ORIGIN || "http://localhost:5173").split(",")
  .map((s) => s.trim())
  .filter(Boolean);

// Log allowed origins for debugging (only in development)
if (process.env.NODE_ENV !== "production") {
  process.stdout.write(`CORS allowed origins: ${ALLOWED_ORIGINS.join(", ")}\n`);
}

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, Postman, curl)
      if (!origin) {
        return callback(null, true);
      }
      
      // Check if origin is in allowed list
      if (ALLOWED_ORIGINS.includes(origin)) {
        return callback(null, true);
      }
      
      // In development, log blocked origins for debugging
      if (process.env.NODE_ENV !== "production") {
        process.stderr.write(`CORS blocked origin: ${origin} (allowed: ${ALLOWED_ORIGINS.join(", ")})\n`);
      }
      
      // Return error to block the request
      return callback(new Error(`CORS blocked for origin ${origin}`));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "X-Requested-With",
      "Cache-Control",
      "Pragma"
    ],
    
    exposedHeaders: ["Content-Range", "X-Content-Range"]
  })
);

// Handle preflight requests
app.use(`${API_PREFIX}/projects`, projectRoutes);
process.stdout.write(">>> MOUNTED /api/projects <<<\n");
app.options("*", cors());

app.use(express.json());

app.use("/reports", express.static(path.join(__dirname, "..", "reports")));
app.use(API_PREFIX, analyzeRoutes);

app.get("/", (req, res) => {
  res.json({ message: "Code Quality Evaluation API is running" });
});

// 404 handler (must be after all routes)
app.use((req, res) => {
  res.status(404).json({ error: "Not found", path: req.path });
});

// Error handling middleware (must be last, with 4 parameters)
app.use((err, req, res) => {
  // CORS errors
  if (err.message && err.message.includes("CORS")) {
    if (process.env.NODE_ENV !== "production") {
      process.stderr.write(`CORS Error: ${err.message}\n`);
    }
    return res.status(403).json({ 
      error: "CORS policy violation", 
      message: process.env.NODE_ENV === "production" ? "Forbidden" : err.message 
    });
  }
  
  // Other errors
  process.stderr.write(`Error: ${err.message || err}\n`);
  if (err.stack && process.env.NODE_ENV !== "production") {
    process.stderr.write(err.stack + "\n");
  }
  res.status(err.status || 500).json({ 
    error: "Internal server error",
    message: process.env.NODE_ENV === "production" ? "An error occurred" : err.message 
  });
});

// Start server with error handling
const server = app.listen(PORT, () => {
  process.stdout.write(`Server listening on port ${PORT}\n`);
  process.stdout.write(`API prefix: ${API_PREFIX}\n`);
  process.stdout.write(`CORS origins: ${ALLOWED_ORIGINS.join(", ")}\n`);
  
  // Check required environment variables
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    process.stderr.write("WARNING: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not set. Database operations may fail.\n");
  }
  
  scheduleArchiveCleanup({
    archiveDir: ARCHIVE_DIR,
    ttlHours: ARCHIVE_TTL_HOURS,
    intervalHours: ARCHIVE_CLEAN_INTERVAL_HOURS,
    warnThresholdBytes: ARCHIVE_WARN_MB * 1024 * 1024
  });
});

// Handle server errors
server.on("error", (err) => {
  process.stderr.write(`Server error: ${err.message}\n`);
  if (err.code === "EADDRINUSE") {
    process.stderr.write(`Port ${PORT} is already in use. Please use a different port.\n`);
  }
  process.exit(1);
});

// Graceful shutdown
process.on("SIGTERM", () => {
  process.stdout.write("SIGTERM received, shutting down gracefully...\n");
  server.close(() => {
    process.stdout.write("Server closed\n");
    process.exit(0);
  });
});

process.on("SIGINT", () => {
  process.stdout.write("\nSIGINT received, shutting down gracefully...\n");
  server.close(() => {
    process.stdout.write("Server closed\n");
    process.exit(0);
  });
});
