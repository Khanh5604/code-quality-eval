import React, { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";

const navItems = [
  { label: "Thêm dự án", to: "/", primary: true },
  { label: "Tổng quan", to: "/dashboard" },
  { label: "Dự án", to: "/history" },
  { label: "So sánh", to: "/compare" },
  { label: "Cài đặt", to: "/settings" },
];

export default function Layout({ children }) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [user, setUser] = useState(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data?.user || null));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
    });
    return () => sub?.subscription?.unsubscribe();
  }, []);

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (_err) {
      // best-effort sign-out
    }
    setUser(null);
    setMenuOpen(false);
    navigate("/login", { replace: true });
  };

  const displayName = user?.user_metadata?.full_name?.trim() || user?.email || "Guest";
  const initial = displayName.charAt(0)?.toUpperCase() || "?";

  return (
    <div className="app-shell" style={ui.app}>
      {/* Sidebar */}
      <aside className="layout-sidebar" style={ui.sidebar}>
        <div style={ui.brand}>
          <div style={ui.logo}>{"</>"}</div>
          <div>
            <div style={ui.brandName}>CodeAnalyzer</div>
            <div style={ui.brandSub}>AI Platform</div>
          </div>
        </div>

        <nav style={ui.nav}>
          {navItems.map((item) => {
            const active = pathname === item.to;
            return (
              <Link
                key={item.label}
                to={item.to}
                style={{
                  ...ui.navItem,
                  ...(item.primary ? ui.primaryNav : {}),
                  ...(active ? ui.navActive : {})
                }}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Content */}
      <div className="layout-content" style={ui.content}>
        {/* Topbar */}
        <header className="layout-topbar" style={ui.topbar}>
          <div />
          <div style={ui.user}>
            <div style={ui.userName}>{displayName}</div>
            <div style={ui.avatar} onClick={() => setMenuOpen(!menuOpen)}>{initial}</div>
            {menuOpen && (
              <div style={ui.userMenu}>
                <div style={ui.userMenuSection}>
                  <div style={ui.userNameStrong}>{displayName}</div>
                  <div style={ui.userEmail}>{user?.email || ""}</div>
                </div>
                <button style={ui.logoutBtn} type="button" onClick={handleLogout}>Đăng xuất</button>
              </div>
            )}
          </div>
        </header>

        <main className="layout-main" style={ui.main}>{children}</main>
      </div>
    </div>
  );
}

const ui = {
  app: {
    display: "flex",
    height: "100vh",
    overflow: "hidden",
    background: "#f8fafc",
    fontFamily: "'Inter', system-ui, sans-serif"
  },

  sidebar: {
    width: 240,
    background: "#ffffff",
    borderRight: "1px solid #e5e7eb",
    padding: 16
  },

  brand: {
    display: "flex",
    gap: 10,
    alignItems: "center",
    marginBottom: 24
  },

  logo: {
    width: 36,
    height: 36,
    borderRadius: 8,
    background: "#2563eb",
    color: "#fff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: 700
  },

  brandName: {
    fontWeight: 700
  },

  brandSub: {
    fontSize: 12,
    color: "#6b7280"
  },

  nav: {
    display: "flex",
    flexDirection: "column",
    gap: 6
  },

  navItem: {
    padding: "10px 14px",
    borderRadius: 8,
    textDecoration: "none",
    color: "#374151",
    fontWeight: 500
  },

  navActive: {
    background: "#e0e7ff",
    color: "#1d4ed8"
  },

  primaryNav: {
    background: "#2563eb",
    color: "#fff",
    fontWeight: 600
  },

  content: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    height: "100%",
    overflow: "hidden"
  },

  topbar: {
    height: 56,
    background: "#ffffff",
    borderBottom: "1px solid #e5e7eb",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "0 20px"
  },

  user: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    position: "relative"
  },

  userName: {
    fontSize: 14,
    color: "#0f172a",
    fontWeight: 600
  },

  avatar: {
    width: 32,
    height: 32,
    borderRadius: "50%",
    background: "#2563eb",
    color: "#fff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: 700,
    cursor: "pointer"
  },

  userMenu: {
    position: "absolute",
    top: 44,
    right: 0,
    background: "#ffffff",
    border: "1px solid #e5e7eb",
    borderRadius: 10,
    boxShadow: "0 10px 30px rgba(15, 23, 42, 0.12)",
    minWidth: 200,
    padding: 12,
    zIndex: 10
  },
  userMenuSection: {
    marginBottom: 10,
    borderBottom: "1px solid #e5e7eb",
    paddingBottom: 8
  },
  userNameStrong: {
    fontWeight: 700,
    fontSize: 14,
    color: "#0f172a"
  },
  userEmail: {
    fontSize: 12,
    color: "#6b7280"
  },
  logoutBtn: {
    width: "100%",
    padding: "8px 10px",
    borderRadius: 8,
    border: "1px solid #e5e7eb",
    background: "#f8fafc",
    cursor: "pointer",
    fontWeight: 600,
    color: "#b91c1c"
  },

  main: {
    padding: 24,
    flex: 1,
    overflowY: "auto"
  }
};
