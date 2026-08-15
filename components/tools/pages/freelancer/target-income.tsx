"use client";

import { Fragment, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { CalcWorkspace, MainResult, Note, ProjectActions } from "@/components/tools/tool-shell";
import { useProject } from "@/components/tools/use-project";
import { Field, Input, MoneyInput, PercentInput } from "@/components/ui/fields";
import { Divider, SectionTitle, StatBlock } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty";
import { Icon } from "@/components/icons";
import { useToast } from "@/components/ui/toast";
import { exportDocPdf, getDocNode } from "@/lib/documents/html-export";
import { formatCurrency, todayISO } from "@/lib/format";
import { moneyDiv, moneySum, pctOf } from "@/lib/money";

const TOOL_ID = "target-income";

interface TargetIncomeData {
  targetIncome: number;
  workDays: number;
  hoursPerDay: number;
  adminHours: number;
  savingsPct: number;
  expenses: number;
  projectsPerMonth: number;
}

const initialData: TargetIncomeData = {
  targetIncome: 0,
  workDays: 22,
  hoursPerDay: 8,
  adminHours: 1,
  savingsPct: 10,
  expenses: 0,
  projectsPerMonth: 3,
};

export default function TargetIncomeTool() {
  const [data, setData] = useState<TargetIncomeData>(initialData);
  const project = useProject({ toolId: TOOL_ID, getData: () => data });
  const { toast } = useToast();

  const [loadedId, setLoadedId] = useState<string | null>(null);
  const current = project.current;
  if (current && current.id !== loadedId) {
    setLoadedId(current.id);
    const d = current.data as TargetIncomeData | null;
    if (d && typeof d === "object") {
      setData({ ...initialData, ...d });
    }
  }

  const set = (patch: Partial<TargetIncomeData>) => setData((s) => ({ ...s, ...patch }));

  const result = useMemo(() => {
    const savings = pctOf(data.targetIncome, data.savingsPct);
    const minRevenue = moneySum([data.targetIncome, data.expenses, savings]);
    const productivePerDay = Math.max(0.5, data.hoursPerDay - data.adminHours);
    const totalHours = moneyDiv(data.workDays, 1) * productivePerDay;
    const minHourly = Math.round(moneyDiv(minRevenue, totalHours));
    const minDaily = Math.round(moneyDiv(minRevenue, data.workDays));
    const minProject = Math.round(moneyDiv(minRevenue, data.projectsPerMonth));
    return { savings, minRevenue, productivePerDay, minHourly, minDaily, minProject };
  }, [data]);

  const validation: string[] = [];
  if (data.targetIncome <= 0) validation.push("Target pendapatan harus lebih dari 0.");
  if (data.workDays <= 0) validation.push("Hari kerja per bulan harus lebih dari 0.");
  if (data.hoursPerDay <= 0) validation.push("Jam produktif per hari harus lebih dari 0.");
  if (data.projectsPerMonth <= 0) validation.push("Jumlah project per bulan harus lebih dari 0.");
  const valid = validation.length === 0;

  const productiveText = `${data.workDays} hari × ${data.hoursPerDay - data.adminHours} jam produktif`;

  const exportPdf = async () => {
    try {
      const node = getDocNode();
      if (!node) {
        toast("Pratinjau belum siap. Coba lagi.", "error");
        return;
      }
      await exportDocPdf(node, "target-income");
      toast("PDF target income siap diunduh.");
    } catch {
      toast("PDF gagal dibuat. Coba lagi.", "error");
    }
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

      <CalcWorkspace
        input={
          <>
            <section>
              <SectionTitle>Target pendapatan</SectionTitle>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <Field label="Target pendapatan / bulan">
                  <MoneyInput value={data.targetIncome} onChange={(v) => set({ targetIncome: v })} />
                </Field>
                <Field label="Biaya usaha bulanan">
                  <MoneyInput value={data.expenses} onChange={(v) => set({ expenses: v })} />
                </Field>
                <Field label="Tabungan yang diinginkan (%)" hint="Dari target pendapatan">
                  <PercentInput value={data.savingsPct} onChange={(v) => set({ savingsPct: v })} />
                </Field>
              </div>
            </section>

            <Divider />

            <section>
              <SectionTitle>Kapasitas kerja</SectionTitle>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <Field label="Hari kerja / bulan">
                  <Input
                    type="number"
                    min={0}
                    value={data.workDays || ""}
                    onChange={(e) => set({ workDays: Math.max(0, Number(e.target.value)) })}
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
                <Field label="Jam admin / non-produktif per hari">
                  <Input
                    type="number"
                    min={0}
                    value={data.adminHours || ""}
                    onChange={(e) => set({ adminHours: Math.max(0, Number(e.target.value)) })}
                  />
                </Field>
                <Field label="Jumlah project / bulan">
                  <Input
                    type="number"
                    min={1}
                    value={data.projectsPerMonth || ""}
                    onChange={(e) => set({ projectsPerMonth: Math.max(1, Number(e.target.value)) })}
                  />
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
                title="Lengkapi angka dulu"
                description={validation[0] ?? "Isi target pendapatan dan kapasitas kerja agar tarif bisa dihitung."}
              />
            ) : (
              <>
                <MainResult
                  label="Pendapatan Minimum Bulanan"
                  value={formatCurrency(result.minRevenue)}
                  valueSub="Jumlah yang harus masuk setiap bulan agar target, biaya usaha, dan tabungan terpenuhi."
                  rows={[
                    { label: "Target pendapatan", value: formatCurrency(data.targetIncome) },
                    { label: "Biaya usaha", value: formatCurrency(data.expenses) },
                    { label: `Tabungan (${data.savingsPct}%)`, value: formatCurrency(result.savings) },
                    { label: "Pendapatan minimum", value: formatCurrency(result.minRevenue), strong: true },
                  ]}
                />

                <FlowChain
                  items={[
                    { label: "Target Pendapatan", value: formatCurrency(data.targetIncome) },
                    { label: "Pendapatan Minimum", value: formatCurrency(result.minRevenue) },
                    { label: "Proyek / Bulan", value: `${data.projectsPerMonth} proyek` },
                    { label: "Harga Min / Proyek", value: formatCurrency(result.minProject) },
                  ]}
                />

                <div className="grid gap-2 sm:grid-cols-3">
                  <StatBlock
                    accent
                    label="Tarif per jam"
                    value={formatCurrency(result.minHourly)}
                    sub={productiveText}
                  />
                  <StatBlock
                    label="Tarif per hari"
                    value={formatCurrency(result.minDaily)}
                    sub={`${data.workDays} hari kerja / bulan`}
                  />
                  <StatBlock
                    label="Harga min. per proyek"
                    value={formatCurrency(result.minProject)}
                    sub={`${data.projectsPerMonth} proyek / bulan`}
                  />
                </div>

                <Note>
                  Angka di atas adalah harga minimum. Belum termasuk kenaikan untuk kompleksitas, keahlian khusus, atau
                  kondisi pasar.
                </Note>

                <div className="rounded-lg border border-border bg-surface p-4">
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-3 print-hide">
                    <div>
                      <h2 className="text-[13px] font-semibold uppercase tracking-wide text-ink-secondary">Pratinjau PDF</h2>
                      <p className="mt-0.5 text-xs text-ink-faint">Hasil yang diunduh sebagai PDF sesuai pratinjau ini.</p>
                    </div>
                    <Button size="sm" onClick={exportPdf}>
                      <Icon name="download" className="size-3.5" />
                      Download PDF
                    </Button>
                  </div>
                  <div className="print-area min-w-0 overflow-x-auto scroll-thin">
                    <TargetIncomeDoc data={data} result={result} productiveText={productiveText} />
                  </div>
                </div>
              </>
            )}
          </>
        }
      />
    </div>
  );
}

