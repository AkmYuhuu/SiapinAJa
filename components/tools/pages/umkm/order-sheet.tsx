"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { Button, IconButton } from "@/components/ui/button";
import { Field, Input, MoneyInput, Textarea, PhoneInput } from "@/components/ui/fields";
import { Modal } from "@/components/ui/modal";
import { ConfirmDialog } from "@/components/ui/confirm";
import { EmptyState } from "@/components/ui/empty";
import { Icon } from "@/components/icons";
import { formatCurrency, formatDate, todayISO } from "@/lib/format";
import { useToast } from "@/components/ui/toast";
import { StatBlock } from "@/components/ui/card";
import { buildExportFile } from "@/lib/projects";
import { downloadJSON, copyText } from "@/lib/export";
import { EXCEL_MAX_FILE_SIZE, downloadXlsx, importExcel } from "@/lib/excel";
import type { ExcelImportOutcome, ExcelSchema } from "@/lib/excel";
import { ExcelImportDialog } from "@/components/tools/excel-import-dialog";
import { money, moneySum } from "@/lib/money";
import { PrintMenu } from "@/components/documents/print-menu";
import type { PrintMode } from "@/components/documents/print-menu";
import { setPrintMode } from "@/components/documents/print-menu";
import { exportDocPdf } from "@/lib/documents/html-export";
import { useProject } from "@/components/tools/use-project";
import { ProjectActions } from "@/components/tools/tool-shell";

const TOOL_ID = "order-sheet";

interface OrderItem {
  id: string;
  name: string;
  variant: string;
  qty: number;
  price: number;
}

interface OrderSheet {
  id: string;
  orderNumber: string;
  date: string;
  customer: string;
  phone: string;
  address: string;
  items: OrderItem[];
  discount: number;
  shipping: number;
  notes: string;
  createdAt: string;
}

interface OrdersRecord {
  orders: OrderSheet[];
}

