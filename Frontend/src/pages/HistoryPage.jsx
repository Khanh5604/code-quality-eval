import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/client";

const languages = [
  { label: "Tự động nhận diện", value: "auto" },
  { label: "JavaScript / TypeScript", value: "javascript" },
  { label: "Python", value: "python" },
  { label: "Java", value: "java" },
];

export default function UploadPage() {
  const [projectName, setProjectName] = useState("");
  const [description, setDescription] = useState("");
  const [language, setLanguage] = useState("auto");
  const [uploadMethod, setUploadMethod] = useState("file");
  const [repoLink, setRepoLink] = useState("");
  const [file, setFile] = useState(null);
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!file) {
      setError("Vui lòng chọn file .zip để phân tích.");
      return;
    }

    const formData = new FormData();
    formData.append("projectZip", file);
    formData.append("projectName", projectName);
    if (description) formData.append("description", description);
    if (language !== "auto") formData.append("language", language);

    try {
      setLoading(true);
      const res = await api.post("/analyze", formData);
      navigate(`/result/${res.data.id}`);
    } catch (err) {
      setError("Có lỗi xảy ra khi phân tích.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={ui.page}>
      {/* ===== HEADER GIỐNG HISTORY ===== */}
      <div style={ui.headerRow}>
        <div>
          <p style={ui.overline}>PHÂN TÍCH</p>
          <h1 style={ui.title}>Thêm dự án mới</h1>
          <p style={ui.subtitle}>
            Nhập thông tin và tải mã nguồn để hệ thống tiến hành phân tích tự động
          </p>
        </div>
      </div>

      {/* ===== CARD GIỐNG HISTORY ===== */}
      <div style={ui.card}>
        <form onSubmit={handleSubmit}>
          <div style={ui.field}>
            <label style={ui.label}>Tên dự án *</label>
            <input
              style={ui.input}
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              required
            />
          </div>

          <div style={ui.field}>
            <label style={ui.label}>Mô tả dự án</label>
            <textarea
              style={{ ...ui.input, minHeight: 90 }}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div style={ui.field}>
            <label style={ui.label}>Ngôn ngữ mã nguồn</label>
            <select
              style={ui.input}
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
            >
              {languages.map((l) => (
                <option key={l.value} value={l.value}>
                  {l.label}
                </option>
              ))}
            </select>
          </div>

          <div style={ui.dropzone}>
            <p style={{ fontWeight: 600 }}>Kéo & thả file .zip vào đây</p>
            <input
              type="file"
              accept=".zip"
              onChange={(e) => setFile(e.target.files?.[0])}
            />
            {file && <p>Đã chọn: <strong>{file.name}</strong></p>}
          </div>

          {error && <div style={ui.error}>{error}</div>}

          <div style={ui.actions}>
            <button type="submit" style={ui.primaryBtn} disabled={loading}>
              {loading ? "Đang phân tích..." : "Bắt đầu phân tích"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
const ui = {
  page: {
    display: "flex",
    flexDirection: "column",
    gap: 16,
  },

  headerRow: {
    padding: "12px 0",
  },

  overline: {
    textTransform: "uppercase",
    letterSpacing: 1.2,
    fontSize: 11,
    color: "#94a3b8",
    fontWeight: 700,
    margin: 0,
  },

  title: {
    margin: "4px 0",
    fontSize: 24,
    fontWeight: 800,
    color: "#0f172a",
  },

  subtitle: {
    margin: 0,
    color: "#475569",
    fontSize: 14,
  },

  card: {
    background: "#fff",
    borderRadius: 12,
    padding: 24,
    boxShadow: "0 8px 24px rgba(15,23,42,0.08)",
    border: "1px solid #e2e8f0",
    maxWidth: 1100,
    margin: "0 auto",   // 👈 QUAN TRỌNG
    width: "100%",
  },

  field: { marginBottom: 14 },
  label: { fontWeight: 600, marginBottom: 6, display: "block" },
  input: {
    width: "100%",
    padding: "10px 12px",
    borderRadius: 8,
    border: "1px solid #e2e8f0",
  },

  dropzone: {
    border: "2px dashed #e2e8f0",
    borderRadius: 12,
    padding: 20,
    textAlign: "center",
    marginTop: 16,
  },

  actions: {
    display: "flex",
    justifyContent: "flex-end",
    marginTop: 16,
  },

  primaryBtn: {
    background: "#2563eb",
    color: "#fff",
    border: "none",
    padding: "10px 18px",
    borderRadius: 8,
    fontWeight: 700,
    cursor: "pointer",
  },

  error: {
    marginTop: 12,
    color: "#b91c1c",
    background: "#fef2f2",
    padding: 10,
    borderRadius: 8,
  },
};
