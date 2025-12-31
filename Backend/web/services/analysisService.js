// web/services/analysisService.js
/* eslint-disable no-console */
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
    .flatMap(file => file.messages.map(m => mapEslintMessage(file, m)));
}

function mapEslintMessage(file, m) {
  const detail = explainRule(m.ruleId);
  return {
    tool: "eslint",
    file: file.filePath,
    line: m.line || 0,
    column: m.column || 0,
    severity: getEslintSeverity(m),
    rule: m.ruleId || "",
    message: m.message || "",
    description: getEslintDescription(detail, m),
    impact: getEslintImpact(detail, m),
    fix: m.fix || null,
    suggestion: getEslintSuggestion(m, detail)
  };
}

function getEslintSeverity(m) {
  return m.severity === 2 ? "error" : "warn";
}
function getEslintDescription(detail, m) {
  return detail.description || m.message || "";
}
function getEslintImpact(detail, m) {
  return detail.impact || defaultImpact(m.ruleId);
}
function getEslintSuggestion(m, detail) {
  return suggestionForEslint(m) || detail.suggestion || "";
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
  return pmdResult.raw.violations.map(mapPmdViolation);
}

function mapPmdViolation(v) {
  const detail = explainRule(v.rule);
  return {
    tool: "pmd",
    file: v.file || "",
    line: v.beginline || 0,
    column: v.begincolumn || 0,
    severity: getPmdSeverity(v),
    rule: v.rule || "",
    message: v.description || v.rule || "",
    description: getPmdDescription(detail, v),
    impact: getPmdImpact(detail, v),
    fix: null,
    suggestion: getPmdSuggestion(v, detail)
  };
}

function getPmdSeverity(v) {
  return (v.priority && v.priority <= 2) ? "error" : "warn";
}
function getPmdDescription(detail, v) {
  return detail.description || v.description || v.rule || "";
}
function getPmdImpact(detail, v) {
  return detail.impact || defaultImpact(v.rule);
}
function getPmdSuggestion(v, detail) {
  return suggestionForPmd(v.rule) || detail.suggestion || "Xem lại rule và refactor theo khuyến nghị.";
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
  const jsFiles = findFiles(projectPath, "**/*.{js,jsx,ts,tsx}");
  const pyFiles = findFiles(projectPath, "**/*.py");
  const javaFiles = findFiles(projectPath, "**/*.java");
  logFoundLanguages(jsFiles, pyFiles, javaFiles);
  return {
    hasJS: jsFiles.length > 0,
    hasPython: pyFiles.length > 0,
    hasJava: javaFiles.length > 0
  };
}

function findFiles(projectPath, pattern) {
  return glob.sync(pattern, {
    cwd: projectPath,
    nodir: true,
    absolute: true
  });
}

function logFoundLanguages(jsFiles, pyFiles, javaFiles) {
  console.log("[detectLanguages] found:", {
    js: jsFiles,
    py: pyFiles,
    java: javaFiles
  });
}


// Đoạn kiểm tra này phải nằm trong hàm, không để ngoài scope toàn cục



function logWarn(label, error) {

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
  // Run all tool analyses
  const eslintResult = await runEslint(projectPath);
  const clocResult = await runCloc(projectPath);
  const jscpdResult = await runJscpd(projectPath);
  // Detect languages
  const { hasPython, hasJava } = detectLanguages(projectPath);
  // Run language-specific analyses
  const { ruffResult, radonResult } = await runPythonAnalyses(projectPath, hasPython);
  const { pmdResult } = await runJavaAnalyses(projectPath, hasJava);
  // Compute scores and meta
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
  const meta = buildMeta(scores);
  const explanation = explainQuality(meta);
  const qualityDetail = buildQualityDetail(meta);
  // Build scoring model
  buildScoringModel(scores, weights);
  if (sourceInfo) {
    scores.source = sourceInfo;
  }
  // Collect issues and duplication
  const issues = collectAllIssues({ eslintResult, ruffResult, pmdResult });
  const duplicationBlocks = mapDuplicationBlocks(jscpdResult, projectPath);
  // Build analysis object
  const createdAt = new Date().toISOString();
  return {
    id: analysisId,
    projectId: options.projectId,
    createdAt,
    projectName: scores.project_name || scores.projectName || projectName,
    source: sourceInfo || null,
    scoring_model: scores.scoring_model,
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
}

function buildMeta(scores) {
  return {
    lintErrors: Number(scores.meta?.lintErrors) || 0,
    dupPercent: Number(scores.meta?.dupPercent) || 0,
    commentDensity: Number(scores.meta?.commentDensity) || 0,
    complexityAvg: Number(scores.meta?.complexityAvg) || 0
  };
}

function buildScoringModel(scores, weights) {
  const w = scores.weights || {};
  scores.scoring_model = {
    style: { weight: w.style || 0, basedOn: weights ? "Cấu hình người dùng" : "ESLint violations / 1k LOC" },
    complexity: { weight: w.complexity || 0, basedOn: weights ? "Cấu hình người dùng" : "Độ phức tạp chu trình trung bình" },
    duplication: { weight: w.duplication || 0, basedOn: weights ? "Cấu hình người dùng" : "Tỷ lệ trùng lặp JSCPD (%)" },
    comment: { weight: w.comment || 0, basedOn: weights ? "Cấu hình người dùng" : "Mật độ chú thích (%)" }
  };
}

module.exports = { analyzeProject };
