import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import Layout from "../components/Layout";
import TweetCard from "../components/TweetCard";
import { getHashtagTweets } from "../api";
import type { Tweet } from "../api";

export default function Hashtag() {
  const { tag } = useParams<{ tag: string }>();
  const today = new Date().toISOString().slice(0, 10);
  const [date, setDate] = useState(today);
  const [tweets, setTweets] = useState<Tweet[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!tag) return;
    (async () => {
      setLoading(true);
      try {
        const data = await getHashtagTweets(tag, date);
        setTweets(data);
      } catch (e) {
        console.error(e);
        setTweets([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [tag, date]);

  return (
    <Layout>
      <div className="feed-header">
        <div className="hashtag-title">#{tag}</div>
        <input
          type="date"
          className="hashtag-date-input"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          max={today}
        />
      </div>
      {loading ? (
        <div className="empty-state">Loading…</div>
      ) : tweets.length === 0 ? (
        <div className="empty-state">No tweets for #{tag} on {date}</div>
      ) : (
        tweets.map((t) => <TweetCard key={t.tweet_id} tweet={t} />)
      )}
    </Layout>
  );
}
