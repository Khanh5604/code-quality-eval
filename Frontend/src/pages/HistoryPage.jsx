// src/pages/HistoryPage.jsx
import React, { useEffect, useState } from "react";
import { api } from "../api/client";
import { Link } from "react-router-dom";

export default function HistoryPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [confirmItem, setConfirmItem] = useState(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    api
      .get("/api/analyses")
      .then((res) => setItems(res.data || []))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  async function handleDeleteAnalysis() {
  if (!confirmItem?.id) return;

  try {
    setDeleting(true);

    await api.delete(`/api/analyses/${confirmItem.id}`);

    // Cập nhật UI đúng
    setItems(prev => prev.filter(i => i.id !== confirmItem.id));

    setConfirmItem(null);
  } catch (err) {
    alert(err?.response?.data?.message || "Xóa phiên phân tích thất bại");
  } finally {
    setDeleting(false);
  }
}


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
                      <td style={ui.fileCell}>
                        {item.displayName || item.projectName}
                      </td>
                      <td style={ui.timeCell}>{new Date(item.createdAt).toLocaleString()}</td>
                      <td style={ui.scoreCell}>{scores?.summary?.overall ?? "-"}</td>
                      <td style={ui.badgeCell}>
                        <span style={{ ...ui.pill, background: qualityColor(scores?.summary?.quality_level) }}>
                          {scores?.summary?.quality_level ?? "-"}
                        </span>
                      </td>
                      <td style={ui.actions}>
                        <Link to={`/analysis/${item.id}`} style={ui.link}>Chi tiết</Link>
                        <Link to={`/report/${item.id}`} style={ui.link}>Báo cáo</Link>
                         <button
                          style={ui.deleteBtn}
                          onClick={() => setConfirmItem(item)}
                        >
                          Xóa
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
        
      )}
            {confirmItem && (
        <div style={ui.modalOverlay}>
          <div style={ui.modal}>
            <h3>Xác nhận xóa phiên phân tích</h3>

            <p>
              Bạn có chắc chắn muốn xóa dự án
              <strong> {confirmItem.projectName}</strong> không?
            </p>

            <p style={{ fontSize: 13, color: "#64748b" }}>
              • Các phiên bản và lịch sử phân tích vẫn được giữ nguyên.<br />
              • Hành động này không thể hoàn tác.
            </p>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
              <button
                style={ui.cancelBtn}
                onClick={() => setConfirmItem(null)}
                disabled={deleting}
              >
                Hủy
              </button>

              <button
                style={ui.confirmDeleteBtn}
                onClick={handleDeleteAnalysis}
                disabled={deleting}
              >
                {deleting ? "Đang xóa..." : "Xóa dự án"}
              </button>
            </div>
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
  },deleteBtn: {
  border: "none",
  background: "transparent",
  color: "#dc2626",
  fontWeight: 700,
  cursor: "pointer"
},

modalOverlay: {
  position: "fixed",
  inset: 0,
  background: "rgba(15,23,42,0.5)",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  zIndex: 100
},

modal: {
  background: "#fff",
  borderRadius: 12,
  padding: 20,
  width: 420,
  boxShadow: "0 20px 50px rgba(0,0,0,0.25)"
},

cancelBtn: {
  padding: "8px 14px",
  borderRadius: 8,
  border: "1px solid #e2e8f0",
  background: "#fff",
  fontWeight: 600
},

confirmDeleteBtn: {
  padding: "8px 14px",
  borderRadius: 8,
  background: "#dc2626",
  color: "#fff",
  border: "none",
  fontWeight: 700
}
};

