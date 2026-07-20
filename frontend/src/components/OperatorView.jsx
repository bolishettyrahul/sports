import React, { useState, useEffect, useRef, useCallback } from "react";
import { apiService, generateUUID } from "../services/api";
import {
  Wifi,
  WifiOff,
  User,
  Search,
  QrCode,
  Check,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  LogOut,
  HelpCircle,
  PlusCircle,
  ArrowRight,
  Database,
  ScanLine
} from "lucide-react";

/** Equipment ids (`cricket_kit`) don't match the sport-chip classes, but the
 *  sport names do. Without this, 3 of 6 chips render uncoloured. */
const sportClass = (sport) => (sport || "").toLowerCase().replace(/\s+/g, "_");

/**
 * Why an item can't be issued right now — design.md §7 requires the operator to
 * understand *why* something isn't tappable, not merely that it isn't.
 * Returns null when the item is selectable.
 */
function getBlockReason(item, student) {
  if (!student) return null;
  if (item.available_stock === 0) return "Out of stock";
  if (!student.eligible) return student.reason || "Student not eligible";
  if (!student.eligible_sports.includes(item.id)) {
    if (item.gender_rule === "MALE") return "Boys only";
    if (item.gender_rule === "FEMALE") return "Girls only";
    return "Not allowed for this student";
  }
  return null;
}

