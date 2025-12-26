// src/pages/UploadPage.jsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/client";

const languages = [
  { label: "Tự động nhận diện", value: "auto" },
  { label: "JavaScript / TypeScript", value: "javascript" },
  { label: "Python", value: "python" },
  { label: "Java", value: "java" }
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
      setError("Vui lòng thả tệp .zip hợp lệ");
    }
  };

  const onDragOver = (e) => {
    e.preventDefault();
    setDragging(true);
  };

  const onDragLeave = (e) => {
    e.preventDefault();
    setDragging(false);
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
      setError("Hiện tại chỉ hỗ trợ tải file .zip. Vui lòng chọn tệp .zip.");
      return;
    }

    if (!file) {
      setError("Vui lòng chọn một file .zip");
      return;
    }

    const formData = new FormData();
    formData.append("projectZip", file);
    if (projectName) formData.append("projectName", projectName);
    if (description) formData.append("description", description);
    if (language && language !== "auto") formData.append("language", language);

    try {
      setLoading(true);
      const res = await api.post("/analyze", formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      navigate(`/result/${res.data.id}`);
    } catch (err) {
      console.error(err);
      setError(err?.response?.data?.message || "Có lỗi xảy ra khi phân tích");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={ui.page}>
      

      <div style={ui.layout}>
        {/* Form */}
        <form onSubmit={handleSubmit} style={ui.formCard}>
          <h2 style={ui.heading}>Thêm dự án mới</h2>
          <p style={ui.subheading}>
            Nhập thông tin và tải mã nguồn để tiến hành phân tích tự động.
          </p>

          <div style={ui.field}>
            <label style={ui.label}>Tên dự án*</label>
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
              style={{ ...ui.input, minHeight: 90, resize: "vertical" }}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ghi chú ngắn về dự án, chức năng, mục tiêu..."
            />
          </div>

          <div style={ui.field}>
            <label style={ui.label}>Ngôn ngữ code*</label>
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

          <div style={ui.field}>
            <label style={ui.label}>Chọn cách lấy mã nguồn</label>
            <div style={ui.toggleRow}>
              <button
                type="button"
                onClick={() => setUploadMethod("file")}
                style={{
                  ...ui.toggleBtn,
                  background: uploadMethod === "file" ? "#e0e7ff" : "#f8fafc",
                  color: uploadMethod === "file" ? "#1d4ed8" : "#0f172a",
                  borderColor: uploadMethod === "file" ? "#c7d2fe" : "#e2e8f0"
                }}
              >
                Tải file .zip
              </button>
              <button
                type="button"
                onClick={() => setUploadMethod("link")}
                style={{
                  ...ui.toggleBtn,
                  background: uploadMethod === "link" ? "#e0e7ff" : "#f8fafc",
                  color: uploadMethod === "link" ? "#1d4ed8" : "#0f172a",
                  borderColor: uploadMethod === "link" ? "#c7d2fe" : "#e2e8f0"
                }}
              >
                Dán link Github/GitLab
              </button>
            </div>
          </div>

          {uploadMethod === "link" && (
            <div style={ui.field}>
              <label style={ui.label}>Link repo (chưa hỗ trợ tự clone)</label>
              <input
                style={ui.input}
                value={repoLink}
                onChange={(e) => setRepoLink(e.target.value)}
                placeholder="https://github.com/org/repo"
              />
              <p style={ui.helper}>Hiện tại hệ thống chỉ nhận file .zip để phân tích.</p>
            </div>
          )}

          {uploadMethod === "file" && (
            <div
              style={{
                ...ui.dropzone,
                borderColor: dragging ? "#2563eb" : "#e2e8f0",
                background: dragging ? "#f8fafc" : "#f9fafb"
              }}
              onDragOver={onDragOver}
              onDragLeave={onDragLeave}
              onDrop={onDrop}
              onClick={() => document.getElementById("projectZipInput")?.click()}
            >
              <div style={{ fontSize: 32 }}>☁️</div>
              <p style={{ margin: "6px 0", fontWeight: 600 }}>Kéo & thả tệp mã nguồn vào đây</p>
              <p style={{ margin: 0, color: "#475569", fontSize: 13 }}>
                Hoặc nhấn để chọn tệp thủ công (.zip)
              </p>
              <input
                id="projectZipInput"
                type="file"
                accept=".zip"
                style={{ display: "none" }}
                onChange={(e) => handleFileChange(e.target.files?.[0])}
              />
              {file && (
                <div style={{ marginTop: 10, color: "#0f172a", fontSize: 13 }}>
                  Đã chọn: <strong>{file.name}</strong>
                </div>
              )}
              <div style={{ marginTop: 8, fontSize: 12, color: "#64748b" }}>
                Dung lượng tối đa: 50MB, chỉ nhận định dạng .zip
              </div>
            </div>
          )}

          {error && <div style={ui.error}>{error}</div>}

          <div style={ui.actionRow}>
            <button type="button" style={ui.secondaryBtn} onClick={resetForm} disabled={loading}>
              Hủy
            </button>
            <button type="submit" style={ui.primaryBtn} disabled={loading}>
              {loading ? "Đang phân tích..." : "Bắt đầu phân tích"}
            </button>
          </div>
        </form>

        {/* Preview / help panel */}
        <aside style={ui.sideCard}>
          <div style={ui.sideIcon}>⬆️</div>
          <p style={{ fontWeight: 700, margin: "8px 0" }}>Kéo & thả tệp mã nguồn vào đây</p>
          <p style={ui.sideText}>Hoặc nhấn để chọn tệp thủ công (.zip)</p>
          <p style={ui.sideText}>Dung lượng tối đa: 50MB, chỉ nhận định dạng .zip</p>
        </aside>
      </div>
    </div>
  );
}

