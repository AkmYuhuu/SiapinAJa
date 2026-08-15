"use client";

import { useMemo, useState } from "react";
import { CalcWorkspace, MainResult, ProjectActions, Note, ResultPanel } from "@/components/tools/tool-shell";
import { useProject } from "@/components/tools/use-project";
import { Field, Input, MoneyInput, PercentInput, Select } from "@/components/ui/fields";
import { SegmentedControl } from "@/components/ui/tabs";
import { Divider, SectionTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty";
import { Icon } from "@/components/icons";
import { formatCurrency } from "@/lib/format";
import { moneyMul, moneySum, priceFromMarkup } from "@/lib/money";

const TOOL_ID = "freelancer-price";

type Unit = "jam" | "hari";
type Complexity = "low" | "medium" | "high";
type Urgency = "normal" | "cepat" | "sangat-cepat";

interface HargaJasaData {
  jenis: string;
  customName: string;
  unit: Unit;
  time: number;
  rate: number;
  complexity: Complexity;
  revisions: number;
  urgency: Urgency;
  operational: number;
  thirdParty: number;
  profitPct: number;
}

const initialData: HargaJasaData = {
  jenis: "website",
  customName: "",
  unit: "hari",
  time: 5,
  rate: 0,
  complexity: "medium",
  revisions: 2,
  urgency: "normal",
  operational: 0,
  thirdParty: 0,
  profitPct: 30,
};

const JENIS_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "website", label: "Website / Web App" },
  { value: "landing-page", label: "Landing Page" },
  { value: "graphic-design", label: "Graphic Design" },
  { value: "logo", label: "Logo / Branding" },
  { value: "photo", label: "Fotografi" },
  { value: "video", label: "Video" },
  { value: "editing", label: "Editing" },
  { value: "social-media", label: "Social Media Management" },
  { value: "copywriting", label: "Copywriting" },
  { value: "development", label: "Development / Coding" },
  { value: "custom", label: "Custom / Lainnya" },
];

const COMPLEXITY_MULT: Record<Complexity, number> = { low: 1, medium: 1.15, high: 1.35 };
const URGENCY_PCT: Record<Urgency, number> = { normal: 0, cepat: 10, "sangat-cepat": 20 };

