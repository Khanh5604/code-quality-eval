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


function mapEslintIssues(eslintResult) {
  if (!Array.isArray(eslintResult?.raw)) return [];
  return eslintResult.raw
    .filter(file => Array.isArray(file.messages))
    .flatMap(file =>
      file.messages.map(m => ({
        tool: "eslint",
        file: file.filePath,
        line: m.line || 0,
        column: m.column || 0,
        severity: m.severity === 2 ? "error" : "warn",
        rule: m.ruleId || "",
        message: m.message || "",
        fix: m.fix || null,
        suggestion: suggestionForEslint(m) || ""
      }))
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
    fix: null,
    suggestion: suggestionForRuff({ rule: r.code, message: r.message }) || ""
  }));
}

function mapPmdIssues(pmdResult) {
  if (!pmdResult || !Array.isArray(pmdResult.raw?.violations)) return [];
  return pmdResult.raw.violations.map(v => ({
    tool: "pmd",
    file: v.file || "",
    line: v.beginline || 0,
    column: v.begincolumn || 0,
    severity: (v.priority && v.priority <= 2) ? "error" : "warn",
    rule: v.rule || "",
    message: v.description || v.rule || "",
    fix: null,
    suggestion: suggestionForPmd(v.rule) || "Xem lại rule và refactor theo khuyến nghị."
  }));
}

function collectAllIssues({ eslintResult, ruffResult, pmdResult }) {
  return [
    ...mapEslintIssues(eslintResult),
    ...mapRuffIssues(ruffResult),
    ...mapPmdIssues(pmdResult)
  ];
}

function detectLanguages(projectPath) {
  const hasPython = glob.sync("**/*.py", { cwd: projectPath, nodir: true }).length > 0;
  const hasJava = glob.sync("**/*.java", { cwd: projectPath, nodir: true }).length > 0;
  return { hasPython, hasJava };
}

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
  return options.projectName || path.basename(projectPath);
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
  const analysisId = options.analysisId || uuid();
  const sourceInfo = options.sourceInfo || null;
  const eslintResult = await runEslint(projectPath);
  const clocResult = await runCloc(projectPath);
  const jscpdResult = await runJscpd(projectPath);

  const { hasPython, hasJava } = detectLanguages(projectPath);
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

  if (sourceInfo) {
    // Đính kèm thông tin nguồn để hỗ trợ tái lập kết quả
    scores.source = sourceInfo;
  }

  const issues = collectAllIssues({ eslintResult, ruffResult, pmdResult });

  const createdAt = new Date().toISOString();

  const analysis = {
    id: analysisId,
    createdAt,
    projectName: scores.project_name,
    source: sourceInfo || null,
    scores,
    eslintResult,
    clocResult,
    jscpdResult,
    ruffResult,
    radonResult,
    pmdResult,
    issues
  };

  return analysis;
}

module.exports = { analyzeProject };
