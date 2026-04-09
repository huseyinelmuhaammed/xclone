import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "../components/Layout";
import TweetComposer from "../components/TweetComposer";
import TweetCard from "../components/TweetCard";
import { getTimeline } from "../api";
import type { Tweet } from "../api";

export default function Home() {
  const [tweets, setTweets] = useState<Tweet[]>([]);
  const navigate = useNavigate();

  const stored = localStorage.getItem("xclone_user");
  const user = stored ? JSON.parse(stored) : null;

  const loadTimeline = useCallback(async () => {
    if (!user) return;
    try {
      const data = await getTimeline(user.user_id);
      setTweets(data);
    } catch (e) {
      console.error(e);
    }
  }, [user?.user_id]);

  useEffect(() => {
    if (!user) {
      navigate("/login");
      return;
    }
    loadTimeline();
  }, []);

  return (
    <Layout>
      <div className="feed-header">Home</div>
      <TweetComposer onTweeted={loadTimeline} />
      {tweets.length === 0 ? (
        <div className="empty-state">
          <p>No tweets yet. Follow some people or post something!</p>
        </div>
      ) : (
        tweets.map((t) => <TweetCard key={t.tweet_id} tweet={t} />)
      )}
    </Layout>
  );
}
