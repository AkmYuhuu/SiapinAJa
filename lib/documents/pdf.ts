// Shared PDF renderer for all document tools (spec §12).
// One engine: invoice, quotation, kwitansi, surat jalan, packing list, price list.
// jsPDF is dynamically imported (spec §21.3) so it stays out of the initial bundle.

import type { jsPDF } from "jspdf";
import { DocModel, docTotals } from "./model";
import { formatCurrency } from "../format";
import { terbilangRupiah } from "../terbilang";
import { money } from "../money";

const INK: [number, number, number] = [43, 40, 35];
const MUTED: [number, number, number] = [111, 106, 94];
const ACCENT: [number, number, number] = [232, 98, 12];
const LINE: [number, number, number] = [227, 224, 216];
const LIGHT: [number, number, number] = [247, 245, 240];

export async function renderDocPdf(m: DocModel): Promise<jsPDF> {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const W = 210;
  const M = 14;
  let y = 20;
  const totals = docTotals(m);
  const pageW = W - M * 2;

  doc.setFillColor(248, 246, 241);
  doc.rect(0, 0, W, 30, "F");
  doc.setFillColor(ACCENT[0], ACCENT[1], ACCENT[2]);
  doc.rect(0, 30, W, 0.8, "F");

  // Header: business + logo
  if (m.business.logo) {
    try {
      const logoBytes = dataURLToBytes(m.business.logo);
      if (logoBytes) {
        doc.addImage(m.business.logo, logoBytes.ext, M, 10, 14, 14);
      }
    } catch {}
  }
  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.setTextColor(...INK);
  doc.text(m.business.name || "Bisnis Saya", M, 14);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...MUTED);
  if (m.business.address) doc.text(m.business.address, M, 19);
  const contact = [m.business.phone, m.business.email].filter(Boolean).join(" • ");
  if (contact) doc.text(contact, M, 23);

  // Doc title right-aligned
  const title = docKindTitle(m.$kind);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(...INK);
  doc.text(title, W - M, 14, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...MUTED);
  doc.text(m.number, W - M, 19, { align: "right" });

  // date / due / status row
  const statusLine = [
    `Tanggal: ${m.date || "-"}`,
    m.dueDate ? `${m.$kind === "quotation" ? "Berlaku s/d" : "Jatuh tempo"}: ${m.dueDate}` : null,
    m.validity ? `Berlaku: ${m.validity}` : null,
  ]
    .filter((x): x is string => Boolean(x))
    .join("    ");
  doc.setFontSize(8.5);
  doc.setTextColor(...INK);
  doc.text(statusLine, W - M, 24, { align: "right" });
  if (m.status) {
    const statusColor: [number, number, number] =
      m.status === "paid" ? [47, 125, 79] : m.status === "overdue" ? [191, 62, 48] : [150, 140, 130];
    doc.setFontSize(7.5);
    doc.setTextColor(...statusColor);
    doc.text(statusLabel(m.status).toUpperCase(), W - M, 27.5, { align: "right" });
  }

  y = 38;

  if (m.$kind === "kwitansi") {
    y = renderKwitansi(doc, m, totals, y);
  } else if (m.$kind === "surat-jalan") {
    y = renderSuratJalan(doc, m, totals, y);
  } else if (m.$kind === "packing-list") {
    y = renderPackingList(doc, m, totals, y);
  } else if (m.$kind === "price-list") {
    y = renderPriceList(doc, m, totals, y);
  } else {
    renderInvoiceLike(doc, m, totals, y);
  }

  // footer
  if (m.footer) {
    doc.setFontSize(7.5);
    doc.setTextColor(...MUTED);
    doc.text(m.footer, M, 286, { align: "left", maxWidth: pageW });
  }
  doc.setFontSize(7);
  doc.setTextColor(174, 168, 158);
  doc.text("Dibuat dengan SiapinAja", W - M, 291, { align: "right" });

  return doc;
}

