import React, { useState, useEffect } from "react";
import Login from "./components/Login";
import OperatorView from "./components/OperatorView";
import ManagerView from "./components/ManagerView";
import { db } from "./services/api";
import { Wrench, RefreshCw, Smartphone, Monitor } from "lucide-react";

/**
 * Sandbox-only controls. Rendered exclusively under `import.meta.env.DEV` —
 * this dock can force a role, so shipping it to production would defeat the
 * operator/manager separation required by NFR-10.
 */
function DevDock({ onForceRole }) {
  const [open, setOpen] = useState(false);

  const resetDatabase = () => {
    if (window.confirm("Reset the mock database to its default seeding?")) {
      db.reset();
      window.location.reload();
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        bottom: "var(--space-lg)",
        right: "var(--space-lg)",
        zIndex: 999,
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-end",
        gap: "var(--space-sm)"
      }}
    >
      {open && (
        <div
          className="card"
          style={{
            border: "2px solid var(--color-brand-charcoal)",
            boxShadow: "var(--shadow-lg)",
            display: "flex",
            flexDirection: "column",
            gap: "var(--space-sm)",
            // Clamped to the viewport: at operator density the two role buttons
            // need ~252px and used to spill off the right edge.
            width: "min(230px, calc(100vw - 2 * var(--space-lg)))"
          }}
        >
          <strong
            style={{
              borderBottom: "1px solid var(--color-brand-charcoal)",
              paddingBottom: "var(--space-xs)",
              display: "flex",
              alignItems: "center",
              gap: "var(--space-xs)",
              fontSize: "var(--text-sm)"
            }}
          >
            <Wrench size={14} aria-hidden="true" /> Dev sandbox controls
          </strong>

          <button className="btn btn-secondary touch-target" onClick={resetDatabase} style={{ justifyContent: "flex-start" }}>
            <RefreshCw size={12} aria-hidden="true" /> Reset database
          </button>

          {/* minmax(0,1fr): grid items default to min-width:auto and refuse to
              shrink below their content, which is what pushed these off-screen. */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: "var(--space-xs)" }}>
            <button className="btn btn-secondary touch-target" onClick={() => onForceRole("operator")} style={{ minWidth: 0, padding: "0 var(--space-sm)" }}>
              <Smartphone size={12} aria-hidden="true" /> Operator
            </button>
            <button className="btn btn-secondary touch-target" onClick={() => onForceRole("manager")} style={{ minWidth: 0, padding: "0 var(--space-sm)" }}>
              <Monitor size={12} aria-hidden="true" /> Manager
            </button>
          </div>
        </div>
      )}

      <button
        onClick={() => setOpen(!open)}
        className="btn btn-primary touch-target"
        aria-expanded={open}
        aria-label="Toggle developer sandbox controls"
        style={{
          width: "44px",
          height: "44px",
          minHeight: "44px",
          borderRadius: "50%",
          padding: 0,
          display: "grid",
          placeItems: "center",
          boxShadow: "var(--shadow-md)",
          border: "2px solid var(--color-brand-charcoal)"
        }}
      >
        <Wrench size={16} aria-hidden="true" />
      </button>
    </div>
  );
}

export default function App() {
  const [session, setSession] = useState(null); // { role, token, name, location }

  // Restore a stored session on load
  useEffect(() => {
    try {
      const cachedSession = localStorage.getItem("cbit_session");
      if (cachedSession && cachedSession !== "undefined" && cachedSession !== "null") {
        setSession(JSON.parse(cachedSession));
      }
    } catch (e) {
      console.error("Failed to parse cached session:", e);
      localStorage.removeItem("cbit_session");
    }
  }, []);

  const handleLoginSuccess = (userSession) => {
    localStorage.setItem("cbit_session", JSON.stringify(userSession));
    setSession(userSession);
  };

  const handleLogout = () => {
    localStorage.removeItem("cbit_session");
    setSession(null);
  };

  const forceRole = (role) => {
    handleLoginSuccess({
      token: `forced-${role}-token`,
      role,
      username: role === "operator" ? "operator1" : "manager",
      name: role === "operator" ? "Rohan Verma (Forced)" : "S. Rao (Forced)",
      location: role === "operator" ? "Counter 1" : "Central Office"
    });
  };

  // The density class owns touch-target sizing and frame width, so it lives on
  // the single app shell rather than being repeated inside each view.
  const density = session?.role === "manager" ? "manager-density" : "operator-density";

  return (
    <div className={`app-container ${density}`}>
      {!session ? (
        <Login onLoginSuccess={handleLoginSuccess} />
      ) : session.role === "operator" ? (
        <OperatorView user={session} onLogout={handleLogout} />
      ) : (
        <ManagerView user={session} onLogout={handleLogout} />
      )}

      {import.meta.env.DEV && <DevDock onForceRole={forceRole} />}
    </div>
  );
}
