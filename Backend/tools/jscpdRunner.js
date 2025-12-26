// tools/jscpdRunner.js
const { exec } = require("child_process");
const fs = require("fs");
const path = require("path");

/**
 * Chạy JSCPD, trả về:
 * {
 *   raw: {...},
 *   duplicatedLines: number,
 *   duplicatedPercent: number
 * }
 */
function readReportFromFile(reportPath) {
  if (!fs.existsSync(reportPath)) return null;
  try {
    const content = fs.readFileSync(reportPath, "utf8");
    if (content?.trim()) return JSON.parse(content);
  } catch {
    return null;
  }
  return null;
}

function parseJsonSafe(input) {
  try {
    if (!input) return null;
    return JSON.parse(input);
  } catch {
    return null;
  }
}

function pickReport({ reportPath, stdout }) {
  const fromFile = readReportFromFile(reportPath);
  if (fromFile) return fromFile;

  const fromStdout = parseJsonSafe(stdout);
  if (fromStdout) return fromStdout;

  return {};
}

function extractStats(report) {
  const statistics = report.statistics || {};
  const total = statistics.total || {};

  return {
    raw: report,
    duplicatedLines: total.duplicatedLines || 0,
    duplicatedPercent: total.percentage || 0
  };
}

function runJscpd(projectPath) {
  return new Promise((resolve, reject) => {
    const projectPathForCli = projectPath.replace(/\\/g, "/");
    const outputDir = projectPathForCli;
    const reportPath = path.join(projectPath, "jscpd-report.json");
    const cmd = `npx jscpd "${projectPathForCli}" --reporters json --output "${outputDir}" --silent --min-lines 2 --min-tokens 20 --threshold 0`;

    exec(cmd, { maxBuffer: 1024 * 1024 * 5 }, (error, stdout) => {
      const report = pickReport({ reportPath, stdout });

      if (!Object.keys(report).length && error) {
        return reject(error);
      }

      return resolve(extractStats(report));
    });
  });
}

module.exports = { runJscpd };
