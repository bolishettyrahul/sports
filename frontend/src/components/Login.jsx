import React, { useState } from "react";
import { apiService } from "../services/api";
import { Shield, Key, Eye, EyeOff, Loader2 } from "lucide-react";

export default function Login({ onLoginSuccess }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username || !password) {
      setError("Please fill in all fields.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const session = await apiService.login(username, password);
      onLoginSuccess(session);
    } catch (err) {
      setError(err.message || "Failed to authenticate.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-container" style={{ display: "grid", placeItems: "center", padding: "20px", background: "var(--color-bg)" }}>
      <div className="card" style={{ width: "100%", maxWidth: "420px", padding: "var(--space-xxl)", border: "2px solid var(--color-brand-charcoal)", boxShadow: "var(--shadow-lg)" }}>
        
        {/* Header Monogram */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "10px", marginBottom: "var(--space-xxl)" }}>
          <div style={{
            width: "56px",
            height: "56px",
            background: "var(--color-brand-maroon)",
            color: "white",
            display: "grid",
            placeItems: "center",
            fontFamily: "var(--font-sans)",
            fontWeight: 800,
            fontSize: "22px",
            border: "2px solid var(--color-brand-charcoal)"
          }}>
            CB
          </div>
          <div style={{ textAlign: "center" }}>
            <h2 style={{ fontSize: "20px", fontWeight: 800 }}>CBIT Sports</h2>
            <p className="text-muted" style={{ fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.06em", fontFamily: "var(--font-mono)", marginTop: "4px" }}>
              Equipment Desk Portal
            </p>
          </div>
        </div>

        {error && (
          <div className="badge badge-out" style={{ width: "100%", padding: "10px", marginBottom: "var(--space-lg)", justifyContent: "center", fontSize: "12.5px" }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "var(--space-lg)" }}>
          
          {/* Username */}
          <div className="form-group">
            <label className="form-label" htmlFor="username">Username</label>
            <div style={{ position: "relative" }}>
              <span style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)", color: "var(--color-text-dim)" }}>
                <Shield size={16} />
              </span>
              <input
                id="username"
                type="text"
                className="form-input"
                style={{ width: "100%", height: "46px", paddingLeft: "42px", fontSize: "14px" }}
                placeholder="operator1 / manager"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={loading}
              />
            </div>
          </div>

          {/* Password */}
          <div className="form-group">
            <label className="form-label" htmlFor="password">Password</label>
            <div style={{ position: "relative" }}>
              <span style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)", color: "var(--color-text-dim)" }}>
                <Key size={16} />
              </span>
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                className="form-input"
                style={{ width: "100%", height: "46px", paddingLeft: "42px", paddingRight: "42px", fontSize: "14px" }}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
              />
              <button
                type="button"
                style={{
                  position: "absolute",
                  right: "12px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "var(--color-text-dim)",
                  display: "flex",
                  alignItems: "center"
                }}
                onClick={() => setShowPassword(!showPassword)}
                disabled={loading}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            className="btn btn-primary"
            style={{ height: "48px", marginTop: "var(--space-sm)", fontSize: "15px" }}
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="animate-spin" size={18} />
                Authenticating...
              </>
            ) : (
              "Log In"
            )}
          </button>
        </form>

        {/* Credentials Hints */}
        <div style={{
          marginTop: "var(--space-xxl)",
          padding: "var(--space-md)",
          backgroundColor: "var(--color-bg)",
          border: "1.5px dashed var(--color-divider)",
          borderRadius: "var(--border-radius-sm)"
        }}>
          <p style={{ fontSize: "11px", fontWeight: "600", color: "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "4px" }}>
            Demo Access Credentials
          </p>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: "11.5px", display: "grid", gap: "4px" }}>
            <div><span style={{ fontWeight: 600 }}>Operator:</span> operator1 / password</div>
            <div><span style={{ fontWeight: 600 }}>Manager:</span> manager / password</div>
          </div>
        </div>

      </div>
    </div>
  );
}
