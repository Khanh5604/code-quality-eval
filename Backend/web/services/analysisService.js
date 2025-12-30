// web/services/analysisService.js
const path = require("path");
const { v4: uuid } = require("uuid");
const glob = require("glob");
const { runEslint } = require("../../tools/eslintRunner");
const { runCloc } = require("../../tools/clocRunner");
const { runJscpd } = require("../../tools/jscpdRunner");
const { runRuff } = require("../../tools/ruffRunner");
const { runRadon } = require("../../tools/radonRunner");
const { runPmd } = require("../../tools/pmdRunner");
const { computeScores } = require("../../tools/scorer");
const { suggestionForEslint, suggestionForRuff, suggestionForPmd } = require("../../tools/suggestionMapper");
const { explainRule, defaultImpact } = require("../utils/explainRule");
const {
  explainQuality,
  buildQualityDetail
} = require("../utils/qualityExplain");



function mapEslintIssues(eslintResult) {
  if (!Array.isArray(eslintResult?.raw)) return [];
  return eslintResult.raw
    .filter(file => Array.isArray(file.messages))
    .flatMap(file =>
      file.messages.map(m => {
        const detail = explainRule(m.ruleId);
        const suggestion = suggestionForEslint(m) || detail.suggestion || "";
        return {
          tool: "eslint",
          file: file.filePath,
          line: m.line || 0,
          column: m.column || 0,
          severity: m.severity === 2 ? "error" : "warn",
          rule: m.ruleId || "",
          message: m.message || "",
          description: detail.description || m.message || "",
          impact: detail.impact || defaultImpact(m.ruleId),
          fix: m.fix || null,
          suggestion
        };
      })
    );
}

function mapRuffIssues(ruffResult) {
  if (!ruffResult || !Array.isArray(ruffResult.raw)) return [];
  return ruffResult.raw.map(r => ({
    tool: "ruff",
    file: r.filename,
    line: r.location?.row || 0,
    column: r.location?.column || 0,
    severity: "error",
    rule: r.code || "",
    message: r.message || "",
    description: explainRule(r.code).description,
    impact: defaultImpact(r.code),
    fix: null,
    suggestion: suggestionForRuff({ rule: r.code, message: r.message }) || explainRule(r.code).suggestion || ""
  }));
}

function mapPmdIssues(pmdResult) {
  if (!pmdResult || !Array.isArray(pmdResult.raw?.violations)) return [];
  return pmdResult.raw.violations.map(v => {
    const detail = explainRule(v.rule);
    const suggestion = suggestionForPmd(v.rule) || detail.suggestion || "Xem lại rule và refactor theo khuyến nghị.";
    return {
      tool: "pmd",
      file: v.file || "",
      line: v.beginline || 0,
      column: v.begincolumn || 0,
      severity: (v.priority && v.priority <= 2) ? "error" : "warn",
      rule: v.rule || "",
      message: v.description || v.rule || "",
      description: detail.description || v.description || v.rule || "",
      impact: detail.impact || defaultImpact(v.rule),
      fix: null,
      suggestion
    };
  });
}

function collectAllIssues({ eslintResult, ruffResult, pmdResult }) {
  return [
    ...mapEslintIssues(eslintResult),
    ...mapRuffIssues(ruffResult),
    ...mapPmdIssues(pmdResult)
  ];
}

function mapDuplicationBlocks(jscpdResult, projectPath) {
  const duplicates = jscpdResult?.raw?.duplicates;
  if (!Array.isArray(duplicates)) return [];

  return duplicates.map((d) => {
    const firstPath =
      typeof d.firstFile === "string"
        ? d.firstFile
        : d.firstFile?.name || "";

    const secondPath =
      typeof d.secondFile === "string"
        ? d.secondFile
        : d.secondFile?.name || "";

    const rel = (p) =>
      projectPath && typeof p === "string"
        ? path.relative(projectPath, p)
        : p;

    return {
      lines: d.lines || 0,
      tokens: d.tokens || 0,
      files: [rel(firstPath), rel(secondPath)],
      fragment: d.fragment || null,
      suggestion: "Tách đoạn trùng thành hàm/tiện ích dùng chung (DRY)."
    };
  });
}

// function detectLanguages(projectPath) {
//   const hasJS =
//     glob.sync("**/*.js", { cwd: projectPath, nodir: true }).length > 0 ||
//     glob.sync("**/*.jsx", { cwd: projectPath, nodir: true }).length > 0 ||
//     glob.sync("**/*.ts", { cwd: projectPath, nodir: true }).length > 0 ||
//     glob.sync("**/*.tsx", { cwd: projectPath, nodir: true }).length > 0;

//   const hasPython =
//     glob.sync("**/*.py", { cwd: projectPath, nodir: true }).length > 0;

//   const hasJava =
//     glob.sync("**/*.java", { cwd: projectPath, nodir: true }).length > 0;

//   return { hasJS, hasPython, hasJava };
  
// }
function detectLanguages(projectPath) {
  console.log("[detectLanguages] projectPath =", projectPath);

  const jsFiles = glob.sync("**/*.{js,jsx,ts,tsx}", {
    cwd: projectPath,
    nodir: true,
    absolute: true
  });

  const pyFiles = glob.sync("**/*.py", {
    cwd: projectPath,
    nodir: true,
    absolute: true
  });

  const javaFiles = glob.sync("**/*.java", {
    cwd: projectPath,
    nodir: true,
    absolute: true
  });

  console.log("[detectLanguages] found:", {
    js: jsFiles,
    py: pyFiles,
    java: javaFiles
  });

  return {
    hasJS: jsFiles.length > 0,
    hasPython: pyFiles.length > 0,
    hasJava: javaFiles.length > 0
  };
}


