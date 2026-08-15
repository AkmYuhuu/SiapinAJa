"use client";

import { useState } from "react";
import { DocWorkspace, DocActions } from "@/components/documents/doc-workspace";
import { DocModel, DocLine, blankDocLine, defaultNumber } from "@/lib/documents/model";
import { Field, Input, Textarea, PhoneInput } from "@/components/ui/fields";
import { Button, IconButton } from "@/components/ui/button";
import { Icon } from "@/components/icons";
import { Divider, SectionTitle } from "@/components/ui/card";
import { todayISO } from "@/lib/format";

const TOOL_ID = "delivery-note";

function blankModel(): DocModel {
  return {
    $kind: "surat-jalan",
    number: defaultNumber("surat-jalan"),
    date: todayISO(),
    status: "draft",
    business: { name: "" },
    customer: { name: "", address: "" },
    lines: [blankDocLine()],
    discount: 0,
    taxPct: 0,
    taxLabel: "",
    shipping: 0,
    note: "",
    shipper: "",
    vehicle: "",
    orderNumber: "",
    signatures: [
      { label: "Dikirim oleh", name: "" },
      { label: "Diterima oleh", name: "" },
    ],
  };
}

export default function SuratJalanTool() {
  const [model, setModel] = useState<DocModel>(blankModel());

  const setSignature = (idx: 0 | 1, name: string) => {
    const sigs = [
      { label: "Dikirim oleh", name: "" },
      { label: "Diterima oleh", name: "" },
    ];
    sigs[idx] = { label: idx === 0 ? "Dikirim oleh" : "Diterima oleh", name };
    setModel({ ...model, signatures: sigs });
  };

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
              <SectionTitle>Pengiriman</SectionTitle>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <Field label="Nomor surat jalan">
                  <Input value={model.number} onChange={(e) => setModel({ ...model, number: e.target.value })} />
                </Field>
                <Field label="Tanggal">
                  <Input type="date" value={model.date} onChange={(e) => setModel({ ...model, date: e.target.value })} />
                </Field>
                <Field label="Pengirim" hint="Kosongkan untuk memakai nama bisnis.">
                  <Input
                    value={model.shipper ?? model.business.name}
                    onChange={(e) => setModel({ ...model, shipper: e.target.value })}
                    placeholder={model.business.name || "Nama pengirim"}
                  />
                </Field>
                <Field label="Penerima">
                  <Input value={model.customer.name} onChange={(e) => setModel({ ...model, customer: { ...model.customer, name: e.target.value } })} placeholder="Nama penerima" />
                </Field>
                <Field label="Alamat tujuan" className="sm:col-span-2">
                  <Textarea value={model.customer.address ?? ""} onChange={(e) => setModel({ ...model, customer: { ...model.customer, address: e.target.value } })} className="min-h-14" />
                </Field>
                <Field label="Kendaraan / kurir">
                  <Input value={model.vehicle ?? ""} onChange={(e) => setModel({ ...model, vehicle: e.target.value })} placeholder="cth. Kurir GoSend / Pickup" />
                </Field>
                <Field label="Nomor order (opsional)">
                  <Input value={model.orderNumber ?? ""} onChange={(e) => setModel({ ...model, orderNumber: e.target.value })} placeholder="cth. ORD-001" />
                </Field>
              </div>
            </section>

            <Divider />

            <section>
              <SectionTitle>Daftar Barang</SectionTitle>
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
                  Tambah barang
                </Button>
              </div>
            </section>

            <Divider />

            <section>
              <SectionTitle>Tanda Tangan</SectionTitle>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <Field label="Pengirim (dikirim oleh)">
                  <Input value={model.signatures?.[0]?.name ?? ""} onChange={(e) => setSignature(0, e.target.value)} />
                </Field>
                <Field label="Penerima (diterima oleh)">
                  <Input value={model.signatures?.[1]?.name ?? ""} onChange={(e) => setSignature(1, e.target.value)} />
                </Field>
              </div>
            </section>

            <Divider />

            <Field label="Catatan (opsional)">
              <Textarea value={model.note ?? ""} onChange={(e) => setModel({ ...model, note: e.target.value })} placeholder="cth. Barang sudah dicek sebelum dikirim" />
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
      <div className="grid gap-2 sm:grid-cols-[2fr_5rem_auto] sm:items-end">
        <Field label="Nama barang">
          <Input value={line.name} onChange={(e) => onChange({ name: e.target.value })} placeholder="cth. Nasi Box Ayam" />
        </Field>
        <Field label="Qty">
          <Input type="number" min={0} value={line.qty || ""} onChange={(e) => onChange({ qty: Math.max(0, Number(e.target.value)) })} className="text-right" />
        </Field>
        <IconButton label="Hapus barang" className="hover:text-danger" onClick={onRemove}>
          <Icon name="trash" className="size-4" />
        </IconButton>
      </div>
    </div>
  );
}