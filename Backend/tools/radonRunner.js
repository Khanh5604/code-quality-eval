// tools/radonRunner.js
// Chạy Radon để lấy cyclomatic complexity cho Python (python -m radon cc -j)
const { exec } = require("child_process");

function runRadon(projectPath) {
  return new Promise((resolve, reject) => {
    const cmd = `python -m radon cc "${projectPath}" -j`;

    exec(cmd, { maxBuffer: 1024 * 1024 * 10 }, (error, stdout) => {
      if (error && !stdout) {
        return reject(error);
      }

      let report = {};
      try {
        report = JSON.parse(stdout || "{}");
      } catch (e) {
        return reject(e);
      }

      let sum = 0;
      let count = 0;
      for (const file of Object.keys(report)) {
        for (const item of report[file] || []) {
          if (typeof item.complexity === "number") {
            sum += item.complexity;
            count += 1;
          }
        }
      }

      const ccAvg = count > 0 ? sum / count : 0;

      resolve({
        raw: report,
        ccAvg,
        functions: count
      });
    });
  });
}

module.exports = { runRadon };
