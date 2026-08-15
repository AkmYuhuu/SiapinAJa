// Shared document model (spec §12: one document engine for invoice, quotation,
// kwitansi, surat jalan, packing list).

import { money, moneySum, pctOf } from "../money";
import { todayISO } from "../format";

export type DocKind =
  | "invoice"
  | "kwitansi"
  | "quotation"
  | "surat-jalan"
  | "packing-list"
  | "price-list";

export type DocStatus = "draft" | "sent" | "paid" | "overdue";

export interface DocLine {
  id: string;
  name: string;
  description?: string;
  qty: number;
  price: number;
  unit?: string;
}

export interface BusinessInfo {
  name: string;
  address?: string;
  phone?: string;
  email?: string;
  logo?: string;
  paymentInfo?: string;
  taxId?: string;
}

export interface CustomerInfo {
  name: string;
  company?: string;
  address?: string;
  phone?: string;
  email?: string;
}

export interface SignatureBlock {
  label: string;
  name: string;
}

export interface DocModel {
  id?: string;
  $kind: DocKind;
  number: string;
  date: string;
  dueDate?: string;
  status?: DocStatus;
  business: BusinessInfo;
  customer: CustomerInfo;
  lines: DocLine[];
  discount: number;
  taxPct: number;
  taxLabel: string;
  shipping: number;
  note?: string;
  footer?: string;
  paymentMethod?: string;
  validity?: string;
  terms?: string;
  receivedFrom?: string;
  forPayment?: string;
  signatures?: SignatureBlock[];
  shipper?: string;
  vehicle?: string;
  orderNumber?: string;
  packed?: Record<string, boolean>;
  priceListTitle?: string;
  /** Down payment already received (freelance invoice). */
  dp?: number;
  /** Payment milestones shown as terms (freelance invoice). */
  milestones?: Array<{ id: string; label: string; amount: number }>;
}

export interface DocTotals {
  subtotal: number;
  discount: number;
  afterDiscount: number;
  tax: number;
  shipping: number;
  total: number;
}

export function docTotals(m: Pick<DocModel, "lines" | "discount" | "taxPct" | "shipping">): DocTotals {
  const subtotal = moneySum((m.lines || []).map((l) => money(l.qty * l.price)));
  const discount = money(m.discount || 0);
  const afterDiscount = money(subtotal - discount);
  const tax = pctOf(afterDiscount, m.taxPct || 0);
  const shipping = money(m.shipping || 0);
  const total = moneySum([afterDiscount, tax, shipping]);
  return { subtotal, discount, afterDiscount, tax, shipping, total };
}

export function blankDocLine(): DocLine {
  return { id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`, name: "", qty: 1, price: 0 };
}

export function defaultNumber(kind: Exclude<DocKind, "price-list">, date = todayISO(), prefix?: string): string {
  const p = prefix || (kind === "invoice" ? "INV" : kind === "kwitansi" ? "KWT" : kind === "quotation" ? "QT" : kind === "surat-jalan" ? "SJ" : "PL");
  const year = date.slice(0, 4);
  if (typeof window !== "undefined" && "localStorage" in window) {
    try {
      const key = `siapinaja:seq:${p}-${year}`;
      const current = Number(localStorage.getItem(key) || "0") + 1;
      localStorage.setItem(key, String(current));
      return `${p}-${year}-${String(current).padStart(4, "0")}`;
    } catch {}
  }
  return `${p}-${year}-0001`;
}

/** Allowed unit abbreviations for recipes etc. */
export const UNITS = ["pcs", "kg", "gram", "liter", "ml", "pack", "box", "bottle", "unit", "jam", "hari", "minggu", "bulan", "proyek"];