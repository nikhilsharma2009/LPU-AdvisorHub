import { getData, updateData } from "./storage.js";
export function initTheme() {
  const saved = getData().theme;
  const mode = saved || (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
  document.documentElement.dataset.theme = mode;
  return mode;
}
export function toggleTheme() {
  const mode = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
  document.documentElement.dataset.theme = mode;
  updateData(data => { data.theme = mode; });
  return mode;
}