function dataURLToBytes(dataUrl: string): { ext: string } | null {
  const m = /^data:image\/(png|jpeg|webp);base64,/.exec(dataUrl);
  if (!m) return null;
  return { ext: m[1] === "jpeg" ? "JPEG" : m[1].toUpperCase() };
}

export function docKindTitle(kind: DocModel["$kind"]): string {
  switch (kind) {
    case "invoice":
      return "INVOICE";
    case "kwitansi":
      return "KWITANSI";
    case "quotation":
      return "PENAWARAN";
    case "surat-jalan":
      return "SURAT JALAN";
    case "packing-list":
      return "PACKING LIST";
    case "price-list":
      return "DAFTAR HARGA";
    default:
      return "DOKUMEN";
  }
}

function statusLabel(s: DocModel["status"]): string {
  switch (s) {
    case "draft": return "Draft";
    case "sent": return "Dikirim";
    case "paid": return "Lunas";
    case "overdue": return "Jatuh tempo";
    default: return "";
  }
}

function sectionLabel(doc: jsPDF, text: string, y: number): number {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(...ACCENT);
  doc.text(text.toUpperCase(), 14, y);
  doc.setDrawColor(...LINE);
  doc.line(14, y + 1.5, 196, y + 1.5);
  return y + 6;
}

function drawCustomer(doc: jsPDF, label: string, c: DocModel["customer"], y: number): number {
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(...MUTED);
  doc.text(label, 14, y);
  doc.setFontSize(10);
  doc.setTextColor(...INK);
  const name = c.company ? `${c.company} (${c.name})` : c.name || "-";
  doc.text(name, 14, y + 5);
  doc.setFontSize(8.5);
  doc.setTextColor(...MUTED);
  let yy = y + 9;
  if (c.address) {
    const lines = wrapText(doc, c.address, 80);
    for (const l of lines) {
      doc.text(l, 14, yy);
      yy += 4;
    }
  }
  const contact = [c.phone, c.email].filter(Boolean).join(" • ");
  if (contact) doc.text(contact, 14, yy + 4);
  return yy + 10;
}

function drawItemsTable(
  doc: jsPDF,
  m: DocModel,
  opts: { includePrice: boolean; includeAmount: boolean; packed?: boolean },
  y: number,
): number {
  const W = 196;
  const M = 14;
  const { includePrice, includeAmount, packed } = opts;
  const colQty = 18;
  const colPrice = includePrice && includeAmount ? 42 : includePrice ? 60 : 0;
  const colAmount = includeAmount ? 46 : 0;
  const colNameW = W - colQty - colPrice - colAmount - (packed ? 12 : 0);
  const headerH = 7;

  doc.setFillColor(...LIGHT);
  doc.rect(M, y, W, headerH, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(...MUTED);
  let x = M + 1.5;
  if (packed) {
    doc.text("OK", x, y + headerH - 2.3);
    x += 12;
  }
  doc.text("DESKRIPSI", x, y + headerH - 2.3);
  x += colNameW;
  doc.text("QTY", x, y + headerH - 2.3);
  if (includePrice) doc.text("HARGA", x + colQty, y + headerH - 2.3, { align: "right" });
  if (includeAmount) doc.text("JUMLAH", x + colQty + colPrice, y + headerH - 2.3, { align: "right" });
  y += headerH;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.setTextColor(...INK);
  const rowH = 7;

  for (const line of m.lines || []) {
    const isPacked = packed ? Boolean(m.packed?.[line.id]) : false;
    const descLines = wrapText(doc, line.name + (line.description ? `\n${line.description}` : ""), colNameW - 4);
    const h = Math.max(rowH, descLines.length * 4.4 + 3);
    if (y + h > 278) {
      doc.addPage();
      drawTableHeaderRepeat(doc, m, opts, 20);
      y = 28;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9.5);
      doc.setTextColor(...INK);
    }
    x = M + 1.5;
    if (packed) {
      doc.setDrawColor(...LINE);
      doc.rect(x + 2, y + 1.5, 3.5, 3.5);
      if (isPacked) {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(6.5);
        doc.setTextColor(...INK);
        doc.text("✓", x + 2.3, y + 4.1);
        doc.setFontSize(9.5);
      }
      x += 12;
    }
    doc.text(descLines[0], x, y + 4.6);
    for (let i = 1; i < descLines.length; i++) doc.text(descLines[i], x, y + 4.6 + i * 4.4);
    doc.text(formatQty(line.qty), x + colNameW, y + 4.6, { align: "right" });
    if (includePrice) doc.text(formatCurrency(line.price), x + colNameW + colQty, y + 4.6, { align: "right" });
    if (includeAmount) {
      doc.setFont("helvetica", "bold");
      doc.text(formatCurrency(money(line.qty * line.price)), x + colNameW + colQty + colPrice, y + 4.6, { align: "right" });
      doc.setFont("helvetica", "normal");
    }
    y += h;
    doc.setDrawColor(...LINE);
    doc.line(M, y - 1.2, M + W, y - 1.2);
  }
  return y + 6;
}

