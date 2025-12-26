// tools/ruffRunner.js
// Chạy Ruff để lint Python, yêu cầu đã cài python và package ruff (pip install ruff)
const { exec } = require("child_process");

function runRuff(projectPath) {
  return new Promise((resolve, reject) => {
    const cmd = `python -m ruff check "${projectPath}" --output-format json`;

    exec(cmd, { maxBuffer: 1024 * 1024 * 10 }, (error, stdout, stderr) => {
      if (error && !stdout) {
        return reject(error);
      }

      let report = [];
      try {
        report = JSON.parse(stdout || "[]");
      } catch (e) {
        return reject(e);
      }

      const errorCount = Array.isArray(report) ? report.length : 0;

      resolve({
        raw: report,
        errorCount
      });
    });
  });
}

module.exports = { runRuff };
