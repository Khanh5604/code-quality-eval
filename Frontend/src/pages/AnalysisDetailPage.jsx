import React, { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { api } from "../api/client";
import ScoreSummary from "../components/ScoreSummary";
import MetricsChart from "../components/MetricsChart";

/* =========================
   HELPER (GIỮ NGUYÊN)
========================= */
function summarizeTool(issues = [], toolName) {
  const list = issues.filter((i) => i.tool === toolName);
  const errors = list.filter((i) => i.severity === "error").length;
  const warns = list.filter((i) => i.severity === "warn").length;

  const ruleCount = {};
  for (const it of list) {
    const r = it.rule || "unknown";
    ruleCount[r] = (ruleCount[r] || 0) + 1;
  }

  const topRules = Object.entries(ruleCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([rule, count]) => ({ rule, count }));

  return { total: list.length, errors, warns, topRules };
}

/* =========================
   MAIN PAGE
========================= */
export default function AnalysisDetailPage() {
  const { id } = useParams();
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get(`/analyses/${id}`)
      .then((res) => setAnalysis(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  const scores = analysis?.scores;
  const clocResult = analysis?.clocResult;
  const jscpdResult = analysis?.jscpdResult;
  const issues = analysis?.issues || [];

  const toolSummary = useMemo(
    () => ({
      eslint: summarizeTool(issues, "eslint"),
      ruff: summarizeTool(issues, "ruff"),
      pmd: summarizeTool(issues, "pmd")
    }),
    [issues]
  );

  if (loading) return <div style={ui.loading}>Đang tải báo cáo…</div>;
  if (!analysis || !scores)
    return <div style={ui.error}>Không tìm thấy kết quả phân tích.</div>;

  return (
    <div style={ui.page}>
      {/* ================= HEADER ================= */}
      <header style={ui.header}>
        <div>
          <h1 style={ui.title}>Báo cáo đánh giá chất lượng mã nguồn</h1>
          <p style={ui.subtitle}>
            Phân tích tĩnh toàn diện và chấm điểm theo chỉ số
          </p>
        </div>
        <div style={ui.badge}>Mã phân tích: {id}</div>
      </header>

      {/* ================= TOP GRID ================= */}
      <section style={ui.topGrid}>
        <div style={ui.card}>
          <h3 style={ui.sectionTitle}>Điểm chất lượng tổng</h3>
          <ScoreSummary summary={scores.summary} />
        </div>

        <div style={ui.card}>
          <h3 style={ui.sectionTitle}>Phân bố điểm thành phần</h3>
          <MetricsChart metrics={scores.metrics} />
        </div>
      </section>

      {/* ================= META METRICS ================= */}
      <section style={ui.metricsRow}>
        <Metric label="Số dòng code" value={scores.meta.codeLines} />
        <Metric label="Số dòng chú thích" value={scores.meta.commentLines} />
        <Metric label="Mật độ chú thích" value={`${scores.meta.commentDensity}%`} />
        <Metric label="Tỷ lệ trùng lặp" value={`${scores.meta.dupPercent}%`} />
        <Metric label="Độ phức tạp TB" value={scores.meta.complexityAvg} />
        <Metric label="Lỗi lint" value={scores.meta.lintErrors} />
      </section>

      {/* ================= TOOLS ================= */}
      <section style={ui.toolsGrid}>
        {/* ESLINT */}
        <div style={ui.card}>
          <h3 style={ui.sectionTitle}>ESLint</h3>

          {toolSummary.eslint.total === 0 ? (
            <p style={ui.muted}>Không có vấn đề ESLint.</p>
          ) : (
            <>
              <ToolStat
                label="Tổng số lỗi"
                value={toolSummary.eslint.total}
              />
              <ToolStat
                label="Lỗi"
                value={toolSummary.eslint.errors}
                color="#dc2626"
              />
              <ToolStat
                label="Cảnh báo"
                value={toolSummary.eslint.warns}
                color="#d97706"
              />

              <div style={{ marginTop: 12 }}>
                <p style={ui.smallTitle}>Rule vi phạm nhiều nhất</p>
                <ul style={ui.ruleList}>
                  {toolSummary.eslint.topRules.map((r) => (
                    <li key={r.rule}>
                      {r.rule}
                      <span>{r.count}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </>
          )}
        </div>

        {/* CLOC */}
        <div style={ui.card}>
          <h3 style={ui.sectionTitle}>Thống kê CLOC</h3>
          {clocResult ? (
            <>
              <ToolStat label="Mã nguồn" value={clocResult.code} />
              <ToolStat label="Chú thích" value={clocResult.comment} />
              <ToolStat label="Dòng trống" value={clocResult.blank} />
            </>
          ) : (
            <p style={ui.muted}>Chưa có dữ liệu CLOC.</p>
          )}
        </div>

        {/* JSCPD */}
        <div style={ui.card}>
          <h3 style={ui.sectionTitle}>JSCPD - Trùng lặp</h3>
          {jscpdResult ? (
            <>
              <ToolStat
                label="Số dòng trùng"
                value={jscpdResult.duplicatedLines}
              />
              <ToolStat
                label="Tỷ lệ trùng"
                value={`${jscpdResult.duplicatedPercent}%`}
              />
            </>
          ) : (
            <p style={ui.muted}>Chưa có dữ liệu JSCPD.</p>
          )}
        </div>
      </section>

      {/* ================= ISSUE TABLE ================= */}
      <section style={ui.card}>
        <h3 style={ui.sectionTitle}>Chi tiết lỗi phát hiện</h3>

        {issues.length === 0 ? (
          <p style={ui.success}>Không phát hiện vấn đề.</p>
        ) : (
          <div style={ui.tableWrap}>
            <table style={ui.table}>
              <thead>
                <tr>
                  <th style={ui.th}>Công cụ</th>
                  <th style={ui.th}>Tệp</th>
                  <th style={ui.th}>Dòng</th>
                  <th style={ui.th}>Rule</th>
                  <th style={ui.th}>Mô tả</th>
                  <th style={ui.th}>Gợi ý</th>
                </tr>
              </thead>
              <tbody>
                {issues.map((it, i) => (
                  <tr key={i} style={ui.tr}>
                    <td style={ui.toolCell}>
                      <span
                        style={{
                          ...ui.severityPill,
                          background: it.severity === "error" ? "#fee2e2" : "#fef3c7",
                          color: it.severity === "error" ? "#b91c1c" : "#a16207"
                        }}
                      >
                        {it.tool.toUpperCase()}
                      </span>
                    </td>
                    <td style={ui.fileCell}>{it.file}</td>
                    <td style={ui.lineCell}>
                      {it.line}:{it.column}
                    </td>
                    <td style={ui.ruleCell}>{it.rule}</td>
                    <td style={ui.descCell}>{it.message}</td>
                    <td style={ui.descCell}>{it.suggestion || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

/* =========================
   SMALL COMPONENTS
========================= */
const Metric = ({ label, value }) => (
  <div style={ui.metric}>
    <span>{label}</span>
    <strong>{value}</strong>
  </div>
);

const ToolStat = ({ label, value, color }) => (
  <div style={ui.toolStat}>
    <span>{label}</span>
    <strong style={{ color }}>{value}</strong>
  </div>
);

/* =========================
   STYLES
========================= */
const ui = {
  page: {
    maxWidth: 1300,
    margin: "0 auto",
    padding: 24,
    background: "#f3f4f6"
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24
  },
  title: {
    fontSize: 28,
    fontWeight: 700
  },
  subtitle: {
    fontSize: 14,
    color: "#6b7280"
  },
  badge: {
    background: "#111827",
    color: "white",
    padding: "6px 14px",
    borderRadius: 999,
    fontSize: 12
  },
  topGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 20,
    marginBottom: 24
  },
  toolsGrid: {
    display: "grid",
    gridTemplateColumns: "2fr 1fr 1fr",
    gap: 20,
    marginBottom: 24
  },
  metricsRow: {
    display: "grid",
    gridTemplateColumns: "repeat(6, 1fr)",
    gap: 16,
    marginBottom: 24
  },
  card: {
    background: "white",
    borderRadius: 16,
    padding: 20,
    boxShadow: "0 8px 24px rgba(0,0,0,0.06)"
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 600,
    marginBottom: 12
  },
  metric: {
    background: "white",
    borderRadius: 14,
    padding: 14,
    textAlign: "center",
    boxShadow: "0 6px 18px rgba(0,0,0,0.05)"
  },
  toolStat: {
    display: "flex",
    justifyContent: "space-between",
    marginBottom: 6
  },
  ruleList: {
    listStyle: "none",
    padding: 0,
    margin: 0
  },
  tableWrap: {
    overflowX: "auto",
    borderRadius: 12,
    border: "1px solid #e5e7eb",
    boxShadow: "0 6px 18px rgba(0,0,0,0.05)"
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    fontSize: 13,
    background: "white"
  },
  th: {
    textAlign: "left",
    padding: "12px 12px",
    background: "#f8fafc",
    color: "#475569",
    fontWeight: 700,
    borderBottom: "1px solid #e2e8f0",
    position: "sticky",
    top: 0,
    zIndex: 1
  },
  tr: {
    borderBottom: "1px solid #f1f5f9"
  },
  toolCell: {
    padding: "12px 12px",
    whiteSpace: "nowrap"
  },
  severityPill: {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    padding: "4px 8px",
    borderRadius: 999,
    fontWeight: 700,
    fontSize: 11,
    letterSpacing: 0.3
  },
  fileCell: {
    padding: "12px 12px",
    maxWidth: 260,
    wordBreak: "break-all",
    color: "#0f172a",
    fontWeight: 600
  },
  lineCell: {
    padding: "12px 12px",
    color: "#0f172a",
    fontVariantNumeric: "tabular-nums",
    whiteSpace: "nowrap"
  },
  ruleCell: {
    padding: "12px 12px",
    color: "#2563eb",
    fontWeight: 700,
    whiteSpace: "nowrap"
  },
  descCell: {
    padding: "12px 12px",
    maxWidth: 360,
    wordBreak: "break-word",
    color: "#334155",
    lineHeight: 1.5
  },
  muted: {
    color: "#6b7280"
  },
  success: {
    color: "#16a34a",
    fontWeight: 600
  },
  loading: {
    padding: 32
  },
  error: {
    padding: 32,
    color: "#dc2626"
  }
};
