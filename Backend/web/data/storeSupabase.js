const { supabaseAdmin } = require("../db/supabase");

function requireField(condition, message) {
  if (!condition && condition !== 0) throw new Error(message);
}

function assertSummary(summary) {
  requireField(summary && summary.overall !== undefined && summary.overall !== null, "analysis.scores.summary.overall is required");
  requireField(
    summary && summary.quality_level !== undefined && summary.quality_level !== null,
    "analysis.scores.summary.quality_level is required"
  );
}

function assertIssues(issues) {
  (issues || []).forEach((it, idx) => {
    requireField(it && it.file, `issue[${idx}].file is required`);
    requireField(it && it.message, `issue[${idx}].message is required`);
  });
}

function assertAnalysisInput(userId, analysis) {
  requireField(userId, "addAnalysis requires authenticated userId");
  requireField(analysis && typeof analysis === "object", "analysis payload is required");
  requireField(analysis.id, "analysis.id is required");
  requireField(analysis.projectName, "analysis.projectName is required");

  assertSummary(analysis.scores?.summary);
  assertIssues(analysis.issues);
}

async function addAnalysis(userId, analysis) {
  assertAnalysisInput(userId, analysis);

  // Insert analyses
  const { error: aErr } = await supabaseAdmin.from("analyses").insert([
    {
      id: analysis.id,
      user_id: userId,
      project_name: analysis.projectName,
      overall_score: analysis.scores.summary.overall,
      quality_level: analysis.scores.summary.quality_level,
      meta: analysis.scores.meta,
      metrics: analysis.scores.metrics,
      raw_scores: analysis.scores,
      cloc_result: analysis.clocResult || null,
      jscpd_result: analysis.jscpdResult || null
    }
  ]);
  if (aErr) throw aErr;

  // Insert issues
  const issues = (analysis.issues || []).map((it) => ({
    analysis_id: analysis.id,
    user_id: userId,
    tool: it.tool || "unknown",
    file_path: it.file,
    line: it.line || 0,
    column_number: it.column || 0,
    severity: it.severity || "warn",
    rule: it.rule || "",
    message: it.message || "",
    suggestion: it.suggestion || ""
  }));

  try {
    if (issues.length > 0) {
      const { error: iErr } = await supabaseAdmin.from("analysis_issues").insert(issues);
      if (iErr) throw iErr;
    }
  } catch (err) {
    // Best-effort rollback to avoid orphan analyses when issue insert fails
    process.stderr.write(
      `addAnalysis failed while inserting issues; rolling back analysis: ${analysis.id} user=${userId} err=${err?.message || err}\n`
    );
    await supabaseAdmin.from("analyses").delete().eq("id", analysis.id).eq("user_id", userId);
    throw err;
  }

  return analysis;
}

async function countAnalysesTotal(userId) {
  if (!userId) throw new Error("countAnalysesTotal requires authenticated userId");
  const { count, error } = await supabaseAdmin
    .from("analyses")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId);

  if (error) throw error;
  return count || 0;
}

async function countAnalysesSince(userId, sinceIso) {
  if (!userId) throw new Error("countAnalysesSince requires authenticated userId");
  const { count, error } = await supabaseAdmin
    .from("analyses")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .gte("created_at", sinceIso);

  if (error) throw error;
  return count || 0;
}

async function getAllAnalyses(userId) {
  if (!userId) throw new Error("getAllAnalyses requires authenticated userId");
  const { data, error } = await supabaseAdmin
    .from("analyses")
    .select("id, project_name, overall_score, quality_level, meta, metrics, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw error;

  // Trả về gần giống format cũ để FE đỡ sửa
  return (data || []).map((row) => ({
    id: row.id,
    createdAt: row.created_at,
    projectName: row.project_name,
    scores: {
      project_name: row.project_name,
      summary: { overall: row.overall_score, quality_level: row.quality_level },
      meta: row.meta,
      metrics: row.metrics,
      created_at: row.created_at
    }
  }));
}

async function getAnalysisById(userId, id) {
  if (!userId) throw new Error("getAnalysisById requires authenticated userId");
  const { data: a, error: aErr } = await supabaseAdmin
    .from("analyses")
    .select("*")
    .eq("id", id)
    .eq("user_id", userId)
    .maybeSingle();

  if (aErr) throw aErr;
  if (!a) return null;

  const { data: issues, error: iErr } = await supabaseAdmin
    .from("analysis_issues")
    .select("*")
    .eq("analysis_id", id)
    .order("id", { ascending: true });

  if (iErr) throw iErr;

  // FE của bạn cần analysis.scores + issues
  return {
    id: a.id,
    createdAt: a.created_at,
    projectName: a.project_name,
    scores: a.raw_scores,
    source: a.raw_scores?.source || null,
    clocResult: a.cloc_result || null,
    jscpdResult: a.jscpd_result || null,
    issues: (issues || []).map((it) => ({
      tool: it.tool,
      file: it.file_path,
      line: it.line || 0,
      column: it.column_number || 0,
      severity: it.severity || "warn",
      rule: it.rule || "",
      message: it.message || "",
      suggestion: it.suggestion || ""
    }))
  };
}

module.exports = {
  addAnalysis,
  getAllAnalyses,
  getAnalysisById,
  countAnalysesTotal,
  countAnalysesSince
};
