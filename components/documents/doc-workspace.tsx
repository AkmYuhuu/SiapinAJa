"use client";

import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { DocModel } from "@/lib/documents/model";
import { renderDocPdf } from "@/lib/documents/pdf";
import { exportDocPdf, exportDocImage, getDocNode } from "@/lib/documents/html-export";
import { docTotals } from "@/lib/documents/model";
import { copyText, downloadJSON } from "@/lib/export";
import { buildExportFile, listProjects, getProject, importProjectFromText, makeProject, saveProject, duplicateProject, deleteProject, renameProject } from "@/lib/projects";
import { useToast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/icons";
import { ConfirmDialog } from "@/components/ui/confirm";
import { Modal } from "@/components/ui/modal";
import { Input } from "@/components/ui/fields";
import { DocPreview } from "./doc-preview";
import { ReceiptDoc } from "./receipt-preview";

export interface DocToolOptions {
  toolId: string;
  model: DocModel;
  setModel: (m: DocModel) => void;
  /** extra filename prefix for downloads, e.g. "INV-2015" */
  filePrefix?: string;
  /** reset the editor to a fresh document (used by Duplicate-reset and Delete) */
  onNew?: () => void;
}

/** Actions bar for document tools: save, PDF, print, copy, JSON (spec §15). */
export function DocActions({ options }: { options: DocToolOptions }) {
  const { toolId, model, setModel, filePrefix, onNew } = options;
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [savedListOpen, setSavedListOpen] = useState(false);
  const [saved, setSaved] = useState<Array<{ id: string; name: string; updatedAt: string }>>([]);
  const [imgOpen, setImgOpen] = useState(false);
  const [printOpen, setPrintOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [renameOpen, setRenameOpen] = useState(false);
  const [renameValue, setRenameValue] = useState("");

  useEffect(() => {
    listProjects(toolId).then(setSaved).catch(() => setSaved([]));
  }, [model, toolId]);

  useEffect(() => {
    const id =
      typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("project") : null;
    if (!id) return;
    let cancelled = false;
    getProject(id).then((full) => {
      if (!cancelled && full && (full.data as DocModel).$kind === model.$kind) {
        setModel({ ...(full.data as DocModel), id: full.id });
      }
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [toolId]);

  const safeName = (filePrefix || model.number || toolId).replace(/[^\w\- ]/g, "");
  const modelId = (model as DocModel & { id?: string }).id;

  const save = async () => {
    try {
      const existing = await listProjects(toolId);
      const match = existing.find((p) => p.id === modelId);
      const payload = { ...model };
      const p = match
        ? { ...match, data: payload, updatedAt: new Date().toISOString() }
        : makeProject(toolId, `${model.number || toolId}`, payload);
      await saveProject(p);
      setModel({ ...model, id: p.id });
      const all = await listProjects(toolId);
      setSaved(all);
      toast("Tersimpan.");
    } catch {
      toast("Project gagal disimpan.", "error");
    }
  };

  const duplicate = async () => {
    if (!modelId) {
      toast("Simpan project dulu sebelum menyalinnya.", "info");
      return;
    }
    const copy = await duplicateProject(modelId);
    if (copy) {
      setModel({ ...(copy.data as DocModel), id: copy.id });
      setSaved(await listProjects(toolId));
      toast("Project disalin.");
    }
  };

  const remove = async () => {
    setConfirmOpen(false);
    if (modelId) {
      await deleteProject(modelId);
      setSaved(await listProjects(toolId));
      toast("Project dihapus.");
    }
    onNew?.();
  };

  const exportPdf = async () => {
    try {
      // Capture the on-screen preview so the PDF layout matches it exactly.
      const node = getDocNode();
      if (node) {
        await exportDocPdf(node, safeName);
      } else {
        const doc = await renderDocPdf(model);
        doc.save(`${safeName}.pdf`);
      }
      toast("PDF siap diunduh.");
    } catch {
      toast("PDF gagal dibuat. Coba lagi.", "error");
    }
  };

  const exportImage = async (format: "png" | "jpeg") => {
    const node = getDocNode();
    if (!node) {
      toast("Pratinjau dokumen belum siap. Coba lagi.", "error");
      return;
    }
    setImgOpen(false);
    try {
      await exportDocImage(node, format, safeName);
      toast(format === "jpeg" ? "Gambar JPG siap diunduh." : "Gambar PNG siap diunduh.");
    } catch {
      toast("Gambar gagal dibuat. Coba lagi.", "error");
    }
  };

  const exportJson = () => {
    const file = buildExportFile({
      id: modelId ?? `doc_${Date.now()}`,
      toolId,
      name: model.number,
      version: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      data: model,
    });
    downloadJSON(file, `${safeName}.json`);
    toast("File JSON siap diunduh.");
  };

  const copySummary = async () => {
    const totals = docTotals(model);
    const lines = [
      `${model.number}`,
      `Customer: ${model.customer.name || "-"}`,
      `Total: ${totals.total.toLocaleString("id-ID")}`,
      ...(model.lines ?? []).map((l) => `${l.qty}x ${l.name} - ${(l.qty * l.price).toLocaleString("id-ID")}`),
    ];
    const ok = await copyText(lines.join("\n"));
    toast(ok ? "Ringkasan berhasil di-copy." : "Gagal menyalin.", ok ? "success" : "error");
  };

  const importFile = async (f: File | undefined) => {
    if (!f) return;
    const text = await f.text();
    const res = await importProjectFromText(text, toolId);
    if (!res.ok) {
      toast(res.error ?? "File project tidak dapat dibaca atau dibuat oleh SiapinAja.", "error");
      return;
    }
    const data = (res.project?.data ?? null) as DocModel | null;
    if (data && data.$kind && data.$kind === model.$kind) {
      setModel({ ...data, id: res.project?.id });
      toast("Project berhasil diimpor.");
    } else {
      toast("File project tidak cocok dengan tool ini.", "error");
    }
  };

  const doPrint = (mode: "a4" | "80" | "58") => {
    setPrintOpen(false);
    if (typeof window !== "undefined") {
      document.documentElement.setAttribute("data-print-mode", mode);
      window.print();
    }
  };

  return (
    <>
    <div className="flex flex-wrap items-center gap-2 print-hide">
      <Button size="sm" onClick={save}>
        <Icon name="save" className="size-3.5" />
        Simpan
      </Button>
      {modelId && (
        <>
          <Button size="sm" variant="secondary" onClick={duplicate}>
            <Icon name="copy" className="size-3.5" />
            Duplikat
          </Button>
          <Button size="sm" variant="secondary" onClick={() => { setRenameValue(saved.find((p) => p.id === modelId)?.name ?? model.number ?? ""); setRenameOpen(true); }}>
            <Icon name="pencil" className="size-3.5" />
            Ubah nama
          </Button>
          <Button size="sm" variant="secondary" onClick={() => setConfirmOpen(true)} className="text-danger">
            <Icon name="trash" className="size-3.5" />
            Hapus
          </Button>
        </>
      )}
      <Button size="sm" variant="secondary" onClick={exportPdf} disabled={!model.lines?.length}>
        <Icon name="download" className="size-3.5" />
        Unduh PDF
      </Button>
      <div className="relative">
        <Button size="sm" variant="secondary" onClick={() => setImgOpen((v) => !v)} disabled={!model.lines?.length}>
          <Icon name="image" className="size-3.5" />
          Unduh Gambar
          <Icon name="chevron" className="ml-0.5 size-3" />
        </Button>
        {imgOpen && (
          <div className="absolute left-0 top-full z-30 mt-1 w-40 overflow-hidden rounded-lg border border-border bg-surface p-1 shadow-[0_8px_24px_rgba(43,40,35,0.14)]">
            <button
              className="flex w-full items-center gap-2 rounded px-2.5 py-1.5 text-left text-[13px] hover:bg-surface-muted"
              onClick={() => exportImage("png")}
            >
              <Icon name="image" className="size-3.5 text-ink-secondary" />
              PNG
            </button>
            <button
              className="flex w-full items-center gap-2 rounded px-2.5 py-1.5 text-left text-[13px] hover:bg-surface-muted"
              onClick={() => exportImage("jpeg")}
            >
              <Icon name="image" className="size-3.5 text-ink-secondary" />
              JPEG (JPG)
            </button>
          </div>
        )}
      </div>
      <div className="relative">
        <Button size="sm" variant="secondary" onClick={() => setPrintOpen((v) => !v)}>
          <Icon name="print" className="size-3.5" />
          Print
          <Icon name="chevron" className="ml-0.5 size-3" />
        </Button>
        {printOpen && (
          <div className="absolute left-0 top-full z-30 mt-1 w-48 overflow-hidden rounded-lg border border-border bg-surface p-1 shadow-[0_8px_24px_rgba(43,40,35,0.14)]">
            <button
              className="flex w-full items-center gap-2 rounded px-2.5 py-1.5 text-left text-[13px] hover:bg-surface-muted"
              onClick={() => doPrint("a4")}
            >
              <Icon name="file" className="size-3.5 text-ink-secondary" />
              Kertas A4
            </button>
            <button
              className="flex w-full items-center gap-2 rounded px-2.5 py-1.5 text-left text-[13px] hover:bg-surface-muted"
              onClick={() => doPrint("80")}
            >
              <Icon name="receipt" className="size-3.5 text-ink-secondary" />
              Nota 80 mm
            </button>
            <button
              className="flex w-full items-center gap-2 rounded px-2.5 py-1.5 text-left text-[13px] hover:bg-surface-muted"
              onClick={() => doPrint("58")}
            >
              <Icon name="receipt" className="size-3.5 text-ink-secondary" />
              Nota 58 mm
            </button>
          </div>
        )}
      </div>
      <Button size="sm" variant="secondary" onClick={copySummary}>
        <Icon name="copy" className="size-3.5" />
        Copy Ringkasan
      </Button>
      <Button size="sm" variant="secondary" onClick={exportJson}>
        <Icon name="download" className="size-3.5" />
        Export JSON
      </Button>
      <Button size="sm" variant="secondary" onClick={() => fileRef.current?.click()}>
        <Icon name="upload" className="size-3.5" />
        Import JSON
      </Button>
      <input ref={fileRef} type="file" accept="application/json,.json" className="hidden" onChange={(e) => importFile(e.target.files?.[0])} />
      {onNew && (
        <Button size="sm" variant="ghost" onClick={onNew}>
          <Icon name="plus" className="size-3.5" />
          Baru
        </Button>
      )}

      <div className="relative">
        <Button size="sm" variant="ghost" onClick={() => setSavedListOpen((v) => !v)}>
          <Icon name="folder" className="size-3.5" />
          Tersimpan ({saved.length})
        </Button>
        {savedListOpen && (
          <div className="absolute right-0 top-full z-30 mt-1 max-h-72 w-80 overflow-y-auto rounded-lg border border-border bg-surface p-1.5 shadow-[0_8px_24px_rgba(43,40,35,0.14)]">
            {saved.length === 0 && <p className="px-2.5 py-2 text-[13px] text-ink-faint">Belum ada project tersimpan.</p>}
            {saved.map((p) => (
              <button
                key={p.id}
                className="flex w-full items-center justify-between gap-2 rounded px-2.5 py-1.5 text-left text-[13px] hover:bg-surface-muted"
                onClick={async () => {
                  const full = await getProject(p.id);
                  if (full && (full.data as DocModel).$kind === model.$kind) {
                    setModel({ ...(full.data as DocModel), id: full.id });
                    toast("Project dimuat.");
                  }
                  setSavedListOpen(false);
                }}
              >
                <span className="min-w-0 truncate font-medium text-ink">{p.name}</span>
                <span className="shrink-0 text-[11px] text-ink-faint">{new Date(p.updatedAt).toLocaleDateString("id-ID")}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
    <ConfirmDialog
      open={confirmOpen}
      title="Hapus dokumen?"
      description={`Dokumen "${model.number || toolId}" akan dihapus permanen dan tidak bisa dikembalikan.`}
      confirmLabel="Hapus"
      onConfirm={remove}
      onCancel={() => setConfirmOpen(false)}
    />
    <Modal open={renameOpen} onClose={() => setRenameOpen(false)} title="Ubah nama project">
      <Input value={renameValue} onChange={(e) => setRenameValue(e.target.value)} placeholder="Nama project" autoFocus />
      <div className="mt-4 flex justify-end gap-2">
        <Button variant="secondary" onClick={() => setRenameOpen(false)}>Batal</Button>
        <Button
          onClick={async () => {
            const name = renameValue.trim();
            if (!modelId || !name) return;
            await renameProject(modelId, name);
            setSaved(await listProjects(toolId));
            setRenameOpen(false);
            toast("Nama project diubah.");
          }}
          disabled={!renameValue.trim()}
        >
          Simpan
        </Button>
      </div>
    </Modal>
    </>
  );
}

/** Split workspace: editor left, sticky A4 preview right (spec §23). */
export function DocWorkspace({
  options,
  editor,
  previewExtra,
}: {
  options: DocToolOptions;
  editor: ReactNode;
  previewExtra?: ReactNode;
}) {
  return (
    <div className="doc-workspace-grid grid gap-6 xl:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
      <section className="doc-editor min-w-0 space-y-5 bg-surface border border-border rounded-lg p-4 lg:p-5">{editor}</section>
      <section className="xl:sticky xl:top-20 xl:self-start print-area min-w-0 max-h-[calc(100vh-7rem)] overflow-y-auto scroll-thin">
        <div className="mb-3 flex items-center justify-between print-hide">
          <p className="text-xs font-medium text-ink-faint">
            <Icon name="image" className="mr-1 inline size-3.5" />
            Pratinjau dokumen
          </p>
          {previewExtra}
        </div>
        <DocPreview model={options.model} />
        <div className="receipt-print" data-width="80" aria-hidden>
          <ReceiptDoc model={options.model} width={80} />
        </div>
        <div className="receipt-print" data-width="58" aria-hidden>
          <ReceiptDoc model={options.model} width={58} />
        </div>
      </section>
    </div>
  );
}