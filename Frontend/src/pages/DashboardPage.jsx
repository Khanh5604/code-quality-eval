import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";

export default function DashboardPage() {
  const [analyses, setAnalyses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .get("/api/analyses")
      .then((res) => setAnalyses(res.data || []))
      .catch((err) => setError(err?.response?.data?.message || "Không tải được dữ liệu"))
      .finally(() => setLoading(false));
  }, []);

  const stats = useMemo(() => {
    if (!analyses.length) return { total: 0, avg: 0, best: 0, lint: 0, dup: 0 };
    const totals = analyses.reduce(
      (acc, a) => {
        const overall = a.scores?.summary?.overall || 0;
        const lint = a.scores?.meta?.lintErrors || 0;
        const dup = a.scores?.meta?.dupPercent || 0;
        acc.sum += overall;
        acc.best = Math.max(acc.best, overall);
        acc.lint += lint;
        acc.dupSum += dup;
        return acc;
      },
      { sum: 0, best: 0, lint: 0, dupSum: 0 }
    );
    return {
      total: analyses.length,
      avg: (totals.sum / analyses.length).toFixed(1),
      best: totals.best.toFixed(1),
      lint: totals.lint,
      dup: (totals.dupSum / analyses.length).toFixed(1)
    };
  }, [analyses]);

  const recent = analyses.slice(0, 5);

  const qualityTrend = useMemo(() => {
    const base = [
      { label: "20/11", value: 7.6 },
      { label: "22/11", value: 8.0 },
      { label: "25/11", value: 8.2 },
      { label: "27/11", value: 7.9 },
      { label: "30/11", value: 8.6 },
      { label: "02/12", value: 8.3 }
    ];
    if (!analyses.length) return base;
    return analyses
      .slice(0, 6)
      .map((a, idx) => ({
        label: a.created_at?.slice(0, 10) || base[idx]?.label || `${idx + 1}`,
        value: a.scores?.summary?.overall ?? base[idx]?.value ?? 0
      }))
      .concat(base.slice(analyses.length));
  }, [analyses]);

  const topIssueTypes = [
    { label: "Code Smell", value: 170 },
    { label: "Bug", value: 100 },
    { label: "Security", value: 130 },
    { label: "Performance", value: 70 },
    { label: "Style", value: 60 },
    { label: "Maintainability", value: 55 }
  ];

  return (
    <div style={ui.page}>
      <div style={ui.headerRow}>
        <div>
          <p style={ui.overline}>Tổng quan</p>
          <h2 style={ui.title}>Dashboard chất lượng mã</h2>
          <p style={ui.subtitle}>Hiệu suất phân tích, xu hướng và cảnh báo gần đây</p>
        </div>
        <div style={ui.badge}>{stats.total} dự án</div>
      </div>

      {loading && <div style={ui.muted}>Đang tải...</div>}
      {error && <div style={ui.error}>{error}</div>}

      {!loading && !error && (
        <>
          <div style={ui.cardsGrid}>
            <StatCard label="Điểm TB" value={stats.avg} helper="Overall trung bình" color="#2563eb" trend="+2.4" />
            <StatCard label="Điểm cao nhất" value={stats.best} helper="Phiên tốt nhất" color="#16a34a" />
            <StatCard label="Tổng số lỗi lint" value={stats.lint} helper="Tổng lỗi lint" color="#ef4444" />
            <StatCard label="Tỷ lệ trùng lặp mã" value={`${stats.dup}%`} helper="Tỷ lệ trùng lặp" color="#8b5cf6" />
          </div>

          <div style={ui.chartsRow}>
            <ChartCard
              title="Chất lượng theo thời gian"
              type="line"
              data={qualityTrend}
            />
            <ChartCard
              title="Nhóm lỗi xuất hiện nhiều"
              type="bar"
              data={topIssueTypes}
            />
          </div>

          <div style={ui.sectionRowWide}>
            <div style={ui.cardTall}>
              <div style={ui.sectionHead}>
                <div>
                  <h3 style={ui.sectionTitle}>Dự án gần đây</h3>
                  <p style={ui.subtle}>5 phiên phân tích mới nhất</p>
                </div>
                <Link to="/history" style={ui.link}>Xem tất cả</Link>
              </div>
              {recent.length === 0 ? (
                <div style={ui.muted}>Chưa có bản phân tích nào.</div>
              ) : (
                <table style={ui.table}>
                  <thead>
                    <tr>
                      <th style={ui.th}>Dự án</th>
                      <th style={ui.th}>Điểm</th>
                      <th style={ui.th}>Chất lượng</th>
                      <th style={ui.th}>Lint</th>
                      <th style={ui.th}>Trùng lặp</th>
                      <th style={ui.th}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {recent.map((a) => (
                      <tr key={a.id} style={ui.tr}>
                        <td style={ui.fileCell}>{a.displayName || a.projectName || a.scores?.project_name}</td>
                        <td style={ui.scoreCell}>{a.scores?.summary?.overall}</td>
                        <td style={ui.badgeCell}><span style={{ ...ui.pill, background: qualityColor(a.scores?.summary?.quality_level) }}>{a.scores?.summary?.quality_level}</span></td>
                        <td style={ui.lineCell}>{a.scores?.meta?.lintErrors}</td>
                        <td style={ui.lineCell}>{a.scores?.meta?.dupPercent}%</td>
                        <td style={ui.linkCell}>
                          <Link to={`/analysis/${a.id}`} style={ui.link}>Chi tiết</Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div style={ui.cardTall}>
              <div style={ui.sectionHead}>
                <div>
                  <h3 style={ui.sectionTitle}>Cảnh báo mới nhất</h3>
                  <p style={ui.subtle}>Lint & trùng lặp đáng chú ý</p>
                </div>
              </div>
              {recent.length === 0 ? (
                <div style={ui.muted}>Chưa có dữ liệu.</div>
              ) : (
                <ul style={ui.alertList}>
                  {recent.map((a) => (
                    <li key={a.id} style={ui.alertItem}>
                      <div>
                        <div style={ui.alertTitle}>{a.displayName || a.projectName || a.scores?.project_name}</div>
                        <div style={ui.alertMeta}>Lint: {a.scores?.meta?.lintErrors} • Dup: {a.scores?.meta?.dupPercent}%</div>
                      </div>
                      <Link to={`/analysis/${a.id}`} style={ui.link}>Xem</Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

const StatCard = ({ label, value, helper, color, trend }) => (
  <div style={ui.statCard}>
    <div style={{ ...ui.statDot, background: color }} />
    <div>
      <div style={ui.statLabel}>{label}</div>
      <div style={ui.statValueRow}>
        <div style={ui.statValue}>{value}</div>
        {trend && <span style={ui.trend}>↑ {trend}</span>}
      </div>
      <div style={ui.statHelper}>{helper}</div>
    </div>
  </div>
);

const ui = {
  page: {
    display: "flex",
    flexDirection: "column",
    gap: 16
  },
  headerRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
    padding: "16px 0"
  },
  overline: {
    margin: 0,
    textTransform: "uppercase",
    letterSpacing: 1.2,
    fontSize: 11,
    color: "#94a3b8",
    fontWeight: 700
  },
  title: {
    margin: "2px 0",
    fontSize: 26,
    fontWeight: 800,
    color: "#0f172a"
  },
  subtitle: {
    margin: 0,
    color: "#475569",
    fontSize: 14
  },
  badge: {
    padding: "8px 14px",
    borderRadius: 999,
    background: "#e0f2fe",
    color: "#075985",
    fontWeight: 700,
    alignSelf: "center"
  },
  muted: {
    color: "#64748b",
    fontSize: 14
  },
  error: {
    background: "#fef2f2",
    border: "1px solid #fecdd3",
    padding: 12,
    borderRadius: 10,
    color: "#b91c1c"
  },
  cardsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: 14
  },
  statCard: {
    display: "flex",
    gap: 12,
    alignItems: "center",
    background: "#fff",
    padding: 16,
    borderRadius: 14,
    boxShadow: "0 8px 24px rgba(15, 23, 42, 0.08)",
    border: "1px solid #e2e8f0"
  },
  statDot: {
    width: 12,
    height: 12,
    borderRadius: "50%"
  },
  statLabel: {
    fontSize: 13,
    color: "#475569"
  },
  statValueRow: {
    display: "flex",
    alignItems: "center",
    gap: 8
  },
  statValue: {
    fontSize: 22,
    fontWeight: 800,
    color: "#0f172a"
  },
  statHelper: {
    fontSize: 12,
    color: "#94a3b8"
  },
  trend: {
    fontSize: 11,
    fontWeight: 700,
    color: "#16a34a",
    background: "#ecfdf3",
    padding: "4px 8px",
    borderRadius: 999
  },
  chartsRow: {
    display: "grid",
    gridTemplateColumns: "2fr 1fr",
    gap: 14
  },
  sectionRowWide: {
    display: "grid",
    gridTemplateColumns: "2fr 1fr",
    gap: 14,
    alignItems: "start"
  },
  card: {
    background: "#fff",
    borderRadius: 12,
    padding: 16,
    boxShadow: "0 4px 18px rgba(15, 23, 42, 0.08)"
  },
  cardTall: {
    background: "#fff",
    borderRadius: 12,
    padding: 16,
    boxShadow: "0 8px 24px rgba(15, 23, 42, 0.08)",
    border: "1px solid #e2e8f0"
  },
  sectionTitle: {
    margin: "0 0 12px",
    fontSize: 16,
    fontWeight: 700
  },
  sectionHead: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12
  },
  subtle: {
    margin: 0,
    color: "#94a3b8",
    fontSize: 13
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    fontSize: 13,
    background: "#fff",
    border: "1px solid #e2e8f0",
    borderRadius: 12,
    overflow: "hidden"
  },
  th: {
    textAlign: "left",
    padding: "12px 12px",
    background: "#f8fafc",
    color: "#475569",
    fontWeight: 700,
    borderBottom: "1px solid #e2e8f0"
  },
  tr: {
    borderBottom: "1px solid #f1f5f9"
  },
  fileCell: {
    padding: "12px",
    fontWeight: 700,
    color: "#0f172a"
  },
  scoreCell: {
    padding: "12px",
    fontVariantNumeric: "tabular-nums",
    color: "#111827",
    fontWeight: 700
  },
  lineCell: {
    padding: "12px",
    fontVariantNumeric: "tabular-nums",
    color: "#475569"
  },
  badgeCell: {
    padding: "12px"
  },
  pill: {
    display: "inline-flex",
    alignItems: "center",
    padding: "4px 10px",
    borderRadius: 999,
    fontWeight: 700,
    fontSize: 12,
    color: "#0f172a"
  },
  linkCell: {
    padding: "12px",
    textAlign: "right"
  },
  link: {
    color: "#2563eb",
    fontWeight: 600,
    textDecoration: "none"
  },
  alertList: {
    listStyle: "none",
    padding: 0,
    margin: 0,
    display: "flex",
    flexDirection: "column",
    gap: 8
  },
  alertItem: {
    background: "#f8fafc",
    border: "1px solid #e2e8f0",
    borderRadius: 10,
    padding: 10,
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 10
  },
  alertTitle: {
    fontWeight: 700,
    marginBottom: 2
  },
  alertMeta: {
    color: "#64748b",
    fontSize: 12
  },
  chartWrap: {
    background: "#fff",
    borderRadius: 12,
    padding: 16,
    boxShadow: "0 4px 18px rgba(15, 23, 42, 0.08)"
  },
  chartTitle: {
    margin: "0 0 12px",
    fontSize: 14,
    fontWeight: 700,
    color: "#0f172a"
  },
  chartSvg: {
    width: "100%",
    height: 180,
    overflow: "visible"
  },
  chartAxisLabel: {
    fontSize: 11,
    fill: "#64748b"
  },
};

function qualityColor(level) {
  if (level === "A") return "#d1fae5";
  if (level === "B") return "#e0f2fe";
  if (level === "C") return "#fef9c3";
  return "#fee2e2";
}

const ChartCard = ({ title, data, type }) => {
  if (type === "line") {
    const max = Math.max(...data.map((d) => d.value), 10);
    const min = Math.min(...data.map((d) => d.value), 0);
    const width = 320;
    const height = 140;
    const pad = 20;
    const points = data.map((d, idx) => {
      const x = pad + (idx / (Math.max(data.length - 1, 1))) * (width - pad * 2);
      const y = pad + ((max - d.value) / Math.max(max - min, 1)) * (height - pad * 2);
      return { x, y };
    });
    const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ");
    const areaPath = `${linePath} L${points[points.length - 1]?.x || pad},${height - pad} L${points[0]?.x || pad},${height - pad} Z`;

    return (
      <div style={ui.chartWrap}>
        <div style={ui.chartTitle}>{title}</div>
        <svg viewBox={`0 0 ${width} ${height}`} style={ui.chartSvg}>
          <path d={areaPath} fill="#e0e7ff" opacity="0.6" />
          <path d={linePath} stroke="#2563eb" strokeWidth="3" fill="none" />
          {points.map((p, idx) => (
            <circle key={idx} cx={p.x} cy={p.y} r={4} fill="#2563eb" />
          ))}
          {data.map((d, idx) => {
            const x = pad + (idx / (Math.max(data.length - 1, 1))) * (width - pad * 2);
            return (
              <text key={d.label} x={x} y={height - pad + 14} textAnchor="middle" style={ui.chartAxisLabel}>
                {d.label}
              </text>
            );
          })}
        </svg>
      </div>
    );
  }

  const maxBar = Math.max(...data.map((d) => d.value), 1);
  return (
    <div style={ui.chartWrap}>
      <div style={ui.chartTitle}>{title}</div>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 8, height: 180 }}>
        {data.map((d) => (
          <div 
            key={d.label} 
            style={{ 
              flex: 1, 
              textAlign: "center", 
              minWidth: 0,
              position: "relative",
              cursor: "pointer"
            }}
            title={d.label}
          >
            <div
              style={{
                height: `${(d.value / maxBar) * 140}px`,
                background: "#2563eb",
                borderRadius: "8px 8px 0 0",
                transition: "opacity 0.2s"
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.opacity = "0.8";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.opacity = "1";
              }}
            />
            <div 
              style={{ 
                marginTop: 6, 
                fontSize: 10, 
                color: "#475569",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis"
              }}
              title={d.label}
            >
              {d.label}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
