import { useState } from "react";

const LOGO_URL = "/icon-512.png?v=20260918";

export function LoginPage({ onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  function doLogin() {
    if (!email || !password) { setError("Please enter email and password."); return; }
    setLoading(true); setError(null);
    Promise.resolve(onLogin(email, password)).catch(function (e) {
      setError(e.message);
      setLoading(false);
    });
  }

  return (
    <div className="login-page">
      <div className="login-box">
        <div className="login-logo">
          <img src={LOGO_URL} alt="Husaini Mohallah" style={{ width: "150px", height: "150px", objectFit: "contain", display: "block", margin: "0 auto 14px" }} />
          <div className="login-sub">Husaini Mohallah · Database</div>
        </div>
        <div className="login-title">Sign in to continue</div>
        <div className="login-fields">
          {error && <div className="login-err">{error}</div>}
          <div className="login-field">
            <label>Email</label>
            <input type="text" value={email} onChange={function (e) { setEmail(e.target.value); }} onKeyDown={function (e) { if (e.key === "Enter") doLogin(); }} placeholder="admin@example.com" autoFocus />
          </div>
          <div className="login-field">
            <label>Password</label>
            <input type="password" value={password} onChange={function (e) { setPassword(e.target.value); }} onKeyDown={function (e) { if (e.key === "Enter") doLogin(); }} placeholder="••••••••" />
          </div>
          <button className="login-btn" onClick={doLogin} disabled={loading}>{loading ? "Signing in…" : "Sign In"}</button>
        </div>
        <div className="login-footer">Husaini Mohallah © 2026 · Developed by Juzer Dana</div>
      </div>
    </div>
  );
}
