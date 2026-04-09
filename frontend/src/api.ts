const BASE = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

export interface UserProfile {
  user_id: string;
  username: string;
  display_name: string;
  bio: string;
  created_at: string | null;
  following_count: number;
  followers_count: number;
}

export interface Tweet {
  tweet_id: string;
  content: string;
  display_name: string;
  username: string;
  author_id?: string;
  like_count?: number;
}

export async function registerUser(username: string, display_name: string, bio: string) {
  const res = await fetch(`${BASE}/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, display_name, bio }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function getUser(username: string): Promise<UserProfile> {
  const res = await fetch(`${BASE}/users/${username}`);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function postTweet(user_id: string, content: string) {
  const res = await fetch(`${BASE}/tweets`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ user_id, content }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function getUserTweets(username: string): Promise<Tweet[]> {
  const res = await fetch(`${BASE}/users/${username}/tweets`);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function getTimeline(user_id: string): Promise<Tweet[]> {
  const res = await fetch(`${BASE}/timeline/${user_id}`);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function followUser(follower_id: string, followee_id: string) {
  const res = await fetch(`${BASE}/follow`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ follower_id, followee_id }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function likeTweet(tweet_id: string) {
  const res = await fetch(`${BASE}/tweets/${tweet_id}/like`, { method: "POST" });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function getLikes(tweet_id: string): Promise<{ tweet_id: string; like_count: number }> {
  const res = await fetch(`${BASE}/tweets/${tweet_id}/likes`);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function getHashtagTweets(tag: string, date?: string): Promise<Tweet[]> {
  const url = date ? `${BASE}/hashtags/${tag}?date=${date}` : `${BASE}/hashtags/${tag}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}
