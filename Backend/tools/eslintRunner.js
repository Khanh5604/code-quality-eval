// tools/eslintRunner.js
const { exec } = require("child_process");
const glob = require("glob");

/**
 * Chạy ESLint trên projectPath, trả về:
 * {
 *   raw: [...],
 *   errorCount: number,
 *   warningCount: number
 * }
 */
function runEslint(projectPath) {
  const hasJs = glob.sync("**/*.{js,jsx}", { cwd: projectPath, nodir: true }).length > 0;
  if (!hasJs) {
    return Promise.resolve({ raw: [], errorCount: 0, warningCount: 0 });
  }

  return new Promise((resolve, reject) => {
    // --fix-dry-run để nhận gợi ý fix trong output JSON (không ghi file)
    const cmd = `npx eslint "${projectPath}" -f json --no-warn-ignored --fix-dry-run`;

    exec(cmd, { maxBuffer: 1024 * 1024 * 10 }, (error, stdout) => {
      if (error && !stdout) {
        return reject(error);
      }

      let report = [];
      try {
        report = JSON.parse(stdout || "[]");
      } catch (e) {
        return reject(e);
      }

      let errorCount = 0;
      let warningCount = 0;

      for (const file of report) {
        errorCount += file.errorCount || 0;
        warningCount += file.warningCount || 0;
      }

      resolve({
        raw: report,
        errorCount,
        warningCount
      });
    });
  });
}

module.exports = { runEslint };
