import { useRef, useState } from "react";
import { api, User } from "../api";

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

export default function EditProfileModal({
  user,
  onClose,
  onSaved,
}: {
  user: User;
  onClose: () => void;
  onSaved: (u: User) => void;
}) {
  const [displayName, setDisplayName] = useState(user.display_name);
  const [bio, setBio] = useState(user.bio || "");
  const [avatar, setAvatar] = useState(user.avatar_url || "");
  const [banner, setBanner] = useState(user.banner_url || "");
  const [location, setLocation] = useState(user.location || "");
  const [website, setWebsite] = useState(user.website || "");
  const [busy, setBusy] = useState(false);
  const avatarRef = useRef<HTMLInputElement>(null);
  const bannerRef = useRef<HTMLInputElement>(null);

  const pickAvatar = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 1024 * 1024) {
      alert("Avatar çok büyük (maks. 1MB)");
      return;
    }
    setAvatar(await readFileAsDataUrl(f));
  };

  const pickBanner = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 3 * 1024 * 1024) {
      alert("Kapak fotoğrafı çok büyük (maks. 3MB)");
      return;
    }
    setBanner(await readFileAsDataUrl(f));
  };

  const save = async () => {
    setBusy(true);
    try {
      const updated = await api.updateUser(user.username, {
        display_name: displayName,
        bio,
        avatar_url: avatar,
        banner_url: banner,
        location,
        website,
      });
      onSaved(updated);
      onClose();
    } catch (e: any) {
      alert(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,.7)",
        display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: "var(--bg-elev)", borderRadius: 16,
          width: "min(92vw, 480px)", maxHeight: "90vh", overflowY: "auto",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 24px 0" }}>
          <h2 style={{ margin: 0 }}>Profili düzenle</h2>
          <button className="btn-outline" onClick={onClose}>✕</button>
        </div>

        {/* Banner */}
        <div
          style={{
            position: "relative", margin: "16px 24px 0", height: 150, borderRadius: 12,
            background: banner ? `url(${banner}) center/cover` : "var(--border)",
            cursor: "pointer",
          }}
          onClick={() => bannerRef.current?.click()}
        >
          <div style={{
            position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center",
            background: "rgba(0,0,0,.4)", borderRadius: 12, opacity: 0, transition: "opacity .2s",
          }}
            onMouseEnter={(e) => (e.currentTarget.style.opacity = "1")}
            onMouseLeave={(e) => (e.currentTarget.style.opacity = "0")}
          >
            <span style={{ color: "#fff", fontSize: 14, fontWeight: 600 }}>
              {banner ? "Kapak fotoğrafını değiştir" : "Kapak fotoğrafı ekle"}
            </span>
          </div>
          {banner && (
            <button
              onClick={(e) => { e.stopPropagation(); setBanner(""); }}
              style={{
                position: "absolute", top: 8, right: 8,
                background: "rgba(0,0,0,.7)", border: "none", color: "#fff",
                borderRadius: 9999, width: 28, height: 28, cursor: "pointer", fontSize: 14,
              }}
            >✕</button>
          )}
        </div>
        <input ref={bannerRef} type="file" accept="image/*" onChange={pickBanner} style={{ display: "none" }} />

        {/* Avatar */}
        <div style={{ display: "flex", alignItems: "center", gap: 16, padding: "16px 24px 0" }}>
          {avatar ? (
            <img src={avatar} alt="" style={{ width: 80, height: 80, borderRadius: 9999, objectFit: "cover" }} />
          ) : (
            <div className="avatar" style={{ width: 80, height: 80, fontSize: 32 }}>
              {displayName[0]?.toUpperCase()}
            </div>
          )}
          <button className="btn-outline" onClick={() => avatarRef.current?.click()}>
            Fotoğrafı değiştir
          </button>
          {avatar && <button className="btn-outline" onClick={() => setAvatar("")}>Kaldır</button>}
          <input ref={avatarRef} type="file" accept="image/*" onChange={pickAvatar} style={{ display: "none" }} />
        </div>

        {/* Fields */}
        <div style={{ padding: "0 24px 24px" }}>
          <label style={{ display: "block", fontSize: 13, color: "var(--muted)", marginTop: 16 }}>Görünen ad</label>
          <input
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            style={{ width: "100%", padding: 12, marginTop: 6, background: "var(--bg)", color: "var(--text)", border: "1px solid var(--border)", borderRadius: 8 }}
          />
          <label style={{ display: "block", fontSize: 13, color: "var(--muted)", marginTop: 14 }}>Biyografi</label>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            rows={3}
            style={{ width: "100%", padding: 12, marginTop: 6, background: "var(--bg)", color: "var(--text)", border: "1px solid var(--border)", borderRadius: 8, fontFamily: "inherit" }}
          />
          <label style={{ display: "block", fontSize: 13, color: "var(--muted)", marginTop: 14 }}>Konum</label>
          <input
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="İstanbul, Türkiye"
            style={{ width: "100%", padding: 12, marginTop: 6, background: "var(--bg)", color: "var(--text)", border: "1px solid var(--border)", borderRadius: 8 }}
          />
          <label style={{ display: "block", fontSize: 13, color: "var(--muted)", marginTop: 14 }}>Web sitesi</label>
          <input
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
            placeholder="https://example.com"
            style={{ width: "100%", padding: 12, marginTop: 6, background: "var(--bg)", color: "var(--text)", border: "1px solid var(--border)", borderRadius: 8 }}
          />

          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 20 }}>
            <button className="btn-primary" disabled={busy} onClick={save}>Kaydet</button>
          </div>
        </div>
      </div>
    </div>
  );
}
