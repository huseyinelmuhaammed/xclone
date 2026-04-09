import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Layout from "../components/Layout";
import TweetCard from "../components/TweetCard";
import { getUser, getUserTweets, followUser } from "../api";
import type { UserProfile, Tweet } from "../api";

export default function Profile() {
  const { username } = useParams<{ username: string }>();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [tweets, setTweets] = useState<Tweet[]>([]);
  const [following, setFollowing] = useState(false);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const stored = localStorage.getItem("xclone_user");
  const currentUser = stored ? JSON.parse(stored) : null;

  useEffect(() => {
    if (!username) return;
    (async () => {
      setLoading(true);
      try {
        const [p, t] = await Promise.all([getUser(username), getUserTweets(username)]);
        setProfile(p);
        setTweets(t);
      } catch {
        navigate("/");
      } finally {
        setLoading(false);
      }
    })();
  }, [username]);

  async function handleFollow() {
    if (!currentUser || !profile) return;
    try {
      await followUser(currentUser.user_id, profile.user_id);
      setFollowing(true);
    } catch (e) {
      console.error(e);
    }
  }

  if (loading) return <Layout><div className="empty-state">Loading…</div></Layout>;
  if (!profile) return null;

  const isOwnProfile = currentUser?.username === profile.username;

  return (
    <Layout>
      <div className="feed-header" style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <button onClick={() => navigate(-1)} style={{ fontSize: 20 }}>←</button>
        <div>
          <div>{profile.display_name}</div>
          <div style={{ fontSize: 13, fontWeight: 400, color: "#71767b" }}>{tweets.length} posts</div>
        </div>
      </div>
      <div className="profile-cover" />
      <div className="profile-info">
        {!isOwnProfile && currentUser && (
          <button
            className={`follow-btn${following ? " following" : ""}`}
            onClick={handleFollow}
            disabled={following}
          >
            {following ? "Following" : "Follow"}
          </button>
        )}
        <div className="profile-avatar-wrap">
          <div className="profile-avatar">
            {profile.display_name[0]?.toUpperCase()}
          </div>
        </div>
        <div className="profile-display-name">{profile.display_name}</div>
        <div className="profile-username">@{profile.username}</div>
        {profile.bio && <div className="profile-bio">{profile.bio}</div>}
        <div className="profile-stats">
          <span><strong>{profile.following_count}</strong> Following</span>
          <span><strong>{profile.followers_count}</strong> Followers</span>
        </div>
      </div>
      {tweets.length === 0 ? (
        <div className="empty-state">No posts yet.</div>
      ) : (
        tweets.map((t) => <TweetCard key={t.tweet_id} tweet={t} />)
      )}
    </Layout>
  );
}
