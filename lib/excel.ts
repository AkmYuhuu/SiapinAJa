// Shared Excel (.xlsx) import/export engine for SiapinAja.
// All tools share one engine — never write a parser per tool.
// Import is schema-driven; export writes a professional 2-sheet workbook:
//   Sheet "Petunjuk"  → instructions, required/optional columns, formats, example.
//   Sheet "Data Import" → canonical machine-readable headers + data (or example row).

import { downloadBlob } from "@/lib/export";
import type { Borders, Workbook, Worksheet } from "exceljs";

export type CellParser = (raw: string) => { value: unknown; error?: string };

export interface ExcelColumnDef {
  key: string;
  required?: boolean;
  aliases?: string[];
  type: "string" | "number" | "percent" | "date";
  min?: number;
  defaultValue?: number | string;
  parse?: CellParser;
  /** Indonesian label shown on the Petunjuk sheet. */
  label?: string;
  /** Short description shown on the Petunjuk sheet. */
  desc?: string;
  /** Example value used in templates / Petunjuk sheet. */
  example?: unknown;
  /** Preferred column width (chars) in the exported workbook. */
  width?: number;
}

export interface ExcelSchema {
  /** Stable machine name, e.g. "profit-analyzer". */
  name: string;
  /** Human readable title for the Petunjuk sheet. */
  title: string;
  columns: ExcelColumnDef[];
}

export const EXCEL_MAX_FILE_SIZE = 10 * 1024 * 1024;
export const EXCEL_MAX_ROWS = 10000;

export interface ExcelImportError {
  row: number;
  column: string;
  value: string;
  message: string;
}

export interface ExcelImportOutcome {
  ok: boolean;
  fatal?: string;
  sheetName: string;
  headers: string[];
  unusedColumns: string[];
  rows: Array<Record<string, unknown>>;
  errors: ExcelImportError[];
  totalRows: number;
  validRows: number;
  invalidRows: number;
}

// ---------------------------------------------------------------------------
// Header / value normalization
// ---------------------------------------------------------------------------