function drawTableHeaderRepeat(doc: jsPDF, m: DocModel, opts: { includePrice: boolean; includeAmount: boolean; packed?: boolean }, y: number) {
  const W = 196;
  const M = 14;
  const colQty = 18;
  const colPrice = opts.includePrice && opts.includeAmount ? 42 : opts.includePrice ? 60 : 0;
  const colAmount = opts.includeAmount ? 46 : 0;
  const colNameW = W - colQty - colPrice - colAmount - (opts.packed ? 12 : 0);
  doc.setFillColor(...LIGHT);
  doc.rect(M, y, W, 7, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(...MUTED);
  let x = M + 1.5;
  if (opts.packed) { doc.text("OK", x, y + 4.7); x += 12; }
  doc.text("DESKRIPSI", x, y + 4.7);
  doc.text("QTY", x + colNameW, y + 4.7, { align: "right" });
  if (opts.includePrice) doc.text("HARGA", x + colNameW + colQty, y + 4.7, { align: "right" });
  if (opts.includeAmount) doc.text("JUMLAH", x + colNameW + colQty + colPrice, y + 4.7, { align: "right" });
}

function formatQty(qty: number): string {
  if (!Number.isFinite(qty)) return "0";
  return new Intl.NumberFormat("id-ID", { maximumFractionDigits: 2 }).format(qty);
}

function wrapText(doc: jsPDF, text: string, maxWidth: number): string[] {
  const lines: string[] = [];
  const paragraphs = String(text ?? "").split("\n");
  doc.setFontSize(9.5);
  for (const para of paragraphs) {
    const words = para.split(" ");
    let line = "";
    for (const word of words) {
      const test = line ? `${line} ${word}` : word;
      if (doc.getTextWidth(test) > maxWidth && line) {
        lines.push(line);
        line = word;
      } else {
        line = test;
      }
    }
    if (line) lines.push(line);
  }
  return lines;
}

function renderInvoiceLike(doc: jsPDF, m: DocModel, totals: ReturnType<typeof docTotals>, y: number): number {
  y = sectionLabel(doc, m.$kind === "quotation" ? "Kepada" : "Tagihan untuk", y);
  y = drawCustomer(doc, "", m.customer, y) + 2;
  y = sectionLabel(doc, "Rincian", y);
  y = drawItemsTable(doc, m, { includePrice: true, includeAmount: true }, y);

  // totals right side
  const tx = 160;
  doc.setFontSize(9);
  doc.setTextColor(...MUTED);
  doc.setFont("helvetica", "normal");
  doc.text("Subtotal", tx - 40, y, { align: "left" });
  doc.text(formatCurrency(totals.subtotal), tx, y, { align: "right" });
  if (totals.discount > 0) {
    y += 5;
    doc.text("Diskon", tx - 40, y);
    doc.text(`-${formatCurrency(totals.discount)}`, tx, y, { align: "right" });
  }
  if (totals.tax > 0) {
    y += 5;
    doc.text(`${m.taxLabel || "Pajak"} (${m.taxPct}%)`, tx - 40, y);
    doc.text(formatCurrency(totals.tax), tx, y, { align: "right" });
  }
  if (totals.shipping > 0) {
    y += 5;
    doc.text("Ongkir", tx - 40, y);
    doc.text(formatCurrency(totals.shipping), tx, y, { align: "right" });
  }
  y += 7;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...INK);
  doc.text(m.$kind === "quotation" ? "Total" : "Total", tx - 40, y);
  doc.text(formatCurrency(totals.total), tx, y, { align: "right" });

  if (m.$kind === "quotation") {
    doc.setDrawColor(...ACCENT);
    doc.setLineWidth(0.4);
    doc.line(tx - 40, y + 2, tx, y + 2);
  }

  y += 12;
  if (m.paymentMethod) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(...MUTED);
    doc.text(`Metode pembayaran: ${m.paymentMethod}`, 14, y);
    y += 5;
  }
  if (m.note) {
    y = sectionLabel(doc, "Catatan", y);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(...MUTED);
    const lines = wrapText(doc, m.note, 170);
    for (const l of lines) {
      doc.text(l, 14, y);
      y += 4.5;
    }
    y += 4;
  }

  // signatures
  if (m.signatures && m.signatures.length) {
    for (const sig of m.signatures) {
      doc.setFontSize(8.5);
      doc.setTextColor(...MUTED);
      doc.text(sig.label, 14, 262);
      doc.text("( ................................................. )", 14, 282);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...INK);
      doc.text(sig.name || "................................", 14, 275);
      y = 285;
    }
  }
  return y;
}

