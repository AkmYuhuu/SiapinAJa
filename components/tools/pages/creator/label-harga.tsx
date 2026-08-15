"use client";

import { useMemo, useState } from "react";
import { Button, IconButton } from "@/components/ui/button";
import { Field, Input, MoneyInput, PercentInput, Select } from "@/components/ui/fields";
import { Divider, SectionTitle } from "@/components/ui/card";
import { EmptyState, ProgressBar } from "@/components/ui/empty";
import { Icon } from "@/components/icons";
import { formatCurrency } from "@/lib/format";
import { useToast } from "@/components/ui/toast";
import { useProject } from "@/components/tools/use-project";
import { ProjectActions } from "@/components/tools/tool-shell";
import { PrintMenu } from "@/components/documents/print-menu";
import { exportDocPagesPdf, getDocNodes } from "@/lib/documents/html-export";

const uid = () =>
  typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : Date.now().toString(36);

interface LabelProduct {
  id: string;
  name: string;
  sku: string;
  price: number;
  qty: number;
  discount: number;
}

interface LabelData {
  products: LabelProduct[];
  sizeId: string;
  layoutId: string;
}

const TEXT_LAYOUTS = [
  { id: "kiri", label: "Kiri" },
  { id: "tengah", label: "Tengah" },
  { id: "kanan", label: "Kanan" },
] as const;

type TextLayout = (typeof TEXT_LAYOUTS)[number]["id"];

const LABEL_SIZES = [
  { id: "40x25", label: "40 × 25 mm", w: 40, h: 25 },
  { id: "50x30", label: "50 × 30 mm", w: 50, h: 30 },
  { id: "60x40", label: "60 × 40 mm", w: 60, h: 40 },
  { id: "100x50", label: "100 × 50 mm", w: 100, h: 50 },
] as const;

type LabelSize = (typeof LABEL_SIZES)[number];

const MARGIN_X = 12;
const MARGIN_Y = 14;

const blankProduct = (): LabelProduct => ({ id: uid(), name: "", sku: "", price: 0, qty: 1, discount: 0 });

