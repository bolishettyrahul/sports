import React, { useState, useEffect } from "react";
import Login from "./components/Login";
import OperatorView from "./components/OperatorView";
import ManagerView from "./components/ManagerView";
import { db } from "./services/api";
import { Wrench, RefreshCw, Smartphone, Monitor } from "lucide-react";

export default function App() {
  const [session, setSession] = useState(null); // { role, token, name, location }
  const [showDevTools, setShowDevTools] = useState(false);

  // Check if session is already stored in localStorage on load
  useEffect(() => {
    const cachedSession = localStorage.getItem("cbit_session");
    if (cachedSession) {
      setSession(JSON.parse(cachedSession));
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

  // Dev tools actions
  const resetDatabase = () => {
    if (window.confirm("Are you sure you want to reset the mock database to its default seeding?")) {
      db.reset();
      window.location.reload();
    }
  };

  const forceRole = (role) => {
    const mockSession = {
      token: `forced-${role}-token`,
      role: role,
      name: role === "operator" ? "Rohan Verma (Forced)" : "S. Rao (Forced)",
      location: role === "operator" ? "Counter 1" : "Central Office"
    };
    handleLoginSuccess(mockSession);
  };

  return (
    <div className={`app-container ${session?.role === "operator" ? "operator-density" : "manager-density"}`}>
      
      {/* RENDER VIEW BASED ON SESSION ROLE */}
      {!session ? (
        <Login onLoginSuccess={handleLoginSuccess} />
      ) : session.role === "operator" ? (
        <OperatorView user={session} onLogout={handleLogout} />
      ) : (
        <ManagerView user={session} onLogout={handleLogout} />
      )}

      {/* FLOATING DEVELOPER UTILITIES DOCK (toggleable) */}
      <div style={{
        position: "fixed",
        bottom: "16px",
        right: "16px",
        zIndex: 999,
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-end",
        gap: "8px"
      }}>
        {showDevTools && (
          <div className="card" style={{
            padding: "12px",
            backgroundColor: "white",
            border: "2px solid var(--color-brand-charcoal)",
            boxShadow: "var(--shadow-lg)",
            display: "flex",
            flexDirection: "column",
            gap: "8px",
            width: "220px",
            fontSize: "12px"
          }}>
            <strong style={{ borderBottom: "1.5px solid var(--color-brand-charcoal)", paddingBottom: "4px", display: "flex", alignItems: "center", gap: "6px" }}>
              <Wrench size={14} /> Dev Sandbox Controls
            </strong>
            
            <button className="btn btn-secondary touch-target" onClick={resetDatabase} style={{ justifyContent: "flex-start", minHeight: "32px", fontSize: "11.5px" }}>
              <RefreshCw size={12} /> Reset Database
            </button>
            
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px" }}>
              <button className="btn btn-secondary touch-target" onClick={() => forceRole("operator")} style={{ minHeight: "32px", fontSize: "10px", padding: "0 6px" }}>
                <Smartphone size={10} /> OP View
              </button>
              <button className="btn btn-secondary touch-target" onClick={() => forceRole("manager")} style={{ minHeight: "32px", fontSize: "10px", padding: "0 6px" }}>
                <Monitor size={10} /> MGR View
              </button>
            </div>
            
            <div className="text-dim" style={{ fontSize: "10px", textAlign: "center", borderTop: "1px solid var(--color-divider-light)", paddingTop: "6px" }}>
              Toggle roles or trigger DB wipes instantly to review progressive flows.
            </div>
          </div>
        )}

        <button 
          onClick={() => setShowDevTools(!showDevTools)}
          className="btn btn-primary touch-target"
          style={{
            width: "38px",
            height: "38px",
            borderRadius: "50%",
            padding: 0,
            display: "grid",
            placeItems: "center",
            boxShadow: "var(--shadow-md)",
            border: "2px solid var(--color-brand-charcoal)"
          }}
          title="Toggle Sandbox Settings"
        >
          <Wrench size={16} />
        </button>
      </div>

    </div>
  );
}
