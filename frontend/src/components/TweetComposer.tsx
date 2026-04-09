import { useState } from "react";
import { postTweet } from "../api";

interface Props {
  onTweeted?: () => void;
}

export default function TweetComposer({ onTweeted }: Props) {
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);

  const stored = localStorage.getItem("xclone_user");
  const user = stored ? JSON.parse(stored) : null;

  if (!user) return null;

  const remaining = 280 - content.length;

  async function handleSubmit() {
    if (!content.trim() || loading) return;
    setLoading(true);
    try {
      await postTweet(user.user_id, content.trim());
      setContent("");
      onTweeted?.();
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="composer">
      <div className="composer-avatar">
        {user.display_name?.[0]?.toUpperCase() ?? "U"}
      </div>
      <div className="composer-body">
        <textarea
          className="composer-textarea"
          placeholder="What's happening?!"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          maxLength={280}
          rows={3}
        />
        <div className="composer-footer">
          <span className={`char-count${remaining < 0 ? " over" : ""}`}>
            {remaining}
          </span>
          <button
            className="tweet-submit-btn"
            disabled={!content.trim() || remaining < 0 || loading}
            onClick={handleSubmit}
          >
            {loading ? "Posting…" : "Post"}
          </button>
        </div>
      </div>
    </div>
  );
}
