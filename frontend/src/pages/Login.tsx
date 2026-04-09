import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../api";
import { setCurrentUser } from "../auth";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);
  const nav = useNavigate();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr("");
    setLoading(true);
    try {
      const u = await api.login(username.trim(), password);
      setCurrentUser(u);
      nav("/");
    } catch {
      setErr("Kullanıcı adı veya şifre hatalı.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-left">
        <span className="auth-left-logo">𝕏</span>
      </div>

      <div className="auth-right">
        <div className="auth-card">
          <span className="auth-logo">𝕏</span>
          <h1>Tekrar hoş geldin.</h1>
          <p className="auth-sub">Hesabına giriş yap ve devam et.</p>

          <form onSubmit={submit}>
            <div className="auth-field">
              <label>Kullanıcı adı</label>
              <input
                required
                autoFocus
                autoComplete="username"
                placeholder="ör. alice"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>
            <div className="auth-field">
              <label>Şifre</label>
              <input
                required
                type="password"
                autoComplete="current-password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            {err && (
              <div className="auth-error">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{flexShrink:0}}>
                  <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
                {err}
              </div>
            )}

            <button className="auth-submit" type="submit" disabled={loading}>
              {loading ? "Giriş yapılıyor…" : "Giriş yap"}
            </button>
          </form>

          <div className="auth-divider">veya</div>

          <div className="auth-link-row">
            Hesabın yok mu?{" "}
            <Link to="/register">Kayıt ol</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
