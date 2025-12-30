// web/routes/analyze.routes.js
const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const AdmZip = require("adm-zip");
const glob = require("glob");
const { v4: uuid } = require("uuid");
const { analyzeProject } = require("../services/analysisService");
const { requireAuth } = require("../middleware/requireAuth");
const store = require("../data/storeSupabase");
const projectStore = require("../data/projectStoreSupabase");
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
// ================== CẤU HÌNH UPLOAD ==================
const uploadDir = path.join(__dirname, "..", "..", "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const archiveDir = path.join(uploadDir, "archive");
if (!fs.existsSync(archiveDir)) {
  fs.mkdirSync(archiveDir, { recursive: true });
}
function isSameWeights(w1, w2) {
  if (!w1 || !w2) return false;

  return (
    Number(w1.style) === Number(w2.style) &&
    Number(w1.complexity) === Number(w2.complexity) &&
    Number(w1.duplication) === Number(w2.duplication) &&
    Number(w1.comment) === Number(w2.comment)
  );
}

function ensureUploadRequest(req) {
  if (!req.file) throw new HttpError(400, "projectZip is required");
  if (!req.user?.id) throw new HttpError(401, "Missing authenticated user");

  return {
    zipPath: req.file.path,
    projectId: req.body.projectId || null,          
    projectName: req.body.projectName || null,
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
function detectLanguageByFiles(dir) {
  if (glob.sync("**/*.{js,jsx,ts,tsx}", { cwd: dir, nodir: true }).length > 0) {
    return "javascript";
  }
  if (glob.sync("**/*.py", { cwd: dir, nodir: true }).length > 0) {
    return "python";
  }
  if (glob.sync("**/*.java", { cwd: dir, nodir: true }).length > 0) {
    return "java";
  }
  return null;
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

  // Log danh sách file/folder sau khi giải nén để debug
  function walkLog(dir, prefix = "") {
    fs.readdirSync(dir).forEach(file => {
      const filePath = path.join(dir, file);
      if (fs.statSync(filePath).isDirectory()) {
        process.stdout.write(prefix + file + "/\n");
        walkLog(filePath, prefix + "  ");
      } else {
        process.stdout.write(prefix + file + "\n");
      }
    });
  }
  process.stdout.write("[extractZip] File tree after extract:\n");
  walkLog(extractDir);
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
    let weights = undefined;
    if (req.user?.id) {
      try {
        weights = await loadUserWeights(req.user.id);
      } catch (err) {
        logWarn(`Load user weights for sample failed, using defaults: ${err?.message || err}`);
      }
    }

    const analysis = await analyzeProject(samplePath, {
      projectName: "sample-project",
      weights
    });
    res.json(analysis);
  } catch (err) {
    logError(`Analyze sample failed: ${err?.message || err}`);
    res
      .status(500)
      .json({ message: "Analyze sample failed", error: err.message });
  }
});



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


router.post("/analyze", requireAuth, upload.single("projectZip"), async (req, res) => {
  let zipPath = req.file?.path;
  let extractDir = req.file ? path.join(uploadDir, `${req.file.filename}_extracted`) : null;
  
  try {
    // 1️⃣ Chuẩn hóa request
    const ctx = ensureUploadRequest(req);

    console.log("🚨 ANALYZE INPUT", {
    projectId: ctx.projectId,
    projectName: ctx.projectName,
    body: req.body
    });
    
    // 2️⃣ Kiểm tra quota (CHỈ 1 LẦN)
    await enforceQuota(ctx.userId);

    let projectId = ctx.projectId;
    let projectName = ctx.projectName;
    const versionLabel = req.body.versionLabel;

    // 3️⃣ Giải nén ZIP (CHỈ 1 LẦN)
    extractZip(ctx.zipPath, ctx.extractDir);

    // 4️⃣ Phát hiện ngôn ngữ từ FILE THỰC
    const lang = detectLanguageByFiles(ctx.extractDir);
    if (!lang) {
      return res.status(400).json({
        error: "LANGUAGE_DETECT_FAIL",
        message: "Không xác định được ngôn ngữ dự án từ mã nguồn."
      });
    }

    // 5️⃣ Tạo hoặc dùng lại project (FIX TRÙNG PROJECT)
        if (!projectId) {
          if (!ctx.projectName) {
            throw new HttpError(400, "projectId or projectName is required");
          }

          // 🔍 KIỂM TRA PROJECT ĐÃ TỒN TẠI CHƯA
          const { data: existingProject, error: findErr } =
            await require("../db/supabase").supabaseAdmin
              .from("projects")
              .select("id, name, language")
              .eq("user_id", ctx.userId)
              .eq("name", ctx.projectName)
              .eq("is_deleted", false)
              .maybeSingle();

          if (findErr) throw findErr;

          if (existingProject) {
            // ✅ DÙNG LẠI PROJECT CŨ
            projectId = existingProject.id;
            projectName = existingProject.name;
          } else {
            // ✅ TẠO PROJECT MỚI
            const project = await projectStore.createProject(ctx.userId, {
              name: ctx.projectName,
              description: req.body.description || null,
              language: lang
            });

            projectId = project.id;
            projectName = project.name;
          }
        }


    // 6️⃣ Lấy project từ DB
    const { data: project, error: projectError } =
      await require("../db/supabase").supabaseAdmin
        .from("projects")
        .select("*")
        .eq("id", projectId)
        .eq("is_deleted", false)
        .maybeSingle();

      if (projectError || !project) {
      throw new HttpError(400, "Dự án đã bị xóa hoặc không tồn tại ");
        }

    // 7️⃣ Kiểm tra mismatch ngôn ngữ
    if (project.language && project.language !== lang) {
      return res.status(400).json({
        error: "SOURCE_MISMATCH",
        message: "Mã nguồn không phù hợp với dự án đã chọn."
      });
    }

    // 8️⃣ Hash source (src/ nếu có, không thì root)
    function hashDirectory(dir) {
      const hash = crypto.createHash("sha256");
      function walk(p) {
        fs.readdirSync(p).forEach(f => {
          const fp = path.join(p, f);
          if (fs.statSync(fp).isDirectory()) walk(fp);
          else hash.update(fs.readFileSync(fp));
        });
      }
      walk(dir);
      return hash.digest("hex");
    }

    const sourceRoot = fs.existsSync(path.join(ctx.extractDir, "src"))
      ? path.join(ctx.extractDir, "src")
      : ctx.extractDir;

    const sourceHash = hashDirectory(sourceRoot);

    const userWeights = await loadUserWeights(ctx.userId);

    // 9️⃣ Lấy danh sách versions và kiểm tra trùng version
    const { data: versions, error: versionsError } =
      await require("../db/supabase").supabaseAdmin
        .from("versions")
        .select(`
            id,
            label,
            source_hash,
            weights_snapshot,
            projects!inner (
              id,
              name,
              user_id
            )
          `)
         .eq("projects.user_id", ctx.userId)
         .eq("projects.is_deleted", false);
    if (versionsError) throw versionsError;

    const { data: lastVersion } =
      await require("../db/supabase").supabaseAdmin
        .from("versions")
        .select("version_index")
        .eq("project_id", projectId)
        .order("version_index", { ascending: false })
        .limit(1)
        .maybeSingle();

    const versionIndex = (lastVersion?.version_index || 0) + 1;

    if (
        versionLabel &&
        versions?.some(
          v => v.label === versionLabel && v.projects.id === projectId
        )
      ) {
      return res.status(400).json({
        error: "DUPLICATE_VERSION",
        message: "Phiên bản này đã tồn tại trong dự án."
      });
    }

    const duplicate = versions?.find(v =>
        v.source_hash === sourceHash &&
        isSameWeights(v.weights_snapshot, userWeights)
      );

      if (duplicate) {
        return res.status(409).json({
          error: "DUPLICATE_SOURCE_AND_WEIGHTS",
          message: "Dự án này đã được phân tích trước đó với cùng mã nguồn và hệ số đánh giá.",
          existingProject: {
            projectName: duplicate.projects.name,
            versionLabel: duplicate.label
          }
        });
      }

    // 🔟 Tạo version mới (nếu có label)
    const finalVersionLabel = versionLabel || project.name;

      const { data: newVersion, error: vErr } =
        await require("../db/supabase").supabaseAdmin
          .from("versions")
          .insert({
            project_id: projectId,
            label: finalVersionLabel,
            version_index: versionIndex,
            weights_snapshot: userWeights,
            source_hash: sourceHash,
            created_at: new Date().toISOString()
          })
          .select()
          .maybeSingle();

      if (vErr) throw vErr;


    // 11️⃣ Chạy phân tích
    const sourceInfo = buildSourceInfoSafe({
      zipPath: ctx.zipPath,
      originalName: ctx.originalName,
      analysisId: ctx.analysisId
    });


    const analysis = await analyzeProject(ctx.extractDir, {
      projectName: project.name,
      projectId,
      weights: userWeights,
      analysisId: ctx.analysisId,
      sourceInfo
    });

    // 🔴 GÁN ĐẦY ĐỦ TRƯỚC KHI LƯU
    analysis.projectId = projectId;
    analysis.projectName = project.name;

    analysis.versionId = newVersion.id;
    analysis.versionLabel = newVersion.label;
    analysis.versionIndex = newVersion.version_index;

    analysis.displayName =
      `${project.name} – ${newVersion.label} (v${newVersion.version_index})`;

    // ✅ LƯU SAU CÙNG
    await persistAnalysis({ userId: ctx.userId, analysis });


    


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
   res.set("Cache-Control", "no-store, no-cache, must-revalidate");
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
