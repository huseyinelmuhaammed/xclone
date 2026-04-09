import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Layout from "../components/Layout";

const IcMapPin = () => (
  <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
  </svg>
);
const IcLink = () => (
  <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
  </svg>
);
const IcCalendar = () => (
  <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
  </svg>
);
import TweetCard from "../components/TweetCard";
import EditProfileModal from "../components/EditProfileModal";
import FollowListModal from "../components/FollowListModal";
import { api, Tweet, User } from "../api";
import { getCurrentUser, setCurrentUser } from "../auth";

export default function Profile() {
  const { username = "" } = useParams();
  const [user, setUser] = useState<User | null>(null);
  const [tweets, setTweets] = useState<Tweet[]>([]);
  const [err, setErr] = useState("");
  const [editing, setEditing] = useState(false);
  const [followList, setFollowList] = useState<"followers" | "following" | null>(null);
  const [amFollowing, setAmFollowing] = useState(false);
  const [followBusy, setFollowBusy] = useState(false);
  const me = getCurrentUser();
  const nav = useNavigate();
  const isMe = !!(me && user && me.username === user.username);

  const load = async () => {
    try {
      const u = await api.getUser(username);
      setUser(u);
      const ts = await api.userTweets(username);
      setTweets(ts);
    } catch (e: any) {
      setErr(e.message);
    }
  };

  const checkFollowing = async () => {
    if (!me || me.username === username) return;
    try {
      const res = await api.isFollowing(me.username, username);
      setAmFollowing(res.following);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    load();
    checkFollowing();
    const id = setInterval(load, 5000);
    return () => clearInterval(id);
  }, [username]);

  const doFollow = async () => {
    if (!me || !user) return;
    setFollowBusy(true);
    try {
      await api.follow(me.user_id, user.user_id);
      setAmFollowing(true);
      await load();
    } catch (e: any) {
      alert("Takip edilemedi: " + e.message);
    } finally {
      setFollowBusy(false);
    }
  };

  const doUnfollow = async () => {
    if (!me || !user) return;
    setFollowBusy(true);
    try {
      await api.unfollow(me.user_id, user.user_id);
      setAmFollowing(false);
      await load();
    } catch (e: any) {
      alert("Takipten çıkılamadı: " + e.message);
    } finally {
      setFollowBusy(false);
    }
  };

  const doDelete = async () => {
    if (!user) return;
    if (!confirm(`@${user.username} silinsin mi? Bu işlem geri alınamaz.`)) return;
    try {
      await api.deleteUser(user.username);
      if (isMe) {
        setCurrentUser(null);
        nav("/login");
      } else {
        nav("/");
      }
    } catch (e: any) {
      alert("Silme başarısız: " + e.message);
    }
  };

  return (
    <Layout title={user?.display_name || "Profil"}>
      {err && <div className="empty">{err}</div>}
      {user && (
        <>
          {user.banner_url ? (
            <div className="cover" style={{ backgroundImage: `url(${user.banner_url})`, backgroundSize: "cover", backgroundPosition: "center" }} />
          ) : (
            <div className="cover" />
          )}
          <div className="profile-head">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              {user.avatar_url ? (
                <img src={user.avatar_url} alt="" className="avatar lg" style={{ objectFit: "cover", marginTop: -74 }} />
              ) : (
                <div className="avatar lg">{user.display_name[0]?.toUpperCase()}</div>
              )}
              <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                {isMe ? (
                  <>
                    <button className="btn-outline" onClick={() => setEditing(true)}>Profili düzenle</button>
                    <button className="btn-outline" onClick={doDelete} style={{ color: "var(--danger)", borderColor: "var(--danger)" }}>
                      Sil
                    </button>
                  </>
                ) : me && (
                  amFollowing ? (
                    <button
                      className="btn-outline"
                      disabled={followBusy}
                      onClick={doUnfollow}
                      style={{ borderColor: "var(--danger)", color: "var(--danger)" }}
                    >
                      Takipten çık
                    </button>
                  ) : (
                    <button className="btn-primary" disabled={followBusy} onClick={doFollow}>
                      Takip et
                    </button>
                  )
                )}
              </div>
            </div>
            <div className="profile-name" style={{ display: "flex", alignItems: "center", gap: 6 }}>
              {user.display_name}
              {user.verified && <span className="verified-badge" title="Doğrulanmış hesap">✓</span>}
            </div>
            <div className="profile-handle">@{user.username}</div>
            {user.bio && <div className="profile-bio">{user.bio}</div>}
            <div className="profile-meta">
              {user.location && (
                <span className="profile-meta-item">
                  <IcMapPin /> {user.location}
                </span>
              )}
              {user.website && (
                <a
                  className="profile-meta-item"
                  href={user.website.startsWith("http") ? user.website : `https://${user.website}`}
                  target="_blank" rel="noopener noreferrer"
                  style={{ color: "var(--accent)" }}
                >
                  <IcLink /> {user.website}
                </a>
              )}
              {user.created_at && (
                <span className="profile-meta-item">
                  <IcCalendar /> {new Date(user.created_at).toLocaleDateString("tr-TR", { month: "long", year: "numeric" })} tarihinden beri
                </span>
              )}
            </div>
            <div className="profile-stats">
              <span onClick={() => setFollowList("following")} style={{ cursor: "pointer", color: "var(--muted)" }}>
                <strong style={{ color: "var(--text)" }}>{user.following_count ?? 0}</strong> Takip edilen
              </span>
              <span onClick={() => setFollowList("followers")} style={{ cursor: "pointer", color: "var(--muted)" }}>
                <strong style={{ color: "var(--text)" }}>{user.followers_count ?? 0}</strong> Takipçi
              </span>
            </div>
          </div>
          {tweets.length === 0 ? (
            <div className="empty">Henüz gönderi yok.</div>
          ) : tweets.map((t) => <TweetCard key={t.tweet_id} tweet={t} />)}
        </>
      )}
      {followList && user && (
        <FollowListModal
          username={user.username}
          mode={followList}
          onClose={() => setFollowList(null)}
        />
      )}
      {editing && user && (
        <EditProfileModal
          user={user}
          onClose={() => setEditing(false)}
          onSaved={(u) => {
            setUser(u);
            if (isMe) setCurrentUser(u);
          }}
        />
      )}
    </Layout>
  );
}