function renderKwitansi(doc: jsPDF, m: DocModel, totals: ReturnType<typeof docTotals>, y: number): number {
  y = sectionLabel(doc, "Pemberi Pembayaran", y);
  y = drawCustomer(doc, "", m.customer, y) + 2;
  y = sectionLabel(doc, "Keterangan Pembayaran", y);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.setTextColor(...INK);
  const rows: Array<[string, string, boolean]> = [
    ["Telah diterima dari", m.receivedFrom || m.customer.name || "-", false],
    ["Jumlah pembayaran", formatCurrency(totals.total), true],
    ["Untuk pembayaran", m.forPayment || "-", false],
    ["Metode pembayaran", m.paymentMethod || "-", false],
    ["Keterangan jasa", m.lines?.[0]?.name || "-", false],
    ["Tanggal", m.date || "-", false],
  ];
  for (const [k, v, strong] of rows) {
    if (strong) {
      doc.setDrawColor(...ACCENT);
      doc.setLineWidth(0.5);
      doc.line(14, y - 2, 196, y - 2);
      doc.setFillColor(...LIGHT);
      doc.rect(14, y - 1, 182, 8.5, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(...ACCENT);
      doc.text(`${k}: ${v}`, 17, y + 5.3);
      y += 11;
    } else {
      doc.setFontSize(9.5);
      doc.setTextColor(...MUTED);
      doc.text(k, 14, y);
      doc.setTextColor(...INK);
      doc.text(v, 63, y);
      y += 6.5;
    }
  }
  y += 4;
  y = sectionLabel(doc, "Terbilang", y);
  doc.setFont("helvetica", "italic");
  doc.setFontSize(10);
  doc.setTextColor(...INK);
  const words = terbilangRupiah(totals.total);
  const lines = wrapText(doc, words, 170);
  for (const l of lines) {
    doc.text(l.toUpperCase(), 14, y);
    y += 5;
  }
  doc.setDrawColor(...LINE);
  doc.line(14, y + 1, 196, y + 1);

  y += 12;
  if (m.note) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(...MUTED);
    doc.text(`Catatan: ${m.note}`, 14, y);
    y += 6;
  }

  doc.setFontSize(8.5);
  doc.setTextColor(...MUTED);
  doc.text("Penerima", 14, 262);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...INK);
  doc.text(m.business.name || "..............................", 14, 275);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...MUTED);
  doc.text("( ................................................. )", 14, 282);
  return 283;
}

