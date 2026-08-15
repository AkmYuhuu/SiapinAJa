"use client";

// PO / Pre-Order Manager - workflow (spec §8.7). Reference implementation for
// the workflow interaction model: list → open item → status → action.
// All orders live in IndexedDB (single record per tool).

import { useMemo, useRef, useState } from "react";
import { Tabs } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/card";
import { Button, IconButton } from "@/components/ui/button";
import { Field, Input, MoneyInput, Textarea } from "@/components/ui/fields";
import { Modal } from "@/components/ui/modal";
import { ConfirmDialog } from "@/components/ui/confirm";
import { EmptyState } from "@/components/ui/empty";
import { Icon } from "@/components/icons";
import { formatCurrency, formatDate, todayISO } from "@/lib/format";
import { useToast } from "@/components/ui/toast";
import { StatBlock } from "@/components/ui/card";
import { EXCEL_MAX_FILE_SIZE, downloadXlsx, importExcel } from "@/lib/excel";
import type { CellParser, ExcelImportOutcome, ExcelSchema } from "@/lib/excel";
import { ExcelImportDialog } from "@/components/tools/excel-import-dialog";
import { money, moneySum } from "@/lib/money";
import { useProject } from "@/components/tools/use-project";
import { ProjectActions } from "@/components/tools/tool-shell";

const TOOL_ID = "po-manager";

export type POStatus = "new" | "dp" | "production" | "ready" | "paid" | "shipped" | "completed" | "cancelled";

export interface PO {
  id: string;
  customer: string;
  product: string;
  qty: number;
  price: number;
  dp: number;
  deadline: string;
  note: string;
  status: POStatus;
  createdAt: string;
}

const STATUSES: { key: POStatus; label: string; tone: "neutral" | "accent" | "success" | "warning" | "danger" }[] = [
  { key: "new", label: "Baru", tone: "neutral" },
  { key: "dp", label: "DP", tone: "accent" },
  { key: "production", label: "Produksi", tone: "warning" },
  { key: "ready", label: "Siap", tone: "warning" },
  { key: "paid", label: "Lunas", tone: "success" },
  { key: "shipped", label: "Dikirim", tone: "accent" },
  { key: "completed", label: "Selesai", tone: "success" },
  { key: "cancelled", label: "Batal", tone: "danger" },
];

const STATUS_FLOW: POStatus[] = ["new", "dp", "production", "ready", "paid", "shipped", "completed"];

const PO_STATUS_LABEL: Record<POStatus, string> = {
  new: "Baru",
  dp: "DP",
  production: "Produksi",
  ready: "Siap",
  paid: "Lunas",
  shipped: "Dikirim",
  completed: "Selesai",
  cancelled: "Batal",
};

const PO_STATUS_ALIASES: Record<string, POStatus> = {
  baru: "new",
  new: "new",
  dp: "dp",
  produksi: "production",
  production: "production",
  siap: "ready",
  ready: "ready",
  lunas: "paid",
  paid: "paid",
  dikirim: "shipped",
  shipped: "shipped",
  kirim: "shipped",
  selesai: "completed",
  completed: "completed",
  done: "completed",
  batal: "cancelled",
  dibatalkan: "cancelled",
  cancelled: "cancelled",
  cancel: "cancelled",
};

const parsePoStatus: CellParser = (raw) => {
  const key = PO_STATUS_ALIASES[raw.trim().toLowerCase()];
  if (!key) return { value: "new", error: `status tidak dikenali: "${raw}"` };
  return { value: key };
};

