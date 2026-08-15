"use client";

import { useRef, useState } from "react";
import { DocWorkspace, DocActions } from "@/components/documents/doc-workspace";
import { DocModel, defaultNumber } from "@/lib/documents/model";
import { Field, Input, MoneyInput, Textarea, Select, PhoneInput } from "@/components/ui/fields";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/icons";
import { Divider, SectionTitle } from "@/components/ui/card";
import { formatCurrency, todayISO } from "@/lib/format";
import { terbilangRupiah } from "@/lib/terbilang";
import { useToast } from "@/components/ui/toast";
import { fileToDataURL } from "@/lib/image";

const TOOL_ID = "receipt";

const FOR_PAYMENT_OPTIONS = ["DP project", "pembayaran termin", "pelunasan", "konsultasi"];
const PAYMENT_METHOD_OPTIONS = ["Transfer bank", "QRIS", "Virtual account", "Tunai", "Lainnya"];

function blankModel(): DocModel {
  return {
    $kind: "kwitansi",
    number: defaultNumber("kwitansi"),
    date: todayISO(),
    business: { name: "", address: "", phone: "", email: "" },
    customer: { name: "", company: "", address: "", phone: "", email: "" },
    lines: [{ id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`, name: "", qty: 1, price: 0 }],
    discount: 0,
    taxPct: 0,
    taxLabel: "PPN",
    shipping: 0,
    receivedFrom: "",
    forPayment: "DP project",
    paymentMethod: "Transfer bank",
    note: "",
  };
}

export default function KwitansiFreelancerTool() {
  const [model, setModel] = useState<DocModel>(blankModel());
  const { toast } = useToast();

  const amount = model.lines[0]?.price ?? 0;
  const customForPayment = !FOR_PAYMENT_OPTIONS.includes(model.forPayment ?? "");

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

  const setAmount = (v: number) => {
    setModel({
      ...model,
      lines: [{ ...(model.lines[0] ?? { id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`, name: "", qty: 1 }), price: v }],
    });
  };

  return (
    <div className="space-y-4">
      <DocActions options={{ toolId: TOOL_ID, model, setModel, onNew: () => setModel(blankModel()) }} />
      <DocWorkspace
        options={{ toolId: TOOL_ID, model, setModel, onNew: () => setModel(blankModel()) }}
        editor={
          <>
            <section>
              <SectionTitle>Informasi Penerima</SectionTitle>
              <p className="mt-1 text-xs leading-relaxed text-ink-faint">
                Profil yang menandatangani kwitansi sebagai penerima pembayaran.
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
                <Field label="Nama penerima" required>
                  <Input value={model.business.name} onChange={(e) => setModel({ ...model, business: { ...model.business, name: e.target.value } })} placeholder="cth. Andi Pratama" />
                </Field>
                <Field label="Telepon / WA">
                  <PhoneInput value={model.business.phone ?? ""} onChange={(v) => setModel({ ...model, business: { ...model.business, phone: v } })} />
                </Field>
                <Field label="Email">
                  <Input type="email" value={model.business.email ?? ""} onChange={(e) => setModel({ ...model, business: { ...model.business, email: e.target.value } })} />
                </Field>
                <Field label="Alamat">
                  <Input value={model.business.address ?? ""} onChange={(e) => setModel({ ...model, business: { ...model.business, address: e.target.value } })} />
                </Field>
              </div>
            </section>

            <Divider />

            <section>
              <SectionTitle>Pemberi Pembayaran</SectionTitle>
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
              <SectionTitle>Detail Kwitansi</SectionTitle>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <Field label="Nomor kwitansi">
                  <Input value={model.number} onChange={(e) => setModel({ ...model, number: e.target.value })} />
                </Field>
                <Field label="Tanggal">
                  <Input type="date" value={model.date} onChange={(e) => setModel({ ...model, date: e.target.value })} />
                </Field>
              </div>
            </section>

            <Divider />

            <section>
              <SectionTitle>Pembayaran</SectionTitle>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <Field label="Telah diterima dari" hint="Kosongkan untuk memakai nama pemberi di atas.">
                  <Input value={model.receivedFrom ?? ""} onChange={(e) => setModel({ ...model, receivedFrom: e.target.value })} placeholder={model.customer.name || "Nama pemberi"} />
                </Field>
                <Field label="Untuk pembayaran">
                  <Select
                    value={customForPayment ? "jasa custom" : model.forPayment}
                    onChange={(e) => {
                      const v = e.target.value;
                      if (v === "jasa custom") setModel({ ...model, forPayment: "" });
                      else setModel({ ...model, forPayment: v });
                    }}
                  >
                    {FOR_PAYMENT_OPTIONS.map((o) => (
                      <option key={o} value={o}>{o}</option>
                    ))}
                    <option value="jasa custom">jasa custom</option>
                  </Select>
                </Field>
                {customForPayment && (
                  <Field label="Rincian untuk pembayaran" className="sm:col-span-2">
                    <Input value={model.forPayment ?? ""} onChange={(e) => setModel({ ...model, forPayment: e.target.value })} placeholder="cth. Pembuatan logo perusahaan (termin 1)" />
                  </Field>
                )}
                <Field label="Jumlah (Rp)">
                  <MoneyInput value={amount} onChange={setAmount} />
                </Field>
                <Field label="Metode pembayaran">
                  <Select value={model.paymentMethod ?? ""} onChange={(e) => setModel({ ...model, paymentMethod: e.target.value })}>
                    {PAYMENT_METHOD_OPTIONS.map((o) => (
                      <option key={o} value={o}>{o}</option>
                    ))}
                  </Select>
                </Field>
                <Field label="Keterangan jasa (opsional)" className="sm:col-span-2">
                  <Input
                    value={model.lines[0]?.name ?? ""}
                    onChange={(e) =>
                      setModel({
                        ...model,
                        lines: [{ ...(model.lines[0] ?? { id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`, name: "", qty: 1, price: 0 }), name: e.target.value }],
                      })
                    }
                    placeholder="cth. Desain landing page"
                  />
                </Field>
              </div>
              <div className="mt-4 rounded-lg border border-accent/40 bg-accent-soft p-4">
                <p className="text-[11px] font-medium uppercase tracking-wide text-accent-strong">Terbilang</p>
                <p className="mt-1 font-semibold uppercase tracking-wide text-ink">{terbilangRupiah(amount)}</p>
                <p className="mt-2 text-xs text-ink-faint">
                  Terbilang dihasilkan otomatis dari jumlah {formatCurrency(amount)}.
                </p>
              </div>
            </section>

            <Divider />

            <section>
              <SectionTitle>Catatan</SectionTitle>
              <Field label="Catatan (opsional)">
                <Textarea value={model.note ?? ""} onChange={(e) => setModel({ ...model, note: e.target.value })} placeholder="cth. Pembayaran DP project website." className="min-h-20" />
              </Field>
            </section>
          </>
        }
      />
    </div>
  );
}