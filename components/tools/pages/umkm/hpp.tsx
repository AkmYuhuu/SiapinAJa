"use client";

// HPP Makanan - calculator (spec §8.1). Reference implementation for
// the calculator interaction model: form left, results right, project
// lifecycle via useProject.

import { useMemo, useState } from "react";
import { CalcWorkspace, MainResult, ProjectActions, Note } from "@/components/tools/tool-shell";
import { useProject } from "@/components/tools/use-project";
import { Field, Input, MoneyInput, Textarea } from "@/components/ui/fields";
import { Button, IconButton } from "@/components/ui/button";
import { Icon } from "@/components/icons";
import { Divider } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty";
import { formatCurrency } from "@/lib/format";
import { moneyDiv, moneyMul, moneySum } from "@/lib/money";

interface Ingredient {
  id: string;
  name: string;
  buyPrice: number;
  buyQty: number;
  unit: string;
  usedQty: number;
}

interface OtherCosts {
  packaging: number;
  gas: number;
  electricity: number;
  labor: number;
  extra: number;
}

interface HppData {
  productName: string;
  batchQty: number;
  ingredients: Ingredient[];
  other: OtherCosts;
  wastePct: number;
  note: string;
}

const TOOL_ID = "hpp";

function blankIngredient(): Ingredient {
  return { id: crypto.randomUUID(), name: "", buyPrice: 0, buyQty: 1, unit: "gram", usedQty: 0 };
}

const initialData: HppData = {
  productName: "",
  batchQty: 1,
  ingredients: [blankIngredient()],
  other: { packaging: 0, gas: 0, electricity: 0, labor: 0, extra: 0 },
  wastePct: 0,
  note: "",
};