const poManagerExcelSchema: ExcelSchema = {
  name: "po-manager",
  title: "PO / Pre-Order Manager",
  columns: [
    { key: "po_id", aliases: ["po id", "po_no", "no po", "nomor po", "nomor_po", "order id", "order_id"], type: "string", label: "ID Order", desc: "ID unik order. Kosongkan jika ingin dibuat otomatis.", example: "PO-0001", width: 12 },
    { key: "customer", required: true, aliases: ["nama", "name", "nama customer", "nama_customer"], type: "string", label: "Customer", desc: "Nama pemesan.", example: "Rina", width: 18 },
    { key: "product", required: true, aliases: ["produk", "item", "barang", "nama produk", "nama_produk"], type: "string", label: "Produk", desc: "Nama produk / barang yang dipesan.", example: "Kaos Custom", width: 20 },
    { key: "quantity", required: true, aliases: ["qty", "jumlah", "unit"], type: "number", min: 1, defaultValue: 1, label: "Qty", desc: "Jumlah unit.", example: 10, width: 10 },
    { key: "unit_price", required: true, aliases: ["price", "harga", "harga unit", "harga_unit", "harga satuan", "harga_satuan"], type: "number", min: 0, defaultValue: 0, label: "Harga / Unit", desc: "Harga per unit (Rupiah).", example: 85000, width: 14 },
    { key: "dp_paid", aliases: ["dp", "uang muka", "uang_muka", "down payment"], type: "number", min: 0, defaultValue: 0, label: "DP", desc: "Uang muka yang sudah dibayar (Rupiah).", example: 300000, width: 14 },
    { key: "deadline", aliases: ["due date", "due_date", "jatuh tempo", "jatuh_tempo", "tanggal deadline"], type: "date", defaultValue: "", label: "Deadline", desc: "Batas waktu pengerjaan.", example: "2026-08-20", width: 14 },
    { key: "status", aliases: ["order status", "order_status"], type: "string", defaultValue: "new", parse: parsePoStatus, label: "Status", desc: "Baru, DP, Produksi, Ready, Selesai, Dibatalkan.", example: "Produksi", width: 14 },
    { key: "notes", aliases: ["note", "catatan", "keterangan"], type: "string", defaultValue: "", label: "Catatan", desc: "Catatan tambahan (opsional).", example: "Cetak logo depan", width: 24 },
  ],
};

function paymentStatusOf(po: PO): string {
  if (po.status === "paid" || po.status === "completed" || po.status === "shipped") return "Lunas";
  if (po.dp > 0) return "DP";
  return "Belum Bayar";
}

interface OrdersRecord {
  orders: PO[];
}

function blankPO(): PO {
  return {
    id: crypto.randomUUID(),
    customer: "",
    product: "",
    qty: 1,
    price: 0,
    dp: 0,
    deadline: "",
    note: "",
    status: "new",
    createdAt: new Date().toISOString(),
  };
}

