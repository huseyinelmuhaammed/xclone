import { Link, useLocation, useNavigate } from "react-router-dom";

const NAV_ITEMS = [
  { icon: "🏠", label: "Home", path: "/" },
  { icon: "🔍", label: "Explore", path: "/explore" },
  { icon: "🔔", label: "Notifications", path: "/notifications" },
  { icon: "🔖", label: "Bookmarks", path: "/bookmarks" },
  { icon: "👤", label: "Profile", path: "/profile" },
];

export default function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const stored = localStorage.getItem("xclone_user");
  const user = stored ? JSON.parse(stored) : null;

  function handleProfile() {
    if (user) navigate(`/u/${user.username}`);
    else navigate("/login");
  }

  return (
    <nav className="sidebar">
      <Link to="/" className="sidebar-logo">𝕏</Link>
      {NAV_ITEMS.map((item) => {
        const isActive = item.path === "/" ? location.pathname === "/" : location.pathname.startsWith(item.path);
        const handleClick = item.label === "Profile" ? handleProfile : undefined;
        if (item.label === "Profile") {
          return (
            <div
              key={item.label}
              className={`sidebar-item${isActive ? " active" : ""}`}
              onClick={handleClick}
            >
              <span className="sidebar-icon">{item.icon}</span>
              <span className="sidebar-label">{item.label}</span>
            </div>
          );
        }
        return (
          <Link
            key={item.label}
            to={item.path}
            className={`sidebar-item${isActive ? " active" : ""}`}
          >
            <span className="sidebar-icon">{item.icon}</span>
            <span className="sidebar-label">{item.label}</span>
          </Link>
        );
      })}
      <button className="post-btn sidebar-label" onClick={() => {
        if (!user) navigate("/login");
      }}>
        Post
      </button>
    </nav>
  );
}