function FlowChain({ items }: { items: Array<{ label: string; value: ReactNode; sub?: string }> }) {
  return (
    <div className="rounded-lg border border-border bg-surface p-4">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-secondary">Alur penghitungan</p>
      <div className="mt-3 flex flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-1">
        {items.map((it, i) => (
          <Fragment key={it.label}>
            {i > 0 && (
              <span className="hidden items-center text-ink-faint sm:flex">
                <Icon name="chevron" className="size-3.5" />
              </span>
            )}
            <div className="flex-1 rounded-md border border-border bg-surface-muted/40 px-3 py-2.5">
              <p className="text-[10px] font-medium uppercase tracking-wide text-ink-faint">{it.label}</p>
              <p className="mt-0.5 text-lg font-semibold tabular text-ink">{it.value}</p>
              {it.sub && <p className="mt-0.5 text-[11px] text-ink-secondary">{it.sub}</p>}
            </div>
            {i < items.length - 1 && (
              <span className="flex justify-center text-ink-faint sm:hidden">
                <Icon name="chevron" className="size-3.5 rotate-90" />
              </span>
            )}
          </Fragment>
        ))}
      </div>
    </div>
  );
}

function TargetIncomeDoc({
  data,
  result,
  productiveText,
}: {
  data: TargetIncomeData;
  result: { minRevenue: number; savings: number; minHourly: number; minDaily: number; minProject: number };
  productiveText: string;
}) {
  return (
    <div className="doc-page border border-border shadow-[0_8px_24px_rgba(43,40,35,0.08)]">
      {/* header */}
      <div className="flex items-start justify-between gap-6">
        <div>
          <p className="text-[16px] font-bold" style={{ fontFamily: "var(--font-plus-jakarta)" }}>
            Target Income Calculator
          </p>
          <p className="text-[10px] text-[#6f6a5e]">Paket Freelancer</p>
        </div>
        <div className="text-right">
          <p className="text-[15px] font-bold tracking-wide" style={{ fontFamily: "var(--font-plus-jakarta)" }}>
            Laporan Target Income
          </p>
          <p className="mt-1 text-[10px]">
            Tanggal: <span className="font-medium">{todayISO()}</span>
          </p>
        </div>
      </div>

      <div className="mt-5 border-t-2 border-[#e8620c]" />

      {/* main result */}
      <p className="mb-1.5 mt-5 text-[9px] font-bold uppercase tracking-wider text-[#e8620c]">
        Pendapatan Minimum Bulanan
      </p>
      <div className="rounded-lg border border-[#e8620c]/40 bg-[#fdf6ee] p-4">
        <p className="text-[28px] font-bold tracking-tight tabular text-[#e8620c]">
          {formatCurrency(result.minRevenue)}
        </p>
        <p className="mt-0.5 text-[10px] text-[#6f6a5e]">
          Jumlah yang harus masuk setiap bulan agar target, biaya usaha, dan tabungan terpenuhi.
        </p>
        <div className="mt-3 divide-y divide-[#e3e0d8] text-[11px]">
          <DocRow label="Target pendapatan" value={formatCurrency(data.targetIncome)} />
          <DocRow label="Biaya usaha" value={formatCurrency(data.expenses)} />
          <DocRow label={`Tabungan (${data.savingsPct}%)`} value={formatCurrency(result.savings)} />
          <DocRow label="Pendapatan minimum" value={formatCurrency(result.minRevenue)} strong />
        </div>
      </div>

      {/* flow chain */}
      <p className="mb-1.5 mt-5 text-[9px] font-bold uppercase tracking-wider text-[#e8620c]">Alur Penghitungan</p>
      <div className="flex items-center gap-1">
        <DocFlowItem label="Target Pendapatan" value={formatCurrency(data.targetIncome)} />
        <DocChevron />
        <DocFlowItem label="Pendapatan Minimum" value={formatCurrency(result.minRevenue)} />
        <DocChevron />
        <DocFlowItem label="Proyek / Bulan" value={`${data.projectsPerMonth} proyek`} />
        <DocChevron />
        <DocFlowItem label="Harga Min / Proyek" value={formatCurrency(result.minProject)} />
      </div>

      {/* tariff minimum */}
      <p className="mb-1.5 mt-5 text-[9px] font-bold uppercase tracking-wider text-[#e8620c]">Tarif Minimum</p>
      <div className="grid grid-cols-3 gap-3">
        <DocTarifCard label="Tarif per jam" value={formatCurrency(result.minHourly)} sub={productiveText} />
        <DocTarifCard label="Tarif per hari" value={formatCurrency(result.minDaily)} sub={`${data.workDays} hari kerja / bulan`} />
        <DocTarifCard label="Harga min. per proyek" value={formatCurrency(result.minProject)} sub={`${data.projectsPerMonth} proyek / bulan`} />
      </div>

      {/* note */}
      <p className="mb-1.5 mt-5 text-[9px] font-bold uppercase tracking-wider text-[#e8620c]">Catatan</p>
      <p className="text-[10px] leading-relaxed text-[#6f6a5e]">
        Angka di atas adalah harga minimum. Belum termasuk kenaikan untuk kompleksitas, keahlian khusus, atau kondisi
        pasar.
      </p>
    </div>
  );
}

function DocRow({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 py-1.5">
      <span className="text-[#6f6a5e]">{label}</span>
      <span className={`tabular ${strong ? "font-semibold text-[#2b2823]" : "text-[#2b2823]"}`}>{value}</span>
    </div>
  );
}

function DocChevron() {
  return (
    <span className="hidden shrink-0 text-[#9a9488] sm:flex">
      <Icon name="chevron" className="size-3.5" />
    </span>
  );
}

function DocFlowItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 flex-1 rounded-md border border-[#e3e0d8] bg-[#f7f5f0] px-2.5 py-2">
      <p className="text-[8px] font-medium uppercase tracking-wide text-[#9a9488]">{label}</p>
      <p className="mt-0.5 truncate text-[12px] font-semibold tabular text-[#2b2823]">{value}</p>
    </div>
  );
}

function DocTarifCard({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="rounded-lg border border-[#e3e0d8] bg-white p-3">
      <p className="text-[8.5px] font-semibold uppercase tracking-wide text-[#6f6a5e]">{label}</p>
      <p className="mt-1 text-[16px] font-bold tabular text-[#2b2823]">{value}</p>
      <p className="mt-0.5 text-[8.5px] text-[#9a9488]">{sub}</p>
    </div>
  );
}