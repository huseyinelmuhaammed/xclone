import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { getUser } from "../api";

export default function Login() {
  const [username, setUsername] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!username.trim()) return;
    try {
      const user = await getUser(username.trim());
      localStorage.setItem("xclone_user", JSON.stringify(user));
      navigate("/");
    } catch {
      setError("User not found. Please register first.");
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">𝕏</div>
        <div className="auth-title">Sign in to 𝕏</div>
        <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <input
            className="auth-input"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoFocus
          />
          {error && <div className="auth-error">{error}</div>}
          <button className="auth-btn" type="submit">Sign in</button>
        </form>
        <div style={{ textAlign: "center", color: "#71767b", fontSize: 14 }}>
          Don't have an account?{" "}
          <Link to="/register" style={{ color: "#1d9bf0" }}>Sign up</Link>
        </div>
      </div>
    </div>
  );
}