export default function LabelHargaTool() {
  const [products, setProducts] = useState<LabelProduct[]>([blankProduct()]);
  const [sizeId, setSizeId] = useState("50x30");
  const [layoutId, setLayoutId] = useState<TextLayout>("kanan");
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const { toast } = useToast();

  const project = useProject({
    toolId: "price-label",
    getData: () => ({ products, sizeId, layoutId }),
  });

  const [loadedId, setLoadedId] = useState<string | null>(null);
  const current = project.current;
  if (current && current.id !== loadedId) {
    setLoadedId(current.id);
    const data = current.data as LabelData | null | undefined;
    if (data) {
      if (Array.isArray(data.products)) {
        setProducts(data.products.map((p) => ({ ...blankProduct(), ...p, id: p.id || uid() })));
      }
      if (typeof data.sizeId === "string") setSizeId(data.sizeId);
      if (typeof data.layoutId === "string") setLayoutId(data.layoutId as TextLayout);
    }
  }

  const size = LABEL_SIZES.find((s) => s.id === sizeId) ?? LABEL_SIZES[1];

  const grid = useMemo(() => {
    const usableW = 210 - MARGIN_X * 2;
    const usableH = 297 - MARGIN_Y * 2;
    const cols = Math.max(1, Math.floor(usableW / size.w));
    const rows = Math.max(1, Math.floor(usableH / size.h));
    return { cols, rows, perPage: cols * rows };
  }, [size]);

  const cells = useMemo(() => {
    const out: LabelProduct[] = [];
    for (const p of products) {
      const qty = Math.max(1, Math.round(p.qty) || 1);
      for (let i = 0; i < qty; i++) out.push(p);
    }
    return out;
  }, [products]);

  const pages = useMemo(() => {
    const out: LabelProduct[][] = [];
    for (let i = 0; i < cells.length; i += grid.perPage) {
      out.push(cells.slice(i, i + grid.perPage));
    }
    return out;
  }, [cells, grid.perPage]);

  const updateProduct = (id: string, patch: Partial<LabelProduct>) =>
    setProducts((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)));

  const addProduct = () => setProducts((prev) => [...prev, blankProduct()]);

  const duplicateProduct = (id: string) =>
    setProducts((prev) => {
      const i = prev.findIndex((p) => p.id === id);
      if (i < 0) return prev;
      const copy = { ...prev[i], id: uid() };
      return [...prev.slice(0, i + 1), copy, ...prev.slice(i + 1)];
    });

  const removeProduct = (id: string) => setProducts((prev) => prev.filter((p) => p.id !== id));

  const clearProducts = () => setProducts([]);

  const handleNew = () => {
    setProducts([blankProduct()]);
    setSizeId("50x30");
    setLayoutId("kanan");
  };

  const exportPdf = async () => {
    const nodes = getDocNodes();
    if (nodes.length === 0) return;
    setBusy(true);
    setProgress(0);
    try {
      await exportDocPagesPdf(nodes, "siapinaja-label-harga");
      setProgress(100);
      toast("PDF siap diunduh.");
    } catch (e) {
      toast(e instanceof Error ? e.message : "PDF gagal dibuat. Coba lagi.", "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
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

      <div className="grid gap-6 xl:grid-cols-[minmax(0,6fr)_minmax(0,5fr)]">
        <section className="min-w-0 space-y-4 print-hide">
          <div className="rounded-lg border border-border bg-surface p-4">
            <div className="flex flex-wrap items-end gap-3">
              <div className="space-y-2">
                <Field label="Ukuran label">
                  <Select value={sizeId} onChange={(e) => setSizeId(e.target.value)} className="w-44">
                    {LABEL_SIZES.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.label}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label="Tata Letak Teks">
                  <Select value={layoutId} onChange={(e) => setLayoutId(e.target.value as TextLayout)} className="w-44">
                    {TEXT_LAYOUTS.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.label}
                      </option>
                    ))}
                  </Select>
                </Field>
              </div>
              <Field label="Informasi">
                <p className="flex h-9 items-center text-[13px] text-ink-secondary">
                  {grid.perPage} label per lembar A4 · {pages.length} lembar
                </p>
              </Field>
              <span className="flex-1" />
              <Button variant="secondary" size="sm" onClick={addProduct}>
                <Icon name="plus" className="size-3.5" />
                Tambah Produk
              </Button>
              {products.length > 0 && (
                <Button variant="ghost" size="sm" onClick={clearProducts}>
                  <Icon name="trash" className="size-3.5" />
                  Bersihkan
                </Button>
              )}
            </div>

            <Divider className="my-4" />

            <SectionTitle className="mb-2">Daftar Produk</SectionTitle>
            <div className="overflow-x-auto">
              <div className="min-w-[680px] space-y-2">
                <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,0.6fr)_130px_70px_80px_auto] items-center gap-2 px-1 text-[11px] font-semibold uppercase tracking-wide text-ink-faint">
                  <span>Produk</span>
                  <span>SKU</span>
                  <span>Harga</span>
                  <span>Qty</span>
                  <span>Diskon</span>
                  <span />
                </div>
                {products.length === 0 ? (
                  <p className="px-1 py-2 text-[13px] text-ink-faint">
                    Belum ada produk. Klik &quot;Tambah Produk&quot; untuk memulai.
                  </p>
                ) : (
                  products.map((p) => (
                    <div
                      key={p.id}
                      className="grid grid-cols-[minmax(0,1fr)_minmax(0,0.6fr)_130px_70px_80px_auto] items-center gap-2 rounded-md border border-border bg-surface-muted/60 p-1.5"
                    >
                      <Input
                        value={p.name}
                        onChange={(e) => updateProduct(p.id, { name: e.target.value })}
                        placeholder="Nama produk"
                        aria-label="Nama produk"
                      />
                      <Input
                        value={p.sku}
                        onChange={(e) => updateProduct(p.id, { sku: e.target.value })}
                        placeholder="SKU"
                        aria-label="SKU"
                      />
                      <MoneyInput
                        value={p.price}
                        onChange={(v) => updateProduct(p.id, { price: v })}
                        aria-label="Harga"
                      />
                      <Input
                        type="number"
                        min={1}
                        value={p.qty}
                        onChange={(e) => {
                          const n = Math.round(Number(e.target.value));
                          updateProduct(p.id, { qty: Number.isFinite(n) && n > 0 ? n : 1 });
                        }}
                        aria-label="Jumlah label per produk"
                      />
                      <PercentInput
                        value={p.discount}
                        onChange={(v) => updateProduct(p.id, { discount: v })}
                        aria-label="Diskon"
                      />
                      <div className="flex items-center gap-0.5">
                        <IconButton label="Salin produk" onClick={() => duplicateProduct(p.id)}>
                          <Icon name="copy" className="size-4" />
                        </IconButton>
                        <IconButton label="Hapus produk" onClick={() => removeProduct(p.id)}>
                          <Icon name="trash" className="size-4" />
                        </IconButton>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </section>

        <section className="print-area xl:sticky xl:top-20 xl:self-start min-w-0 space-y-3">
          <div className="flex flex-wrap items-center gap-2 print-hide">
            <Button size="sm" onClick={exportPdf} disabled={cells.length === 0 || busy}>
              <Icon name="download" className="size-3.5" />
              Unduh PDF
            </Button>
            <PrintMenu disabled={cells.length === 0} nota={false} />
            {busy && <ProgressBar value={progress} className="w-40" />}
          </div>

          <div className="overflow-x-auto">
            {pages.length === 0 ? (
              <EmptyState
                icon={<Icon name="tag" className="size-5" />}
                title="Belum ada produk"
                description="Tambahkan produk di panel kiri, lalu lihat pratinjau sheet A4 di sini."
              />
            ) : (
              <div className="min-w-[794px] space-y-6">
                {pages.map((pageCells, pi) => (
                  <div key={pi} className="space-y-1.5">
                    <p className="text-[11px] text-ink-faint print-hide">
                      Halaman {pi + 1} · {pageCells.length} label
                    </p>
                    <div className="doc-page relative border border-border shadow-[0_8px_24px_rgba(43,40,35,0.08)]">
                      {pageCells.map((p, i) => (
                        <LabelCell
                          key={p.id + i}
                          p={p}
                          size={size}
                          layout={layoutId}
                          col={i % grid.cols}
                          row={Math.floor(i / grid.cols)}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

function LabelCell({
  p,
  size,
  layout,
  col,
  row,
}: {
  p: LabelProduct;
  size: LabelSize;
  layout: TextLayout;
  col: number;
  row: number;
}) {
  const pricePx = size.w >= 100 ? 30 : size.w >= 60 ? 22 : size.w >= 50 ? 18 : 14;
  const namePx = size.w >= 100 ? 16 : size.w >= 60 ? 12 : size.w >= 50 ? 10 : 8.5;
  const smallPx = Math.max(6.5, pricePx * 0.42);
  const align = layout === "tengah" ? "text-center" : layout === "kanan" ? "text-right" : "text-left";
  const selfAlign = layout === "tengah" ? "self-center" : layout === "kanan" ? "self-end" : "self-start";
  return (
    <div
      className="absolute overflow-hidden border border-dashed border-[#cfcac0] px-[2mm] py-[1mm]"
      style={{
        left: `${MARGIN_X + col * size.w}mm`,
        top: `${MARGIN_Y + row * size.h}mm`,
        width: `${size.w}mm`,
        height: `${size.h}mm`,
      }}
    >
      <div className={`flex h-full flex-col justify-between ${align}`}>
        <div className="min-w-0">
          {p.name && (
            <p className="line-clamp-2 font-semibold leading-tight text-[#2b2823]" style={{ fontSize: namePx }}>
              {p.name}
            </p>
          )}
          {p.sku && (
            <p className="truncate text-[#6f6a5e]" style={{ fontSize: smallPx }}>
              {p.sku}
            </p>
          )}
          {p.discount > 0 && (
            <span className={`mt-0.5 inline-block rounded bg-[#fbeae7] px-1 leading-tight text-[#bf3e30] ${selfAlign}`} style={{ fontSize: smallPx }}>
              Diskon {Math.round(p.discount)}%
            </span>
          )}
        </div>
        <p className="truncate font-bold text-[#e8620c]" style={{ fontSize: pricePx }}>
          {formatCurrency(p.price)}
        </p>
      </div>
    </div>
  );
}