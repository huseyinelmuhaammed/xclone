import { useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import Layout from "../components/Layout";
import { api } from "../api";
import { getCurrentUser } from "../auth";

type Notif = {
  notif_id: string;
  type: "like" | "reply" | "repost" | "follow";
  actor_id: string;
  actor_username: string;
  actor_display_name: string;
  tweet_id: string | null;
  tweet_content: string;
  is_read: boolean;
  created_at: string;
};

const IcHeart = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
  </svg>
);
const IcReply = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
  </svg>
);
const IcRepost = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="17 1 21 5 17 9"/>
    <path d="M3 11V9a4 4 0 0 1 4-4h14"/>
    <polyline points="7 23 3 19 7 15"/>
    <path d="M21 13v2a4 4 0 0 1-4 4H3"/>
  </svg>
);
const IcUserPlus = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
    <circle cx="9" cy="7" r="4"/>
    <line x1="19" y1="8" x2="19" y2="14"/>
    <line x1="22" y1="11" x2="16" y2="11"/>
  </svg>
);

const TYPE_CONFIG = {
  like:   { Icon: IcHeart,   cls: "like",   text: "gönderini beğendi" },
  reply:  { Icon: IcReply,   cls: "reply",  text: "gönderine yanıt verdi" },
  repost: { Icon: IcRepost,  cls: "repost", text: "gönderini yeniden paylaştı" },
  follow: { Icon: IcUserPlus, cls: "follow", text: "seni takip etmeye başladı" },
};

function formatTime(raw: string) {
  const d = new Date(raw);
  const diff = (Date.now() - d.getTime()) / 1000;
  if (diff < 60) return `${Math.floor(diff)}s`;
  if (diff < 3600) return `${Math.floor(diff / 60)}d`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}sa`;
  return d.toLocaleDateString("tr-TR", { day: "numeric", month: "short" });
}

export default function Notifications() {
  const user = getCurrentUser();
  const [notifs, setNotifs] = useState<Notif[]>([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    if (!user) return;
    api.notifications(user.user_id)
      .then(setNotifs).catch(() => {}).finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    if (user) api.readAllNotifications(user.user_id).catch(() => {});
    const id = setInterval(load, 5000);
    return () => clearInterval(id);
  }, []);

  if (!user) return <Navigate to="/login" />;

  return (
    <Layout title="Bildirimler">
      {loading && <div className="empty">Yükleniyor…</div>}
      {!loading && notifs.length === 0 && (
        <div className="empty">Henüz bildirim yok.</div>
      )}
      {notifs.map((n) => {
        const cfg = TYPE_CONFIG[n.type];
        return (
          <div key={n.notif_id} className={`notif-item${n.is_read ? "" : " unread"}`}>
            <div className="notif-icon-wrap">
              <div className={`notif-icon ${cfg.cls}`}>
                <cfg.Icon />
              </div>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                <div className="avatar" style={{ width: 36, height: 36, fontSize: 14, flexShrink: 0 }}>
                  {(n.actor_display_name || "?")[0].toUpperCase()}
                </div>
              </div>
              <div style={{ fontSize: 15 }}>
                <Link to={`/u/${n.actor_username}`} style={{ fontWeight: 700, color: "inherit" }}>
                  {n.actor_display_name}
                </Link>
                {" "}{cfg.text}
              </div>
              {n.tweet_content && (
                <div style={{ color: "var(--muted)", fontSize: 14, marginTop: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {n.tweet_content}
                </div>
              )}
              <div style={{ color: "var(--muted)", fontSize: 13, marginTop: 4 }}>
                {n.created_at ? formatTime(n.created_at) : ""}
              </div>
            </div>
          </div>
        );
      })}
    </Layout>
  );
}
