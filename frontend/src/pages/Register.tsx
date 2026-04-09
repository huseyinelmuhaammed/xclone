import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../api";
import { setCurrentUser } from "../auth";

export default function Register() {
  const [form, setForm] = useState({ username: "", display_name: "", password: "", confirm: "", bio: "" });
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);
  const nav = useNavigate();

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm({ ...form, [k]: e.target.value });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr("");
    if (form.password !== form.confirm) { setErr("Şifreler eşleşmiyor."); return; }
    if (form.password.length < 6) { setErr("Şifre en az 6 karakter olmalı."); return; }
    setLoading(true);
    try {
      const u = await api.register({ username: form.username, display_name: form.display_name, password: form.password, bio: form.bio });
      setCurrentUser({ ...u, followers_count: 0, following_count: 0 });
      nav("/");
    } catch (e: any) {
      setErr(e.message?.includes("409") ? "Bu kullanıcı adı zaten alınmış." : "Kayıt başarısız, tekrar dene.");
    } finally {
      setLoading(false);
    }
  };

  const steps = [
    { key: "username",     label: "Kullanıcı adı",   type: "text",     placeholder: "ör. alice",          autoComplete: "username" },
    { key: "display_name", label: "Görünen ad",       type: "text",     placeholder: "ör. Alice Johnson",   autoComplete: "name" },
    { key: "password",     label: "Şifre",            type: "password", placeholder: "En az 6 karakter",    autoComplete: "new-password" },
    { key: "confirm",      label: "Şifre tekrar",     type: "password", placeholder: "••••••••",            autoComplete: "new-password" },
  ] as const;

  return (
    <div className="auth-page">
      <div className="auth-left">
        <span className="auth-left-logo">𝕏</span>
      </div>

      <div className="auth-right">
        <div className="auth-card">
          <span className="auth-logo">𝕏</span>
          <h1>Hesabını oluştur.</h1>
          <p className="auth-sub">Topluluğa katılmak sadece birkaç saniye sürer.</p>

          <form onSubmit={submit}>
            {steps.map(({ key, label, type, placeholder, autoComplete }) => (
              <div className="auth-field" key={key}>
                <label>{label}</label>
                <input
                  required
                  type={type}
                  placeholder={placeholder}
                  autoComplete={autoComplete}
                  value={form[key]}
                  onChange={set(key)}
                />
              </div>
            ))}

            <div className="auth-field">
              <label>Biyografi <span style={{ color: "var(--muted)", fontWeight: 400, textTransform: "none", letterSpacing: 0 }}>(isteğe bağlı)</span></label>
              <textarea
                placeholder="Kendini kısaca tanıt…"
                value={form.bio}
                onChange={set("bio")}
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
              {loading ? "Hesap oluşturuluyor…" : "Hesap oluştur"}
            </button>
          </form>

          <div className="auth-divider">veya</div>

          <div className="auth-link-row">
            Zaten hesabın var mı?{" "}
            <Link to="/login">Giriş yap</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
