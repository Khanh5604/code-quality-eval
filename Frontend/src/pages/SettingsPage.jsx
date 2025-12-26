// src/pages/SettingsPage.jsx
import React, { useEffect, useState } from "react";
import { api } from "../api/client";

const DEFAULT_WEIGHTS = {
  style: 0.3,
  complexity: 0.25,
  duplication: 0.2,
  comment: 0.25
};

export default function SettingsPage() {
  const [weights, setWeights] = useState(DEFAULT_WEIGHTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState({ type: "", message: "" });

  useEffect(() => {
    let mounted = true;

    async function fetchWeights() {
      try {
        const { data } = await api.get("/settings/weights");
        if (!mounted) return;
        if (data?.weights) setWeights(data.weights);
        setStatus({ type: "info" });
      } catch (err) {
        console.warn("Load weights failed", err);
        if (mounted) {
          setStatus({ type: "error" });
          setWeights(DEFAULT_WEIGHTS);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }

    fetchWeights();
    return () => {
      mounted = false;
    };
  }, []);

  const handleChange = (key, value) => {
    setWeights((prev) => ({
      ...prev,
      [key]: Number(value)
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    setStatus({ type: "", message: "" });
    try {
      const { data } = await api.put("/settings/weights", { weights });
      setWeights(data?.weights || weights);
      setStatus({ type: "success", message: "Đã lưu trọng số. Các phân tích mới sẽ dùng cấu hình này." });
    } catch (err) {
      const msg = err?.response?.data?.message || "Lưu trọng số thất bại.";
      setStatus({ type: "error", message: msg });
    } finally {
      setSaving(false);
    }
  };

  const total = Object.values(weights).reduce((a, b) => a + b, 0);

  const labelMap = {
    style: "Phong cách (Style)",
    complexity: "Độ phức tạp (Complexity)",
    duplication: "Trùng lặp (Duplication)",
    comment: "Mật độ chú thích (Comment density)"
  };

  return (
    <div>
      <h1 style={{ marginBottom: "8px" }}>Cài đặt hệ số đánh giá</h1>
      <p style={{ marginBottom: "16px", fontSize: 14, color: "#6b7280" }}>
        Tuỳ chỉnh trọng số cho từng tiêu chí. Trọng số được lưu theo tài khoản và áp dụng cho các lần phân tích mới.
      </p>

      <div
        style={{
          padding: "16px",
          borderRadius: "12px",
          background: "white",
          boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
          maxWidth: "520px"
        }}
      >
        {status.message && (
          <div
            style={{
              marginBottom: "12px",
              padding: "10px 12px",
              borderRadius: "10px",
              background:
                status.type === "success"
                  ? "#ecfdf3"
                  : status.type === "error"
                  ? "#fef2f2"
                  : "#eef2ff",
              color:
                status.type === "success"
                  ? "#166534"
                  : status.type === "error"
                  ? "#991b1b"
                  : "#312e81",
              border:
                status.type === "success"
                  ? "1px solid #bbf7d0"
                  : status.type === "error"
                  ? "1px solid #fecdd3"
                  : "1px solid #e0e7ff"
            }}
          >
            {status.message}
          </div>
        )}

        {["style", "complexity", "duplication", "comment"].map((key) => (
          <div key={key} style={{ marginBottom: "12px" }}>
            <label style={{ display: "block", marginBottom: "6px", textTransform: "capitalize", fontWeight: 600 }}>
              {labelMap[key]}
            </label>
            <input
              type="number"
              step="0.05"
              min="0"
              max="1"
              value={weights[key]}
              disabled={loading}
              onChange={(e) => handleChange(key, e.target.value)}
              style={{
                width: "100%",
                padding: "10px",
                borderRadius: "10px",
                border: "1px solid #d1d5db"
              }}
            />
          </div>
        ))}

        <div style={{ marginTop: "12px", fontWeight: 600 }}>
          Tổng trọng số: {total.toFixed(2)} (hệ thống sẽ tự chuẩn hoá về tổng 1.0 khi lưu)
        </div>

        <button
          onClick={handleSave}
          disabled={saving || loading}
          style={{
            marginTop: "16px",
            padding: "10px 16px",
            borderRadius: "10px",
            border: "none",
            background: saving || loading ? "#d1d5db" : "#2563eb",
            color: "white",
            fontWeight: 600,
            cursor: saving || loading ? "not-allowed" : "pointer"
          }}
        >
          {saving ? "Đang lưu..." : "Lưu cấu hình"}
        </button>
      </div>
    </div>
  );
}