export default function HargaJasaTool() {
  const [data, setData] = useState<HargaJasaData>(initialData);
  const project = useProject({ toolId: TOOL_ID, getData: () => data });

  const [loadedId, setLoadedId] = useState<string | null>(null);
  const current = project.current;
  if (current && current.id !== loadedId) {
    setLoadedId(current.id);
    const d = current.data as HargaJasaData | null;
    if (d && typeof d === "object") {
      setData({ ...initialData, ...d });
    }
  }

  const set = (patch: Partial<HargaJasaData>) => setData((s) => ({ ...s, ...patch }));

  const result = useMemo(() => {
    const base = moneyMul(data.rate, data.time);
    const baseAdjusted = moneyMul(base, COMPLEXITY_MULT[data.complexity]);
    const revisionCost = data.revisions > 0 ? moneyMul(baseAdjusted, data.revisions * 0.05) : 0;
    const urgencyCost = moneyMul(baseAdjusted, URGENCY_PCT[data.urgency] / 100);
    const operational = moneySum([data.operational, data.thirdParty]);
    const subtotal = moneySum([baseAdjusted, revisionCost, urgencyCost, operational]);
    const suggested = priceFromMarkup(subtotal, data.profitPct);
    const low = moneyMul(suggested, 0.88);
    const high = moneyMul(suggested, 1.12);
    const profit = suggested - subtotal;
    return { base, baseAdjusted, revisionCost, urgencyCost, operational, subtotal, suggested, low, high, profit };
  }, [data]);

  const validation: string[] = [];
  if (data.time <= 0) validation.push("Estimasi waktu harus lebih dari 0.");
  if (data.rate <= 0) validation.push("Tarif harus diisi terlebih dahulu.");
  const valid = validation.length === 0;

  const jenisLabel =
    data.jenis === "custom" && data.customName.trim()
      ? data.customName
      : JENIS_OPTIONS.find((o) => o.value === data.jenis)?.label ?? data.jenis;
  const timeLabel = data.unit === "hari" ? "hari" : "jam";
  const complexityLabel = { low: "Rendah", medium: "Sedang", high: "Tinggi" }[data.complexity];
  const urgencyLabel = { normal: "Normal", cepat: "Cepat", "sangat-cepat": "Sangat Cepat" }[data.urgency];

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
              <SectionTitle>Jasa</SectionTitle>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <Field label="Jenis jasa">
                  <Select value={data.jenis} onChange={(e) => set({ jenis: e.target.value })}>
                    {JENIS_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </Select>
                </Field>
                {data.jenis === "custom" && (
                  <Field label="Nama jasa custom">
                    <Input
                      value={data.customName}
                      onChange={(e) => set({ customName: e.target.value })}
                      placeholder="cth. Motion Graphics"
                    />
                  </Field>
                )}
                <Field label="Kompleksitas">
                  <Select value={data.complexity} onChange={(e) => set({ complexity: e.target.value as Complexity })}>
                    <option value="low">Rendah</option>
                    <option value="medium">Sedang</option>
                    <option value="high">Tinggi</option>
                  </Select>
                </Field>
                <Field label="Urgensi / deadline">
                  <Select value={data.urgency} onChange={(e) => set({ urgency: e.target.value as Urgency })}>
                    <option value="normal">Normal</option>
                    <option value="cepat">Cepat (+10%)</option>
                    <option value="sangat-cepat">Sangat Cepat (+20%)</option>
                  </Select>
                </Field>
              </div>
            </section>

            <Divider />

            <section>
              <SectionTitle>Waktu & tarif</SectionTitle>
              <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                <SegmentedControl
                  options={[
                    { value: "jam", label: "Per jam" },
                    { value: "hari", label: "Per hari" },
                  ]}
                  value={data.unit}
                  onChange={(v) => set({ unit: v })}
                />
              </div>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <Field label={data.unit === "hari" ? "Estimasi hari" : "Estimasi jam"}>
                  <Input
                    type="number"
                    min={0}
                    value={data.time || ""}
                    onChange={(e) => set({ time: Math.max(0, Number(e.target.value)) })}
                  />
                </Field>
                <Field label={data.unit === "hari" ? "Tarif per hari" : "Tarif per jam"}>
                  <MoneyInput value={data.rate} onChange={(v) => set({ rate: v })} />
                </Field>
                <Field label="Jumlah revisi" hint="5% dari tarif dasar per revisi">
                  <Input
                    type="number"
                    min={0}
                    value={data.revisions || ""}
                    onChange={(e) => set({ revisions: Math.max(0, Number(e.target.value)) })}
                  />
                </Field>
              </div>
            </section>

            <Divider />

            <section>
              <SectionTitle>Biaya & target profit</SectionTitle>
              <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
                <Field label="Biaya operasional">
                  <MoneyInput value={data.operational} onChange={(v) => set({ operational: v })} />
                </Field>
                <Field label="Biaya pihak ketiga">
                  <MoneyInput value={data.thirdParty} onChange={(v) => set({ thirdParty: v })} />
                </Field>
                <Field label="Target profit (%)" hint="Markup di atas total biaya">
                  <PercentInput value={data.profitPct} onChange={(v) => set({ profitPct: v })} />
                </Field>
              </div>
            </section>
          </>
        }
        result={
          <>
            {!valid ? (
              <EmptyState
                icon={<Icon name="coins" className="size-5" />}
                title="Lengkapi angka dulu"
                description={validation[0] ?? "Isi estimasi waktu dan tarif agar harga bisa dihitung."}
              />
            ) : (
              <>
                <MainResult
                  label="Rekomendasi Harga"
                  value={`${formatCurrency(result.low)} – ${formatCurrency(result.high)}`}
                  valueSub={`Rekomendasi tengah: ${formatCurrency(result.suggested)}`}
                  rows={[
                    { label: `Biaya dasar (${data.time} ${timeLabel} × ${formatCurrency(data.rate)})`, value: formatCurrency(result.base) },
                    { label: `Penyesuaian kompleksitas (${complexityLabel})`, value: formatCurrency(result.baseAdjusted) },
                    { label: "Biaya revisi", value: formatCurrency(result.revisionCost) },
                    { label: `Biaya tambahan (${urgencyLabel})`, value: formatCurrency(result.urgencyCost) },
                    { label: "Biaya operasional & pihak ketiga", value: formatCurrency(result.operational) },
                    { label: "Total biaya", value: formatCurrency(result.subtotal), strong: true },
                    { label: `Target profit (${data.profitPct}%)`, value: formatCurrency(result.profit) },
                  ]}
                />

                <ResultPanel title="Asumsi tarif">
                  <div className="divide-y divide-border/70">
                    {[
                      { label: "Jenis jasa", value: jenisLabel },
                      { label: "Estimasi", value: `${data.time} ${timeLabel}` },
                      { label: "Kompleksitas", value: complexityLabel },
                      { label: "Revisi", value: `${data.revisions}x` },
                      { label: "Urgensi", value: urgencyLabel },
                    ].map((r) => (
                      <div key={r.label} className="flex items-center justify-between gap-3 py-1.5 text-[13px]">
                        <span className="text-ink-secondary">{r.label}</span>
                        <span className="tabular text-ink">{r.value}</span>
                      </div>
                    ))}
                  </div>
                </ResultPanel>

                <Note>
                  Kisaran ±12% di sekitar harga tengah. Sesuaikan dengan posisi, portofolio, dan persepsi nilai klien.
                </Note>
              </>
            )}
          </>
        }
      />
    </div>
  );
}