// Pure calculator math (money-free): percentages, margins, break-even.

export function calculatePercentage(part: number, whole: number): number {
  if (!Number.isFinite(part) || !Number.isFinite(whole) || whole === 0) return 0;
  return (part / whole) * 100;
}

export function calculateMargin(cost: number, price: number): number {
  if (!Number.isFinite(price) || price <= 0) return 0;
  return ((price - cost) / price) * 100;
}

export function calculateMarkup(cost: number, price: number): number {
  if (!Number.isFinite(cost) || cost <= 0) return 0;
  return ((price - cost) / cost) * 100;
}

export function calculateBreakEven(fixedCost: number, price: number, variableCost: number): number {
  const cm = calculateContributionMargin(price, variableCost);
  if (cm <= 0) return Number.POSITIVE_INFINITY;
  return fixedCost / cm;
}

export function calculateContributionMargin(price: number, variableCost: number): number {
  if (!Number.isFinite(price) || !Number.isFinite(variableCost)) return 0;
  return price - variableCost;
}

export function calculateTotal(values: number[]): number {
  let t = 0;
  for (const v of values) t += Number.isFinite(v) ? v : 0;
  return t;
}

/** Profit at N units: N*(price-vc) - fixed */
export function profitAtUnits(fixedCost: number, price: number, variableCost: number, units: number): number {
  return units * (price - variableCost) - fixedCost;
}