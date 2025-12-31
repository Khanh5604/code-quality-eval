const { supabaseAdmin } = require("../db/supabase");
const { explainRule, defaultImpact } = require("../utils/explainRule");
const { buildQualityDetail } = require("../utils/qualityExplain");

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
  requireField(analysis.projectId, "analysis.projectId is required");
  requireField(analysis.projectName, "analysis.projectName is required");
  
  assertSummary(analysis.scores?.summary);
  assertIssues(analysis.issues);
}
async function getProjectById(userId, projectId) {
  if (!userId || !projectId) return null;

  const { data, error } = await supabaseAdmin
    .from("projects")
    .select("id, name, created_at")
    .eq("id", projectId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw error;
  return data;}

  
async function addAnalysis(userId, analysis) {
  assertAnalysisInput(userId, analysis);
  // Insert analyses
  const { error: aErr } = await supabaseAdmin.from("analyses").insert([
    {
      id: analysis.id,
      user_id: userId,
      project_id: analysis.projectId,
      project_name: analysis.projectName,
      version_id: analysis.versionId || null,
      version_label: analysis.versionLabel || null,
      version_index: analysis.versionIndex || null,
      display_name: analysis.displayName || analysis.projectName,
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
  await insertIssuesWithRollback(issues, analysis, userId);
  return analysis;
}

async function insertIssuesWithRollback(issues, analysis, userId) {
  try {
    if (issues.length > 0) {
      const { error: iErr } = await supabaseAdmin.from("analysis_issues").insert(issues);
      if (iErr) throw iErr;
    }
  } catch (err) {
    await rollbackAnalysisInsert(analysis, userId, err);
  }
}

async function rollbackAnalysisInsert(analysis, userId, err) {
  process.stderr.write(
    `addAnalysis failed while inserting issues; rolling back analysis: ${analysis.id} user=${userId} err=${err?.message || err}\n`
  );
  await supabaseAdmin.from("analyses").delete().eq("id", analysis.id).eq("user_id", userId);
  throw err;
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
    .select(`
      id,
      project_id,
      project_name,
      version_id,
      version_label,
      version_index,
      display_name,
      overall_score,
      quality_level,
      meta,
      metrics,
      created_at,
      projects!inner (
        id,
        is_deleted
      )
    `)
    .eq("user_id", userId)
    .eq("projects.is_deleted", false)
    .order("created_at", { ascending: false });

  if (error) throw error;

  return (data || []).map((row) => ({
    id: row.id,

    createdAt: row.created_at,
    projectId: row.project_id,
    projectName: row.project_name,
    displayName: row.display_name,
    versionLabel: row.version_label,
    versionIndex: row.version_index,

    scores: {
      project_name: row.project_name,
      summary: {
        overall: row.overall_score,
        quality_level: row.quality_level
      },
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
  const scoringModel = getScoringModel(a);
  const duplicationBlocks = buildDuplicationBlocks(a.jscpd_result);
  const qualityDetail = getQualityDetail(a);
  return buildAnalysisResult(a, issues, scoringModel, duplicationBlocks, qualityDetail);
}

function getScoringModel(a) {
  let scoringModel = a.raw_scores?.scoring_model || null;
  if (!scoringModel && a.raw_scores?.weights) {
    scoringModel = buildScoringModelFromWeights(a.raw_scores.weights);
    if (a.raw_scores) a.raw_scores.scoring_model = scoringModel;
  }
  if (a.raw_scores && !a.raw_scores.scoring_model && scoringModel) {
    a.raw_scores.scoring_model = scoringModel;
  }
  return scoringModel;
}

function getQualityDetail(a) {
  let qualityDetail = a.raw_scores?.qualityDetail;
  if (!qualityDetail && a.raw_scores?.meta) {
    try {
      qualityDetail = buildQualityDetail(a.raw_scores.meta);
    } catch {
      qualityDetail = null;
    }
  }
  return qualityDetail;
}

function buildAnalysisResult(a, issues, scoringModel, duplicationBlocks, qualityDetail) {
  return {
    id: a.id,
    createdAt: a.created_at,
    projectName: a.project_name,
    projectId: a.project_id,
    versionId: a.version_id,
    versionLabel: a.version_label,
    versionIndex: a.version_index,
    displayName: a.display_name,
    scores: a.raw_scores,
    source: a.raw_scores?.source || null,
    clocResult: a.cloc_result || null,
    jscpdResult: a.jscpd_result || null,
    scoring_model: scoringModel,
    scoringModel,
    duplicationBlocks,
    qualityDetail,
    issues: (issues || []).map(mapAnalysisIssue),
    lintIssues: (issues || []).map(mapAnalysisIssue)
  };
}

function buildScoringModelFromWeights(weights) {
  return {
    style: { weight: weights.style || 0, basedOn: "Cấu hình người dùng" },
    complexity: { weight: weights.complexity || 0, basedOn: "Cấu hình người dùng" },
    duplication: { weight: weights.duplication || 0, basedOn: "Cấu hình người dùng" },
    comment: { weight: weights.comment || 0, basedOn: "Cấu hình người dùng" }
  };
}

function buildDuplicationBlocks(jscpdResult) {
  if (!Array.isArray(jscpdResult?.raw?.duplicates)) return [];
  return jscpdResult.raw.duplicates.map((d) => ({
    lines: d.lines || 0,
    tokens: d.tokens || 0,
    files: [d.firstFile, d.secondFile],
    fragment: d.fragment || null,
    suggestion: "Tách đoạn trùng thành hàm/tiện ích dùng chung (DRY)."
  }));
}

function mapAnalysisIssue(it) {
  const detail = explainRule(it.rule);
  return {
    tool: it.tool,
    file: it.file_path,
    line: getIssueLine(it),
    column: getIssueColumn(it),
    severity: getIssueSeverity(it),
    rule: it.rule || "",
    message: it.message || "",
    description: getIssueDescription(detail, it),
    impact: getIssueImpact(detail, it),
    suggestion: getIssueSuggestion(it, detail)
  };
}

function getIssueLine(it) {
  return it.line || 0;
}
function getIssueColumn(it) {
  return it.column_number || 0;
}
function getIssueSeverity(it) {
  return it.severity || "warn";
}
function getIssueDescription(detail, it) {
  return detail.description || it.message || "";
}
function getIssueImpact(detail, it) {
  return detail.impact || defaultImpact(it.rule);
}
function getIssueSuggestion(it, detail) {
  return it.suggestion || detail.suggestion || "";
}

module.exports = {
  getProjectById,
  addAnalysis,
  getAllAnalyses,
  getAnalysisById,
  countAnalysesTotal,
  countAnalysesSince
};
