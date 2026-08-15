"use client";

import { useState } from "react";
import { DocWorkspace, DocActions } from "@/components/documents/doc-workspace";
import { DocModel, blankDocLine, defaultNumber } from "@/lib/documents/model";
import { Field, Input, MoneyInput, Textarea, PhoneInput } from "@/components/ui/fields";
import { Divider, SectionTitle } from "@/components/ui/card";
import { terbilangRupiah } from "@/lib/terbilang";
import { todayISO } from "@/lib/format";

const TOOL_ID = "receipt";

function blankModel(): DocModel {
  return {
    $kind: "kwitansi",
    number: defaultNumber("kwitansi"),
    date: todayISO(),
    status: "draft",
    business: { name: "" },
    customer: { name: "" },
    lines: [{ ...blankDocLine(), name: "Pembayaran", qty: 1, price: 0 }],
    discount: 0,
    taxPct: 0,
    taxLabel: "",
    shipping: 0,
    note: "",
    receivedFrom: "",
    forPayment: "",
    paymentMethod: "",
  };
}

export default function KwitansiTool() {
  const [model, setModel] = useState<DocModel>(blankModel());

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
                <Field label="Nama bisnis">
                  <Input value={model.business.name} onChange={(e) => setModel({ ...model, business: { ...model.business, name: e.target.value } })} placeholder="cth. Dapur Bu Sari" />
                </Field>
                <Field label="Kontak (telp / WA)">
                  <PhoneInput value={model.business.phone ?? ""} onChange={(v) => setModel({ ...model, business: { ...model.business, phone: v } })} />
                </Field>
                <Field label="Alamat" className="sm:col-span-2">
                  <Textarea value={model.business.address ?? ""} onChange={(e) => setModel({ ...model, business: { ...model.business, address: e.target.value } })} className="min-h-14" />
                </Field>
              </div>
            </section>

            <Divider />

            <section>
              <SectionTitle>Kwitansi</SectionTitle>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <Field label="Nomor kwitansi">
                  <Input value={model.number} onChange={(e) => setModel({ ...model, number: e.target.value })} />
                </Field>
                <Field label="Tanggal">
                  <Input type="date" value={model.date} onChange={(e) => setModel({ ...model, date: e.target.value })} />
                </Field>
                <Field label="Jumlah pembayaran (Rp)" className="sm:col-span-2" required>
                  <MoneyInput
                    value={model.lines[0]?.price ?? 0}
                    onChange={(v) =>
                      setModel({
                        ...model,
                        lines: model.lines.map((l, i) => (i === 0 ? { ...l, price: v } : l)),
                      })
                    }
                  />
                  <p className="text-xs text-ink-faint">
                    Terbilang: <span className="font-medium text-ink">{terbilangRupiah(model.lines[0]?.price ?? 0) || "-"}</span>
                  </p>
                </Field>
                <Field label="Telah diterima dari">
                  <Input value={model.receivedFrom ?? ""} onChange={(e) => setModel({ ...model, receivedFrom: e.target.value })} placeholder="Nama pemberi / customer" />
                </Field>
                <Field label="Untuk pembayaran">
                  <Input value={model.forPayment ?? ""} onChange={(e) => setModel({ ...model, forPayment: e.target.value })} placeholder="cth. Pesanan Nasi Box 100 pcs" />
                </Field>
                <Field label="Metode pembayaran">
                  <Input value={model.paymentMethod ?? ""} onChange={(e) => setModel({ ...model, paymentMethod: e.target.value })} placeholder="Tunai / Transfer / QRIS" />
                </Field>
              </div>
            </section>

            <Divider />

            <Field label="Catatan (opsional)">
              <Textarea value={model.note ?? ""} onChange={(e) => setModel({ ...model, note: e.target.value })} placeholder="cth. Pembayaran pelunasan" />
            </Field>
          </>
        }
      />
    </div>
  );
}