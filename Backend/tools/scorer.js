// tools/scorer.js
const clamp = (x, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, x));

const toNumber = (value, fallback = 0) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
};

const DEFAULT_WEIGHTS = {
  style: 0.3,
  complexity: 0.25,
  duplication: 0.2,
  comment: 0.25
};

function sanitizeWeights(input) {
  const merged = { ...DEFAULT_WEIGHTS, ...(input || {}) };
  const sanitized = {};
  let total = 0;
  let hasZero = false;

  for (const key of Object.keys(DEFAULT_WEIGHTS)) {
    const raw = Number(merged[key]);
    const safe = Number.isFinite(raw) && raw >= 0 ? raw : DEFAULT_WEIGHTS[key];
    sanitized[key] = safe;
    total += safe;
    if (safe === 0) hasZero = true;
  }

  return { sanitized, total, hasZero };
}

/**
 * Chuẩn hóa trọng số về tổng 1.0, fallback về mặc định nếu tổng <= 0.
 * @param {Object} input - Trọng số người dùng cung cấp (style, complexity, duplication, comment).
 * @returns {Object} Trọng số đã chuẩn hóa với tổng bằng 1.0.
 */
function resolveWeights(input) {
  const { sanitized, total, hasZero } = sanitizeWeights(input);

  if (total <= 0) {
    // Dùng trọng số mặc định khi tổng trọng số người dùng cung cấp <= 0
    if (process?.stderr?.write) process.stderr.write("resolveWeights: tổng trọng số <= 0, dùng mặc định\n");
    return { ...DEFAULT_WEIGHTS };
  }

  if (hasZero) {
    // eslint-disable-next-line no-console
    console.warn("resolveWeights: có trọng số bằng 0, tiêu chí đó sẽ không được tính");
  }

  const normalized = {};
  for (const key of Object.keys(sanitized)) {
    normalized[key] = sanitized[key] / total;
  }

  return normalized;
}

function extractCloc(cloc) {
  if (!cloc) return { codeLines: 0, commentLines: 0 };
  if (cloc.SUM) {
    return {
      codeLines: toNumber(cloc.SUM.code, 0),
      commentLines: toNumber(cloc.SUM.comment, 0)
    };
  }
  return {
    codeLines: toNumber(cloc.source, 0),
    commentLines: toNumber(cloc.comment, 0)
  };
}

function computeLint(eslint, lintErrorsOverride) {
  if (lintErrorsOverride !== undefined) {
    return { lintErrors: toNumber(lintErrorsOverride, 0), complexityValues: [] };
  }
  if (!Array.isArray(eslint)) return { lintErrors: 0, complexityValues: [] };

  let lintErrors = 0;
  const complexityValues = [];

  for (const file of eslint) {
    if (!Array.isArray(file.messages)) continue;
    lintErrors += file.messages.filter(m => m.severity === 2).length;

    const compMsgs = file.messages.filter(m => m.ruleId === "complexity");
    for (const m of compMsgs) {
      const match = /complexity of (\d+)/i.exec(m.message || "");
      if (match) complexityValues.push(parseInt(match[1], 10));
    }
  }
  return { lintErrors, complexityValues };
}

function computeComplexity(complexityValues, complexityAvgOverride) {
  if (complexityAvgOverride !== undefined) return toNumber(complexityAvgOverride, 0);
  if (!complexityValues.length) return 0;
  const sum = complexityValues.reduce((a, b) => a + b, 0);
  return sum / complexityValues.length;
}

function extractDupPercent(jscpd) {
  const raw = jscpd?.statistics?.total?.percentage;
  if (raw === undefined || raw === null) return 0;
  const num = Number(raw);
  if (!Number.isFinite(num)) {
    // eslint-disable-next-line no-console
    console.warn("computeScores: tỷ lệ trùng lặp không hợp lệ, mặc định 0");
    return 0;
  }
  return num;
}

