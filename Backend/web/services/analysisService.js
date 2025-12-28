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

function buildScoringModelSnapshot(weights) {
  if (!weights) return null;

  return {
    style: {
      weight: weights.style,
      basedOn: "Cấu hình người dùng"
    },
    complexity: {
      weight: weights.complexity,
      basedOn: "Cấu hình người dùng"
    },
    duplication: {
      weight: weights.duplication,
      basedOn: "Cấu hình người dùng"
    },
    comment: {
      weight: weights.comment,
      basedOn: "Cấu hình người dùng"
    }
  };
}

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
    const first = d.firstFile || "";
    const second = d.secondFile || "";
    const rel = (p) => projectPath ? path.relative(projectPath, p || "") || p : p;
    return {
      lines: d.lines || 0,
      tokens: d.tokens || 0,
      files: [rel(first), rel(second)],
      fragment: d.fragment || null,
      suggestion: "Tách đoạn trùng thành hàm/tiện ích dùng chung (DRY)."
    };
  });
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
  const weights = options.weights; // weights từ user settings (có thể là default nếu user chưa cấu hình)
  


  const scores = computeScores({
    eslint: eslintResult.raw,
    cloc: clocResult.raw,
    jscpd: jscpdResult.raw,
    projectName,
    lintErrorsOverride: lintOverride,
    complexityAvgOverride: complexityOverride,
    weights
  });

  // Tạo scoring_model từ scores.weights (weights đã được normalize và dùng để tính điểm)
  // basedOn = "Cấu hình người dùng" vì weights luôn đến từ user settings (có thể là default)
  const w = scores.weights || {};
  scores.scoring_model = {
    style: { 
      weight: w.style || 0, 
      basedOn: "Cấu hình người dùng" // Luôn là "Cấu hình người dùng" vì weights đến từ settings
    },
    complexity: { 
      weight: w.complexity || 0, 
      basedOn: "Cấu hình người dùng" 
    },
    duplication: { 
      weight: w.duplication || 0, 
      basedOn: "Cấu hình người dùng" 
    },
    comment: { 
      weight: w.comment || 0, 
      basedOn: "Cấu hình người dùng" 
    }
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
    createdAt,
    projectName: scores.project_name,
    source: sourceInfo || null,
    scoring_model: scores.scoring_model, // Đã được tạo ở trên
    scores,
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
