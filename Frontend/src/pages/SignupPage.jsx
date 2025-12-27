import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const onSubmit = async (e) => {
    e.preventDefault();
    setErr("");

    if (password !== confirmPassword) {
      setErr("Mật khẩu nhập lại không khớp.");
      return;
    }

    setLoading(true);

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName || undefined,
          phone: phone || undefined,
        },
      },
    });

    setLoading(false);

    if (error) {
      setErr(error.message);
      return;
    }

    navigate("/login");
  };

  return (
    <div style={ui.page}>
      <div style={ui.card}>
        <h1 style={ui.title}>CodeAnalyzer</h1>
        <p style={ui.subtitle}>Tạo tài khoản mới</p>

        <form style={ui.form} onSubmit={onSubmit}>
          <div>
            <label style={ui.label}>Họ tên</label>
            <input
              style={ui.input}
              type="text"
              placeholder="Nguyễn Văn A"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
            />
          </div>

          <div>
            <label style={ui.label}>Email</label>
            <input
              style={ui.input}
              type="email"
              placeholder="example@gmail.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div>
            <label style={ui.label}>Mật khẩu</label>
            <input
              style={ui.input}
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <div>
            <label style={ui.label}>Xác nhận mật khẩu</label>
            <input
              style={ui.input}
              type="password"
              placeholder="Nhập lại mật khẩu"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
          </div>

          <div>
            <label style={ui.label}>Số điện thoại (tuỳ chọn)</label>
            <input
              style={ui.input}
              type="tel"
              placeholder="09xx xxx xxx"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>

          {err && <div style={ui.error}>{err}</div>}

          <button style={ui.button} disabled={loading}>
            {loading ? "Đang đăng ký..." : "Đăng ký"}
          </button>
        </form>

        <div style={ui.footer}>
          Đã có tài khoản?{" "}
          <Link to="/login" style={ui.link}>
            Đăng nhập
          </Link>
        </div>
      </div>
    </div>
  );
}
const ui = {
  page: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "#f1f5f9",
  },

  card: {
    width: "100%",
    maxWidth: 400,
    background: "#ffffff",
    padding: 28,
    borderRadius: 10,
    boxShadow: "0 10px 30px rgba(0,0,0,0.08)",
  },

  title: {
    margin: 0,
    textAlign: "center",
    fontSize: 24,
    fontWeight: 800,
    color: "#0f172a",
  },

  subtitle: {
    margin: "8px 0 22px",
    textAlign: "center",
    fontSize: 14,
    color: "#64748b",
  },

  form: {
    display: "flex",
    flexDirection: "column",
    gap: 14,
  },

  label: {
    display: "block",
    marginBottom: 4,
    fontSize: 13,
    fontWeight: 600,
    color: "#0f172a",
  },

  input: {
    width: "100%",
    padding: "10px 12px",
    fontSize: 14,
    borderRadius: 8,
    border: "1px solid #cbd5f5",
    outline: "none",
  },

  button: {
    marginTop: 6,
    padding: "12px",
    borderRadius: 8,
    border: "none",
    background: "#2563eb",
    color: "#ffffff",
    fontWeight: 700,
    cursor: "pointer",
  },

  error: {
    fontSize: 13,
    color: "#dc2626",
  },

  footer: {
    marginTop: 18,
    textAlign: "center",
    fontSize: 14,
    color: "#475569",
  },

  link: {
    color: "#2563eb",
    fontWeight: 700,
    textDecoration: "none",
  },
};