export function normalizeHeader(value: string): string {
  return value
    .replace(/^\uFEFF/, "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

export function parseNumber(value: unknown, fallback = 0): number {
  const s = String(value ?? "").trim();
  if (!s) return fallback;
  const cleaned = s.replace(/[^\d.,+\-]/g, "");
  if (!cleaned) return fallback;
  const hasComma = cleaned.includes(",");
  const dots = (cleaned.match(/\./g) || []).length;
  let normalized: string;
  if (hasComma) {
    normalized = cleaned.replace(/\./g, "").replace(",", ".");
  } else if (dots > 1) {
    normalized = cleaned.replace(/\./g, "");
  } else if (dots === 1) {
    const [, fraction] = cleaned.split(".");
    normalized = fraction.length === 3 ? cleaned.replace(".", "") : cleaned;
  } else {
    normalized = cleaned;
  }
  const num = Number(normalized);
  return Number.isFinite(num) ? num : fallback;
}

export function parsePercent(value: unknown, fallback = 0): number {
  const s = String(value ?? "").trim();
  if (!s) return fallback;
  const explicit = s.endsWith("%");
  const num = parseNumber(explicit ? s.slice(0, -1) : s, Number.NaN);
  if (!Number.isFinite(num)) return fallback;
  if (explicit) return num;
  return num <= 1 ? num * 100 : num;
}

export function parseDate(value: unknown): string {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    const pad = (v: number) => String(v).padStart(2, "0");
    return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}`;
  }
  const s = String(value ?? "").trim();
  if (!s) return "";
  const pad = (v: number) => String(v).padStart(2, "0");
  const iso = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(s);
  if (iso) return `${iso[1]}-${pad(Number(iso[2]))}-${pad(Number(iso[3]))}`;
  const slashIso = /^(\d{4})[/.](\d{1,2})[/.](\d{1,2})$/.exec(s);
  if (slashIso) return `${slashIso[1]}-${pad(Number(slashIso[2]))}-${pad(Number(slashIso[3]))}`;
  const dmy = /^(\d{1,2})[/.\-](\d{1,2})[/.\-](\d{4})$/.exec(s);
  if (dmy) {
    const day = Number(dmy[1]);
    const month = Number(dmy[2]);
    const year = Number(dmy[3]);
    if (day >= 1 && day <= 31 && month >= 1 && month <= 12) {
      return `${year}-${pad(month)}-${pad(day)}`;
    }
  }
  return "";
}

// ---------------------------------------------------------------------------
// Shared import validation engine
// ---------------------------------------------------------------------------

interface ImportRow {
  cells: string[];
  line: number;
}

function findDuplicateHeaders(headers: string[]): string[] {
  const counts = new Map<string, number>();
  for (const h of headers) {
    if (!h) continue;
    counts.set(h, (counts.get(h) ?? 0) + 1);
  }
  return [...counts.entries()].filter(([, c]) => c > 1).map(([h]) => h);
}

function stripInjection(s: string): string {
  const m = /^'(\s*)[=+\-@]/.exec(s);
  return m ? s.slice(1) : s;
}

function defaultFor(type: ExcelColumnDef["type"]): unknown {
  switch (type) {
    case "number":
      return 0;
    case "percent":
      return 0;
    default:
      return "";
  }
}

function parseCell(column: ExcelColumnDef, raw: string): { value: unknown; error?: string } {
  const value = raw.trim();
  if (!value) {
    if (column.required) {
      return { value: column.defaultValue ?? "", error: "kolom wajib tidak boleh kosong" };
    }
    return { value: column.defaultValue ?? defaultFor(column.type) };
  }
  if (column.parse) return column.parse(raw);
  switch (column.type) {
    case "string": {
      const s = stripInjection(value);
      if (column.min !== undefined && s.length < column.min) {
        return { value: s, error: `harus minimal ${column.min} karakter` };
      }
      return { value: s };
    }
    case "number": {
      const num = parseNumber(value, Number.NaN);
      if (!Number.isFinite(num)) return { value: column.defaultValue ?? 0, error: "bukan angka yang valid" };
      if (column.min !== undefined && num < column.min) return { value: num, error: `harus bernilai >= ${column.min}` };
      return { value: num };
    }
    case "percent": {
      const num = parsePercent(value, Number.NaN);
      if (!Number.isFinite(num)) return { value: column.defaultValue ?? 0, error: "bukan persen yang valid" };
      if (column.min !== undefined && num < column.min) return { value: num, error: `harus bernilai >= ${column.min}` };
      return { value: num };
    }
    case "date": {
      const d = parseDate(value);
      if (!d) return { value: "", error: "tanggal tidak valid" };
      return { value: d };
    }
    default:
      return { value };
  }
}

function runImport(
  sheetName: string,
  headers: string[],
  rows: ImportRow[],
  schema: ExcelSchema,
  maxRows: number,
): ExcelImportOutcome {
  const normalizedHeaders = headers.map(normalizeHeader);

  const duplicates = findDuplicateHeaders(normalizedHeaders);
  if (duplicates.length) {
    return {
      ok: false,
      fatal: `Header ${duplicates.map((d) => `"${d}"`).join(", ")} muncul lebih dari satu kali.`,
      sheetName,
      headers,
      unusedColumns: [],
      rows: [],
      errors: [],
      totalRows: 0,
      validRows: 0,
      invalidRows: 0,
    };
  }

  const map = schema.columns.map((column) => {
    const aliases = [column.key, ...(column.aliases ?? [])].map(normalizeHeader);
    let index = -1;
    for (const alias of aliases) {
      const found = normalizedHeaders.indexOf(alias);
      if (found >= 0) {
        index = found;
        break;
      }
    }
    return { column, index };
  });

  const missing = map.filter((m) => m.column.required && m.index < 0);
  if (missing.length) {
    return {
      ok: false,
      fatal: `Kolom wajib ${missing.map((m) => m.column.key).join(", ")} tidak ditemukan.`,
      sheetName,
      headers,
      unusedColumns: [],
      rows: [],
      errors: [],
      totalRows: 0,
      validRows: 0,
      invalidRows: 0,
    };
  }

  const usedIndexes = new Set(map.filter((m) => m.index >= 0).map((m) => m.index));
  const unusedColumns = normalizedHeaders.filter((_, i) => !usedIndexes.has(i));

  const dataRows = rows.filter((r) => !r.cells.every((c) => c.trim() === ""));
  if (dataRows.length > maxRows) {
    return {
      ok: false,
      fatal: `File terlalu besar untuk satu import. Maksimal ${maxRows} baris. Pecah menjadi beberapa file.`,
      sheetName,
      headers,
      unusedColumns,
      rows: [],
      errors: [],
      totalRows: dataRows.length,
      validRows: 0,
      invalidRows: 0,
    };
  }

  const parsed: Array<Record<string, unknown>> = [];
  const errors: ExcelImportError[] = [];
  let validRows = 0;
  for (const row of dataRows) {
    const rec: Record<string, unknown> = {};
    const rowErrors: ExcelImportError[] = [];
    for (const m of map) {
      const { column, index } = m;
      const raw = index >= 0 ? (row.cells[index] ?? "") : "";
      const { value, error } = parseCell(column, raw);
      rec[column.key] = value;
      if (error) rowErrors.push({ row: row.line, column: column.key, value: raw, message: error });
    }
    if (rowErrors.length) {
      errors.push(...rowErrors);
    } else {
      parsed.push(rec);
      validRows++;
    }
  }
  return {
    ok: true,
    sheetName,
    headers,
    unusedColumns,
    rows: parsed,
    errors,
    totalRows: dataRows.length,
    validRows,
    invalidRows: dataRows.length - validRows,
  };
}

// ---------------------------------------------------------------------------
// Read .xlsx
// ---------------------------------------------------------------------------

function cellToString(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) return parseDate(value);
  if (typeof value === "object") {
    const o = value as { result?: unknown; text?: unknown; richText?: Array<{ text: string }> };
    if (o.richText) return o.richText.map((r) => r.text ?? "").join("");
    if (o.result !== undefined) return cellToString(o.result);
    if (typeof o.text === "string") return o.text;
    return "";
  }
  return String(value);
}

export async function readExcelWorkbook(file: File): Promise<{ sheetName: string; headers: string[]; rows: ImportRow[] }> {
  const { Workbook } = await import("exceljs");
  const workbook = new Workbook();
  await workbook.xlsx.load(await file.arrayBuffer());

  let sheet = workbook.worksheets.find((w) => normalizeHeader(w.name) === "data import");
  if (!sheet) sheet = workbook.worksheets[0];
  if (!sheet) {
    throw new Error("File Excel kosong (tidak ada sheet).");
  }

  const rows: ImportRow[] = [];
  sheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    const cells: string[] = [];
    let maxCol = 1;
    row.eachCell((cell, colNumber) => {
      maxCol = Math.max(maxCol, colNumber);
      const text = cellToString(cell.value);
      cells[colNumber - 1] = text;
    });
    const padded: string[] = [];
    for (let i = 0; i < maxCol; i++) padded[i] = cells[i] ?? "";
    rows.push({ cells: padded, line: rowNumber });
  });

  if (rows.length === 0) {
    throw new Error("Sheet tidak memiliki data.");
  }
  const headers = rows[0].cells;
  return { sheetName: sheet.name, headers, rows: rows.slice(1) };
}

export function importExcel(
  file: File,
  schema: ExcelSchema,
  opts: { maxRows?: number } = {},
): Promise<ExcelImportOutcome> {
  const maxRows = opts.maxRows ?? EXCEL_MAX_ROWS;
  return readExcelWorkbook(file).then(({ sheetName, headers, rows }) =>
    runImport(sheetName, headers, rows, schema, maxRows),
  );
}

// ---------------------------------------------------------------------------
// Write .xlsx (styled, professional)
// ---------------------------------------------------------------------------

const HEADER_FILL = "1F2937";
const SECTION_FILL = "E8620C";
const TABLE_HEADER_FILL = "E5E7EB";
const NOTE_FILL = "FFF7ED";
const BORDER_COLOR = "D1D5DB";

function thinBorder(): Partial<Borders> {
  return {
    top: { style: "thin", color: { argb: BORDER_COLOR } },
    left: { style: "thin", color: { argb: BORDER_COLOR } },
    bottom: { style: "thin", color: { argb: BORDER_COLOR } },
    right: { style: "thin", color: { argb: BORDER_COLOR } },
  };
}

function typeLabel(type: ExcelColumnDef["type"]): string {
  switch (type) {
    case "number":
      return "Angka (Rupiah)";
    case "percent":
      return "Persen (%)";
    case "date":
      return "Tanggal";
    default:
      return "Teks";
  }
}

function defaultWidth(type: ExcelColumnDef["type"]): number {
  switch (type) {
    case "number":
      return 16;
    case "percent":
      return 12;
    case "date":
      return 14;
    default:
      return 24;
  }
}

function buildPetunjukSheet(sheet: Worksheet, schema: ExcelSchema): void {
  const ws = sheet;
  ws.mergeCells("A1:E1");
  const title = ws.getCell("A1");
  title.value = `Petunjuk Import — ${schema.title}`;
  title.font = { bold: true, size: 14, color: { argb: "FFFFFFFF" } };
  title.fill = { type: "pattern", pattern: "solid", fgColor: { argb: HEADER_FILL } };
  title.alignment = { vertical: "middle", horizontal: "left" };
  ws.getRow(1).height = 28;

  ws.mergeCells("A2:E2");
  const sub = ws.getCell("A2");
  sub.value =
    "Isi sheet 'Data Import' dengan data Anda. Jangan mengganti nama kolom (header) pada sheet 'Data Import' — kolom tersebut dibaca otomatis saat impor.";
  sub.font = { italic: true, size: 10, color: { argb: "FF6B7280" } };
  sub.alignment = { wrapText: true, vertical: "top" };
  ws.getRow(2).height = 30;

  const widths = [26, 26, 14, 44];
  ws.columns = widths.map((w) => ({ width: w }));

  let row = 4;

  const sectionHeader = (text: string) => {
    ws.mergeCells(`A${row}:E${row}`);
    const c = ws.getCell(`A${row}`);
    c.value = text;
    c.font = { bold: true, color: { argb: "FFFFFFFF" } };
    c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: SECTION_FILL } };
    c.alignment = { vertical: "middle", horizontal: "left" };
    ws.getRow(row).height = 20;
    row++;
  };

  const tableHeader = () => {
    const headers = ["Nama Kolom", "Label", "Tipe", "Keterangan"];
    headers.forEach((h, i) => {
      const c = ws.getCell(row, i + 1);
      c.value = h;
      c.font = { bold: true };
      c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: TABLE_HEADER_FILL } };
      c.border = thinBorder();
      c.alignment = { vertical: "middle" };
    });
    ws.getRow(row).height = 18;
    row++;
  };

  const columnRow = (col: ExcelColumnDef) => {
    const example = col.example !== undefined ? String(col.example) : "";
    const values = [col.key, col.label ?? "", typeLabel(col.type), col.desc ?? ""];
    values.forEach((v, i) => {
      const c = ws.getCell(row, i + 1);
      c.value = v;
      c.border = thinBorder();
      c.alignment = { vertical: "top", wrapText: true };
    });
    const ex = ws.getCell(row, 4);
    ex.value = example;
    ex.alignment = { vertical: "top", wrapText: true };
    row++;
  };

  sectionHeader("KOLOM WAJIB");
  tableHeader();
  schema.columns.filter((c) => c.required).forEach(columnRow);

  row++;
  sectionHeader("KOLOM OPSIONAL");
  tableHeader();
  schema.columns.filter((c) => !c.required).forEach(columnRow);

  row++;
  sectionHeader("FORMAT YANG DITERIMA");
  const notes = [
    "Tanggal: YYYY-MM-DD (2026-08-15) atau DD/MM/YYYY (15/08/2026).",
    "Angka: 28000, 28.000, 28,000, atau Rp 28.000.",
    "Persen: 8, 8%, atau 0.08 (semua berarti 8%).",
    "Baris kosong diabaikan. Maksimal 10.000 baris per import.",
  ];
  for (const note of notes) {
    ws.mergeCells(`A${row}:E${row}`);
    const c = ws.getCell(`A${row}`);
    c.value = `• ${note}`;
    c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: NOTE_FILL } };
    c.font = { size: 10 };
    c.alignment = { vertical: "middle" };
    row++;
  }

  row++;
  ws.mergeCells(`A${row}:E${row}`);
  const tip = ws.getCell(`A${row}`);
  tip.value =
    "Tip: gunakan menu 'Unduh Template' untuk template kosong, atau 'Ekspor Excel' untuk file berisi data Anda saat ini. Keduanya bisa langsung diimpor kembali tanpa mengubah header.";
  tip.font = { italic: true, size: 10, color: { argb: "FFE8620C" } };
  tip.alignment = { wrapText: true, vertical: "top" };
  ws.getRow(row).height = 28;

  ws.views = [{ state: "frozen", ySplit: 1 }];
}

function buildDataSheet(sheet: Worksheet, schema: ExcelSchema, rows: Array<Record<string, unknown>>): void {
  const ws = sheet;
  const cols = schema.columns;

  cols.forEach((col, i) => {
    const cell = ws.getCell(1, i + 1);
    cell.value = col.key;
    cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: HEADER_FILL } };
    cell.border = thinBorder();
    cell.alignment = { vertical: "middle" };
    ws.getColumn(i + 1).width = col.width ?? defaultWidth(col.type);
  });
  ws.getRow(1).height = 20;

  rows.forEach((r, rIdx) => {
    cols.forEach((col, cIdx) => {
      const cell = ws.getCell(rIdx + 2, cIdx + 1);
      const value = r[col.key];
      cell.border = thinBorder();
      if (col.type === "number" || col.type === "percent") {
        const num = typeof value === "number" && Number.isFinite(value) ? value : parseNumber(value);
        cell.value = num;
        cell.numFmt = col.type === "percent" ? '0"%"' : "#,##0";
        cell.alignment = { vertical: "middle", horizontal: "right" };
      } else if (col.type === "date") {
        cell.value = parseDate(value);
        cell.alignment = { vertical: "middle", horizontal: "center" };
      } else {
        cell.value = String(value ?? "");
        cell.alignment = { vertical: "middle" };
      }
    });
  });

  ws.views = [{ state: "frozen", ySplit: 1 }];
  if (rows.length > 0) {
    ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: rows.length + 1, column: cols.length } };
  }
}

async function buildWorkbook(schema: ExcelSchema, rows: Array<Record<string, unknown>>): Promise<Workbook> {
  const { Workbook } = await import("exceljs");
  const workbook = new Workbook();
  workbook.creator = "SiapinAja";
  workbook.created = new Date();
  buildPetunjukSheet(workbook.addWorksheet("Petunjuk"), schema);
  buildDataSheet(workbook.addWorksheet("Data Import"), schema, rows);
  return workbook;
}

async function workbookToBlob(workbook: Workbook): Promise<Blob> {
  const buffer = await workbook.xlsx.writeBuffer();
  return new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}

export async function downloadXlsx(
  rows: Array<Record<string, unknown>>,
  schema: ExcelSchema,
  filename: string,
): Promise<void> {
  const workbook = await buildWorkbook(schema, rows);
  downloadBlob(await workbookToBlob(workbook), filename);
}

export async function downloadXlsxTemplate(schema: ExcelSchema, filename: string): Promise<void> {
  const example: Record<string, unknown> = {};
  for (const col of schema.columns) {
    example[col.key] = col.example ?? (col.type === "number" || col.type === "percent" ? 0 : "");
  }
  const workbook = await buildWorkbook(schema, [example]);
  downloadBlob(await workbookToBlob(workbook), filename);
}
