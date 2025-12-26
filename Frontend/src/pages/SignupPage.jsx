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
  const nav = useNavigate();

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
          phone: phone || undefined
        }
      }
    });
    setLoading(false);

    if (error) return setErr(error.message);
    nav("/login");
  };

  return (
    <div style={ui.page}>
      <div style={ui.panelLeft}>
        <div style={ui.logoRow}>
          <div style={ui.logoIcon}>{"</>"}</div>
          <div>
            <div style={ui.logoTitle}>CodeReviewAI</div>
            <div style={ui.logoSub}>Hệ thống đánh giá mã tự động</div>
          </div>
        </div>
        <p style={ui.lead}>Hỗ trợ sinh viên và lập trình viên cải thiện chất lượng mã nguồn.</p>
        <div style={ui.illustration}>🚀</div>
      </div>

      <div style={ui.panelRight}>
        <div style={ui.card}>
          <h2 style={ui.title}>Đăng ký</h2>
          <p style={ui.subtitle}>Tạo tài khoản để bắt đầu</p>

          <form style={ui.form} onSubmit={onSubmit}>
            <label style={ui.label}>Họ tên</label>
            <input
              style={ui.input}
              type="text"
              placeholder="Nguyễn Văn A"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
            />

            <label style={ui.label}>Email</label>
            <input
              style={ui.input}
              type="email"
              placeholder="example@gmail.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />

            <label style={ui.label}>Mật khẩu</label>
            <input
              style={ui.input}
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />

            <label style={ui.label}>Xác nhận mật khẩu</label>
            <input
              style={ui.input}
              type="password"
              placeholder="Nhập lại mật khẩu"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />

            <label style={ui.label}>Số điện thoại (tuỳ chọn)</label>
            <input
              style={ui.input}
              type="tel"
              placeholder="09xx xxx xxx"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />

            {err && <div style={ui.error}>{err}</div>}

            <button style={ui.primaryBtn} type="submit" disabled={loading}>
              {loading ? "Đang đăng ký..." : "Đăng ký"}
            </button>

            <div style={ui.divider}>Hoặc</div>

            <button style={ui.googleBtn} type="button" onClick={() => setErr("Vui lòng dùng email/mật khẩu.")}>
              <span style={{ marginRight: 8 }}>🔒</span> Đăng ký với Google
            </button>
          </form>

          <div style={ui.footerText}>
            Đã có tài khoản? <Link to="/login" style={ui.link}>Đăng nhập</Link>
          </div>
        </div>
      </div>
    </div>
  );
}

const ui = {
  page: {
    display: "grid",
    gridTemplateColumns: "1.2fr 1fr",
    minHeight: "100vh",
    background: "#eef2ff"
  },
  panelLeft: {
    background: "linear-gradient(135deg, #1d4ed8, #2563eb)",
    color: "#fff",
    padding: "40px 48px",
    display: "flex",
    flexDirection: "column",
    gap: 16,
    justifyContent: "center"
  },
  logoRow: {
    display: "flex",
    alignItems: "center",
    gap: 12
  },
  logoIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    background: "rgba(255,255,255,0.18)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: 800,
    border: "1px solid rgba(255,255,255,0.2)"
  },
  logoTitle: {
    fontSize: 20,
    fontWeight: 800,
    margin: 0
  },
  logoSub: {
    margin: 0,
    opacity: 0.9
  },
  lead: {
    margin: "12px 0 0",
    fontSize: 15,
    lineHeight: 1.6
  },
  illustration: {
    marginTop: 24,
    fontSize: 48,
    textAlign: "center"
  },
  panelRight: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "32px 24px"
  },
  card: {
    width: "100%",
    maxWidth: 420,
    background: "#fff",
    borderRadius: 12,
    padding: 28,
    boxShadow: "0 18px 40px rgba(15,23,42,0.12)"
  },
  title: {
    margin: "0 0 4px",
    fontSize: 22,
    fontWeight: 800,
    color: "#0f172a"
  },
  subtitle: {
    margin: "0 0 20px",
    color: "#475569",
    fontSize: 14
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: 10
  },
  label: {
    fontWeight: 600,
    fontSize: 13,
    color: "#0f172a"
  },
  input: {
    width: "100%",
    padding: "10px 12px",
    borderRadius: 10,
    border: "1px solid #e2e8f0",
    background: "#f8fafc",
    outline: "none",
    fontSize: 14
  },
  error: {
    color: "#b91c1c",
    fontSize: 13
  },
  primaryBtn: {
    marginTop: 4,
    padding: "12px 14px",
    borderRadius: 10,
    border: "none",
    background: "#2563eb",
    color: "#fff",
    fontWeight: 700,
    cursor: "pointer"
  },
  divider: {
    textAlign: "center",
    color: "#94a3b8",
    fontSize: 13,
    margin: "6px 0"
  },
  googleBtn: {
    padding: "12px 14px",
    borderRadius: 10,
    border: "1px solid #e2e8f0",
    background: "#fff",
    cursor: "pointer",
    fontWeight: 700,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#0f172a"
  },
  footerText: {
    marginTop: 12,
    textAlign: "center",
    color: "#475569"
  },
  link: {
    color: "#2563eb",
    fontWeight: 700,
    textDecoration: "none"
  }
};
