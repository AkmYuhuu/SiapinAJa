"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useToast } from "@/components/ui/toast";
import {
  buildExportFile,
  deleteProject,
  duplicateProject,
  getProject,
  importProjectFromText,
  listProjects,
  makeProject,
  renameProject,
  saveProject,
} from "@/lib/projects";
import type { Project } from "@/lib/projects";

export interface UseProjectOptions {
  toolId: string;
  /** Produce the current data payload to persist. */
  getData: () => unknown;
}

export interface UseProjectReturn {
  projects: Project[];
  current: Project | null;
  loading: boolean;
  save: () => Promise<Project | null>;
  dupe: () => Promise<void>;
  remove: () => Promise<void>;
  rename: (name: string) => Promise<void>;
  confirmDeleteOpen: boolean;
  openConfirmDelete: () => void;
  closeConfirmDelete: () => void;
  exportJson: () => void;
  importJsonFile: (file: File) => Promise<Project | null>;
  load: (id: string) => Promise<void>;
  refresh: () => Promise<void>;
}

/**
 * Project lifecycle for tools with projects (spec §6):
 * Save / Export JSON / Import JSON / Duplicate / Delete.
 */
export function useProject({ toolId, getData }: UseProjectOptions): UseProjectReturn {
  const { toast } = useToast();
  const [projects, setProjects] = useState<Project[]>([]);
  const [current, setCurrent] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const dataRef = useRef(getData);
  useEffect(() => {
    dataRef.current = getData;
  }, [getData]);

  const refresh = useCallback(async () => {
    try {
      const all = await listProjects(toolId);
      setProjects(all);
    } catch {
      setProjects([]);
    } finally {
      setLoading(false);
    }
  }, [toolId]);

  useEffect(() => {
    let cancelled = false;
    listProjects(toolId)
      .then((all) => {
        if (!cancelled) setProjects(all);
      })
      .catch(() => {
        if (!cancelled) setProjects([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    const id =
      typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("project") : null;
    if (id) {
      getProject(id).then((p) => {
        if (!cancelled && p && p.toolId === toolId) setCurrent(p);
      });
    }
    return () => {
      cancelled = true;
    };
  }, [toolId]);

  const save = useCallback(async () => {
    try {
      const payload = dataRef.current();
      let p: Project;
      if (current && current.id.startsWith("project_")) {
        p = { ...current, name: current.name, data: payload };
        await saveProject(p);
      } else {
        p = makeProject(toolId, toolId, payload);
        await saveProject(p);
      }
      setCurrent(p);
      setProjects(await listProjects(toolId));
      toast("Tersimpan.");
      return p;
    } catch (e) {
      toast(e instanceof Error ? e.message : "Project gagal disimpan.", "error");
      return null;
    }
  }, [current, toolId, toast]);

  const dupe = useCallback(async () => {
    if (!current) {
      toast("Simpan project dulu sebelum menyalinnya.", "info");
      return;
    }
    const copy = await duplicateProject(current.id);
    if (copy) {
      setProjects(await listProjects(toolId));
      toast("Project disalin.");
    }
  }, [current, toolId, toast]);

  const openConfirmDelete = useCallback(() => setConfirmDeleteOpen(true), []);
  const closeConfirmDelete = useCallback(() => setConfirmDeleteOpen(false), []);

  const rename = useCallback(async (name: string) => {
    const n = name.trim();
    if (!current || !n) return;
    await renameProject(current.id, n);
    setCurrent({ ...current, name: n });
    setProjects(await listProjects(toolId));
    toast("Nama project diubah.");
  }, [current, toolId, toast]);

  const remove = useCallback(async () => {
    if (!current) return;
    setConfirmDeleteOpen(false);
    await deleteProject(current.id);
    setCurrent(null);
    setProjects(await listProjects(toolId));
    toast("Project dihapus.");
  }, [current, toolId, toast]);

  const exportJson = useCallback(() => {
    if (!current || !current.id.startsWith("project_")) {
      toast("Simpan project dulu sebelum ekspor.", "info");
      return;
    }
    const file = buildExportFile(current);
    downloadJson(file, current);
    toast("File project siap diunduh.");
  }, [current, toast]);

  const importJsonFile = useCallback(async (file: File) => {
    const text = await file.text();
    const result = await importProjectFromText(text, toolId);
    if (!result.ok) {
      toast(result.error ?? "File project tidak dapat dibaca atau dibuat oleh SiapinAja.", "error");
      return null;
    }
    const p = result.project;
    if (!p) return null;
    setCurrent(p);
    setProjects(await listProjects(toolId));
    toast("Project berhasil diimpor.");
    return p ?? null;
  }, [toolId, toast]);

  const load = useCallback(async (id: string) => {
    const p = await getProject(id);
    if (!p) return;
    setCurrent(p);
  }, []);

  return { projects, current, loading, save, dupe, remove, rename, confirmDeleteOpen, openConfirmDelete, closeConfirmDelete, exportJson, importJsonFile, load, refresh };
}

function downloadJson(file: ReturnType<typeof buildExportFile>, project: Project) {
  const blob = new Blob([JSON.stringify(file, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${project.name.replace(/[^\w\- ]/g, "").trim() || project.toolId}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}