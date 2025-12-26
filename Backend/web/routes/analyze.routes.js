// web/routes/analyze.routes.js
const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const AdmZip = require("adm-zip");
const { v4: uuid } = require("uuid");
const { analyzeProject } = require("../services/analysisService");
const { requireAuth } = require("../middleware/requireAuth");
const store = require("../data/storeSupabase");
const settingsStore = require("../data/settingsStoreSupabase");

const MAX_UPLOAD_BYTES = 50 * 1024 * 1024; // 50MB per zip upload
const MAX_ZIP_BYTES = 200 * 1024 * 1024; // hard cap total extracted bytes
const MAX_ZIP_ENTRIES = 5000; // avoid zip bombs with huge file counts
const MAX_UPLOADS_PER_DAY = Number(process.env.QUOTA_MAX_UPLOADS_PER_DAY || 20);
const MAX_ARCHIVES_PER_USER = Number(process.env.QUOTA_MAX_ARCHIVES_PER_USER || 200);

const logError = (message) => process.stderr.write(`${message}\n`);
const logWarn = (message) => process.stderr.write(`${message}\n`);

class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

function ensureUploadRequest(req) {
  if (!req.file) throw new HttpError(400, "projectZip is required");
  if (!req.user?.id) throw new HttpError(401, "Missing authenticated user");

  return {
    zipPath: req.file.path,
    projectName: req.body.projectName || req.file.originalname,
    userId: req.user.id,
    extractDir: path.join(uploadDir, `${req.file.filename}_extracted`),
    analysisId: uuid(),
    originalName: req.file.originalname
  };
}

async function enforceQuota(userId) {
  if (MAX_UPLOADS_PER_DAY > 0) {
    const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
    const dailyCount = await store.countAnalysesSince(userId, since);
    if (dailyCount >= MAX_UPLOADS_PER_DAY) {
      throw new HttpError(429, "Đã vượt giới hạn số lần phân tích trong 24h.");
    }
  }

  if (MAX_ARCHIVES_PER_USER > 0) {
    const totalCount = await store.countAnalysesTotal(userId);
    if (totalCount >= MAX_ARCHIVES_PER_USER) {
      throw new HttpError(429, "Đã vượt giới hạn số báo cáo lưu trữ cho tài khoản.");
    }
  }
}

async function loadUserWeights(userId) {
  try {
    return await settingsStore.getWeights(userId);
  } catch (err) {
    logWarn(`Load user weights failed, using default: ${err?.message || err}`);
    return settingsStore.DEFAULT_WEIGHTS;
  }
}

function extractZip(zipPath, extractDir) {
  const zip = new AdmZip(zipPath);
  const entries = zip.getEntries();

  if (entries.length > MAX_ZIP_ENTRIES) {
    throw new Error(`Zip has too many entries (${entries.length} > ${MAX_ZIP_ENTRIES})`);
  }

  if (!fs.existsSync(extractDir)) fs.mkdirSync(extractDir, { recursive: true });

  let totalBytes = 0;
  const extractRoot = path.resolve(extractDir);

  for (const entry of entries) {
    const rawName = entry.entryName || "";
    const normalized = path.normalize(rawName);

    if (path.isAbsolute(normalized) || normalized.startsWith("..")) {
      throw new Error(`Unsafe path in zip entry: ${rawName}`);
    }

    const targetPath = path.resolve(path.join(extractRoot, normalized));
    if (!targetPath.startsWith(extractRoot)) {
      throw new Error(`Zip entry escapes extraction dir: ${rawName}`);
    }

    if (entry.isDirectory) {
      fs.mkdirSync(targetPath, { recursive: true });
      continue;
    }

    const data = entry.getData();
    totalBytes += data.length;
    if (totalBytes > MAX_ZIP_BYTES) {
      throw new Error(`Zip content exceeds limit (${totalBytes} bytes > ${MAX_ZIP_BYTES})`);
    }

    fs.mkdirSync(path.dirname(targetPath), { recursive: true });
    fs.writeFileSync(targetPath, data);
  }
}

async function persistAnalysis({ userId, analysis }) {
  // store.addAnalysis already persists issues; avoid double-insert
  await store.addAnalysis(userId, analysis);
}

function cleanupUpload({ zipPath, extractDir }) {
  try {
    fs.unlinkSync(zipPath);
    fs.rmSync(extractDir, { recursive: true, force: true });
  } catch (cleanupErr) {
    logWarn(`Cleanup error: ${cleanupErr?.message || cleanupErr}`);
  }
}