export default function PoManagerTool() {
  const { toast } = useToast();
  const [orders, setOrders] = useState<PO[]>([]);
  const [tab, setTab] = useState("semua");
  const [filterCustomer, setFilterCustomer] = useState("");
  const [filterProduct, setFilterProduct] = useState("");
  const [filterDate, setFilterDate] = useState("");
  const [editing, setEditing] = useState<PO | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<PO | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
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
      setOrders(data.orders.map((o) => ({ ...blankPO(), ...o, id: o.id || crypto.randomUUID() })));
    } else {
      setOrders([]);
    }
  }

  const saveOrder = (po: PO) => {
    const exists = orders.some((o) => o.id === po.id);
    if (exists) setOrders(orders.map((o) => (o.id === po.id ? po : o)));
    else setOrders([po, ...orders]);
    toast("Order tersimpan. Klik Simpan untuk menyimpan proyek.");
  };

  const changeStatus = (po: PO, status: POStatus) => {
    setOrders(orders.map((o) => (o.id === po.id ? { ...o, status } : o)));
    toast("Status diperbarui. Klik Simpan untuk menyimpan.");
  };

  const advanceStatus = (po: PO) => {
    const idx = STATUS_FLOW.indexOf(po.status);
    if (idx >= 0 && idx < STATUS_FLOW.length - 1) {
      changeStatus(po, STATUS_FLOW[idx + 1]);
    }
  };

  const removeOrder = (po: PO) => {
    setOrders(orders.filter((o) => o.id !== po.id));
    toast("Order dihapus. Klik Simpan untuk menyimpan.");
  };

  const handleNew = () => {
    setOrders([]);
    setTab("semua");
  };

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const cancelSelected = () => {
    const ids = Array.from(selected);
    if (ids.length === 0) return;
    setOrders(orders.map((o) => (ids.includes(o.id) ? { ...o, status: "cancelled" as const } : o)));
    setSelected(new Set());
    toast(`${ids.length} order dibatalkan. Klik Simpan untuk menyimpan.`);
  };

  const filtered = useMemo(() => {
    const q = (s: string) => s.toLowerCase();
    return orders
      .filter((o) => (tab === "semua" ? true : matchesTab(o.status, tab)))
      .filter((o) => (filterCustomer ? q(o.customer).includes(q(filterCustomer)) : true))
      .filter((o) => (filterProduct ? q(o.product).includes(q(filterProduct)) : true))
      .filter((o) => (filterDate ? o.deadline === filterDate : true))
      .sort((a, b) => {
        if (a.status === "cancelled" && b.status !== "cancelled") return 1;
        if (b.status === "cancelled" && a.status !== "cancelled") return -1;
        return (a.deadline || "9999").localeCompare(b.deadline || "9999");
      });
  }, [orders, tab, filterCustomer, filterProduct, filterDate]);

  const stats = useMemo(() => {
    const active = orders.filter((o) => o.status !== "cancelled" && o.status !== "completed");
    const totalValue = active.reduce((s, o) => moneySum([s, money(o.qty * o.price)]), 0);
    const totalDp = active.reduce((s, o) => moneySum([s, o.dp]), 0);
    const remaining = active.reduce((s, o) => moneySum([s, money(o.qty * o.price) - o.dp]), 0);
    const upcoming = active
      .filter((o) => o.deadline)
      .sort((a, b) => a.deadline.localeCompare(b.deadline))
      .slice(0, 3);
    return { totalValue, totalDp, remaining, upcoming, active: active.length };
  }, [orders]);

  const exportExcel = async () => {
    const rows = filtered.map((po) => ({
      po_id: po.id,
      po_date: po.createdAt ? po.createdAt.slice(0, 10) : "",
      customer: po.customer,
      whatsapp: "",
      product: po.product,
      variant: "",
      quantity: po.qty,
      unit_price: po.price,
      dp_paid: po.dp,
      deadline: po.deadline,
      status: PO_STATUS_LABEL[po.status] ?? po.status,
      payment_status: paymentStatusOf(po),
      notes: po.note,
    }));
    if (rows.length === 0) {
      toast("Belum ada order untuk diekspor.", "info");
      return;
    }
    try {
      await downloadXlsx(rows, poManagerExcelSchema, `po-manager-${todayISO()}.xlsx`);
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
      const outcome = await importExcel(file, poManagerExcelSchema);
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
    const added: PO[] = [];
    let imported = 0;
    let skipped = 0;
    for (const r of excelOutcome.rows) {
      const poId = String(r.po_id ?? "").trim();
      if (poId && existingIds.has(poId)) {
        skipped++;
        continue;
      }
      const po: PO = {
        id: poId || crypto.randomUUID(),
        customer: String(r.customer ?? ""),
        product: String(r.product ?? ""),
        qty: Math.max(1, Number(r.quantity ?? 1)),
        price: Math.max(0, Number(r.unit_price ?? 0)),
        dp: Math.max(0, Number(r.dp_paid ?? 0)),
        deadline: String(r.deadline ?? ""),
        note: String(r.notes ?? ""),
        status: (r.status as POStatus) || "new",
        createdAt: new Date().toISOString(),
      };
      existingIds.add(po.id);
      added.push(po);
      imported++;
    }
    if (added.length) setOrders([...added, ...orders]);
    setCsvOutcome(null);
    toast(
      imported > 0
        ? `${imported} order berhasil diimpor${skipped ? `, ${skipped} dilewati (ID sudah ada)` : ""}.`
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
      {/* dashboard (spec §8.7) */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatBlock label="Jumlah PO" value={stats.active} sub="sedang berjalan" />
        <StatBlock label="Total nilai PO" value={formatCurrency(stats.totalValue)} />
        <StatBlock label="Total DP" value={formatCurrency(stats.totalDp)} />
        <StatBlock label="Sisa tagihan" value={formatCurrency(stats.remaining)} sub={stats.upcoming[0] ? `Deadline terdekat: ${formatDate(stats.upcoming[0].deadline)}` : "tidak ada deadline"} />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Tabs
          className="flex-1"
          tabs={[
            { key: "semua", label: "Semua", count: orders.length },
            { key: "baru", label: "Baru", count: countBy(orders, "new") },
            { key: "dp", label: "DP", count: countBy(orders, "dp") },
            { key: "produksi", label: "Produksi", count: countBy(orders, "production") },
            { key: "siap", label: "Siap", count: countBy(orders, "ready") },
            { key: "lunas", label: "Lunas", count: countBy(orders, "paid") },
            { key: "dikirim", label: "Dikirim", count: countBy(orders, "shipped") },
            { key: "selesai", label: "Selesai", count: countBy(orders, "completed") },
            { key: "batal", label: "Batal", count: countBy(orders, "cancelled") },
          ]}
          active={tab}
          onChange={setTab}
        />
        <div className="relative -mt-px">
          <Icon name="search" className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-ink-faint" />
          <Input value={filterCustomer} onChange={(e) => setFilterCustomer(e.target.value)} placeholder="Cari customer…" className="h-8 w-44 pl-8 text-[13px]" />
        </div>
        <div className="relative -mt-px">
          <Icon name="search" className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-ink-faint" />
          <Input value={filterProduct} onChange={(e) => setFilterProduct(e.target.value)} placeholder="Filter produk…" className="h-8 w-40 pl-8 text-[13px]" />
        </div>
        <Input
          type="date"
          value={filterDate}
          onChange={(e) => setFilterDate(e.target.value)}
          aria-label="Filter deadline"
          className="h-8 w-40 text-[13px]"
        />
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
        <Button size="sm" variant="secondary" onClick={cancelSelected} disabled={selected.size === 0}>
          <Icon name="x" className="size-3.5" />
          Batal ({selected.size})
        </Button>
        <Button
          size="sm"
          onClick={() => {
            setEditing(blankPO());
            setIsNew(true);
          }}
        >
          <Icon name="plus" className="size-3.5" />
          Order Baru
        </Button>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<Icon name="boxes" className="size-5" />}
          title={orders.length === 0 ? "Belum ada pre-order" : "Tidak ada order pada tab ini"}
          description={
            orders.length === 0
              ? "Buat order pertama: customer, produk, DP, dan deadline."
              : "Coba tab atau filter lain."
          }
          actionLabel={orders.length === 0 ? "Buat Order" : undefined}
          onAction={() => {
            setEditing(blankPO());
            setIsNew(true);
          }}
        />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border bg-surface">
          <table className="w-full min-w-[760px] text-sm">
            <thead>
              <tr className="border-b border-border bg-surface-muted text-left text-[11px] uppercase tracking-wide text-ink-faint">
                <th className="w-10 px-3 py-2.5">
                  <input
                    type="checkbox"
                    className="size-4 accent-[#e8620c]"
                    checked={filtered.every((o) => selected.has(o.id)) && filtered.length > 0}
                    onChange={() => {
                      setSelected((prev) => {
                        const next = new Set(prev);
                        const all = filtered.every((o) => next.has(o.id));
                        filtered.forEach((o) => (all ? next.delete(o.id) : next.add(o.id)));
                        return next;
                      });
                    }}
                    aria-label="Pilih semua"
                  />
                </th>
                <th className="px-4 py-2.5 font-semibold">Customer</th>
                <th className="px-4 py-2.5 font-semibold">Produk</th>
                <th className="px-4 py-2.5 text-right font-semibold">Nilai</th>
                <th className="px-4 py-2.5 text-right font-semibold">Sisa</th>
                <th className="px-4 py-2.5 font-semibold">Deadline</th>
                <th className="px-4 py-2.5 font-semibold">Status</th>
                <th className="px-4 py-2.5 text-right font-semibold">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((po) => {
                const st = STATUSES.find((s) => s.key === po.status) ?? STATUSES[0];
                const value = po.qty * po.price;
                const remaining = Math.max(0, value - po.dp);
                const isLate = po.deadline && po.deadline < new Date().toISOString().slice(0, 10) && po.status !== "completed" && po.status !== "cancelled";
                return (
                  <tr key={po.id} className="border-b border-border last:border-0 hover:bg-surface-muted/50">
                    <td className="px-3 py-3">
                      <input
                        type="checkbox"
                        className="size-4 accent-[#e8620c]"
                        checked={selected.has(po.id)}
                        onChange={() => toggleSelect(po.id)}
                        aria-label={`Pilih ${po.customer || "order"}`}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <button className="font-medium text-ink hover:underline" onClick={() => { setEditing({ ...po }); setIsNew(false); }}>
                        {po.customer || "Tanpa nama"}
                      </button>
                      {po.note && <p className="max-w-40 truncate text-[11px] text-ink-faint">{po.note}</p>}
                    </td>
                    <td className="px-4 py-3 text-ink-secondary">{po.product} × {po.qty}</td>
                    <td className="px-4 py-3 text-right tabular">{formatCurrency(value)}</td>
                    <td className="px-4 py-3 text-right tabular">{formatCurrency(remaining)}</td>
                    <td className="px-4 py-3">
                      <span className={isLate ? "font-semibold text-danger" : "text-ink-secondary"}>{formatDate(po.deadline)}</span>
                    </td>
                    <td className="px-4 py-3">
                      <Badge tone={st.tone}>{st.label}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-0.5">
                        {po.status !== "cancelled" && po.status !== "completed" && (
                          <Button size="sm" variant="secondary" onClick={() => advanceStatus(po)} title={nextStatusLabel(po.status)}>
                            {nextStatusLabel(po.status)}
                          </Button>
                        )}
                        <IconButton label="Hapus" className="hover:text-danger" onClick={() => setConfirmDelete(po)}>
                          <Icon name="trash" className="size-4" />
                        </IconButton>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <OrderModal
        po={editing}
        isNew={isNew}
        onClose={() => setEditing(null)}
        onSave={(po) => {
          saveOrder(po);
          setEditing(null);
        }}
        onStatusChange={(po, status) => {
          changeStatus(po, status);
          setEditing({ ...po, status });
        }}
      />

      <ConfirmDialog
        open={confirmDelete !== null}
        title="Hapus pre-order?"
        description={`PO untuk ${confirmDelete?.customer || "customer tanpa nama"} akan dihapus permanen dan tidak bisa dikembalikan.`}
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

function matchesTab(status: POStatus, tab: string): boolean {
  switch (tab) {
    case "baru": return status === "new";
    case "dp": return status === "dp";
    case "produksi": return status === "production" || status === "ready";
    case "siap": return status === "ready";
    case "lunas": return status === "paid";
    case "dikirim": return status === "shipped";
    case "selesai": return status === "completed";
    case "batal": return status === "cancelled";
    default: return true;
  }
}

function countBy(orders: PO[], status: POStatus): number {
  return orders.filter((o) => o.status === status).length;
}

function nextStatusLabel(s: POStatus): string {
  const idx = STATUS_FLOW.indexOf(s);
  if (idx < 0 || idx >= STATUS_FLOW.length - 1) return "";
  return STATUSES.find((x) => x.key === STATUS_FLOW[idx + 1])?.label ?? "";
}

function OrderModal({
  po,
  isNew,
  onClose,
  onSave,
  onStatusChange,
}: {
  po: PO | null;
  isNew: boolean;
  onClose: () => void;
  onSave: (po: PO) => void;
  onStatusChange: (po: PO, status: POStatus) => void;
}) {
  const [draft, setDraft] = useState<PO | null>(po);

  const [prevPo, setPrevPo] = useState(po);
  if (po !== prevPo) {
    setPrevPo(po);
    setDraft(po);
  }

  if (!draft) return null;
  const patch = (p: Partial<PO>) => setDraft((d) => (d ? { ...d, ...p } : d));
  const value = money(draft.qty * draft.price);
  const validation: string[] = [];
  if (!draft.customer.trim()) validation.push("Nama customer wajib diisi.");
  if (!draft.product.trim()) validation.push("Nama produk wajib diisi.");
  if (!Number.isFinite(draft.qty) || draft.qty <= 0) validation.push("Qty harus lebih dari 0.");
  if (!Number.isFinite(draft.price) || draft.price < 0) validation.push("Harga tidak boleh negatif.");
  if (!Number.isFinite(draft.dp) || draft.dp < 0) validation.push("DP tidak boleh negatif.");
  if (draft.dp > value) validation.push("DP tidak boleh melebihi total nilai.");

  return (
    <Modal open onClose={onClose} title={isNew ? "Order Baru" : `Edit Order - ${draft.customer || "Tanpa nama"}`} width="max-w-2xl">
      {validation.length > 0 && (
        <div className="mb-3 rounded-md border border-danger/30 bg-danger-soft px-3 py-2 text-[13px] text-danger">
          {validation.join(" ")}
        </div>
      )}
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Customer" required>
          <Input value={draft.customer} onChange={(e) => patch({ customer: e.target.value })} placeholder="Nama customer / WhatsApp" />
        </Field>
        <Field label="Produk" required>
          <Input value={draft.product} onChange={(e) => patch({ product: e.target.value })} placeholder="cth. Kaos Polos" />
        </Field>
        <Field label="Qty">
          <Input type="number" min={1} value={draft.qty || ""} onChange={(e) => patch({ qty: Math.max(0, Number(e.target.value)) })} />
        </Field>
        <Field label="Harga / unit">
          <MoneyInput value={draft.price} onChange={(v) => patch({ price: v })} />
        </Field>
        <Field label="DP (uang muka)">
          <MoneyInput value={draft.dp} onChange={(v) => patch({ dp: v })} />
        </Field>
        <Field label="Deadline">
          <Input type="date" value={draft.deadline} onChange={(e) => patch({ deadline: e.target.value })} />
        </Field>
        <Field label="Status" className="sm:col-span-2">
          <div className="flex flex-wrap gap-1.5">
            {STATUSES.map((s) => (
              <button
                key={s.key}
                onClick={() => onStatusChange(draft, s.key)}
                className={`rounded-full border px-3 py-1.5 text-[12px] font-medium transition-colors ${
                  draft.status === s.key
                    ? "border-accent bg-accent-soft text-accent-ink"
                    : "border-border bg-surface text-ink-secondary hover:text-ink"
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </Field>
        <Field label="Catatan" className="sm:col-span-2">
          <Textarea value={draft.note} onChange={(e) => patch({ note: e.target.value })} placeholder="Catatan produksi / pengiriman" />
        </Field>
      </div>
      <div className="mt-4 flex items-center justify-between">
        <p className="text-sm text-ink-secondary">
          Nilai <strong className="tabular text-ink">{formatCurrency(value)}</strong> · Sisa{" "}
          <strong className="tabular text-ink">{formatCurrency(Math.max(0, value - draft.dp))}</strong>
        </p>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={onClose}>Tutup</Button>
          <Button onClick={() => onSave(draft)} disabled={validation.length > 0}>Simpan Order</Button>
        </div>
      </div>
    </Modal>
  );
}