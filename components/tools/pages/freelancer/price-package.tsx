"use client";

import { useMemo, useState } from "react";
import { CalcWorkspace, ErrorBox, Note, ProjectActions } from "@/components/tools/tool-shell";
import { useProject } from "@/components/tools/use-project";
import { Field, Input, MoneyInput, Textarea } from "@/components/ui/fields";
import { Button, IconButton } from "@/components/ui/button";
import { Divider, SectionTitle } from "@/components/ui/card";
import { Icon } from "@/components/icons";
import { formatCurrency } from "@/lib/format";
import { todayISO } from "@/lib/format";
import { downloadJSON } from "@/lib/export";
import { exportDocPdf, getDocNode } from "@/lib/documents/html-export";
import { useToast } from "@/components/ui/toast";

const TOOL_ID = "price-package";

interface Tier {
  id: string;
  name: string;
  price: number;
  delivery: string;
  revisions: number;
  features: string[];
  addons: string[];
}

interface PricePackageData {
  businessName: string;
  title: string;
  number: string;
  terms: string;
  tiers: Tier[];
}

function uid(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Date.now().toString(36) + Math.random().toString(36).slice(2);
}

function blankData(): PricePackageData {
  return {
    businessName: "",
    title: "Daftar Harga Jasa",
    number: `PL-${todayISO().replace(/-/g, "")}`,
    terms: "Harga berlaku selama masa penawaran. Tidak termasuk biaya pihak ketiga kecuali disebutkan.",
    tiers: [
      {
        id: uid(),
        name: "Basic",
        price: 500000,
        delivery: "3 hari",
        revisions: 1,
        features: ["1 konsep desain", "1x revisi", "File source"],
        addons: [],
      },
      {
        id: uid(),
        name: "Standard",
        price: 1000000,
        delivery: "5 hari",
        revisions: 3,
        features: ["3 konsep desain", "3x revisi", "File source", "Support 30 hari"],
        addons: [],
      },
      {
        id: uid(),
        name: "Premium",
        price: 2000000,
        delivery: "7 hari",
        revisions: 5,
        features: ["5 konsep desain", "5x revisi", "File source", "Support 90 hari", "Pengerjaan prioritas"],
        addons: [],
      },
    ],
  };
}

const TIER_KEYS = ["basic", "standard", "premium"] as const;

function deliveryDays(s: string): number {
  const m = /(\d+(?:[.,]\d+)?)/.exec(s);
  return m ? Number(m[0].replace(",", ".")) : Number.NaN;
}

