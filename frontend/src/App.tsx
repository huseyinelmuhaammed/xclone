import { Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import Profile from "./pages/Profile";
import Explore from "./pages/Explore";
import Hashtag from "./pages/Hashtag";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Bookmarks from "./pages/Bookmarks";
import Notifications from "./pages/Notifications";
import Settings from "./pages/Settings";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/u/:username" element={<Profile />} />
      <Route path="/explore" element={<Explore />} />
      <Route path="/hashtag/:tag" element={<Hashtag />} />
      <Route path="/notifications" element={<Notifications />} />
      <Route path="/bookmarks" element={<Bookmarks />} />
      <Route path="/settings" element={<Settings />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
    </Routes>
  );
}
