import { useRef, useState } from "react";
import { api, Tweet } from "../api";
import { getCurrentUser } from "../auth";

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

const IconImage = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
    <circle cx="8.5" cy="8.5" r="1.5"/>
    <polyline points="21 15 16 10 5 21"/>
  </svg>
);

export default function Composer({ onPost }: { onPost: (t: Tweet) => void }) {
  const user = getCurrentUser();
  const [text, setText] = useState("");
  const [image, setImage] = useState("");
  const [mediaType, setMediaType] = useState<"image" | "video">("image");
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  if (!user) return null;

  const pickFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const maxSize = f.type.startsWith("video/") ? 10 * 1024 * 1024 : 2 * 1024 * 1024;
    if (f.size > maxSize) {
      alert(f.type.startsWith("video/") ? "Video çok büyük (maks. 10MB)" : "Resim çok büyük (maks. 2MB)");
      return;
    }
    setMediaType(f.type.startsWith("video/") ? "video" : "image");
    setImage(await readFileAsDataUrl(f));
  };

  const submit = async () => {
    if (!text.trim() && !image) return;
    setBusy(true);
    try {
      const t = await api.createTweet(user.user_id, text.trim() || " ", image);
      onPost(t);
      setText("");
      setImage("");
      setMediaType("image");
      if (fileRef.current) fileRef.current.value = "";
    } catch (e: any) {
      alert(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="composer">
      {user.avatar_url ? (
        <img className="avatar" src={user.avatar_url} alt="" />
      ) : (
        <div className="avatar">{user.display_name[0]?.toUpperCase()}</div>
      )}
      <div style={{ flex: 1 }}>
        <textarea
          placeholder="Neler oluyor?!"
          value={text}
          maxLength={280}
          onChange={(e) => setText(e.target.value)}
        />
        {image && (
          <div style={{ position: "relative", marginTop: 8 }}>
            {mediaType === "video" ? (
              <video src={image} controls playsInline style={{ maxWidth: "100%", borderRadius: 16, border: "1px solid var(--border)" }} />
            ) : (
              <img src={image} alt="" style={{ maxWidth: "100%", borderRadius: 16, border: "1px solid var(--border)" }} />
            )}
            <button
              onClick={() => { setImage(""); setMediaType("image"); }}
              style={{ position: "absolute", top: 8, right: 8, background: "rgba(0,0,0,.7)", border: "none", color: "#fff", borderRadius: 9999, width: 32, height: 32 }}
            >✕</button>
          </div>
        )}
        <div className="composer-actions">
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <label style={{ color: "var(--accent)", cursor: "pointer", display: "flex", alignItems: "center" }}>
              <IconImage />
              <input ref={fileRef} type="file" accept="image/*,video/*" onChange={pickFile} style={{ display: "none" }} />
            </label>
            <span className="composer-count">{text.length}/280</span>
          </div>
          <button className="btn-primary" disabled={busy || (!text.trim() && !image)} onClick={submit}>
            Gönder
          </button>
        </div>
      </div>
    </div>
  );
}
