// Display formatting utilities. Default locale: id-ID / IDR.

export function formatCurrency(v: number, withCents = false): string {
  if (!Number.isFinite(v)) return "-";
  const opts: Intl.NumberFormatOptions = {
    style: "currency",
    currency: "IDR",
    currencyDisplay: "narrowSymbol",
    maximumFractionDigits: withCents ? 2 : 0,
    minimumFractionDigits: withCents ? 2 : 0,
  };
  return new Intl.NumberFormat("id-ID", opts).format(v);
}

export function formatNumber(v: number, maxFraction = 0): string {
  if (!Number.isFinite(v)) return "-";
  return new Intl.NumberFormat("id-ID", {
    maximumFractionDigits: maxFraction,
  }).format(v);
}

export function formatDate(iso: string): string {
  if (!iso) return "-";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "-";
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(d);
}

export function formatDateTime(iso: string): string {
  if (!iso) return "-";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "-";
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

export function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return "-";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

/** Short relative time in Indonesian: "2 jam lalu", "kemarin", "3 hari lalu". */
export function timeAgo(iso: string): string {
  if (!iso) return "-";
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "-";
  const diff = Date.now() - then;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "baru saja";
  if (mins < 60) return `${mins} menit lalu`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} jam lalu`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "kemarin";
  if (days < 30) return `${days} hari lalu`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months} bulan lalu`;
  return `${Math.floor(months / 12)} tahun lalu`;
}

/** Parse "1.500.000" or "1500000" into a number. Empty => 0. */
export function parseIdNumber(s: string): number {
  const cleaned = s.replace(/[^\d,.-]/g, "").replace(/\./g, "").replace(",", ".");
  if (!cleaned) return 0;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : 0;
}