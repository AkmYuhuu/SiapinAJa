"use client";

import { useMemo, useState } from "react";
import { CalcWorkspace, MainResult, Note, ProjectActions, ResultPanel } from "@/components/tools/tool-shell";
import { useProject } from "@/components/tools/use-project";
import { Field, Input, MoneyInput, PercentInput } from "@/components/ui/fields";
import { Divider, SectionTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty";
import { Icon } from "@/components/icons";
import { formatCurrency } from "@/lib/format";
import { formatPercent, marginPct, moneyMul, moneySum, priceFromMargin } from "@/lib/money";

const TOOL_ID = "project-cost";

interface ProjectCostData {
  days: number;
  hoursPerDay: number;
  hourlyValue: number;
  transport: number;
  software: number;
  asset: number;
  internet: number;
  revisionAllowance: number;
  other: number;
  outsourcing: number;
  profitPct: number;
}

const initialData: ProjectCostData = {
  days: 10,
  hoursPerDay: 8,
  hourlyValue: 0,
  transport: 0,
  software: 0,
  asset: 0,
  internet: 0,
  revisionAllowance: 0,
  other: 0,
  outsourcing: 0,
  profitPct: 30,
};

export default function ProjectCostTool() {
  const [data, setData] = useState<ProjectCostData>(initialData);
  const project = useProject({ toolId: TOOL_ID, getData: () => data });

  const [loadedId, setLoadedId] = useState<string | null>(null);
  const current = project.current;
  if (current && current.id !== loadedId) {
    setLoadedId(current.id);
    const d = current.data as ProjectCostData | null;
    if (d && typeof d === "object") {
      setData({ ...initialData, ...d });
    }
  }

  const set = (patch: Partial<ProjectCostData>) => setData((s) => ({ ...s, ...patch }));

  const result = useMemo(() => {
    const labor = moneyMul(moneyMul(data.days, data.hoursPerDay), data.hourlyValue);
    const operational = moneySum([data.transport, data.software, data.asset, data.internet, data.other]);
    const external = data.outsourcing;
    const totalCost = moneySum([labor, data.revisionAllowance, operational, external]);
    const minPrice = Number.isFinite(priceFromMargin(totalCost, data.profitPct))
      ? priceFromMargin(totalCost, data.profitPct)
      : totalCost;
    const finalSuggested = Math.ceil(minPrice / 10000) * 10000;
    const targetProfit = finalSuggested - totalCost;
    const margin = marginPct(totalCost, finalSuggested);
    return { labor, operational, external, totalCost, minPrice, finalSuggested, targetProfit, margin };
  }, [data]);

  const validation: string[] = [];
  if (data.days <= 0) validation.push("Lama project harus lebih dari 0 hari.");
  if (data.hoursPerDay <= 0) validation.push("Jam produktif per hari harus lebih dari 0.");
  if (data.hourlyValue <= 0) validation.push("Nilai per jam harus diisi terlebih dahulu.");
  const valid = validation.length === 0;

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
              <SectionTitle>Durasi & tenaga kerja</SectionTitle>
              <div className="mt-3 grid gap-3 sm:grid-cols-3">
                <Field label="Lama project (hari)">
                  <Input
                    type="number"
                    min={0}
                    value={data.days || ""}
                    onChange={(e) => set({ days: Math.max(0, Number(e.target.value)) })}
                  />
                </Field>
                <Field label="Jam produktif / hari">
                  <Input
                    type="number"
                    min={0}
                    value={data.hoursPerDay || ""}
                    onChange={(e) => set({ hoursPerDay: Math.max(0, Number(e.target.value)) })}
                  />
                </Field>
                <Field label="Nilai per jam">
                  <MoneyInput value={data.hourlyValue} onChange={(v) => set({ hourlyValue: v })} />
                </Field>
              </div>
            </section>

            <Divider />

            <section>
              <SectionTitle>Biaya operasional</SectionTitle>
              <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
                <Field label="Transport">
                  <MoneyInput value={data.transport} onChange={(v) => set({ transport: v })} />
                </Field>
                <Field label="Software / lisensi">
                  <MoneyInput value={data.software} onChange={(v) => set({ software: v })} />
                </Field>
                <Field label="Aset / peralatan">
                  <MoneyInput value={data.asset} onChange={(v) => set({ asset: v })} />
                </Field>
                <Field label="Internet / komunikasi">
                  <MoneyInput value={data.internet} onChange={(v) => set({ internet: v })} />
                </Field>
                <Field label="Alokasi revisi">
                  <MoneyInput value={data.revisionAllowance} onChange={(v) => set({ revisionAllowance: v })} />
                </Field>
                <Field label="Biaya lain">
                  <MoneyInput value={data.other} onChange={(v) => set({ other: v })} />
                </Field>
              </div>
            </section>

            <Divider />

            <section>
              <SectionTitle>Biaya eksternal</SectionTitle>
              <Field label="Outsourcing / vendor">
                <MoneyInput value={data.outsourcing} onChange={(v) => set({ outsourcing: v })} />
              </Field>
            </section>

            <Divider />

            <section>
              <SectionTitle>Target profit</SectionTitle>
              <Field label="Target profit (%)" hint="Dihitung sebagai margin dari biaya total">
                <PercentInput value={data.profitPct} onChange={(v) => set({ profitPct: v })} max={90} />
              </Field>
            </section>
          </>
        }
        result={
          <>
            {!valid ? (
              <EmptyState
                icon={<Icon name="file" className="size-5" />}
                title="Lengkapi angka dulu"
                description={validation[0] ?? "Isi durasi, jam, dan nilai per jam agar biaya project bisa dihitung."}
              />
            ) : (
              <>
                <ResultPanel title="Biaya Project">
                  <p className="text-3xl font-bold tracking-tight tabular text-ink">{formatCurrency(result.totalCost)}</p>
                  <p className="mt-0.5 text-xs text-ink-faint">Seluruh pengeluaran untuk menyelesaikan project ini.</p>
                  <div className="mt-4 divide-y divide-border/70">
                    {[
                      { label: `Tenaga kerja (${data.days} hari × ${data.hoursPerDay} jam)`, value: formatCurrency(result.labor) },
                      { label: "Alokasi revisi", value: formatCurrency(data.revisionAllowance) },
                      { label: "Biaya operasional", value: formatCurrency(result.operational) },
                      { label: "Biaya eksternal (outsourcing)", value: formatCurrency(result.external) },
                      { label: "Total biaya project", value: formatCurrency(result.totalCost), strong: true },
                    ].map((r) => (
                      <div key={r.label} className="flex items-center justify-between gap-3 py-1.5 text-[13px]">
                        <span className="text-ink-secondary">{r.label}</span>
                        <span className={`tabular ${r.strong ? "font-semibold text-ink" : "text-ink"}`}>{r.value}</span>
                      </div>
                    ))}
                  </div>
                </ResultPanel>

                <MainResult
                  label="Harga Jual"
                  value={formatCurrency(result.finalSuggested)}
                  valueSub="Harga yang kamu tawarkan ke klien. Di bawah angka ini project berisiko rugi."
                  rows={[
                    { label: "Harga jual minimum", value: formatCurrency(result.minPrice) },
                    { label: "Target profit", value: formatCurrency(result.targetProfit) },
                    { label: "Margin", value: formatPercent(result.margin) },
                  ]}
                />

                <Note>
                  Profit = Harga jual − Biaya project. Harga jual bukan keuntunganmu - sebagian membiayai tenaga kerja,
                  operasional, dan vendor.
                </Note>
              </>
            )}
          </>
        }
      />
    </div>
  );
}