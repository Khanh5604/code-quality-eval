// tools/clocRunner.js
const fs = require("fs");
const path = require("path");
const sloc = require("sloc");
const { glob } = require("glob");

/**
 * Đếm dòng code bằng thư viện sloc + glob
 * Hỗ trợ nhiều ngôn ngữ phổ biến.
 */
async function runCloc(projectPath) {
  // Lấy danh sách file có thể phân tích
  const files = await glob("**/*.{js,jsx,ts,tsx,java,py,cpp,c,h,cs,go,rb,php}", {
    cwd: projectPath,
    nodir: true
  });

  let total = { total: 0, source: 0, comment: 0, single: 0, block: 0 };

  for (const file of files) {
    const fullPath = path.join(projectPath, file);
    const code = fs.readFileSync(fullPath, "utf8");

    const lang = path.extname(fullPath).replace(".", "");
    const stats = sloc(code, lang);

    total.total += stats.total || 0;
    total.source += stats.source || 0;
    total.comment += stats.comment || 0;
    total.single += stats.single || 0;
    total.block += stats.block || 0;
  }

  return {
    raw: total,
    code: total.source,
    comment: total.comment,
    blank: total.total - total.source - total.comment
  };
}

module.exports = { runCloc };