function computeZipHash(buffer) {
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

function buildSourceInfo({ zipPath, originalName, analysisId }) {
  const data = fs.readFileSync(zipPath);
  const sha256 = computeZipHash(data);
  const zipSize = data.length;

  const archivedFileName = `${analysisId}.zip`;
  const archivedPath = path.join(archiveDir, archivedFileName);
  fs.copyFileSync(zipPath, archivedPath);

  const storedPath = path.join("uploads", "archive", archivedFileName).replace(/\\/g, "/");

  return {
    sha256,
    zipSize,
    originalName: originalName || archivedFileName,
    archivedPath: storedPath,
    archivedAt: new Date().toISOString()
  };
}

function buildSourceInfoSafe(params) {
  try {
    return buildSourceInfo(params);
  } catch (err) {
    logWarn(`Zip hash/archive failed: ${err?.message || err}`);
    return null;
  }
}

async function runAnalysisPipeline({ userId, projectName, zipPath, extractDir, analysisId, sourceInfo }) {
  const userWeights = await loadUserWeights(userId);
  extractZip(zipPath, extractDir);

  const analysis = await analyzeProject(extractDir, {
    projectName,
    weights: userWeights,
    analysisId,
    sourceInfo
  });

  await persistAnalysis({ userId, analysis });
  return analysis;
}

function handleAnalyzeError(err, res) {
  if (err instanceof HttpError) {
    return res.status(err.status).json({ message: err.message });
  }

  logError(`Analyze failed: ${err?.message || err}`);
  return res.status(500).json({ message: "Analyze failed", error: err.message });
}


const router = express.Router();

// ================== ROUTE TEST: PHÂN TÍCH SAMPLE-PROJECT ==================
router.get("/analyze-sample", async (req, res) => {
  try {
    const samplePath = path.join(__dirname, "..", "..", "sample-project");
    const analysis = await analyzeProject(samplePath, {
      projectName: "sample-project"
    });
    res.json(analysis);
  } catch (err) {
    logError(`Analyze sample failed: ${err?.message || err}`);
    res
      .status(500)
      .json({ message: "Analyze sample failed", error: err.message });
  }
});

// ================== CẤU HÌNH UPLOAD ==================
const uploadDir = path.join(__dirname, "..", "..", "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const archiveDir = path.join(uploadDir, "archive");
if (!fs.existsSync(archiveDir)) {
  fs.mkdirSync(archiveDir, { recursive: true });
}

const upload = multer({
  dest: uploadDir,
  limits: { fileSize: MAX_UPLOAD_BYTES },
  fileFilter: (_req, file, cb) => {
    const allowedMime = ["application/zip", "application/x-zip-compressed", "application/octet-stream"];
    const isZipExt = file.originalname?.toLowerCase().endsWith(".zip");
    if (isZipExt && allowedMime.includes(file.mimetype)) return cb(null, true);
    return cb(new Error("Chỉ chấp nhận file .zip"));
  }
});

// ================== POST /api/analyze (upload .zip) ==================
router.post("/analyze", requireAuth, upload.single("projectZip"), async (req, res) => {
  let zipPath = req.file?.path;
  let extractDir = req.file ? path.join(uploadDir, `${req.file.filename}_extracted`) : null;
  try {
    const ctx = ensureUploadRequest(req);
    zipPath = ctx.zipPath;
    extractDir = ctx.extractDir;

    await enforceQuota(ctx.userId);

    const sourceInfo = buildSourceInfoSafe({
      zipPath: ctx.zipPath,
      originalName: ctx.originalName,
      analysisId: ctx.analysisId
    });

    const analysis = await runAnalysisPipeline({
      userId: ctx.userId,
      projectName: ctx.projectName,
      zipPath: ctx.zipPath,
      extractDir: ctx.extractDir,
      analysisId: ctx.analysisId,
      sourceInfo
    });

    return res.status(201).json(analysis);
  } catch (err) {
    return handleAnalyzeError(err, res);
  } finally {
    if (zipPath && extractDir) cleanupUpload({ zipPath, extractDir });
  }
});

// ================== GET /api/analyses ==================
router.get("/analyses", requireAuth, async (req, res) => {
  try {
    const list = await store.getAllAnalyses(req.user.id);
    res.json(list);
  } catch (err) {
    res.status(500).json({ message: "Failed to load analyses", error: err.message });
  }
});


// ================== GET /api/analyses/:id ==================
router.get("/analyses/:id", requireAuth, async (req, res) => {
  try {
    const item = await store.getAnalysisById(req.user.id, req.params.id);
    if (!item) return res.status(404).json({ message: "Analysis not found" });
    res.json(item);
  } catch (err) {
    res.status(500).json({ message: "Failed to load analysis", error: err.message });
  }
});


// ================== SETTINGS: WEIGHTS ==================
router.get("/settings/weights", requireAuth, async (req, res) => {
  try {
    const weights = await settingsStore.getWeights(req.user.id);
    res.json({ weights });
  } catch (err) {
    res.status(500).json({ message: "Failed to load weights", error: err.message });
  }
});

router.put("/settings/weights", requireAuth, async (req, res) => {
  try {
    const incoming = req.body?.weights || req.body || {};
    const weights = await settingsStore.upsertWeights(req.user.id, incoming);
    res.json({ weights });
  } catch (err) {
    res.status(500).json({ message: "Failed to save weights", error: err.message });
  }
});


module.exports = router;
