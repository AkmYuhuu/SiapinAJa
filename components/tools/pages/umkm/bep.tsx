"use client";

import { useMemo, useState } from "react";
import { CalcWorkspace, MainResult, ProjectActions, ErrorBox, Note } from "@/components/tools/tool-shell";
import { useProject } from "@/components/tools/use-project";
import { Field, Input, MoneyInput } from "@/components/ui/fields";
import { Icon } from "@/components/icons";
import { Divider } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty";
import { formatCurrency, formatNumber } from "@/lib/format";
import { money, moneyMul } from "@/lib/money";
import { calculateBreakEven, calculateContributionMargin, profitAtUnits } from "@/lib/math";

const TOOL_ID = "bep";

function toNum(v: unknown, fallback = 0): number {
  return typeof v === "number" && Number.isFinite(v) ? v : fallback;
}

interface BepData {
  productName: string;
  fixedCost: number;
  price: number;
  variableCost: number;
}

const initialData: BepData = {
  productName: "",
  fixedCost: 0,
  price: 0,
  variableCost: 0,
};

export default function BepTool() {
  const [data, setData] = useState<BepData>(initialData);
  const project = useProject({ toolId: TOOL_ID, getData: () => data });

  // Hydrate form state when a saved/imported project is loaded (spec §6).
  // React-recommended "adjust state when a value changes" pattern: no effect.
  const [loadedId, setLoadedId] = useState<string | null>(null);
  const current = project.current;
  if (current && current.id !== loadedId) {
    setLoadedId(current.id);
    const d = current.data as BepData | null;
    if (d && typeof d === "object") {
      setData({
        productName: typeof d.productName === "string" ? d.productName : "",
        fixedCost: toNum(d.fixedCost),
        price: toNum(d.price),
        variableCost: toNum(d.variableCost),
      });
    }
  }

  const set = (patch: Partial<BepData>) => setData((d) => ({ ...d, ...patch }));

  const result = useMemo(() => {
    const cm = calculateContributionMargin(data.price, data.variableCost);
    const bepUnitsRaw = calculateBreakEven(data.fixedCost, data.price, data.variableCost);
    const bepUnits = Number.isFinite(bepUnitsRaw) ? Math.ceil(bepUnitsRaw) : Number.POSITIVE_INFINITY;
    const omzet = Number.isFinite(bepUnits) ? moneyMul(bepUnits, data.price) : 0;
    const scenarios = [10, 50, 100, 500].map((n) => ({
      units: n,
      profit: money(profitAtUnits(data.fixedCost, data.price, data.variableCost, n)),
    }));
    return { cm, bepUnits, omzet, scenarios };
  }, [data]);

  const valid = data.fixedCost > 0 && data.price > 0 && data.variableCost >= 0;
  const cmBroken = valid && result.cm <= 0;

  const chart = useMemo(() => {
    const bep = Number.isFinite(result.bepUnits) ? result.bepUnits : 0;
    const maxUnits = Math.max(700, Math.ceil(bep * 1.5));
    const unitPoints = Array.from(new Set([0, 10, 50, 100, 200, 400, 600, maxUnits]))
      .filter((u) => u <= maxUnits)
      .sort((a, b) => a - b);
    const pts = unitPoints.map((u) => ({
      units: u,
      profit: money(profitAtUnits(data.fixedCost, data.price, data.variableCost, u)),
    }));
    const minP = Math.min(0, ...pts.map((p) => p.profit));
    const maxP = Math.max(0, ...pts.map((p) => p.profit));
    const range = Math.max(1, maxP - minP);
    const W = 460;
    const H = 200;
    const pad = 8;
    const x = (units: number) => pad + (units / maxUnits) * (W - pad * 2);
    const y = (profit: number) => H - pad - ((profit - minP) / range) * (H - pad * 2);
    const path = pts.map((p, i) => `${i === 0 ? "M" : "L"}${x(p.units).toFixed(1)},${y(p.profit).toFixed(1)}`).join(" ");
    const area = `${path} L${x(maxUnits).toFixed(1)},${y(0).toFixed(1)} L${x(0).toFixed(1)},${y(0).toFixed(1)} Z`;
    const bepX = bep > 0 ? x(bep) : 0;
    return { pts, minP, maxP, W, H, x, y, path, area, bepX, bep, maxUnits };
  }, [data, result]);

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
                    placeholder="cth. Cemilan Kemasan"
                  />
                </Field>
                <Field label="Biaya tetap" hint="Sewa, gaji, listrik - per periode">
                  <MoneyInput value={data.fixedCost} onChange={(v) => set({ fixedCost: v })} />
                </Field>
                <Field label="Harga jual / unit">
                  <MoneyInput value={data.price} onChange={(v) => set({ price: v })} />
                </Field>
                <Field label="Biaya variabel / unit" hint="Bahan, kemasan, ongkir per unit">
                  <MoneyInput value={data.variableCost} onChange={(v) => set({ variableCost: v })} />
                </Field>
              </div>
            </section>
          </>
        }
        result={
          <>
            {!valid ? (
              <EmptyState
                icon={<Icon name="target" className="size-5" />}
                title="Isi biaya dan harga jual"
                description="Masukkan biaya tetap, harga jual per unit, dan biaya variabel untuk menghitung BEP."
              />
            ) : cmBroken ? (
              <div className="space-y-4">
                <ErrorBox>Harga jual tidak menghasilkan margin untuk mencapai BEP.</ErrorBox>
                <Note tone="warning">
                  Turunkan biaya variabel per unit atau naikkan harga jual agar contribution margin positif.
                </Note>
              </div>
            ) : (
              <>
                <MainResult
                  label="Break-Even Point"
                  value={`${formatNumber(result.bepUnits)} unit`}
                  valueSub={
                    Number.isFinite(result.bepUnits)
                      ? `Perlu jual ${formatNumber(result.bepUnits)} unit agar balik modal`
                      : "Tidak tercapai"
                  }
                  rows={[
                    { label: "BEP dalam omzet", value: formatCurrency(result.omzet), strong: true },
                    { label: "Contribution margin / unit", value: formatCurrency(result.cm) },
                    { label: "Biaya tetap", value: formatCurrency(data.fixedCost) },
                  ]}
                />

                <div className="rounded-lg border border-border bg-surface p-4">
                  <h2 className="text-[13px] font-semibold uppercase tracking-wide text-ink-secondary">
                    Grafik profit vs unit terjual
                  </h2>
                  <svg
                    viewBox={`0 0 ${chart.W} ${chart.H}`}
                    className="mt-3 w-full"
                    role="img"
                    aria-label="Grafik profit berdasarkan unit terjual"
                  >
                    <path d={chart.area} fill="var(--color-accent)" fillOpacity="0.12" />
                    <path d={chart.path} fill="none" stroke="var(--color-accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    <line
                      x1={chart.x(0)}
                      y1={chart.y(0)}
                      x2={chart.x(chart.maxUnits)}
                      y2={chart.y(0)}
                      stroke="var(--color-border-strong)"
                      strokeWidth="1"
                      strokeDasharray="4 4"
                    />
                    {chart.bep > 0 && chart.bep <= chart.maxUnits && (
                      <>
                        <line x1={chart.bepX} y1={chart.y(chart.minP)} x2={chart.bepX} y2={chart.y(chart.maxP)} stroke="var(--color-warning)" strokeWidth="1.5" strokeDasharray="4 4" />
                        <circle cx={chart.bepX} cy={chart.y(0)} r="3.5" fill="var(--color-warning)" />
                        <text x={chart.bepX + 4} y={chart.y(0) - 6} fontSize="10" fill="var(--color-warning)" fontWeight="600">
                          BEP {formatNumber(chart.bep)} unit
                        </text>
                      </>
                    )}
                    {chart.pts
                      .filter((p) => p.units > 0)
                      .map((p) => (
                        <circle key={p.units} cx={chart.x(p.units)} cy={chart.y(p.profit)} r="2.5" fill="var(--color-accent)" />
                      ))}
                  </svg>
                </div>

                <Divider />

                <div className="rounded-lg border border-border bg-surface p-4">
                  <h2 className="text-[13px] font-semibold uppercase tracking-wide text-ink-secondary">
                    Estimasi profit per skenario penjualan
                  </h2>
                  <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {result.scenarios.map((s) => (
                      <div key={s.units} className="rounded-md border border-border bg-surface-muted/50 p-3">
                        <p className="text-[11px] text-ink-faint">{formatNumber(s.units)} unit</p>
                        <p className={`mt-0.5 text-lg font-bold tabular ${s.profit >= 0 ? "text-ink" : "text-danger"}`}>
                          {formatCurrency(s.profit)}
                        </p>
                      </div>
                    ))}
                  </div>
                  {result.scenarios.some((s) => s.units < result.bepUnits && s.profit >= 0) && (
                    <p className="mt-2 text-xs text-ink-faint">
                      BEP di {formatNumber(result.bepUnits)} unit - skenario di bawahnya masih rugi.
                    </p>
                  )}
                </div>
              </>
            )}
          </>
        }
      />
    </div>
  );
}