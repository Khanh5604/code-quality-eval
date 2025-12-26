const { supabaseAdmin } = require("../db/supabaseAdmin");

function detectLanguageFromPath(filePath = "") {
  if (filePath.endsWith(".py")) return "python";
  if (filePath.endsWith(".java")) return "java";
  if (filePath.endsWith(".js") || filePath.endsWith(".jsx") || filePath.endsWith(".ts") || filePath.endsWith(".tsx")) return "javascript";
  return "unknown";
}

async function insertIssues({ analysisId, userId, issues }) {
  if (!userId) throw new Error("insertIssues requires authenticated userId");

  const rows = (issues || []).map((it) => ({
    analysis_id: analysisId,
    user_id: userId,
    language: it.language || detectLanguageFromPath(it.file),
    tool: it.tool || "unknown",
    file_path: it.file || "",
    line: it.line || 0,
    column_number: it.column || 0,
    severity: it.severity || "warn",
    rule: it.rule || "",
    message: it.message || "",
    suggestion: it.suggestion || ""
  }));

  if (rows.length === 0) return { inserted: 0 };

  const { error } = await supabaseAdmin.from("analysis_issues").insert(rows);
  if (error) throw error;

  return { inserted: rows.length };
}

module.exports = { insertIssues };