export default function HppTool() {
  const [data, setData] = useState<HppData>(initialData);
  const project = useProject({ toolId: TOOL_ID, getData: () => data });

  // apply loaded/imported project data
  const [loadedId, setLoadedId] = useState<string | null>(null);
  const current = project.current;
  if (current && current.id !== loadedId) {
    setLoadedId(current.id);
    const d = current.data as HppData | null;
    if (d && typeof d === "object" && Array.isArray(d.ingredients)) {
      setData({
        ...initialData,
        ...d,
        ingredients: d.ingredients.filter((i: Ingredient) => i && typeof i === "object"),
        other: { ...initialData.other, ...(d.other ?? {}) },
      });
    }
  }

  const set = (patch: Partial<HppData>) => setData((d) => ({ ...d, ...patch }));
  const setIngredient = (id: string, patch: Partial<Ingredient>) =>
    setData((d) => ({
      ...d,
      ingredients: d.ingredients.map((i) => (i.id === id ? { ...i, ...patch } : i)),
    }));

  // calculation (spec §8.1 logic)
  const result = useMemo(() => {
    const materials = data.ingredients.map((i) => {
      const costPerUnit = moneyDiv(i.buyPrice, i.buyQty > 0 ? i.buyQty : 1);
      const costUsed = i.usedQty > 0 ? moneyMul(costPerUnit, i.usedQty) : 0;
      return { ...i, costPerUnit, costUsed };
    });
    const totalMaterials = moneySum(materials.map((m) => m.costUsed));
    const other = data.other;
    const totalBatch = moneySum([totalMaterials, other.packaging, other.gas, other.electricity, other.labor, other.extra]);
    const wasteFactor = 1 + (data.wastePct > 0 ? data.wastePct / 100 : 0);
    const perUnit = data.batchQty > 0 ? moneyDiv(totalBatch * wasteFactor, data.batchQty) : 0;
    const margins = [20, 30, 40, 50].map((m) => ({
      margin: m,
      price: perUnit > 0 ? Math.ceil((perUnit * 100) / (100 - m)) : 0,
      profit: perUnit > 0 ? Math.ceil((perUnit * 100) / (100 - m)) - perUnit : 0,
    }));
    return { materials, totalMaterials, totalBatch, perUnit, margins, wasteFactor };
  }, [data]);

  const validation: string[] = [];
  if (data.batchQty <= 0) validation.push("Jumlah hasil produksi harus lebih dari 0.");
  if (data.ingredients.some((i) => i.name && i.buyPrice < 0)) validation.push("Harga beli tidak boleh negatif.");
  if (data.ingredients.some((i) => i.name && i.buyQty <= 0)) validation.push("Ukuran pembelian harus lebih dari 0.");
  if (data.ingredients.some((i) => i.name && i.usedQty <= 0)) validation.push("Jumlah yang digunakan harus lebih dari 0.");
  const valid = validation.length === 0 && data.productName.trim().length > 0;

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
              <h2 className="text-[13px] font-semibold uppercase tracking-wide text-ink-secondary">Produk</h2>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <Field label="Nama produk">
                  <Input
                    value={data.productName}
                    onChange={(e) => set({ productName: e.target.value })}
                    placeholder="cth. Ayam Geprek"
                  />
                </Field>
                <Field label="Jumlah hasil produksi" hint="Porsi atau unit per batch">
                  <Input
                    type="number"
                    min={1}
                    value={data.batchQty || ""}
                    onChange={(e) => set({ batchQty: Math.max(0, Number(e.target.value)) })}
                  />
                </Field>
              </div>
            </section>

            <Divider />

            <section>
              <h2 className="text-[13px] font-semibold uppercase tracking-wide text-ink-secondary">Bahan</h2>
              <div className="mt-2 overflow-x-auto">
                <table className="w-full min-w-[560px] text-sm">
                  <thead>
                    <tr className="text-left text-[11px] uppercase tracking-wide text-ink-faint">
                      <th className="py-1.5 pr-2 font-semibold">Nama</th>
                      <th className="w-28 py-1.5 pr-2 text-right font-semibold">Harga beli</th>
                      <th className="w-20 py-1.5 pr-2 text-right font-semibold">Ukuran</th>
                      <th className="w-24 py-1.5 pr-2 font-semibold">Unit</th>
                      <th className="w-24 py-1.5 pr-2 text-right font-semibold">Dipakai</th>
                      <th className="w-10" />
                    </tr>
                  </thead>
                  <tbody>
                    {data.ingredients.map((i) => (
                      <tr key={i.id} className="align-top">
                        <td className="py-1.5 pr-2">
                          <Input
                            value={i.name}
                            onChange={(e) => setIngredient(i.id, { name: e.target.value })}
                            placeholder="cth. Tepung"
                            aria-label="Nama bahan"
                          />
                        </td>
                        <td className="py-1.5 pr-2">
                          <MoneyInput value={i.buyPrice} onChange={(v) => setIngredient(i.id, { buyPrice: v })} aria-label="Harga beli" />
                        </td>
                        <td className="py-1.5 pr-2">
                          <Input
                            type="number"
                            min={0}
                            value={i.buyQty || ""}
                            onChange={(e) => setIngredient(i.id, { buyQty: Number(e.target.value) })}
                            className="text-right"
                            aria-label="Ukuran pembelian"
                          />
                        </td>
                        <td className="py-1.5 pr-2">
                          <UnitSelect value={i.unit} onChange={(v) => setIngredient(i.id, { unit: v })} />
                        </td>
                        <td className="py-1.5 pr-2">
                          <Input
                            type="number"
                            min={0}
                            value={i.usedQty || ""}
                            onChange={(e) => setIngredient(i.id, { usedQty: Number(e.target.value) })}
                            className="text-right"
                            aria-label="Jumlah yang digunakan"
                          />
                        </td>
                        <td className="py-1.5">
                          <IconButton
                            label="Hapus bahan"
                            className="hover:text-danger"
                            onClick={() =>
                              setData((d) =>
                                d.ingredients.length > 1
                                  ? { ...d, ingredients: d.ingredients.filter((x) => x.id !== i.id) }
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
              <Button
                variant="secondary"
                size="sm"
                className="mt-2"
                onClick={() => setData((d) => ({ ...d, ingredients: [...d.ingredients, blankIngredient()] }))}
              >
                <Icon name="plus" className="size-3.5" />
                Tambah bahan
              </Button>
            </section>

            <Divider />

            <section>
              <h2 className="text-[13px] font-semibold uppercase tracking-wide text-ink-secondary">Biaya lain</h2>
              <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
                <Field label="Kemasan">
                  <MoneyInput value={data.other.packaging} onChange={(v) => set({ other: { ...data.other, packaging: v } })} />
                </Field>
                <Field label="Gas">
                  <MoneyInput value={data.other.gas} onChange={(v) => set({ other: { ...data.other, gas: v } })} />
                </Field>
                <Field label="Listrik">
                  <MoneyInput value={data.other.electricity} onChange={(v) => set({ other: { ...data.other, electricity: v } })} />
                </Field>
                <Field label="Tenaga kerja">
                  <MoneyInput value={data.other.labor} onChange={(v) => set({ other: { ...data.other, labor: v } })} />
                </Field>
                <Field label="Biaya tambahan">
                  <MoneyInput value={data.other.extra} onChange={(v) => set({ other: { ...data.other, extra: v } })} />
                </Field>
                <Field label="Waste / susut (%)" hint="Opsional">
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    value={data.wastePct || ""}
                    onChange={(e) => set({ wastePct: Math.max(0, Math.min(100, Number(e.target.value))) })}
                  />
                </Field>
              </div>
            </section>

            <Field label="Catatan">
              <Textarea value={data.note} onChange={(e) => set({ note: e.target.value })} placeholder="Opsional - catatan produksi" />
            </Field>
          </>
        }
        result={
          <>
            {!valid ? (
              <EmptyState
                icon={<Icon name="calculator" className="size-5" />}
                title={data.productName ? "Lengkapi angka dulu" : "Tambahkan bahan pertama untuk mulai menghitung."}
                description={data.productName ? validation[0] : "Isi nama produk, bahan, dan jumlah produksi agar HPP bisa dihitung."}
              />
            ) : (
              <>
                <MainResult
                  label="HPP per porsi / unit"
                  value={formatCurrency(result.perUnit)}
                  valueSub={`${result.totalBatch.toLocaleString("id-ID")} total batch${result.wasteFactor > 1 ? ` (termasuk waste ${data.wastePct}%)` : ""}`}
                  rows={[
                    { label: "Total bahan", value: formatCurrency(result.totalMaterials) },
                    { label: "Biaya lain (kemasan, gas, dll)", value: formatCurrency(moneySum([data.other.packaging, data.other.gas, data.other.electricity, data.other.labor, data.other.extra])) },
                    { label: "Total biaya produksi", value: formatCurrency(result.totalBatch), strong: true },
                    { label: `Hasil produksi`, value: `${data.batchQty} unit` },
                  ]}
                />

                <div className="rounded-lg border border-border bg-surface p-4">
                  <h2 className="text-[13px] font-semibold uppercase tracking-wide text-ink-secondary">Simulasi harga jual</h2>
                  <div className="mt-3 grid grid-cols-2 gap-2 lg:grid-cols-4">
                    {result.margins.map((m) => (
                      <div key={m.margin} className="rounded-md border border-border bg-surface-muted/50 p-3">
                        <p className="text-[11px] text-ink-faint">Margin {m.margin}%</p>
                        <p className="mt-0.5 text-lg font-bold tabular text-accent-strong">{formatCurrency(m.price)}</p>
                        <p className="text-[11px] text-ink-secondary">Untung {formatCurrency(m.profit)}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-lg border border-border bg-surface p-4">
                  <h2 className="text-[13px] font-semibold uppercase tracking-wide text-ink-secondary">Rincian bahan</h2>
                  <table className="mt-3 w-full text-[13px]">
                    <tbody>
                      {result.materials
                        .filter((m) => m.name)
                        .map((m) => (
                          <tr key={m.id} className="border-b border-border last:border-0">
                            <td className="py-1.5 font-medium text-ink">{m.name}</td>
                            <td className="py-1.5 text-right text-ink-secondary">
                              {formatCurrency(m.costPerUnit)} / {m.unit}
                            </td>
                            <td className="py-1.5 text-right tabular">× {m.usedQty} = {formatCurrency(m.costUsed)}</td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>

                {data.note && (
                  <Note>Catatan: {data.note}</Note>
                )}
              </>
            )}
          </>
        }
      />
    </div>
  );
}

function UnitSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const units = ["gram", "kg", "liter", "ml", "pcs", "pack", "box", "sachet", "bottle", "ikat"];
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="h-9 w-full rounded-md border border-border bg-surface px-2 text-sm focus:border-accent focus:outline-none"
      aria-label="Unit"
    >
      {units.map((u) => (
        <option key={u} value={u}>
          {u}
        </option>
      ))}
    </select>
  );
}