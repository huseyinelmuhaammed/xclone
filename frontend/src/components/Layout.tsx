import { Link, NavLink, useNavigate } from "react-router-dom";
import { getCurrentUser, setCurrentUser } from "../auth";
import { api, User } from "../api";
import { ReactNode, useEffect, useState } from "react";

/* ── Icons ───────────────────────────────────────── */
const IcHome = () => (
  <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
  </svg>
);
const IcSearch = () => (
  <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
  </svg>
);
const IcBell = () => (
  <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
    <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
  </svg>
);
const IcBookmark = () => (
  <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
  </svg>
);
const IcSettings = () => (
  <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3"/>
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
  </svg>
);
const IcUser = () => (
  <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
  </svg>
);
const IcPen = () => (
  <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
  </svg>
);
const IcSearchSm = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
  </svg>
);

const NAV = [
  { to: "/",              label: "Ana Sayfa",      Icon: IcHome     },
  { to: "/explore",       label: "Keşfet",         Icon: IcSearch   },
  { to: "/notifications", label: "Bildirimler",    Icon: IcBell     },
  { to: "/bookmarks",     label: "Yer İşaretleri", Icon: IcBookmark },
  { to: "/settings",      label: "Ayarlar",        Icon: IcSettings },
];

export function Sidebar() {
  const user = getCurrentUser();
  const navigate = useNavigate();
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    if (!user) return;
    const check = () => api.unreadCount(user.user_id).then((r) => setUnread(r.count)).catch(() => {});
    check();
    const id = setInterval(check, 5000);
    return () => clearInterval(id);
  }, []);

  const logout = () => { setCurrentUser(null); navigate("/login"); };

  return (
    <aside className="sidebar">
      <NavLink to="/" className="logo" style={{ textDecoration: "none", color: "var(--text)", fontSize: 28, fontWeight: 900 }}>
        𝕏
      </NavLink>

      <nav className="nav">
        {NAV.map((n) => (
          <NavLink
            key={n.to}
            to={n.to}
            end={n.to === "/"}
            className={({ isActive }) => "nav-item" + (isActive ? " active" : "")}
          >
            <span className="nav-icon">
              <n.Icon />
              {n.to === "/notifications" && unread > 0 && (
                <span className="notif-badge">{unread > 99 ? "99+" : unread}</span>
              )}
            </span>
            <span className="nav-label">{n.label}</span>
          </NavLink>
        ))}
        {user && (
          <NavLink
            to={`/u/${user.username}`}
            className={({ isActive }) => "nav-item" + (isActive ? " active" : "")}
          >
            <span className="nav-icon"><IcUser /></span>
            <span className="nav-label">Profil</span>
          </NavLink>
        )}
      </nav>

      <button className="tweet-btn" onClick={() => navigate("/")}>
        <span className="nav-label">Gönder</span>
        <span className="tweet-btn-icon" style={{ display: "none" }}><IcPen /></span>
      </button>

      <div className="sidebar-bottom">
        {user ? (
          <div className="sidebar-user" onClick={() => navigate(`/u/${user.username}`)}>
            {user.avatar_url ? (
              <img src={user.avatar_url} style={{ width: 40, height: 40, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />
            ) : (
              <div className="avatar" style={{ width: 40, height: 40, fontSize: 16, flexShrink: 0 }}>
                {user.display_name[0]?.toUpperCase()}
              </div>
            )}
            <div className="nav-label" style={{ flex: 1, minWidth: 0, overflow: "hidden" }}>
              <div style={{ fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", display: "flex", alignItems: "center", gap: 4 }}>
                {user.display_name}
                {user.verified && <span className="verified-badge">✓</span>}
              </div>
              <div style={{ color: "var(--muted)", fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                @{user.username}
              </div>
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); logout(); }}
              title="Çıkış yap"
              style={{ background: "none", border: "none", color: "var(--muted)", cursor: "pointer", padding: 4, borderRadius: 6, fontSize: 18, flexShrink: 0, lineHeight: 1 }}
            >
              ···
            </button>
          </div>
        ) : (
          <Link to="/login" className="sidebar-user">
            <div className="avatar" style={{ width: 40, height: 40, fontSize: 16 }}>?</div>
            <div className="nav-label">Giriş yap</div>
          </Link>
        )}
      </div>
    </aside>
  );
}

export function RightPanel() {
  const navigate = useNavigate();
  const me = getCurrentUser();
  const [suggestions, setSuggestions] = useState<User[]>([]);

  useEffect(() => {
    if (!me) return;
    api.suggestions(me.username).then(setSuggestions).catch(() => {});
  }, [me?.username]);

  const doFollow = (u: User) => {
    if (!me) return navigate("/login");
    api.follow(me.user_id, u.user_id)
      .then(() => setSuggestions(s => s.filter(x => x.user_id !== u.user_id)))
      .catch(() => {});
  };

  return (
    <aside className="right">
      <div className="search-box">
        <IcSearchSm />
        <input
          placeholder="Ara"
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              const v = (e.target as HTMLInputElement).value.trim();
              if (v.startsWith("#")) navigate(`/hashtag/${v.slice(1)}`);
              else if (v) navigate(`/u/${v}`);
            }
          }}
        />
      </div>

      {/* Gündemdekiler */}
      <div className="panel">
        <div className="panel-title">Gündemdekiler</div>
        {["#scylladb", "#fastapi", "#react", "#docker", "#typescript"].map((t, i) => (
          <div key={t} className="panel-item" onClick={() => navigate(`/hashtag/${t.slice(1)}`)}>
            <div className="small">Gündemde · {["Teknoloji", "Yazılım", "Web", "DevOps", "Geliştirme"][i]}</div>
            <div className="label">{t}</div>
          </div>
        ))}
        <span className="panel-show-more" onClick={() => navigate("/explore")}>Daha fazla göster</span>
      </div>

      {/* Kimi takip etmeli */}
      <div className="panel">
        <div className="panel-title">Kimi takip etmeli</div>
        {suggestions.length === 0 && (
          <div className="panel-item" style={{ color: "var(--muted)", fontSize: 14 }}>
            {me ? "Öneri yok" : "Giriş yaparak önerileri gör"}
          </div>
        )}
        {suggestions.map((u) => (
          <div key={u.user_id} className="panel-item" style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              onClick={() => navigate(`/u/${u.username}`)}
              style={{ display: "flex", alignItems: "center", gap: 10, flex: 1, cursor: "pointer", minWidth: 0 }}
            >
              {u.avatar_url ? (
                <img src={u.avatar_url} style={{ width: 40, height: 40, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />
              ) : (
                <div className="avatar" style={{ width: 40, height: 40, fontSize: 16, flexShrink: 0 }}>
                  {u.display_name[0]?.toUpperCase()}
                </div>
              )}
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 700, display: "flex", alignItems: "center", gap: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: 15 }}>
                  {u.display_name}
                  {u.verified && <span className="verified-badge">✓</span>}
                </div>
                <div style={{ color: "var(--muted)", fontSize: 13 }}>@{u.username}</div>
              </div>
            </div>
            <button
              className="btn-follow"
              onClick={() => doFollow(u)}
              style={{ flexShrink: 0, fontSize: 14, padding: "6px 16px" }}
            >
              Takip et
            </button>
          </div>
        ))}
        {suggestions.length > 0 && (
          <span className="panel-show-more">Daha fazla göster</span>
        )}
      </div>

      {/* Footer */}
      <div className="panel-footer">
        <a href="#">Hizmet Koşulları</a>
        <a href="#">Gizlilik Politikası</a>
        <a href="#">Çerez Politikası</a>
        <a href="#">Erişilebilirlik</a>
        <a href="#">Hakkında</a>
        <span>© 2025 X Corp.</span>
      </div>
    </aside>
  );
}

export default function Layout({ children, title }: { children: ReactNode; title: string }) {
  return (
    <div className="layout">
      <Sidebar />
      <main className="center">
        <div className="center-header">{title}</div>
        {children}
      </main>
      <RightPanel />
    </div>
  );
}
