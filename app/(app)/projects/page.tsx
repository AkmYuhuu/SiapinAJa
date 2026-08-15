"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getTool } from "@/lib/registry";
import { listProjects, duplicateProject, deleteProject, renameProject, buildExportFile } from "@/lib/projects";
import type { Project } from "@/lib/projects";
import { downloadJSON } from "@/lib/export";
import { Icon } from "@/components/icons";
import { EmptyState } from "@/components/ui/empty";
import { Button, IconButton } from "@/components/ui/button";
import { Input } from "@/components/ui/fields";
import { Modal } from "@/components/ui/modal";
import { ConfirmDialog } from "@/components/ui/confirm";
import { useToast } from "@/components/ui/toast";
import { formatDateTime } from "@/lib/format";

type Filter = "all" | "umkm" | "freelancer" | "creator-seller";

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const [renameTarget, setRenameTarget] = useState<Project | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<Project | null>(null);
  const { toast } = useToast();
  const router = useRouter();

  const refresh = () => listProjects().then(setProjects).catch(() => setProjects([]));
  useEffect(() => {
    refresh();
  }, []);

  const filtered = useMemo(() => {
    return projects.filter((p) => {
      const tool = getTool(p.toolId);
      if (filter !== "all" && tool?.category !== filter) return false;
      if (query) {
        const q = query.toLowerCase();
        const name = p.name.toLowerCase();
        const toolName = (tool?.name ?? "").toLowerCase();
        if (!name.includes(q) && !toolName.includes(q)) return false;
      }
      return true;
    });
  }, [projects, filter, query]);

  const doDuplicate = async (p: Project) => {
    const copy = await duplicateProject(p.id);
    if (copy) {
      toast("Project disalin.");
      refresh();
    }
  };

  const doDelete = async (p: Project) => {
    await deleteProject(p.id);
    toast("Project dihapus.");
    refresh();
  };

  const doExport = (p: Project) => {
    downloadJSON(buildExportFile(p), `${p.name.replace(/[^\w\- ]/g, "").trim() || p.toolId}.json`);
    toast("File project siap diunduh.");
  };

  const doRename = async () => {
    if (!renameTarget) return;
    await renameProject(renameTarget.id, renameValue.trim() || renameTarget.name);
    setRenameTarget(null);
    toast("Nama project diubah.");
    refresh();
  };

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-xl font-bold text-ink">Proyek Saya</h1>
        <p className="mt-1 text-sm text-ink-secondary">
          Project tersimpan di perangkat ini (IndexedDB) - bisa diekspor dan dipindahkan kapan saja.
        </p>
      </header>

      <div className="flex flex-wrap items-center gap-2">
        {(["all", "umkm", "freelancer", "creator-seller"] as Filter[]).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-full border px-3 py-1.5 text-[13px] font-medium transition-colors ${
              filter === f ? "border-accent bg-accent-soft text-accent-ink" : "border-border bg-surface text-ink-secondary hover:text-ink"
            }`}
          >
            {f === "all" ? "Semua" : f === "umkm" ? "UMKM" : f === "freelancer" ? "Freelancer" : "Creator / Seller"}
          </button>
        ))}
        <span className="flex-1" />
        <div className="relative">
          <Icon name="search" className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-ink-faint" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Cari project…" className="w-56 pl-8" />
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<Icon name="folder" className="size-5" />}
          title={projects.length === 0 ? "Belum ada proyek" : "Tidak ada proyek yang cocok"}
          description={
            projects.length === 0
              ? "Buka salah satu tools dan simpan hasil kerjamu - akan tersimpan di sini."
              : "Coba ubah filter atau kata kunci pencarian."
          }
          actionLabel={projects.length === 0 ? "Jelajahi tools" : undefined}
          onAction={() => router.push("/tools/umkm")}
        />
      ) : (
        <div className="overflow-hidden rounded-lg border border-border bg-surface">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-surface-muted text-left text-[11px] uppercase tracking-wide text-ink-faint">
                <th className="px-4 py-2.5 font-semibold">Nama</th>
                <th className="hidden px-4 py-2.5 font-semibold md:table-cell">Tool</th>
                <th className="hidden px-4 py-2.5 font-semibold sm:table-cell">Terakhir diubah</th>
                <th className="hidden px-4 py-2.5 font-semibold sm:table-cell">Dibuat</th>
                <th className="px-4 py-2.5 text-right font-semibold">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => {
                const tool = getTool(p.toolId);
                return (
                  <tr key={p.id} className="border-b border-border last:border-0 hover:bg-surface-muted/60">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        {tool && (
                          <span className="flex size-7 items-center justify-center rounded-md bg-accent-soft text-accent-strong">
                            <Icon name={tool.icon} className="size-3.5" />
                          </span>
                        )}
                        <Link href={`${tool?.route ?? "/projects"}?project=${p.id}`} className="font-medium text-ink hover:underline">
                          {p.name}
                        </Link>
                      </div>
                    </td>
                    <td className="hidden px-4 py-3 text-[13px] text-ink-secondary md:table-cell">{tool?.name ?? p.toolId}</td>
                    <td className="hidden px-4 py-3 text-[13px] tabular text-ink-faint sm:table-cell">{formatDateTime(p.updatedAt)}</td>
                    <td className="hidden px-4 py-3 text-[13px] tabular text-ink-faint sm:table-cell">{formatDateTime(p.createdAt)}</td>
                    <td className="px-4 py-1 text-right">
                      <div className="inline-flex items-center gap-0.5">
                        {tool && (
                          <Link href={`${tool.route}?project=${p.id}`}>
                            <Button size="sm" variant="secondary" className="mr-1">
                              Buka
                            </Button>
                          </Link>
                        )}
                        <IconButton label="Duplikat" onClick={() => doDuplicate(p)}>
                          <Icon name="copy" className="size-4" />
                        </IconButton>
                        <IconButton label="Ubah nama" onClick={() => { setRenameTarget(p); setRenameValue(p.name); }}>
                          <Icon name="file" className="size-4" />
                        </IconButton>
                        <IconButton label="Export JSON" onClick={() => doExport(p)}>
                          <Icon name="download" className="size-4" />
                        </IconButton>
                        <IconButton label="Hapus" className="hover:text-danger" onClick={() => setConfirmDelete(p)}>
                          <Icon name="trash" className="size-4" />
                        </IconButton>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={!!renameTarget} onClose={() => setRenameTarget(null)} title="Ubah nama project">
        <Input value={renameValue} onChange={(e) => setRenameValue(e.target.value)} placeholder="Nama project" autoFocus />
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setRenameTarget(null)}>Batal</Button>
          <Button onClick={doRename} disabled={!renameValue.trim()}>Simpan</Button>
        </div>
      </Modal>

      <ConfirmDialog
        open={confirmDelete !== null}
        title="Hapus project?"
        description={`Project "${confirmDelete?.name || ""}" akan dihapus permanen dan tidak bisa dikembalikan.`}
        confirmLabel="Hapus"
        onConfirm={() => {
          if (confirmDelete) doDelete(confirmDelete);
          setConfirmDelete(null);
        }}
        onCancel={() => setConfirmDelete(null)}
      />
    </div>
  );
}