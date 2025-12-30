import React, { useEffect, useMemo, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { api } from "../api/client";
import ScoreSummary from "../components/ScoreSummary";
import MetricsChart from "../components/MetricsChart";


/* ================= LABELS ================= */
const weightLabels = {
  style: "Phong cách",
  complexity: "Phức tạp",
  duplication: "Trùng lặp",
  comment: "Chú thích"
};

const gradeThresholds = [
  { label: "Hạng A", range: "≥ 85 điểm", color: "#16a34a" },
  { label: "Hạng B", range: "70–84 điểm", color: "#f59e0b" },
  { label: "Hạng C", range: "< 70 điểm", color: "#dc2626" }
];

const defaultWeights = {
  style: { weight: 0.3, basedOn: "Lint" },
  complexity: { weight: 0.25, basedOn: "Cyclomatic complexity" },
  duplication: { weight: 0.2, basedOn: "JSCPD" },
  comment: { weight: 0.25, basedOn: "Comment density" }
};

function mapSettingsWeightsToUI(settingsWeights) {
  if (!settingsWeights) return null;

  return {
    style: { weight: settingsWeights.style, basedOn: "Cấu hình người dùng" },
    complexity: { weight: settingsWeights.complexity, basedOn: "Cấu hình người dùng" },
    duplication: { weight: settingsWeights.duplication, basedOn: "Cấu hình người dùng" },
    comment: { weight: settingsWeights.comment, basedOn: "Cấu hình người dùng" }
  };
}
function mapSnapshotWeightsToUI(snapshot) {
  if (!snapshot) {
    if (process.env.NODE_ENV === 'development') {
      console.log('mapSnapshotWeightsToUI: snapshot is null/undefined');
    }
    return null;
  }

  // Kiểm tra xem snapshot có đúng structure không
  if (typeof snapshot !== 'object') {
    if (process.env.NODE_ENV === 'development') {
      console.log('mapSnapshotWeightsToUI: snapshot is not an object', snapshot);
    }
    return null;
  }

  const result = {
    style: {
      weight: snapshot.style?.weight ?? 0,
      basedOn: snapshot.style?.basedOn || "Cấu hình tại thời điểm phân tích"
    },
    complexity: {
      weight: snapshot.complexity?.weight ?? 0,
      basedOn: snapshot.complexity?.basedOn || "Cấu hình tại thời điểm phân tích"
    },
    duplication: {
      weight: snapshot.duplication?.weight ?? 0,
      basedOn: snapshot.duplication?.basedOn || "Cấu hình tại thời điểm phân tích"
    },
    comment: {
      weight: snapshot.comment?.weight ?? 0,
      basedOn: snapshot.comment?.basedOn || "Cấu hình tại thời điểm phân tích"
    }
  };

  if (process.env.NODE_ENV === 'development') {
    console.log('mapSnapshotWeightsToUI: mapped result', result);
  }

  return result;
}




function formatPath(input) {
  if (!input) return "(không rõ)";
  if (typeof input === "string") {
    const parts = input.split(/[/\\]/);
    return parts.slice(-2).join("/") || input;
  }
  if (input.path) return formatPath(input.path);
  return String(input);
}

function formatFileList(files) {
  if (!Array.isArray(files)) return formatPath(files);
  return files.map((f) => formatPath(f)).join(" ↔ ");
}

/* ================= HELPERS ================= */
function qualityDescription(level) {
  if (level === "A") return "Chất lượng tốt, duy trì tiêu chuẩn hiện tại và theo dõi lỗi mới.";
  if (level === "B") return "Khá ổn, cần ưu tiên xử lý lỗi lint và giảm trùng lặp để lên hạng A.";
  if (level === "C") return "Cần cải thiện rõ rệt: xử lý lỗi lint, giảm phức tạp và tăng chú thích.";
  return "Cần kiểm tra và cải thiện các tiêu chí chất lượng.";
}

function normalizeDupBlocks(blocks, rawDup) {
  const list = Array.isArray(blocks) ? blocks : rawDup || [];
  return list.map((b) => ({
    lines: b.lines || 0,
    files: b.files || [b.firstFile, b.secondFile].filter(Boolean),
    suggestion: b.suggestion || "Tách đoạn trùng thành hàm/tiện ích dùng chung."
  }));
}

function computeRecommendations({ scores, lintIssues, dupItems }) {
  const recs = [];
  const metrics = scores?.metrics || {};

  if ((metrics.style || 0) < 80) {
    const top = lintIssues[0];
    recs.push({
      title: "Ưu tiên sửa lỗi lint",
      detail: top
        ? `Sửa rule ${top.rule} tại ${formatPath(top.file)}:${top.line} để cải thiện điểm Phong cách.`
        : "Giảm số lỗi lint để tăng điểm Phong cách và độ ổn định."
    });
  }

  if ((metrics.duplication || 0) < 85 || dupItems.length > 0) {
    const first = dupItems[0];
    recs.push({
      title: "Giảm trùng lặp mã",
      detail: first
        ? `Gộp đoạn ${first.lines} dòng giữa ${formatFileList(first.files)} thành hàm dùng chung.`
        : "Kiểm tra và refactor các đoạn mã trùng lặp."
    });
  }

  if ((metrics.complexity || 0) < 80) {
    recs.push({
      title: "Hạ độ phức tạp",
      detail: "Tách hàm lớn thành hàm nhỏ, giảm nhánh if/switch để tăng khả năng test."
    });
  }

  if ((metrics.comment || 0) < 70) {
    recs.push({
      title: "Bổ sung chú thích",
      detail: "Tăng mật độ comment hợp lý (10–25%) cho các hàm phức tạp và API công khai."
    });
  }

  if (!recs.length) {
    recs.push({
      title: "Tiếp tục duy trì",
      detail: "Chất lượng đang tốt, hãy duy trì pipeline kiểm soát lint và test."
    });
  }

  return recs.slice(0, 4);
}

function gradeMeta(level) {
  if (level === "A") return { label: "Hạng A", color: "#16a34a", bg: "#dcfce7" };
  if (level === "B") return { label: "Hạng B", color: "#f59e0b", bg: "#fef3c7" };
  if (level === "C") return { label: "Hạng C", color: "#dc2626", bg: "#fee2e2" };
  return { label: "Chưa xếp hạng", color: "#475569", bg: "#e2e8f0" };
}

/* ================= PAGE ================= */
export default function AnalysisReportPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentWeights, setCurrentWeights] = useState(null);
  const isHistoryView = true;

    useEffect(() => {
    async function fetchCurrentWeights() {
        try {
        const { data } = await api.get("/api/settings/weights", {
            headers: { "Cache-Control": "no-cache" }
        });
        if (data?.weights) {
            setCurrentWeights(mapSettingsWeightsToUI(data.weights));
        }
        } catch (err) {
        console.warn("Failed to load current weights", err);
        }
    }

    fetchCurrentWeights();
    }, []);

  useEffect(() => {
    api
      .get(`/api/analyses/${id}`)
      .then((res) => setAnalysis(res.data))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, [id]);

    const recommendations = useMemo(() => {
    if (!analysis || !analysis.scores) return [];
    return computeRecommendations({
        scores: analysis.scores,
        lintIssues: analysis.lintIssues || analysis.issues || [],
        dupItems: normalizeDupBlocks(
        analysis.duplicationBlocks,
        analysis?.jscpdResult?.raw?.duplicates
        )
    });
    }, [analysis]);
    
    if (loading) return <div style={ui.loading}>Đang tải báo cáo…</div>;
    if (!analysis || !analysis.scores)
    return <div style={ui.error}>Không tìm thấy kết quả phân tích.</div>;



  const scores = analysis.scores;
  const meta = scores.meta || {};
  
  // Tìm scoring_model từ nhiều nơi có thể
  let scoringModelRaw =
    analysis.scoring_model ||   
    scores.scoring_model ||
    analysis.scoringModel ||
    meta.scoring_model ||
    null;
  
  // Fallback: Nếu không có scoring_model, tạo từ weights trong scores
  if (!scoringModelRaw && scores.weights) {
    scoringModelRaw = {
      style: {
        weight: scores.weights.style || 0,
        basedOn: "Cấu hình người dùng"
      },
      complexity: {
        weight: scores.weights.complexity || 0,
        basedOn: "Cấu hình người dùng"
      },
      duplication: {
        weight: scores.weights.duplication || 0,
        basedOn: "Cấu hình người dùng"
      },
      comment: {
        weight: scores.weights.comment || 0,
        basedOn: "Cấu hình người dùng"
      }
    };
  }
  
  // Debug: log để kiểm tra
  if (process.env.NODE_ENV === 'development') {
    console.log('AnalysisReportPage - scoringModelRaw:', scoringModelRaw);
    console.log('AnalysisReportPage - analysis.scoring_model:', analysis.scoring_model);
    console.log('AnalysisReportPage - scores.scoring_model:', scores?.scoring_model);
    console.log('AnalysisReportPage - scores.weights:', scores?.weights);
  }
  
  const scoringModel = mapSnapshotWeightsToUI(scoringModelRaw);
  
  // Debug: log sau khi map
  if (process.env.NODE_ENV === 'development') {
    console.log('AnalysisReportPage - scoringModel (after map):', scoringModel);
  }

  const source = analysis.source || scores.source;
  const lintIssues = analysis.lintIssues || analysis.issues || [];
  const dupItems = normalizeDupBlocks(
    analysis.duplicationBlocks,
    analysis?.jscpdResult?.raw?.duplicates
  );

const displayWeights = isHistoryView
  ? scoringModel && Object.keys(scoringModel).length > 0
    ? scoringModel
    : defaultWeights
  : currentWeights && Object.keys(currentWeights).length > 0
  ? currentWeights
  : scoringModel && Object.keys(scoringModel).length > 0
  ? scoringModel
  : defaultWeights;

  const createdAt = scores.created_at ? new Date(scores.created_at) : null;
  const projectName =
    analysis.displayName ||
    analysis.projectName ||
    
  "Dự án";  const grade = gradeMeta(scores.summary?.quality_level);



  const metricCards = [
    { label: "Số dòng code", value: meta.codeLines ?? "-", note: "Quy mô dự án", tone: "blue" },
    { label: "Lỗi lint", value: meta.lintErrors ?? "-", note: "Ảnh hưởng điểm Phong cách", tone: "rose" },
    { label: "Tỷ lệ trùng lặp", value: `${meta.dupPercent ?? "-"}%`, note: "Ảnh hưởng điểm Trùng lặp", tone: "amber" },
    { label: "Mật độ chú thích", value: `${meta.commentDensity ?? "-"}%`, note: "Ảnh hưởng khả năng bảo trì", tone: "emerald" },
    { label: "Độ phức tạp TB", value: meta.complexityAvg ?? "-", note: "Ảnh hưởng khả năng test", tone: "indigo" }
  ];

  return (
    <div style={ui.page}>
      {/* Header */}
      <section style={ui.hero}>
        <div>
          <p style={ui.eyebrow}>Báo cáo phân tích</p>
          {analysis.versionIndex && (
            <p style={{ margin: 0, fontSize: 14, color: "#cbd5e1" }}>
              Phiên bản v{analysis.versionIndex} · {analysis.versionLabel}
            </p>
          )}
          <div style={ui.heroMeta}>
            <span style={ui.chipDark}>Mã: {analysis.id}</span>
            <span style={ui.chipLight}>
              Thời gian: {createdAt ? createdAt.toLocaleString() : "N/A"}
            </span>
            <span style={{ ...ui.gradeBadge, color: grade.color, background: grade.bg }}>
              {grade.label}
            </span>
          </div>
        </div>
        <div style={ui.heroActions}>
          <button
            style={{ ...ui.button, ...ui.buttonGhost }}
            onClick={() => navigate(-1)}
          >
            ← Quay lại
          </button>
          <Link
            to={`/report/${analysis.id}`}
            style={{ ...ui.button, ...ui.buttonPrimary }}
          >
            Tải / Xem báo cáo
          </Link>
        </div>
      </section>

      {/* Overview */}
      <section style={ui.grid2}>
        <div style={ui.cardLarge}>
          <div style={ui.cardHeader}>
            <div>
              <p style={ui.cardEyebrow}>Tổng quan chất lượng</p>
              <h3 style={ui.cardTitle}>Điểm tổng & xếp hạng</h3>
            </div>
            <span style={ui.badgeSoft}>Tự động tính toán</span>
          </div>

          

          <div style={ui.gradeInfoBox}>
            <p style={ui.smallTitle}>Ngưỡng xếp hạng</p>
            <ul style={ui.gradeRuleList}>
              {gradeThresholds.map((g) => (
                <li key={g.label} style={ui.gradeRuleItem}>
                  <span style={{ ...ui.gradeDot, background: g.color }} />
                  <span style={ui.gradeRuleText}>
                    <strong>{g.label}</strong>: {g.range}
                  </span>
                </li>
              ))}
            </ul>
          </div>
          

          <ScoreSummary summary={scores.summary} />
          <p style={ui.desc}>
            {qualityDescription(scores.summary.quality_level)}
          </p>

          {/* Chi tiết chất lượng */}
          <div style={ui.explainBox}>
            {analysis.qualityDetail && Array.isArray(analysis.qualityDetail.items) ? (
              <>
                <ul>
                  {analysis.qualityDetail.items.map((t, i) => (
                    <li key={i}>{t}</li>
                  ))}
                </ul>
                <p style={{ fontWeight: 700 }}>
                  → {analysis.qualityDetail.conclusion}
                </p>
              </>
            ) : (
              <p style={{ color: '#b91c1c' }}>Không có dữ liệu chi tiết chất lượng.</p>
            )}
          </div>

          {/* WHY */}
          <ul style={ui.whyList}>
            {(analysis.explanation || []).map((item, i) => (
              <li key={i}>{item.text}</li>
            ))}
          </ul>

        </div>

        {/* Radar */}
        <div style={ui.cardLarge}>
          <div style={ui.cardHeader}>
            <div>
              <p style={ui.cardEyebrow}>Thành phần</p>
              <h3 style={ui.cardTitle}>Radar điểm chi tiết</h3>
            </div>
            <span style={ui.badgeOutline}>0–100</span>
          </div>
          <MetricsChart metrics={scores.metrics} />
          <div style={ui.radarExplain}>
            <p>
              <strong>Phong cách:</strong>{" "}
              {scores.metrics.style < 80 ? "Thấp – nhiều lỗi lint." : "Tốt."}
            </p>
            <p>
              <strong>Trùng lặp:</strong>{" "}
              {scores.metrics.duplication < 85 ? "Cao – cần refactor." : "Thấp."}
            </p>
            <p>
              <strong>Chú thích:</strong>{" "}
              {scores.metrics.comment < 70 ? "Thiếu – cần bổ sung." : "Đạt."}
            </p>
          </div>
        </div>
      </section>
      {displayWeights && (
            <div style={ui.weightBox}>
              <p style={ui.smallTitle}>
                {isHistoryView
                    ? "Hệ số đánh giá (tại thời điểm phân tích)"
                    : "Hệ số đánh giá (cấu hình hiện tại)"}
                </p>
              <ul style={ui.weightList}>
                {Object.keys(displayWeights).map((key) => {
                  const weight = displayWeights[key].weight || 0;
                  return (
                    <li key={key} style={ui.weightItem}>
                      <span style={ui.weightLabel}>{weightLabels[key] || key}</span>
                      <span style={ui.weightValue}>
                        {(weight * 100).toFixed(0)}% <span style={ui.weightHint}>({weight.toFixed(2)})</span>
                        {displayWeights[key].basedOn && (
                          <span style={ui.weightHint}>· {displayWeights[key].basedOn}</span>
                        )}
                      </span>
                    </li>
                  );
                })}
              </ul>
              <p style={ui.weightTotal}>
                Tổng trọng số: {(Object.values(displayWeights).reduce((s, v) => s + (v.weight || 0), 0)).toFixed(2)}
                {" "}
                (hệ thống chuẩn hóa về 1.0 trước khi tính điểm)
              </p>
            </div>
          )}

      {/* Metrics */}
      <section style={ui.cardLarge}>
        <div style={ui.cardHeader}>
          <div>
            <p style={ui.cardEyebrow}>Chỉ số tổng hợp</p>
            <h3 style={ui.cardTitle}>Sức khỏe mã nguồn</h3>
          </div>
        </div>
        <div style={ui.metricsGrid}>
          {metricCards.map((item) => (
            <div key={item.label} style={ui.metricCard}>
              <div style={{ ...ui.metricIcon, ...toneMap[item.tone] }}>●</div>
              <div>
                <p style={ui.metricLabel}>{item.label}</p>
                <p style={ui.metricValue}>{item.value}</p>
                <p style={ui.metricNote}>{item.note}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Issues */}
      <section style={ui.cardLarge}>
        <div style={ui.cardHeader}>
          <div>
            <p style={ui.cardEyebrow}>Lỗi & Cảnh báo</p>
            <h3 style={ui.cardTitle}>Quan trọng nhất</h3>
          </div>
        </div>

        <div style={ui.priorityBox}>
          <p style={ui.priorityTitle}>Nên xử lý theo thứ tự:</p>
          <ol style={ui.priorityList}>
            {meta.lintErrors > 0 && <li>Sửa lỗi lint để tăng điểm Phong cách.</li>}
            {meta.dupPercent > 10 && <li>Giảm trùng lặp xuống dưới 10%.</li>}
            {meta.complexityAvg > 10 && <li>Chia nhỏ các hàm phức tạp.</li>}

            {meta.lintErrors === 0 && meta.dupPercent <= 10 && meta.complexityAvg <= 10 && (
              <li>Chưa phát hiện vấn đề nghiêm trọng cần xử lý.</li>
            )}
          </ol>
        </div>

        {lintIssues.length === 0 ? (
          <p style={ui.success}>Không phát hiện lỗi lint.</p>
        ) : (
          <div style={ui.issueList}>
            {lintIssues.slice(0, 15).map((it, idx) => (
              <details key={`${it.file}-${idx}`} style={ui.issueItem} open={idx < 3}>
                <summary style={ui.issueSummary}>
                  <span
                    style={{
                      ...ui.severityPill,
                      ...(it.severity === "error" ? ui.pillError : ui.pillWarn)
                    }}
                  >
                    {it.severity === "error" ? "Lỗi" : "Cảnh báo"}
                  </span>
                  <strong>
                    {it.description || "Vi phạm quy tắc"} ({it.rule})
                  </strong>
                  <span style={ui.issuePath}>
                    {formatPath(it.file)}:{it.line}
                  </span>
                </summary>
                <div style={ui.issueText}>
                  <strong>Mô tả:</strong> {it.description || it.message}
                </div>
                <div style={ui.issueText}>
                  <strong>Ảnh hưởng:</strong>{" "}
                  {it.impact || "Ảnh hưởng chất lượng và khả năng bảo trì."}
                </div>
                <div style={ui.issueText}>
                  <strong>Cách khắc phục:</strong>{" "}
                  {it.suggestion || "Xem lại rule và chỉnh sửa."}
                </div>
              </details>
            ))}
          </div>
        )}

        {dupItems.length > 0 && (
          <div style={{ marginTop: 16 }}>
            <p style={ui.smallTitle}>Code trùng lặp</p>
            <div style={ui.issueList}>
              {dupItems.slice(0, 5).map((b, i) => (
                <div key={i} style={ui.issueItem}>
                  <div style={ui.issueTitle}>
                    <span style={{ ...ui.severityPill, ...ui.pillWarn }}>
                      Trùng lặp
                    </span>
                    <strong>{b.lines} dòng</strong>
                  </div>
                  <div style={ui.issueText}>
                    <strong>File:</strong> {formatFileList(b.files)}
                  </div>
                  <div style={ui.issueText}>
                    <strong>Gợi ý:</strong> {b.suggestion}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* Recommendations */}
      <section style={ui.cardLarge}>
        <div style={ui.cardHeader}>
          <div>
            <p style={ui.cardEyebrow}>Khuyến nghị cải thiện</p>
            <h3 style={ui.cardTitle}>Lộ trình nâng điểm</h3>
          </div>
        </div>
        {recommendations.length === 0 ? (
          <p style={ui.muted}>Hiện tại chưa cần hành động cải thiện.</p>
        ) : (
          <div style={ui.recGrid}>
            {recommendations.map((r, i) => (
              <div key={i} style={ui.recItem}>
                <p style={ui.recTitle}>{r.title}</p>
                <p style={ui.recText}>{r.detail}</p>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Footer */}
      <section style={ui.cardLarge}>
        <div style={ui.cardHeader}>
          <div>
            <p style={ui.cardEyebrow}>Ghi chú hệ thống</p>
            <h3 style={ui.cardTitle}>Công cụ & giới hạn</h3>
          </div>
        </div>
        <p style={ui.muted}>
          ESLint, Ruff, PMD, Radon, JSCPD, CLOC được sử dụng để phân tích. Báo cáo
          dựa trên mã nguồn tại thời điểm tải lên (SHA-256:{" "}
          {source?.sha256 || "N/A"}).
        </p>
      </section>
    </div>
  );
}

/* ================= STYLES ================= */
const ui = {
  page: { display: "flex", flexDirection: "column", gap: 18, padding: 12 },
  loading: { padding: 20, color: "#475569" },
  error: { padding: 20, color: "#b91c1c", fontWeight: 700 },

  hero: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderRadius: 16,
    background: "linear-gradient(135deg, #0f172a, #1e293b)",
    color: "white",
    gap: 12,
    flexWrap: "wrap"
  },
  eyebrow: { textTransform: "uppercase", letterSpacing: 1, fontSize: 12, color: "#cbd5e1", margin: 0 },
  title: { margin: "6px 0 10px", fontSize: 28, fontWeight: 800 },
  heroMeta: { display: "flex", gap: 10, flexWrap: "wrap" },
  chipDark: { padding: "6px 10px", borderRadius: 999, background: "rgba(255,255,255,0.12)", color: "white", fontSize: 13 },
  chipLight: { padding: "6px 10px", borderRadius: 999, background: "rgba(255,255,255,0.08)", color: "#e2e8f0", fontSize: 13 },
  gradeBadge: { padding: "6px 10px", borderRadius: 999, fontWeight: 800, fontSize: 13 },

  heroActions: { display: "flex", gap: 10, flexWrap: "wrap" },
  button: { padding: "10px 14px", borderRadius: 10, fontWeight: 700, fontSize: 14, cursor: "pointer", textDecoration: "none" },
  buttonGhost: { background: "white", color: "#0f172a", border: "1px solid #e2e8f0" },
  buttonPrimary: { background: "linear-gradient(90deg,#2563eb,#7c3aed)", color: "white", border: "none" },

  grid2: { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(320px,1fr))", gap: 16 },
  cardLarge: { background: "white", borderRadius: 14, padding: 16, boxShadow: "0 12px 30px rgba(15,23,42,0.08)" },
  cardHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },

  cardEyebrow: { fontSize: 12, textTransform: "uppercase", color: "#94a3b8", margin: 0 },
  cardTitle: { fontSize: 18, margin: "2px 0 0", color: "#0f172a" },
  badgeSoft: { padding: "6px 10px", borderRadius: 10, background: "#eef2ff", color: "#4338ca", fontSize: 12 },
  badgeOutline: { padding: "6px 10px", borderRadius: 10, border: "1px solid #e5e7eb", color: "#475569", fontSize: 12 },

  desc: { marginTop: 8, color: "#0f172a" },

  weightBox: { marginBottom: 10, padding: 12, borderRadius: 12, background: "#f8fafc", border: "1px solid #e2e8f0" },
  weightList: { listStyle: "none", padding: 0, margin: "6px 0 0", display: "flex", flexDirection: "column", gap: 6 },
  weightItem: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, padding: "6px 8px", borderRadius: 8, background: "white", border: "1px solid #e2e8f0" },
  weightLabel: { fontWeight: 700, color: "#0f172a" },
  weightValue: { fontWeight: 700, color: "#111827" },
  weightHint: { marginLeft: 6, color: "#475569", fontSize: 12, fontWeight: 500 },
  weightTotal: { marginTop: 8, color: "#475569", fontSize: 13 },

  gradeInfoBox: { margin: "8px 0", padding: 12, borderRadius: 12, background: "#f8fafc", border: "1px solid #e2e8f0" },
  gradeRuleList: { listStyle: "none", padding: 0, margin: 0, display: "flex", gap: 12, flexWrap: "wrap" },
  gradeRuleItem: { display: "flex", alignItems: "center", gap: 8, background: "white", padding: "6px 10px", borderRadius: 10, border: "1px solid #e2e8f0" },
  gradeDot: { width: 12, height: 12, borderRadius: 999 },
  gradeRuleText: { color: "#0f172a" },
  smallTitle: { margin: 0, fontWeight: 700, color: "#0f172a", fontSize: 13 },

  whyBox: { marginTop: 12, padding: 14, borderRadius: 12, background: "#f1f5f9", border: "1px solid #e2e8f0" },
  whyTitle: { margin: 0, fontWeight: 700 },
  whyList: { margin: "6px 0 0", paddingLeft: 18 },

  scoringBox: { marginTop: 12, padding: 12, borderRadius: 10, background: "#f8fafc", border: "1px solid #e2e8f0" },
  scoringList: { listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 8 },
  scoringItem: { display: "flex", justifyContent: "space-between", gap: 8 },
  scoringLabel: { fontWeight: 700 },
  scoringValue: { display: "flex", gap: 8, alignItems: "center" },
  scoringHint: { color: "#475569", fontSize: 12 },

  radarExplain: { marginTop: 10, padding: 10, borderRadius: 10, background: "#f8fafc", border: "1px dashed #e2e8f0", fontSize: 14 },

  metricsGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 12 },
  metricCard: { background: "#f8fafc", borderRadius: 12, padding: 12, display: "flex", gap: 12, border: "1px solid #e2e8f0" },
  metricIcon: { width: 34, height: 34, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", color: "white" },
  metricLabel: { margin: 0, fontSize: 13, color: "#64748b" },
  metricValue: { margin: 0, fontSize: 18, fontWeight: 700 },
  metricNote: { margin: 0, fontSize: 12, color: "#64748b" },

  priorityBox: { marginBottom: 14, padding: 12, borderRadius: 12, background: "#ecfeff", border: "1px solid #67e8f9" },
  priorityTitle: { margin: 0, fontWeight: 700 },
  priorityList: { margin: "6px 0 0", paddingLeft: 18 },

  issueList: { display: "flex", flexDirection: "column", gap: 10 },
  issueItem: { border: "1px solid #e2e8f0", borderRadius: 10, padding: 12, background: "#f8fafc" },
  issueSummary: { display: "flex", gap: 10, cursor: "pointer" },
  issueTitle: { display: "flex", gap: 10, marginBottom: 6 },
  issuePath: { fontSize: 12, color: "#475569" },
  issueText: { margin: "4px 0" },

  severityPill: { padding: "4px 8px", borderRadius: 999, fontSize: 12, fontWeight: 700 },
  pillError: { background: "#fee2e2", color: "#b91c1c" },
  pillWarn: { background: "#fff7ed", color: "#b45309" },

  recGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 12 },
  recItem: { border: "1px solid #e2e8f0", borderRadius: 10, padding: 12, background: "#f8fafc" },
  recTitle: { margin: 0, fontWeight: 700 },
  recText: { marginTop: 6, color: "#475569" },

  muted: { color: "#64748b" },
  success: { color: "#16a34a", fontWeight: 700 }
};

const toneMap = {
  blue: { background: "#dbeafe", color: "#1d4ed8" },
  indigo: { background: "#e0e7ff", color: "#4338ca" },
  emerald: { background: "#d1fae5", color: "#047857" },
  rose: { background: "#ffe4e6", color: "#be123c" },
  amber: { background: "#fef3c7", color: "#b45309" }
};