function renderSuratJalan(doc: jsPDF, m: DocModel, totals: ReturnType<typeof docTotals>, y: number): number {
  y = sectionLabel(doc, "Pengiriman", y);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  const rows: Array<[string, string]> = [
    ["Pengirim", m.shipper || m.business.name || "-"],
    ["Penerima", m.customer.name || "-"],
    ["Alamat tujuan", m.customer.address || "-"],
    ["Kendaraan / kurir", m.vehicle || "-"],
    ["No. order", m.orderNumber || "-"],
  ];
  for (const [k, v] of rows) {
    doc.setTextColor(...MUTED);
    doc.setFontSize(8.5);
    doc.text(k, 14, y);
    doc.setTextColor(...INK);
    doc.setFontSize(10);
    const vlines = wrapText(doc, v, 120);
    doc.text(vlines[0], 60, y);
    if (vlines.length > 1) {
      doc.setFontSize(8.5);
      for (let i = 1; i < vlines.length; i++) doc.text(vlines[i], 60, y + i * 4.5);
    }
    y += Math.max(7, vlines.length * 4.5 + 3);
  }
  y += 2;
  y = sectionLabel(doc, "Daftar Barang", y);
  y = drawItemsTable(doc, m, { includePrice: false, includeAmount: false }, y);
  if (m.note) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(...MUTED);
    doc.text(`Catatan: ${m.note}`, 14, y);
    y += 6;
  }
  if (m.signatures && m.signatures.length >= 2) {
    doc.setFontSize(8.5);
    doc.setTextColor(...MUTED);
    doc.text(m.signatures[0].label, 20, 262);
    doc.text(m.signatures[1].label, 120, 262);
    doc.text("( ................................................. )", 20, 282);
    doc.text("( ................................................. )", 120, 282);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...INK);
    doc.text(m.signatures[0].name || ".............................", 20, 275);
    doc.text(m.signatures[1].name || ".............................", 120, 275);
  }
  return 285;
}

function renderPackingList(doc: jsPDF, m: DocModel, totals: ReturnType<typeof docTotals>, y: number): number {
  y = sectionLabel(doc, "Untuk Order", y);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.setTextColor(...INK);
  doc.text(`Order: ${m.orderNumber || "-"}`, 14, y);
  y += 6;
  doc.setTextColor(...MUTED);
  doc.text(`Customer: ${m.customer.name || "-"}`, 14, y);
  y += 10;
  y = sectionLabel(doc, "Checklist Packing", y);
  y = drawItemsTable(doc, m, { includePrice: false, includeAmount: false, packed: true }, y);
  if (m.note) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(...MUTED);
    doc.text(`Catatan: ${m.note}`, 14, y);
  }
  if (m.signatures && m.signatures.length === 1) {
    doc.setFontSize(8.5);
    doc.setTextColor(...MUTED);
    doc.text(m.signatures[0].label, 14, 262);
    doc.text("( ................................................. )", 14, 282);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...INK);
    doc.text(m.signatures[0].name || ".............................", 14, 275);
  }
  return 285;
}

function renderPriceList(doc: jsPDF, m: DocModel, totals: ReturnType<typeof docTotals>, y: number): number {
  if (m.priceListTitle) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.setTextColor(...INK);
    doc.text(m.priceListTitle, 14, y);
    y += 8;
  }
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...MUTED);
  doc.text(`${m.business.name || ""}${m.business.phone ? `  •  ${m.business.phone}` : ""}`, 14, y);
  y += 6;
  doc.setFontSize(8);
  doc.text(m.number, 14, y);
  y += 8;
  y = docKindTitle(m.$kind) !== "DAFTAR HARGA" ? y : drawItemsTable(doc, m, { includePrice: true, includeAmount: false }, y);
  if (m.terms) {
    y += 4;
    y = sectionLabel(doc, "Ketentuan", y);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(...MUTED);
    const lines = wrapText(doc, m.terms, 170);
    for (const l of lines) {
      doc.text(l, 14, y);
      y += 4.5;
    }
  }
  return y + 4;
}