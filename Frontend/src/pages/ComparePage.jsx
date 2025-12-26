import React, { useEffect, useMemo, useState } from "react";
import { api } from "../api/client";

const metricFields = [
  { key: "overall", label: "Điểm tổng" },
  { key: "style", label: "Style" },
  { key: "complexity", label: "Phức tạp" },
  { key: "duplication", label: "Trùng lặp" },
  { key: "comment", label: "Chú thích" }
];

const metaFields = [
  { key: "lintErrors", label: "Lỗi lint" },
  { key: "dupPercent", label: "Tỷ lệ trùng lặp (%)" },
  { key: "complexityAvg", label: "Độ phức tạp TB" },
  { key: "commentDensity", label: "Mật độ comment (%)" },
  { key: "codeLines", label: "Số dòng code" },
  { key: "kLOC", label: "kLOC" }
];

function formatNumber(val) {
  if (val === null || val === undefined) return "-";
  if (typeof val === "number" && Number.isFinite(val)) {
    if (Math.abs(val) >= 1000) return val.toFixed(0);
    if (Math.abs(val) >= 100) return val.toFixed(1);
    return val.toFixed(2);
  }
  return String(val);
}

function calcDelta(a, b) {
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
  return b - a;
}

function deltaStyle(delta) {
  if (!Number.isFinite(delta)) return ui.deltaNeutral;
  if (delta > 0) return ui.deltaUp;
  if (delta < 0) return ui.deltaDown;
  return ui.deltaNeutral;
}

