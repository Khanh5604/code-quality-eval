require("dotenv").config();

const express = require("express");
const cors = require("cors");
const path = require("path");
const analyzeRoutes = require("./routes/analyze.routes");
const { scheduleArchiveCleanup } = require("./utils/archiveCleanup");

const app = express();
const PORT = process.env.PORT || 3000;
const API_PREFIX = process.env.API_PREFIX || "/api";
const ARCHIVE_DIR = path.join(__dirname, "..", "uploads", "archive");
const ARCHIVE_TTL_HOURS = Number(process.env.ARCHIVE_TTL_HOURS || 24 * 7);
const ARCHIVE_CLEAN_INTERVAL_HOURS = Number(process.env.ARCHIVE_CLEAN_INTERVAL_HOURS || 6);
const ARCHIVE_WARN_MB = Number(process.env.ARCHIVE_WARN_MB || 512); // cảnh báo khi archive > ngưỡng

// Hỗ trợ nhiều origin, phân tách bởi dấu phẩy để tiện dùng cho localhost và Vercel.
const ALLOWED_ORIGINS = (process.env.CORS_ORIGIN || "http://localhost:5173").split(",")
  .map((s) => s.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true); // allow server-to-server
      if (ALLOWED_ORIGINS.includes(origin)) return callback(null, true);
      return callback(new Error(`CORS blocked for origin ${origin}`));
    },
    credentials: true
  })
);

app.options("*", cors());

app.use(express.json());

app.use("/reports", express.static(path.join(__dirname, "..", "reports")));
app.use(API_PREFIX, analyzeRoutes);

app.get("/", (req, res) => {
  res.json({ message: "Code Quality Evaluation API is running" });
});

app.listen(PORT, () => {
  process.stdout.write(`Server listening on http://localhost:${PORT}\n`);
  scheduleArchiveCleanup({
    archiveDir: ARCHIVE_DIR,
    ttlHours: ARCHIVE_TTL_HOURS,
    intervalHours: ARCHIVE_CLEAN_INTERVAL_HOURS,
    warnThresholdBytes: ARCHIVE_WARN_MB * 1024 * 1024
  });
});
