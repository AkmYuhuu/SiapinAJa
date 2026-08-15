"use client";

import { useMemo, useState } from "react";
import { CalcWorkspace, MainResult, ProjectActions } from "@/components/tools/tool-shell";
import { useProject } from "@/components/tools/use-project";
import { Field, Input, MoneyInput, PercentInput } from "@/components/ui/fields";
import { Icon } from "@/components/icons";
import { Divider } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty";
import { formatCurrency } from "@/lib/format";
import { formatPercent, marginPct, moneySum, netProfit, priceForProfit, pctOf } from "@/lib/money";

const TOOL_ID = "selling-price";

interface HargaJualData {
  productName: string;
  modal: number;
  packaging: number;
  biayaLain: number;
  feePct: number;
  admin: number;
  iklan: number;
  subsidiOngkir: number;
  voucher: number;
  targetProfitPct: number;
  targetProfitNominal: number;
  note: string;
}

const initialData: HargaJualData = {
  productName: "",
  modal: 0,
  packaging: 0,
  biayaLain: 0,
  feePct: 5,
  admin: 0,
  iklan: 0,
  subsidiOngkir: 0,
  voucher: 0,
  targetProfitPct: 0,
  targetProfitNominal: 0,
  note: "",
};

function toNum(v: unknown, fallback = 0): number {
  return typeof v === "number" && Number.isFinite(v) ? v : fallback;
}

