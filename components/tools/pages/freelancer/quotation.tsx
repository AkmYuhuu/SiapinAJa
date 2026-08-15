"use client";

import { useEffect, useRef, useState } from "react";
import { DocWorkspace, DocActions } from "@/components/documents/doc-workspace";
import { DocModel, DocLine, blankDocLine, defaultNumber } from "@/lib/documents/model";
import { Field, Input, MoneyInput, Textarea, Select, PhoneInput } from "@/components/ui/fields";
import { Button, IconButton } from "@/components/ui/button";
import { Icon } from "@/components/icons";
import { Divider, SectionTitle } from "@/components/ui/card";
import { formatCurrency, todayISO } from "@/lib/format";
import { listProjects, getProject } from "@/lib/projects";
import { useToast } from "@/components/ui/toast";
import { fileToDataURL } from "@/lib/image";

const TOOL_ID = "quotation";

const VALIDITY_OPTIONS = ["Berlaku 7 hari", "Berlaku 14 hari", "Berlaku 30 hari", "Berlaku 60 hari", "Penawaran khusus"];

function uid(): string {
  return typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`;
}

function toNum(v: unknown): number {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
}

function pickString(o: Record<string, unknown>, keys: string[]): string {
  for (const k of keys) {
    const v = o[k];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return "";
}

function linesFromPackage(data: unknown): DocLine[] {
  const d = (data ?? {}) as Record<string, unknown>;
  const src = [d.packages, d.tiers, d.items, d.services, d.lines].find((s) => Array.isArray(s)) as unknown[] | undefined;
  if (!src || src.length === 0) return [];
  return src
    .map((raw): DocLine | null => {
      if (typeof raw !== "object" || raw === null) return null;
      const o = raw as Record<string, unknown>;
      const name = pickString(o, ["name", "nama", "title", "service", "item"]);
      const price = toNum(o.price ?? o.harga ?? o.amount);
      if (!name && price === 0) return null;
      const line: DocLine = { id: uid(), name, qty: toNum(o.qty ?? o.quantity) || 1, price };
      const description = pickString(o, ["description", "desc", "detail", "catatan"]);
      if (description) line.description = description;
      return line;
    })
    .filter((l): l is DocLine => l !== null);
}

function blankModel(): DocModel {
  return {
    $kind: "quotation",
    number: defaultNumber("quotation"),
    date: todayISO(),
    dueDate: new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10),
    validity: "Berlaku 14 hari",
    status: "draft",
    business: { name: "", address: "", phone: "", email: "" },
    customer: { name: "", company: "", address: "", phone: "", email: "" },
    lines: [blankDocLine()],
    discount: 0,
    taxPct: 0,
    taxLabel: "PPN",
    shipping: 0,
    terms: "",
    note: "",
    footer: "",
    paymentMethod: "",
  };
}

export default function QuotationTool() {
  const [model, setModel] = useState<DocModel>(blankModel());
  const [packages, setPackages] = useState<Array<{ id: string; name: string }>>([]);
  const { toast } = useToast();

  useEffect(() => {
    listProjects("price-package")
      .then((list) => setPackages(list.map((p) => ({ id: p.id, name: p.name }))))
      .catch(() => setPackages([]));
  }, []);

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

  const applyPackage = async (id: string) => {
    if (!id) return;
    const project = await getProject(id);
    const lines = linesFromPackage(project?.data);
    if (lines.length === 0) {
      toast("Paket tidak memiliki layanan yang bisa diisi ke quotation.", "error");
      return;
    }
    setModel((prev) => ({ ...prev, lines }));
    toast("Layanan dari paket dimuat ke quotation.");
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
                Identitas yang tampil sebagai pengirim penawaran.
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
                <Field label="Alamat">
                  <Input value={model.business.address ?? ""} onChange={(e) => setModel({ ...model, business: { ...model.business, address: e.target.value } })} placeholder="Kota, provinsi (opsional)" />
                </Field>
              </div>
            </section>

            <Divider />

            <section>
              <SectionTitle>Client</SectionTitle>
              <p className="mt-1 text-xs leading-relaxed text-ink-faint">
                Pihak yang menerima penawaran.
              </p>
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
              <SectionTitle>Buat dari Price Package</SectionTitle>
              <p className="mt-1 text-xs leading-relaxed text-ink-faint">
                Ambil paket jasa yang sudah disimpan di Price Package Builder, daftar layanan quotation terisi otomatis.
              </p>
              <div className="mt-4 max-w-md">
                <Field label="Pilih paket tersimpan">
                  <Select
                    value=""
                    onChange={(e) => { applyPackage(e.target.value); e.currentTarget.value = ""; }}
                  >
                    <option value="">- Pilih paket -</option>
                    {packages.map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </Select>
                </Field>
                {packages.length === 0 && (
                  <p className="mt-2 text-xs text-ink-faint">
                    Belum ada project Price Package. Buat paket di tool Price Package Builder dulu.
                  </p>
                )}
              </div>
            </section>

            <Divider />

            <section>
              <SectionTitle>Detail Penawaran</SectionTitle>
              <div className="mt-4 grid gap-4 sm:grid-cols-3">
                <Field label="Nomor quotation">
                  <Input value={model.number} onChange={(e) => setModel({ ...model, number: e.target.value })} />
                </Field>
                <Field label="Tanggal">
                  <Input type="date" value={model.date} onChange={(e) => setModel({ ...model, date: e.target.value })} />
                </Field>
                <Field label="Berlaku s/d">
                  <Input type="date" value={model.dueDate ?? ""} onChange={(e) => setModel({ ...model, dueDate: e.target.value })} />
                </Field>
                <Field label="Masa berlaku">
                  <Select value={model.validity ?? "Berlaku 14 hari"} onChange={(e) => setModel({ ...model, validity: e.target.value })}>
                    {VALIDITY_OPTIONS.map((o) => (
                      <option key={o} value={o}>{o}</option>
                    ))}
                  </Select>
                </Field>
                <Field label="Status">
                  <Select value={model.status ?? "draft"} onChange={(e) => setModel({ ...model, status: e.target.value as DocModel["status"] })}>
                    <option value="draft">Draft</option>
                    <option value="sent">Sent - Dikirim</option>
                  </Select>
                </Field>
              </div>
            </section>

            <Divider />

            <section>
              <SectionTitle>Layanan</SectionTitle>
              <p className="mt-1 text-xs leading-relaxed text-ink-faint">
                Rincian jasa yang ditawarkan beserta qty dan harga satuan.
              </p>
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
              <SectionTitle>Total & Syarat</SectionTitle>
              <div className="mt-4 grid gap-4 sm:grid-cols-3">
                <Field label="Diskon (Rp)">
                  <MoneyInput value={model.discount} onChange={(v) => setModel({ ...model, discount: v })} />
                </Field>
                <Field label="Pajak (%)" hint="Kosongkan bila tidak ada pajak.">
                  <Input type="number" min={0} max={100} value={model.taxPct || ""} onChange={(e) => setModel({ ...model, taxPct: Math.max(0, Math.min(100, Number(e.target.value))) })} />
                </Field>
                <Field label="Label pajak">
                  <Input value={model.taxLabel} onChange={(e) => setModel({ ...model, taxLabel: e.target.value })} placeholder="PPN" />
                </Field>
              </div>
              <div className="mt-4 grid gap-4">
                <Field label="Syarat & ketentuan">
                  <Textarea value={model.terms ?? ""} onChange={(e) => setModel({ ...model, terms: e.target.value })} placeholder="cth. Harga berlaku 14 hari. Revisi maksimal 3 kali termasuk dalam paket." className="min-h-20" />
                </Field>
                <Field label="Jadwal pembayaran">
                  <Textarea value={model.note ?? ""} onChange={(e) => setModel({ ...model, note: e.target.value })} placeholder="cth. DP 50% di awal project, pelunasan 50% saat serah terima." className="min-h-20" />
                </Field>
              </div>
            </section>

            <Divider />

            <section>
              <SectionTitle>Penutup</SectionTitle>
              <Field label="Footer dokumen (opsional)">
                <Input value={model.footer ?? ""} onChange={(e) => setModel({ ...model, footer: e.target.value })} placeholder="cth. Penawaran ini sah selama belum diubah oleh kedua belah pihak." />
              </Field>
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
          <Input value={line.description ?? ""} onChange={(e) => onChange({ description: e.target.value })} placeholder="cth. Termasuk copywriting, 1 konsep, dan 2 revisi." />
        </Field>
      </div>
    </div>
  );
}