import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/client";

/* ================= CONSTANT ================= */
const ZIP_STRUCTURE = `
project-name.zip
|- src/
|  |- index.js
|  |- app.js
|  |- ...
|- package.json
|- README.md
|- tsconfig.json (neu co)
`.trim();

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

  const handleFileChange = (f) => {
    setFile(f || null);
    if (f) setError("");
  };

  const onDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files?.[0];
    if (f && f.name.endsWith(".zip")) {
      handleFileChange(f);
    } else {
      setError("Vui lòng chọn tệp .zip hợp lệ.");
    }
  };

  const resetForm = () => {
    setProjectName("");
    setDescription("");
    setLanguage("auto");
    setUploadMethod("file");
    setRepoLink("");
    setFile(null);
    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (uploadMethod === "link") {
      setError("Hiện tại hệ thống chỉ hỗ trợ phân tích từ file .zip.");
      return;
    }

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
      const res = await api.post("/analyze", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      navigate(`/result/${res.data.id}`);
    } catch (err) {
      setError(err?.response?.data?.message || "Có lỗi xảy ra khi phân tích.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={ui.page}>
      {/* ===== HEADER NGOÀI (GIỐNG HISTORY) ===== */}
      <div style={ui.headerRow}>
        <p style={ui.overline}>PHÂN TÍCH</p>
        <h1 style={ui.title}>Thêm dự án mới</h1>
        <p style={ui.subtitle}>
          Nhập thông tin và tải mã nguồn để hệ thống tiến hành phân tích tự động.
        </p>
      </div>

      {/* ===== CARD ===== */}
      <div style={ui.card}>
        <form onSubmit={handleSubmit}>
          {/* ===== SECTION: THÔNG TIN DỰ ÁN ===== */}
          <div style={ui.sectionDivider}>Thông tin dự án</div>

          <div style={ui.field}>
            <label style={ui.label}>Tên dự án *</label>
            <input
              style={ui.input}
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              placeholder="Nhập tên dự án..."
              required
            />
          </div>

          <div style={ui.field}>
            <label style={ui.label}>Mô tả dự án</label>
            <textarea
              style={{ ...ui.input, minHeight: 90 }}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Mô tả ngắn về chức năng và mục tiêu của dự án..."
            />
          </div>

          <div style={ui.field}>
            <label style={ui.label}>Ngôn ngữ mã nguồn *</label>
            <select
              style={ui.input}
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
            >
              {languages.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* ===== SECTION: MÃ NGUỒN ===== */}
          <div style={ui.sectionDivider}>Mã nguồn</div>

          <div style={ui.field}>
            <label style={ui.label}>Cách lấy mã nguồn</label>
            <div style={ui.toggleRow}>
              <button
                type="button"
                onClick={() => setUploadMethod("file")}
                style={{
                  ...ui.toggleBtn,
                  background:
                    uploadMethod === "file" ? "#e0e7ff" : "#f8fafc",
                  color: uploadMethod === "file" ? "#1d4ed8" : "#0f172a",
                  borderColor:
                    uploadMethod === "file" ? "#c7d2fe" : "#e2e8f0",
                }}
              >
                Tải file .zip
              </button>
              <button
                type="button"
                onClick={() => setUploadMethod("link")}
                style={{
                  ...ui.toggleBtn,
                  background:
                    uploadMethod === "link" ? "#e0e7ff" : "#f8fafc",
                  color: uploadMethod === "link" ? "#1d4ed8" : "#0f172a",
                  borderColor:
                    uploadMethod === "link" ? "#c7d2fe" : "#e2e8f0",
                }}
              >
                Dán link GitHub/GitLab
              </button>
            </div>
            {uploadMethod === "link" && (
              <div style={ui.warning}>
                Chưa hỗ trợ phân tích trực tiếp từ link GitHub/GitLab. Vui lòng tải file .zip để tiếp tục.
              </div>
            )}
          </div>

          {uploadMethod === "file" && (
            <>
              <div
                style={{
                  ...ui.dropzone,
                  ...(dragging ? ui.dropActive : {}),
                }}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragging(true);
                }}
                onDragLeave={() => setDragging(false)}
                onDrop={onDrop}
                onClick={() =>
                  document.getElementById("projectZipInput")?.click()
                }
              >
                <div style={ui.dropIcon}>⬆️</div>
                <p style={ui.dropTitle}>Kéo & thả tệp mã nguồn vào đây</p>
                <p style={ui.dropHint}>Hoặc nhấn để chọn tệp thủ công (.zip)</p>

                <input
                  id="projectZipInput"
                  type="file"
                  accept=".zip"
                  hidden
                  onChange={(e) => handleFileChange(e.target.files?.[0])}
                />

                {file && (
                  <div style={ui.fileInfo}>
                    Đã chọn: <strong>{file.name}</strong>
                  </div>
                )}

                <div style={ui.dropNote}>
                  Dung lượng tối đa: 50MB · Chỉ nhận định dạng .zip
                </div>
              </div>

              {/* ===== HƯỚNG DẪN ===== */}
              <div style={ui.infoBox}>
                <div style={ui.infoTitle}>ℹ️ Hướng dẫn cấu trúc file .zip</div>
                <pre style={ui.zipTree}>{ZIP_STRUCTURE}</pre>
                <ul style={ui.noteList}>
                  <li>Chỉ nén mã nguồn của dự án</li>
                  <li>Không nén node_modules, dist, build</li>
                  <li>Không nén nhiều lớp thư mục lồng nhau</li>
                  <li>Dung lượng tối đa cho mỗi dự án là 50MB</li>
                </ul>
              </div>
            </>
          )}

          {error && <div style={ui.error}>{error}</div>}

          <div style={ui.actionRow}>
            <button
              type="button"
              style={ui.secondaryBtn}
              onClick={resetForm}
              disabled={loading}
            >
              Hủy
            </button>
            <button type="submit" style={ui.primaryBtn} disabled={loading}>
              {loading ? "Đang phân tích..." : "Bắt đầu phân tích"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ================= STYLE ================= */
const ui = {
  page: { display: "flex", flexDirection: "column", gap: 16 },

  headerRow: { padding: "12px 0" },
  overline: {
    margin: 0,
    fontSize: 11,
    letterSpacing: 1.2,
    color: "#94a3b8",
    fontWeight: 700,
  },
  title: { margin: "4px 0", fontSize: 24, fontWeight: 800 },
  subtitle: { margin: 0, fontSize: 14, color: "#475569" },

  card: {
    background: "#fff",
    borderRadius: 12,
    padding: 24,
    border: "1px solid #e2e8f0",
    boxShadow: "0 8px 24px rgba(15,23,42,0.08)",
    maxWidth: 900,
    margin: "0 auto",
    width: "100%",
  },

  sectionDivider: {
    margin: "18px 0 12px",
    borderBottom: "1px solid #e2e8f0",
    paddingBottom: 6,
    fontSize: 13,
    fontWeight: 700,
    color: "#475569",
  },

  field: { marginBottom: 14 },
  label: { marginBottom: 6, fontWeight: 600, display: "block" },
  input: {
    width: "100%",
    padding: "10px 12px",
    borderRadius: 10,
    border: "1px solid #e2e8f0",
    background: "#f8fafc",
  },

  toggleRow: { display: "flex", gap: 10 },
  toggleBtn: {
    flex: 1,
    padding: "10px",
    borderRadius: 10,
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: "#e2e8f0",
    background: "#f8fafc",
    fontWeight: 600,
    cursor: "pointer",
  },
  toggleActive: {
    background: "#e0e7ff",
    borderColor: "#c7d2fe",
    color: "#1d4ed8",
  },

  dropzone: {
    border: "2px dashed #e2e8f0",
    borderRadius: 14,
    padding: 20,
    textAlign: "center",
    cursor: "pointer",
  },
  dropActive: { background: "#f1f5ff", borderColor: "#2563eb" },
  dropIcon: { fontSize: 28 },
  dropTitle: { margin: "6px 0", fontWeight: 600 },
  dropHint: { fontSize: 13, color: "#475569" },
  dropNote: { fontSize: 12, color: "#64748b" },
  fileInfo: { marginTop: 10, fontSize: 13 },

  infoBox: {
    marginTop: 16,
    padding: 14,
    borderRadius: 12,
    border: "1px solid #e2e8f0",
    background: "#f8fafc",
  },
  infoTitle: { fontWeight: 700, marginBottom: 8 },

  zipTree: {
    background: "#ffffff",
    border: "1px dashed #cbd5f5",
    borderRadius: 8,
    padding: "12px 14px",
    fontSize: 13,
    lineHeight: 1.6,
    whiteSpace: "pre-wrap",
    wordBreak: "break-word",
    overflowX: "hidden",
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
  },

  noteList: { paddingLeft: 18, fontSize: 13, color: "#475569" },

  error: {
    background: "#fef2f2",
    color: "#b91c1c",
    padding: "10px 12px",
    borderRadius: 10,
    marginTop: 8,
  },

  warning: {
    marginTop: 8,
    padding: "10px 12px",
    borderRadius: 10,
    background: "#fff7ed",
    border: "1px solid #fed7aa",
    color: "#c2410c",
    fontSize: 13,
    lineHeight: 1.5,
  },

  actionRow: { display: "flex", justifyContent: "flex-end", gap: 10 },
  primaryBtn: {
    background: "#2563eb",
    color: "#fff",
    padding: "10px 18px",
    borderRadius: 10,
    border: "none",
    fontWeight: 700,
  },
  secondaryBtn: {
    background: "#f1f5f9",
    border: "1px solid #e2e8f0",
    padding: "10px 18px",
    borderRadius: 10,
    fontWeight: 600,
  },
};