export default function ComparePage() {
  const [list, setList] = useState([]);
  const [selectedA, setSelectedA] = useState("");
  const [selectedB, setSelectedB] = useState("");
  const [analysisA, setAnalysisA] = useState(null);
  const [analysisB, setAnalysisB] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .get("/analyses")
      .then((res) => {
        const items = res.data || [];
        setList(items);
        if (items.length >= 1) setSelectedA(items[0].id);
        if (items.length >= 2) setSelectedB(items[1].id);
      })
      .catch((err) => setError(err?.response?.data?.message || "Không tải được danh sách"));
  }, []);

  useEffect(() => {
    if (!selectedA) return;
    setLoading(true);
    api
      .get(`/analyses/${selectedA}`)
      .then((res) => setAnalysisA(res.data))
      .catch((err) => setError(err?.response?.data?.message || "Không tải được dữ liệu A"))
      .finally(() => setLoading(false));
  }, [selectedA]);

  useEffect(() => {
    if (!selectedB) return;
    setLoading(true);
    api
      .get(`/analyses/${selectedB}`)
      .then((res) => setAnalysisB(res.data))
      .catch((err) => setError(err?.response?.data?.message || "Không tải được dữ liệu B"))
      .finally(() => setLoading(false));
  }, [selectedB]);

  const paired = useMemo(() => {
    if (!analysisA || !analysisB) return [];

    const rows = [];

    rows.push({
      key: "overall",
      label: "Điểm tổng",
      a: analysisA.scores?.summary?.overall,
      b: analysisB.scores?.summary?.overall
    });

    metricFields
      .filter((m) => m.key !== "overall")
      .forEach((m) => {
        rows.push({
          key: m.key,
          label: m.label,
          a: analysisA.scores?.metrics?.[m.key],
          b: analysisB.scores?.metrics?.[m.key]
        });
      });

    metaFields.forEach((m) => {
      rows.push({
        key: m.key,
        label: m.label,
        a: analysisA.scores?.meta?.[m.key],
        b: analysisB.scores?.meta?.[m.key]
      });
    });

    return rows;
  }, [analysisA, analysisB]);

  const headerA = analysisA?.projectName || analysisA?.scores?.project_name || "A";
  const headerB = analysisB?.projectName || analysisB?.scores?.project_name || "B";

  return (
    <div style={ui.page}>
      <div style={ui.headerRow}>
        <div>
          <p style={ui.overline}>So sánh report</p>
          <h1 style={ui.title}>Đặt 2 báo cáo cạnh nhau</h1>
          <p style={ui.subtitle}>
            So sánh chất lượng mã nguồn giữa hai phiên bản: chọn hai lần phân tích để xem chênh lệch điểm tổng,
            tiêu chí (style/phức tạp/trùng lặp/comment) và các chỉ số lint, duplication.
          </p>
        </div>
      </div>

      {error && <div style={ui.error}>{error}</div>}

      <div style={ui.selectorRow}>
        <div style={ui.selector}> 
          <label style={ui.label}>Report A</label>
          <select style={ui.select} value={selectedA} onChange={(e) => setSelectedA(e.target.value)}>
            <option value="">-- chọn --</option>
            {list.map((item) => (
              <option key={item.id} value={item.id}>
                {item.projectName} — {new Date(item.createdAt).toLocaleString()}
              </option>
            ))}
          </select>
        </div>
        <div style={ui.selector}> 
          <label style={ui.label}>Report B</label>
          <select style={ui.select} value={selectedB} onChange={(e) => setSelectedB(e.target.value)}>
            <option value="">-- chọn --</option>
            {list.map((item) => (
              <option key={item.id} value={item.id}>
                {item.projectName} — {new Date(item.createdAt).toLocaleString()}
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading && <p style={ui.muted}>Đang tải dữ liệu...</p>}

      {analysisA && analysisB && (
        <div style={ui.tableWrap}>
          <table style={ui.table}>
            <thead>
              <tr>
                <th style={ui.th}></th>
                <th style={ui.th}>{headerA}</th>
                <th style={ui.th}>{headerB}</th>
                <th style={ui.th}>Δ (B - A)</th>
              </tr>
            </thead>
            <tbody>
              {paired.map((row) => {
                const delta = calcDelta(row.a, row.b);
                return (
                  <tr key={row.key} style={ui.tr}>
                    <td style={ui.tdLabel}>{row.label}</td>
                    <td style={ui.td}>{formatNumber(row.a)}</td>
                    <td style={ui.td}>{formatNumber(row.b)}</td>
                    <td style={{ ...ui.td, ...deltaStyle(delta) }}>
                      {Number.isFinite(delta) ? delta.toFixed(2) : "-"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {!loading && (!analysisA || !analysisB) && (
        <p style={ui.muted}>Chọn đủ 2 report để bắt đầu so sánh.</p>
      )}
    </div>
  );
}

const ui = {
  page: {
    display: "flex",
    flexDirection: "column",
    gap: 14
  },
  headerRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start"
  },
  overline: {
    margin: 0,
    textTransform: "uppercase",
    letterSpacing: 1,
    fontSize: 11,
    color: "#94a3b8",
    fontWeight: 700
  },
  title: {
    margin: "4px 0 4px",
    fontSize: 22,
    fontWeight: 800,
    color: "#0f172a"
  },
  subtitle: {
    margin: 0,
    color: "#475569",
    fontSize: 14
  },
  selectorRow: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
    gap: 12,
    alignItems: "end"
  },
  selector: {
    display: "flex",
    flexDirection: "column",
    gap: 6
  },
  label: {
    fontSize: 13,
    fontWeight: 700,
    color: "#0f172a"
  },
  select: {
    padding: "10px 12px",
    borderRadius: 10,
    border: "1px solid #e2e8f0",
    background: "#fff",
    fontSize: 14
  },
  tableWrap: {
    overflowX: "auto",
    borderRadius: 12,
    border: "1px solid #e2e8f0",
    background: "#fff",
    boxShadow: "0 12px 24px rgba(15,23,42,0.08)"
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    fontSize: 13
  },
  th: {
    textAlign: "left",
    padding: "12px",
    background: "#f8fafc",
    color: "#475569",
    fontWeight: 700,
    borderBottom: "1px solid #e2e8f0"
  },
  tr: {
    borderBottom: "1px solid #f1f5f9"
  },
  td: {
    padding: "12px",
    fontVariantNumeric: "tabular-nums",
    color: "#0f172a"
  },
  tdLabel: {
    padding: "12px",
    fontWeight: 700,
    color: "#0f172a",
    background: "#f8fafc",
    width: 220
  },
  deltaUp: {
    color: "#166534",
    background: "#ecfdf3",
    fontWeight: 700
  },
  deltaDown: {
    color: "#991b1b",
    background: "#fef2f2",
    fontWeight: 700
  },
  deltaNeutral: {
    color: "#475569"
  },
  muted: {
    color: "#64748b"
  },
  error: {
    background: "#fef2f2",
    color: "#b91c1c",
    border: "1px solid #fecdd3",
    padding: 12,
    borderRadius: 10
  }
};
