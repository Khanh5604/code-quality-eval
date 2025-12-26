// src/components/MetricsChart.jsx
import React from "react";
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer
} from "recharts";

export default function MetricsChart({ metrics }) {
  if (!metrics) return null;

  const data = [
    { metric: "Style", value: metrics.style },
    { metric: "Complexity", value: metrics.complexity },
    { metric: "Duplication", value: metrics.duplication },
    { metric: "Comment", value: metrics.comment }
  ];

  return (
    <div style={{ padding: "16px", borderRadius: "12px", background: "white", boxShadow: "0 1px 3px rgba(0,0,0,0.1)", marginBottom: "16px", height: "320px" }}>
      <h3 style={{ marginBottom: "8px" }}>Điểm chi tiết theo tiêu chí</h3>
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart data={data}>
          <PolarGrid />
          <PolarAngleAxis dataKey="metric" />
          <PolarRadiusAxis angle={30} domain={[0, 100]} />
          <Radar dataKey="value" fill="#3b82f6" fillOpacity={0.6} />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}
