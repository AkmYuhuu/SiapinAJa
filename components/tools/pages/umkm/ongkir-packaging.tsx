"use client";

import { useMemo, useState } from "react";
import { CalcWorkspace, MainResult, ProjectActions } from "@/components/tools/tool-shell";
import { useProject } from "@/components/tools/use-project";
import { Field, MoneyInput, PercentInput } from "@/components/ui/fields";
import { Icon } from "@/components/icons";
import { Divider, StatBlock } from "@/components/ui/card";
import { SegmentedControl } from "@/components/ui/tabs";
import { EmptyState } from "@/components/ui/empty";
import { formatCurrency } from "@/lib/format";
import { formatPercent, money, moneyMul, moneySum } from "@/lib/money";

const TOOL_ID = "shipping-packaging";

function toNum(v: unknown, fallback = 0): number {
  return typeof v === "number" && Number.isFinite(v) ? v : fallback;
}

type OngkirMode = "seller" | "customer" | "split" | "custom";

interface OngkirPackagingData {
  mode: OngkirMode;
  shippingFee: number;
  bubble: number;
  box: number;
  pouch: number;
  label: number;
  sellerSubsidy: number;
  customerPaid: number;
  sellingPrice: number;
  marginPct: number;
}

const initialData: OngkirPackagingData = {
  mode: "seller",
  shippingFee: 0,
  bubble: 0,
  box: 0,
  pouch: 0,
  label: 0,
  sellerSubsidy: 0,
  customerPaid: 0,
  sellingPrice: 0,
  marginPct: 0,
};

