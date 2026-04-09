import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, User } from "../api";

export default function FollowListModal({
  username,
  mode,
  onClose,
}: {
  username: string;
  mode: "followers" | "following";
  onClose: () => void;
}) {
  const [users, setUsers] = useState<User[] | null>(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    (mode === "followers" ? api.followers(username) : api.following(username))
      .then(setUsers)
      .catch((e) => setErr(e.message));
  }, [username, mode]);

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
          width: "min(92vw, 480px)", maxHeight: "80vh", display: "flex", flexDirection: "column",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: 16, borderBottom: "1px solid var(--border)" }}>
          <h2 style={{ margin: 0, fontSize: 18 }}>
            {mode === "followers" ? "Takipçiler" : "Takip edilenler"}
          </h2>
          <button className="btn-outline" onClick={onClose}>✕</button>
        </div>
        <div style={{ overflowY: "auto", flex: 1 }}>
          {err && <div className="empty">{err}</div>}
          {!users && !err && <div className="empty">Yükleniyor…</div>}
          {users && users.length === 0 && (
            <div className="empty">
              {mode === "followers" ? "Henüz takipçi yok." : "Henüz kimse takip edilmiyor."}
            </div>
          )}
          {users && users.map((u) => (
            <Link
              key={u.user_id}
              to={`/u/${u.username}`}
              onClick={onClose}
              style={{
                display: "flex", alignItems: "center", gap: 12, padding: 14,
                borderBottom: "1px solid var(--border)", textDecoration: "none", color: "inherit",
              }}
            >
              {u.avatar_url ? (
                <img src={u.avatar_url} alt="" className="avatar" style={{ objectFit: "cover" }} />
              ) : (
                <div className="avatar">{u.display_name[0]?.toUpperCase()}</div>
              )}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis" }}>
                  {u.display_name}
                </div>
                <div style={{ color: "var(--muted)", fontSize: 14 }}>@{u.username}</div>
                {u.bio && (
                  <div style={{ fontSize: 14, marginTop: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {u.bio}
                  </div>
                )}
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