// Đoạn kiểm tra này phải nằm trong hàm, không để ngoài scope toàn cục



function logWarn(label, error) {
  // eslint-disable-next-line no-console
  console.warn(`${label} failed:`, error?.message || error);
}

function computeLintOverride(ruffResult, pmdResult) {
  const ruffErrors = Number.isFinite(ruffResult?.errorCount) ? ruffResult.errorCount : 0;
  const pmdErrors = Number.isFinite(pmdResult?.errorCount) ? pmdResult.errorCount : 0;
  const total = ruffErrors + pmdErrors;
  return total || undefined;
}

function computeComplexityOverride(radonResult, pmdResult) {
  if (Number.isFinite(radonResult?.ccAvg)) return radonResult.ccAvg;
  if (Number.isFinite(pmdResult?.ccAvg)) return pmdResult.ccAvg;
  return undefined;
}

function resolveProjectName(projectPath, options) {
  return options.projectName;
}

async function runPythonAnalyses(projectPath, hasPython) {
  if (!hasPython) return { ruffResult: null, radonResult: null };

  let ruffResult = null;
  let radonResult = null;

  try {
    ruffResult = await runRuff(projectPath);
  } catch (e) {
    logWarn("Ruff", e);
  }

  try {
    radonResult = await runRadon(projectPath);
  } catch (e) {
    logWarn("Radon", e);
  }

  return { ruffResult, radonResult };
}

async function runJavaAnalyses(projectPath, hasJava) {
  if (!hasJava) return { pmdResult: null };

  try {
    const pmdResult = await runPmd(projectPath);
    return { pmdResult };
  } catch (e) {
    logWarn("PMD", e);
    return { pmdResult: null };
  }
}


/**
 * Chạy toàn bộ pipeline phân tích trên projectPath
 * và lưu kết quả vào "DB" file.
 */
async function analyzeProject(projectPath, options = {}) {
  if (!options.projectId) {
    throw new Error("analyzeProject requires projectId");
    }
  const analysisId = options.analysisId || uuid();
  const sourceInfo = options.sourceInfo || null;
  const eslintResult = await runEslint(projectPath);
  const clocResult = await runCloc(projectPath);
  const jscpdResult = await runJscpd(projectPath);


  // Debug: log projectPath và kết quả detectLanguages
  console.log("[analyzeProject] projectPath=", projectPath);
  const { hasJS, hasPython, hasJava } = detectLanguages(projectPath);
  console.log("[analyzeProject] detectLanguages:", { hasJS, hasPython, hasJava });
  if (!hasJS && !hasPython && !hasJava) {
    console.warn("Không xác định được ngôn ngữ dự án từ mã nguồn. Chỉ chạy phân tích cơ bản.");
  }
  const { ruffResult, radonResult } = await runPythonAnalyses(projectPath, hasPython);
  const { pmdResult } = await runJavaAnalyses(projectPath, hasJava);

  const lintOverride = computeLintOverride(ruffResult, pmdResult);
  const complexityOverride = computeComplexityOverride(radonResult, pmdResult);
  const projectName = resolveProjectName(projectPath, options);
  const weights = options.weights;
  


  const scores = computeScores({
    eslint: eslintResult.raw,
    cloc: clocResult.raw,
    jscpd: jscpdResult.raw,
    projectName,
    lintErrorsOverride: lintOverride,
    complexityAvgOverride: complexityOverride,
    weights
  });

 const meta = {
  lintErrors: Number(scores.meta?.lintErrors) || 0,
  dupPercent: Number(scores.meta?.dupPercent) || 0,
  commentDensity: Number(scores.meta?.commentDensity) || 0,
  complexityAvg: Number(scores.meta?.complexityAvg) || 0
};

const explanation = explainQuality(meta);
const qualityDetail = buildQualityDetail(meta);



  // CÁCH ĐƠN GIẢN NHẤT: Tạo scoring_model trực tiếp từ scores.weights (đã normalize)
  // Không cần kiểm tra gì cả, chỉ cần tạo và gán
  const w = scores.weights || {};
  scores.scoring_model = {
    style: { weight: w.style || 0, basedOn: weights ? "Cấu hình người dùng" : "ESLint violations / 1k LOC" },
    complexity: { weight: w.complexity || 0, basedOn: weights ? "Cấu hình người dùng" : "Độ phức tạp chu trình trung bình" },
    duplication: { weight: w.duplication || 0, basedOn: weights ? "Cấu hình người dùng" : "Tỷ lệ trùng lặp JSCPD (%)" },
    comment: { weight: w.comment || 0, basedOn: weights ? "Cấu hình người dùng" : "Mật độ chú thích (%)" }
  };


  if (sourceInfo) {
    // Đính kèm thông tin nguồn để hỗ trợ tái lập kết quả
    scores.source = sourceInfo;
  }

  const issues = collectAllIssues({ eslintResult, ruffResult, pmdResult });
  const duplicationBlocks = mapDuplicationBlocks(jscpdResult, projectPath);

  const createdAt = new Date().toISOString();

  const analysis = {
    id: analysisId,
    projectId: options.projectId,
    createdAt,
    projectName: scores.project_name || scores.projectName || projectName,
    source: sourceInfo || null,
    scoring_model: scores.scoring_model, // Đã được tạo ở trên
    scores,
    explanation,
    qualityDetail,
    eslintResult,
    clocResult,
    jscpdResult,
    ruffResult,
    radonResult,
    pmdResult,
    issues,
    lintIssues: issues,
    duplicationBlocks
  };

  return analysis;
}

module.exports = { analyzeProject };