export default function PricePackageTool() {
  const { toast } = useToast();
  const [data, setData] = useState<PricePackageData>(blankData);
  const project = useProject({ toolId: TOOL_ID, getData: () => data });

  const [loadedId, setLoadedId] = useState<string | null>(null);
  const current = project.current;
  if (current && current.id !== loadedId) {
    setLoadedId(current.id);
    const d = current.data as PricePackageData | null;
    if (d && typeof d === "object" && Array.isArray(d.tiers) && d.tiers.length === 3) {
      setData({
        ...blankData(),
        ...d,
        tiers: d.tiers.map((t) => ({
          id: typeof t.id === "string" ? t.id : uid(),
          name: typeof t.name === "string" ? t.name : "",
          price: typeof t.price === "number" ? t.price : 0,
          delivery: typeof t.delivery === "string" ? t.delivery : "",
          revisions: typeof t.revisions === "number" ? t.revisions : 0,
          features: Array.isArray(t.features) ? t.features.filter((f) => typeof f === "string") : [],
          addons: Array.isArray(t.addons) ? t.addons.filter((a) => typeof a === "string") : [],
        })),
      });
    }
  }

  const set = (patch: Partial<PricePackageData>) => setData((s) => ({ ...s, ...patch }));
  const setTier = (id: string, patch: Partial<Tier>) =>
    setData((s) => ({ ...s, tiers: s.tiers.map((t) => (t.id === id ? { ...t, ...patch } : t)) }));

  const featureCount = (t: Tier) => t.features.filter((f) => f.trim()).length;

  const { errors, warnings } = useMemo(() => {
    const errors: string[] = [];
    const warnings: string[] = [];
    const [basic, standard, premium] = data.tiers;

    const emptyPrice = data.tiers.filter((t) => t.price <= 0).map((t) => t.name || "Paket tanpa nama");
    if (emptyPrice.length) errors.push(`Harga belum diisi untuk: ${emptyPrice.join(", ")}.`);

    if (featureCount(standard) <= featureCount(basic))
      warnings.push("Jumlah fitur Standard tidak lebih banyak dari Basic - susunan paket terlihat tidak seimbang.");
    if (featureCount(premium) <= featureCount(basic))
      warnings.push("Jumlah fitur Premium tidak lebih banyak dari Basic - paket bertingkat kurang meyakinkan.");

    if (basic.price > 0 && premium.price > 0 && premium.price < basic.price)
      warnings.push("Harga Premium lebih rendah dari Basic. Biasanya paket tertinggi lebih mahal.");
    if (basic.price > 0 && standard.price > 0 && standard.price < basic.price)
      warnings.push("Harga Standard lebih rendah dari Basic. Periksa kembali urutan harga paket.");

    const dBasic = deliveryDays(basic.delivery);
    const dPremium = deliveryDays(premium.delivery);
    if (Number.isFinite(dPremium) && Number.isFinite(dBasic)) {
      if (dPremium > dBasic)
        warnings.push("Waktu pengerjaan Premium lebih lama dari Basic - paket tertinggi biasanya diproses lebih dulu.");
      if (dPremium < dBasic)
        warnings.push("Waktu pengerjaan Premium lebih cepat dari Basic - pastikan memang sesuai layanan.");
    }
    const noDelivery = data.tiers.filter((t) => !t.delivery.trim()).map((t) => t.name || "paket");
    if (noDelivery.length) warnings.push(`Waktu pengerjaan belum diisi untuk: ${noDelivery.join(", ")}.`);

    return { errors, warnings };
  }, [data]);

  const safeName = (data.number || "price-list").replace(/[^\w\- ]/g, "").trim() || "price-list";

  const exportPdf = async () => {
    if (errors.length) {
      toast(errors[0], "error");
      return;
    }
    try {
      const node = getDocNode();
      if (!node) {
        toast("Pratinjau klien belum siap. Coba lagi.", "error");
        return;
      }
      await exportDocPdf(node, safeName);
      toast("PDF daftar harga siap diunduh.");
    } catch {
      toast("PDF gagal dibuat. Coba lagi.", "error");
    }
  };

  const exportJson = () => {
    downloadJSON({ ...data }, `${safeName}.json`);
    toast("File JSON siap diunduh.");
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
        onNew={() => setData(blankData())}
      />

      <CalcWorkspace
        input={
          <>
            <section>
              <SectionTitle>Informasi daftar harga</SectionTitle>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <Field label="Nama bisnis">
                  <Input
                    value={data.businessName}
                    onChange={(e) => set({ businessName: e.target.value })}
                    placeholder="cth. Studio Nusantara"
                  />
                </Field>
                <Field label="Nomor daftar harga">
                  <Input value={data.number} onChange={(e) => set({ number: e.target.value })} />
                </Field>
                <Field label="Judul daftar harga" className="sm:col-span-2">
                  <Input
                    value={data.title}
                    onChange={(e) => set({ title: e.target.value })}
                    placeholder="cth. Daftar Harga Desain & Pengembangan"
                  />
                </Field>
              </div>
            </section>

            <Divider />

            <section>
              <SectionTitle>Paket</SectionTitle>
              <div className="mt-3 space-y-3">
                {data.tiers.map((tier, ti) => (
                  <TierEditor
                    key={tier.id}
                    tier={tier}
                    highlight={TIER_KEYS[ti] === "standard"}
                    onChange={(patch) => setTier(tier.id, patch)}
                  />
                ))}
              </div>
            </section>

            <Divider />

            <Field label="Syarat & ketentuan" hint="Tercetak di PDF">
              <Textarea value={data.terms} onChange={(e) => set({ terms: e.target.value })} />
            </Field>
          </>
        }
        result={
          <>
            {errors.length > 0 && <ErrorBox>{errors[0]}</ErrorBox>}
            {warnings.map((w, i) => (
              <Note key={i} tone="warning">
                {w}
              </Note>
            ))}

            <div className="rounded-lg border border-border bg-surface p-4">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-3 print-hide">
                <div>
                  <h2 className="text-[13px] font-semibold uppercase tracking-wide text-ink-secondary">Pratinjau klien</h2>
                  <p className="mt-0.5 text-xs text-ink-faint">
                    Tampilan yang siap dikirim ke klien. PDF mengikuti pratinjau ini.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button size="sm" onClick={exportPdf}>
                    <Icon name="download" className="size-3.5" />
                    Unduh PDF
                  </Button>
                  <Button size="sm" variant="secondary" onClick={exportJson}>
                    <Icon name="download" className="size-3.5" />
                    JSON
                  </Button>
                </div>
              </div>

              <div className="print-area min-w-0 overflow-x-auto scroll-thin">
                <PriceListDoc data={data} />
              </div>
            </div>
          </>
        }
      />
    </div>
  );
}

