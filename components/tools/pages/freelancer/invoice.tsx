"use client";

import { useMemo, useRef, useState } from "react";
import { DocWorkspace, DocActions } from "@/components/documents/doc-workspace";
import { DocModel, DocLine, blankDocLine, defaultNumber, docTotals } from "@/lib/documents/model";
import { Field, Input, MoneyInput, Textarea, Select, PhoneInput } from "@/components/ui/fields";
import { Button, IconButton } from "@/components/ui/button";
import { Icon } from "@/components/icons";
import { Divider, SectionTitle } from "@/components/ui/card";
import { formatCurrency, todayISO } from "@/lib/format";
import { money } from "@/lib/money";
import { useToast } from "@/components/ui/toast";
import { fileToDataURL } from "@/lib/image";

const TOOL_ID = "invoice";

const SERVICE_PRESETS = ["Website", "Design", "Video", "Photography", "Consultation", "Maintenance", "Custom service"];

interface MilestoneLine {
  id: string;
  label: string;
  amount: number;
}

type InvoiceModel = DocModel & {
  project?: string;
  dp?: number;
  milestones?: MilestoneLine[];
};

function uid(): string {
  return typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`;
}

function blankModel(): InvoiceModel {
  return {
    $kind: "invoice",
    number: defaultNumber("invoice"),
    date: todayISO(),
    dueDate: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
    status: "draft",
    business: { name: "", address: "", phone: "", email: "", paymentInfo: "" },
    customer: { name: "", company: "", address: "", phone: "", email: "" },
    lines: [blankDocLine()],
    discount: 0,
    taxPct: 0,
    taxLabel: "PPN",
    shipping: 0,
    note: "",
    footer: "",
    paymentMethod: "Transfer bank",
    project: "",
    dp: 0,
    milestones: [],
  };
}

export default function FreelancerInvoiceTool() {
  const [model, setModel] = useState<InvoiceModel>(blankModel());
  const [serviceSel, setServiceSel] = useState("");
  const { toast } = useToast();

  const totals = docTotals(model);
  const remaining = money(Math.max(0, totals.total - (model.dp ?? 0)));

  const termsText = useMemo(() => {
    const parts: string[] = [];
    if (model.project?.trim()) parts.push(`Project: ${model.project.trim()}`);
    const ms = (model.milestones ?? []).filter((m) => m.label.trim());
    for (const m of ms) {
      parts.push(m.amount > 0 ? `${m.label.trim()} - ${formatCurrency(m.amount)}` : m.label.trim());
    }
    return parts.join("\n");
  }, [model.project, model.milestones]);

  if ((model.terms ?? "") !== termsText) {
    setModel({ ...model, terms: termsText });
  }

  const fileRef = useRef<HTMLInputElement>(null);

  const setLogo = async (file: File | undefined) => {
    if (!file) return;
    try {
      const url = await fileToDataURL(file);
      setModel({ ...model, business: { ...model.business, logo: url } });
      toast("Logo dimuat.");
    } catch {
      toast("Logo gagal dimuat. Coba file gambar lain.", "error");
    }
  };

  const addService = (preset: string) => {
    setServiceSel("");
    if (!preset || preset === "Custom service") return;
    setModel((prev) => ({ ...prev, lines: [...prev.lines, { id: uid(), name: preset, qty: 1, price: 0 }] }));
  };

  const addMilestone = () => {
    setModel((prev) => ({ ...prev, milestones: [...(prev.milestones ?? []), { id: uid(), label: "", amount: 0 }] }));
  };

  const fillMilestones = () => {
    setModel((prev) => ({
      ...prev,
      milestones: [
        { id: uid(), label: "DP 50%", amount: 0 },
        { id: uid(), label: "Progress 25%", amount: 0 },
        { id: uid(), label: "Final 25%", amount: 0 },
      ],
    }));
  };

  const updateMilestone = (id: string, patch: Partial<MilestoneLine>) => {
    setModel((prev) => ({
      ...prev,
      milestones: (prev.milestones ?? []).map((m) => (m.id === id ? { ...m, ...patch } : m)),
    }));
  };

  const removeMilestone = (id: string) => {
    setModel((prev) => ({ ...prev, milestones: (prev.milestones ?? []).filter((m) => m.id !== id) }));
  };

  return (
    <div className="space-y-4">
      <DocActions options={{ toolId: TOOL_ID, model, setModel, onNew: () => setModel(blankModel()) }} />
      <DocWorkspace
        options={{ toolId: TOOL_ID, model, setModel, onNew: () => setModel(blankModel()) }}
        editor={
          <>
            <section>
              <SectionTitle>Informasi Profesional</SectionTitle>
              <p className="mt-1 text-xs leading-relaxed text-ink-faint">
                Identitas pengirim invoice.
              </p>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <Field label="Logo (opsional)">
                    <div className="flex items-center gap-3">
                      {model.business.logo ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={model.business.logo} alt="Logo profesional" className="size-11 rounded border border-border object-contain" />
                      ) : (
                        <span className="flex size-11 items-center justify-center rounded border border-dashed border-border text-ink-faint">
                          <Icon name="image" className="size-5" />
                        </span>
                      )}
                      <Button variant="secondary" size="sm" onClick={() => fileRef.current?.click()}>
                        <Icon name="upload" className="size-3.5" />
                        {model.business.logo ? "Ganti" : "Pilih Logo"}
                      </Button>
                      {model.business.logo && (
                        <Button variant="ghost" size="sm" onClick={() => setModel({ ...model, business: { ...model.business, logo: undefined } })}>
                          Hapus
                        </Button>
                      )}
                      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => { setLogo(e.target.files?.[0]); e.target.value = ""; }} />
                    </div>
                  </Field>
                </div>
                <Field label="Nama" required>
                  <Input value={model.business.name} onChange={(e) => setModel({ ...model, business: { ...model.business, name: e.target.value } })} placeholder="cth. Andi Pratama" />
                </Field>
                <Field label="Telepon / WA">
                  <PhoneInput value={model.business.phone ?? ""} onChange={(v) => setModel({ ...model, business: { ...model.business, phone: v } })} />
                </Field>
                <Field label="Email">
                  <Input type="email" value={model.business.email ?? ""} onChange={(e) => setModel({ ...model, business: { ...model.business, email: e.target.value } })} />
                </Field>
                <Field label="Info rekening / pembayaran">
                  <Input value={model.business.paymentInfo ?? ""} onChange={(e) => setModel({ ...model, business: { ...model.business, paymentInfo: e.target.value } })} placeholder="cth. BCA 1234567 a.n. Andi Pratama" />
                </Field>
                <Field label="Alamat" className="sm:col-span-2">
                  <Textarea value={model.business.address ?? ""} onChange={(e) => setModel({ ...model, business: { ...model.business, address: e.target.value } })} className="min-h-14" />
                </Field>
              </div>
            </section>

            <Divider />

            <section>
              <SectionTitle>Client</SectionTitle>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <Field label="Nama" required>
                  <Input value={model.customer.name} onChange={(e) => setModel({ ...model, customer: { ...model.customer, name: e.target.value } })} />
                </Field>
                <Field label="Perusahaan / brand">
                  <Input value={model.customer.company ?? ""} onChange={(e) => setModel({ ...model, customer: { ...model.customer, company: e.target.value } })} />
                </Field>
                <Field label="Alamat" className="sm:col-span-2">
                  <Textarea value={model.customer.address ?? ""} onChange={(e) => setModel({ ...model, customer: { ...model.customer, address: e.target.value } })} className="min-h-14" />
                </Field>
                <Field label="Email">
                  <Input type="email" value={model.customer.email ?? ""} onChange={(e) => setModel({ ...model, customer: { ...model.customer, email: e.target.value } })} />
                </Field>
                <Field label="Telepon">
                  <PhoneInput value={model.customer.phone ?? ""} onChange={(v) => setModel({ ...model, customer: { ...model.customer, phone: v } })} />
                </Field>
              </div>
            </section>

            <Divider />

            <section>
              <SectionTitle>Invoice</SectionTitle>
              <div className="mt-4 grid gap-4 sm:grid-cols-3">
                <Field label="Nomor">
                  <Input value={model.number} onChange={(e) => setModel({ ...model, number: e.target.value })} />
                </Field>
                <Field label="Tanggal">
                  <Input type="date" value={model.date} onChange={(e) => setModel({ ...model, date: e.target.value })} />
                </Field>
                <Field label="Jatuh tempo">
                  <Input type="date" value={model.dueDate ?? ""} onChange={(e) => setModel({ ...model, dueDate: e.target.value })} />
                </Field>
                <Field label="Project">
                  <Input value={model.project ?? ""} onChange={(e) => setModel({ ...model, project: e.target.value })} placeholder="cth. Pembuatan landing page" />
                </Field>
                <Field label="Status">
                  <Select value={model.status ?? "draft"} onChange={(e) => setModel({ ...model, status: e.target.value as DocModel["status"] })}>
                    <option value="draft">Draft</option>
                    <option value="sent">Sent - Dikirim</option>
                    <option value="paid">Paid - Lunas</option>
                    <option value="overdue">Overdue - Lewat tempo</option>
                  </Select>
                </Field>
              </div>
            </section>

            <Divider />

            <section>
              <SectionTitle>Layanan</SectionTitle>
              <p className="mt-1 text-xs leading-relaxed text-ink-faint">
                Pilih preset jasa untuk menambah baris layanan, atau tulis layanan kustom.
              </p>
              <div className="mt-4 max-w-md">
                <Field label="Preset layanan">
                  <Select value={serviceSel} onChange={(e) => addService(e.target.value)}>
                    <option value="">- Pilih preset -</option>
                    {SERVICE_PRESETS.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </Select>
                </Field>
              </div>
              <div className="mt-4 space-y-2.5">
                {model.lines.map((line) => (
                  <ServiceRow
                    key={line.id}
                    line={line}
                    onChange={(patch) =>
                      setModel({
                        ...model,
                        lines: model.lines.map((l) => (l.id === line.id ? { ...l, ...patch } : l)),
                      })
                    }
                    onRemove={() =>
                      setModel({
                        ...model,
                        lines: model.lines.length > 1 ? model.lines.filter((l) => l.id !== line.id) : model.lines,
                      })
                    }
                  />
                ))}
                <Button variant="secondary" size="sm" onClick={() => setModel({ ...model, lines: [...model.lines, blankDocLine()] })}>
                  <Icon name="plus" className="size-3.5" />
                  Tambah layanan
                </Button>
              </div>
            </section>

            <Divider />

            <section>
              <SectionTitle>Milestone (opsional)</SectionTitle>
              <p className="mt-1 text-xs leading-relaxed text-ink-faint">
                Rinci pembayaran bertahap. Tampil di dokumen sebagai ketentuan pembayaran.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button variant="secondary" size="sm" onClick={fillMilestones}>
                  <Icon name="layers" className="size-3.5" />
                  Isi DP 50% / Progress 25% / Final 25%
                </Button>
                <Button variant="ghost" size="sm" onClick={addMilestone}>
                  <Icon name="plus" className="size-3.5" />
                  Tambah milestone
                </Button>
              </div>
              {(model.milestones ?? []).length > 0 && (
                <div className="mt-4 space-y-2.5">
                  {(model.milestones ?? []).map((ms) => (
                    <div key={ms.id} className="grid gap-2.5 sm:grid-cols-[1fr_8rem_auto] sm:items-end">
                      <Field label="Tahapan">
                        <Input value={ms.label} onChange={(e) => updateMilestone(ms.id, { label: e.target.value })} placeholder="cth. DP 50%" />
                      </Field>
                      <Field label="Jumlah (opsional)">
                        <MoneyInput value={ms.amount} onChange={(v) => updateMilestone(ms.id, { amount: v })} />
                      </Field>
                      <IconButton label="Hapus milestone" className="hover:text-danger" onClick={() => removeMilestone(ms.id)}>
                        <Icon name="trash" className="size-4" />
                      </IconButton>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <Divider />

            <section>
              <SectionTitle>Pembayaran</SectionTitle>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <Field label="DP diterima (Rp)" hint="Kurangi dari total invoice untuk melihat sisa pembayaran.">
                  <MoneyInput value={model.dp ?? 0} onChange={(v) => setModel({ ...model, dp: Math.max(0, v) })} />
                </Field>
                <Field label="Metode pembayaran">
                  <Input value={model.paymentMethod ?? ""} onChange={(e) => setModel({ ...model, paymentMethod: e.target.value })} />
                </Field>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-3">
                <div className="rounded-lg border border-border bg-surface-muted/40 p-3">
                  <p className="text-[11px] font-medium uppercase tracking-wide text-ink-faint">Total invoice</p>
                  <p className="mt-1 text-lg font-semibold tabular text-ink">{formatCurrency(totals.total)}</p>
                </div>
                <div className="rounded-lg border border-border bg-surface-muted/40 p-3">
                  <p className="text-[11px] font-medium uppercase tracking-wide text-ink-faint">DP dibayar</p>
                  <p className="mt-1 text-lg font-semibold tabular text-ink">{formatCurrency(model.dp ?? 0)}</p>
                </div>
                <div className="rounded-lg border border-accent/40 bg-accent-soft p-3">
                  <p className="text-[11px] font-medium uppercase tracking-wide text-accent-strong">Sisa pembayaran</p>
                  <p className="mt-1 text-lg font-semibold tabular text-accent-strong">{formatCurrency(remaining)}</p>
                </div>
              </div>
            </section>

            <Divider />

            <section>
              <SectionTitle>Catatan</SectionTitle>
              <div className="mt-4 grid gap-4">
                <Field label="Catatan untuk client">
                  <Textarea value={model.note ?? ""} onChange={(e) => setModel({ ...model, note: e.target.value })} placeholder="cth. Terima kasih atas kerja samanya." className="min-h-20" />
                </Field>
                <Field label="Footer dokumen (opsional)">
                  <Input value={model.footer ?? ""} onChange={(e) => setModel({ ...model, footer: e.target.value })} placeholder="cth. Pembayaran dianggap sah setelah dana masuk ke rekening." />
                </Field>
              </div>
            </section>
          </>
        }
      />
    </div>
  );
}

function ServiceRow({
  line,
  onChange,
  onRemove,
}: {
  line: DocLine;
  onChange: (patch: Partial<DocLine>) => void;
  onRemove: () => void;
}) {
  return (
    <div className="rounded-md border border-border bg-surface-muted/40 p-3.5">
      <div className="grid gap-2.5 sm:grid-cols-[2fr_1fr_7rem_8rem_auto] sm:items-end">
        <Field label="Jasa / layanan">
          <Input value={line.name} onChange={(e) => onChange({ name: e.target.value })} placeholder="cth. Desain landing page" />
        </Field>
        <Field label="Qty">
          <Input type="number" min={0} value={line.qty || ""} onChange={(e) => onChange({ qty: Math.max(0, Number(e.target.value)) })} className="text-right" />
        </Field>
        <Field label="Harga satuan">
          <MoneyInput value={line.price} onChange={(v) => onChange({ price: v })} />
        </Field>
        <div className="pb-2 text-right text-[13px]">
          <p className="text-[11px] text-ink-faint">Jumlah</p>
          <p className="font-semibold tabular text-ink">{formatCurrency(line.qty * line.price)}</p>
        </div>
        <IconButton label="Hapus layanan" className="hover:text-danger" onClick={onRemove}>
          <Icon name="trash" className="size-4" />
        </IconButton>
      </div>
      <div className="mt-2.5">
        <Field label="Deskripsi detail (opsional)">
          <Input value={line.description ?? ""} onChange={(e) => onChange({ description: e.target.value })} placeholder="cth. Termasuk copywriting dan 2 revisi." />
        </Field>
      </div>
    </div>
  );
}