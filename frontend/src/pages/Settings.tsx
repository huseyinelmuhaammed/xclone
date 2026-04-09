import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import Layout from "../components/Layout";
import { api } from "../api";
import { getCurrentUser, setCurrentUser, getTheme, setTheme } from "../auth";

export default function Settings() {
  const me = getCurrentUser();
  const nav = useNavigate();
  if (!me) return <Navigate to="/login" />;

  const [currentPwd, setCurrentPwd] = useState("");
  const [newPwd, setNewPwd] = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");
  const [pwdMsg, setPwdMsg] = useState({ text: "", ok: false });
  const [pwdBusy, setPwdBusy] = useState(false);

  const [theme, setThemeState] = useState<"dark" | "light">(getTheme());
  const [verified, setVerified] = useState(me.verified || false);

  const changePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPwd !== confirmPwd) {
      setPwdMsg({ text: "Yeni şifreler eşleşmiyor", ok: false });
      return;
    }
    setPwdBusy(true);
    setPwdMsg({ text: "", ok: false });
    try {
      await api.changePassword(me.username, currentPwd, newPwd);
      setPwdMsg({ text: "Şifre başarıyla değiştirildi!", ok: true });
      setCurrentPwd(""); setNewPwd(""); setConfirmPwd("");
    } catch {
      setPwdMsg({ text: "Mevcut şifre hatalı", ok: false });
    } finally {
      setPwdBusy(false);
    }
  };

  const toggleTheme = (t: "dark" | "light") => {
    setTheme(t);
    setThemeState(t);
  };

  const toggleVerify = async () => {
    try {
      const res = await api.verifyUser(me.username);
      setVerified(res.verified);
      setCurrentUser({ ...me, verified: res.verified });
    } catch (e: any) {
      alert(e.message);
    }
  };

  const doDelete = async () => {
    if (!confirm("Hesabın kalıcı olarak silinecek. Emin misin?")) return;
    try {
      await api.deleteUser(me.username);
      setCurrentUser(null);
      nav("/login");
    } catch (e: any) {
      alert("Silme başarısız: " + e.message);
    }
  };

  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "10px 12px", marginTop: 4, marginBottom: 12,
    background: "var(--bg)", color: "var(--text)",
    border: "1px solid var(--border)", borderRadius: 8,
    fontFamily: "inherit", fontSize: 15,
  };

  return (
    <Layout title="Ayarlar">

      {/* Şifre Değiştir */}
      <div className="settings-section">
        <h2>Şifre Değiştir</h2>
        <form onSubmit={changePassword}>
          <label style={{ display: "block", color: "var(--muted)", fontSize: 13 }}>Mevcut şifre</label>
          <input type="password" value={currentPwd} onChange={e => setCurrentPwd(e.target.value)}
            required style={inputStyle} />
          <label style={{ display: "block", color: "var(--muted)", fontSize: 13 }}>Yeni şifre</label>
          <input type="password" value={newPwd} onChange={e => setNewPwd(e.target.value)}
            required minLength={6} style={inputStyle} />
          <label style={{ display: "block", color: "var(--muted)", fontSize: 13 }}>Yeni şifre tekrar</label>
          <input type="password" value={confirmPwd} onChange={e => setConfirmPwd(e.target.value)}
            required style={inputStyle} />
          {pwdMsg.text && (
            <div style={{ color: pwdMsg.ok ? "#00ba7c" : "var(--danger)", marginBottom: 12, fontSize: 14 }}>
              {pwdMsg.text}
            </div>
          )}
          <button className="btn-primary" type="submit" disabled={pwdBusy}
            style={{ borderRadius: 8, padding: "10px 24px" }}>
            {pwdBusy ? "Değiştiriliyor…" : "Şifreyi Değiştir"}
          </button>
        </form>
      </div>

      {/* Mavi Tik */}
      <div className="settings-section">
        <h2>Doğrulanmış Hesap</h2>
        <div className="settings-row">
          <div>
            <div style={{ fontWeight: 700, display: "flex", alignItems: "center", gap: 6 }}>
              Mavi Tik {verified && <span className="verified-badge">✓</span>}
            </div>
            <div style={{ color: "var(--muted)", fontSize: 14, marginTop: 4 }}>
              {verified ? "Hesabın doğrulanmış olarak görünüyor." : "Hesabını doğrula, mavi tik kazan."}
            </div>
          </div>
          <button
            className={verified ? "btn-outline" : "btn-primary"}
            onClick={toggleVerify}
            style={{ borderRadius: 9999, padding: "8px 20px", flexShrink: 0 }}
          >
            {verified ? "Kaldır" : "Mavi Tik Al"}
          </button>
        </div>
      </div>

      {/* Tema */}
      <div className="settings-section">
        <h2>Görünüm</h2>
        <div style={{ display: "flex", gap: 16, marginTop: 8 }}>
          <div
            className={"theme-option" + (theme === "dark" ? " active" : "")}
            onClick={() => toggleTheme("dark")}
          >
            <span style={{ fontSize: 28 }}>🌙</span>
            <span style={{ fontWeight: theme === "dark" ? 700 : 400 }}>Koyu</span>
          </div>
          <div
            className={"theme-option" + (theme === "light" ? " active" : "")}
            onClick={() => toggleTheme("light")}
          >
            <span style={{ fontSize: 28 }}>☀️</span>
            <span style={{ fontWeight: theme === "light" ? 700 : 400 }}>Açık</span>
          </div>
        </div>
      </div>

      {/* Hesabı Kapat */}
      <div className="settings-section">
        <h2 style={{ color: "var(--danger)" }}>Hesabı Kapat</h2>
        <p style={{ color: "var(--muted)", marginTop: 0, fontSize: 14 }}>
          Bu işlem geri alınamaz. Tüm gönderilerin ve verilen kalıcı olarak silinir.
        </p>
        <button onClick={doDelete}
          style={{ background: "var(--danger)", color: "#fff", border: "none", borderRadius: 9999, padding: "10px 22px", fontWeight: 700, cursor: "pointer", fontSize: 15 }}>
          Hesabımı Sil
        </button>
      </div>

    </Layout>
  );
}
