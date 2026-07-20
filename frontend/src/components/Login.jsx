import React, { useState } from "react";
import { apiService } from "../services/api";
import { Shield, Key, Eye, EyeOff, Loader2, AlertTriangle } from "lucide-react";

export default function Login({ onLoginSuccess }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username || !password) {
      setError("Enter both a username and a password to continue.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const session = await apiService.login(username, password);
      onLoginSuccess(session);
    } catch (err) {
      setError(err.message || "Could not sign in. Check the username and password, then try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main style={{ flex: 1, display: "grid", placeItems: "center", padding: "var(--space-lg)" }}>
      <div
        className="card"
        style={{
          width: "100%",
          maxWidth: "420px",
          padding: "var(--space-xxl)",
          border: "2px solid var(--color-brand-charcoal)",
          boxShadow: "var(--shadow-lg)"
        }}
      >
        {/* Header monogram. design.md §10: the mark never sits on maroon. */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "var(--space-sm)",
            marginBottom: "var(--space-xxl)"
          }}
        >
          <div
            style={{
              width: "56px",
              height: "56px",
              background: "var(--color-surface)",
              color: "var(--color-brand-maroon)",
              display: "grid",
              placeItems: "center",
              fontWeight: 800,
              fontSize: "var(--text-xl)",
              border: "2px solid var(--color-brand-maroon)"
            }}
          >
            CB
          </div>
          <div style={{ textAlign: "center" }}>
            <h1 style={{ fontSize: "var(--text-xl)", fontWeight: 800 }}>CBIT Sports</h1>
            <p
              className="text-muted font-mono"
              style={{
                fontSize: "var(--text-xs)",
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                marginTop: "var(--space-xs)"
              }}
            >
              Equipment Desk Portal
            </p>
          </div>
        </div>

        {error && (
          <div
            role="alert"
            className="badge badge-out"
            style={{
              width: "100%",
              padding: "var(--space-md)",
              marginBottom: "var(--space-lg)",
              gap: "var(--space-sm)",
              alignItems: "flex-start",
              lineHeight: 1.4
            }}
          >
            <AlertTriangle size={16} aria-hidden="true" style={{ flexShrink: 0, marginTop: "1px" }} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "var(--space-lg)" }}>
          <div className="form-group">
            <label className="form-label" htmlFor="username">Username</label>
            <div className="field-wrap">
              <span className="field-icon field-icon-left">
                <Shield size={16} aria-hidden="true" />
              </span>
              <input
                id="username"
                type="text"
                autoComplete="username"
                className="form-input has-icon-left"
                placeholder="operator1 / manager"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={loading}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="password">Password</label>
            <div className="field-wrap">
              <span className="field-icon field-icon-left">
                <Key size={16} aria-hidden="true" />
              </span>
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                className="form-input has-icon-left has-icon-right"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
              />
              <button
                type="button"
                className="btn btn-secondary btn-icon field-icon-right"
                style={{ position: "absolute", top: "50%", transform: "translateY(-50%)", border: "none", background: "none" }}
                onClick={() => setShowPassword(!showPassword)}
                disabled={loading}
                aria-label={showPassword ? "Hide password" : "Show password"}
                aria-pressed={showPassword}
              >
                {showPassword ? <EyeOff size={16} aria-hidden="true" /> : <Eye size={16} aria-hidden="true" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-full"
            style={{ marginTop: "var(--space-sm)" }}
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="animate-spin" size={18} aria-hidden="true" />
                Signing in…
              </>
            ) : (
              "Log in"
            )}
          </button>
        </form>

        <div
          style={{
            marginTop: "var(--space-xxl)",
            padding: "var(--space-md)",
            backgroundColor: "var(--color-bg)",
            border: "1px dashed var(--color-divider)",
            borderRadius: "var(--border-radius-sm)"
          }}
        >
          <p
            style={{
              fontSize: "var(--text-2xs)",
              fontWeight: 600,
              color: "var(--color-text-muted)",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              marginBottom: "var(--space-xs)"
            }}
          >
            Demo access credentials
          </p>
          <div className="font-mono" style={{ fontSize: "var(--text-xs)", display: "grid", gap: "var(--space-xs)" }}>
            <div><span style={{ fontWeight: 600 }}>Operator:</span> operator1 / password</div>
            <div><span style={{ fontWeight: 600 }}>Manager:</span> manager / password</div>
          </div>
        </div>
      </div>
    </main>
  );
}
