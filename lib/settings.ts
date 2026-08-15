// localStorage for small preferences only (never files/projects).

import { DEFAULT_SETTINGS, AppSettings } from "./settings-types";

const KEY = "siapinaja:settings";

export function getSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function setSettings(partial: Partial<AppSettings>): AppSettings {
  const next = { ...getSettings(), ...partial };
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // storage unavailable - ignore, app still works in-memory
  }
  return next;
}

export function getSetting<K extends keyof AppSettings>(key: K): AppSettings[K] {
  return getSettings()[key];
}

export function setSetting<K extends keyof AppSettings>(key: K, value: AppSettings[K]) {
  setSettings({ [key]: value });
}

let lastOpened: string | null = null;
const LAST_KEY = "siapinaja:lastOpened";

export function trackLastOpened(route: string) {
  lastOpened = route;
  try {
    localStorage.setItem(LAST_KEY, JSON.stringify([route, Date.now()]));
  } catch {}
}

export function getLastOpened(): string | null {
  if (lastOpened) return lastOpened;
  try {
    const raw = localStorage.getItem(LAST_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as [string, number];
      lastOpened = parsed[0];
      return parsed[0];
    }
  } catch {}
  return null;
}