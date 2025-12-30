// tools/eslintRunner.js
const path = require("path");
const glob = require("glob");
const { ESLint } = require("eslint");

async function runEslint(projectPath) {
  const hasJs = glob.sync("**/*.{js,jsx}", {
    cwd: projectPath,
    nodir: true
  }).length > 0;

  if (!hasJs) {
    return { raw: [], errorCount: 0, warningCount: 0 };
  }

  const eslint = new ESLint({
    cwd: projectPath,

    // 🔒 GHI ĐÈ BẰNG FLAT CONFIG CỦA HỆ THỐNG
    overrideConfigFile: path.resolve(
      __dirname,
      "configs",
      "eslint.base.config.js"
    )
  });

  const results = await eslint.lintFiles([
    "**/*.{js,jsx}"
  ]);

  let errorCount = 0;
  let warningCount = 0;

  for (const r of results) {
    errorCount += r.errorCount || 0;
    warningCount += r.warningCount || 0;
  }

  return {
    raw: results,
    errorCount,
    warningCount
  };
}

module.exports = { runEslint };
