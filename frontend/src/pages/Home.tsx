import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import Layout from "../components/Layout";
import Composer from "../components/Composer";
import TweetCard from "../components/TweetCard";
import { api, Tweet } from "../api";
import { getCurrentUser } from "../auth";

export default function Home() {
  const user = getCurrentUser();
  const [tweets, setTweets] = useState<Tweet[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"foryou" | "following">("foryou");

  useEffect(() => {
    if (!user) return;
    let alive = true;
    const fetchTimeline = () =>
      api.timeline(user.user_id).then((t) => { if (alive) setTweets(t); }).catch(() => {});
    fetchTimeline().finally(() => { if (alive) setLoading(false); });
    const id = setInterval(fetchTimeline, 5000);
    return () => { alive = false; clearInterval(id); };
  }, []);

  if (!user) return <Navigate to="/login" />;

  return (
    <Layout title="Ana Sayfa">
      {/* Tabs */}
      <div className="feed-tabs">
        <div
          className={`feed-tab${tab === "foryou" ? " active" : ""}`}
          onClick={() => setTab("foryou")}
        >
          Senin için
        </div>
        <div
          className={`feed-tab${tab === "following" ? " active" : ""}`}
          onClick={() => setTab("following")}
        >
          Takip edilenler
        </div>
      </div>

      <Composer onPost={(t) => setTweets((prev) => [t, ...prev])} />

      {loading && <div className="empty">Yükleniyor…</div>}
      {!loading && tweets.length === 0 && (
        <div className="empty">
          Akışın boş. Bir şeyler paylaş veya birilerini takip et.
        </div>
      )}
      {tweets.map((t) => <TweetCard key={t.tweet_id} tweet={t} />)}
    </Layout>
  );
}
