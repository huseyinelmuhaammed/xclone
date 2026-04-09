import { useNavigate } from "react-router-dom";

const TRENDS = [
  { category: "Technology · Trending", name: "#ScyllaDB", tweets: "12.4K posts" },
  { category: "Technology · Trending", name: "#FastAPI", tweets: "8.1K posts" },
  { category: "Trending in TR", name: "#NoSQL", tweets: "5.2K posts" },
  { category: "Technology · Trending", name: "#Python", tweets: "31.2K posts" },
  { category: "Technology · Trending", name: "#React", tweets: "22.7K posts" },
];

export default function TrendingPanel() {
  const navigate = useNavigate();
  return (
    <aside className="trends-panel">
      <div className="search-box">🔍 Search</div>
      <div className="trends-card">
        <span className="trends-title">What's happening</span>
        {TRENDS.map((t) => (
          <div
            key={t.name}
            className="trend-item"
            onClick={() => navigate(`/hashtag/${t.name.slice(1).toLowerCase()}`)}
          >
            <div className="trend-category">{t.category}</div>
            <div className="trend-name">{t.name}</div>
            <div className="trend-tweets">{t.tweets}</div>
          </div>
        ))}
      </div>
    </aside>
  );
}