export default function OperatorView({ user, onLogout }) {
  const [online, setOnline] = useState(navigator.onLine);
  const [offlineQueue, setOfflineQueue] = useState([]);

  // Student search/scan states
  const [searchRoll, setSearchRoll] = useState("");
  const [loadingStudent, setLoadingStudent] = useState(false);
  const [currentStudent, setCurrentStudent] = useState(null);
  const [studentError, setStudentError] = useState(null);

  // Progressive enrollment form state
  const [showEnrollForm, setShowEnrollForm] = useState(false);
  const [enrollForm, setEnrollForm] = useState({
    roll_no: "",
    name: "",
    gender: "MALE",
    branch: "CSE",
    year: 1
  });
  const [enrolling, setEnrolling] = useState(false);
  const [enrollError, setEnrollError] = useState("");

  // Catalog and selection states
  const [equipmentList, setEquipmentList] = useState([]);
  const [loadingCatalog, setLoadingCatalog] = useState(false);
  const [selectedSportFilter, setSelectedSportFilter] = useState("ALL");

  // Selection checkout state
  const [selectedItem, setSelectedItem] = useState(null);
  const [selectedVariant, setSelectedVariant] = useState(null);
  const [checkoutReason, setCheckoutReason] = useState("Free Hour");
  const [issuing, setIssuing] = useState(false);
  const [issueSuccess, setIssueSuccess] = useState(null);
  const [issueError, setIssueError] = useState("");

  useEffect(() => {
    fetchCatalog();
    loadOfflineQueue();

    const goOnline = () => setOnline(true);
    const goOffline = () => setOnline(false);

    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);

    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []);

  useEffect(() => {
    if (online && offlineQueue.length > 0) {
      syncOfflineQueue();
    }
  }, [online, offlineQueue]);

  const loadOfflineQueue = () => {
    const queue = JSON.parse(localStorage.getItem("cbit_offline_queue") || "[]");
    setOfflineQueue(queue);
  };

  const fetchCatalog = async () => {
    setLoadingCatalog(true);
    try {
      const data = await apiService.getEquipment();
      setEquipmentList(data);
    } catch (err) {
      console.error("Failed to load catalog", err);
    } finally {
      setLoadingCatalog(false);
    }
  };

  /**
   * @param keepSuccess  true when this is the refresh that follows a successful
   *   issue. Without it the refresh wiped the confirmation banner before the
   *   operator could see it, so an online checkout gave no feedback at all.
   */
  const handleStudentSearch = async (roll, { keepSuccess = false } = {}) => {
    if (!roll) return;
    setLoadingStudent(true);
    setStudentError(null);
    setCurrentStudent(null);
    setSelectedItem(null);
    setSelectedVariant(null);
    if (!keepSuccess) setIssueSuccess(null);
    setIssueError("");

    try {
      const student = await apiService.getStudent(roll.trim());
      setCurrentStudent(student);
    } catch (err) {
      if (err.code === "STUDENT_NOT_FOUND") {
        setStudentError("STUDENT_NOT_FOUND");
        setEnrollForm((prev) => ({ ...prev, roll_no: roll.trim() }));
      } else {
        setStudentError(err.message || "Could not look up that roll number. Check the number and try again.");
      }
    } finally {
      setLoadingStudent(false);
    }
  };

  const simulateBarcodeScan = () => {
    const rolls = ["160120733", "160120734", "160120735", "160120799"];
    const roll = rolls[Math.floor(Math.random() * rolls.length)];
    setSearchRoll(roll);
    handleStudentSearch(roll);
  };

  const handleEnrollSubmit = async (e) => {
    e.preventDefault();
    if (!enrollForm.name || !enrollForm.roll_no) {
      setEnrollError("Enter the student's name to continue.");
      return;
    }

    setEnrolling(true);
    setEnrollError("");

    try {
      const response = await apiService.enrollStudent(enrollForm);
      setCurrentStudent(response.student);
      setSearchRoll(enrollForm.roll_no);
      setShowEnrollForm(false);
      setStudentError(null);
      fetchCatalog();
    } catch (err) {
      setEnrollError(err.message || "Could not save the student. Check the details and try again.");
    } finally {
      setEnrolling(false);
    }
  };

  const applyOptimisticStockDecrement = (itemId, variantId) => {
    setEquipmentList((prevList) =>
      prevList.map((item) => {
        if (item.id !== itemId) return item;
        return {
          ...item,
          available_stock: Math.max(0, item.available_stock - 1),
          variants: item.variants.map((v) =>
            v.id === variantId ? { ...v, available_stock: Math.max(0, v.available_stock - 1) } : v
          )
        };
      })
    );
  };

  const handleIssueConfirm = async () => {
    if (!currentStudent || !selectedItem || !selectedVariant) return;

    const payload = {
      client_tx_id: generateUUID(),
      roll_no: currentStudent.roll_no,
      equipment_id: selectedItem.id,
      variant_id: selectedVariant.id,
      operator_id: user.username,
      checkout_reason: checkoutReason
    };

    setIssuing(true);
    setIssueSuccess(null);
    setIssueError("");

    applyOptimisticStockDecrement(selectedItem.id, selectedVariant.id);

    if (!online) {
      const updatedQueue = [...offlineQueue, { ...payload, checked_out_at: new Date().toISOString() }];
      localStorage.setItem("cbit_offline_queue", JSON.stringify(updatedQueue));
      setOfflineQueue(updatedQueue);

      setIssueSuccess({
        status: "success_offline",
        student_name: currentStudent.name,
        item_name: selectedItem.name,
        variant_name: selectedVariant.name
      });

      setSelectedItem(null);
      setSelectedVariant(null);
      setIssuing(false);

      setCurrentStudent((prev) => ({
        ...prev,
        active_checkouts: prev.active_checkouts + 1
      }));
    } else {
      try {
        await apiService.issueEquipment(payload);
        setIssueSuccess({
          status: "success",
          student_name: currentStudent.name,
          item_name: selectedItem.name,
          variant_name: selectedVariant.name
        });

        setSelectedItem(null);
        setSelectedVariant(null);

        fetchCatalog();
        handleStudentSearch(currentStudent.roll_no, { keepSuccess: true });
      } catch (err) {
        // design.md §8: state what happened and what to do next — never a bare alert().
        setIssueError(`${err.message || "The checkout could not be saved."} Nothing was issued. Check the item's stock and try again.`);
        fetchCatalog();
      } finally {
        setIssuing(false);
      }
    }
  };

  const syncOfflineQueue = async () => {
    try {
      const response = await apiService.syncTransactions({ transactions: offlineQueue });
      if (response.status === "success") {
        localStorage.removeItem("cbit_offline_queue");
        setOfflineQueue([]);
        fetchCatalog();
        if (currentStudent) handleStudentSearch(currentStudent.roll_no);
      }
    } catch (err) {
      console.error("Queue sync failed", err);
    }
  };

  const sportsList = ["ALL", ...new Set(equipmentList.map((item) => item.sport))];
  const visibleEquipment = equipmentList.filter(
    (item) => selectedSportFilter === "ALL" || item.sport === selectedSportFilter
  );

  return (
    <>
      <div className="app-shell">
        {/* ---------------------------------------------------------------- */}
        {/* HEADER                                                            */}
        {/* ---------------------------------------------------------------- */}
        <header className="app-header">
          <div className="app-header-brand">
            <div className="app-header-mark">CB</div>
            <div>
              <h1 style={{ fontSize: "var(--text-base)", fontWeight: 800, lineHeight: 1.15 }}>Equipment Issue</h1>
              <span
                className="font-mono text-muted"
                style={{ fontSize: "var(--text-2xs)", textTransform: "uppercase", letterSpacing: "0.08em" }}
              >
                CBIT Sports · {user.location || "Counter 1"}
              </span>
            </div>
          </div>

          <div className="app-header-actions">
            <span
              role="status"
              className={`badge ${online ? "badge-ok" : "badge-info"}`}
              style={{ gap: "var(--space-xs)" }}
            >
              {online ? <Wifi size={14} aria-hidden="true" /> : <WifiOff size={14} aria-hidden="true" />}
              {online ? "Synced" : "Offline — saving locally"}
            </span>

            {/* Network simulation is a sandbox affordance, not an operator control. */}
            {import.meta.env.DEV && (
              <button
                className="btn btn-secondary"
                onClick={() => setOnline(!online)}
                style={{ fontSize: "var(--text-2xs)" }}
                title="Sandbox only: toggle simulated network state"
              >
                Simulate {online ? "offline" : "online"}
              </button>
            )}

            {offlineQueue.length > 0 && (
              <span role="status" className="badge badge-info">
                <Database size={12} aria-hidden="true" />
                {offlineQueue.length} queued
              </span>
            )}

            <div className="app-header-identity">
              <span style={{ fontSize: "var(--text-sm)", fontWeight: 600 }}>{user.name || "Operator"}</span>
              <span
                className="font-mono text-muted"
                style={{ fontSize: "var(--text-2xs)", textTransform: "uppercase", letterSpacing: "0.05em" }}
              >
                Operator
              </span>
            </div>

            <div className="app-avatar" aria-hidden="true">
              {user.name ? user.name.split(" ").map((n) => n[0]).join("") : "OP"}
            </div>

            <button className="btn btn-secondary btn-icon" onClick={onLogout} aria-label="Sign out">
              <LogOut size={16} aria-hidden="true" />
            </button>
          </div>
        </header>

        {/* ---------------------------------------------------------------- */}
        {/* STUDENT IDENTIFICATION                                            */}
        {/* ---------------------------------------------------------------- */}
        <section className="op-identify" aria-label="Student identification">
          <div className="op-identify-row">
            <div className="op-scan-panel">
              <div className="scan-viewport">
                <div className="scan-reticle" />
                <div className="scan-line" />
                <div style={{ position: "absolute", bottom: "var(--space-sm)", fontSize: "var(--text-2xs)" }}>
                  CAMERA SIMULATOR ACTIVE
                </div>
              </div>
              <button onClick={simulateBarcodeScan} className="btn btn-secondary btn-full">
                <QrCode size={18} aria-hidden="true" />
                Simulate ID scan
              </button>
            </div>

            <div className="op-identify-manual">
              <div className="form-group">
                <label className="form-label" htmlFor="roll-lookup">Search / scan fallback</label>
                <div style={{ display: "flex", gap: "var(--space-sm)" }}>
                  <div className="field-wrap">
                    <span className="field-icon field-icon-left">
                      <Search size={18} aria-hidden="true" />
                    </span>
                    <input
                      id="roll-lookup"
                      type="text"
                      inputMode="numeric"
                      className="form-input has-icon-left"
                      placeholder="Roll number, e.g. 160120733"
                      value={searchRoll}
                      onChange={(e) => setSearchRoll(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleStudentSearch(searchRoll);
                      }}
                    />
                  </div>
                  <button
                    onClick={() => handleStudentSearch(searchRoll)}
                    className="btn btn-primary"
                    disabled={loadingStudent}
                    style={{ minWidth: "110px" }}
                  >
                    {loadingStudent ? "Checking…" : "Verify"}
                  </button>
                </div>
              </div>

              {/* Status changes here must reach a screen reader. */}
              <div aria-live="polite" style={{ minHeight: "56px", display: "flex", alignItems: "center" }}>
                {loadingStudent && <span className="text-muted">Verifying student details…</span>}

                {currentStudent && (
                  <div
                    className="animate-fade-in"
                    style={{ display: "flex", alignItems: "center", gap: "var(--space-lg)", width: "100%", flexWrap: "wrap" }}
                  >
                    <div
                      style={{
                        width: "48px",
                        height: "48px",
                        flexShrink: 0,
                        background: "var(--color-surface)",
                        border: "1px solid var(--color-divider)",
                        display: "grid",
                        placeItems: "center",
                        color: "var(--color-text-muted)"
                      }}
                    >
                      <User size={22} aria-hidden="true" />
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div
                        className="font-mono"
                        style={{
                          fontSize: "var(--text-2xs)",
                          color: "var(--color-brand-gold-dark)",
                          fontWeight: 600,
                          textTransform: "uppercase"
                        }}
                      >
                        Student found
                      </div>
                      <h2 style={{ fontSize: "var(--text-lg)", fontWeight: 800, margin: "2px 0" }}>
                        {currentStudent.name}
                      </h2>
                      <p style={{ fontSize: "var(--text-xs)", color: "var(--color-text-muted)" }}>
                        <span className="font-mono">{currentStudent.roll_no}</span> · {currentStudent.branch} · Year{" "}
                        {currentStudent.year}
                      </p>
                    </div>

                    <div style={{ marginLeft: "auto" }}>
                      {currentStudent.eligible ? (
                        <span className="badge badge-ok" style={{ padding: "var(--space-sm) var(--space-md)" }}>
                          <CheckCircle2 size={16} aria-hidden="true" />
                          Eligible · {currentStudent.active_checkouts} active
                        </span>
                      ) : (
                        <span className="badge badge-out" style={{ padding: "var(--space-sm) var(--space-md)" }}>
                          <XCircle size={16} aria-hidden="true" />
                          {currentStudent.reason || "Not eligible"}
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {studentError === "STUDENT_NOT_FOUND" && (
                  <div
                    className="animate-fade-in"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "var(--space-md)",
                      backgroundColor: "var(--color-warning-bg)",
                      border: "1px solid var(--color-warning-border)",
                      padding: "var(--space-md)",
                      width: "100%",
                      flexWrap: "wrap"
                    }}
                  >
                    <AlertTriangle size={20} aria-hidden="true" style={{ color: "var(--color-warning)", flexShrink: 0 }} />
                    <div style={{ minWidth: 0 }}>
                      <h2 style={{ fontSize: "var(--text-sm)", fontWeight: 700, color: "var(--color-warning)" }}>
                        Roll number not enrolled
                      </h2>
                      <p style={{ fontSize: "var(--text-xs)", color: "var(--color-text-muted)" }}>
                        Enrol the student now to continue with this checkout.
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        setShowEnrollForm(true);
                        setEnrollError("");
                      }}
                      className="btn btn-secondary"
                      style={{ marginLeft: "auto" }}
                    >
                      <PlusCircle size={16} aria-hidden="true" />
                      Enrol student
                    </button>
                  </div>
                )}

                {studentError && studentError !== "STUDENT_NOT_FOUND" && (
                  <div role="alert" className="badge badge-out" style={{ padding: "var(--space-md)", width: "100%" }}>
                    <XCircle size={16} aria-hidden="true" />
                    {studentError}
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* ---------------------------------------------------------------- */}
        {/* CATALOG + CHECKOUT RAIL                                           */}
        {/* ---------------------------------------------------------------- */}
        <main className="op-main">
          <section className="op-catalog" aria-labelledby="catalog-heading">
            {/* Real heading rather than an aria-label, so the card <h3>s sit at
                a valid depth instead of jumping straight from the page <h1>. */}
            <h2 id="catalog-heading" className="visually-hidden">Equipment catalog</h2>
            <div className="op-filters">
              <span
                style={{
                  fontSize: "var(--text-xs)",
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  color: "var(--color-text-muted)"
                }}
              >
                Filter catalog
              </span>
              <div className="op-filter-chips" role="group" aria-label="Filter by sport">
                {sportsList.map((sport) => (
                  <button
                    key={sport}
                    onClick={() => setSelectedSportFilter(sport)}
                    className={`btn ${selectedSportFilter === sport ? "btn-primary" : "btn-secondary"}`}
                    aria-pressed={selectedSportFilter === sport}
                    style={{ textTransform: "capitalize" }}
                  >
                    {sport === "ALL" ? "All sports" : sport}
                  </button>
                ))}
              </div>
            </div>

            {/* Before a scan nothing is selectable. Previously the grid rendered
                fully opaque and simply ignored taps. */}
            {!currentStudent && !loadingCatalog && (
              <div
                className="card"
                style={{
                  borderStyle: "dashed",
                  display: "flex",
                  alignItems: "center",
                  gap: "var(--space-md)",
                  color: "var(--color-text-muted)"
                }}
              >
                <ScanLine size={20} aria-hidden="true" style={{ flexShrink: 0 }} />
                <span>Scan a student ID to begin. Items become selectable once a student is verified.</span>
              </div>
            )}

            {loadingCatalog ? (
              <div style={{ flex: 1, display: "grid", placeItems: "center", color: "var(--color-text-dim)" }}>
                Loading catalog inventory…
              </div>
            ) : (
              <div className="op-catalog-grid">
                {visibleEquipment.map((item) => {
                  const blockReason = getBlockReason(item, currentStudent);
                  const canSelect = Boolean(currentStudent) && !blockReason;
                  const isSelected = selectedItem && selectedItem.id === item.id;
                  const chip = sportClass(item.sport);

                  let stockBadge = (
                    <span className="badge badge-ok">
                      <CheckCircle2 size={12} aria-hidden="true" />
                      {item.available_stock} available
                    </span>
                  );
                  if (item.available_stock === 0) {
                    stockBadge = (
                      <span className="badge badge-out">
                        <XCircle size={12} aria-hidden="true" />
                        Out of stock
                      </span>
                    );
                  } else if (item.available_stock <= item.low_stock_threshold) {
                    stockBadge = (
                      <span className="badge badge-low tabular">
                        <AlertTriangle size={12} aria-hidden="true" />
                        Low · {item.available_stock} left
                      </span>
                    );
                  }

                  return (
                    <button
                      key={item.id}
                      type="button"
                      disabled={!canSelect}
                      aria-pressed={Boolean(isSelected)}
                      className={`card ${canSelect ? "card-interactive" : ""} ${isSelected ? "card-selected" : ""}`}
                      onClick={() => {
                        if (!canSelect) return;
                        setSelectedItem(item);
                        setSelectedVariant(item.variants[0] || null);
                        setIssueError("");
                      }}
                      style={{
                        opacity: currentStudent && !canSelect ? 0.55 : 1,
                        display: "flex",
                        flexDirection: "column",
                        gap: "var(--space-sm)",
                        position: "relative",
                        cursor: canSelect ? "pointer" : "not-allowed"
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "var(--space-sm)" }}>
                        <span className={`sport-chip ${chip}`}>
                          <span className={`sport-dot ${chip}`} />
                          {item.sport}
                        </span>
                        {stockBadge}
                      </div>

                      <div>
                        <h3 style={{ fontSize: "var(--text-base)", fontWeight: 700 }}>{item.name}</h3>
                        <p style={{ fontSize: "var(--text-xs)", color: "var(--color-text-dim)", marginTop: "2px" }}>
                          Max {item.max_issue_cap} per student
                        </p>
                      </div>

                      {/* design.md §7 — say *why* it isn't tappable. Skipped
                          when the stock badge above already says it. */}
                      {blockReason && item.available_stock > 0 && (
                        <span className="badge badge-out" style={{ width: "fit-content" }}>
                          <XCircle size={12} aria-hidden="true" />
                          {blockReason}
                        </span>
                      )}

                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: "var(--space-xs)",
                          borderTop: "1px solid var(--color-divider-light)",
                          paddingTop: "var(--space-sm)",
                          marginTop: "auto"
                        }}
                      >
                        <span className="form-label" style={{ fontSize: "var(--text-2xs)" }}>Variants available</span>
                        <div style={{ display: "flex", gap: "var(--space-xs)", flexWrap: "wrap" }}>
                          {item.variants.map((v) => (
                            <span key={v.id} className="badge badge-mono tabular">
                              {v.name} ({v.available_stock})
                            </span>
                          ))}
                        </div>
                      </div>

                      {isSelected && (
                        <span
                          aria-hidden="true"
                          style={{
                            position: "absolute",
                            top: "-8px",
                            right: "-8px",
                            width: "24px",
                            height: "24px",
                            borderRadius: "50%",
                            background: "var(--color-brand-maroon)",
                            border: "1px solid var(--color-brand-charcoal)",
                            color: "var(--color-surface)",
                            display: "grid",
                            placeItems: "center"
                          }}
                        >
                          <Check size={13} />
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </section>

          <aside className="op-rail" aria-label="Issue summary">
            <h2
              className="form-label"
              style={{ borderBottom: "1px solid var(--color-brand-charcoal)", paddingBottom: "var(--space-sm)" }}
            >
              Issue summary
            </h2>

            {issueError && (
              <div role="alert" className="card" style={{ backgroundColor: "var(--color-danger-bg)", borderColor: "var(--color-danger-border)", display: "flex", gap: "var(--space-sm)" }}>
                <XCircle size={18} aria-hidden="true" style={{ color: "var(--color-danger)", flexShrink: 0 }} />
                <p style={{ fontSize: "var(--text-xs)", color: "var(--color-danger)", lineHeight: 1.4 }}>{issueError}</p>
              </div>
            )}

            {issueSuccess && (
              <div
                role="status"
                className="animate-fade-in card"
                style={{
                  backgroundColor: "var(--color-success-bg)",
                  borderColor: "var(--color-success-border)",
                  display: "flex",
                  flexDirection: "column",
                  gap: "var(--space-sm)"
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "var(--space-sm)", color: "var(--color-success)", fontWeight: 700 }}>
                  <CheckCircle2 size={18} aria-hidden="true" />
                  <span>Equipment issued</span>
                </div>
                <p style={{ fontSize: "var(--text-xs)", color: "var(--color-success)", lineHeight: 1.4 }}>
                  <strong>
                    {issueSuccess.item_name} ({issueSuccess.variant_name})
                  </strong>{" "}
                  logged to {issueSuccess.student_name}.
                </p>
                {issueSuccess.status === "success_offline" && (
                  <span className="badge badge-info" style={{ width: "fit-content" }}>
                    <WifiOff size={12} aria-hidden="true" />
                    Saved — will sync when back online
                  </span>
                )}
              </div>
            )}

            {selectedItem ? (
              <div className="animate-fade-in" style={{ display: "flex", flexDirection: "column", gap: "var(--space-lg)", flex: 1 }}>
                <div
                  className="card"
                  style={{ borderLeft: "4px solid var(--color-brand-maroon)", display: "flex", flexDirection: "column", gap: "var(--space-sm)" }}
                >
                  <div style={{ display: "flex", alignItems: "center" }}>
                    <span className={`sport-chip ${sportClass(selectedItem.sport)}`}>
                      <span className={`sport-dot ${sportClass(selectedItem.sport)}`} />
                      {selectedItem.sport}
                    </span>
                    <span className="font-mono text-dim" style={{ marginLeft: "auto", fontSize: "var(--text-xs)" }}>×1</span>
                  </div>
                  <h3 style={{ fontSize: "var(--text-base)", fontWeight: 700 }}>{selectedItem.name}</h3>
                </div>

                {selectedItem.variants.length > 1 && (
                  <fieldset className="form-group" style={{ border: "none" }}>
                    <legend className="form-label" style={{ marginBottom: "var(--space-xs)" }}>Select variant</legend>
                    <div className="segmented-control">
                      {selectedItem.variants.map((v) => (
                        <div key={v.id} className="segmented-option">
                          <input
                            type="radio"
                            id={v.id}
                            name="checkout_variant"
                            checked={Boolean(selectedVariant && selectedVariant.id === v.id)}
                            onChange={() => setSelectedVariant(v)}
                            disabled={v.available_stock === 0}
                          />
                          <label
                            htmlFor={v.id}
                            className="segmented-label"
                            style={{
                              opacity: v.available_stock === 0 ? 0.45 : 1,
                              textDecoration: v.available_stock === 0 ? "line-through" : "none"
                            }}
                          >
                            {v.name}
                          </label>
                        </div>
                      ))}
                    </div>
                  </fieldset>
                )}

                <fieldset className="form-group" style={{ border: "none" }}>
                  <legend className="form-label" style={{ marginBottom: "var(--space-xs)" }}>Checkout reason</legend>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-sm)" }}>
                    {["Free Hour", "Fit Hour", "Lunch Hour", "After College", "Practice"].map((reason) => (
                      <button
                        key={reason}
                        type="button"
                        onClick={() => setCheckoutReason(reason)}
                        aria-pressed={checkoutReason === reason}
                        className={`btn ${checkoutReason === reason ? "btn-primary" : "btn-secondary"}`}
                      >
                        {reason}
                      </button>
                    ))}
                  </div>
                </fieldset>

                <div className="op-rail-footer">
                  <div style={{ display: "flex", alignItems: "center", gap: "var(--space-xs)", fontSize: "var(--text-xs)", color: "var(--color-text-muted)" }}>
                    <Check size={14} aria-hidden="true" />
                    <span>Eligible checkout · within student limits</span>
                  </div>
                  <button
                    onClick={handleIssueConfirm}
                    className="btn btn-primary btn-full"
                    disabled={issuing || !selectedVariant}
                  >
                    {issuing ? "Processing…" : "Confirm issue"}
                    <ArrowRight size={18} aria-hidden="true" style={{ marginLeft: "auto" }} />
                  </button>
                </div>
              </div>
            ) : (
              /* Suppressed while a success banner is showing — the two together
                 previously contradicted each other. */
              !issueSuccess && (
                <div
                  style={{
                    flex: 1,
                    display: "grid",
                    placeItems: "center",
                    border: "1px dashed var(--color-divider)",
                    color: "var(--color-text-muted)",
                    textAlign: "center",
                    padding: "var(--space-xl)",
                    minHeight: "160px"
                  }}
                >
                  <div>
                    <HelpCircle size={32} aria-hidden="true" style={{ margin: "0 auto var(--space-sm)", color: "var(--color-divider)" }} />
                    <p style={{ fontSize: "var(--text-sm)" }}>
                      Scan a student card, then choose an available item from the grid.
                    </p>
                  </div>
                </div>
              )
            )}
          </aside>
        </main>
      </div>

      {showEnrollForm && (
        <EnrollmentDialog
          form={enrollForm}
          setForm={setEnrollForm}
          error={enrollError}
          submitting={enrolling}
          onSubmit={handleEnrollSubmit}
          onClose={() => setShowEnrollForm(false)}
        />
      )}
    </>
  );
}

/**
 * Progressive enrollment dialog.
 * Previously a bare fixed div: no role, no focus management, no Escape, and no
 * max-height (it clipped with no scroll on a landscape phone).
 */
function EnrollmentDialog({ form, setForm, error, submitting, onSubmit, onClose }) {
  const panelRef = useRef(null);
  const previouslyFocused = useRef(null);

  const focusables = useCallback(
    () =>
      Array.from(
        panelRef.current?.querySelectorAll(
          'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        ) || []
      ),
    []
  );

  useEffect(() => {
    previouslyFocused.current = document.activeElement;
    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";
    focusables()[0]?.focus();

    return () => {
      document.body.style.overflow = overflow;
      // Deferred: the dialog is torn out of the DOM *after* this cleanup, and
      // removing the focused node resets focus to <body>, clobbering an
      // immediate restore.
      const target = previouslyFocused.current;
      requestAnimationFrame(() => target?.focus?.());
    };
  }, [focusables]);

  const handleKeyDown = (e) => {
    if (e.key === "Escape") {
      e.stopPropagation();
      onClose();
      return;
    }
    if (e.key !== "Tab") return;

    const items = focusables();
    if (items.length === 0) return;
    const first = items[0];
    const last = items[items.length - 1];

    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  };

  return (
    <div
      className="modal-overlay"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="enroll-title"
        className="animate-fade-in modal-panel"
        onKeyDown={handleKeyDown}
      >
        <h2 id="enroll-title" style={{ fontSize: "var(--text-lg)", fontWeight: 800, marginBottom: "var(--space-xs)" }}>
          Progressive enrolment
        </h2>
        <p className="text-muted" style={{ fontSize: "var(--text-xs)", marginBottom: "var(--space-lg)" }}>
          Quick record capture. Saves to the master roster in about 15 seconds.
        </p>

        {error && (
          <div
            role="alert"
            className="badge badge-out"
            style={{ width: "100%", padding: "var(--space-sm)", marginBottom: "var(--space-md)" }}
          >
            <XCircle size={14} aria-hidden="true" />
            {error}
          </div>
        )}

        <form onSubmit={onSubmit} style={{ display: "flex", flexDirection: "column", gap: "var(--space-md)" }}>
          <div className="form-group">
            <label className="form-label" htmlFor="enroll-roll">Roll number (matched)</label>
            <input
              id="enroll-roll"
              type="text"
              className="form-input"
              disabled
              value={form.roll_no}
              style={{ backgroundColor: "var(--color-bg)" }}
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="enroll-name">Student name</label>
            <input
              id="enroll-name"
              type="text"
              className="form-input"
              placeholder="Enter full name"
              value={form.name}
              onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
              required
              disabled={submitting}
            />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-sm)" }}>
            <div className="form-group">
              <label className="form-label" htmlFor="enroll-gender">Gender</label>
              <select
                id="enroll-gender"
                className="form-input"
                value={form.gender}
                onChange={(e) => setForm((prev) => ({ ...prev, gender: e.target.value }))}
                disabled={submitting}
              >
                <option value="MALE">Male</option>
                <option value="FEMALE">Female</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="enroll-year">Academic year</label>
              <select
                id="enroll-year"
                className="form-input"
                value={form.year}
                onChange={(e) => setForm((prev) => ({ ...prev, year: parseInt(e.target.value, 10) }))}
                disabled={submitting}
              >
                <option value="1">1st year</option>
                <option value="2">2nd year</option>
                <option value="3">3rd year</option>
                <option value="4">4th year</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="enroll-branch">Branch / department</label>
            <input
              id="enroll-branch"
              type="text"
              className="form-input"
              placeholder="e.g. CSE, ECE, MECH"
              value={form.branch}
              onChange={(e) => setForm((prev) => ({ ...prev, branch: e.target.value.toUpperCase() }))}
              required
              disabled={submitting}
            />
          </div>

          <div style={{ display: "flex", gap: "var(--space-sm)", marginTop: "var(--space-sm)" }}>
            <button type="button" onClick={onClose} className="btn btn-secondary" style={{ flex: 1 }} disabled={submitting}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={submitting}>
              {submitting ? "Enrolling…" : "Enrol student"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
