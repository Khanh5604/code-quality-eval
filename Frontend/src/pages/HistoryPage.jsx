// src/pages/HistoryPage.jsx
import React, { useEffect, useState } from "react";
import { api } from "../api/client";
import { Link } from "react-router-dom";

export default function HistoryPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get("/analyses")
      .then((res) => setItems(res.data || []))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div style={ui.page}>
      <div style={ui.headerRow}>
        <div>
          <p style={ui.overline}>Lịch sử</p>
          <h1 style={ui.title}>Các phiên phân tích đã chạy</h1>
          <p style={ui.subtitle}>Xem lại điểm số, chất lượng và mở chi tiết báo cáo</p>
        </div>
      </div>

      {loading && <p style={ui.muted}>Đang tải...</p>}
      {!loading && items.length === 0 && <p style={ui.muted}>Chưa có lần phân tích nào.</p>}

      {!loading && items.length > 0 && (
        <div style={ui.card}>
          <div style={ui.tableWrap}>
            <table style={ui.table}>
              <thead>
                <tr>
                  <th style={ui.th}>Tên dự án</th>
                  <th style={ui.th}>Thời gian</th>
                  <th style={ui.th}>Điểm</th>
                  <th style={ui.th}>Chất lượng</th>
                  <th style={ui.th}>Hành động</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => {
                  const scores = item.scores;
                  return (
                    <tr key={item.id} style={ui.tr}>
                      <td style={ui.fileCell}>{item.projectName}</td>
                      <td style={ui.timeCell}>{new Date(item.createdAt).toLocaleString()}</td>
                      <td style={ui.scoreCell}>{scores?.summary?.overall ?? "-"}</td>
                      <td style={ui.badgeCell}>
                        <span style={{ ...ui.pill, background: qualityColor(scores?.summary?.quality_level) }}>
                          {scores?.summary?.quality_level ?? "-"}
                        </span>
                      </td>
                      <td style={ui.actions}>
                        <Link to={`/result/${item.id}`} style={ui.link}>Kết quả</Link>
                        <Link to={`/analysis/${item.id}`} style={ui.link}>Chi tiết</Link>
                        <Link to={`/report/${item.id}`} style={ui.link}>Báo cáo</Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function qualityColor(level) {
  if (level === "A") return "#d1fae5";
  if (level === "B") return "#e0f2fe";
  if (level === "C") return "#fef9c3";
  if (level === "D") return "#fee2e2";
  return "#e2e8f0";
}

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
    padding: "12px 0"
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
    margin: "4px 0 4px",
    fontSize: 24,
    fontWeight: 800,
    color: "#0f172a"
  },
  subtitle: {
    margin: 0,
    color: "#475569",
    fontSize: 14
  },
  muted: {
    color: "#64748b",
    fontSize: 14
  },
  card: {
    background: "#fff",
    borderRadius: 12,
    padding: 12,
    boxShadow: "0 8px 24px rgba(15, 23, 42, 0.08)",
    border: "1px solid #e2e8f0"
  },
  tableWrap: {
    overflowX: "auto"
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    fontSize: 13,
    background: "#fff"
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
  timeCell: {
    padding: "12px",
    color: "#475569"
  },
  scoreCell: {
    padding: "12px",
    fontVariantNumeric: "tabular-nums",
    color: "#111827",
    fontWeight: 700
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
  actions: {
    padding: "12px",
    display: "flex",
    gap: 10
  },
  link: {
    color: "#2563eb",
    fontWeight: 600,
    textDecoration: "none"
  }
};
