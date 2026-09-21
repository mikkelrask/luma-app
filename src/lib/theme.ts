import { invoke } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";

export type ThemePref = "system" | "light" | "dark";
type OsTheme = "light" | "dark";

const THEME_KEY = "luma.theme";

interface AccentDef {
  name: string;
  dark: string;
  light: string;
}

const ACCENTS: Record<number, AccentDef> = {
  [-1]: { name: "Graphite", dark: "#98989d", light: "#8e8e93" },
  0: { name: "Red", dark: "#ff453a", light: "#ff3b30" },
  1: { name: "Orange", dark: "#ff9f0a", light: "#ff9500" },
  2: { name: "Yellow", dark: "#ffd60a", light: "#ffcc00" },
  3: { name: "Green", dark: "#30d158", light: "#34c759" },
  4: { name: "Blue", dark: "#0a84ff", light: "#007aff" },
  5: { name: "Purple", dark: "#bf5af2", light: "#af52de" },
  6: { name: "Pink", dark: "#ff375f", light: "#ff2d55" },
};

export function getThemePref(): ThemePref {
  const raw = localStorage.getItem(THEME_KEY);
  return raw === "light" || raw === "dark" ? raw : "system";
}

export function setThemePref(pref: ThemePref): void {
  localStorage.setItem(THEME_KEY, pref);
  void applyTheme();
}

export async function detectAccent(): Promise<{ code: number; name: string } | null> {
  try {
    const code = await invoke<number>("os_accent");
    const accent = ACCENTS[code];
    return accent ? { code, name: accent.name } : null;
  } catch {
    return null;
  }
}

async function osTheme(): Promise<OsTheme> {
  try {
    const theme = await getCurrentWindow().theme();
    if (theme) return theme;
  } catch {
    // Not inside a Tauri window (plain browser dev).
  }
  return window.matchMedia?.("(prefers-color-scheme: light)").matches ? "light" : "dark";
}

function luminance(hex: string): number {
  const c = hex.replace("#", "");
  const r = parseInt(c.slice(0, 2), 16) / 255;
  const g = parseInt(c.slice(2, 4), 16) / 255;
  const b = parseInt(c.slice(4, 6), 16) / 255;
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

async function osAccentCode(): Promise<number | null> {
  try {
    return await invoke<number>("os_accent");
  } catch {
    return null;
  }
}

export async function applyTheme(): Promise<void> {
  const pref = getThemePref();
  const dark = pref === "dark" || (pref === "system" && (await osTheme()) === "dark");
  const root = document.documentElement;
  root.classList.toggle("dark", dark);
  root.classList.toggle("light", !dark);

  const code = await osAccentCode();
  const accent = code !== null ? ACCENTS[code] : undefined;
  if (accent) {
    const hex = dark ? accent.dark : accent.light;
    root.style.setProperty("--primary", hex);
    root.style.setProperty("--ring", hex);
    root.style.setProperty(
      "--primary-foreground",
      luminance(hex) > 0.62 ? "#1c1c1e" : "#ffffff",
    );
  }
}

/** Re-apply when the OS theme or accent changes (theme change, focus, wake). */
export function installSystemListeners(): () => void {
  const cleanups: Array<() => void> = [];
  let raf = 0;
  const schedule = () => {
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(() => void applyTheme());
  };
  const themeUnlisten = getCurrentWindow().onThemeChanged(schedule);
  const focusUnlisten = getCurrentWindow().onFocusChanged(({ payload }) => {
    if (payload === true) schedule();
  });
  void themeUnlisten.then((fn) => cleanups.push(fn));
  void focusUnlisten.then((fn) => cleanups.push(fn));
  return () => {
    cleanups.forEach((fn) => fn?.());
    cancelAnimationFrame(raf);
  };
}