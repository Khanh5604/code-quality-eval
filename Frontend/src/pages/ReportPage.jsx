// src/pages/ReportPage.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { api } from "../api/client";

function countIssuesByTool(issues = [], toolName) {
  const list = issues.filter((i) => i.tool === toolName);
  const errors = list.filter((i) => i.severity === "error").length;
  const warns = list.filter((i) => i.severity === "warn").length;
  return { total: list.length, errors, warns };
}

function formatBytes(bytes) {
  if (!Number.isFinite(bytes) || bytes < 0) return "-";
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB"];
  let value = bytes / 1024;
  let idx = 0;
  while (value >= 1024 && idx < units.length - 1) {
    value /= 1024;
    idx += 1;
  }
  return `${value.toFixed(1)} ${units[idx]}`;
}

export default function ReportPage() {
  const { id } = useParams();
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get(`/analyses/${id}`)
      .then((res) => setAnalysis(res.data))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, [id]);

  const scores = analysis?.scores;
  const issues = analysis?.issues || [];
  const clocResult = analysis?.clocResult;
  const jscpdResult = analysis?.jscpdResult;
  const source = analysis?.source || scores?.source;

  const summary = useMemo(() => {
    return {
      eslint: countIssuesByTool(issues, "eslint"),
      ruff: countIssuesByTool(issues, "ruff"),
      pmd: countIssuesByTool(issues, "pmd")
    };
  }, [issues]);

  const handlePrint = () => window.print();

  if (loading) return <p style={ui.muted}>Đang tải báo cáo...</p>;
  if (!analysis || !scores) return <p style={ui.error}>Không tìm thấy dữ liệu báo cáo.</p>;

  return (
    <div className="report-page" style={ui.page}>
      <h1 style={ui.title}>Báo cáo phân tích mã nguồn</h1>

      <button className="no-print" onClick={handlePrint} style={ui.buttonPrimary}>
        In / Lưu PDF
      </button>

      <div className="report-card" style={ui.card}>
        <h2 style={ui.cardHeading}>BÁO CÁO ĐÁNH GIÁ CHẤT LƯỢNG MÃ NGUỒN</h2>

        <p style={ui.meta}><b>Tên project:</b> {analysis.projectName}</p>
        <p style={ui.meta}><b>Mã phân tích:</b> {analysis.id}</p>
        <p style={ui.meta}><b>Thời gian:</b> {new Date(scores.created_at).toLocaleString()}</p>
        <p style={ui.meta}><b>Điểm tổng:</b> {scores.summary.overall} ({scores.summary.quality_level})</p>

        {source && (
          <div style={ui.sourceBox}>
            <p style={ui.sectionTitle}>Nguồn phân tích (tái lập)</p>
            <ul style={ui.list}>
              <li>Tệp gốc: {source.originalName || "(không rõ)"}</li>
              <li>Kích thước: {formatBytes(source.zipSize)}</li>
              <li>Hash (SHA-256): <span style={ui.mono}>{source.sha256}</span></li>
              <li>Đã lưu tại: {source.archivedPath || "uploads/archive"}</li>
            </ul>
          </div>
        )}

        <h3 style={ui.sectionTitle}>1. Thông tin tổng quan</h3>
        <ul style={ui.list}>
          <li>Số dòng code: {scores.meta.codeLines}</li>
          <li>Số dòng comment: {scores.meta.commentLines}</li>
          <li>Mật độ comment: {scores.meta.commentDensity}%</li>
          <li>Tỷ lệ trùng lặp: {scores.meta.dupPercent}%</li>
          <li>Độ phức tạp trung bình: {scores.meta.complexityAvg}</li>
          <li>Số lỗi lint: {scores.meta.lintErrors}</li>
        </ul>

        <h3 style={ui.sectionTitle}>2. Kết quả theo công cụ</h3>

        <h4 style={ui.subTitle}>2.1 ESLint (JavaScript/TypeScript)</h4>
        {summary.eslint.total === 0 ? (
          <p style={ui.muted}>
            Không có cảnh báo ESLint nào, hoặc project không có JS/TS.
          </p>
        ) : (
          <ul style={ui.list}>
            <li>Tổng issue: {summary.eslint.total}</li>
            <li>Error: {summary.eslint.errors}</li>
            <li>Warning: {summary.eslint.warns}</li>
          </ul>
        )}

        <h4 style={ui.subTitle}>2.2 CLOC/SLOC</h4>
        {clocResult ? (
          <ul style={ui.list}>
            <li>Code: {clocResult.code}</li>
            <li>Comment: {clocResult.comment}</li>
            <li>Blank: {clocResult.blank}</li>
          </ul>
        ) : (
          <p style={ui.muted}>Không có dữ liệu CLOC.</p>
        )}

        <h4 style={ui.subTitle}>2.3 JSCPD (Duplication)</h4>
        {jscpdResult ? (
          <ul style={ui.list}>
            <li>Duplicated lines: {jscpdResult.duplicatedLines}</li>
            <li>Duplicated %: {jscpdResult.duplicatedPercent}%</li>
          </ul>
        ) : (
          <p style={ui.muted}>Không có dữ liệu JSCPD.</p>
        )}

        <h3 style={ui.sectionTitle}>3. Điểm từng tiêu chí</h3>
        <ul style={ui.list}>
          <li>Style: {scores.metrics.style}</li>
          <li>Complexity: {scores.metrics.complexity}</li>
          <li>Duplication: {scores.metrics.duplication}</li>
          <li>Comment: {scores.metrics.comment}</li>
        </ul>

        <h3 style={ui.sectionTitle}>4. Lỗi chi tiết và gợi ý sửa</h3>
        {issues.length === 0 ? (
          <p style={ui.success}>Không có lỗi nào được ghi nhận.</p>
        ) : (
          <div style={ui.tableWrap}>
            <table style={ui.table}>
              <thead>
                <tr>
                  <th style={ui.th}>Tool</th>
                  <th style={ui.th}>File</th>
                  <th style={ui.th}>Dòng:Cột</th>
                  <th style={ui.th}>Rule</th>
                  <th style={ui.th}>Mô tả</th>
                  <th style={ui.th}>Gợi ý</th>
                </tr>
              </thead>
              <tbody>
                {issues.map((it, idx) => (
                  <tr key={`${it.tool}-${idx}`} style={ui.tr}>
                    <td style={ui.td}>{it.tool} ({it.severity})</td>
                    <td style={ui.tdFile}>{it.file}</td>
                    <td style={ui.td}>{it.line}:{it.column}</td>
                    <td style={{ ...ui.td, color: "#2563eb", fontWeight: 600 }}>{it.rule}</td>
                    <td style={ui.tdDesc}>{it.message}</td>
                    <td style={ui.tdDesc}>{it.suggestion || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <h3 style={ui.sectionTitle}>5. Nhận xét tổng quan </h3>
        <p style={ui.note}>
          Với điểm tổng {scores.summary.overall} ({scores.summary.quality_level}), chất lượng mã nguồn của project được đánh giá ở mức
          <b>{" "}{scores.summary.quality_level === "A"
            ? "rất tốt"
            : scores.summary.quality_level === "B"
            ? "tốt"
            : scores.summary.quality_level === "C"
            ? "trung bình"
            : "còn hạn chế"}</b>.
          Dựa trên các chỉ số chi tiết, có thể tập trung cải thiện vào những tiêu chí có điểm thấp hơn để nâng cao chất lượng tổng thể.
        </p>
      </div>
    </div>
  );
}

const ui = {
  page: {
    display: "flex",
    flexDirection: "column",
    gap: 12,
    padding: 8,
    background: "linear-gradient(180deg, #f8fafc, #eef2ff)",
    borderRadius: 12
  },
  title: {
    margin: 0,
    fontSize: 24,
    fontWeight: 800,
    color: "#0f172a"
  },
  buttonPrimary: {
    alignSelf: "flex-start",
    padding: "10px 16px",
    borderRadius: 12,
    border: "none",
    background: "linear-gradient(90deg, #22c55e, #16a34a)",
    color: "white",
    fontWeight: 700,
    boxShadow: "0 12px 30px rgba(34,197,94,0.25)",
    cursor: "pointer"
  },
  card: {
    padding: 18,
    borderRadius: 14,
    background: "white",
    boxShadow: "0 12px 30px rgba(15,23,42,0.08)"
  },
  cardHeading: {
    textAlign: "center",
    marginBottom: 16,
    letterSpacing: 0.6,
    color: "#0f172a"
  },
  meta: { margin: "6px 0", color: "#0f172a", fontSize: 14 },
  sectionTitle: {
    marginTop: 18,
    marginBottom: 10,
    fontSize: 16,
    color: "#111827",
    fontWeight: 700
  },
  subTitle: {
    marginTop: 10,
    marginBottom: 6,
    fontSize: 15,
    color: "#1f2937",
    fontWeight: 700
  },
  list: {
    paddingLeft: 18,
    color: "#374151",
    lineHeight: 1.6,
    marginTop: 0,
    marginBottom: 8
  },
  tableWrap: {
    overflowX: "auto",
    borderRadius: 12,
    border: "1px solid #e2e8f0",
    boxShadow: "inset 0 1px 0 #f8fafc"
  },
  table: { width: "100%", borderCollapse: "collapse", fontSize: 13 },
  th: {
    textAlign: "left",
    padding: "10px 12px",
    background: "#f8fafc",
    color: "#475569",
    borderBottom: "1px solid #e2e8f0",
    whiteSpace: "nowrap"
  },
  tr: { borderBottom: "1px solid #f1f5f9" },
  td: { padding: "10px 12px", verticalAlign: "top", color: "#0f172a" },
  tdFile: { padding: "10px 12px", minWidth: 160, maxWidth: 280, wordBreak: "break-all", color: "#0f172a" },
  tdDesc: { padding: "10px 12px", minWidth: 160, maxWidth: 320, wordBreak: "break-word", color: "#0f172a" },
  note: { fontSize: 14, lineHeight: 1.6, color: "#0f172a" },
  muted: { color: "#6b7280", marginTop: 0 },
  success: { color: "#15803d", fontWeight: 600 },
  error: { color: "#b91c1c", fontWeight: 700 },
  sourceBox: {
    background: "#f8fafc",
    border: "1px solid #e2e8f0",
    borderRadius: 12,
    padding: 12,
    marginTop: 8
  },
  mono: {
    fontFamily: "monospace",
    wordBreak: "break-all"
  }
};