export default function HargaJualTool() {
  const [data, setData] = useState<HargaJualData>(initialData);
  const project = useProject({ toolId: TOOL_ID, getData: () => data });

  const [loadedId, setLoadedId] = useState<string | null>(null);
  const current = project.current;
  if (current && current.id !== loadedId) {
    setLoadedId(current.id);
    const d = current.data as HargaJualData | null;
    if (d && typeof d === "object") {
      setData({
        productName: typeof d.productName === "string" ? d.productName : "",
        modal: toNum(d.modal),
        packaging: toNum(d.packaging),
        biayaLain: toNum(d.biayaLain),
        feePct: toNum(d.feePct, 5),
        admin: toNum(d.admin),
        iklan: toNum(d.iklan),
        subsidiOngkir: toNum(d.subsidiOngkir),
        voucher: toNum(d.voucher),
        targetProfitPct: toNum(d.targetProfitPct),
        targetProfitNominal: toNum(d.targetProfitNominal),
        note: typeof d.note === "string" ? d.note : "",
      });
    }
  }

  const set = (patch: Partial<HargaJualData>) => setData((d) => ({ ...d, ...patch }));

  const result = useMemo(() => {
    const fee = Math.max(0, Math.min(99.9, data.feePct));
    const totalFixed = moneySum([
      data.modal,
      data.packaging,
      data.biayaLain,
      data.admin,
      data.iklan,
      data.subsidiOngkir,
      data.voucher,
    ]);
    const minPrice = priceForProfit(totalFixed, fee, 0);
    const priceForNominal =
      data.targetProfitNominal > 0 ? priceForProfit(totalFixed, fee, data.targetProfitNominal) : 0;
    const denom = 1 - fee / 100 - (data.targetProfitPct > 0 ? data.targetProfitPct / 100 : 0);
    const priceForPct = denom > 0 ? Math.ceil(totalFixed / denom) : Number.POSITIVE_INFINITY;
    const recommended = Math.max(
      minPrice,
      priceForNominal || 0,
      Number.isFinite(priceForPct) ? priceForPct : 0,
    );
    const profitAtMin = netProfit(minPrice, fee, totalFixed);
    const profitRec = netProfit(recommended, fee, totalFixed);
    const marginRec = marginPct(totalFixed, recommended);
    const simMax = Math.max(recommended * 1.5, minPrice + 5000, recommended + 1000);
    const simMin = Math.min(minPrice, recommended);
    return {
      fee,
      totalFixed,
      minPrice,
      priceForNominal,
      priceForPct: Number.isFinite(priceForPct) ? priceForPct : 0,
      recommended,
      profitAtMin,
      profitRec,
      marginRec,
      simMax,
      simMin,
    };
  }, [data]);

  const [simPrice, setSimPrice] = useState(0);

  const [prevRecommended, setPrevRecommended] = useState(0);
  if (result.recommended > 0 && result.recommended !== prevRecommended) {
    setPrevRecommended(result.recommended);
    setSimPrice(result.recommended);
  }

  const feeErr = data.feePct >= 100 ? "Fee marketplace harus kurang dari 100%." : undefined;
  const targetErr =
    data.targetProfitPct > 0 && data.targetProfitPct >= 100 - data.feePct
      ? "Target profit terlalu tinggi untuk fee marketplace saat ini."
      : undefined;

  const validation: string[] = [];
  if (data.feePct >= 100) validation.push("Fee marketplace harus kurang dari 100%.");
  if (data.modal < 0) validation.push("Harga modal tidak boleh negatif.");
  if (data.targetProfitPct > 0 && data.targetProfitPct >= 100 - data.feePct)
    validation.push("Target profit tidak mungkin dicapai dengan fee marketplace saat ini.");
  const valid = validation.length === 0 && result.totalFixed > 0;

  const simProfit = netProfit(simPrice, result.fee, result.totalFixed);
  const simMargin = marginPct(result.totalFixed, simPrice);

  const samplePrices = [
    { label: "Minimal", price: result.minPrice },
    { label: "Rekomendasi", price: result.recommended },
    { label: "Rekomendasi +5%", price: roundUp(result.recommended, 1.05) },
    { label: "Rekomendasi +10%", price: roundUp(result.recommended, 1.1) },
    { label: "Rekomendasi +20%", price: roundUp(result.recommended, 1.2) },
  ];

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
                    placeholder="cth. Kaos Polos"
                  />
                </Field>
                <Field label="Harga modal / unit" error={data.modal < 0 ? "Tidak boleh negatif." : undefined}>
                  <MoneyInput value={data.modal} onChange={(v) => set({ modal: v })} />
                </Field>
              </div>
            </section>

            <Divider />

            <section>
              <h2 className="text-[13px] font-semibold uppercase tracking-wide text-ink-secondary">Biaya per produk</h2>
              <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
                <Field label="Packaging">
                  <MoneyInput value={data.packaging} onChange={(v) => set({ packaging: v })} />
                </Field>
                <Field label="Biaya operasional" hint="Per produk">
                  <MoneyInput value={data.biayaLain} onChange={(v) => set({ biayaLain: v })} />
                </Field>
                <Field label="Admin tetap">
                  <MoneyInput value={data.admin} onChange={(v) => set({ admin: v })} />
                </Field>
                <Field label="Biaya iklan">
                  <MoneyInput value={data.iklan} onChange={(v) => set({ iklan: v })} />
                </Field>
                <Field label="Subsidi ongkir">
                  <MoneyInput value={data.subsidiOngkir} onChange={(v) => set({ subsidiOngkir: v })} />
                </Field>
                <Field label="Voucher / diskon seller">
                  <MoneyInput value={data.voucher} onChange={(v) => set({ voucher: v })} />
                </Field>
                <Field label="Fee marketplace (%)" error={feeErr}>
                  <PercentInput value={data.feePct} onChange={(v) => set({ feePct: v })} max={99} />
                </Field>
              </div>
            </section>

            <Divider />

            <section>
              <h2 className="text-[13px] font-semibold uppercase tracking-wide text-ink-secondary">Target profit</h2>
              <div className="mt-3 grid grid-cols-2 gap-3">
                <Field label="Target margin (%)" hint="Persen dari harga jual" error={targetErr}>
                  <PercentInput value={data.targetProfitPct} onChange={(v) => set({ targetProfitPct: v })} max={99} />
                </Field>
                <Field label="Target nominal (Rp)" hint="Opsional">
                  <MoneyInput
                    value={data.targetProfitNominal}
                    onChange={(v) => set({ targetProfitNominal: v })}
                  />
                </Field>
              </div>
            </section>

            <Field label="Catatan">
              <textarea
                value={data.note}
                onChange={(e) => set({ note: e.target.value })}
                placeholder="Opsional - catatan penetapan harga"
                className="h-auto min-h-20 w-full resize-y rounded-md border border-border bg-surface px-3 py-2 text-sm text-ink placeholder:text-ink-faint focus:border-accent focus:outline-none"
              />
            </Field>
          </>
        }
        result={
          <>
            {!valid ? (
              <EmptyState
                icon={<Icon name="pricetag" className="size-5" />}
                title={validation.length > 0 ? "Perbaiki dulu" : "Mulai dari biaya modal"}
                description={
                  validation.length > 0
                    ? validation[0]
                    : "Isi harga modal dan biaya lain untuk menghitung harga jual minimum."
                }
              />
            ) : (
              <>
                <MainResult
                  label="Harga jual minimum (balik modal)"
                  value={formatCurrency(result.minPrice)}
                  valueSub={`Profit ${formatCurrency(result.profitAtMin)} - biaya ditutup tanpa rugi`}
                  rows={[
                    { label: "Total biaya per produk", value: formatCurrency(result.totalFixed), strong: true },
                    { label: "Modal", value: formatCurrency(data.modal) },
                    { label: "Packaging", value: formatCurrency(data.packaging) },
                    { label: "Operasional", value: formatCurrency(data.biayaLain) },
                    { label: "Admin tetap", value: formatCurrency(data.admin) },
                    { label: "Iklan", value: formatCurrency(data.iklan) },
                    { label: "Subsidi ongkir", value: formatCurrency(data.subsidiOngkir) },
                    { label: "Voucher / diskon", value: formatCurrency(data.voucher) },
                    { label: `Fee ${result.fee}%`, value: formatCurrency(pctOf(result.recommended, result.fee)) },
                  ]}
                />

                <div className="rounded-lg border border-accent/40 bg-accent-soft/60 p-4">
                  <h2 className="text-[13px] font-semibold uppercase tracking-wide text-accent-strong">
                    Harga jual rekomendasi
                  </h2>
                  <p className="mt-1 text-3xl font-bold tracking-tight tabular text-accent-strong">
                    {formatCurrency(result.recommended)}
                  </p>
                  <div className="mt-3 grid grid-cols-3 gap-2">
                    <div>
                      <p className="text-[11px] text-ink-secondary">Profit per unit</p>
                      <p className="font-semibold tabular text-ink">{formatCurrency(result.profitRec)}</p>
                    </div>
                    <div>
                      <p className="text-[11px] text-ink-secondary">Margin</p>
                      <p className="font-semibold tabular text-ink">{formatPercent(result.marginRec)}</p>
                    </div>
                    <div>
                      <p className="text-[11px] text-ink-secondary">Fee</p>
                      <p className="font-semibold tabular text-ink">{formatCurrency(pctOf(result.recommended, result.fee))}</p>
                    </div>
                  </div>
                </div>

                {result.priceForNominal > 0 && (
                  <div className="rounded-lg border border-border bg-surface p-4">
                    <h2 className="text-[13px] font-semibold uppercase tracking-wide text-ink-secondary">
                      Harga untuk target nominal {formatCurrency(data.targetProfitNominal)}
                    </h2>
                    <p className="mt-1 text-lg font-bold tabular text-ink">{formatCurrency(result.priceForNominal)}</p>
                    {result.priceForPct > 0 && result.priceForPct !== result.priceForNominal && (
                      <p className="mt-0.5 text-xs text-ink-faint">
                        Target margin {data.targetProfitPct}% butuh harga {formatCurrency(result.priceForPct)}.
                      </p>
                    )}
                  </div>
                )}

                <div className="rounded-lg border border-border bg-surface p-4">
                  <h2 className="text-[13px] font-semibold uppercase tracking-wide text-ink-secondary">Simulasi harga</h2>
                  <div className="mt-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-ink-secondary">Geser untuk simulasi</span>
                      <span className="font-semibold tabular text-ink">{formatCurrency(simPrice)}</span>
                    </div>
                    <input
                      type="range"
                      min={Math.max(0, Math.floor(result.simMin / 100) * 100)}
                      max={Math.ceil(result.simMax / 100) * 100}
                      step={500}
                      value={simPrice}
                      onChange={(e) => setSimPrice(Number(e.target.value))}
                      className="mt-2 w-full accent-[var(--color-accent)]"
                      aria-label="Harga simulasi"
                    />
                    <div className="mt-2 grid grid-cols-2 gap-2">
                      <div className="rounded-md bg-surface-muted/50 p-2.5">
                        <p className="text-[11px] text-ink-faint">Profit</p>
                        <p className={`font-semibold tabular ${simProfit >= 0 ? "text-ink" : "text-danger"}`}>
                          {formatCurrency(simProfit)}
                        </p>
                      </div>
                      <div className="rounded-md bg-surface-muted/50 p-2.5">
                        <p className="text-[11px] text-ink-faint">Margin</p>
                        <p className="font-semibold tabular text-ink">{formatPercent(simMargin)}</p>
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 overflow-x-auto">
                    <table className="w-full min-w-[420px] text-[13px]">
                      <thead>
                        <tr className="text-left text-[11px] uppercase tracking-wide text-ink-faint">
                          <th className="py-1 pr-2 font-semibold">Skenario</th>
                          <th className="py-1 pr-2 text-right font-semibold">Harga</th>
                          <th className="py-1 pr-2 text-right font-semibold">Profit</th>
                          <th className="py-1 text-right font-semibold">Margin</th>
                        </tr>
                      </thead>
                      <tbody>
                        {samplePrices.map((s) => {
                          const profit = netProfit(s.price, result.fee, result.totalFixed);
                          return (
                            <tr key={s.label} className="border-b border-border last:border-0">
                              <td className="py-1.5 pr-2 font-medium text-ink">{s.label}</td>
                              <td className="py-1.5 pr-2 text-right tabular">{formatCurrency(s.price)}</td>
                              <td className="py-1.5 pr-2 text-right tabular text-ink-secondary">{formatCurrency(profit)}</td>
                              <td className="py-1.5 text-right tabular text-ink-secondary">
                                {formatPercent(marginPct(result.totalFixed, s.price))}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {result.recommended > 0 && result.marginRec < 0 && (
                  <div className="flex items-start gap-2 rounded-md border border-warning/30 bg-warning-soft px-3 py-2.5 text-[13px] text-warning">
                    <Icon name="alert" className="mt-0.5 size-4 shrink-0" />
                    <p>Target profit belum tercapai di harga minimum. Pertimbangkan menaikkan harga atau menekan biaya.</p>
                  </div>
                )}

                {data.note && (
                  <div className="flex items-start gap-2 rounded-md border border-border bg-surface-muted px-3 py-2.5 text-[13px] text-ink-secondary">
                    <Icon name="help" className="mt-0.5 size-4 shrink-0" />
                    <p className="leading-relaxed">Catatan: {data.note}</p>
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

function roundUp(price: number, multiplier: number): number {
  const raw = Math.ceil((price * multiplier) / 100) * 100;
  return raw > price ? raw : Math.ceil((price + 100) / 100) * 100;
}