// src/components/ScoreSummary.jsx
import React from "react";

export default function ScoreSummary({ summary }) {
  if (!summary) return null;

  const { overall, quality_level } = summary;

  const color =
    quality_level === "A" ? "#16a34a" :
    quality_level === "B" ? "#22c55e" :
    quality_level === "C" ? "#eab308" : "#ef4444";

  const levelText = {
    A: "Rất tốt, ổn định",
    B: "Tốt, cần theo dõi",
    C: "Trung bình, nên cải thiện",
    D: "Kém, ưu tiên xử lý"
  };

  const ringStyle = {
    width: 120,
    height: 120,
    borderRadius: "50%",
    background: `conic-gradient(${color} ${overall}%, #e2e8f0 0)` ,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    boxShadow: "0 12px 30px rgba(15,23,42,0.12)"
  };

  return (
    <div style={{ padding: 12, borderRadius: 14, background: "white", boxShadow: "0 10px 28px rgba(15,23,42,0.08)", display: "flex", alignItems: "center", gap: 16 }}>
      <div style={ringStyle}>
        <div style={{ width: 88, height: 88, borderRadius: "50%", background: "white", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color }}>
          <div style={{ fontSize: 30, fontWeight: 800 }}>{overall}</div>
          <div style={{ fontSize: 16, fontWeight: 700 }}>{quality_level}</div>
        </div>
      </div>
      <div>
        <p style={{ margin: "0 0 4px", color: "#94a3b8", fontSize: 12, textTransform: "uppercase", letterSpacing: 0.5 }}>
          Tổng quan chất lượng
        </p>
        <h3 style={{ margin: "0 0 6px", fontSize: 18, color: "#0f172a" }}>Điểm tổng: {overall}/100</h3>
        <p style={{ margin: 0, color: "#475569", fontSize: 14 }}>
          {levelText[quality_level] || "Đang cập nhật đánh giá"}
        </p>
      </div>
    </div>
  );
}
