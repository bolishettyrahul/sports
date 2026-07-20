import React, { useState, useEffect } from "react";
import { apiService, db } from "../services/api";
import {
  BarChart3,
  Activity,
  Settings,
  Flag,
  Download,
  AlertTriangle,
  RefreshCw,
  Edit2,
  CheckCircle2,
  XCircle,
  LogOut
} from "lucide-react";

/** Equipment ids (`cricket_kit`) don't match the sport-chip classes; sport
 *  names do. See the same helper in OperatorView. */
const sportClass = (sport) => (sport || "").toLowerCase().replace(/\s+/g, "_");

const TABS = [
  { id: "dashboard", label: "Dashboard", icon: Activity },
  { id: "reports", label: "Reports", icon: BarChart3 },
  { id: "equipment", label: "Equipment & rules", icon: Settings },
  { id: "flagged", label: "Flagged alerts", icon: Flag }
];

export default function ManagerView({ user, onLogout }) {
  const [activeTab, setActiveTab] = useState("dashboard");

  const [kpis, setKpis] = useState({
    issuedToday: 142,
    uniqueStudents: 118,
    returnsToday: 96,
    lowStockAlertsCount: 4
  });
  const [lowStockAlerts, setLowStockAlerts] = useState([]);
  const [activityFeed, setActivityFeed] = useState([]);

  const [reportPeriod, setReportPeriod] = useState("WEEKLY");
  const [reportData, setReportData] = useState([]);

  const [equipmentList, setEquipmentList] = useState([]);
  const [editingItem, setEditingItem] = useState(null);
  const [restockItem, setRestockItem] = useState(null);
  const [restockQty, setRestockQty] = useState(5);
  const [equipMessage, setEquipMessage] = useState({ text: "", type: "" });

  const [oldCardRoll, setOldCardRoll] = useState("");
  const [newCardRoll, setNewCardRoll] = useState("");
  const [adminMessage, setAdminMessage] = useState({ text: "", type: "" });
  const [flaggedCards, setFlaggedCards] = useState([
    {
      id: "flag-1",
      type: "Duplicate link blocked",
      roll: "160120734",
      reason: "Card roll number is already linked to another active session. Review required."
    }
  ]);

  useEffect(() => {
    fetchBaselineData();
    const unsubscribe = apiService.subscribeToLiveStream(handleSSEMessage);
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (activeTab === "equipment") fetchEquipment();
    else if (activeTab === "reports") generateReports();
  }, [activeTab, reportPeriod]);

  const fetchBaselineData = async () => {
    fetchEquipment();

    const txs = db.getTransactions() || [];
    const students = db.getStudents() || [];
    const equipment = db.getEquipment() || [];

    const initialFeed = txs
      .map((tx) => {
        if (!tx) return null;
        const s = students.find((student) => student && student.roll_no === tx.roll_no);
        const e = equipment.find((item) => item && item.id === tx.equipment_id);
        const v = e && e.variants ? e.variants.find((varnt) => varnt && varnt.id === tx.variant_id) : null;
        return {
          timestamp: tx.checked_out_at || new Date().toISOString(),
          student_name: s ? s.name : `Roll ${tx.roll_no}`,
          action: tx.returned_at ? "returned" : "issued",
          equipment_name: e ? e.name : tx.equipment_id,
          variant_name: v ? v.name : "",
          sport: e ? e.sport : "Sports"
        };
      })
      .filter(Boolean)
      .reverse();

    setActivityFeed(initialFeed.slice(0, 10));
  };

  const fetchEquipment = async () => {
    try {
      const data = await apiService.getEquipment();
      setEquipmentList(data || []);

      const alerts = [];
      (data || []).forEach((item) => {
        if (!item || !item.variants) return;
        item.variants.forEach((variant) => {
          if (variant && variant.available_stock <= item.low_stock_threshold) {
            alerts.push({
              equipment_id: item.id,
              equipment_name: item.name,
              sport: item.sport,
              variant_id: variant.id,
              variant_name: variant.name,
              available_stock: variant.available_stock,
              threshold: item.low_stock_threshold
            });
          }
        });
      });
      setLowStockAlerts(alerts);
      setKpis((prev) => ({ ...prev, lowStockAlertsCount: alerts.length }));
    } catch (err) {
      console.error(err);
    }
  };

  const handleSSEMessage = ({ event, data }) => {
    if (event === "activity") {
      setActivityFeed((prev) => [data, ...prev].slice(0, 12));
      setKpis((prev) => {
        const isIssue = data.action === "issued";
        return {
          ...prev,
          issuedToday: isIssue ? prev.issuedToday + 1 : prev.issuedToday,
          returnsToday: !isIssue ? prev.returnsToday + 1 : prev.returnsToday
        };
      });
    } else if (event === "low_stock") {
      setLowStockAlerts((prev) => {
        const exists = prev.some((a) => a.equipment_id === data.equipment_id && a.variant_id === data.variant_id);
        if (exists) {
          return prev.map((a) =>
            a.equipment_id === data.equipment_id && a.variant_id === data.variant_id ? data : a
          );
        }
        return [data, ...prev];
      });
      setKpis((prev) => ({ ...prev, lowStockAlertsCount: prev.lowStockAlertsCount + 1 }));
    }
  };

  const handleRestockSubmit = async (e) => {
    e.preventDefault();
    if (!restockItem || restockQty <= 0) return;

    try {
      await apiService.restockEquipment(restockItem.equipment_id, restockItem.variant_id, restockQty);
      setRestockItem(null);
      setEquipMessage({ text: `Added ${restockQty} to ${restockItem.equipment_name}.`, type: "success" });
      fetchEquipment();
    } catch (err) {
      setEquipMessage({
        text: `${err.message || "Restock failed."} Stock was not changed — check the quantity and try again.`,
        type: "error"
      });
    }
  };

  const handleRuleSave = async (e) => {
    e.preventDefault();
    if (!editingItem) return;

    try {
      await apiService.updateEquipmentRules(editingItem);
      setEquipMessage({ text: `Rules updated for ${editingItem.name}.`, type: "success" });
      setEditingItem(null);
      fetchEquipment();
    } catch (err) {
      setEquipMessage({
        text: `${err.message || "Could not update the rules."} No changes were saved.`,
        type: "error"
      });
    }
  };

  const handleRelinkSubmit = async (e) => {
    e.preventDefault();
    if (!oldCardRoll || !newCardRoll) {
      setAdminMessage({ text: "Enter both the current and the replacement roll number.", type: "error" });
      return;
    }

    try {
      await apiService.relinkCard(oldCardRoll.trim(), newCardRoll.trim());
      setAdminMessage({ text: `Relinked roll ${oldCardRoll} to ${newCardRoll}.`, type: "success" });
      setOldCardRoll("");
      setNewCardRoll("");
    } catch (err) {
      setAdminMessage({ text: err.message || "Could not relink the card. Check both roll numbers.", type: "error" });
    }
  };

  const generateReports = () => {
    const reports = [
      { sport: "Basketball", issues: 212, students: 168, returns: 198, top_reason: "Free Hour" },
      { sport: "Table Tennis", issues: 140, students: 102, returns: 131, top_reason: "Lunch Hour" },
      { sport: "Cricket", issues: 98, students: 77, returns: 88, top_reason: "Practice" },
      { sport: "Volleyball", issues: 64, students: 51, returns: 60, top_reason: "Fit Hour" },
      { sport: "Carrom", issues: 42, students: 30, returns: 39, top_reason: "After College" }
    ];

    const multiplier = reportPeriod === "DAILY" ? 0.15 : reportPeriod === "MONTHLY" ? 4.2 : 1;
    setReportData(
      reports.map((r) => ({
        sport: r.sport,
        issues: Math.round(r.issues * multiplier),
        students: Math.round(r.students * multiplier),
        returns: Math.round(r.returns * multiplier),
        top_reason: r.top_reason
      }))
    );
  };

  // Blob rather than a data: URI — encodeURI breaks on '#' and hits URL length
  // limits as the report grows.
  const exportCSV = () => {
    const escape = (value) => `"${String(value).replace(/"/g, '""')}"`;
    const rows = [
      ["Sport", "Issues", "Unique Students", "Returns", "Top Reason"],
      ...reportData.map((r) => [r.sport, r.issues, r.students, r.returns, r.top_reason])
    ];
    const csv = rows.map((row) => row.map(escape).join(",")).join("\r\n");

    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `CBIT_Sports_Report_${reportPeriod.toLowerCase()}_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="app-header-brand">
          <div className="app-header-mark">CB</div>
          <div>
            <h1 style={{ fontSize: "var(--text-sm)", fontWeight: 800, lineHeight: 1.15 }}>Equipment Admin</h1>
            <span
              className="font-mono text-muted"
              style={{ fontSize: "var(--text-2xs)", textTransform: "uppercase", letterSpacing: "0.08em" }}
            >
              CBIT Sports
            </span>
          </div>
        </div>

        <div className="mgr-nav" role="tablist" aria-label="Manager sections">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const selected = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                id={`tab-${tab.id}`}
                role="tab"
                type="button"
                aria-selected={selected}
                aria-controls={`panel-${tab.id}`}
                tabIndex={selected ? 0 : -1}
                onClick={() => setActiveTab(tab.id)}
                className="tab-button"
              >
                <Icon size={14} aria-hidden="true" />
                {tab.label}
                {tab.id === "flagged" && flaggedCards.length > 0 && (
                  <span className="badge badge-out" style={{ padding: "0 6px" }}>
                    {flaggedCards.length}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <div className="app-header-actions">
          <span className="badge badge-ok">
            <RefreshCw size={11} className="animate-spin" aria-hidden="true" />
            Live stream
          </span>

          <div className="app-header-identity">
            <span style={{ fontSize: "var(--text-xs)", fontWeight: 600 }}>{user.name || "Manager"}</span>
            <span
              className="font-mono text-muted"
              style={{ fontSize: "var(--text-2xs)", textTransform: "uppercase", letterSpacing: "0.05em" }}
            >
              Manager
            </span>
          </div>

          <div className="app-avatar" aria-hidden="true">
            {user.name ? user.name.split(" ").map((n) => n[0]).join("") : "MGR"}
          </div>

          <button className="btn btn-secondary btn-icon" onClick={onLogout} aria-label="Sign out">
            <LogOut size={14} aria-hidden="true" />
          </button>
        </div>
      </header>

      <main className="mgr-content">
        {/* ------------------------------------------------------------ */}
        {/* DASHBOARD                                                     */}
        {/* ------------------------------------------------------------ */}
        {activeTab === "dashboard" && (
          <div
            id="panel-dashboard"
            role="tabpanel"
            aria-labelledby="tab-dashboard"
            className="animate-fade-in"
            style={{ display: "flex", flexDirection: "column", gap: "var(--space-xl)" }}
          >
            <div className="mgr-kpi-grid">
              {[
                { label: "Issued today", value: kpis.issuedToday, indicator: "▲ 12% vs avg", indColor: "var(--color-success)" },
                { label: "Unique students", value: kpis.uniqueStudents, indicator: "across 1 counter", indColor: "var(--color-text-dim)" },
                { label: "Returns today", value: kpis.returnsToday, indicator: "46 outstanding", indColor: "var(--color-text-muted)" },
                {
                  label: "Low-stock alerts",
                  value: kpis.lowStockAlertsCount,
                  indicator: "restock immediately",
                  indColor: kpis.lowStockAlertsCount > 0 ? "var(--color-warning)" : "var(--color-text-dim)",
                  warning: kpis.lowStockAlertsCount > 0
                }
              ].map((kpi) => (
                <div
                  key={kpi.label}
                  className="card"
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "var(--space-xs)",
                    borderColor: kpi.warning ? "var(--color-warning-border)" : "var(--color-divider)",
                    backgroundColor: kpi.warning ? "var(--color-warning-bg)" : "var(--color-surface)"
                  }}
                >
                  <span
                    className="font-mono text-muted"
                    style={{ fontSize: "var(--text-2xs)", textTransform: "uppercase", letterSpacing: "0.07em" }}
                  >
                    {kpi.label}
                  </span>
                  <b className="font-mono tabular" style={{ fontSize: "var(--text-2xl)", lineHeight: 1.1 }}>
                    {kpi.value}
                  </b>
                  <span style={{ fontSize: "var(--text-2xs)", fontWeight: 500, color: kpi.indColor }}>{kpi.indicator}</span>
                </div>
              ))}
            </div>

            <div className="mgr-split">
              <section className="mgr-panel" aria-label="Realtime stock alerts">
                <h2 className="form-label">Realtime stock alerts</h2>

                {equipMessage.text && (
                  <div
                    role="status"
                    className={`badge ${equipMessage.type === "success" ? "badge-ok" : "badge-out"}`}
                    style={{ width: "100%", padding: "var(--space-sm)" }}
                  >
                    {equipMessage.type === "success" ? (
                      <CheckCircle2 size={14} aria-hidden="true" />
                    ) : (
                      <XCircle size={14} aria-hidden="true" />
                    )}
                    {equipMessage.text}
                  </div>
                )}

                <div aria-live="polite" style={{ display: "flex", flexDirection: "column", gap: "var(--space-sm)" }}>
                  {lowStockAlerts.length === 0 ? (
                    <div
                      className="card"
                      style={{ textAlign: "center", color: "var(--color-text-muted)", borderStyle: "dashed" }}
                    >
                      No low-stock alerts. All inventory levels are normal.
                    </div>
                  ) : (
                    lowStockAlerts.map((alert) => (
                      <div
                        key={`${alert.equipment_id}-${alert.variant_id}`}
                        className="card animate-fade-in"
                        style={{
                          borderLeft: "4px solid var(--color-warning)",
                          display: "flex",
                          alignItems: "center",
                          gap: "var(--space-md)",
                          flexWrap: "wrap"
                        }}
                      >
                        <AlertTriangle size={16} aria-hidden="true" style={{ color: "var(--color-warning)", flexShrink: 0 }} />

                        <div style={{ minWidth: 0, flex: 1 }}>
                          <h3 style={{ fontSize: "var(--text-sm)", fontWeight: 700 }}>
                            {alert.equipment_name} · {alert.variant_name}
                          </h3>
                          <p style={{ fontSize: "var(--text-2xs)", color: "var(--color-text-muted)" }}>
                            {user.location || "Counter 1"} · available stock is critically low
                          </p>
                        </div>

                        <div style={{ textAlign: "right" }}>
                          <span
                            className="font-mono tabular"
                            style={{ fontSize: "var(--text-lg)", fontWeight: 700, color: "var(--color-brand-gold-dark)" }}
                          >
                            {alert.available_stock}
                          </span>
                          <span className="font-mono text-dim" style={{ fontSize: "var(--text-2xs)" }}>
                            {" "}
                            / thr {alert.threshold}
                          </span>
                        </div>

                        <button className="btn btn-secondary" onClick={() => setRestockItem(alert)}>
                          Restock
                        </button>
                      </div>
                    ))
                  )}
                </div>

                {restockItem && (
                  <form
                    onSubmit={handleRestockSubmit}
                    className="card animate-fade-in"
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "var(--space-md)",
                      border: "2px solid var(--color-brand-charcoal)"
                    }}
                  >
                    <h3 style={{ fontSize: "var(--text-sm)", fontWeight: 700 }}>
                      Restock {restockItem.equipment_name} ({restockItem.variant_name})
                    </h3>
                    <div style={{ display: "flex", gap: "var(--space-sm)", alignItems: "flex-end", flexWrap: "wrap" }}>
                      <div className="form-group" style={{ flex: 1, minWidth: "140px" }}>
                        <label className="form-label" htmlFor="restock-qty">Add quantity</label>
                        <input
                          id="restock-qty"
                          type="number"
                          className="form-input"
                          value={restockQty}
                          onChange={(e) => setRestockQty(parseInt(e.target.value, 10))}
                          min="1"
                          required
                        />
                      </div>
                      <button type="submit" className="btn btn-primary">Add to stock</button>
                      <button type="button" className="btn btn-secondary" onClick={() => setRestockItem(null)}>
                        Cancel
                      </button>
                    </div>
                  </form>
                )}
              </section>

              <section className="mgr-panel" aria-label="Live activity feed">
                <h2 className="form-label">Live activity feed</h2>
                <div className="mgr-feed" aria-live="polite">
                  {activityFeed.length === 0 ? (
                    <div style={{ padding: "var(--space-xl)", textAlign: "center", color: "var(--color-text-muted)" }}>
                      No activity yet today.
                    </div>
                  ) : (
                    activityFeed.map((activity, i) => (
                      <div
                        key={`${activity.timestamp}-${i}`}
                        className="animate-fade-in"
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "var(--space-md)",
                          padding: "var(--space-sm) var(--space-md)",
                          borderBottom: i === activityFeed.length - 1 ? "none" : "1px solid var(--color-divider-light)"
                        }}
                      >
                        <span className={`sport-chip ${sportClass(activity.sport)}`}>
                          <span className={`sport-dot ${sportClass(activity.sport)}`} />
                          {activity.sport}
                        </span>

                        <div style={{ fontSize: "var(--text-xs)", minWidth: 0 }}>
                          <strong style={{ fontWeight: 600 }}>{activity.student_name}</strong>
                          <span className="text-muted"> {activity.action} </span>
                          <strong>{activity.equipment_name}</strong>
                          {activity.variant_name && <span className="text-dim"> ({activity.variant_name})</span>}
                        </div>

                        <span className="font-mono text-dim tabular" style={{ marginLeft: "auto", fontSize: "var(--text-2xs)" }}>
                          {new Date(activity.timestamp).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit"
                          })}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </section>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------ */}
        {/* REPORTS                                                       */}
        {/* ------------------------------------------------------------ */}
        {activeTab === "reports" && (
          <div
            id="panel-reports"
            role="tabpanel"
            aria-labelledby="tab-reports"
            className="animate-fade-in"
            style={{ display: "flex", flexDirection: "column", gap: "var(--space-lg)" }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "var(--space-md)", flexWrap: "wrap" }}>
              <h2 className="form-label">Precomputed rolling summaries</h2>

              <div style={{ display: "flex", gap: "var(--space-xs)", marginLeft: "auto" }} role="group" aria-label="Report period">
                {["DAILY", "WEEKLY", "MONTHLY"].map((period) => (
                  <button
                    key={period}
                    onClick={() => setReportPeriod(period)}
                    aria-pressed={reportPeriod === period}
                    className={`btn ${reportPeriod === period ? "btn-primary" : "btn-secondary"}`}
                  >
                    {period}
                  </button>
                ))}
              </div>

              <button onClick={exportCSV} className="btn btn-secondary">
                <Download size={13} aria-hidden="true" />
                Export CSV
              </button>
            </div>

            <div className="table-container">
              <table className="table-view">
                <caption className="visually-hidden">
                  {reportPeriod.toLowerCase()} issue summary by sport
                </caption>
                <thead>
                  <tr>
                    <th scope="col">Sport</th>
                    <th scope="col" className="num-cell">Total issues</th>
                    <th scope="col" className="num-cell">Unique students</th>
                    <th scope="col" className="num-cell">Returns processed</th>
                    <th scope="col">Top issue reason</th>
                  </tr>
                </thead>
                <tbody>
                  {reportData.map((row) => (
                    <tr key={row.sport}>
                      <th scope="row">
                        <span className={`sport-chip ${sportClass(row.sport)}`}>
                          <span className={`sport-dot ${sportClass(row.sport)}`} />
                          {row.sport}
                        </span>
                      </th>
                      <td className="num-cell" style={{ fontWeight: 700 }}>{row.issues}</td>
                      <td className="num-cell">{row.students}</td>
                      <td className="num-cell">{row.returns}</td>
                      <td>
                        <span className="badge badge-info">{row.top_reason}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------ */}
        {/* EQUIPMENT & RULES                                             */}
        {/* ------------------------------------------------------------ */}
        {activeTab === "equipment" && (
          <div
            id="panel-equipment"
            role="tabpanel"
            aria-labelledby="tab-equipment"
            className="animate-fade-in"
            style={{ display: "flex", flexDirection: "column", gap: "var(--space-lg)" }}
          >
            <h2 className="form-label">Data-driven rules configuration</h2>

            {equipMessage.text && (
              <div
                role="status"
                className={`badge ${equipMessage.type === "success" ? "badge-ok" : "badge-out"}`}
                style={{ width: "100%", padding: "var(--space-sm)" }}
              >
                {equipMessage.type === "success" ? (
                  <CheckCircle2 size={14} aria-hidden="true" />
                ) : (
                  <XCircle size={14} aria-hidden="true" />
                )}
                {equipMessage.text}
              </div>
            )}

            <div className="mgr-split mgr-split-wide">
              <div style={{ display: "grid", gap: "var(--space-sm)" }}>
                {equipmentList.map((item) => (
                  <div
                    key={item.id}
                    className="card mgr-equip-row"
                  >
                    <span className={`sport-chip ${sportClass(item.sport)}`} style={{ justifySelf: "start" }}>
                      <span className={`sport-dot ${sportClass(item.sport)}`} />
                      {item.sport}
                    </span>

                    <div style={{ minWidth: 0 }}>
                      <h3 style={{ fontSize: "var(--text-sm)", fontWeight: 700 }}>{item.name}</h3>
                      <div
                        style={{
                          display: "flex",
                          gap: "var(--space-md)",
                          fontSize: "var(--text-2xs)",
                          color: "var(--color-text-muted)",
                          marginTop: "var(--space-xs)",
                          flexWrap: "wrap"
                        }}
                      >
                        <span>Gender rule: <strong>{item.gender_rule}</strong></span>
                        <span>Low-stock thr: <strong>{item.low_stock_threshold}</strong></span>
                        <span>Max issue: <strong>{item.max_issue_cap}</strong></span>
                      </div>
                    </div>

                    <button
                      className="btn btn-secondary"
                      onClick={() =>
                        setEditingItem({
                          id: item.id,
                          name: item.name,
                          gender_rule: item.gender_rule,
                          low_stock_threshold: item.low_stock_threshold,
                          max_issue_cap: item.max_issue_cap
                        })
                      }
                    >
                      <Edit2 size={12} aria-hidden="true" />
                      Edit rules
                    </button>
                  </div>
                ))}
              </div>

              {editingItem ? (
                <form
                  onSubmit={handleRuleSave}
                  className="card animate-fade-in"
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "var(--space-lg)",
                    border: "2px solid var(--color-brand-charcoal)"
                  }}
                >
                  <h3
                    style={{
                      fontSize: "var(--text-base)",
                      fontWeight: 800,
                      borderBottom: "1px solid var(--color-brand-charcoal)",
                      paddingBottom: "var(--space-sm)"
                    }}
                  >
                    Edit rules: {editingItem.name}
                  </h3>

                  <div className="form-group">
                    <label className="form-label" htmlFor="rule-gender">Gender restriction rule</label>
                    <select
                      id="rule-gender"
                      className="form-input"
                      value={editingItem.gender_rule}
                      onChange={(e) => setEditingItem((prev) => ({ ...prev, gender_rule: e.target.value }))}
                    >
                      <option value="ALL">Allow all students</option>
                      <option value="MALE">Boys only</option>
                      <option value="FEMALE">Girls only</option>
                    </select>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-md)" }}>
                    <div className="form-group">
                      <label className="form-label" htmlFor="rule-threshold">Low-stock alert trigger</label>
                      <input
                        id="rule-threshold"
                        type="number"
                        className="form-input"
                        value={editingItem.low_stock_threshold}
                        onChange={(e) =>
                          setEditingItem((prev) => ({ ...prev, low_stock_threshold: parseInt(e.target.value, 10) }))
                        }
                        min="1"
                        required
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label" htmlFor="rule-cap">Max allowed checkout limit</label>
                      <input
                        id="rule-cap"
                        type="number"
                        className="form-input"
                        value={editingItem.max_issue_cap}
                        onChange={(e) =>
                          setEditingItem((prev) => ({ ...prev, max_issue_cap: parseInt(e.target.value, 10) }))
                        }
                        min="1"
                        required
                      />
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: "var(--space-sm)" }}>
                    <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>Save rules</button>
                    <button type="button" onClick={() => setEditingItem(null)} className="btn btn-secondary" style={{ flex: 1 }}>
                      Cancel
                    </button>
                  </div>
                </form>
              ) : (
                <div
                  className="card"
                  style={{ borderStyle: "dashed", textAlign: "center", color: "var(--color-text-muted)", padding: "var(--space-xxl)" }}
                >
                  Select an item to modify its rule parameters.
                </div>
              )}
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------ */}
        {/* FLAGGED                                                       */}
        {/* ------------------------------------------------------------ */}
        {activeTab === "flagged" && (
          <div
            id="panel-flagged"
            role="tabpanel"
            aria-labelledby="tab-flagged"
            className="animate-fade-in mgr-split"
          >
            <section className="mgr-panel" aria-label="Active blocked warnings">
              <h2 className="form-label">Active blocked warnings</h2>

              {flaggedCards.length === 0 ? (
                <div className="card" style={{ borderStyle: "dashed", textAlign: "center", color: "var(--color-text-muted)" }}>
                  No active flags.
                </div>
              ) : (
                flaggedCards.map((flag) => (
                  <div
                    key={flag.id}
                    className="card"
                    style={{
                      borderLeft: "4px solid var(--color-danger)",
                      backgroundColor: "var(--color-danger-bg)",
                      display: "flex",
                      flexDirection: "column",
                      gap: "var(--space-sm)"
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "var(--space-sm)" }}>
                      <span className="badge badge-out">
                        <XCircle size={12} aria-hidden="true" />
                        {flag.type}
                      </span>
                      <span className="font-mono text-muted" style={{ fontSize: "var(--text-2xs)" }}>Roll: {flag.roll}</span>
                    </div>
                    <p style={{ fontSize: "var(--text-xs)", color: "var(--color-danger)", lineHeight: 1.4 }}>{flag.reason}</p>

                    <div style={{ display: "flex", gap: "var(--space-sm)" }}>
                      <button
                        /* Previously cleared the whole list rather than this flag. */
                        onClick={() => setFlaggedCards((prev) => prev.filter((f) => f.id !== flag.id))}
                        className="btn btn-secondary"
                      >
                        Dismiss flag
                      </button>
                      <button
                        onClick={() => {
                          setOldCardRoll(flag.roll);
                          setNewCardRoll("");
                        }}
                        className="btn btn-danger"
                      >
                        Trigger overrides
                      </button>
                    </div>
                  </div>
                ))
              )}

              <div className="card" style={{ display: "flex", flexDirection: "column", gap: "var(--space-sm)" }}>
                <h3 style={{ fontSize: "var(--text-sm)", fontWeight: 700 }}>Unmatched return override</h3>
                <p style={{ fontSize: "var(--text-xs)", color: "var(--color-text-muted)", lineHeight: 1.4 }}>
                  If a student returns a lost or damaged item, or the transaction log cannot resolve their checkout
                  automatically, a manager can declare a return record override.
                </p>
                <button className="btn btn-secondary" disabled style={{ width: "fit-content" }}>
                  Process unresolved return
                </button>
                <span className="text-muted" style={{ fontSize: "var(--text-2xs)" }}>
                  Not yet available — tracked as FR-13 in the frontend gap backlog.
                </span>
              </div>
            </section>

            <section className="mgr-panel" aria-label="Relink student ID">
              <h2 className="form-label">Relink student ID (card replacement)</h2>

              <form onSubmit={handleRelinkSubmit} className="card" style={{ display: "flex", flexDirection: "column", gap: "var(--space-md)" }}>
                <p style={{ fontSize: "var(--text-xs)", color: "var(--color-text-muted)", lineHeight: 1.4 }}>
                  Update a student's roll-number assignment — used when the college reissues a student under a changed
                  roll number.
                </p>

                {adminMessage.text && (
                  <div
                    role="status"
                    className={`badge ${adminMessage.type === "success" ? "badge-ok" : "badge-out"}`}
                    style={{ width: "100%", padding: "var(--space-sm)" }}
                  >
                    {adminMessage.type === "success" ? (
                      <CheckCircle2 size={14} aria-hidden="true" />
                    ) : (
                      <XCircle size={14} aria-hidden="true" />
                    )}
                    {adminMessage.text}
                  </div>
                )}

                <div className="form-group">
                  <label className="form-label" htmlFor="relink-old">Current / old card roll</label>
                  <input
                    id="relink-old"
                    type="text"
                    className="form-input"
                    placeholder="Enter active roll number"
                    value={oldCardRoll}
                    onChange={(e) => setOldCardRoll(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="relink-new">New replacement card roll</label>
                  <input
                    id="relink-new"
                    type="text"
                    className="form-input"
                    placeholder="Enter new roll number"
                    value={newCardRoll}
                    onChange={(e) => setNewCardRoll(e.target.value)}
                    required
                  />
                </div>

                <button type="submit" className="btn btn-primary">Perform ID relink</button>
              </form>
            </section>
          </div>
        )}
      </main>
    </div>
  );
}