export default function OngkirPackagingTool() {
  const [data, setData] = useState<OngkirPackagingData>(initialData);
  const project = useProject({ toolId: TOOL_ID, getData: () => data });

  const [loadedId, setLoadedId] = useState<string | null>(null);
  const current = project.current;
  if (current && current.id !== loadedId) {
    setLoadedId(current.id);
    const d = current.data as OngkirPackagingData | null;
    if (d && typeof d === "object") {
      setData({
        mode: ["seller", "customer", "split", "custom"].includes(d.mode) ? (d.mode as OngkirMode) : "seller",
        shippingFee: toNum(d.shippingFee),
        bubble: toNum(d.bubble),
        box: toNum(d.box),
        pouch: toNum(d.pouch),
        label: toNum(d.label),
        sellerSubsidy: toNum(d.sellerSubsidy),
        customerPaid: toNum(d.customerPaid),
        sellingPrice: toNum(d.sellingPrice),
        marginPct: toNum(d.marginPct),
      });
    }
  }

  const set = (patch: Partial<OngkirPackagingData>) => setData((d) => ({ ...d, ...patch }));
  const setPackaging = (patch: Partial<Pick<OngkirPackagingData, "bubble" | "box" | "pouch" | "label">>) =>
    setData((d) => ({ ...d, ...patch }));

  const result = useMemo(() => {
    const packagingTotal = moneySum([data.bubble, data.box, data.pouch, data.label]);
    const totalShippingCost = moneySum([data.shippingFee, packagingTotal]);
    let sellerBurden: number;
    let customerBurden: number;
    switch (data.mode) {
      case "seller":
        sellerBurden = totalShippingCost;
        customerBurden = 0;
        break;
      case "customer": {
        const sub = Math.min(data.sellerSubsidy, data.shippingFee);
        sellerBurden = moneySum([packagingTotal, sub]);
        customerBurden = money(data.shippingFee - sub);
        break;
      }
      case "split":
        sellerBurden = moneySum([packagingTotal, Math.ceil(data.shippingFee / 2)]);
        customerBurden = Math.floor(data.shippingFee / 2);
        break;
      case "custom":
      default:
        sellerBurden = moneySum([packagingTotal, data.sellerSubsidy]);
        customerBurden = data.customerPaid;
        break;
    }
    const productProfit = moneyMul(data.sellingPrice, Math.max(0, data.marginPct) / 100);
    const profitAfter = money(productProfit - sellerBurden);
    return { packagingTotal, totalShippingCost, sellerBurden, customerBurden, productProfit, profitAfter };
  }, [data]);

  const validation: string[] = [];
  if (data.shippingFee < 0) validation.push("Ongkir tidak boleh negatif.");
  if (data.sellerSubsidy < 0) validation.push("Subsidi seller tidak boleh negatif.");
  if (data.customerPaid < 0) validation.push("Ongkir customer tidak boleh negatif.");
  if (data.marginPct >= 100) validation.push("Margin harus kurang dari 100%.");
  const valid = validation.length === 0 && result.totalShippingCost > 0;
  const showProfit = data.sellingPrice > 0;

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
              <h2 className="text-[13px] font-semibold uppercase tracking-wide text-ink-secondary">Siapa yang bayar</h2>
              <div className="mt-3">
                <SegmentedControl
                  options={[
                    { value: "seller", label: "Seller bayar" },
                    { value: "customer", label: "Customer bayar" },
                    { value: "split", label: "Split" },
                    { value: "custom", label: "Custom" },
                  ]}
                  value={data.mode}
                  onChange={(v) => set({ mode: v })}
                />
              </div>
            </section>

            <Divider />

            <section>
              <h2 className="text-[13px] font-semibold uppercase tracking-wide text-ink-secondary">Biaya pengiriman</h2>
              <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
                <Field label="Ongkir">
                  <MoneyInput value={data.shippingFee} onChange={(v) => set({ shippingFee: v })} />
                </Field>
                <Field label="Bubble wrap">
                  <MoneyInput value={data.bubble} onChange={(v) => setPackaging({ bubble: v })} />
                </Field>
                <Field label="Box / kardus">
                  <MoneyInput value={data.box} onChange={(v) => setPackaging({ box: v })} />
                </Field>
                <Field label="Pouch / plastik">
                  <MoneyInput value={data.pouch} onChange={(v) => setPackaging({ pouch: v })} />
                </Field>
                <Field label="Label & stiker">
                  <MoneyInput value={data.label} onChange={(v) => setPackaging({ label: v })} />
                </Field>
              </div>
            </section>

            {(data.mode === "customer" || data.mode === "custom") && (
              <>
                <Divider />
                <section>
                  <h2 className="text-[13px] font-semibold uppercase tracking-wide text-ink-secondary">
                    Subsidi & pembayaran customer
                  </h2>
                  <div className="mt-3 grid grid-cols-2 gap-3">
                    <Field label="Subsidi ongkir seller" hint="Bagian ongkir yang ditanggung seller">
                      <MoneyInput value={data.sellerSubsidy} onChange={(v) => set({ sellerSubsidy: v })} />
                    </Field>
                    {data.mode === "custom" && (
                      <Field label="Ongkir dibayar customer">
                        <MoneyInput value={data.customerPaid} onChange={(v) => set({ customerPaid: v })} />
                      </Field>
                    )}
                  </div>
                </section>
              </>
            )}

            <Divider />

            <section>
              <h2 className="text-[13px] font-semibold uppercase tracking-wide text-ink-secondary">
                Pengaruh ke profit <span className="font-normal normal-case">(opsional)</span>
              </h2>
              <div className="mt-3 grid grid-cols-2 gap-3">
                <Field label="Harga jual produk">
                  <MoneyInput value={data.sellingPrice} onChange={(v) => set({ sellingPrice: v })} />
                </Field>
                <Field label="Margin (%)" error={data.marginPct >= 100 ? "Harus kurang dari 100%." : undefined}>
                  <PercentInput value={data.marginPct} onChange={(v) => set({ marginPct: v })} max={99} />
                </Field>
              </div>
            </section>
          </>
        }
        result={
          <>
            {!valid ? (
              <EmptyState
                icon={<Icon name="package" className="size-5" />}
                title={validation.length > 0 ? "Perbaiki dulu" : "Masukkan biaya ongkir"}
                description={
                  validation.length > 0
                    ? validation[0]
                    : "Isi ongkir dan biaya packaging untuk menghitung beban seller dan customer."
                }
              />
            ) : (
              <>
                <MainResult
                  label="Total biaya ongkir & packaging"
                  value={formatCurrency(result.totalShippingCost)}
                  valueSub={`Seller tanggung ${formatCurrency(result.sellerBurden)} · Customer ${formatCurrency(result.customerBurden)}`}
                  rows={[
                    { label: "Ongkir", value: formatCurrency(data.shippingFee) },
                    { label: "Bubble wrap", value: formatCurrency(data.bubble) },
                    { label: "Box / kardus", value: formatCurrency(data.box) },
                    { label: "Pouch / plastik", value: formatCurrency(data.pouch) },
                    { label: "Label & stiker", value: formatCurrency(data.label) },
                    { label: "Total packaging", value: formatCurrency(result.packagingTotal) },
                    { label: "Beban seller", value: formatCurrency(result.sellerBurden), strong: true },
                    { label: "Beban customer", value: formatCurrency(result.customerBurden) },
                    { label: "Net biaya order", value: formatCurrency(result.sellerBurden), strong: true },
                  ]}
                />

                <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
                  <StatBlock label="Beban seller" value={formatCurrency(result.sellerBurden)} accent />
                  <StatBlock label="Beban customer" value={formatCurrency(result.customerBurden)} accent />
                  <StatBlock label="Net biaya order" value={formatCurrency(result.sellerBurden)} accent />
                </div>

                {data.mode === "split" && (
                  <div className="flex items-start gap-2 rounded-md border border-border bg-surface-muted px-3 py-2.5 text-[13px] text-ink-secondary">
                    <Icon name="help" className="mt-0.5 size-4 shrink-0" />
                    <p>Ongkir dibagi dua: seller menanggung packaging penuh ditambah setengah ongkir.</p>
                  </div>
                )}

                {showProfit && (
                  <div className="rounded-lg border border-border bg-surface p-4">
                    <h2 className="text-[13px] font-semibold uppercase tracking-wide text-ink-secondary">
                      Pengaruh ke profit
                    </h2>
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <div className="rounded-md bg-surface-muted/50 p-2.5">
                        <p className="text-[11px] text-ink-faint">Profit produk (sebelum ongkir)</p>
                        <p className="font-semibold tabular text-ink">{formatCurrency(result.productProfit)}</p>
                      </div>
                      <div className="rounded-md bg-surface-muted/50 p-2.5">
                        <p className="text-[11px] text-ink-faint">Profit setelah ongkir & packaging</p>
                        <p className={`font-semibold tabular ${result.profitAfter >= 0 ? "text-ink" : "text-danger"}`}>
                          {formatCurrency(result.profitAfter)}
                        </p>
                      </div>
                    </div>
                    {result.profitAfter < 0 && (
                      <div className="mt-2 flex items-start gap-2 rounded-md border border-warning/30 bg-warning-soft px-3 py-2 text-[13px] text-warning">
                        <Icon name="alert" className="mt-0.5 size-4 shrink-0" />
                        <p>Biaya ongkir & packaging lebih besar dari profit produk ({formatPercent(data.marginPct)} margin).</p>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </>
        }
      />
    </div>
  );
}