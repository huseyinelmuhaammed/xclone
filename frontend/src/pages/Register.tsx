import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { registerUser } from "../api";

export default function Register() {
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!username.trim() || !displayName.trim()) {
      setError("Username and display name are required.");
      return;
    }
    try {
      const user = await registerUser(username.trim(), displayName.trim(), bio.trim());
      localStorage.setItem("xclone_user", JSON.stringify(user));
      navigate("/");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg.includes("409") ? "Username already taken." : "Registration failed.");
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">𝕏</div>
        <div className="auth-title">Create your account</div>
        <form onSubmit={handleRegister} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <input
            className="auth-input"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoFocus
          />
          <input
            className="auth-input"
            placeholder="Display Name"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
          />
          <input
            className="auth-input"
            placeholder="Bio (optional)"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
          />
          {error && <div className="auth-error">{error}</div>}
          <button className="auth-btn" type="submit">Sign up</button>
        </form>
        <div style={{ textAlign: "center", color: "#71767b", fontSize: 14 }}>
          Already have an account?{" "}
          <Link to="/login" style={{ color: "#1d9bf0" }}>Sign in</Link>
        </div>
      </div>
    </div>
  );
}
