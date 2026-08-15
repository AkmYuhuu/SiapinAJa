"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import type { ReactNode } from "react";
import { Icon } from "@/components/icons";
import type { ToolDef } from "@/lib/registry";
import { Badge } from "@/components/ui/card";
import { Button, IconButton } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm";
import { Modal } from "@/components/ui/modal";
import { Input } from "@/components/ui/fields";
import { useProject } from "./use-project";

export function ToolHeader({ tool, children }: { tool: ToolDef; children?: ReactNode }) {
  return (
    <div className="print-hide mb-5">
      <div className="flex flex-wrap items-center gap-3">
        <span className="flex size-9 items-center justify-center rounded-lg bg-accent-soft text-accent-strong">
          <Icon name={tool.icon} className="size-5" />
        </span>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-bold text-ink">{tool.name}</h1>
            <Badge tone="accent">Paket {packName(tool)}</Badge>
          </div>
          <p className="text-[13px] text-ink-secondary">{tool.description}</p>
        </div>
      </div>
      {children}
    </div>
  );
}

function packName(tool: ToolDef): string {
  const names: Record<string, string> = { umkm: "UMKM", freelancer: "Freelancer", creator: "Creator" };
  return names[tool.pack] ?? tool.pack;
}

export function Breadcrumbs({ tool, categoryName }: { tool: ToolDef; categoryName: string }) {
  return (
    <nav className="print-hide mb-3 flex items-center gap-1.5 text-xs text-ink-faint" aria-label="Breadcrumb">
      <Link href={`/tools/${tool.category}`} className="hover:text-accent-strong">
        {categoryName}
      </Link>
      <Icon name="chevron" className="size-3" />
      <span className="text-ink-secondary">{tool.name}</span>
    </nav>
  );
}

/** Two-column calculator workspace: input left, result right (spec §22). */
export function CalcWorkspace({ input, result }: { input: ReactNode; result: ReactNode }) {
  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] lg:items-start">
      <section className="space-y-4 bg-surface border border-border rounded-lg p-4 lg:sticky lg:top-20">{input}</section>
      <section className="space-y-4">{result}</section>
    </div>
  );
}

export function ResultPanel({ title, children, accent = false }: { title: string; children: ReactNode; accent?: boolean }) {
  return (
    <div className={`rounded-lg border p-4 ${accent ? "border-accent/40 bg-accent-soft/60" : "border-border bg-surface"}`}>
      <h2 className="text-[11px] font-semibold uppercase tracking-wider text-ink-secondary">{title}</h2>
      <div className="mt-3">{children}</div>
    </div>
  );
}

/** One prominent number + breakdown rows (spec §16 main result). */
export function MainResult({
  label,
  value,
  valueSub,
  rows,
  accent = true,
}: {
  label: string;
  value: ReactNode;
  valueSub?: ReactNode;
  rows?: Array<{ label: string; value: ReactNode; strong?: boolean }>;
  accent?: boolean;
}) {
  return (
    <ResultPanel title={label} accent={accent}>
      <p className={`text-3xl font-bold tracking-tight tabular ${accent ? "text-accent-strong" : "text-ink"}`}>{value}</p>
      {valueSub && <p className="mt-0.5 text-xs text-ink-faint">{valueSub}</p>}
      {rows && rows.length > 0 && (
        <div className="mt-4 divide-y divide-border/70">
          {rows.map((r, i) => (
            <div key={i} className="flex items-center justify-between gap-3 py-1.5 text-[13px]">
              <span className="text-ink-secondary">{r.label}</span>
              <span className={`tabular ${r.strong ? "font-semibold text-ink" : "text-ink"}`}>{r.value}</span>
            </div>
          ))}
        </div>
      )}
    </ResultPanel>
  );
}

