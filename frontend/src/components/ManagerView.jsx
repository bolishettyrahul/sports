import React, { useState, useEffect } from "react";
import { apiService, db, generateUUID } from "../services/api";
import { 
  BarChart3, 
  Activity, 
  Settings, 
  Flag, 
  Download, 
  TrendingUp, 
  Users, 
  RotateCcw, 
  AlertTriangle,
  RefreshCw,
  Edit2,
  Trash2,
  Search,
  Check,
  LogOut
} from "lucide-react";

export default function ManagerView({ user, onLogout }) {
  const [activeTab, setActiveTab] = useState("dashboard"); // dashboard, reports, equipment, flagged

  // Live data feed states
  const [kpis, setKpis] = useState({
    issuedToday: 142,
    uniqueStudents: 118,
    returnsToday: 96,
    lowStockAlertsCount: 4
  });
  const [lowStockAlerts, setLowStockAlerts] = useState([]);
  const [activityFeed, setActivityFeed] = useState([]);
  
  // Reports states
  const [reportPeriod, setReportPeriod] = useState("WEEKLY"); // DAILY, WEEKLY, MONTHLY
  const [reportData, setReportData] = useState([]);

  // Equipment Editor states
  const [equipmentList, setEquipmentList] = useState([]);
  const [editingItem, setEditingItem] = useState(null); // item rules model
  const [restockItem, setRestockItem] = useState(null); // { itemId, variantId }
  const [restockQty, setRestockQty] = useState(5);

  // Administrative / Flagged states
  const [oldCardRoll, setOldCardRoll] = useState("");
  const [newCardRoll, setNewCardRoll] = useState("");
  const [adminMessage, setAdminMessage] = useState({ text: "", type: "" });
  const [flaggedCards, setFlaggedCards] = useState([
    { id: "flag-1", type: "Duplicate link blocked", roll: "160120734", reason: "Card Roll Number already linked to another active session. Review required." }
  ]);

  // Load baseline datasets
  useEffect(() => {
    fetchBaselineData();
    
    // Subscribe to SSE Live Stream emulator
    const unsubscribe = apiService.subscribeToLiveStream((eventObj) => {
      handleSSEMessage(eventObj);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  // Recalculate states when active tab changes
  useEffect(() => {
    if (activeTab === "equipment") {
      fetchEquipment();
    } else if (activeTab === "reports") {
      generateReports();
    }
  }, [activeTab, reportPeriod]);

  const fetchBaselineData = async () => {
    // Fetch initial low stock and feed logs from mock database
    fetchEquipment();
    
    // Seed default feed activities if empty
    const txs = db.getTransactions() || [];
    const students = db.getStudents() || [];
    const equipment = db.getEquipment() || [];

    const initialFeed = txs.map(tx => {
      if (!tx) return null;
      const s = students.find(student => student && student.roll_no === tx.roll_no);
      const e = equipment.find(item => item && item.id === tx.equipment_id);
      const v = e && e.variants ? e.variants.find(varnt => varnt && varnt.id === tx.variant_id) : null;
      return {
        timestamp: tx.checked_out_at || new Date().toISOString(),
        student_name: s ? s.name : `Roll ${tx.roll_no}`,
        action: tx.returned_at ? "returned" : "issued",
        equipment_name: e ? e.name : tx.equipment_id,
        variant_name: v ? v.name : "",
        sport: e ? e.sport : "Sports"
      };
    }).filter(Boolean).reverse();

    setActivityFeed(initialFeed.slice(0, 10));
  };

  const fetchEquipment = async () => {
    try {
      const data = await apiService.getEquipment();
      setEquipmentList(data || []);

      // Filter and count low stock items
      const alerts = [];
      (data || []).forEach(item => {
        if (item && item.variants) {
          item.variants.forEach(variant => {
            if (variant && variant.available_stock <= item.low_stock_threshold) {
              alerts.push({
                equipment_id: item.id,
                equipment_name: item.name,
                variant_id: variant.id,
                variant_name: variant.name,
                available_stock: variant.available_stock,
                threshold: item.low_stock_threshold
              });
            }
          });
        }
      });
      setLowStockAlerts(alerts);
      setKpis(prev => ({
        ...prev,
        lowStockAlertsCount: alerts.length
      }));
    } catch (err) {
      console.error(err);
    }
  };

  const handleSSEMessage = (eventObj) => {
    const { event, data } = eventObj;

    if (event === "activity") {
      setActivityFeed(prev => [data, ...prev].slice(0, 12));
      
      // Update KPIs incrementally
      setKpis(prev => {
        const isIssue = data.action === "issued";
        return {
          ...prev,
          issuedToday: isIssue ? prev.issuedToday + 1 : prev.issuedToday,
          returnsToday: !isIssue ? prev.returnsToday + 1 : prev.returnsToday
        };
      });
    } else if (event === "low_stock") {
      setLowStockAlerts(prev => {
        // Avoid duplicate alerts in list
        const exists = prev.some(a => a.equipment_id === data.equipment_id && a.variant_id === data.variant_id);
        if (exists) {
          return prev.map(a => (a.equipment_id === data.equipment_id && a.variant_id === data.variant_id) ? data : a);
        }
        return [data, ...prev];
      });
      setKpis(prev => ({ ...prev, lowStockAlertsCount: prev.lowStockAlertsCount + 1 }));
    }
  };

  const handleRestockSubmit = async (e) => {
    e.preventDefault();
    if (!restockItem || restockQty <= 0) return;

    try {
      await apiService.restockEquipment(restockItem.equipment_id, restockItem.variant_id, restockQty);
      setRestockItem(null);
      fetchEquipment();
    } catch (err) {
      alert("Restock failed: " + err.message);
    }
  };

  const handleRuleSave = async (e) => {
    e.preventDefault();
    if (!editingItem) return;

    try {
      await apiService.updateEquipmentRules(editingItem);
      setEditingItem(null);
      fetchEquipment();
    } catch (err) {
      alert("Failed to update rules: " + err.message);
    }
  };

  const handleRelinkSubmit = async (e) => {
    e.preventDefault();
    if (!oldCardRoll || !newCardRoll) {
      setAdminMessage({ text: "Please enter both roll numbers.", type: "error" });
      return;
    }

    try {
      await apiService.relinkCard(oldCardRoll.trim(), newCardRoll.trim());
      setAdminMessage({ text: `Successfully relinked Card Roll ${oldCardRoll} to new ID ${newCardRoll}.`, type: "success" });
      setOldCardRoll("");
      setNewCardRoll("");
    } catch (err) {
      setAdminMessage({ text: err.message || "Failed to relink card.", type: "error" });
    }
  };

  // Generate mock rollup reports
  const generateReports = () => {
    // Predefined report stats mapping to our mock inventory
    const reports = [
      { sport: "Basketball", issues: 212, students: 168, returns: 198, top_reason: "Free Hour" },
      { sport: "Table Tennis", issues: 140, students: 102, returns: 131, top_reason: "Lunch Hour" },
      { sport: "Cricket", issues: 98, students: 77, returns: 88, top_reason: "Practice" },
      { sport: "Volleyball", issues: 64, students: 51, returns: 60, top_reason: "Fit Hour" },
      { sport: "Carrom", issues: 42, students: 30, returns: 39, top_reason: "After College" }
    ];

    // Modify counts slightly depending on reporting period for visual realism
    const multiplier = reportPeriod === "DAILY" ? 0.15 : reportPeriod === "MONTHLY" ? 4.2 : 1;
    const finalData = reports.map(r => ({
      sport: r.sport,
      issues: Math.round(r.issues * multiplier),
      students: Math.round(r.students * multiplier),
      returns: Math.round(r.returns * multiplier),
      top_reason: r.top_reason
    }));

    setReportData(finalData);
  };

  // Export report table as CSV file
  const exportCSV = () => {
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Sport,Issues,Unique Students,Returns,Top Reason\n";
    
    reportData.forEach(row => {
      csvContent += `"${row.sport}",${row.issues},${row.students},${row.returns},"${row.top_reason}"\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `CBIT_Sports_Report_${reportPeriod.toLowerCase()}_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="app-container manager-density" style={{ background: "var(--color-bg)" }}>
      <div className="device-frame" style={{ flex: 1, minHeight: "calc(100vh - 44px)", margin: "20px auto" }}>
        
        {/* TOP HEADER */}
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: "16px",
          padding: "10px 22px",
          borderBottom: "2px solid var(--color-brand-charcoal)",
          backgroundColor: "white"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div style={{
              width: "36px",
              height: "36px",
              background: "var(--color-brand-maroon)",
              color: "white",
              display: "grid",
              placeItems: "center",
              fontWeight: 800,
              fontSize: "14px",
              border: "1.5px solid var(--color-brand-charcoal)"
            }}>
              CB
            </div>
            <div>
              <h2 style={{ fontSize: "14px", fontWeight: 800, lineHeight: 1.1 }}>Equipment Admin</h2>
              <span className="font-mono text-muted" style={{ fontSize: "9px", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                CBIT Sports
              </span>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div style={{ display: "flex", gap: "2px", marginLeft: "24px", alignSelf: "stretch" }}>
            {[
              { id: "dashboard", label: "Dashboard", icon: <Activity size={14} /> },
              { id: "reports", label: "Reports", icon: <BarChart3 size={14} /> },
              { id: "equipment", label: "Equipment & Rules", icon: <Settings size={14} /> },
              { 
                id: "flagged", 
                label: `Flagged Alerts (${flaggedCards.length})`, 
                icon: <Flag size={14} />,
                badge: flaggedCards.length > 0
              }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  border: "none",
                  borderBottom: activeTab === tab.id ? "3px solid var(--color-brand-maroon)" : "3px solid transparent",
                  backgroundColor: "transparent",
                  padding: "0 16px",
                  fontSize: "13px",
                  fontWeight: 600,
                  cursor: "pointer",
                  color: activeTab === tab.id ? "var(--color-brand-charcoal)" : "var(--color-text-muted)"
                }}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>

          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: "14px" }}>
            <span className="badge badge-ok" style={{ display: "flex", alignItems: "center", gap: "4px" }}>
              <RefreshCw size={11} className="animate-spin" />
              Live Stream
            </span>

            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", lineHeight: 1.1 }}>
              <span style={{ fontSize: "12px", fontWeight: 600 }}>{user.name || "Manager"}</span>
              <span className="font-mono text-muted" style={{ fontSize: "9px", textTransform: "uppercase", letterSpacing: "0.05em" }}>Manager</span>
            </div>
            
            <div style={{
              width: "32px",
              height: "32px",
              border: "1.5px solid var(--color-brand-charcoal)",
              backgroundColor: "var(--color-bg)",
              display: "grid",
              placeItems: "center",
              fontWeight: 800,
              fontSize: "11px"
            }}>
              {user.name ? user.name.split(" ").map(n=>n[0]).join("") : "MGR"}
            </div>

            <button 
              className="btn btn-secondary touch-target" 
              onClick={onLogout}
              style={{ width: "32px", height: "32px", padding: 0 }}
            >
              <LogOut size={13} />
            </button>
          </div>
        </div>

        {/* ACTIVE TAB CONTAINER */}
        <div style={{ padding: "24px", overflowY: "auto", maxHeight: "calc(100vh - 120px)" }}>

          {/* TAB 1: DASHBOARD VIEW */}
          {activeTab === "dashboard" && (
            <div className="animate-fade-in" style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
              
              {/* KPI Scorecard Row */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "16px" }}>
                {[
                  { label: "Issued Today", value: kpis.issuedToday, indicator: "▲ 12% vs avg", indColor: "var(--color-success)" },
                  { label: "Unique Students", value: kpis.uniqueStudents, indicator: "across 1 counter", indColor: "var(--color-text-dim)" },
                  { label: "Returns Today", value: kpis.returnsToday, indicator: "46 outstanding", indColor: "var(--color-text-muted)" },
                  { 
                    label: "Low-Stock Alerts", 
                    value: kpis.lowStockAlertsCount, 
                    indicator: "restock immediately", 
                    indColor: kpis.lowStockAlertsCount > 0 ? "var(--color-warning)" : "var(--color-text-dim)",
                    warning: kpis.lowStockAlertsCount > 0
                  }
                ].map((kpi, i) => (
                  <div 
                    key={i} 
                    className="card" 
                    style={{ 
                      padding: "16px", 
                      display: "flex", 
                      flexDirection: "column", 
                      gap: "6px",
                      borderColor: kpi.warning ? "var(--color-warning-border)" : "var(--color-divider)",
                      backgroundColor: kpi.warning ? "var(--color-warning-bg)" : "white"
                    }}
                  >
                    <span className="font-mono text-muted" style={{ fontSize: "9px", textTransform: "uppercase", letterSpacing: "0.07em" }}>
                      {kpi.label}
                    </span>
                    <b className="font-mono" style={{ fontSize: "28px", lineHeight: 1.1 }}>{kpi.value}</b>
                    <span style={{ fontSize: "11px", fontWeight: 500, color: kpi.indColor }}>{kpi.indicator}</span>
                  </div>
                ))}
              </div>

              {/* Lower Section Split */}
              <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: "24px", alignItems: "start" }}>
                
                {/* Real-time Alerts Panel */}
                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  <h3 className="form-label">Realtime Stock Alerts</h3>
                  
                  {lowStockAlerts.length === 0 ? (
                    <div className="card" style={{ padding: "20px", textAlign: "center", color: "var(--color-text-dim)", borderStyle: "dashed" }}>
                      No low stock alerts triggered. All inventory levels normal.
                    </div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                      {lowStockAlerts.map((alert, i) => (
                        <div 
                          key={i} 
                          className="card animate-fade-in"
                          style={{
                            padding: "12px 16px",
                            borderLeft: "4px solid var(--color-warning)",
                            display: "flex",
                            alignItems: "center",
                            gap: "14px"
                          }}
                        >
                          <span className={`sport-chip ${alert.equipment_id}`}>
                            {alert.equipment_name.split(" ")[0]}
                          </span>
                          
                          <div>
                            <h4 style={{ fontSize: "13.5px", fontWeight: 700 }}>
                              {alert.equipment_name} · {alert.variant_name}
                            </h4>
                            <p style={{ fontSize: "11px", color: "var(--color-text-dim)" }}>
                              Counter 1 · available stock is critically low
                            </p>
                          </div>

                          <div style={{ marginLeft: "auto", textAlign: "right" }}>
                            <span className="font-mono" style={{ fontSize: "16px", fontWeight: 700, color: "var(--color-brand-gold-dark)" }}>
                              {alert.available_stock}
                            </span>
                            <span className="font-mono text-dim" style={{ fontSize: "11px" }}> / thr {alert.threshold}</span>
                          </div>

                          <button 
                            className="btn btn-secondary touch-target"
                            onClick={() => setRestockItem(alert)}
                            style={{ padding: "0 10px" }}
                          >
                            Restock
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Restock Modal/Form if selected */}
                  {restockItem && (
                    <form onSubmit={handleRestockSubmit} className="card animate-fade-in" style={{ padding: "16px", display: "flex", flexDirection: "column", gap: "12px", border: "2px solid var(--color-brand-charcoal)" }}>
                      <h4 style={{ fontSize: "14px", fontWeight: 700 }}>
                        Restock {restockItem.equipment_name} ({restockItem.variant_name})
                      </h4>
                      <div style={{ display: "flex", gap: "10px", alignItems: "flex-end" }}>
                        <div className="form-group" style={{ flex: 1 }}>
                          <label className="form-label">Add Quantity</label>
                          <input 
                            type="number" 
                            className="form-input"
                            style={{ width: "100%" }}
                            value={restockQty}
                            onChange={(e) => setRestockQty(parseInt(e.target.value))}
                            min="1"
                            required
                          />
                        </div>
                        <button type="submit" className="btn btn-primary touch-target" style={{ height: "32px", padding: "0 16px" }}>
                          Add to stock
                        </button>
                        <button type="button" className="btn btn-secondary touch-target" style={{ height: "32px" }} onClick={() => setRestockItem(null)}>
                          Cancel
                        </button>
                      </div>
                    </form>
                  )}
                </div>

                {/* Live Activity Feed Panel */}
                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  <h3 className="form-label">Live Activity Feed (Realtime)</h3>
                  <div style={{ 
                    display: "flex", 
                    flexDirection: "column", 
                    border: "1.5px solid var(--color-divider)", 
                    borderRadius: "var(--border-radius-sm)", 
                    overflow: "hidden",
                    backgroundColor: "white"
                  }}>
                    {activityFeed.map((activity, i) => (
                      <div 
                        key={i} 
                        className="animate-fade-in"
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "12px",
                          padding: "10px 14px",
                          borderBottom: i === activityFeed.length - 1 ? "none" : "1px solid var(--color-divider-light)"
                        }}
                      >
                        <span className={`sport-chip ${activity.sport.toLowerCase().replace(" ", "_")}`} style={{ padding: "2px 6px" }}>
                          {activity.sport.substring(0, 5)}
                        </span>
                        
                        <div style={{ fontSize: "12px" }}>
                          <strong style={{ fontWeight: 600 }}>{activity.student_name}</strong>
                          <span style={{ color: "var(--color-text-muted)" }}>
                            {" "}{activity.action}{" "}
                          </span>
                          <strong>{activity.equipment_name}</strong>
                          {activity.variant_name && <span className="text-dim"> ({activity.variant_name})</span>}
                        </div>

                        <span className="font-mono text-dim" style={{ marginLeft: "auto", fontSize: "10px" }}>
                          {new Date(activity.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* TAB 2: REPORTS VIEW */}
          {activeTab === "reports" && (
            <div className="animate-fade-in" style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              
              <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                <h3 className="form-label">Precomputed Rolling Summaries</h3>
                
                {/* Period Selectors */}
                <div style={{ display: "flex", gap: "4px", marginLeft: "auto" }}>
                  {["DAILY", "WEEKLY", "MONTHLY"].map(period => (
                    <button
                      key={period}
                      onClick={() => setReportPeriod(period)}
                      className={`btn touch-target ${reportPeriod === period ? 'btn-primary' : 'btn-secondary'}`}
                      style={{ height: "30px", fontSize: "11.5px" }}
                    >
                      {period}
                    </button>
                  ))}
                </div>

                <button 
                  onClick={exportCSV}
                  className="btn btn-secondary touch-target"
                  style={{ height: "30px", display: "flex", alignItems: "center", gap: "6px" }}
                >
                  <Download size={13} />
                  Export CSV
                </button>
              </div>

              {/* Reports Table */}
              <div className="table-container">
                <table className="table-view">
                  <thead>
                    <tr>
                      <th>Sport</th>
                      <th className="num-cell">Total Issues</th>
                      <th className="num-cell">Unique Students</th>
                      <th className="num-cell">Returns Processed</th>
                      <th>Top Issue Reason</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportData.map((row, i) => (
                      <tr key={i}>
                        <td style={{ fontWeight: 600 }}>
                          <span className={`sport-chip ${row.sport.toLowerCase().replace(" ", "_")}`} style={{ marginRight: "10px" }}>
                            <span className={`sport-dot ${row.sport.toLowerCase().replace(" ", "_")}`}></span>
                            {row.sport}
                          </span>
                        </td>
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

          {/* TAB 3: EQUIPMENT EDITOR */}
          {activeTab === "equipment" && (
            <div className="animate-fade-in" style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              <h3 className="form-label">Data-driven Rules Configuration</h3>

              <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: "24px", alignItems: "start" }}>
                
                {/* Equipment List Grid */}
                <div style={{ display: "grid", gap: "10px" }}>
                  {equipmentList.map(item => (
                    <div 
                      key={item.id} 
                      className="card"
                      style={{
                        padding: "16px",
                        display: "flex",
                        alignItems: "center",
                        gap: "16px"
                      }}
                    >
                      <span className={`sport-chip ${item.id}`}>{item.sport}</span>
                      
                      <div style={{ flex: 1 }}>
                        <h4 style={{ fontSize: "14px", fontWeight: 700 }}>{item.name}</h4>
                        <div style={{ display: "flex", gap: "14px", fontSize: "11px", color: "var(--color-text-dim)", marginTop: "4px" }}>
                          <span>Gender Rule: <strong>{item.gender_rule}</strong></span>
                          <span>Low-stock thr: <strong>{item.low_stock_threshold}</strong></span>
                          <span>Max issue: <strong>{item.max_issue_cap}</strong></span>
                        </div>
                      </div>

                      <button 
                        className="btn btn-secondary touch-target"
                        onClick={() => setEditingItem({
                          id: item.id,
                          name: item.name,
                          gender_rule: item.gender_rule,
                          low_stock_threshold: item.low_stock_threshold,
                          max_issue_cap: item.max_issue_cap
                        })}
                        style={{ padding: "0 10px", display: "flex", alignItems: "center", gap: "6px" }}
                      >
                        <Edit2 size={12} />
                        Edit Rules
                      </button>
                    </div>
                  ))}
                </div>

                {/* Edit Form Drawer */}
                {editingItem ? (
                  <form onSubmit={handleRuleSave} className="card animate-fade-in" style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "16px", border: "2px solid var(--color-brand-charcoal)" }}>
                    <h3 style={{ fontSize: "15px", fontWeight: 800, borderBottom: "1.5px solid var(--color-brand-charcoal)", paddingBottom: "6px" }}>
                      Edit Rules: {editingItem.name}
                    </h3>
                    
                    <div className="form-group">
                      <label className="form-label">Gender Restriction Rule</label>
                      <select 
                        className="form-input"
                        value={editingItem.gender_rule}
                        onChange={(e) => setEditingItem(prev => ({ ...prev, gender_rule: e.target.value }))}
                      >
                        <option value="ALL">Allow All Students</option>
                        <option value="MALE">Boys Only</option>
                        <option value="FEMALE">Girls Only</option>
                      </select>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                      <div className="form-group">
                        <label className="form-label">Low-Stock Alert Trigger</label>
                        <input 
                          type="number" 
                          className="form-input"
                          value={editingItem.low_stock_threshold}
                          onChange={(e) => setEditingItem(prev => ({ ...prev, low_stock_threshold: parseInt(e.target.value) }))}
                          min="1"
                          required
                        />
                      </div>

                      <div className="form-group">
                        <label className="form-label">Max Allowed Checkout Limit</label>
                        <input 
                          type="number" 
                          className="form-input"
                          value={editingItem.max_issue_cap}
                          onChange={(e) => setEditingItem(prev => ({ ...prev, max_issue_cap: parseInt(e.target.value) }))}
                          min="1"
                          required
                        />
                      </div>
                    </div>

                    <div style={{ display: "flex", gap: "8px", marginTop: "8px" }}>
                      <button type="submit" className="btn btn-primary touch-target" style={{ flex: 1, justifyContent: "center" }}>
                        Save rules
                      </button>
                      <button 
                        type="button" 
                        onClick={() => setEditingItem(null)} 
                        className="btn btn-secondary touch-target"
                        style={{ flex: 1, justifyContent: "center" }}
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="card" style={{ padding: "30px", borderStyle: "dashed", textAlign: "center", color: "var(--color-text-dim)" }}>
                    Select an item from the list to modify its data-driven rule parameters.
                  </div>
                )}

              </div>
            </div>
          )}

          {/* TAB 4: FLAGGED VIEW */}
          {activeTab === "flagged" && (
            <div className="animate-fade-in" style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
              
              <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: "24px", alignItems: "start" }}>
                
                {/* Active warnings and card overrides */}
                <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                  <h3 className="form-label">Active Blocked Warnings</h3>
                  
                  {flaggedCards.map(flag => (
                    <div 
                      key={flag.id} 
                      className="card"
                      style={{
                        padding: "16px",
                        borderLeft: "4px solid var(--color-danger)",
                        backgroundColor: "var(--color-danger-bg)",
                        display: "flex",
                        flexDirection: "column",
                        gap: "8px"
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span className="badge badge-out">{flag.type}</span>
                        <span className="font-mono text-dim" style={{ fontSize: "11px" }}>Roll: {flag.roll}</span>
                      </div>
                      <p style={{ fontSize: "12.5px", color: "var(--color-danger)", lineHeight: 1.3 }}>
                        {flag.reason}
                      </p>
                      
                      <div style={{ display: "flex", gap: "8px", marginTop: "8px" }}>
                        <button 
                          onClick={() => setFlaggedCards([])}
                          className="btn btn-secondary touch-target"
                          style={{ height: "30px", fontSize: "11.5px", backgroundColor: "white" }}
                        >
                          Dismiss Flag
                        </button>
                        <button 
                          onClick={() => {
                            setOldCardRoll(flag.roll);
                            setNewCardRoll(flag.roll + "0"); // mock suggestion
                          }}
                          className="btn btn-danger touch-target"
                          style={{ height: "30px", fontSize: "11.5px" }}
                        >
                          Trigger Overrides
                        </button>
                      </div>
                    </div>
                  ))}

                  {/* Dummy unmatched returns logic */}
                  <div className="card" style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                    <h4 style={{ fontSize: "13.5px", fontWeight: 700 }}>Unmatched Return Override</h4>
                    <p style={{ fontSize: "12px", color: "var(--color-text-muted)", lineHeight: 1.3 }}>
                      If a student attempts to return lost or damaged items, or if transaction logs cannot resolve their checkout automatically, managers can manually declare a return record override.
                    </p>
                    <button 
                      className="btn btn-secondary touch-target"
                      onClick={() => alert("Override tool active: Search for student's unreturned transactions...")}
                      style={{ width: "fit-content" }}
                    >
                      Process Unresolved Return
                    </button>
                  </div>
                </div>

                {/* Card Relinker Form */}
                <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                  <h3 className="form-label">Relink Student ID (Card Replacement)</h3>
                  
                  <form onSubmit={handleRelinkSubmit} className="card" style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "14px" }}>
                    <p style={{ fontSize: "12px", color: "var(--color-text-muted)", lineHeight: 1.3 }}>
                      Update student registry roll-number assignments (e.g., in case of student card replacements).
                    </p>

                    {adminMessage.text && (
                      <div className={`badge ${adminMessage.type === 'success' ? 'badge-ok' : 'badge-out'}`} style={{ width: "100%", padding: "8px", justifyContent: "center" }}>
                        {adminMessage.text}
                      </div>
                    )}

                    <div className="form-group">
                      <label className="form-label">Current / Old Card ID Roll</label>
                      <input 
                        type="text"
                        className="form-input"
                        placeholder="Enter active roll number"
                        value={oldCardRoll}
                        onChange={(e) => setOldCardRoll(e.target.value)}
                        required
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">New Replacement Card ID Roll</label>
                      <input 
                        type="text"
                        className="form-input"
                        placeholder="Enter new roll number assignment"
                        value={newCardRoll}
                        onChange={(e) => setNewCardRoll(e.target.value)}
                        required
                      />
                    </div>

                    <button type="submit" className="btn btn-primary touch-target" style={{ marginTop: "6px", justifyContent: "center" }}>
                      Perform ID Relink
                    </button>
                  </form>
                </div>

              </div>

            </div>
          )}

        </div>

      </div>
    </div>
  );
}
