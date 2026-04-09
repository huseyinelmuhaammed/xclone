import { Link } from "react-router-dom";
import { Tweet, api } from "../api";
import { useState } from "react";
import { getCurrentUser } from "../auth";
import { useEmoji } from "../useEmoji";

/* ── SVG icons ───────────────────────────────────── */
const IcReply = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
  </svg>
);
const IcRepost = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="17 1 21 5 17 9"/>
    <path d="M3 11V9a4 4 0 0 1 4-4h14"/>
    <polyline points="7 23 3 19 7 15"/>
    <path d="M21 13v2a4 4 0 0 1-4 4H3"/>
  </svg>
);
const IcHeart = ({ filled }: { filled?: boolean }) => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
  </svg>
);
const IcBookmark = ({ filled }: { filled?: boolean }) => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
  </svg>
);
const IcTrash = () => (
  <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6"/>
    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
    <path d="M10 11v6M14 11v6"/>
    <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
  </svg>
);

function renderContent(text: string) {
  const parts = text.split(/([@#]\w+)/u);
  return parts.map((p, i) => {
    if (p.startsWith("#") && p.length > 1)
      return <Link key={i} to={`/hashtag/${p.slice(1)}`} style={{ color: "var(--accent)" }}>{p}</Link>;
    if (p.startsWith("@") && p.length > 1)
      return <Link key={i} to={`/u/${p.slice(1)}`} style={{ color: "var(--accent)" }}>{p}</Link>;
    return <span key={i}>{p}</span>;
  });
}

type Reply = {
  reply_id: string; author_id: string; author_username: string;
  author_display_name: string; content: string; created_at: string;
};

function formatTime(raw: string) {
  const d = new Date(raw);
  const now = Date.now();
  const diff = (now - d.getTime()) / 1000;
  if (diff < 60) return `${Math.floor(diff)}s`;
  if (diff < 3600) return `${Math.floor(diff / 60)}d`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}sa`;
  return d.toLocaleDateString("tr-TR", { day: "numeric", month: "short" });
}

export default function TweetCard({ tweet }: { tweet: Tweet }) {
  const me = getCurrentUser();
  const emojiRef = useEmoji([tweet.tweet_id, tweet.like_count, tweet.reply_count, tweet.repost_count]);
  const [deleted, setDeleted] = useState(false);
  const isOwn = !!(me && me.user_id === tweet.author_id);

  const [likes, setLikes] = useState(tweet.like_count);
  const [liked, setLiked] = useState(false);
  const [repostCount, setRepostCount] = useState(tweet.repost_count ?? 0);
  const [reposted, setReposted] = useState(false);
  const [replyCount, setReplyCount] = useState(tweet.reply_count ?? 0);
  const [showReplies, setShowReplies] = useState(false);
  const [replies, setReplies] = useState<Reply[]>([]);
  const [replyText, setReplyText] = useState("");
  const [replyBusy, setReplyBusy] = useState(false);
  const [bookmarked, setBookmarked] = useState(false);

  const onDelete = async () => {
    if (!me || !confirm("Bu gönderi silinsin mi?")) return;
    try { await api.deleteTweet(tweet.tweet_id, me.user_id); setDeleted(true); }
    catch { alert("Silme başarısız."); }
  };

  const onBookmark = async () => {
    if (!me) return;
    try {
      if (bookmarked) { await api.removeBookmark(me.user_id, tweet.tweet_id); setBookmarked(false); }
      else { await api.addBookmark(me.user_id, tweet.tweet_id); setBookmarked(true); }
    } catch { /* ignore */ }
  };

  const onLike = async () => {
    const res = await api.like(tweet.tweet_id, me?.user_id);
    setLikes(res.like_count); setLiked(true);
  };

  const onRepost = async () => {
    if (!me || reposted) return;
    try {
      const res = await api.repost(tweet.tweet_id, me.user_id);
      setRepostCount(res.repost_count); setReposted(true);
    } catch { alert("Zaten yeniden paylaştın."); }
  };

  const toggleReplies = async () => {
    if (!showReplies) {
      try { const res = await api.getReplies(tweet.tweet_id); setReplies(res); } catch { /* ignore */ }
    }
    setShowReplies(!showReplies);
  };

  const submitReply = async () => {
    if (!me || !replyText.trim()) return;
    setReplyBusy(true);
    try {
      const r = await api.createReply(tweet.tweet_id, me.user_id, replyText.trim());
      setReplies((prev) => [r, ...prev]);
      setReplyText("");
      setReplyCount((c) => c + 1);
    } catch (e: any) { alert("Yorum gönderilemedi: " + e.message); }
    finally { setReplyBusy(false); }
  };

  if (deleted) return null;

  const time = tweet.created_at ? formatTime(tweet.created_at) : "";

  return (
    <article className="tweet" ref={emojiRef as React.RefObject<HTMLDivElement>}>
      {/* Avatar */}
      <Link to={`/u/${tweet.author_username}`} onClick={(e) => e.stopPropagation()} style={{ flexShrink: 0 }}>
        <div className="avatar">
          {(tweet.author_display_name || "?")[0].toUpperCase()}
        </div>
      </Link>

      <div className="tweet-body">
        {/* Header */}
        <div className="tweet-head" style={{ justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 4, flexWrap: "wrap", minWidth: 0 }}>
            <Link to={`/u/${tweet.author_username}`} className="tweet-name" style={{ display: "inline-flex", alignItems: "center", gap: 3 }}>
              {tweet.author_display_name}
              {tweet.author_verified && <span className="verified-badge">✓</span>}
            </Link>
            <span className="tweet-handle">@{tweet.author_username}</span>
            <span className="tweet-time">· {time}</span>
          </div>
          {isOwn && (
            <button onClick={onDelete} title="Sil" style={{
              background: "none", border: "none", color: "var(--muted)", cursor: "pointer",
              padding: "4px", borderRadius: "50%", display: "flex", alignItems: "center", flexShrink: 0,
              transition: "color .2s",
            }}
              onMouseEnter={e => (e.currentTarget.style.color = "var(--danger)")}
              onMouseLeave={e => (e.currentTarget.style.color = "var(--muted)")}
            >
              <IcTrash />
            </button>
          )}
        </div>

        {/* Content */}
        <div className="tweet-content">{renderContent(tweet.content)}</div>

        {/* Media */}
        {tweet.image_url && (
          /\.(mp4|webm|mov)$/i.test(tweet.image_url) ? (
            <video src={tweet.image_url} controls playsInline
              style={{ marginTop: 10, maxWidth: "100%", borderRadius: 16, border: "1px solid var(--border)" }} />
          ) : (
            <img src={tweet.image_url} alt=""
              style={{ marginTop: 10, maxWidth: "100%", borderRadius: 16, border: "1px solid var(--border)", display: "block" }} />
          )
        )}

        {/* Actions */}
        <div className="tweet-actions">
          <button className={`tweet-action reply${showReplies ? " active" : ""}`} onClick={toggleReplies}>
            <span className="tweet-action-icon"><IcReply /></span>
            {replyCount > 0 && <span>{replyCount}</span>}
          </button>
          <button className={`tweet-action repost${reposted ? " reposted" : ""}`} onClick={onRepost}>
            <span className="tweet-action-icon"><IcRepost /></span>
            {repostCount > 0 && <span>{repostCount}</span>}
          </button>
          <button className={`tweet-action like${liked ? " liked" : ""}`} onClick={onLike}>
            <span className="tweet-action-icon"><IcHeart filled={liked} /></span>
            {likes > 0 && <span>{likes}</span>}
          </button>
          <button className={`tweet-action bookmark${bookmarked ? " bookmarked" : ""}`} onClick={onBookmark}>
            <span className="tweet-action-icon"><IcBookmark filled={bookmarked} /></span>
          </button>
        </div>

        {/* Replies */}
        {showReplies && (
          <div style={{ marginTop: 12, borderTop: "1px solid var(--border)", paddingTop: 12 }}>
            {me && (
              <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
                <input
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="Yanıtını yaz..."
                  maxLength={280}
                  onKeyDown={(e) => { if (e.key === "Enter") submitReply(); }}
                  style={{
                    flex: 1, padding: "10px 16px", borderRadius: 9999,
                    border: "1.5px solid var(--border)", background: "var(--bg)",
                    color: "var(--text)", fontSize: 14, fontFamily: "inherit",
                  }}
                />
                <button className="btn-primary" disabled={replyBusy || !replyText.trim()} onClick={submitReply}
                  style={{ borderRadius: 9999, padding: "8px 18px", fontSize: 14 }}>
                  Yanıtla
                </button>
              </div>
            )}
            {replies.length === 0 && <div style={{ color: "var(--muted)", fontSize: 14 }}>Henüz yorum yok.</div>}
            {replies.map((r) => (
              <div key={r.reply_id} style={{ display: "flex", gap: 10, padding: "10px 0", borderBottom: "1px solid var(--border)" }}>
                <div className="avatar" style={{ width: 32, height: 32, fontSize: 13, flexShrink: 0 }}>
                  {(r.author_display_name || "?")[0].toUpperCase()}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14 }}>
                    <Link to={`/u/${r.author_username}`} style={{ fontWeight: 700, color: "inherit" }}>
                      {r.author_display_name}
                    </Link>
                    <span style={{ color: "var(--muted)", marginLeft: 6 }}>@{r.author_username}</span>
                  </div>
                  <div style={{ fontSize: 14, marginTop: 2, lineHeight: 1.5 }}>{renderContent(r.content)}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </article>
  );
}
