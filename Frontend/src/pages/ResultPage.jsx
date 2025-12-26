// src/pages/ResultPage.jsx
import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { api } from "../api/client";
import ScoreSummary from "../components/ScoreSummary";
import MetricsChart from "../components/MetricsChart";

const weightLabels = {
  style: "Phong cách",
  complexity: "Phức tạp",
  duplication: "Trùng lặp",
  comment: "Chú thích"
};

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

export default function ResultPage() {
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

  if (loading) return <div style={ui.loading}>Đang tải kết quả…</div>;
  if (!analysis) return <div style={ui.error}>Không tìm thấy kết quả phân tích.</div>;

  const scores = analysis.scores;
  const weights = scores?.weights || {};
  const source = analysis.source || scores?.source;
  const createdAt = new Date(scores.created_at);
  const formatDate = createdAt.toLocaleString();
  const projectName = analysis.projectName || scores?.project_name || "Dự án";

  return (
    <div style={ui.page}>
      {/* HERO */}
      <section style={ui.hero}>
        <div>
          <p style={ui.eyebrow}>Báo cáo phân tích</p>
          <h1 style={ui.title}>{projectName}</h1>
          <div style={ui.heroMeta}>
            <span style={ui.chipDark}>Mã: {analysis.id}</span>
            <span style={ui.chipLight}>Thời gian: {formatDate}</span>
          </div>
        </div>
        <div style={ui.heroScore}>
          <div style={ui.heroBadge}>Kết quả</div>
          <ScoreSummary summary={scores.summary} />
        </div>
      </section>

      {/* MAIN GRID */}
      <section style={ui.grid2}>
        <div style={ui.cardLarge}>
          <div style={ui.cardHeader}>
            <div>
              <p style={ui.cardEyebrow}>Chất lượng tổng thể</p>
              <h3 style={ui.cardTitle}>Điểm và xếp hạng</h3>
            </div>
            <span style={ui.badgeSoft}>Tự động tính toán</span>
          </div>
          <ScoreSummary summary={scores.summary} />
        </div>

        <div style={ui.cardLarge}>
          <div style={ui.cardHeader}>
            <div>
              <p style={ui.cardEyebrow}>Thành phần</p>
              <h3 style={ui.cardTitle}>Radar điểm chi tiết</h3>
            </div>
            <span style={ui.badgeOutline}>0–100</span>
          </div>
          <MetricsChart metrics={scores.metrics} />
        </div>
      </section>

      {/* METRICS GRID */}
      <section style={ui.metricsGrid}>
        {[
          { label: "Số dòng code", value: scores.meta.codeLines, tone: "blue" },
          { label: "Dòng chú thích", value: scores.meta.commentLines, tone: "indigo" },
          { label: "Mật độ chú thích", value: `${scores.meta.commentDensity}%`, tone: "emerald" },
          { label: "Tỷ lệ trùng lặp", value: `${scores.meta.dupPercent}%`, tone: "rose" },
          { label: "Độ phức tạp TB", value: scores.meta.complexityAvg, tone: "amber" },
          { label: "Lỗi lint", value: scores.meta.lintErrors, tone: "slate" }
        ].map((item) => (
          <div key={item.label} style={ui.metricCard}>
            <div style={{ ...ui.metricIcon, ...toneMap[item.tone] }}>●</div>
            <div>
              <p style={ui.metricLabel}>{item.label}</p>
              <p style={ui.metricValue}>{item.value}</p>
            </div>
          </div>
        ))}
      </section>

      {source && (
        <section style={ui.cardLarge}>
          <div style={ui.cardHeader}>
            <div>
              <p style={ui.cardEyebrow}>Tái lập kết quả</p>
              <h3 style={ui.cardTitle}>Thông tin gói mã nguồn</h3>
            </div>
            <span style={ui.badgeOutline}>Lưu hash SHA-256</span>
          </div>
          <div style={ui.sourceGrid}>
            <div style={ui.sourceItem}>
              <p style={ui.sourceLabel}>Tên tệp</p>
              <p style={ui.sourceValue}>{source.originalName || "(không rõ)"}</p>
            </div>
            <div style={ui.sourceItem}>
              <p style={ui.sourceLabel}>Kích thước</p>
              <p style={ui.sourceValue}>{formatBytes(source.zipSize)}</p>
            </div>
            <div style={ui.sourceItem}>
              <p style={ui.sourceLabel}>Hash</p>
              <p style={ui.sourceMono}>{source.sha256 || "-"}</p>
            </div>
            <div style={ui.sourceItem}>
              <p style={ui.sourceLabel}>Lưu tại</p>
              <p style={ui.sourceValue}>{source.archivedPath || "uploads/archive"}</p>
            </div>
          </div>
        </section>
      )}

      {/* WEIGHTS */}
      <section style={ui.cardLarge}>
        <div style={ui.cardHeader}>
          <div>
            <p style={ui.cardEyebrow}>Trọng số đang áp dụng</p>
            <h3 style={ui.cardTitle}>Cấu hình từ trang Cài đặt</h3>
          </div>
          <span style={ui.badgeSoft}>Tự động chuẩn hoá</span>
        </div>

        <div style={ui.weightList}>
          {Object.keys(weightLabels).map((key) => {
            const val = weights[key];
            const percent = val ? Math.round(val * 100) : 0;
            return (
              <div key={key} style={ui.weightItem}>
                <div style={ui.weightRow}>
                  <span style={ui.weightLabel}>{weightLabels[key]}</span>
                  <span style={ui.weightValue}>{percent}%</span>
                </div>
                <div style={ui.weightBarTrack}>
                  <div style={{ ...ui.weightBarFill, width: `${percent}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ACTIONS */}
      <section style={ui.actions}>
        <Link to="/history" style={{ ...ui.button, ...ui.buttonGhost }}>← Về lịch sử</Link>
        <Link to={`/analysis/${analysis.id}`} style={{ ...ui.button, ...ui.buttonSoft }}>Xem chi tiết nâng cao</Link>
        <Link to={`/report/${analysis.id}`} style={{ ...ui.button, ...ui.buttonPrimary }}>Tải/ Xem báo cáo</Link>
      </section>
    </div>
  );
}

const ui = {
  page: {
    display: "flex",
    flexDirection: "column",
    gap: 20,
    padding: 8
  },
  loading: {
    padding: 20,
    color: "#475569"
  },
  error: {
    padding: 20,
    color: "#b91c1c",
    fontWeight: 600
  },
  hero: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderRadius: 16,
    background: "linear-gradient(135deg, #0f172a, #1e293b)",
    color: "white",
    boxShadow: "0 20px 60px rgba(15,23,42,0.25)"
  },
  eyebrow: {
    textTransform: "uppercase",
    letterSpacing: 1,
    fontSize: 12,
    color: "#cbd5e1",
    margin: 0
  },
  title: {
    margin: "6px 0 10px",
    fontSize: 28,
    fontWeight: 800
  },
  heroMeta: {
    display: "flex",
    gap: 10,
    flexWrap: "wrap"
  },
  chipDark: {
    padding: "6px 10px",
    borderRadius: 999,
    background: "rgba(255,255,255,0.12)",
    border: "1px solid rgba(255,255,255,0.18)",
    color: "white",
    fontSize: 13
  },
  chipLight: {
    padding: "6px 10px",
    borderRadius: 999,
    background: "rgba(255,255,255,0.08)",
    color: "#e2e8f0",
    fontSize: 13
  },
  heroScore: {
    display: "flex",
    gap: 12,
    alignItems: "center"
  },
  heroBadge: {
    background: "rgba(255,255,255,0.08)",
    color: "#e2e8f0",
    padding: "6px 10px",
    borderRadius: 12,
    fontSize: 12,
    border: "1px solid rgba(255,255,255,0.18)"
  },
  grid2: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
    gap: 16
  },
  cardLarge: {
    background: "white",
    borderRadius: 14,
    padding: 16,
    boxShadow: "0 12px 30px rgba(15,23,42,0.08)"
  },
  cardHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10
  },
  cardEyebrow: {
    fontSize: 12,
    textTransform: "uppercase",
    color: "#94a3b8",
    margin: 0
  },
  cardTitle: {
    fontSize: 18,
    margin: "2px 0 0",
    color: "#0f172a"
  },
  badgeSoft: {
    padding: "6px 10px",
    borderRadius: 10,
    background: "#eef2ff",
    color: "#4338ca",
    fontSize: 12,
    border: "1px solid #e0e7ff"
  },
  badgeOutline: {
    padding: "6px 10px",
    borderRadius: 10,
    border: "1px solid #e5e7eb",
    color: "#475569",
    fontSize: 12
  },
  metricsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: 12
  },
  metricCard: {
    background: "white",
    borderRadius: 12,
    padding: 12,
    display: "flex",
    gap: 12,
    alignItems: "center",
    boxShadow: "0 10px 24px rgba(15,23,42,0.06)"
  },
  metricIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: 800,
    color: "white"
  },
  metricLabel: {
    margin: 0,
    color: "#64748b",
    fontSize: 13
  },
  metricValue: {
    margin: 0,
    fontSize: 18,
    fontWeight: 700,
    color: "#0f172a"
  },
  weightList: {
    display: "flex",
    flexDirection: "column",
    gap: 10,
    marginTop: 8
  },
  weightItem: {
    background: "#f8fafc",
    borderRadius: 10,
    padding: 12,
    border: "1px solid #e2e8f0"
  },
  weightRow: {
    display: "flex",
    justifyContent: "space-between",
    marginBottom: 6,
    fontWeight: 600,
    color: "#0f172a"
  },
  weightLabel: {
    fontSize: 14
  },
  weightValue: {
    fontSize: 14
  },
  weightBarTrack: {
    height: 8,
    borderRadius: 999,
    background: "#e2e8f0",
    overflow: "hidden"
  },
  weightBarFill: {
    height: "100%",
    background: "linear-gradient(90deg, #6366f1, #14b8a6)"
  },
  sourceGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
    gap: 12,
    marginTop: 8
  },
  sourceItem: {
    background: "#f8fafc",
    border: "1px solid #e2e8f0",
    borderRadius: 10,
    padding: 12
  },
  sourceLabel: {
    margin: 0,
    color: "#475569",
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 0.5
  },
  sourceValue: {
    margin: "4px 0 0",
    fontSize: 14,
    fontWeight: 700,
    color: "#0f172a",
    wordBreak: "break-word"
  },
  sourceMono: {
    margin: "4px 0 0",
    fontSize: 12,
    color: "#0f172a",
    wordBreak: "break-all",
    fontFamily: "monospace"
  },
  actions: {
    display: "flex",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 4
  },
  button: {
    padding: "10px 14px",
    borderRadius: 10,
    fontWeight: 700,
    textDecoration: "none",
    fontSize: 14,
    textAlign: "center"
  },
  buttonGhost: {
    background: "white",
    color: "#0f172a",
    border: "1px solid #e2e8f0"
  },
  buttonSoft: {
    background: "#eef2ff",
    color: "#312e81",
    border: "1px solid #e0e7ff"
  },
  buttonPrimary: {
    background: "linear-gradient(90deg, #2563eb, #7c3aed)",
    color: "white",
    border: "none",
    boxShadow: "0 10px 30px rgba(79,70,229,0.3)"
  }
};

const toneMap = {
  blue: { background: "#dbeafe", color: "#1d4ed8" },
  indigo: { background: "#e0e7ff", color: "#4338ca" },
  emerald: { background: "#d1fae5", color: "#047857" },
  rose: { background: "#ffe4e6", color: "#be123c" },
  amber: { background: "#fef3c7", color: "#b45309" },
  slate: { background: "#e2e8f0", color: "#0f172a" }
};