function TierEditor({
  tier,
  highlight,
  onChange,
}: {
  tier: Tier;
  highlight: boolean;
  onChange: (patch: Partial<Tier>) => void;
}) {
  return (
    <div className={`rounded-md border bg-surface-muted/40 p-3 ${highlight ? "border-accent/40" : "border-border"}`}>
      <div className="grid gap-2 sm:grid-cols-[1fr_1fr]">
        <Field label="Nama paket">
          <Input value={tier.name} onChange={(e) => onChange({ name: e.target.value })} placeholder="cth. Basic" />
        </Field>
        <Field label="Harga">
          <MoneyInput value={tier.price} onChange={(v) => onChange({ price: v })} />
        </Field>
        <Field label="Waktu pengerjaan">
          <Input
            value={tier.delivery}
            onChange={(e) => onChange({ delivery: e.target.value })}
            placeholder="cth. 3 hari"
          />
        </Field>
        <Field label="Jumlah revisi">
          <Input
            type="number"
            min={0}
            value={tier.revisions || ""}
            onChange={(e) => onChange({ revisions: Math.max(0, Number(e.target.value)) })}
          />
        </Field>
      </div>

      <Field label="Fitur" className="mt-3">
        <div className="space-y-1.5">
          {tier.features.map((f, fi) => (
            <div key={fi} className="flex items-center gap-2">
              <Input
                value={f}
                onChange={(e) => onChange({ features: tier.features.map((x, xi) => (xi === fi ? e.target.value : x)) })}
                placeholder="Fitur…"
                aria-label="Fitur"
              />
              <IconButton
                label="Hapus fitur"
                className="shrink-0 hover:text-danger"
                onClick={() => onChange({ features: tier.features.filter((_, xi) => xi !== fi) })}
              >
                <Icon name="trash" className="size-3.5" />
              </IconButton>
            </div>
          ))}
        </div>
        <Button
          variant="secondary"
          size="sm"
          className="mt-2"
          onClick={() => onChange({ features: [...tier.features, ""] })}
        >
          <Icon name="plus" className="size-3.5" />
          Tambah fitur
        </Button>
      </Field>

      <Field label="Add-on (opsional)" className="mt-3">
        <div className="space-y-1.5">
          {tier.addons.map((a, ai) => (
            <div key={ai} className="flex items-center gap-2">
              <span className="text-ink-faint">+</span>
              <Input
                value={a}
                onChange={(e) => onChange({ addons: tier.addons.map((x, xi) => (xi === ai ? e.target.value : x)) })}
                placeholder="Add-on…"
                aria-label="Add-on"
              />
              <IconButton
                label="Hapus add-on"
                className="shrink-0 hover:text-danger"
                onClick={() => onChange({ addons: tier.addons.filter((_, xi) => xi !== ai) })}
              >
                <Icon name="trash" className="size-3.5" />
              </IconButton>
            </div>
          ))}
        </div>
        <Button
          variant="secondary"
          size="sm"
          className="mt-2"
          onClick={() => onChange({ addons: [...tier.addons, ""] })}
        >
          <Icon name="plus" className="size-3.5" />
          Tambah add-on
        </Button>
      </Field>
    </div>
  );
}

