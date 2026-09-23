export type AppTheme = "dark" | "light";

const themeKey = "sbc.theme";

export function readTheme(): AppTheme {
  try {
    return localStorage.getItem(themeKey) === "light" ? "light" : "dark";
  } catch {
    return "dark";
  }
}

export function applyTheme(theme: AppTheme) {
  document.documentElement.classList.toggle("dark", theme === "dark");
  document.documentElement.classList.toggle("light", theme === "light");
  document.documentElement.style.colorScheme = theme;
}

export function saveTheme(theme: AppTheme) {
  applyTheme(theme);
  try {
    localStorage.setItem(themeKey, theme);
  } catch {
    // The active theme still works when storage is unavailable.
  }
}
