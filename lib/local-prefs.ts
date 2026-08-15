// local storage for small data only: favorites + history of opened tools.
// Stored by canonical tool route (navigation identity) so shared tools
// (invoice, kwitansi) stay distinct per category.

const FAV_KEY = "siapinaja:favorites";
const HIST_KEY = "siapinaja:tool-history";

function read(key: string): string[] {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as string[];
    return Array.isArray(parsed) ? parsed.slice(0, 50) : [];
  } catch {
    return [];
  }
}

function write(key: string, list: string[]) {
  try {
    localStorage.setItem(key, JSON.stringify(list.slice(0, 50)));
  } catch {}
}

export function getFavorites(): string[] {
  return read(FAV_KEY);
}

export function isFavorite(route: string): boolean {
  return getFavorites().includes(route);
}

export function toggleFavorite(route: string): boolean {
  const list = getFavorites();
  const next = list.includes(route) ? list.filter((t) => t !== route) : [route, ...list];
  write(FAV_KEY, next);
  return next.includes(route);
}

export function getToolHistory(): string[] {
  return read(HIST_KEY);
}

export function pushHistory(route: string) {
  const list = getToolHistory().filter((t) => t !== route);
  write(HIST_KEY, [route, ...list]);
}

export function clearHistory() {
  write(HIST_KEY, []);
}