const ui = {
  page: {
    padding: 24,
    background: "#f8fafc",
    minHeight: "100vh"
  },
  breadcrumb: {
    fontSize: 14,
    color: "#475569",
    marginBottom: 12
  },
  layout: {
    display: "grid",
    gridTemplateColumns: "2fr 1fr",
    gap: 24,
    alignItems: "start"
  },
  formCard: {
    background: "#ffffff",
    borderRadius: 16,
    padding: 24,
    boxShadow: "0 10px 30px rgba(15, 23, 42, 0.06)"
  },
  sideCard: {
    background: "#ffffff",
    borderRadius: 16,
    padding: 20,
    boxShadow: "0 10px 30px rgba(15, 23, 42, 0.06)",
    textAlign: "center",
    minHeight: 260,
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    gap: 6
  },
  heading: {
    fontSize: 20,
    fontWeight: 700,
    margin: 0
  },
  subheading: {
    margin: "6px 0 18px",
    color: "#475569",
    fontSize: 14
  },
  field: {
    marginBottom: 14
  },
  label: {
    display: "block",
    marginBottom: 6,
    fontWeight: 600,
    color: "#0f172a",
    fontSize: 14
  },
  input: {
    width: "100%",
    padding: "10px 12px",
    borderRadius: 10,
    border: "1px solid #e2e8f0",
    background: "#f8fafc",
    fontSize: 14
  },
  toggleRow: {
    display: "flex",
    gap: 10
  },
  toggleBtn: {
    flex: 1,
    padding: "10px 12px",
    borderRadius: 10,
    border: "1px solid #e2e8f0",
    cursor: "pointer",
    fontWeight: 600
  },
  dropzone: {
    border: "2px dashed #e2e8f0",
    borderRadius: 14,
    padding: 20,
    textAlign: "center",
    cursor: "pointer",
    transition: "all 0.2s ease"
  },
  actionRow: {
    display: "flex",
    justifyContent: "flex-end",
    gap: 10,
    marginTop: 16
  },
  primaryBtn: {
    background: "#2563eb",
    color: "white",
    border: "none",
    padding: "10px 18px",
    borderRadius: 10,
    fontWeight: 700,
    cursor: "pointer",
    minWidth: 150
  },
  secondaryBtn: {
    background: "#f1f5f9",
    color: "#0f172a",
    border: "1px solid #e2e8f0",
    padding: "10px 18px",
    borderRadius: 10,
    fontWeight: 600,
    cursor: "pointer"
  },
  error: {
    background: "#fef2f2",
    color: "#b91c1c",
    padding: "10px 12px",
    borderRadius: 10,
    marginTop: 8
  },
  helper: {
    marginTop: 6,
    color: "#475569",
    fontSize: 13
  },
  sideIcon: {
    fontSize: 32
  },
  sideText: {
    margin: 0,
    color: "#475569",
    fontSize: 13
  }
};