/** Actions row for project tools: save / export / duplicate / import / reset (spec §16 actions). */
export function ProjectActions({
  project,
  onSave,
  onDuplicate,
  onDelete,
  onExportJson,
  onImportFile,
  onNew,
  showImport = true,
}: {
  project: ReturnType<typeof useProject>;
  onSave: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onExportJson: () => void;
  onImportFile: (file: File) => void;
  onNew: () => void;
  showImport?: boolean;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [savedListOpen, setSavedListOpen] = useState(false);
  const [renameOpen, setRenameOpen] = useState(false);
  const [renameValue, setRenameValue] = useState("");

  const handleImport = async (file: File | undefined) => {
    if (!file) return;
    onImportFile(file);
    if (fileRef.current) fileRef.current.value = "";
  };

  const savedProjects = project.projects.filter((p) => p.id !== (project.current as { id?: string } | null)?.id).slice(0, 5);

  return (
    <>
    <div className="flex flex-wrap items-center gap-2 print-hide">
      <Button size="sm" onClick={onSave} disabled={!project.current && savedProjects.length === 0 ? false : undefined}>
        <Icon name="save" className="size-3.5" />
        {project.current ? "Simpan Perubahan" : "Simpan"}
      </Button>
      {project.current && (
        <>
          <Button size="sm" variant="secondary" onClick={onExportJson}>
            <Icon name="download" className="size-3.5" />
            Export JSON
          </Button>
          <Button size="sm" variant="secondary" onClick={onDuplicate}>
            <Icon name="copy" className="size-3.5" />
            Duplikat
          </Button>
        </>
      )}
      {showImport && (
        <>
          <Button size="sm" variant="secondary" onClick={() => fileRef.current?.click()}>
            <Icon name="upload" className="size-3.5" />
            Import JSON
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(e) => handleImport(e.target.files?.[0])}
          />
        </>
      )}
      {savedProjects.length > 0 && (
        <div className="relative">
          <Button size="sm" variant="secondary" onClick={() => setSavedListOpen((v) => !v)}>
            <Icon name="folder" className="size-3.5" />
            Proyek tersimpan
          </Button>
          {savedListOpen && (
            <div className="absolute left-0 top-full z-30 mt-1 w-72 rounded-lg border border-border bg-surface p-1.5 shadow-[0_8px_24px_rgba(43,40,35,0.14)]">
              {project.projects.map((p) => (
                <button
                  key={p.id}
                  className="flex w-full items-center justify-between gap-2 rounded px-2.5 py-1.5 text-left text-[13px] hover:bg-surface-muted"
                  onClick={() => {
                    project.load(p.id);
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
      )}
      <span className="flex-1" />
      {project.current && (
        <>
          <IconButton label="Ubah nama project" onClick={() => { setRenameValue(project.current?.name ?? ""); setRenameOpen(true); }}>
            <Icon name="pencil" className="size-4" />
          </IconButton>
          <IconButton label="Hapus project" onClick={project.openConfirmDelete} className="text-ink-faint hover:text-danger">
            <Icon name="trash" className="size-4" />
          </IconButton>
        </>
      )}
      <Button size="sm" variant="ghost" onClick={onNew}>
        <Icon name="plus" className="size-3.5" />
        Baru
      </Button>
    </div>
    <ConfirmDialog
      open={project.confirmDeleteOpen}
      title="Hapus project?"
      description={
        project.current
          ? `Project "${project.current.name}" akan dihapus permanen dan tidak bisa dikembalikan.`
          : "Project akan dihapus permanen dan tidak bisa dikembalikan."
      }
      confirmLabel="Hapus"
      onConfirm={onDelete}
      onCancel={project.closeConfirmDelete}
    />
    <Modal open={renameOpen} onClose={() => setRenameOpen(false)} title="Ubah nama project">
      <Input value={renameValue} onChange={(e) => setRenameValue(e.target.value)} placeholder="Nama project" autoFocus />
      <div className="mt-4 flex justify-end gap-2">
        <Button variant="secondary" onClick={() => setRenameOpen(false)}>Batal</Button>
        <Button
          onClick={async () => {
            await project.rename(renameValue);
            setRenameOpen(false);
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

export function ErrorBox({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-start gap-2 rounded-md border border-danger/30 bg-danger-soft px-3 py-2.5 text-[13px] text-danger">
      <Icon name="alert" className="mt-0.5 size-4 shrink-0" />
      <p>{children}</p>
    </div>
  );
}

export function Note({ children, tone = "info" as const }: { children: ReactNode; tone?: "info" | "warning" }) {
  const cls = tone === "warning" ? "border-warning/30 bg-warning-soft text-warning" : "border-border bg-surface-muted text-ink-secondary";
  return (
    <div className={`flex items-start gap-2 rounded-md border px-3 py-2.5 text-[13px] ${cls}`}>
      <Icon name={tone === "warning" ? "alert" : "help"} className="mt-0.5 size-4 shrink-0" />
      <p className="leading-relaxed">{children}</p>
    </div>
  );
}