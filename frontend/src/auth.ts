import { User } from "./api";

const KEY = "xclone_user";
const THEME_KEY = "xclone_theme";

export function getCurrentUser(): User | null {
  const raw = localStorage.getItem(KEY);
  return raw ? JSON.parse(raw) : null;
}

export function setCurrentUser(u: User | null) {
  if (u) localStorage.setItem(KEY, JSON.stringify(u));
  else localStorage.removeItem(KEY);
}

export function getTheme(): "dark" | "light" {
  return (localStorage.getItem(THEME_KEY) as "dark" | "light") || "dark";
}

export function setTheme(theme: "dark" | "light") {
  localStorage.setItem(THEME_KEY, theme);
  document.documentElement.setAttribute("data-theme", theme);
}

export function initTheme() {
  document.documentElement.setAttribute("data-theme", getTheme());
}