function PriceListDoc({ data }: { data: PricePackageData }) {
  const highlightIdx = 1;
  const tiers = data.tiers;
  return (
    <div className="doc-page border border-border shadow-[0_8px_24px_rgba(43,40,35,0.08)]">
      {/* header */}
      <div className="flex items-start justify-between gap-6">
        <div>
          <p className="text-[16px] font-bold" style={{ fontFamily: "var(--font-plus-jakarta)" }}>
            {data.businessName || "Bisnis Saya"}
          </p>
        </div>
        <div className="text-right">
          <p className="text-[15px] font-bold tracking-wide" style={{ fontFamily: "var(--font-plus-jakarta)" }}>
            Daftar Harga Jasa
          </p>
          <p className="text-[11px] text-[#6f6a5e]">{data.number}</p>
          <p className="mt-1 text-[10px]">
            Tanggal: <span className="font-medium">{todayISO()}</span>
          </p>
        </div>
      </div>

      <div className="mt-5 border-t-2 border-[#e8620c]" />

      {data.title.trim() && (
        <p className="mt-4 border-b-2 border-[#e8620c] pb-2 text-[15px] font-bold">{data.title.trim()}</p>
      )}

      {/* tier cards */}
      <div className="mt-4 grid grid-cols-3 gap-3">
        {tiers.map((tier, i) => {
          const isHighlight = i === highlightIdx;
          const features = tier.features.filter((f) => f.trim());
          const addons = tier.addons.filter((a) => a.trim());
          return (
            <div
              key={tier.id}
              className={`flex flex-col rounded-lg border p-3 ${
                isHighlight ? "border-[#e8620c] bg-[#fdf6ee]" : "border-[#e3e0d8] bg-white"
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <p className="text-[11px] font-bold uppercase tracking-wide">{tier.name || "Paket"}</p>
                {isHighlight && (
                  <span className="rounded-full bg-[#e8620c] px-2 py-0.5 text-[8px] font-semibold uppercase tracking-wide text-white">
                    Paling Populer
                  </span>
                )}
              </div>
              <p className="mt-1.5 text-[18px] font-bold tracking-tight tabular">
                {tier.price > 0 ? formatCurrency(tier.price) : "-"}
              </p>
              <div className="mt-1.5 space-y-0.5 text-[9px] text-[#6f6a5e]">
                <p>{tier.delivery || "Waktu pengerjaan belum diisi"}</p>
                <p>{tier.revisions} revisi</p>
              </div>
              <ul className="mt-2.5 flex-1 space-y-1">
                {features.map((f, fi) => (
                  <li key={fi} className="flex items-start gap-1 text-[9.5px] leading-snug text-[#2b2823]">
                    <svg viewBox="0 0 12 12" className="mt-px size-2.5 shrink-0 text-[#e8620c]" fill="none" aria-hidden>
                      <path d="M2 6.5L4.5 9L10 3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    {f}
                  </li>
                ))}
                {features.length === 0 && <li className="text-[9px] text-[#9a9488]">Belum ada fitur.</li>}
              </ul>
              {addons.length > 0 && (
                <div className="mt-2.5 space-y-1 border-t border-[#e3e0d8] pt-2">
                  {addons.map((a, ai) => (
                    <p key={ai} className="text-[8.5px] text-[#9a9488]">
                      + {a}
                    </p>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {data.terms.trim() && (
        <>
          <p className="mb-1.5 mt-5 text-[9px] font-bold uppercase tracking-wider text-[#e8620c]">Ketentuan</p>
          <p className="whitespace-pre-line text-[9.5px] leading-relaxed text-[#6f6a5e]">{data.terms.trim()}</p>
        </>
      )}
    </div>
  );
}