function uid(): string {
  return typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

function blankItem(): OrderItem {
  return { id: uid(), name: "", variant: "", qty: 1, price: 0 };
}

function blankOrder(): OrderSheet {
  return {
    id: uid(),
    orderNumber: "",
    date: todayISO(),
    customer: "",
    phone: "",
    address: "",
    items: [blankItem()],
    discount: 0,
    shipping: 0,
    notes: "",
    createdAt: new Date().toISOString(),
  };
}

function nextOrderNumber(orders: OrderSheet[]): string {
  let max = 0;
  for (const o of orders) {
    const m = /(\d+)/.exec(o.orderNumber || "");
    if (m) max = Math.max(max, Number(m[1]));
  }
  return `ORDER #${String(max + 1).padStart(3, "0")}`;
}

function orderSubtotal(o: OrderSheet): number {
  return moneySum(o.items.map((it) => money(it.qty * it.price)));
}

function orderTotal(o: OrderSheet): number {
  return moneySum([orderSubtotal(o), o.shipping]) - money(o.discount);
}

const orderSheetExcelSchema: ExcelSchema = {
  name: "order-sheet",
  title: "Order Sheet UMKM",
  columns: [
    { key: "order_id", aliases: ["order id", "order_id"], type: "string", label: "ID Order", desc: "ID unik internal. Baris dengan ID sama digabung menjadi satu order.", example: "", width: 10 },
    { key: "order_number", aliases: ["order number", "order_number", "no order", "nomor order", "nomor_order", "noorder"], type: "string", label: "No. Order", desc: "Nomor order untuk manusia. Kosongkan jika dibuat otomatis.", example: "ORD-0001", width: 12 },
    { key: "order_date", required: true, aliases: ["date", "tanggal"], type: "date", defaultValue: "", label: "Tanggal Order", desc: "Tanggal order (YYYY-MM-DD atau DD/MM/YYYY).", example: "2026-08-15", width: 14 },
    { key: "customer", required: true, aliases: ["nama", "name", "nama customer", "nama_customer"], type: "string", label: "Customer", desc: "Nama pemesan.", example: "Budi", width: 18 },
    { key: "phone", aliases: ["telepon", "wa", "whatsapp", "telp"], type: "string", defaultValue: "", label: "Telepon / WA", desc: "Nomor telepon atau WhatsApp.", example: "081234567890", width: 16 },
    { key: "address", aliases: ["alamat"], type: "string", defaultValue: "", label: "Alamat", desc: "Alamat pengiriman.", example: "Jl. Melati No. 10, Jakarta", width: 28 },
    { key: "item_name", required: true, aliases: ["item", "produk", "product", "nama item", "nama_item", "nama produk", "nama_produk"], type: "string", label: "Nama Item", desc: "Nama produk / item yang dipesan.", example: "Kopi Arabica 250g", width: 20 },
    { key: "item_variant", aliases: ["variant", "varian"], type: "string", defaultValue: "", label: "Varian", desc: "Varian / pilihan item (opsional).", example: "Original", width: 14 },
    { key: "quantity", required: true, aliases: ["qty", "jumlah"], type: "number", min: 1, defaultValue: 1, label: "Qty", desc: "Jumlah item.", example: 2, width: 10 },
    { key: "unit_price", required: true, aliases: ["harga", "price", "harga satuan", "harga_satuan", "harga unit", "harga_unit"], type: "number", min: 0, defaultValue: 0, label: "Harga / Unit", desc: "Harga per unit (Rupiah).", example: 50000, width: 14 },
    { key: "discount", aliases: ["diskon"], type: "number", min: 0, defaultValue: 0, label: "Diskon", desc: "Diskon per order (Rupiah).", example: 0, width: 12 },
    { key: "shipping", aliases: ["ongkir", "ongkos kirim"], type: "number", min: 0, defaultValue: 0, label: "Ongkir", desc: "Ongkos kirim per order (Rupiah).", example: 10000, width: 12 },
    { key: "notes", aliases: ["catatan"], type: "string", defaultValue: "", label: "Catatan", desc: "Catatan tambahan (opsional).", example: "Ambil di toko", width: 24 },
  ],
};

export default function OrderSheetTool() {
  const { toast } = useToast();
  const [orders, setOrders] = useState<OrderSheet[]>([]);
  const [filterCustomer, setFilterCustomer] = useState("");
  const [editing, setEditing] = useState<OrderSheet | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [printTarget, setPrintTarget] = useState<OrderSheet | null>(null);
  const [printMode, setPrintModeState] = useState<PrintMode>("a4");
  const [pdfTarget, setPdfTarget] = useState<OrderSheet | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<OrderSheet | null>(null);
  const [excelOutcome, setCsvOutcome] = useState<ExcelImportOutcome | null>(null);
  const [excelFileName, setCsvFileName] = useState("");
  const excelRef = useRef<HTMLInputElement>(null);

  const project = useProject({
    toolId: TOOL_ID,
    getData: () => ({ orders }),
  });

  const [loadedId, setLoadedId] = useState<string | null>(null);
  const current = project.current;
  if (current && current.id !== loadedId) {
    setLoadedId(current.id);
    const data = current.data as OrdersRecord | null | undefined;
    if (data && Array.isArray(data.orders)) {
      setOrders(data.orders.map((o) => ({ ...blankOrder(), ...o, id: o.id || uid() })));
    } else {
      setOrders([]);
    }
  }

  useEffect(() => {
    if (!printTarget) return;
    setPrintMode(printMode);
    const timer = window.setTimeout(() => window.print(), 100);
    const onAfter = () => setPrintTarget(null);
    window.addEventListener("afterprint", onAfter);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("afterprint", onAfter);
    };
  }, [printTarget, printMode]);

  const requestPrint = (o: OrderSheet, mode: PrintMode) => {
    setPrintModeState(mode);
    setPrintTarget(o);
  };

  const openNew = () => {
    const o = blankOrder();
    o.orderNumber = nextOrderNumber(orders);
    setEditing(o);
    setIsNew(true);
  };

  const saveOrder = (o: OrderSheet) => {
    const exists = orders.some((x) => x.id === o.id);
    setOrders(exists ? orders.map((x) => (x.id === o.id ? o : x)) : [o, ...orders]);
    toast("Order tersimpan. Klik Simpan untuk menyimpan proyek.");
  };

  const duplicateOrder = (o: OrderSheet) => {
    const copy: OrderSheet = {
      ...structuredClone(o),
      id: uid(),
      orderNumber: nextOrderNumber(orders),
      createdAt: new Date().toISOString(),
    };
    setOrders([copy, ...orders]);
    toast("Order disalin. Klik Simpan untuk menyimpan.");
  };

  const removeOrder = (o: OrderSheet) => {
    setOrders(orders.filter((x) => x.id !== o.id));
    toast("Order dihapus. Klik Simpan untuk menyimpan.");
  };

  const handleNew = () => {
    setOrders([]);
    setFilterCustomer("");
  };

  const filtered = useMemo(() => {
    const q = (s: string) => s.toLowerCase();
    return orders
      .filter((o) => (filterCustomer ? q(o.customer).includes(q(filterCustomer)) : true))
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [orders, filterCustomer]);

  const stats = useMemo(() => {
    const total = orders.reduce((s, o) => moneySum([s, orderTotal(o)]), 0);
    const totalItems = orders.reduce(
      (s, o) => s + o.items.reduce((n, it) => n + (Number.isFinite(it.qty) ? Math.max(0, it.qty) : 0), 0),
      0,
    );
    return { total, totalItems };
  }, [orders]);

  const printOrder = (o: OrderSheet, mode: PrintMode) => requestPrint(o, mode);

  const exportPdf = async (o: OrderSheet) => {
    setPdfTarget(o);
    await new Promise((r) => setTimeout(r, 60));
    const node = document.querySelector<HTMLElement>(".order-pdf-capture .doc-page");
    if (!node) {
      setPdfTarget(null);
      toast("Pratinjau order belum siap. Coba lagi.", "error");
      return;
    }
    try {
      await exportDocPdf(node, (o.orderNumber || "order").replace(/[^\w\- ]/g, ""));
      toast("PDF siap diunduh.");
    } catch {
      toast("PDF gagal dibuat. Coba lagi.", "error");
    } finally {
      setPdfTarget(null);
    }
  };

  const exportJson = (o: OrderSheet) => {
    const now = new Date().toISOString();
    downloadJSON(
      buildExportFile({
        id: o.id,
        toolId: TOOL_ID,
        name: o.orderNumber || "order",
        version: 1,
        createdAt: now,
        updatedAt: now,
        data: { orders: [o] },
      }),
      `${(o.orderNumber || "order").replace(/[^\w\- ]/g, "")}.json`,
    );
    toast("File order siap diunduh.");
  };

  const copySummary = async (o: OrderSheet) => {
    const lines = [
      o.orderNumber || "ORDER",
      `Customer: ${o.customer || "-"}`,
      ...(o.phone ? [`Telepon / WA: ${o.phone}`] : []),
      ...o.items.map((it) => `${it.qty}x ${it.name}${it.variant ? ` (${it.variant})` : ""} - ${formatCurrency(it.qty * it.price)}`),
      `Subtotal: ${formatCurrency(orderSubtotal(o))}`,
      ...(o.discount > 0 ? [`Diskon: -${formatCurrency(o.discount)}`] : []),
      ...(o.shipping > 0 ? [`Ongkir: ${formatCurrency(o.shipping)}`] : []),
      `Total: ${formatCurrency(orderTotal(o))}`,
      ...(o.notes ? [`Catatan: ${o.notes}`] : []),
    ];
    const ok = await copyText(lines.join("\n"));
    toast(ok ? "Ringkasan order di-copy." : "Gagal menyalin.", ok ? "success" : "error");
  };

  const exportExcel = async () => {
    const rows: Array<Record<string, unknown>> = [];
    for (const o of filtered) {
      for (const it of o.items) {
        rows.push({
          order_id: o.id,
          order_number: o.orderNumber,
          order_date: o.date,
          customer: o.customer,
          phone: o.phone,
          address: o.address,
          item_name: it.name,
          item_variant: it.variant,
          quantity: it.qty,
          unit_price: it.price,
          discount: o.discount,
          shipping: o.shipping,
          notes: o.notes,
        });
      }
    }
    if (rows.length === 0) {
      toast("Belum ada order untuk diekspor.", "info");
      return;
    }
    try {
      await downloadXlsx(rows, orderSheetExcelSchema, `order-sheet-${todayISO()}.xlsx`);
      toast("File Excel siap diunduh.");
    } catch {
      toast("Gagal membuat file Excel.", "error");
    }
  };

  const handleExcelImport = async (file: File | undefined) => {
    if (!file) return;
    if (file.size > EXCEL_MAX_FILE_SIZE) {
      toast("File terlalu besar untuk satu import (maks 10 MB).", "error");
      return;
    }
    try {
      const outcome = await importExcel(file, orderSheetExcelSchema);
      if (!outcome.ok) {
        toast(outcome.fatal ?? "File Excel tidak dapat diimpor.", "error");
        return;
      }
      if (outcome.validRows === 0) {
        toast("Tidak ada baris valid di file Excel.", "error");
        return;
      }
      setCsvFileName(file.name);
      setCsvOutcome(outcome);
    } catch {
      toast("Gagal membaca file Excel.", "error");
    } finally {
      if (excelRef.current) excelRef.current.value = "";
    }
  };

  const confirmExcelImport = () => {
    if (!excelOutcome) return;
    const existingIds = new Set(orders.map((o) => o.id));
    const existingNumbers = new Set(orders.map((o) => o.orderNumber));
    const groups = new Map<string, { recs: Array<Record<string, unknown>>; orderId: string }>();
    for (const rec of excelOutcome.rows) {
      const orderId = String(rec.order_id ?? "").trim();
      const orderNumber = String(rec.order_number ?? "").trim();
      const key = orderId || orderNumber || `_auto_${groups.size}`;
      if (!groups.has(key)) groups.set(key, { recs: [], orderId });
      groups.get(key)?.recs.push(rec);
    }
    const all = [...orders];
    const added: OrderSheet[] = [];
    let imported = 0;
    let skipped = 0;
    for (const { recs, orderId } of groups.values()) {
      if (orderId && existingIds.has(orderId)) {
        skipped++;
        continue;
      }
      const number = String(recs[0]?.order_number ?? "").trim();
      if (!orderId && number && existingNumbers.has(number)) {
        skipped++;
        continue;
      }
      const first = recs[0] ?? {};
      const o: OrderSheet = {
        id: orderId || uid(),
        orderNumber: number || nextOrderNumber(all),
        date: String(first.order_date ?? "") || todayISO(),
        customer: String(first.customer ?? ""),
        phone: String(first.phone ?? ""),
        address: String(first.address ?? ""),
        items: recs.map((r) => ({
          id: uid(),
          name: String(r.item_name ?? "").trim() || "Item",
          variant: String(r.item_variant ?? ""),
          qty: Math.max(1, Number(r.quantity ?? 1)),
          price: Math.max(0, Number(r.unit_price ?? 0)),
        })),
        discount: Math.max(0, Number(first.discount ?? 0)),
        shipping: Math.max(0, Number(first.shipping ?? 0)),
        notes: String(first.notes ?? ""),
        createdAt: new Date().toISOString(),
      };
      existingIds.add(o.id);
      existingNumbers.add(o.orderNumber);
      all.push(o);
      added.push(o);
      imported++;
    }
    if (added.length) setOrders([...added, ...orders]);
    setCsvOutcome(null);
    toast(
      imported > 0
        ? `${imported} order berhasil diimpor${skipped ? `, ${skipped} dilewati (sudah ada)` : ""}.`
        : "Tidak ada order baru untuk diimpor.",
    );
  };

  if (project.loading) {
    return <p className="py-16 text-center text-sm text-ink-secondary">Memuat order…</p>;
  }

  return (
    <div className="space-y-5">
      <ProjectActions
        project={project}
        onSave={() => {
          project.save();
        }}
        onDuplicate={() => {
          project.dupe();
        }}
        onDelete={() => {
          project.remove();
        }}
        onExportJson={() => {
          project.exportJson();
        }}
        onImportFile={(f) => {
          project.importJsonFile(f);
        }}
        onNew={handleNew}
      />
      <div className="space-y-5 print:hidden">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
          <StatBlock label="Jumlah order" value={orders.length} />
          <StatBlock label="Total nilai" value={formatCurrency(stats.total)} />
          <StatBlock label="Total item" value={stats.totalItems} />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Icon name="search" className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-ink-faint" />
            <Input value={filterCustomer} onChange={(e) => setFilterCustomer(e.target.value)} placeholder="Cari customer…" className="h-8 w-48 pl-8 text-[13px]" />
          </div>
          <Button size="sm" onClick={openNew}>
            <Icon name="plus" className="size-3.5" />
            Order Baru
          </Button>
          <Button size="sm" variant="secondary" onClick={exportExcel}>
            <Icon name="download" className="size-3.5" />
            Export Excel
          </Button>
          <Button size="sm" variant="secondary" onClick={() => excelRef.current?.click()}>
            <Icon name="upload" className="size-3.5" />
            Import Excel
          </Button>
          <input
            ref={excelRef}
            type="file"
            accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            className="hidden"
            onChange={(e) => handleExcelImport(e.target.files?.[0])}
          />
        </div>

        {filtered.length === 0 ? (
          <EmptyState
            icon={<Icon name="clipboard" className="size-5" />}
            title={orders.length === 0 ? "Belum ada order" : "Tidak ada order yang cocok"}
            description={orders.length === 0 ? "Buat order pertama: customer, item, dan total pesanan." : "Coba ubah filter customer."}
            actionLabel={orders.length === 0 ? "Buat Order" : undefined}
            onAction={openNew}
          />
        ) : (
          <div className="overflow-x-auto rounded-lg border border-border bg-surface">
            <table className="w-full min-w-[860px] text-sm">
              <thead>
                <tr className="border-b border-border bg-surface-muted text-left text-[11px] uppercase tracking-wide text-ink-faint">
                  <th className="px-4 py-2.5 font-semibold">Order</th>
                  <th className="px-4 py-2.5 font-semibold">Tanggal</th>
                  <th className="px-4 py-2.5 font-semibold">Customer</th>
                  <th className="px-4 py-2.5 text-right font-semibold">Total</th>
                  <th className="px-4 py-2.5 text-right font-semibold">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((o) => (
                  <tr key={o.id} className="border-b border-border last:border-0 hover:bg-surface-muted/50">
                    <td className="px-4 py-3">
                      <button className="font-medium text-ink hover:underline" onClick={() => { setEditing({ ...o }); setIsNew(false); }}>
                        {o.orderNumber || "Tanpa nomor"}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-ink-secondary">{formatDate(o.date)}</td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-ink">{o.customer || "Tanpa nama"}</p>
                      {o.phone && <p className="text-[11px] text-ink-faint">{o.phone}</p>}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold tabular">{formatCurrency(orderTotal(o))}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-0.5">
                        <Button size="sm" variant="secondary" onClick={() => { setEditing({ ...o }); setIsNew(false); }}>
                          <Icon name="save" className="size-3.5" />
                          Edit
                        </Button>
                        <IconButton label="Duplikat order" onClick={() => duplicateOrder(o)}>
                          <Icon name="copy" className="size-4" />
                        </IconButton>
                        <PrintMenu compact autoPrint={false} onBeforePrint={(m) => printOrder(o, m)} />
                        <IconButton label="Export PDF" onClick={() => exportPdf(o)}>
                          <Icon name="download" className="size-4" />
                        </IconButton>
                        <IconButton label="Export JSON" onClick={() => exportJson(o)}>
                          <Icon name="file" className="size-4" />
                        </IconButton>
                        <IconButton label="Copy ringkasan" onClick={() => copySummary(o)}>
                          <Icon name="clipboard" className="size-4" />
                        </IconButton>
                        <IconButton label="Hapus order" className="hover:text-danger" onClick={() => setConfirmDelete(o)}>
                          <Icon name="trash" className="size-4" />
                        </IconButton>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <OrderModal
          order={editing}
          isNew={isNew}
          onClose={() => setEditing(null)}
          onSave={(o) => {
            saveOrder(o);
            setEditing(null);
          }}
        />
      </div>

      {printTarget && (
        <div className="hidden print:block">
          <OrderPrintSheet order={printTarget} />
        </div>
      )}
      {printTarget && (
        <>
          <div className="receipt-print" data-width="80" aria-hidden>
            <OrderReceipt order={printTarget} width={80} />
          </div>
          <div className="receipt-print" data-width="58" aria-hidden>
            <OrderReceipt order={printTarget} width={58} />
          </div>
        </>
      )}
      {pdfTarget && (
        <div className="order-pdf-capture pointer-events-none fixed left-[-9999px] top-0 z-0" aria-hidden>
          <OrderPrintSheet order={pdfTarget} />
        </div>
      )}

      <ConfirmDialog
        open={confirmDelete !== null}
        title="Hapus order?"
        description={`${confirmDelete?.orderNumber || "Order"} untuk ${confirmDelete?.customer || "customer tanpa nama"} akan dihapus permanen dan tidak bisa dikembalikan.`}
        confirmLabel="Hapus"
        onConfirm={() => {
          if (confirmDelete) removeOrder(confirmDelete);
          setConfirmDelete(null);
        }}
        onCancel={() => setConfirmDelete(null)}
      />

      <ExcelImportDialog
        open={excelOutcome !== null}
        fileName={excelFileName}
        outcome={excelOutcome}
        onCancel={() => setCsvOutcome(null)}
        onConfirm={confirmExcelImport}
        confirmLabel={excelOutcome ? `Import ${excelOutcome.validRows} Order` : undefined}
      />
    </div>
  );
}

function OrderModal({
  order,
  isNew,
  onClose,
  onSave,
}: {
  order: OrderSheet | null;
  isNew: boolean;
  onClose: () => void;
  onSave: (o: OrderSheet) => void;
}) {
  const [draft, setDraft] = useState<OrderSheet | null>(order);

  const [prevOrder, setPrevOrder] = useState(order);
  if (order !== prevOrder) {
    setPrevOrder(order);
    setDraft(order);
  }

  if (!draft) return null;

  const patch = (p: Partial<OrderSheet>) => setDraft((d) => (d ? { ...d, ...p } : d));
  const patchItem = (id: string, p: Partial<OrderItem>) =>
    setDraft((d) => (d ? { ...d, items: d.items.map((it) => (it.id === id ? { ...it, ...p } : it)) } : d));
  const removeItem = (id: string) =>
    setDraft((d) => (d ? { ...d, items: d.items.filter((it) => it.id !== id) } : d));
  const addItem = () => setDraft((d) => (d ? { ...d, items: [...d.items, blankItem()] } : d));

  const namedItems = draft.items.filter((it) => it.name.trim());
  const validation: string[] = [];
  if (!draft.customer.trim()) validation.push("Nama customer wajib diisi.");
  if (namedItems.length === 0) validation.push("Minimal satu item dengan nama wajib diisi.");
  for (const it of draft.items) {
    if (!Number.isFinite(it.qty) || it.qty < 0) validation.push("Qty item tidak boleh negatif.");
    if (!Number.isFinite(it.price) || it.price < 0) validation.push("Harga item tidak boleh negatif.");
  }
  if (!Number.isFinite(draft.discount) || draft.discount < 0) validation.push("Diskon tidak boleh negatif.");
  if (!Number.isFinite(draft.shipping) || draft.shipping < 0) validation.push("Ongkir tidak boleh negatif.");
  if (draft.discount > orderSubtotal(draft) + draft.shipping) {
    validation.push("Diskon tidak boleh melebihi subtotal + ongkir.");
  }

  return (
    <Modal open onClose={onClose} title={isNew ? "Order Baru" : `Edit - ${draft.orderNumber || "Tanpa nomor"}`} width="max-w-2xl">
      {validation.length > 0 && (
        <div className="mb-3 rounded-md border border-danger/30 bg-danger-soft px-3 py-2 text-[13px] text-danger">
          {validation.join(" ")}
        </div>
      )}
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Nomor order">
          <Input value={draft.orderNumber} onChange={(e) => patch({ orderNumber: e.target.value })} placeholder="cth. ORDER #001" />
        </Field>
        <Field label="Tanggal">
          <Input type="date" value={draft.date} onChange={(e) => patch({ date: e.target.value })} />
        </Field>
        <Field label="Customer" required>
          <Input value={draft.customer} onChange={(e) => patch({ customer: e.target.value })} placeholder="Nama customer" />
        </Field>
        <Field label="Nomor WhatsApp">
          <PhoneInput value={draft.phone} onChange={(v) => patch({ phone: v })} />
        </Field>
        <Field label="Alamat" className="sm:col-span-2">
          <Textarea value={draft.address} onChange={(e) => patch({ address: e.target.value })} placeholder="Alamat pengiriman" />
        </Field>

        <div className="sm:col-span-2">
          <Field label="Items">
            <div className="space-y-2">
              {draft.items.map((it) => (
                <div key={it.id} className="rounded-md border border-border bg-surface-muted/40 p-3">
                  <div className="grid gap-2 sm:grid-cols-[2fr_1fr_5rem_7rem_auto] sm:items-end">
                    <Field label="Nama item">
                      <Input value={it.name} onChange={(e) => patchItem(it.id, { name: e.target.value })} placeholder="cth. Nasi Box" />
                    </Field>
                    <Field label="Varian (opsional)">
                      <Input value={it.variant} onChange={(e) => patchItem(it.id, { variant: e.target.value })} placeholder="cth. Ayam" />
                    </Field>
                    <Field label="Qty">
                      <Input type="number" min={1} value={it.qty || ""} onChange={(e) => patchItem(it.id, { qty: Math.max(0, Number(e.target.value)) })} className="text-right" />
                    </Field>
                    <Field label="Harga">
                      <MoneyInput value={it.price} onChange={(v) => patchItem(it.id, { price: v })} />
                    </Field>
                    <IconButton label="Hapus item" className="hover:text-danger" onClick={() => removeItem(it.id)}>
                      <Icon name="trash" className="size-4" />
                    </IconButton>
                  </div>
                </div>
              ))}
              <Button variant="secondary" size="sm" onClick={addItem}>
                <Icon name="plus" className="size-3.5" />
                Tambah item
              </Button>
            </div>
          </Field>
        </div>

        <Field label="Diskon (Rp)">
          <MoneyInput value={draft.discount} onChange={(v) => patch({ discount: v })} />
        </Field>
        <Field label="Ongkir (Rp)">
          <MoneyInput value={draft.shipping} onChange={(v) => patch({ shipping: v })} />
        </Field>
        <Field label="Catatan" className="sm:col-span-2">
          <Textarea value={draft.notes} onChange={(e) => patch({ notes: e.target.value })} placeholder="Catatan pesanan / pengiriman" />
        </Field>
      </div>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-ink-secondary">
          Subtotal <strong className="tabular text-ink">{formatCurrency(orderSubtotal(draft))}</strong>
          {draft.shipping > 0 && (
            <>
              {" "}· Ongkir <strong className="tabular text-ink">{formatCurrency(draft.shipping)}</strong>
            </>
          )}
          {draft.discount > 0 && (
            <>
              {" "}· Diskon <strong className="tabular text-ink">-{formatCurrency(draft.discount)}</strong>
            </>
          )}
          <span className="ml-2">
            Total <strong className="tabular text-ink">{formatCurrency(orderTotal(draft))}</strong>
          </span>
        </p>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={onClose}>Tutup</Button>
          <Button onClick={() => onSave(draft)} disabled={validation.length > 0}>Simpan Order</Button>
        </div>
      </div>
    </Modal>
  );
}

function OrderReceipt({ order, width }: { order: OrderSheet; width: number }) {
  const subtotal = orderSubtotal(order);
  const total = orderTotal(order);
  return (
    <div className="receipt" style={{ "--rs": width / 80, width: `${width}mm` } as CSSProperties}>
      <div className="r-center">
        <p className="r-name">ORDER SHEET</p>
        <p className="r-small">{order.orderNumber || "ORDER"}</p>
      </div>
      <p className="r-small r-center">{order.date || "-"}</p>
      <div className="r-dash" />
      <div className="r-row">
        <span>Customer</span>
        <span>{order.customer || "-"}</span>
      </div>
      {order.phone && (
        <div className="r-row r-small">
          <span>Telepon / WA</span>
          <span>{order.phone}</span>
        </div>
      )}
      {order.address && <p className="r-small r-center">{order.address}</p>}
      <div className="r-dash" />
      {order.items.map((it) => (
        <div key={it.id} className="r-item">
          <p>
            {it.name || "-"}
            {it.variant ? <span className="r-small"> ({it.variant})</span> : null}
          </p>
          <div className="r-row">
            <span className="r-small">
              {formatCurrency(it.price)}
              {it.qty > 1 ? ` × ${it.qty}` : ""}
            </span>
            <span>{formatCurrency(it.qty * it.price)}</span>
          </div>
        </div>
      ))}
      {!order.items.length && <p className="r-small r-center">Tidak ada item.</p>}
      <div className="r-dash" />
      <div className="r-row">
        <span>Subtotal</span>
        <span>{formatCurrency(subtotal)}</span>
      </div>
      {order.discount > 0 && (
        <div className="r-row">
          <span>Diskon</span>
          <span>-{formatCurrency(order.discount)}</span>
        </div>
      )}
      {order.shipping > 0 && (
        <div className="r-row">
          <span>Ongkir</span>
          <span>{formatCurrency(order.shipping)}</span>
        </div>
      )}
      <div className="r-total">
        <span>Total</span>
        <span>{formatCurrency(total)}</span>
      </div>
      {order.notes && <p className="r-small r-center">— {order.notes} —</p>}
      <p className="r-small r-center">Dibuat dengan SiapinAja</p>
    </div>
  );
}

function OrderPrintSheet({ order }: { order: OrderSheet }) {
  const subtotal = orderSubtotal(order);
  const total = orderTotal(order);
  return (
    <div className="doc-page border border-border">
      <div className="flex items-start justify-between gap-6">
        <div>
          <p className="text-[16px] font-bold" style={{ fontFamily: "var(--font-plus-jakarta)" }}>ORDER SHEET</p>
          <p className="text-[10px] text-[#6f6a5e]">Daftar pesanan pelanggan</p>
        </div>
        <div className="text-right">
          <p className="text-[15px] font-bold tracking-wide" style={{ fontFamily: "var(--font-plus-jakarta)" }}>
            {order.orderNumber || "ORDER"}
          </p>
          <p className="text-[10px] text-[#6f6a5e]">Tanggal: {order.date || "-"}</p>
        </div>
      </div>

      <div className="mt-5 border-t-2 border-[#e8620c]" />

      <div className="mt-3 grid grid-cols-2 gap-x-8 gap-y-3 text-[11px]">
        <div>
          <p className="text-[9px] font-semibold uppercase text-[#6f6a5e]">Customer</p>
          <p className="font-medium">{order.customer || "-"}</p>
          {order.phone && <p className="text-[10px] text-[#6f6a5e]">{order.phone}</p>}
        </div>
        <div>
          <p className="text-[9px] font-semibold uppercase text-[#6f6a5e]">Alamat</p>
          <p className="whitespace-pre-line text-[10px] text-[#6f6a5e]">{order.address || "-"}</p>
        </div>
      </div>

      <table className="mt-4 w-full border-collapse text-[10px]">
        <thead>
          <tr className="bg-[#f7f5f0] text-[#6f6a5e]">
            <th className="px-1.5 py-1.5 text-left font-bold">Item</th>
            <th className="w-16 px-1.5 py-1.5 text-right font-bold">Qty</th>
            <th className="w-24 px-1.5 py-1.5 text-right font-bold">Harga</th>
            <th className="w-28 px-1.5 py-1.5 text-right font-bold">Jumlah</th>
          </tr>
        </thead>
        <tbody>
          {order.items.map((it) => (
            <tr key={it.id} className="border-b border-[#e3e0d8]">
              <td className="px-1.5 py-1.5">
                <p className="font-medium text-[#2b2823]">{it.name || "-"}</p>
                {it.variant && <p className="text-[9px] text-[#6f6a5e]">{it.variant}</p>}
              </td>
              <td className="px-1.5 py-1.5 text-right tabular">{it.qty}</td>
              <td className="px-1.5 py-1.5 text-right tabular">{formatCurrency(it.price)}</td>
              <td className="px-1.5 py-1.5 text-right font-semibold tabular">{formatCurrency(it.qty * it.price)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="ml-auto mt-3 w-64 space-y-1 text-[10px]">
        <div className="flex justify-between text-[#6f6a5e]">
          <span>Subtotal</span>
          <span className="tabular">{formatCurrency(subtotal)}</span>
        </div>
        {order.discount > 0 && (
          <div className="flex justify-between text-[#6f6a5e]">
            <span>Diskon</span>
            <span className="tabular">-{formatCurrency(order.discount)}</span>
          </div>
        )}
        {order.shipping > 0 && (
          <div className="flex justify-between text-[#6f6a5e]">
            <span>Ongkir</span>
            <span className="tabular">{formatCurrency(order.shipping)}</span>
          </div>
        )}
        <div className="flex justify-between border-t-2 border-[#e8620c] pt-1.5 text-[12px] font-bold text-[#2b2823]">
          <span>Total</span>
          <span className="tabular">{formatCurrency(total)}</span>
        </div>
      </div>

      {order.notes && (
        <>
          <p className="mb-1.5 mt-4 text-[9px] font-bold uppercase tracking-wider text-[#e8620c]">Catatan</p>
          <p className="whitespace-pre-line text-[10px] text-[#6f6a5e]">{order.notes}</p>
        </>
      )}
    </div>
  );
}