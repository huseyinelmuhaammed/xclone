import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import Layout from "../components/Layout";
import TweetCard from "../components/TweetCard";
import { api, Tweet } from "../api";
import { getCurrentUser } from "../auth";

export default function Bookmarks() {
  const user = getCurrentUser();
  const [tweets, setTweets] = useState<Tweet[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    api.listBookmarks(user.user_id)
      .then(setTweets)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (!user) return <Navigate to="/login" />;

  return (
    <Layout title="Yer İşaretleri">
      {loading && <div className="empty">Yükleniyor…</div>}
      {!loading && tweets.length === 0 && (
        <div className="empty">
          Henüz yer işareti eklemedin. Gönderilerdeki 📤 butonuna tıklayarak kaydet.
        </div>
      )}
      {tweets.map((t) => <TweetCard key={t.tweet_id} tweet={t} />)}
    </Layout>
  );
}
