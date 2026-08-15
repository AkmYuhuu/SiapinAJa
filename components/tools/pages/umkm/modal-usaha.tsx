"use client";

import { useMemo, useState } from "react";
import { CalcWorkspace, MainResult, ProjectActions } from "@/components/tools/tool-shell";
import { useProject } from "@/components/tools/use-project";
import { Field, Input, MoneyInput, Select } from "@/components/ui/fields";
import { Button, IconButton } from "@/components/ui/button";
import { Icon } from "@/components/icons";
import { Divider, StatBlock, SectionTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty";
import { formatCurrency } from "@/lib/format";
import { moneySum } from "@/lib/money";
import { useToast } from "@/components/ui/toast";

const TOOL_ID = "business-capital";

function uid(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function exportFilename(): string {
  return `modal-usaha-${Date.now().toString(36)}.pdf`;
}

interface CostItem {
  id: string;
  name: string;
  price: number;
}

interface ModalUsahaData {
  businessName: string;
  category: string;
  items: Record<string, CostItem[]>;
}

const CATEGORIES: { id: string; label: string; group: "equipment" | "bahan" | "operasional" | "dana" }[] = [
  { id: "equipment", label: "Equipment & Peralatan", group: "equipment" },
  { id: "bahan-awal", label: "Bahan Awal", group: "bahan" },
  { id: "packaging", label: "Packaging", group: "bahan" },
  { id: "sewa", label: "Sewa", group: "operasional" },
  { id: "branding", label: "Branding", group: "operasional" },
  { id: "legal-admin", label: "Legal / Admin", group: "operasional" },
  { id: "marketing", label: "Marketing", group: "operasional" },
  { id: "deposit", label: "Deposit", group: "operasional" },
  { id: "dana-cadangan", label: "Dana Cadangan", group: "dana" },
  { id: "biaya-lain", label: "Biaya Lain", group: "operasional" },
];

interface PresetItem {
  category: string;
  name: string;
  price: number;
}

const PRESETS: Record<string, { label: string; items: PresetItem[] }> = {
  makanan: {
    label: "Makanan",
    items: [
      { category: "equipment", name: "Kompor & tabung", price: 500000 },
      { category: "equipment", name: "Alat masak", price: 400000 },
      { category: "equipment", name: "Timbangan digital", price: 150000 },
      { category: "bahan-awal", name: "Bahan baku awal", price: 1000000 },
      { category: "bahan-awal", name: "Bumbu dapur", price: 200000 },
      { category: "packaging", name: "Kemasan pouch / box", price: 300000 },
      { category: "packaging", name: "Label kemasan", price: 100000 },
      { category: "sewa", name: "Sewa tempat", price: 1000000 },
      { category: "branding", name: "Desain logo & banner", price: 300000 },
      { category: "legal-admin", name: "Perizinan PIRT", price: 500000 },
      { category: "marketing", name: "Foto produk & iklan", price: 400000 },
      { category: "deposit", name: "Deposit listrik", price: 300000 },
      { category: "dana-cadangan", name: "Dana cadangan", price: 1000000 },
      { category: "biaya-lain", name: "Biaya transport", price: 200000 },
    ],
  },
  "coffee-booth": {
    label: "Coffee Booth",
    items: [
      { category: "equipment", name: "Mesin espresso", price: 8000000 },
      { category: "equipment", name: "Grinder & timbangan", price: 2500000 },
      { category: "equipment", name: "Booth / meja", price: 2000000 },
      { category: "bahan-awal", name: "Biji kopi awal", price: 700000 },
      { category: "bahan-awal", name: "Susu & sirup", price: 500000 },
      { category: "packaging", name: "Cup, tutup & sedotan", price: 400000 },
      { category: "sewa", name: "Sewa tempat booth", price: 1500000 },
      { category: "branding", name: "Desain banner & menu", price: 350000 },
      { category: "legal-admin", name: "Izin usaha", price: 400000 },
      { category: "marketing", name: "Promosi awal", price: 500000 },
      { category: "deposit", name: "Deposit tempat", price: 500000 },
      { category: "dana-cadangan", name: "Dana cadangan", price: 1500000 },
      { category: "biaya-lain", name: "Listrik & air", price: 300000 },
    ],
  },
  laundry: {
    label: "Laundry",
    items: [
      { category: "equipment", name: "Mesin cuci", price: 3000000 },
      { category: "equipment", name: "Mesin pengering", price: 4000000 },
      { category: "equipment", name: "Setrika uap & meja", price: 1500000 },
      { category: "bahan-awal", name: "Deterjen & pewangi", price: 400000 },
      { category: "packaging", name: "Plastik kemasan", price: 150000 },
      { category: "packaging", name: "Hanger", price: 100000 },
      { category: "sewa", name: "Sewa tempat", price: 1200000 },
      { category: "branding", name: "Papan nama", price: 250000 },
      { category: "legal-admin", name: "Izin usaha", price: 350000 },
      { category: "marketing", name: "Brosur & promosi", price: 300000 },
      { category: "deposit", name: "Deposit air", price: 200000 },
      { category: "dana-cadangan", name: "Dana cadangan", price: 1000000 },
      { category: "biaya-lain", name: "Listrik & air", price: 500000 },
    ],
  },
  thrift: {
    label: "Thrift",
    items: [
      { category: "equipment", name: "Rak pakaian", price: 1500000 },
      { category: "equipment", name: "Hanger rack", price: 600000 },
      { category: "equipment", name: "Cermin & lampu", price: 500000 },
      { category: "bahan-awal", name: "Stok pakaian awal", price: 3000000 },
      { category: "packaging", name: "Plastik packaging", price: 150000 },
      { category: "packaging", name: "Label harga", price: 50000 },
      { category: "sewa", name: "Sewa ruko / booth", price: 1500000 },
      { category: "branding", name: "Logo & banner", price: 350000 },
      { category: "legal-admin", name: "Izin usaha", price: 400000 },
      { category: "marketing", name: "Foto katalog & iklan", price: 500000 },
      { category: "deposit", name: "Deposit sewa", price: 500000 },
      { category: "dana-cadangan", name: "Dana cadangan", price: 1000000 },
      { category: "biaya-lain", name: "Transport restock", price: 300000 },
    ],
  },
  barbershop: {
    label: "Barbershop",
    items: [
      { category: "equipment", name: "Kursi barber", price: 2500000 },
      { category: "equipment", name: "Clipper & gunting set", price: 1500000 },
      { category: "equipment", name: "Cermin & lampu", price: 800000 },
      { category: "bahan-awal", name: "Pony & handuk", price: 500000 },
      { category: "bahan-awal", name: "Pomade & minyak", price: 300000 },
      { category: "packaging", name: "Tisu & disposables", price: 150000 },
      { category: "sewa", name: "Sewa tempat", price: 1500000 },
      { category: "branding", name: "Papan nama & signage", price: 400000 },
      { category: "legal-admin", name: "Izin usaha", price: 400000 },
      { category: "marketing", name: "Promosi awal", price: 350000 },
      { category: "deposit", name: "Deposit listrik", price: 250000 },
      { category: "dana-cadangan", name: "Dana cadangan", price: 1000000 },
      { category: "biaya-lain", name: "Alat pembersih", price: 200000 },
    ],
  },
  "online-shop": {
    label: "Online Shop",
    items: [
      { category: "equipment", name: "Handphone / kamera", price: 2500000 },
      { category: "equipment", name: "Timbangan", price: 200000 },
      { category: "equipment", name: "Rak penyimpanan", price: 800000 },
      { category: "bahan-awal", name: "Stok produk awal", price: 3000000 },
      { category: "packaging", name: "Kardus & bubble wrap", price: 400000 },
      { category: "packaging", name: "Stiker logo & label", price: 200000 },
      { category: "sewa", name: "Sewa gudang / garasi", price: 800000 },
      { category: "branding", name: "Desain logo", price: 300000 },
      { category: "legal-admin", name: "NIB / izin", price: 300000 },
      { category: "marketing", name: "Iklan marketplace", price: 600000 },
      { category: "marketing", name: "Foto produk", price: 400000 },
      { category: "deposit", name: "Deposit gudang", price: 500000 },
      { category: "dana-cadangan", name: "Dana cadangan", price: 1500000 },
      { category: "biaya-lain", name: "Listrik & internet", price: 400000 },
    ],
  },
  custom: { label: "Manual / Custom", items: [] },
};

function buildPresetItems(cat: string): Record<string, CostItem[]> {
  const items: Record<string, CostItem[]> = {};
  for (const c of CATEGORIES) items[c.id] = [];
  for (const it of PRESETS[cat]?.items ?? []) {
    items[it.category] = [...(items[it.category] ?? []), { id: uid(), name: it.name, price: it.price }];
  }
  return items;
}

function toNum(v: unknown, fallback = 0): number {
  return typeof v === "number" && Number.isFinite(v) ? v : fallback;
}

const initialData: ModalUsahaData = {
  businessName: "",
  category: "makanan",
  items: buildPresetItems("makanan"),
};

export default function ModalUsahaTool() {
  const { toast } = useToast();
  const [data, setData] = useState<ModalUsahaData>(initialData);
  const project = useProject({ toolId: TOOL_ID, getData: () => data });

  const [loadedId, setLoadedId] = useState<string | null>(null);
  const current = project.current;
  if (current && current.id !== loadedId) {
    setLoadedId(current.id);
    const d = current.data as ModalUsahaData | null;
    if (d && typeof d === "object") {
      const items: Record<string, CostItem[]> = {};
      for (const c of CATEGORIES) {
        const list = (d.items as Record<string, unknown[]> | undefined)?.[c.id];
        items[c.id] = Array.isArray(list)
          ? list
              .filter((x) => x && typeof x === "object")
              .map((x) => {
                const it = x as CostItem;
                return {
                  id: typeof it.id === "string" ? it.id : uid(),
                  name: typeof it.name === "string" ? it.name : "",
                  price: toNum(it.price),
                };
              })
          : [];
      }
      setData({
        businessName: typeof d.businessName === "string" ? d.businessName : "",
        category: typeof d.category === "string" && PRESETS[d.category] ? d.category : "custom",
        items,
      });
    }
  }

  const set = (patch: Partial<ModalUsahaData>) => setData((d) => ({ ...d, ...patch }));
  const setItem = (categoryId: string, itemId: string, patch: Partial<CostItem>) =>
    setData((d) => ({
      ...d,
      items: {
        ...d.items,
        [categoryId]: d.items[categoryId]?.map((it) => (it.id === itemId ? { ...it, ...patch } : it)) ?? [],
      },
    }));
  const addItem = (categoryId: string) =>
    setData((d) => ({
      ...d,
      items: { ...d.items, [categoryId]: [...(d.items[categoryId] ?? []), { id: uid(), name: "", price: 0 }] },
    }));
  const removeItem = (categoryId: string, itemId: string) =>
    setData((d) => ({
      ...d,
      items: { ...d.items, [categoryId]: (d.items[categoryId] ?? []).filter((it) => it.id !== itemId) },
    }));
  const applyPreset = (cat: string) => setData((d) => ({ ...d, category: cat, items: buildPresetItems(cat) }));

  const totals = useMemo(() => {
    const sumOf = (catIds: string[]) =>
      moneySum(catIds.flatMap((id) => (data.items[id] ?? []).map((it) => it.price)));
    const equipment = sumOf(["equipment"]);
    const bahan = sumOf(["bahan-awal", "packaging"]);
    const operasional = sumOf(["sewa", "branding", "legal-admin", "marketing", "deposit", "biaya-lain"]);
    const dana = sumOf(["dana-cadangan"]);
    const total = moneySum([equipment, bahan, operasional, dana]);
    const categoryTotals = CATEGORIES.map((c) => ({
      ...c,
      total: sumOf([c.id]),
    })).filter((c) => c.total > 0);
    return { equipment, bahan, operasional, dana, total, categoryTotals };
  }, [data.items]);

  const validation: string[] = [];
  for (const c of CATEGORIES) {
    for (const it of data.items[c.id] ?? []) {
      if (it.name && it.price < 0) validation.push(`Harga "${it.name}" tidak boleh negatif.`);
    }
  }
  const valid = validation.length === 0 && totals.total > 0;

  const exportPDF = async () => {
    try {
      const { jsPDF } = await import("jspdf");
      const doc = new jsPDF();
      const name = data.businessName.trim() || "Usaha Saya";
      doc.setFontSize(16);
      doc.setFont("helvetica", "bold");
      doc.text("Kalkulator Modal Usaha", 14, 20);
      doc.setFontSize(11);
      doc.setFont("helvetica", "normal");
      doc.text(`Usaha: ${name}`, 14, 30);
      doc.text(`Kategori: ${PRESETS[data.category]?.label ?? "Custom"}`, 14, 36);
      doc.text(`Tanggal: ${new Date().toLocaleDateString("id-ID")}`, 14, 42);
      doc.line(14, 47, 196, 47);
      const rows: [string, string][] = [
        ["Modal equipment & peralatan", rupiah(totals.equipment)],
        ["Modal bahan (bahan awal + packaging)", rupiah(totals.bahan)],
        ["Modal operasional", rupiah(totals.operasional)],
        ["Dana cadangan", rupiah(totals.dana)],
        ["Estimasi modal awal", rupiah(totals.total)],
      ];
      let y = 52;
      doc.setFont("helvetica", "bold");
      for (let i = 0; i < rows.length; i++) {
        if (i === rows.length - 1) {
          doc.setFillColor(235, 235, 235);
          doc.rect(14, y - 4, 182, 7, "F");
        }
        doc.text(rows[i][0], 14, y);
        doc.text(rows[i][1], 196, y, { align: "right" });
        y += 7;
      }
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.text("Rincian per kategori:", 14, y + 6);
      y += 12;
      for (const c of totals.categoryTotals) {
        if (y > 275) {
          doc.addPage();
          y = 20;
        }
        doc.setFont("helvetica", "bold");
        doc.text(c.label, 14, y);
        doc.setFont("helvetica", "normal");
        doc.text(rupiah(c.total), 196, y, { align: "right" });
        y += 5;
        for (const it of data.items[c.id] ?? []) {
          if (!it.name) continue;
          if (y > 285) {
            doc.addPage();
            y = 20;
          }
          doc.text(`- ${it.name}`, 18, y);
          doc.text(rupiah(it.price), 196, y, { align: "right" });
          y += 5;
        }
        y += 2;
      }
      doc.save(exportFilename());
      toast("PDF modal usaha siap diunduh.");
    } catch {
      toast("Gagal membuat PDF. Coba lagi.", "error");
    }
  };

  function rupiah(v: number) {
    return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(v);
  }

  return (
    <div className="space-y-4">
      <ProjectActions
        project={project}
        onSave={() => project.save()}
        onDuplicate={() => project.dupe()}
        onDelete={() => project.remove()}
        onExportJson={() => project.exportJson()}
        onImportFile={(f) => project.importJsonFile(f).then(() => {})}
        onNew={() => setData(initialData)}
      />

      <CalcWorkspace
        input={
          <>
            <section>
              <h2 className="text-[13px] font-semibold uppercase tracking-wide text-ink-secondary">Profil usaha</h2>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <Field label="Nama usaha">
                  <Input
                    value={data.businessName}
                    onChange={(e) => set({ businessName: e.target.value })}
                    placeholder="cth. Warung Nasi Bu Rina"
                  />
                </Field>
                <Field label="Kategori usaha" hint="Preset akan mengisi item biaya">
                  <Select value={data.category} onChange={(e) => applyPreset(e.target.value)}>
                    {Object.entries(PRESETS).map(([key, p]) => (
                      <option key={key} value={key}>
                        {p.label}
                      </option>
                    ))}
                  </Select>
                </Field>
              </div>
            </section>

            <Divider />

            <div className="flex items-center justify-between">
              <h2 className="text-[13px] font-semibold uppercase tracking-wide text-ink-secondary">Rincian biaya</h2>
              <span className="text-xs text-ink-faint">Ubah harga sesuai kebutuhan</span>
            </div>

            <div className="space-y-4">
              {CATEGORIES.map((c) => (
                <section key={c.id} className="rounded-lg border border-border bg-surface-muted/30 p-3">
                  <div className="flex items-center justify-between">
                    <SectionTitle>{c.label}</SectionTitle>
                    <span className="text-xs font-semibold tabular text-ink-secondary">
                      {formatCurrency(moneySum((data.items[c.id] ?? []).map((it) => it.price)))}
                    </span>
                  </div>
                  {(data.items[c.id] ?? []).length === 0 ? (
                    <p className="mt-2 text-xs text-ink-faint">Belum ada item.</p>
                  ) : (
                    <div className="mt-2 space-y-2">
                      {(data.items[c.id] ?? []).map((it) => (
                        <div key={it.id} className="flex items-center gap-2">
                          <div className="flex-1">
                            <Input
                              value={it.name}
                              onChange={(e) => setItem(c.id, it.id, { name: e.target.value })}
                              placeholder="Nama item"
                              aria-label={`Nama item ${c.label}`}
                            />
                          </div>
                          <div className="w-32 sm:w-40">
                            <MoneyInput
                              value={it.price}
                              onChange={(v) => setItem(c.id, it.id, { price: v })}
                              aria-label={`Harga ${c.label}`}
                            />
                          </div>
                          <IconButton
                            label="Hapus item"
                            className="hover:text-danger"
                            onClick={() => removeItem(c.id, it.id)}
                          >
                            <Icon name="trash" className="size-3.5" />
                          </IconButton>
                        </div>
                      ))}
                    </div>
                  )}
                  <Button
                    variant="secondary"
                    size="sm"
                    className="mt-2"
                    onClick={() => addItem(c.id)}
                  >
                    <Icon name="plus" className="size-3.5" />
                    Tambah item
                  </Button>
                </section>
              ))}
            </div>
          </>
        }
        result={
          <>
            {!valid ? (
              <EmptyState
                icon={<Icon name="scale" className="size-5" />}
                title={validation.length > 0 ? "Perbaiki dulu" : "Tambah item biaya"}
                description={
                  validation.length > 0
                    ? validation[0]
                    : "Isi rincian biaya di sisi kiri untuk menghitung estimasi modal awal."
                }
              />
            ) : (
              <>
                <MainResult
                  label="Estimasi modal awal"
                  value={formatCurrency(totals.total)}
                  valueSub={
                    data.businessName ? `Untuk ${data.businessName}` : "Total seluruh kategori biaya"
                  }
                  rows={[
                    { label: "Modal equipment & peralatan", value: formatCurrency(totals.equipment) },
                    { label: "Modal bahan (bahan awal + packaging)", value: formatCurrency(totals.bahan) },
                    { label: "Modal operasional", value: formatCurrency(totals.operasional) },
                    { label: "Dana cadangan", value: formatCurrency(totals.dana) },
                    { label: "Estimasi modal awal", value: formatCurrency(totals.total), strong: true },
                  ]}
                />

                <div className="grid grid-cols-2 gap-3">
                  <StatBlock label="Modal equipment" value={formatCurrency(totals.equipment)} accent />
                  <StatBlock label="Modal bahan" value={formatCurrency(totals.bahan)} accent />
                  <StatBlock label="Modal operasional" value={formatCurrency(totals.operasional)} accent />
                  <StatBlock label="Dana cadangan" value={formatCurrency(totals.dana)} accent />
                </div>

                <div className="rounded-lg border border-border bg-surface p-4">
                  <h2 className="text-[13px] font-semibold uppercase tracking-wide text-ink-secondary">
                    Rincian per kategori
                  </h2>
                  <div className="mt-2 overflow-x-auto">
                    <table className="w-full min-w-[380px] text-[13px]">
                      <tbody>
                        {totals.categoryTotals.map((c) => (
                          <tr key={c.id} className="border-b border-border last:border-0">
                            <td className="py-1.5 pr-2 font-medium text-ink">{c.label}</td>
                            <td className="py-1.5 text-right tabular text-ink-secondary">{formatCurrency(c.total)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Button variant="secondary" onClick={exportPDF}>
                    <Icon name="download" className="size-3.5" />
                    Export PDF
                  </Button>
                </div>
              </>
            )}
          </>
        }
      />
    </div>
  );
}