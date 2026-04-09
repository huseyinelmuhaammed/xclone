import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "../components/Layout";

const TRENDS = ["scylladb", "fastapi", "react", "docker", "opensource", "typescript", "python"];

export default function Explore() {
  const [q, setQ] = useState("");
  const nav = useNavigate();
  return (
    <Layout title="Keşfet">
      <div style={{ padding: 16 }}>
        <div className="search-box">
          <input
            placeholder="Hashtag ara (# olmadan)"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && q.trim()) nav(`/hashtag/${q.trim().replace(/^#/, "")}`); }}
          />
        </div>
      </div>
      <div className="panel" style={{ margin: 16 }}>
        <div className="panel-title">Gündemdeki konular</div>
        {TRENDS.map((t) => (
          <div key={t} className="panel-item" onClick={() => nav(`/hashtag/${t}`)}>
            <div className="small">Gündemde</div>
            <div style={{ fontWeight: 700 }}>#{t}</div>
          </div>
        ))}
      </div>
    </Layout>
  );
}
