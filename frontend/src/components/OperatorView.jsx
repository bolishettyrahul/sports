import React, { useState, useEffect } from "react";
import { apiService, generateUUID, db } from "../services/api";
import { 
  Wifi, 
  WifiOff, 
  User, 
  Search, 
  QrCode, 
  Check, 
  AlertTriangle, 
  LogOut, 
  HelpCircle, 
  PlusCircle, 
  ArrowRight,
  Database
} from "lucide-react";

export default function OperatorView({ user, onLogout }) {
  // Network simulation states
  const [online, setOnline] = useState(true);
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
  const [selectedItem, setSelectedItem] = useState(null); // { id, name, sport }
  const [selectedVariant, setSelectedVariant] = useState(null); // { id, name }
  const [checkoutReason, setCheckoutReason] = useState("Free Hour");
  const [issuing, setIssuing] = useState(false);
  const [issueSuccess, setIssueSuccess] = useState(null);

  // Load catalog on mount
  useEffect(() => {
    fetchCatalog();
    loadOfflineQueue();

    // Listen to network status
    const goOnline = () => setOnline(true);
    const goOffline = () => setOnline(false);

    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);

    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []);

  // Sync queue when coming online
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

  const handleStudentSearch = async (roll) => {
    if (!roll) return;
    setLoadingStudent(true);
    setStudentError(null);
    setCurrentStudent(null);
    setSelectedItem(null);
    setSelectedVariant(null);
    setIssueSuccess(null);

    try {
      const student = await apiService.getStudent(roll.trim());
      setCurrentStudent(student);
    } catch (err) {
      if (err.code === "STUDENT_NOT_FOUND") {
        setStudentError("STUDENT_NOT_FOUND");
        setEnrollForm(prev => ({ ...prev, roll_no: roll.trim() }));
      } else {
        setStudentError(err.message || "Failed to find student.");
      }
    } finally {
      setLoadingStudent(false);
    }
  };

  const simulateBarcodeScan = () => {
    // Generate a random mock student or pick an existing one
    const rolls = ["160120733", "160120734", "160120735", "160120799" /* triggers enrollment */];
    const roll = rolls[Math.floor(Math.random() * rolls.length)];
    setSearchRoll(roll);
    handleStudentSearch(roll);
  };

  const handleEnrollSubmit = async (e) => {
    e.preventDefault();
    if (!enrollForm.name || !enrollForm.roll_no) {
      setEnrollError("Please fill in Name and Roll Number.");
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
      // Refresh catalog just in case rules updated
      fetchCatalog();
    } catch (err) {
      setEnrollError(err.message || "Enrollment failed.");
    } finally {
      setEnrolling(false);
    }
  };

  // Perform optimistic update locally
  const applyOptimisticStockDecrement = (itemId, variantId) => {
    setEquipmentList(prevList => {
      return prevList.map(item => {
        if (item.id === itemId) {
          const updatedVariants = item.variants.map(v => {
            if (v.id === variantId) {
              return { ...v, available_stock: Math.max(0, v.available_stock - 1) };
            }
            return v;
          });
          const newAvail = Math.max(0, item.available_stock - 1);
          return { ...item, available_stock: newAvail, variants: updatedVariants };
        }
        return item;
      });
    });
  };

  const handleIssueConfirm = async () => {
    if (!currentStudent || !selectedItem || !selectedVariant) return;

    const clientTxId = generateUUID();
    const payload = {
      client_tx_id: clientTxId,
      roll_no: currentStudent.roll_no,
      equipment_id: selectedItem.id,
      variant_id: selectedVariant.id,
      operator_id: user.username,
      checkout_reason: checkoutReason
    };

    setIssuing(true);
    setIssueSuccess(null);

    // Apply optimistic update immediately
    applyOptimisticStockDecrement(selectedItem.id, selectedVariant.id);

    if (!online) {
      // Offline mode: Queue it
      const updatedQueue = [...offlineQueue, { ...payload, checked_out_at: new Date().toISOString() }];
      localStorage.setItem("cbit_offline_queue", JSON.stringify(updatedQueue));
      setOfflineQueue(updatedQueue);
      
      // Simulate success response for UI
      setIssueSuccess({
        status: "success_offline",
        student_name: currentStudent.name,
        item_name: selectedItem.name,
        variant_name: selectedVariant.name
      });
      
      setSelectedItem(null);
      setSelectedVariant(null);
      setIssuing(false);
      
      // Increment student's checkout count locally
      setCurrentStudent(prev => ({
        ...prev,
        active_checkouts: prev.active_checkouts + 1,
        eligible: prev.active_checkouts + 1 < 2
      }));
    } else {
      // Online mode: Send to API
      try {
        const response = await apiService.issueEquipment(payload);
        setIssueSuccess({
          status: "success",
          student_name: currentStudent.name,
          item_name: selectedItem.name,
          variant_name: selectedVariant.name
        });
        
        setSelectedItem(null);
        setSelectedVariant(null);
        
        // Refresh catalog and student status
        fetchCatalog();
        handleStudentSearch(currentStudent.roll_no);
      } catch (err) {
        alert("Checkout failed: " + err.message);
        // Revert catalog representation
        fetchCatalog();
      } finally {
        setIssuing(false);
      }
    }
  };

  const syncOfflineQueue = async () => {
    console.log("Syncing offline transactions...");
    try {
      const response = await apiService.syncTransactions({ transactions: offlineQueue });
      if (response.status === "success") {
        console.log(`Synced ${response.synced_count} transactions.`);
        localStorage.removeItem("cbit_offline_queue");
        setOfflineQueue([]);
        fetchCatalog();
        if (currentStudent) {
          handleStudentSearch(currentStudent.roll_no);
        }
      }
    } catch (err) {
      console.error("Queue sync failed", err);
    }
  };

  // Get distinct list of sports for filters
  const sportsList = ["ALL", ...new Set(equipmentList.map(item => item.sport))];

  return (
    <div className="app-container operator-density" style={{ background: "var(--color-bg)" }}>
      <div className="device-frame" style={{ flex: 1, minHeight: "calc(100vh - 44px)", margin: "20px auto" }}>
        
        {/* TOP HEADER */}
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: "16px",
          padding: "12px 22px",
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
              <h2 style={{ fontSize: "15px", fontWeight: 800, lineHeight: 1.1 }}>Equipment Issue</h2>
              <span className="font-mono text-muted" style={{ fontSize: "9px", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                CBIT Sports · {user.location || "Counter 1"}
              </span>
            </div>
          </div>

          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: "14px" }}>
            {/* Network simulator button */}
            <button 
              className={`badge ${online ? 'badge-ok' : 'badge-low'}`}
              onClick={() => setOnline(!online)}
              style={{ cursor: "pointer", display: "flex", alignItems: "center", gap: "6px", border: "1px solid var(--color-divider)", height: "30px", padding: "0 10px" }}
              title="Click to toggle Network simulation"
            >
              {online ? <Wifi size={13} /> : <WifiOff size={13} />}
              {online ? "Synced" : "Offline mode"}
            </button>

            {offlineQueue.length > 0 && (
              <span className="badge badge-low" style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                <Database size={12} />
                {offlineQueue.length} queue
              </span>
            )}

            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", lineHeight: 1.1 }}>
              <span style={{ fontSize: "13px", fontWeight: 600 }}>{user.name || "Operator"}</span>
              <span className="font-mono text-muted" style={{ fontSize: "9.5px", textTransform: "uppercase", letterSpacing: "0.05em" }}>Operator</span>
            </div>
            
            <div style={{
              width: "38px",
              height: "38px",
              border: "2px solid var(--color-brand-charcoal)",
              backgroundColor: "var(--color-bg)",
              display: "grid",
              placeItems: "center",
              fontWeight: 800,
              fontSize: "13px"
            }}>
              {user.name ? user.name.split(" ").map(n=>n[0]).join("") : "OP"}
            </div>

            <button 
              className="btn btn-secondary touch-target" 
              onClick={onLogout}
              style={{ width: "38px", height: "38px", padding: 0, border: "2.2px solid var(--color-brand-charcoal)" }}
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>

        {/* STUDENT IDENTIFICATION (SCAN/SEARCH STRIP) */}
        <div style={{
          display: "flex",
          flexDirection: "column",
          borderBottom: "2px solid var(--color-divider)",
          backgroundColor: "#fcfcfa"
        }}>
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "stretch" }}>
            
            {/* Visual scan viewport simulator */}
            <div style={{ width: "340px", padding: "16px", borderRight: "2px solid var(--color-divider)", display: "flex", flexDirection: "column", gap: "10px" }}>
              <div className="scan-viewport">
                <div className="scan-reticle"></div>
                <div className="scan-line"></div>
                <div style={{ position: "absolute", bottom: "8px", fontSize: "9px", letterSpacing: "0.04em" }}>
                  CAMERA SIMULATOR ACTIVE
                </div>
              </div>
              <button 
                onClick={simulateBarcodeScan} 
                className="btn btn-secondary touch-target"
                style={{ width: "100%", justifyContent: "center" }}
              >
                <QrCode size={16} />
                Simulate ID Scan
              </button>
            </div>

            {/* Manual input fallback */}
            <div style={{ flex: 1, padding: "20px", display: "flex", flexDirection: "column", justifyContent: "center", gap: "12px" }}>
              <div className="form-group">
                <label className="form-label">Search / Scan fallback</label>
                <div style={{ display: "flex", gap: "10px" }}>
                  <div style={{ position: "relative", flex: 1 }}>
                    <Search size={18} style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)", color: "var(--color-text-dim)" }} />
                    <input 
                      type="text" 
                      className="form-input" 
                      style={{ width: "100%", paddingLeft: "42px" }}
                      placeholder="Enter Student Roll Number (e.g. 160120733)"
                      value={searchRoll}
                      onChange={(e) => setSearchRoll(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") handleStudentSearch(searchRoll); }}
                    />
                  </div>
                  <button 
                    onClick={() => handleStudentSearch(searchRoll)}
                    className="btn btn-primary touch-target"
                    disabled={loadingStudent}
                    style={{ width: "110px", justifyContent: "center" }}
                  >
                    {loadingStudent ? "..." : "Verify"}
                  </button>
                </div>
              </div>

              {/* Student status indicator */}
              <div style={{ minHeight: "56px", display: "flex", alignItems: "center" }}>
                {loadingStudent && <span className="text-muted" style={{ fontSize: "14px" }}>Verifying student details...</span>}
                
                {/* Eligible Student Details */}
                {currentStudent && (
                  <div className="animate-fade-in" style={{ display: "flex", alignItems: "center", gap: "16px", width: "100%" }}>
                    <div style={{
                      width: "48px",
                      height: "48px",
                      background: "white",
                      border: "1.5px solid var(--color-divider)",
                      display: "grid",
                      placeItems: "center",
                      color: "var(--color-text-muted)"
                    }}>
                      <User size={22} />
                    </div>
                    <div>
                      <div className="font-mono" style={{ fontSize: "10px", color: "var(--color-brand-gold)", fontWeight: 600, textTransform: "uppercase" }}>
                        Student Found
                      </div>
                      <h3 style={{ fontSize: "18px", fontWeight: 800, margin: "1px 0" }}>{currentStudent.name}</h3>
                      <p style={{ fontSize: "12px", color: "var(--color-text-muted)" }}>
                        <span className="font-mono">{currentStudent.roll_no}</span> &nbsp;·&nbsp; {currentStudent.branch} &nbsp;·&nbsp; Year {currentStudent.year}
                      </p>
                    </div>

                    <div style={{ marginLeft: "auto" }}>
                      {currentStudent.eligible ? (
                        <span className="badge badge-ok" style={{ padding: "8px 12px", fontSize: "12px" }}>
                          <Check size={14} style={{ marginRight: "2px" }} />
                          Eligible · max {2 - currentStudent.active_checkouts} items
                        </span>
                      ) : (
                        <span className="badge badge-out" style={{ padding: "8px 12px", fontSize: "12px" }}>
                          <AlertTriangle size={14} style={{ marginRight: "2px" }} />
                          Ineligible: {currentStudent.reason || "Limits reached"}
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {/* STUDENT NOT FOUND DIALOG TRIGGER */}
                {studentError === "STUDENT_NOT_FOUND" && (
                  <div className="animate-fade-in" style={{ display: "flex", alignItems: "center", gap: "16px", backgroundColor: "var(--color-warning-bg)", border: "1.5px solid var(--color-warning-border)", padding: "10px 14px", width: "100%" }}>
                    <AlertTriangle size={20} style={{ color: "var(--color-warning)" }} />
                    <div>
                      <h4 style={{ fontSize: "13.5px", fontWeight: 700, color: "var(--color-warning)" }}>Roll Number Not Enrolled</h4>
                      <p style={{ fontSize: "11.5px", color: "var(--color-brand-gold-dark)" }}>The card was scanned but is not registered in the system registry.</p>
                    </div>
                    <button 
                      onClick={() => { setShowEnrollForm(true); setEnrollError(""); }}
                      className="btn btn-gold touch-target"
                      style={{ marginLeft: "auto" }}
                    >
                      <PlusCircle size={14} />
                      Quick Enroll (~15s)
                    </button>
                  </div>
                )}

                {studentError && studentError !== "STUDENT_NOT_FOUND" && (
                  <div className="badge badge-out" style={{ padding: "10px", width: "100%", justifyContent: "center" }}>
                    {studentError}
                  </div>
                )}
              </div>

            </div>
          </div>
        </div>

        {/* MAIN SPLIT: SELECTION GRID AND CHECKOUT RAIL */}
        <div style={{ display: "flex", flex: 1, alignItems: "stretch" }}>
          
          {/* LEFT: GRID SELECTION */}
          <div style={{ flex: 1, padding: "22px", borderRight: "2px solid var(--color-divider)", display: "flex", flexDirection: "column", gap: "16px" }}>
            
            {/* Filters */}
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <span style={{ fontSize: "11.5px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--color-text-muted)" }}>
                Filter Catalog
              </span>
              <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                {sportsList.map(sport => (
                  <button
                    key={sport}
                    onClick={() => setSelectedSportFilter(sport)}
                    className={`btn touch-target ${selectedSportFilter === sport ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ minHeight: "36px", padding: "0 12px", fontSize: "12px", textTransform: "capitalize" }}
                  >
                    {sport === "ALL" ? "All Sports" : sport.replace("_", " ")}
                  </button>
                ))}
              </div>
            </div>

            {/* Catalog Grid */}
            {loadingCatalog ? (
              <div style={{ flex: 1, display: "grid", placeItems: "center", color: "var(--color-text-dim)" }}>
                Loading catalog inventory...
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: "12px", overflowY: "auto", maxHeight: "380px" }}>
                {equipmentList
                  .filter(item => selectedSportFilter === "ALL" || item.sport === selectedSportFilter)
                  .map(item => {
                    const isStudentEligible = currentStudent && currentStudent.eligible && currentStudent.eligible_sports.includes(item.id);
                    const isAvailable = item.available_stock > 0;
                    const canSelect = currentStudent && isStudentEligible && isAvailable;
                    
                    const isSelected = selectedItem && selectedItem.id === item.id;
                    
                    // Stock badge configuration
                    let stockBadge = <span className="badge badge-ok">{item.available_stock} available</span>;
                    if (item.available_stock === 0) {
                      stockBadge = <span className="badge badge-out">Out of stock</span>;
                    } else if (item.available_stock <= item.low_stock_threshold) {
                      stockBadge = (
                        <span className="badge badge-low" style={{ fontVariantNumeric: "tabular-nums" }}>
                          Low ({item.available_stock} left / thr {item.low_stock_threshold})
                        </span>
                      );
                    }

                    return (
                      <div 
                        key={item.id} 
                        className={`card ${canSelect ? 'card-interactive' : ''} ${isSelected ? 'card-selected' : ''}`}
                        onClick={() => {
                          if (!canSelect) return;
                          setSelectedItem(item);
                          // Default to first variant
                          setSelectedVariant(item.variants[0] || null);
                        }}
                        style={{
                          opacity: (currentStudent && !canSelect) ? 0.42 : 1,
                          display: "flex",
                          flexDirection: "column",
                          gap: "10px",
                          position: "relative"
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                          <span className={`sport-chip ${item.id}`}>
                            <span className={`sport-dot ${item.id}`}></span>
                            {item.sport}
                          </span>
                          {stockBadge}
                        </div>

                        <div style={{ marginTop: "4px" }}>
                          <h3 style={{ fontSize: "15px", fontWeight: 700 }}>{item.name}</h3>
                          <p style={{ fontSize: "11px", color: "var(--color-text-dim)", marginTop: "2px" }}>
                            Max {item.max_issue_cap} per student
                          </p>
                        </div>

                        {/* Variants Preview */}
                        <div style={{ display: "flex", flexDirection: "column", gap: "4px", borderTop: "1px solid var(--color-divider-light)", paddingTop: "8px", marginTop: "auto" }}>
                          <span className="form-label" style={{ fontSize: "9px" }}>Variants available</span>
                          <div style={{ display: "flex", gap: "4px", flexWrap: "wrap" }}>
                            {item.variants.map(v => (
                              <span key={v.id} className="badge badge-mono" style={{ fontSize: "9.5px", padding: "2px 6px" }}>
                                {v.name} ({v.available_stock})
                              </span>
                            ))}
                          </div>
                        </div>

                        {/* Selection check overlay */}
                        {isSelected && (
                          <div style={{
                            position: "absolute",
                            top: "-8px",
                            right: "-8px",
                            width: "22px",
                            height: "22px",
                            borderRadius: "50%",
                            background: "var(--color-brand-maroon)",
                            border: "1.5px solid var(--color-brand-charcoal)",
                            color: "white",
                            display: "grid",
                            placeItems: "center"
                          }}>
                            <Check size={12} />
                          </div>
                        )}
                      </div>
                    );
                  })}
              </div>
            )}
          </div>

          {/* RIGHT: CHECKOUT RAIL */}
          <div style={{ width: "360px", padding: "22px", backgroundColor: "var(--color-surface)", display: "flex", flexDirection: "column", gap: "18px" }}>
            
            <h3 className="form-label" style={{ fontSize: "12px", borderBottom: "1.5px solid var(--color-brand-charcoal)", paddingBottom: "6px" }}>
              Issue Summary
            </h3>

            {/* Checked out success banner */}
            {issueSuccess && (
              <div className="animate-fade-in card" style={{
                backgroundColor: "var(--color-success-bg)",
                borderColor: "var(--color-success-border)",
                display: "flex",
                flexDirection: "column",
                gap: "6px"
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "var(--color-success)", fontWeight: 700, fontSize: "14px" }}>
                  <Check size={18} />
                  <span>Equipment Issued!</span>
                </div>
                <p style={{ fontSize: "12px", color: "var(--color-success)", lineHeight: 1.3 }}>
                  <strong>{issueSuccess.item_name} ({issueSuccess.variant_name})</strong> logged to {issueSuccess.student_name}.
                </p>
                {issueSuccess.status === "success_offline" && (
                  <span className="badge badge-low" style={{ fontSize: "10px", marginTop: "4px", width: "fit-content" }}>
                    Offline queue · will sync later
                  </span>
                )}
              </div>
            )}

            {/* Selection state */}
            {selectedItem ? (
              <div className="animate-fade-in" style={{ display: "flex", flexDirection: "column", gap: "16px", flex: 1 }}>
                
                {/* Selected Item Info */}
                <div className="card" style={{ padding: "14px", borderLeft: "4px solid var(--color-brand-maroon)", display: "flex", flexDirection: "column", gap: "8px" }}>
                  <div style={{ display: "flex", alignItems: "center" }}>
                    <span className={`sport-chip ${selectedItem.id}`}>{selectedItem.sport}</span>
                    <span className="font-mono text-dim" style={{ marginLeft: "auto", fontSize: "11px" }}>×1</span>
                  </div>
                  <div>
                    <h4 style={{ fontSize: "15px", fontWeight: 700 }}>{selectedItem.name}</h4>
                    <p style={{ fontSize: "11px", color: "var(--color-text-dim)" }}>from master pool</p>
                  </div>
                </div>

                {/* Variant selection Segmented Control */}
                {selectedItem.variants.length > 1 && (
                  <div className="form-group">
                    <label className="form-label">Select Variant</label>
                    <div className="segmented-control">
                      {selectedItem.variants.map(v => (
                        <div key={v.id} className="segmented-option">
                          <input 
                            type="radio" 
                            id={v.id} 
                            name="checkout_variant" 
                            checked={selectedVariant && selectedVariant.id === v.id}
                            onChange={() => setSelectedVariant(v)}
                            disabled={v.available_stock === 0}
                          />
                          <label 
                            htmlFor={v.id} 
                            className="segmented-label"
                            style={{
                              opacity: v.available_stock === 0 ? 0.35 : 1,
                              textDecoration: v.available_stock === 0 ? 'line-through' : 'none'
                            }}
                          >
                            {v.name}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Fixed Checkout Reason selector */}
                <div className="form-group">
                  <label className="form-label">Checkout Reason</label>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                    {["Free Hour", "Fit Hour", "Lunch Hour", "After College", "Practice"].map(reason => (
                      <button
                        key={reason}
                        onClick={() => setCheckoutReason(reason)}
                        className={`btn touch-target ${checkoutReason === reason ? 'btn-primary' : 'btn-secondary'}`}
                        style={{ minHeight: "36px", padding: "0 10px", fontSize: "11.5px" }}
                      >
                        {reason}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Confirmation Footer */}
                <div style={{ marginTop: "auto", display: "flex", flexDirection: "column", gap: "8px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "11px", color: "var(--color-text-muted)" }}>
                    <Check size={12} />
                    <span>Eligible checkout · within student limits</span>
                  </div>
                  <button 
                    onClick={handleIssueConfirm}
                    className="btn btn-primary touch-target btn-full"
                    disabled={issuing || !selectedVariant}
                    style={{ fontSize: "15px" }}
                  >
                    {issuing ? "Processing..." : "Confirm Issue"}
                    <ArrowRight size={16} style={{ marginLeft: "auto" }} />
                  </button>
                </div>

              </div>
            ) : (
              <div style={{ flex: 1, display: "grid", placeItems: "center", border: "1.5px dashed var(--color-divider)", borderRadius: "var(--border-radius-sm)", color: "var(--color-text-dim)", textAlign: "center", padding: "20px" }}>
                <div>
                  <HelpCircle size={32} style={{ margin: "0 auto 10px", color: "var(--color-divider)" }} />
                  <p style={{ fontSize: "13px" }}>Please scan a student card and select an available item from the grid.</p>
                </div>
              </div>
            )}

          </div>

        </div>

      </div>

      {/* PROGRESSIVE ENROLLMENT DIALOG MODAL */}
      {showEnrollForm && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: "rgba(27, 31, 36, 0.42)",
          display: "grid",
          placeItems: "center",
          zIndex: 100,
          padding: "20px"
        }}>
          <div className="card animate-fade-in" style={{
            width: "100%",
            maxWidth: "460px",
            border: "2px solid var(--color-brand-charcoal)",
            boxShadow: "var(--shadow-lg)",
            padding: "var(--space-xl)"
          }}>
            <h3 style={{ fontSize: "18px", fontWeight: 800, marginBottom: "4px" }}>Progressive Enrollment</h3>
            <p className="text-muted" style={{ fontSize: "12px", marginBottom: "16px" }}>
              Quick record capture. Will save to the master roster in ~15 seconds.
            </p>

            {enrollError && (
              <div className="badge badge-out" style={{ width: "100%", padding: "8px", marginBottom: "12px", justifyContent: "center" }}>
                {enrollError}
              </div>
            )}

            <form onSubmit={handleEnrollSubmit} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              
              <div className="form-group">
                <label className="form-label">Roll Number (Matched)</label>
                <input 
                  type="text" 
                  className="form-input" 
                  disabled
                  value={enrollForm.roll_no}
                  style={{ backgroundColor: "var(--color-bg)", opacity: 0.8 }}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Student Name</label>
                <input 
                  type="text" 
                  className="form-input" 
                  placeholder="Enter full name"
                  value={enrollForm.name}
                  onChange={(e) => setEnrollForm(prev => ({ ...prev, name: e.target.value }))}
                  required
                  disabled={enrolling}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                <div className="form-group">
                  <label className="form-label">Gender</label>
                  <select 
                    className="form-input"
                    value={enrollForm.gender}
                    onChange={(e) => setEnrollForm(prev => ({ ...prev, gender: e.target.value }))}
                    disabled={enrolling}
                  >
                    <option value="MALE">Male</option>
                    <option value="FEMALE">Female</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Academic Year</label>
                  <select 
                    className="form-input"
                    value={enrollForm.year}
                    onChange={(e) => setEnrollForm(prev => ({ ...prev, year: parseInt(e.target.value) }))}
                    disabled={enrolling}
                  >
                    <option value="1">1st Year</option>
                    <option value="2">2nd Year</option>
                    <option value="3">3rd Year</option>
                    <option value="4">4th Year</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Branch / Department</label>
                <input 
                  type="text" 
                  className="form-input" 
                  placeholder="e.g. CSE, ECE, MECH"
                  value={enrollForm.branch}
                  onChange={(e) => setEnrollForm(prev => ({ ...prev, branch: e.target.value.toUpperCase() }))}
                  required
                  disabled={enrolling}
                />
              </div>

              <div style={{ display: "flex", gap: "8px", marginTop: "10px" }}>
                <button 
                  type="button" 
                  onClick={() => setShowEnrollForm(false)} 
                  className="btn btn-secondary touch-target"
                  style={{ flex: 1, justifyContent: "center" }}
                  disabled={enrolling}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn btn-primary touch-target"
                  style={{ flex: 1, justifyContent: "center" }}
                  disabled={enrolling}
                >
                  {enrolling ? "Enrolling..." : "Enroll Student"}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}
