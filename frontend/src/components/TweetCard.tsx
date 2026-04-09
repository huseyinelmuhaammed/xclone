import { useState } from "react";
import { Link } from "react-router-dom";
import { likeTweet, getLikes } from "../api";
import type { Tweet } from "../api";

interface Props {
  tweet: Tweet;
}

function renderContent(content: string) {
  const parts = content.split(/(#\w+|@\w+)/g);
  return parts.map((part, i) => {
    if (part.startsWith("#")) {
      return (
        <Link key={i} to={`/hashtag/${part.slice(1)}`}>
          {part}
        </Link>
      );
    }
    if (part.startsWith("@")) {
      return (
        <Link key={i} to={`/u/${part.slice(1)}`}>
          {part}
        </Link>
      );
    }
    return part;
  });
}

export default function TweetCard({ tweet }: Props) {
  const [likes, setLikes] = useState<number>(tweet.like_count ?? 0);
  const [liked, setLiked] = useState(false);

  async function handleLike() {
    await likeTweet(tweet.tweet_id);
    const data = await getLikes(tweet.tweet_id);
    setLikes(data.like_count);
    setLiked(true);
  }

  return (
    <div className="tweet-card">
      <Link to={`/u/${tweet.username}`}>
        <div className="tweet-avatar">
          {tweet.display_name?.[0]?.toUpperCase() ?? "?"}
        </div>
      </Link>
      <div className="tweet-body">
        <div className="tweet-header">
          <Link to={`/u/${tweet.username}`}>
            <span className="tweet-display-name">{tweet.display_name}</span>
          </Link>
          <span className="tweet-username">@{tweet.username}</span>
        </div>
        <div className="tweet-content">{renderContent(tweet.content)}</div>
        <div className="tweet-actions">
          <button
            className={`like-btn${liked ? " liked" : ""}`}
            onClick={handleLike}
          >
            {liked ? "❤️" : "🤍"} {likes > 0 ? likes : ""}
          </button>
        </div>
      </div>
    </div>
  );
}
