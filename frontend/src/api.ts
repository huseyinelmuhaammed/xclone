const API_URL = (import.meta as any).env?.VITE_API_URL || "http://localhost:3000";

async function req(path: string, opts: RequestInit = {}) {
  const res = await fetch(`${API_URL}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...opts,
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`${res.status}: ${txt}`);
  }
  return res.json();
}

export const api = {
  health: () => req("/health"),
  register: (data: { username: string; display_name: string; password: string; bio?: string; avatar_url?: string }) =>
    req("/register", { method: "POST", body: JSON.stringify(data) }),
  login: (username: string, password: string) =>
    req("/login", { method: "POST", body: JSON.stringify({ username, password }) }),
  getUser: (username: string) => req(`/users/${username}`),
  updateUser: (username: string, data: { display_name?: string; bio?: string; avatar_url?: string; banner_url?: string; website?: string; location?: string }) =>
    req(`/users/${username}`, { method: "PATCH", body: JSON.stringify(data) }),
  deleteUser: async (username: string) => {
    const res = await fetch(`${API_URL}/users/${username}`, { method: "DELETE" });
    if (!res.ok) throw new Error(`${res.status}`);
  },
  userTweets: (username: string) => req(`/users/${username}/tweets`),
  timeline: (user_id: string) => req(`/timeline/${user_id}`),
  createTweet: (user_id: string, content: string, image_url?: string) =>
    req("/tweets", { method: "POST", body: JSON.stringify({ user_id, content, image_url: image_url || "" }) }),
  follow: (follower_id: string, followee_id: string) =>
    req("/follow", { method: "POST", body: JSON.stringify({ follower_id, followee_id }) }),
  unfollow: (follower_id: string, followee_id: string) =>
    req("/follow", { method: "DELETE", body: JSON.stringify({ follower_id, followee_id }) }),
  isFollowing: (username: string, target: string): Promise<{ following: boolean }> =>
    req(`/users/${username}/is-following/${target}`),
  like: (tweet_id: string, liker_id?: string) =>
    req(`/tweets/${tweet_id}/like${liker_id ? `?liker_id=${liker_id}` : ""}`, { method: "POST" }),
  notifications: (user_id: string) => req(`/notifications/${user_id}`),
  unreadCount: (user_id: string): Promise<{ count: number }> => req(`/notifications/${user_id}/unread-count`),
  readAllNotifications: (user_id: string) => req(`/notifications/${user_id}/read-all`, { method: "POST" }),
  getReplies: (tweet_id: string) => req(`/tweets/${tweet_id}/replies`),
  createReply: (tweet_id: string, user_id: string, content: string) =>
    req(`/tweets/${tweet_id}/replies`, { method: "POST", body: JSON.stringify({ user_id, content }) }),
  repost: (tweet_id: string, user_id: string) =>
    req(`/tweets/${tweet_id}/repost`, { method: "POST", body: JSON.stringify({ user_id }) }),
  addBookmark: (user_id: string, tweet_id: string) =>
    req("/bookmarks", { method: "POST", body: JSON.stringify({ user_id, tweet_id }) }),
  removeBookmark: (user_id: string, tweet_id: string) =>
    req("/bookmarks", { method: "DELETE", body: JSON.stringify({ user_id, tweet_id }) }),
  listBookmarks: (user_id: string): Promise<Tweet[]> => req(`/bookmarks/${user_id}`),
  isBookmarked: (user_id: string, tweet_id: string): Promise<{ bookmarked: boolean }> =>
    req(`/bookmarks/${user_id}/${tweet_id}`),
  followers: (username: string): Promise<User[]> => req(`/users/${username}/followers`),
  following: (username: string): Promise<User[]> => req(`/users/${username}/following`),
  hashtag: (tag: string, date?: string) =>
    req(`/hashtags/${encodeURIComponent(tag)}${date ? `?date=${date}` : ""}`),
  suggestions: (username: string): Promise<User[]> => req(`/users/${username}/suggestions`),
  verifyUser: (username: string): Promise<{ verified: boolean }> =>
    req(`/users/${username}/verify`, { method: "POST" }),
  changePassword: (username: string, current_password: string, new_password: string) =>
    req("/auth/change-password", { method: "POST", body: JSON.stringify({ username, current_password, new_password }) }),
  deleteTweet: async (tweet_id: string, user_id: string) => {
    const res = await fetch(`${API_URL}/tweets/${tweet_id}?user_id=${user_id}`, { method: "DELETE" });
    if (!res.ok) throw new Error(`${res.status}`);
  },
};

export type Tweet = {
  tweet_id: string;
  author_id: string;
  author_username: string;
  author_display_name: string;
  author_verified?: boolean;
  content: string;
  image_url?: string;
  created_at: string;
  like_count: number;
  reply_count: number;
  repost_count: number;
};

export type User = {
  user_id: string;
  username: string;
  display_name: string;
  bio: string;
  avatar_url: string;
  banner_url: string;
  verified?: boolean;
  website?: string;
  location?: string;
  created_at?: string;
  followers_count?: number;
  following_count?: number;
};
