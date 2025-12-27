import React, { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";

const navItems = [
  { label: "Thêm dự án", to: "/" },
  { label: "Tổng quan", to: "/dashboard" },
  { label: "Dự án", to: "/history" },
  { label: "So sánh", to: "/compare" },
  { label: "Cài đặt", to: "/settings" },
];

export default function Layout({ children }) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== "undefined" && window.matchMedia
      ? window.matchMedia("(max-width: 900px)").matches
      : false
  );
  const [user, setUser] = useState(null);
  const menuRef = useRef(null);
  const sidebarRef = useRef(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data?.user || null));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user || null);
    });
    return () => sub?.subscription?.unsubscribe();
  }, []);

  // Detect mobile viewport
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 900px)");
    const handle = (e) => setIsMobile(e.matches);
    handle(mq);
    mq.addEventListener("change", handle);
    return () => mq.removeEventListener("change", handle);
  }, []);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
      if (sidebarRef.current && !sidebarRef.current.contains(e.target)) {
        setSidebarOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Close sidebar on route change for mobile
  useEffect(() => {
    if (isMobile) setSidebarOpen(false);
  }, [pathname, isMobile]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setMenuOpen(false);
    navigate("/login", { replace: true });
  };

  const displayName =
    user?.user_metadata?.full_name?.trim() || user?.email || "Guest";
  const initial = displayName.charAt(0)?.toUpperCase() || "?";

  return (
    <div style={ui.app}>
      {/* Sidebar */}
      <aside
        ref={sidebarRef}
        className="layout-sidebar"
        style={{
          ...ui.sidebar,
          ...(isMobile ? ui.sidebarMobile : {}),
          ...(isMobile && sidebarOpen ? ui.sidebarMobileOpen : {}),
        }}
      >
        <div style={ui.brand}>
          <div style={ui.logo}>{"</>"}</div>
          <div style={ui.brandName}>CodeAnalyzer</div>
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
                  ...(active ? ui.navActive : {}),
                }}
                onMouseEnter={(e) => {
                  if (!active) {
                    e.currentTarget.style.background = ui.navHover.background;
                    e.currentTarget.style.color = ui.navHover.color;
                  }
                }}
                onMouseLeave={(e) => {
                  if (!active) {
                    e.currentTarget.style.background = "transparent";
                    e.currentTarget.style.color = "#374151";
                  }
                }}
                onClick={() => {
                  if (isMobile) setSidebarOpen(false);
                }}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Content */}
      <div style={ui.content}>
        {/* Topbar */}
        <header style={ui.topbar}>
          <div style={ui.topbarLeft}>
            {isMobile && (
              <button
                type="button"
                style={ui.menuBtn}
                onClick={() => setSidebarOpen((v) => !v)}
              >
                ☰
              </button>
            )}
          </div>
          <div style={ui.user} ref={menuRef}>
            <div style={ui.userName}>{displayName}</div>
            <div
              style={ui.avatar}
              onClick={() => setMenuOpen((v) => !v)}
            >
              {initial}
            </div>

            {menuOpen && (
              <div style={ui.userMenu}>
                <div style={ui.userMenuHeader}>
                  <div style={ui.userNameStrong}>{displayName}</div>
                  <div style={ui.userEmail}>{user?.email}</div>
                </div>

                <button
                  style={ui.logoutBtn}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.background = "#fee2e2")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.background = "#f8fafc")
                  }
                  onClick={handleLogout}
                >
                  Đăng xuất
                </button>
              </div>
            )}
          </div>
        </header>

        <main style={ui.main}>{children}</main>
      </div>

      {isMobile && sidebarOpen && (
        <div style={ui.backdrop} onClick={() => setSidebarOpen(false)} />
      )}
    </div>
  );
}
const ui = {
  app: {
    display: "flex",
    height: "100vh",
    background: "#f8fafc",
    fontFamily: "'Inter', system-ui, sans-serif",
  },

  sidebar: {
    width: 240,
    background: "#ffffff",
    borderRight: "1px solid #e5e7eb",
    padding: 16,
    transition: "transform 0.2s ease",
    zIndex: 20,
  },

  sidebarMobile: {
    position: "fixed",
    left: 0,
    top: 0,
    bottom: 0,
    transform: "translateX(-110%)",
    boxShadow: "0 10px 30px rgba(15,23,42,0.12)",
    background: "#ffffff",
  },

  sidebarMobileOpen: {
    transform: "translateX(0)",
  },

  brand: {
    display: "flex",
    gap: 10,
    alignItems: "center",
    marginBottom: 24,
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
    fontWeight: 700,
  },

  brandName: {
    fontWeight: 700,
    color: "#0f172a",
  },

  nav: {
    display: "flex",
    flexDirection: "column",
    gap: 6,
  },

  navItem: {
    padding: "10px 14px",
    borderRadius: 8,
    textDecoration: "none",
    color: "#374151",
    fontWeight: 500,
    transition: "background 0.15s ease, color 0.15s ease",
  },

  navHover: {
    background: "#e0e7ff",
    color: "#1d4ed8",
  },

  navActive: {
    background: "#e0e7ff",
    color: "#1d4ed8",
    fontWeight: 600,
  },

  content: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
  },

  topbar: {
    height: 56,
    background: "#ffffff",
    borderBottom: "1px solid #e5e7eb",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "0 20px",
  },

  topbarLeft: {
    display: "flex",
    alignItems: "center",
    gap: 10,
  },

  menuBtn: {
    border: "1px solid #e5e7eb",
    background: "#ffffff",
    borderRadius: 8,
    padding: "8px 10px",
    cursor: "pointer",
    fontSize: 16,
  },

  user: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    position: "relative",
  },

  userName: {
    fontSize: 14,
    fontWeight: 600,
    color: "#0f172a",
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
    cursor: "pointer",
  },

  userMenu: {
    position: "absolute",
    top: 44,
    right: 0,
    background: "#ffffff",
    border: "1px solid #e5e7eb",
    borderRadius: 10,
    boxShadow: "0 10px 30px rgba(15,23,42,0.12)",
    minWidth: 220,
    padding: 12,
    zIndex: 10,
  },

  userMenuHeader: {
    borderBottom: "1px solid #e5e7eb",
    paddingBottom: 8,
    marginBottom: 10,
  },

  userNameStrong: {
    fontWeight: 700,
    fontSize: 14,
    color: "#0f172a",
  },

  userEmail: {
    fontSize: 12,
    color: "#6b7280",
  },

  logoutBtn: {
    width: "100%",
    padding: "8px 10px",
    borderRadius: 8,
    border: "1px solid #e5e7eb",
    background: "#f8fafc",
    fontWeight: 600,
    color: "#b91c1c",
    cursor: "pointer",
    transition: "background 0.15s ease",
  },

  main: {
    flex: 1,
    padding: 24,
    overflowY: "auto",
  },

  backdrop: {
    position: "fixed",
    inset: 0,
    background: "rgba(15,23,42,0.35)",
    zIndex: 10,
  },
};
