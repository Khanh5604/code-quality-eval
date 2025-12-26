// tools/pmdRunner.js
// Chạy PMD để phân tích Java (style + complexity). Yêu cầu đã cài PMD và có lệnh `pmd` trong PATH.
// Ruleset: dùng quickstart để lấy nhiều vi phạm cơ bản (bao gồm CyclomaticComplexity).
// Nếu muốn custom, chỉnh RULESET dưới đây.

const { exec } = require("child_process");

const RULESET = "category/java/quickstart.xml"; // chứa CyclomaticComplexity

function parseReport(stdout) {
  return JSON.parse(stdout || "{}");
}

function getCcValue(v) {
  const ruleName = (v.rule || "").toLowerCase();
  if (!ruleName.includes("cyclomaticcomplexity")) return null;

  const candidates = [
    typeof v.metric === "number" ? v.metric : null,
    v.additionalProperties ? Number(v.additionalProperties.ccn) : null,
    v.properties ? Number(v.properties.ccn) : null
  ];

  return candidates.find(Number.isFinite) ?? null;
}

function extractCcAvg(violations = []) {
  const ccValues = violations
    .map(getCcValue)
    .filter((val) => Number.isFinite(val));

  if (!ccValues.length) return 0;
  const sum = ccValues.reduce((a, b) => a + b, 0);
  return sum / ccValues.length;
}

function summarizeReport(report) {
  const violations = report.violations || [];
  const errorCount = violations.length;
  const ccAvg = extractCcAvg(violations);
  return { errorCount, ccAvg };
}

function runPmd(projectPath) {
  return new Promise((resolve, reject) => {
    const cmd = `pmd check -d "${projectPath}" -R ${RULESET} -f json`;

    exec(cmd, { maxBuffer: 1024 * 1024 * 10 }, (error, stdout) => {
      if (error && !stdout) {
        return reject(error);
      }

      let report = {};
      try {
        report = parseReport(stdout);
      } catch (e) {
        return reject(e);
      }

      const { errorCount, ccAvg } = summarizeReport(report);

      resolve({
        raw: report,
        errorCount,
        ccAvg
      });
    });
  });
}

module.exports = { runPmd };
