"use client";

// Invoice UMKM - document builder (spec §8.8). Reference implementation for
// the document interaction model: form left, sticky A4 preview right,
// shared DocModel + DocWorkspace + DocActions.

import { useRef, useState } from "react";
import { DocWorkspace, DocActions } from "@/components/documents/doc-workspace";
import { DocModel, DocLine, blankDocLine, defaultNumber } from "@/lib/documents/model";
import { Field, Input, MoneyInput, Textarea, Select, PhoneInput } from "@/components/ui/fields";
import { Button, IconButton } from "@/components/ui/button";
import { Icon } from "@/components/icons";
import { Divider, SectionTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/format";
import { todayISO } from "@/lib/format";
import { useToast } from "@/components/ui/toast";
import { fileToDataURL } from "@/lib/image";

const TOOL_ID = "invoice";

function blankModel(): DocModel {
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
    paymentMethod: "",
  };
}

export default function InvoiceTool() {
  const [model, setModel] = useState<DocModel>(blankModel());
  const { toast } = useToast();

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

  const fileRef = useRef<HTMLInputElement>(null);

  return (
    <div className="space-y-4">
      <DocActions options={{ toolId: TOOL_ID, model, setModel, onNew: () => setModel(blankModel()) }} />
      <DocWorkspace
        options={{ toolId: TOOL_ID, model, setModel, onNew: () => setModel(blankModel()) }}
        editor={
          <>
            <section>
              <SectionTitle>Informasi Bisnis</SectionTitle>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <Field label="Logo (opsional)">
                    <div className="flex items-center gap-3">
                      {model.business.logo ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={model.business.logo} alt="Logo bisnis" className="size-11 rounded border border-border object-contain" />
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
                <Field label="Nama bisnis">
                  <Input value={model.business.name} onChange={(e) => setModel({ ...model, business: { ...model.business, name: e.target.value } })} placeholder="cth. Dapur Bu Sari" />
                </Field>
                <Field label="Kontak (telp / WA)">
                  <PhoneInput value={model.business.phone ?? ""} onChange={(v) => setModel({ ...model, business: { ...model.business, phone: v } })} />
                </Field>
                <Field label="Alamat" className="sm:col-span-2">
                  <Textarea value={model.business.address ?? ""} onChange={(e) => setModel({ ...model, business: { ...model.business, address: e.target.value } })} className="min-h-14" />
                </Field>
                <Field label="Email">
                  <Input type="email" value={model.business.email ?? ""} onChange={(e) => setModel({ ...model, business: { ...model.business, email: e.target.value } })} />
                </Field>
                <Field label="Info rekening / pembayaran">
                  <Input value={model.business.paymentInfo ?? ""} onChange={(e) => setModel({ ...model, business: { ...model.business, paymentInfo: e.target.value } })} placeholder="cth. BCA 1234567 a.n. Sari" />
                </Field>
              </div>
            </section>

            <Divider />

            <section>
              <SectionTitle>Customer</SectionTitle>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <Field label="Nama" required>
                  <Input value={model.customer.name} onChange={(e) => setModel({ ...model, customer: { ...model.customer, name: e.target.value } })} />
                </Field>
                <Field label="Perusahaan (opsional)">
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
              <div className="mt-3 grid gap-3 sm:grid-cols-3">
                <Field label="Nomor">
                  <Input value={model.number} onChange={(e) => setModel({ ...model, number: e.target.value })} />
                </Field>
                <Field label="Tanggal">
                  <Input type="date" value={model.date} onChange={(e) => setModel({ ...model, date: e.target.value })} />
                </Field>
                <Field label="Jatuh tempo">
                  <Input type="date" value={model.dueDate ?? ""} onChange={(e) => setModel({ ...model, dueDate: e.target.value })} />
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
              <SectionTitle>Item</SectionTitle>
              <div className="mt-2 space-y-2">
                {model.lines.map((line) => (
                  <ItemRow
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
                  Tambah item
                </Button>
              </div>
            </section>

            <Divider />

            <section>
              <SectionTitle>Total</SectionTitle>
              <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
                <Field label="Diskon (Rp)">
                  <MoneyInput value={model.discount} onChange={(v) => setModel({ ...model, discount: v })} />
                </Field>
                <Field label="Pajak (%)">
                  <Input type="number" min={0} max={100} value={model.taxPct || ""} onChange={(e) => setModel({ ...model, taxPct: Math.max(0, Math.min(100, Number(e.target.value))) })} />
                </Field>
                <Field label="Label pajak">
                  <Input value={model.taxLabel} onChange={(e) => setModel({ ...model, taxLabel: e.target.value })} placeholder="PPN" />
                </Field>
                <Field label="Ongkir (Rp)">
                  <MoneyInput value={model.shipping} onChange={(v) => setModel({ ...model, shipping: v })} />
                </Field>
                <Field label="Metode pembayaran">
                  <Input value={model.paymentMethod ?? ""} onChange={(e) => setModel({ ...model, paymentMethod: e.target.value })} placeholder="Transfer / QRIS / cash" />
                </Field>
              </div>
            </section>

            <Field label="Catatan untuk customer">
              <Textarea value={model.note ?? ""} onChange={(e) => setModel({ ...model, note: e.target.value })} placeholder="cth. Terima kasih sudah berbelanja!" />
            </Field>
            <Field label="Footer dokumen (opsional)">
              <Input value={model.footer ?? ""} onChange={(e) => setModel({ ...model, footer: e.target.value })} placeholder="cth. Barang yang sudah dibeli tidak dapat dikembalikan" />
            </Field>
          </>
        }
      />
    </div>
  );
}

function ItemRow({
  line,
  onChange,
  onRemove,
}: {
  line: DocLine;
  onChange: (patch: Partial<DocLine>) => void;
  onRemove: () => void;
}) {
  return (
    <div className="rounded-md border border-border bg-surface-muted/40 p-3">
      <div className="grid gap-2 sm:grid-cols-[2fr_1fr_5rem_7rem_auto] sm:items-end">
        <Field label="Nama item">
          <Input value={line.name} onChange={(e) => onChange({ name: e.target.value })} placeholder="cth. Nasi Ayam Geprek ×10" />
        </Field>
        <Field label="Qty">
          <Input type="number" min={0} value={line.qty || ""} onChange={(e) => onChange({ qty: Math.max(0, Number(e.target.value)) })} className="text-right" />
        </Field>
        <Field label="Harga">
          <MoneyInput value={line.price} onChange={(v) => onChange({ price: v })} />
        </Field>
        <div className="pb-2 text-right text-[13px]">
          <p className="text-[11px] text-ink-faint">Jumlah</p>
          <p className="font-semibold tabular text-ink">{formatCurrency(line.qty * line.price)}</p>
        </div>
        <IconButton label="Hapus item" className="hover:text-danger" onClick={onRemove}>
          <Icon name="trash" className="size-4" />
        </IconButton>
      </div>
    </div>
  );
}