function scoreStyle(kLOC, lintErrors) {
  if (kLOC <= 0) return 100;
  const errorsPerKloc = lintErrors / kLOC;
  return clamp(100 - errorsPerKloc * 5);
}

function scoreComplexity(c) {
  if (c <= 0) return 100;
  if (c <= 5) return 100;
  if (c <= 10) return 70;
  if (c <= 20) return 40;
  return 10;
}

function scoreDuplication(p) {
  // Hạ ngưỡng JSCPD: phạt sớm hơn khi tỷ lệ trùng lặp tăng
  if (p <= 3) return 100;
  if (p <= 8) return 80;
  if (p <= 15) return 50;
  return 20;
}

function scoreComment(p) {
  if (p >= 10 && p <= 25) return 100;
  if (p <= 0.001) return 20;
  if (p > 40) return 60;
  if (p < 10) return clamp(20 + (p / 10) * 80);
  if (p < 40) return clamp(100 - ((p - 25) / 15) * 40);
  return 60;
}

/**
 * eslint: mảng report ESLint (format JSON).
 * cloc:  object report CLOC.
 * jscpd: object report JSCPD.
 */
/**
 * Tính điểm chất lượng dựa trên báo cáo ESLint, CLOC, JSCPD.
 * @param {Object} params.eslint - Mảng report ESLint JSON.
 * @param {Object} params.cloc - Report CLOC (SUM hoặc source/comment).
 * @param {Object} params.jscpd - Report JSCPD (statistics.total.percentage).
 * @param {string} [params.projectName="unknown"] - Tên dự án phục vụ hiển thị.
 * @param {number} [params.lintErrorsOverride] - Ghi đè số lỗi lint.
 * @param {number} [params.complexityAvgOverride] - Ghi đè độ phức tạp trung bình.
 * @param {Object} [params.weights] - Trọng số các tiêu chí (style/complexity/duplication/comment).
 * @param {Date|string} [params.now] - Thời điểm dùng cho created_at (ổn định khi test).
 * @returns {Object} Điểm tổng hợp gồm summary/meta/metrics/weights/created_at.
 */
function computeScores({
  eslint,
  cloc,
  jscpd,
  projectName = "unknown",
  lintErrorsOverride,
  complexityAvgOverride,
  weights,
  now
}) {
  const timestamp = now instanceof Date ? now : now ? new Date(now) : new Date();
  const { codeLines, commentLines } = extractCloc(cloc);
  const kLOC = codeLines / 1000;
  const commentDensity = codeLines > 0 ? (commentLines / codeLines) * 100 : 0;

  const { lintErrors, complexityValues } = computeLint(eslint, lintErrorsOverride);
  const complexityAvg = computeComplexity(complexityValues, complexityAvgOverride);
  const dupPercent = extractDupPercent(jscpd);

  const metrics = {
    style: Math.round(scoreStyle(kLOC, lintErrors)),
    complexity: Math.round(scoreComplexity(complexityAvg)),
    duplication: Math.round(scoreDuplication(dupPercent)),
    comment: Math.round(scoreComment(commentDensity))
  };

  const effectiveWeights = resolveWeights(weights);

  const overall = Math.round(
    Object.keys(metrics).reduce(
      (acc, key) => acc + (metrics[key] || 0) * (effectiveWeights[key] || 0),
      0
    )
  );

  return {
    project_name: projectName,
    summary: {
      overall,
      quality_level:
        overall >= 85 ? "A" : overall >= 70 ? "B" : overall >= 50 ? "C" : "D"
    },
    meta: {
      codeLines,
      commentLines,
      kLOC: Number(kLOC.toFixed(2)),
      lintErrors,
      complexityAvg: Number(complexityAvg.toFixed(2)),
      dupPercent: Number(dupPercent.toFixed(2)),
      commentDensity: Number(commentDensity.toFixed(2))
    },
    metrics,
    weights: effectiveWeights,
    created_at: timestamp.toISOString()
  };
}

module.exports = { computeScores, DEFAULT_WEIGHTS, resolveWeights };
