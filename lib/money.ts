// Decimal-safe money helpers.
// Canonical money value: integer Rupiah (unit). All arithmetic rounds to
// whole Rupiah so floating-point drift never accumulates across tools.

export function toCents(v: number): number {
  if (!Number.isFinite(v)) throw new Error("Kalkulasi gagal: angka tidak valid.");
  return Math.round((v + Number.EPSILON) * 100);
}

export function fromCents(cents: number): number {
  return cents / 100;
}

export function isMoneyValid(v: number): boolean {
  return Number.isFinite(v) && v >= 0;
}

/** Normalize a raw number into a safe integer (Rupiah, no decimals). */
export function money(v: number): number {
  if (!Number.isFinite(v)) throw new Error("Kalkulasi gagal: angka tidak valid.");
  return Math.round(v);
}

/** Spec §13 shared engine: round to whole Rupiah (alias of money). */
export function roundMoney(v: number): number {
  return money(v);
}

export function moneySum(values: number[]): number {
  let total = 0;
  for (const v of values) {
    if (!Number.isFinite(v)) throw new Error("Kalkulasi gagal: angka tidak valid.");
    total += v;
  }
  return Math.round(total);
}

export function moneyMul(v: number, factor: number): number {
  if (!Number.isFinite(v) || !Number.isFinite(factor)) {
    throw new Error("Kalkulasi gagal: angka tidak valid.");
  }
  return Math.round(v * factor);
}

/** v / d with safe division. Returns 0 when d is 0 or invalid. */
export function moneyDiv(v: number, d: number): number {
  if (!Number.isFinite(v) || !Number.isFinite(d) || d <= 0) return 0;
  return v / d;
}

/** Percentage of a money value: pctOf(100000, 12.5) => 12500 */
export function pctOf(v: number, pct: number): number {
  if (!Number.isFinite(v) || !Number.isFinite(pct)) {
    throw new Error("Kalkulasi gagal: angka tidak valid.");
  }
  return Math.round((v * pct) / 100);
}

/** Net after percentage fee deducted from price. */
export function netAfterPercent(price: number, pct: number): number {
  return money(price - (price * pct) / 100);
}

/** price - fixedCost - percentFee% * price */
export function netProfit(price: number, percentFee: number, fixedCost: number): number {
  return money(price - (price * percentFee) / 100 - fixedCost);
}

/** Selling price to reach targetProfit given % fee + fixed cost. */
export function priceForProfit(fixedCost: number, percentFee: number, targetProfit: number): number {
  const denom = 1 - percentFee / 100;
  if (denom <= 0) return Number.POSITIVE_INFINITY;
  return Math.ceil((fixedCost + targetProfit) / denom);
}

/** Selling price from cost + margin%: cost / (1 - margin%) */
export function priceFromMargin(cost: number, marginPct: number): number {
  if (marginPct >= 100) return Number.POSITIVE_INFINITY;
  return Math.ceil((cost * 100) / (100 - marginPct));
}

/** Selling price from cost + markup%: cost * (1 + markup%) */
export function priceFromMarkup(cost: number, markupPct: number): number {
  return Math.round(cost * (1 + markupPct / 100));
}

/** Margin % from cost and selling price. */
export function marginPct(cost: number, price: number): number {
  if (!isMoneyValid(price) || price <= 0) return 0;
  return ((price - cost) / price) * 100;
}

/** Markup % from cost and selling price. */
export function markupPct(cost: number, price: number): number {
  if (cost <= 0) return 0;
  return ((price - cost) / cost) * 100;
}

export function formatPercent(pct: number, digits = 1): string {
  if (!Number.isFinite(pct)) return "-";
  return `${(Math.round(pct * 10) / 10).toLocaleString("id-ID", {
    maximumFractionDigits: digits,
  })}%`;
}