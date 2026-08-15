"use client";

import { useState } from "react";
import { DocWorkspace, DocActions } from "@/components/documents/doc-workspace";
import { DocModel, DocLine, blankDocLine, defaultNumber } from "@/lib/documents/model";
import { Field, Input, Textarea, PhoneInput } from "@/components/ui/fields";
import { Button, IconButton } from "@/components/ui/button";
import { Icon } from "@/components/icons";
import { Divider, SectionTitle } from "@/components/ui/card";
import { todayISO } from "@/lib/format";

const TOOL_ID = "packing-list";

function blankModel(): DocModel {
  return {
    $kind: "packing-list",
    number: defaultNumber("packing-list"),
    date: todayISO(),
    status: "draft",
    business: { name: "" },
    customer: { name: "" },
    lines: [blankDocLine()],
    discount: 0,
    taxPct: 0,
    taxLabel: "",
    shipping: 0,
    note: "",
    orderNumber: "",
    packed: {},
    signatures: [{ label: "Disiapkan oleh", name: "" }],
  };
}

export default function PackingListTool() {
  const [model, setModel] = useState<DocModel>(blankModel());

  const togglePacked = (id: string) => {
    const packed = { ...(model.packed ?? {}) };
    packed[id] = !packed[id];
    setModel({ ...model, packed });
  };

  const toggleAll = () => {
    const allDone = model.lines.length > 0 && model.lines.every((l) => model.packed?.[l.id]);
    const packed: Record<string, boolean> = {};
    if (!allDone) {
      for (const l of model.lines) packed[l.id] = true;
    }
    setModel({ ...model, packed });
  };

  const doneCount = model.lines.filter((l) => model.packed?.[l.id]).length;
  const allDone = model.lines.length > 0 && doneCount === model.lines.length;

  const setPreparedBy = (name: string) => {
    setModel({ ...model, signatures: [{ label: "Disiapkan oleh", name }] });
  };

  const handlePreviewToggle = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    const td = target.closest("td");
    const tr = target.closest("tr");
    if (!td || !tr || tr.firstElementChild !== td) return;
    const tbody = tr.parentElement;
    if (!tbody) return;
    const idx = Array.from(tbody.children).indexOf(tr);
    const line = model.lines?.[idx];
    if (line) togglePacked(line.id);
  };

  return (
    <div className="space-y-4">
      <DocActions options={{ toolId: TOOL_ID, model, setModel, onNew: () => setModel(blankModel()) }} />
      <div onClick={handlePreviewToggle}>
        <DocWorkspace
          options={{ toolId: TOOL_ID, model, setModel, onNew: () => setModel(blankModel()) }}
          previewExtra={
            <Button size="sm" variant="secondary" onClick={toggleAll} disabled={model.lines.length === 0}>
              <Icon name="check" className="size-3.5" />
              {allDone ? "Reset semua" : "Tandai semua beres"}
            </Button>
          }
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
                <SectionTitle>Order</SectionTitle>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <Field label="Nomor order">
                    <Input value={model.orderNumber ?? ""} onChange={(e) => setModel({ ...model, orderNumber: e.target.value })} placeholder="cth. ORD-001" />
                  </Field>
                  <Field label="Customer">
                    <Input value={model.customer.name} onChange={(e) => setModel({ ...model, customer: { ...model.customer, name: e.target.value } })} />
                  </Field>
                </div>
              </section>

              <Divider />

              <section>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <SectionTitle>Checklist Packing</SectionTitle>
                  <Button size="sm" variant="secondary" onClick={toggleAll} disabled={model.lines.length === 0}>
                    <Icon name="check" className="size-3.5" />
                    {allDone ? "Reset semua" : "Tandai semua beres"}
                  </Button>
                </div>
                <p className="mt-1 text-xs text-ink-faint">
                  {doneCount} dari {model.lines.length} item beres - klik kotak di daftar atau di pratinjau untuk menandai.
                </p>
                <div className="mt-3 space-y-2">
                  {model.lines.map((line) => (
                    <ChecklistRow
                      key={line.id}
                      line={line}
                      packed={Boolean(model.packed?.[line.id])}
                      onToggle={() => togglePacked(line.id)}
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

              <Field label="Catatan (opsional)">
                <Textarea value={model.note ?? ""} onChange={(e) => setModel({ ...model, note: e.target.value })} placeholder="cth. Kirim lewat kurir sebelum jam 12" />
              </Field>
              <Field label="Disiapkan oleh">
                <Input value={model.signatures?.[0]?.name ?? ""} onChange={(e) => setPreparedBy(e.target.value)} placeholder="Nama yang menyiapkan packing" />
              </Field>
            </>
          }
        />
      </div>
    </div>
  );
}

function ChecklistRow({
  line,
  packed,
  onToggle,
  onChange,
  onRemove,
}: {
  line: DocLine;
  packed: boolean;
  onToggle: () => void;
  onChange: (patch: Partial<DocLine>) => void;
  onRemove: () => void;
}) {
  return (
    <div className={`rounded-md border p-3 transition-colors ${packed ? "border-success/40 bg-success-soft/50" : "border-border bg-surface-muted/40"}`}>
      <div className="grid gap-2 sm:grid-cols-[2.75rem_minmax(0,1fr)_6rem_auto] sm:items-end">
        <div className="flex h-9 items-end pb-0.5">
          <button
            type="button"
            onClick={onToggle}
            aria-pressed={packed}
            title={packed ? "Tandai belum beres" : "Tandai beres"}
            className={`flex size-6 items-center justify-center rounded border transition-colors cursor-pointer ${
              packed ? "border-success bg-success text-white" : "border-border-strong bg-surface text-transparent hover:border-accent"
            }`}
          >
            <Icon name="check" className="size-3.5" />
          </button>
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          <Field label="Nama item">
            <Input value={line.name} onChange={(e) => onChange({ name: e.target.value })} placeholder="cth. Nasi Box Ayam" />
          </Field>
          <Field label="Keterangan / varian (opsional)">
            <Input value={line.description ?? ""} onChange={(e) => onChange({ description: e.target.value })} placeholder="cth. Tanpa sambal" />
          </Field>
        </div>
        <Field label="Qty">
          <Input type="number" min={0} value={line.qty || ""} onChange={(e) => onChange({ qty: Math.max(0, Number(e.target.value)) })} className="text-right" />
        </Field>
        <IconButton label="Hapus item" className="hover:text-danger" onClick={onRemove}>
          <Icon name="trash" className="size-4" />
        </IconButton>
      </div>
    </div>
  );
}