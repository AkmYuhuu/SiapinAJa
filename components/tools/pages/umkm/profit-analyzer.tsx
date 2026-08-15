"use client";

import { useMemo, useRef, useState } from "react";
import { CalcWorkspace, MainResult, ProjectActions, Note } from "@/components/tools/tool-shell";
import { useProject } from "@/components/tools/use-project";
import { Field, Input, MoneyInput, PercentInput } from "@/components/ui/fields";
import { Button, IconButton } from "@/components/ui/button";
import { Icon } from "@/components/icons";
import { Divider, StatBlock } from "@/components/ui/card";
import { SegmentedControl } from "@/components/ui/tabs";
import { EmptyState } from "@/components/ui/empty";
import { formatCurrency, todayISO } from "@/lib/format";
import { formatPercent, marginPct, markupPct, money, moneyMul, moneySum, pctOf } from "@/lib/money";
import { EXCEL_MAX_FILE_SIZE, downloadXlsx, downloadXlsxTemplate, importExcel } from "@/lib/excel";
import type { ExcelImportOutcome, ExcelSchema } from "@/lib/excel";
import { ExcelImportDialog } from "@/components/tools/excel-import-dialog";
import { useToast } from "@/components/ui/toast";

const TOOL_ID = "profit-analyzer";

function uid(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

interface Product {
  id: string;
  name: string;
  cost: number;
  price: number;
  packaging: number;
  feePct: number;
  adCost: number;
  otherCost: number;
  quantity: number;
}

interface ProfitAnalyzerData {
  mode: "single" | "multi";
  single: {
    productName: string;
    modal: number;
    hargaJual: number;
    packaging: number;
    feePct: number;
    iklan: number;
    biayaLain: number;
  };
  products: Product[];
}

function blankProduct(): Product {
  return {
    id: uid(),
    name: "",
    cost: 0,
    price: 0,
    packaging: 0,
    feePct: 0,
    adCost: 0,
    otherCost: 0,
    quantity: 1,
  };
}

const initialData: ProfitAnalyzerData = {
  mode: "single",
  single: {
    productName: "",
    modal: 0,
    hargaJual: 0,
    packaging: 0,
    feePct: 0,
    iklan: 0,
    biayaLain: 0,
  },
  products: [blankProduct()],
};

function toNum(v: unknown, fallback = 0): number {
  return typeof v === "number" && Number.isFinite(v) ? v : fallback;
}

const profitAnalyzerExcelSchema: ExcelSchema = {
  name: "profit-analyzer",
  title: "Profit Analyzer",
  columns: [
    { key: "product_name", required: true, aliases: ["product", "name", "produk", "nama", "nama produk", "nama_produk"], type: "string", label: "Nama Produk", desc: "Nama produk yang dijual.", example: "Kopi Arabica 250g", width: 24 },
    { key: "cost", required: true, aliases: ["modal", "harga modal", "harga_modal"], type: "number", min: 0, label: "Modal", desc: "Modal / harga pokok per unit (Rupiah).", example: 28000, width: 14 },
    { key: "selling_price", required: true, aliases: ["price", "selling", "harga", "harga jual", "harga_jual"], type: "number", min: 0, label: "Harga Jual", desc: "Harga jual per unit (Rupiah).", example: 50000, width: 14 },
    { key: "quantity", required: true, aliases: ["qty", "jumlah", "unit terjual", "unit_terjual"], type: "number", min: 1, defaultValue: 1, label: "Qty / Unit Terjual", desc: "Jumlah unit terjual.", example: 120, width: 12 },
    { key: "packaging", aliases: ["kemasan"], type: "number", min: 0, defaultValue: 0, label: "Packaging / Unit", desc: "Biaya kemasan per unit (Rupiah).", example: 2000, width: 14 },
    { key: "fee_percent", aliases: ["fee", "komisi", "fee marketplace", "fee_marketplace"], type: "percent", min: 0, defaultValue: 0, label: "Fee Marketplace (%)", desc: "Komisi marketplace dalam persen.", example: 8, width: 12 },
    { key: "ad_cost", aliases: ["advertising", "iklan", "biaya iklan", "biaya_iklan"], type: "number", min: 0, defaultValue: 0, label: "Biaya Iklan / Unit", desc: "Biaya iklan per unit (Rupiah).", example: 1000, width: 14 },
    { key: "other_cost", aliases: ["other", "biaya lain", "biaya_lain"], type: "number", min: 0, defaultValue: 0, label: "Biaya Lain / Unit", desc: "Biaya lain-lain per unit (Rupiah).", example: 0, width: 14 },
  ],
};

export default function ProfitAnalyzerTool() {
  const { toast } = useToast();
  const [data, setData] = useState<ProfitAnalyzerData>(initialData);
  const project = useProject({ toolId: TOOL_ID, getData: () => data });
  const excelRef = useRef<HTMLInputElement>(null);
  const [excelOutcome, setCsvOutcome] = useState<ExcelImportOutcome | null>(null);
  const [excelFileName, setCsvFileName] = useState("");

  const [loadedId, setLoadedId] = useState<string | null>(null);
  const current = project.current;
  if (current && current.id !== loadedId) {
    setLoadedId(current.id);
    const d = current.data as ProfitAnalyzerData | null;
    if (d && typeof d === "object") {
      setData({
        mode: d.mode === "multi" ? "multi" : "single",
        single: {
          productName: typeof d.single?.productName === "string" ? d.single.productName : "",
          modal: toNum(d.single?.modal),
          hargaJual: toNum(d.single?.hargaJual),
          packaging: toNum(d.single?.packaging),
          feePct: toNum(d.single?.feePct),
          iklan: toNum(d.single?.iklan),
          biayaLain: toNum(d.single?.biayaLain),
        },
        products: Array.isArray(d.products)
          ? d.products
              .filter((p: Product) => p && typeof p === "object")
              .map((p: Product) => ({
                id: typeof p.id === "string" ? p.id : uid(),
                name: typeof p.name === "string" ? p.name : "",
                cost: toNum(p.cost),
                price: toNum(p.price),
                packaging: toNum(p.packaging),
                feePct: toNum(p.feePct),
                adCost: toNum(p.adCost),
                otherCost: toNum(p.otherCost),
                quantity: Math.max(1, toNum(p.quantity, 1)),
              }))
          : [blankProduct()],
      });
    }
  }

  const set = (patch: Partial<ProfitAnalyzerData>) => setData((d) => ({ ...d, ...patch }));
  const setSingle = (patch: Partial<ProfitAnalyzerData["single"]>) =>
    setData((d) => ({ ...d, single: { ...d.single, ...patch } }));
  const setProduct = (id: string, patch: Partial<Product>) =>
    setData((d) => ({
      ...d,
      products: d.products.map((p) => (p.id === id ? { ...p, ...patch } : p)),
    }));

  const singleResult = useMemo(() => {
    const s = data.single;
    const fee = Math.max(0, Math.min(100, s.feePct));
    const totalCost = moneySum([
      s.modal,
      s.packaging,
      pctOf(s.hargaJual, fee),
      s.iklan,
      s.biayaLain,
    ]);
    const profit = money(s.hargaJual - totalCost);
    const margin = marginPct(totalCost, s.hargaJual);
    const markup = markupPct(totalCost, s.hargaJual);
    return { fee, totalCost, profit, margin, markup };
  }, [data.single]);

  const computed = useMemo(
    () =>
      data.products.map((p) => {
        const fee = Math.max(0, Math.min(100, p.feePct));
        const unitCost = moneySum([p.cost, p.packaging, pctOf(p.price, fee), p.adCost, p.otherCost]);
        const revenue = moneyMul(p.price, p.quantity);
        const totalCost = moneyMul(unitCost, p.quantity);
        const profit = money(revenue - totalCost);
        const margin = marginPct(unitCost, p.price);
        return { ...p, unitCost, revenue, totalCost, profit, margin };
      }),
    [data.products],
  );

  const dashboard = useMemo(() => {
    const ready = computed.filter((c) => c.price > 0);
    const totalProfit = moneySum(computed.map((c) => c.profit));
    const totalRevenue = moneySum(computed.map((c) => c.revenue));
    const totalCost = moneySum(computed.map((c) => c.totalCost));
    const avgMargin = ready.length
      ? ready.reduce((s, c) => s + c.margin, 0) / ready.length
      : 0;
    const mostProfit = [...ready].sort((a, b) => b.profit - a.profit)[0];
    const highestMargin = [...ready].sort((a, b) => b.margin - a.margin)[0];
    const lowestMargin = [...ready].sort((a, b) => a.margin - b.margin)[0];
    return { totalProfit, totalRevenue, totalCost, avgMargin, mostProfit, highestMargin, lowestMargin, ready: ready.length };
  }, [computed]);

  const singleValid =
    data.single.hargaJual > 0 &&
    data.single.modal >= 0 &&
    data.single.feePct < 100;
  const multiReady = computed.some((c) => c.price > 0);
  const multiValid = data.products.every((p) => !p.name || (p.cost >= 0 && p.feePct < 100)) && multiReady;

  const exportExcel = async () => {
    const rows = data.products
      .filter((p) => p.name.trim() || p.price > 0)
      .map((p) => ({
        product_name: p.name || "Produk",
        cost: p.cost,
        selling_price: p.price,
        quantity: p.quantity,
        packaging: p.packaging,
        fee_percent: p.feePct,
        ad_cost: p.adCost,
        other_cost: p.otherCost,
      }));
    if (rows.length === 0) {
      toast("Belum ada produk untuk diekspor.", "info");
      return;
    }
    try {
      await downloadXlsx(rows, profitAnalyzerExcelSchema, `profit-analyzer-${todayISO()}.xlsx`);
      toast("File Excel produk siap diunduh.");
    } catch {
      toast("Gagal membuat file Excel.", "error");
    }
  };

  const downloadTemplate = async () => {
    try {
      await downloadXlsxTemplate(profitAnalyzerExcelSchema, `template-profit-analyzer.xlsx`);
      toast("Template Excel siap diunduh.");
    } catch {
      toast("Gagal membuat template Excel.", "error");
    }
  };

  const handleExcelImport = async (file: File | undefined) => {
    if (!file) return;
    if (file.size > EXCEL_MAX_FILE_SIZE) {
      toast("File terlalu besar untuk satu import (maks 10 MB).", "error");
      return;
    }
    try {
      const outcome = await importExcel(file, profitAnalyzerExcelSchema);
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
    const products = excelOutcome.rows.map((r) => ({
      id: uid(),
      name: String(r.product_name ?? "").trim() || "Produk",
      cost: Number(r.cost ?? 0),
      price: Number(r.selling_price ?? 0),
      packaging: Number(r.packaging ?? 0),
      feePct: Number(r.fee_percent ?? 0),
      adCost: Number(r.ad_cost ?? 0),
      otherCost: Number(r.other_cost ?? 0),
      quantity: Math.max(1, Number(r.quantity ?? 1)),
    }));
    setData((d) => ({ ...d, mode: "multi", products: [...products, ...d.products] }));
    toast(`${products.length} produk berhasil diimpor.`);
    setCsvOutcome(null);
  };

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

      <SegmentedControl
        options={[
          { value: "single", label: "Satu Produk" },
          { value: "multi", label: "Banyak Produk" },
        ]}
        value={data.mode}
        onChange={(v) => set({ mode: v })}
      />

      {data.mode === "single" ? (
        <CalcWorkspace
          input={
            <>
              <section>
                <h2 className="text-[13px] font-semibold uppercase tracking-wide text-ink-secondary">Produk</h2>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <Field label="Nama produk">
                    <Input
                      value={data.single.productName}
                      onChange={(e) => setSingle({ productName: e.target.value })}
                      placeholder="cth. Keripik Kentang"
                    />
                  </Field>
                  <Field label="Harga jual" error={data.single.hargaJual < 0 ? "Tidak boleh negatif." : undefined}>
                    <MoneyInput value={data.single.hargaJual} onChange={(v) => setSingle({ hargaJual: v })} />
                  </Field>
                  <Field label="Modal / produk">
                    <MoneyInput value={data.single.modal} onChange={(v) => setSingle({ modal: v })} />
                  </Field>
                  <Field label="Packaging">
                    <MoneyInput value={data.single.packaging} onChange={(v) => setSingle({ packaging: v })} />
                  </Field>
                  <Field label="Fee marketplace (%)" error={data.single.feePct >= 100 ? "Fee harus kurang dari 100%." : undefined}>
                    <PercentInput value={data.single.feePct} onChange={(v) => setSingle({ feePct: v })} max={99} />
                  </Field>
                  <Field label="Biaya iklan">
                    <MoneyInput value={data.single.iklan} onChange={(v) => setSingle({ iklan: v })} />
                  </Field>
                  <Field label="Biaya lain" className="sm:col-span-2">
                    <MoneyInput value={data.single.biayaLain} onChange={(v) => setSingle({ biayaLain: v })} />
                  </Field>
                </div>
              </section>
            </>
          }
          result={
            <>
              {!singleValid ? (
                <EmptyState
                  icon={<Icon name="chart" className="size-5" />}
                  title="Masukkan harga jual dulu"
                  description="Isi harga jual dan modal agar profit, margin, dan markup bisa dihitung."
                />
              ) : (
                <>
                  <MainResult
                    label="Profit bersih"
                    value={formatCurrency(singleResult.profit)}
                    valueSub={
                      singleResult.profit >= 0 ? "Untung bersih setelah semua biaya" : "Rugi - biaya melebihi harga jual"
                    }
                    rows={[
                      { label: "Revenue", value: formatCurrency(data.single.hargaJual), strong: true },
                      { label: "Total biaya", value: formatCurrency(singleResult.totalCost), strong: true },
                      { label: "Modal", value: formatCurrency(data.single.modal) },
                      { label: "Packaging", value: formatCurrency(data.single.packaging) },
                      { label: `Fee ${singleResult.fee}%`, value: formatCurrency(pctOf(data.single.hargaJual, singleResult.fee)) },
                      { label: "Iklan", value: formatCurrency(data.single.iklan) },
                      { label: "Biaya lain", value: formatCurrency(data.single.biayaLain) },
                    ]}
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <StatBlock label="Margin" value={formatPercent(singleResult.margin)} accent={singleResult.margin > 0} />
                    <StatBlock label="Markup" value={formatPercent(singleResult.markup)} accent={singleResult.markup > 0} />
                  </div>
                  {singleResult.profit < 0 && (
                    <div className="flex items-start gap-2 rounded-md border border-warning/30 bg-warning-soft px-3 py-2.5 text-[13px] text-warning">
                      <Icon name="alert" className="mt-0.5 size-4 shrink-0" />
                      <p>Harga jual lebih rendah dari biaya total. Naikkan harga atau tekan biaya agar tidak rugi.</p>
                    </div>
                  )}
                </>
              )}
            </>
          }
        />
      ) : (
        <CalcWorkspace
          input={
            <>
              <div className="flex flex-wrap items-center gap-2">
                <Button size="sm" variant="secondary" onClick={() => setData((d) => ({ ...d, products: [...d.products, blankProduct()] }))}>
                  <Icon name="plus" className="size-3.5" />
                  Tambah Produk
                </Button>
                <Button size="sm" variant="secondary" onClick={downloadTemplate}>
                  <Icon name="download" className="size-3.5" />
                  Template Excel
                </Button>
                <Button size="sm" variant="secondary" onClick={() => excelRef.current?.click()}>
                  <Icon name="upload" className="size-3.5" />
                  Impor Excel
                </Button>
                <input
                  ref={excelRef}
                  type="file"
                  accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                  className="hidden"
                  onChange={(e) => handleExcelImport(e.target.files?.[0])}
                />
                <Button size="sm" variant="secondary" onClick={exportExcel}>
                  <Icon name="download" className="size-3.5" />
                  Ekspor Excel
                </Button>
              </div>

              <Note>Kolom wajib Excel: product_name, cost, selling_price, quantity. Opsional: packaging, fee_percent, ad_cost, other_cost.</Note>

              {data.products.length === 0 ? (
                <EmptyState
                  icon={<Icon name="chart" className="size-5" />}
                  title="Belum ada produk"
                  description="Tambah produk atau impor dari Excel untuk mulai menganalisis profit."
                  actionLabel="Tambah Produk"
                  onAction={() => setData((d) => ({ ...d, products: [blankProduct()] }))}
                  compact
                />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[880px] text-sm">
                    <thead>
                      <tr className="text-left text-[11px] uppercase tracking-wide text-ink-faint">
                        <th className="py-1.5 pr-2 font-semibold">Nama</th>
                        <th className="w-28 py-1.5 pr-2 text-right font-semibold">Modal</th>
                        <th className="w-28 py-1.5 pr-2 text-right font-semibold">Harga jual</th>
                        <th className="w-24 py-1.5 pr-2 text-right font-semibold">Packaging</th>
                        <th className="w-20 py-1.5 pr-2 text-right font-semibold">Fee %</th>
                        <th className="w-24 py-1.5 pr-2 text-right font-semibold">Iklan</th>
                        <th className="w-24 py-1.5 pr-2 text-right font-semibold">Biaya lain</th>
                        <th className="w-16 py-1.5 pr-2 text-right font-semibold">Qty</th>
                        <th className="w-10" />
                      </tr>
                    </thead>
                    <tbody>
                      {data.products.map((p) => (
                        <tr key={p.id} className="align-top">
                          <td className="py-1.5 pr-2">
                            <Input
                              value={p.name}
                              onChange={(e) => setProduct(p.id, { name: e.target.value })}
                              placeholder="cth. Kaos"
                              aria-label="Nama produk"
                            />
                          </td>
                          <td className="py-1.5 pr-2">
                            <MoneyInput value={p.cost} onChange={(v) => setProduct(p.id, { cost: v })} aria-label="Modal" />
                          </td>
                          <td className="py-1.5 pr-2">
                            <MoneyInput value={p.price} onChange={(v) => setProduct(p.id, { price: v })} aria-label="Harga jual" />
                          </td>
                          <td className="py-1.5 pr-2">
                            <MoneyInput value={p.packaging} onChange={(v) => setProduct(p.id, { packaging: v })} aria-label="Packaging" />
                          </td>
                          <td className="py-1.5 pr-2">
                            <PercentInput value={p.feePct} onChange={(v) => setProduct(p.id, { feePct: v })} max={99} aria-label="Fee marketplace" />
                          </td>
                          <td className="py-1.5 pr-2">
                            <MoneyInput value={p.adCost} onChange={(v) => setProduct(p.id, { adCost: v })} aria-label="Biaya iklan" />
                          </td>
                          <td className="py-1.5 pr-2">
                            <MoneyInput value={p.otherCost} onChange={(v) => setProduct(p.id, { otherCost: v })} aria-label="Biaya lain" />
                          </td>
                          <td className="py-1.5 pr-2">
                            <Input
                              type="number"
                              min={1}
                              value={p.quantity || ""}
                              onChange={(e) => setProduct(p.id, { quantity: Math.max(0, Number(e.target.value)) })}
                              className="text-right"
                              aria-label="Jumlah"
                            />
                          </td>
                          <td className="py-1.5">
                            <IconButton
                              label="Hapus produk"
                              className="hover:text-danger"
                              onClick={() =>
                                setData((d) =>
                                  d.products.length > 1
                                    ? { ...d, products: d.products.filter((x) => x.id !== p.id) }
                                    : d,
                                )
                              }
                            >
                              <Icon name="trash" className="size-3.5" />
                            </IconButton>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          }
          result={
            <>
              {!multiValid ? (
                <EmptyState
                  icon={<Icon name="chart" className="size-5" />}
                  title={data.products.length === 0 ? "Tambahkan produk" : "Lengkapi harga jual"}
                  description={
                    data.products.length === 0
                      ? "Tambahkan produk atau impor Excel untuk melihat ringkasan profit."
                      : "Isi harga jual minimal satu produk untuk mulai menganalisis."
                  }
                />
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
                    <StatBlock label="Total estimasi profit" value={formatCurrency(dashboard.totalProfit)} accent sub={`dari ${dashboard.ready} produk siap`} />
                    <StatBlock label="Margin rata-rata" value={formatPercent(dashboard.avgMargin)} accent />
                    <StatBlock label="Total revenue" value={formatCurrency(dashboard.totalRevenue)} />
                    <StatBlock label="Total biaya" value={formatCurrency(dashboard.totalCost)} />
                    <StatBlock
                      label="Paling profit"
                      value={dashboard.mostProfit ? dashboard.mostProfit.name || "Produk" : "-"}
                      sub={dashboard.mostProfit ? formatCurrency(dashboard.mostProfit.profit) : undefined}
                    />
                    <StatBlock
                      label="Margin tertinggi"
                      value={dashboard.highestMargin ? dashboard.highestMargin.name || "Produk" : "-"}
                      sub={dashboard.highestMargin ? formatPercent(dashboard.highestMargin.margin) : undefined}
                    />
                    <StatBlock
                      label="Margin terendah"
                      value={dashboard.lowestMargin ? dashboard.lowestMargin.name || "Produk" : "-"}
                      sub={dashboard.lowestMargin ? formatPercent(dashboard.lowestMargin.margin) : undefined}
                    />
                  </div>

                  <Divider />

                  <div className="rounded-lg border border-border bg-surface p-4">
                    <h2 className="text-[13px] font-semibold uppercase tracking-wide text-ink-secondary">Profit per produk</h2>
                    <div className="mt-2 overflow-x-auto">
                      <table className="w-full min-w-[420px] text-[13px]">
                        <thead>
                          <tr className="text-left text-[11px] uppercase tracking-wide text-ink-faint">
                            <th className="py-1.5 pr-2 font-semibold">Produk</th>
                            <th className="py-1.5 pr-2 text-right font-semibold">Revenue</th>
                            <th className="py-1.5 pr-2 text-right font-semibold">Biaya</th>
                            <th className="py-1.5 pr-2 text-right font-semibold">Profit</th>
                            <th className="py-1.5 text-right font-semibold">Margin</th>
                          </tr>
                        </thead>
                        <tbody>
                          {computed.map((c) => (
                            <tr key={c.id} className="border-b border-border last:border-0">
                              <td className="py-1.5 pr-2 font-medium text-ink">{c.name || "Produk"}</td>
                              <td className="py-1.5 pr-2 text-right tabular text-ink-secondary">{formatCurrency(c.revenue)}</td>
                              <td className="py-1.5 pr-2 text-right tabular text-ink-secondary">{formatCurrency(c.totalCost)}</td>
                              <td className={`py-1.5 pr-2 text-right tabular ${c.profit >= 0 ? "text-ink" : "text-danger"}`}>
                                {formatCurrency(c.profit)}
                              </td>
                              <td className="py-1.5 text-right tabular text-ink-secondary">{formatPercent(c.margin)}</td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr className="border-t-2 border-border">
                            <td className="py-2 pr-2 font-semibold text-ink">Total</td>
                            <td className="py-2 pr-2 text-right font-semibold tabular text-ink">{formatCurrency(dashboard.totalRevenue)}</td>
                            <td className="py-2 pr-2 text-right font-semibold tabular text-ink">{formatCurrency(dashboard.totalCost)}</td>
                            <td className={`py-2 pr-2 text-right font-semibold tabular ${dashboard.totalProfit >= 0 ? "text-ink" : "text-danger"}`}>
                              {formatCurrency(dashboard.totalProfit)}
                            </td>
                            <td />
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </div>
                </>
              )}
            </>
          }
        />
      )}

      <ExcelImportDialog
        open={excelOutcome !== null}
        fileName={excelFileName}
        outcome={excelOutcome}
        onCancel={() => setCsvOutcome(null)}
        onConfirm={confirmExcelImport}
        confirmLabel={excelOutcome ? `Import ${excelOutcome.validRows} Produk` : undefined}
      />
    </div>
  );
}