import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import Layout from "../components/Layout";
import TweetCard from "../components/TweetCard";
import { api, Tweet } from "../api";

export default function Hashtag() {
  const { tag = "" } = useParams();
  const [tweets, setTweets] = useState<Tweet[]>([]);
  const [date, setDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.hashtag(tag, date).then((r) => setTweets(r.tweets || [])).finally(() => setLoading(false));
  }, [tag, date]);

  return (
    <Layout title={`#${tag}`}>
      <div style={{ padding: 16, display: "flex", gap: 12, alignItems: "center", borderBottom: "1px solid var(--border)" }}>
        <label className="composer-count">Tarih:</label>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          style={{ background: "var(--bg-elev)", color: "var(--text)", border: "1px solid var(--border)", padding: 8, borderRadius: 8 }}
        />
      </div>
      {loading ? <div className="empty">Yükleniyor…</div>
        : tweets.length === 0 ? <div className="empty">{date} tarihinde #{tag} için gönderi bulunamadı.</div>
        : tweets.map((t) => <TweetCard key={t.tweet_id} tweet={t} />)}
    </Layout>
  );
}
