// Project CRUD over IndexedDB + JSON import/export validation.
// Project shape (spec §5.3):
// { id, toolId, version, createdAt, updatedAt, data: unknown }

import { idbAll, idbDelete, idbGet, idbPut, StorageError } from "./idb";
import { STORES } from "./idb";

export interface Project {
  id: string;
  toolId: string;
  name: string;
  version: number;
  createdAt: string;
  updatedAt: string;
  data: unknown;
}

// App identifier written to JSON exports. Must match the final brand exactly
// (CODEBASE_CLEANUP §30: no typo identifiers across files).
export const EXPORT_APP = "siapinaja";

// Legacy typo used by older exports; still accepted on import for compatibility.
const LEGACY_EXPORT_APPS = ["siapinasaja"];

export function newId(prefix = "p"): string {
  return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

export function nowISO(): string {
  return new Date().toISOString();
}

export function makeProject(toolId: string, name: string, data: unknown): Project {
  const now = nowISO();
  return {
    id: newId("project"),
    toolId,
    name: name || toolId,
    version: 1,
    createdAt: now,
    updatedAt: now,
    data,
  };
}

export async function saveProject(p: Project): Promise<Project> {
  p.updatedAt = nowISO();
  await idbPut(STORES.projects, p);
  return p;
}

export async function getProject(id: string): Promise<Project | undefined> {
  return idbGet<Project>(STORES.projects, id);
}

export async function listProjects(toolId?: string): Promise<Project[]> {
  const all = await idbAll<Project>(STORES.projects);
  const sorted = all.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  return toolId ? sorted.filter((p) => p.toolId === toolId) : sorted;
}

export async function duplicateProject(id: string): Promise<Project | undefined> {
  const src = await getProject(id);
  if (!src) return undefined;
  const copy = makeProject(src.toolId, `${src.name} (salinan)`, structuredClone(src.data));
  copy.data = structuredClone(src.data);
  await idbPut(STORES.projects, copy);
  return copy;
}

export async function renameProject(id: string, name: string): Promise<void> {
  const p = await getProject(id);
  if (!p) return;
  p.name = name || p.name;
  p.updatedAt = nowISO();
  await idbPut(STORES.projects, p);
}

export async function deleteProject(id: string): Promise<void> {
  await idbDelete(STORES.projects, id);
}

// ---- JSON import / export (spec §6) ----

export interface ExportFile {
  app: string;
  tool: string;
  version: number;
  projectId: string;
  name: string;
  data: unknown;
}

export function buildExportFile(p: Project): ExportFile {
  return {
    app: EXPORT_APP,
    tool: p.toolId,
    version: p.version,
    projectId: p.id,
    name: p.name,
    data: p.data,
  };
}

const MAX_STRING_LENGTH = 50_000;
const MAX_PROJECT_SIZE = 20 * 1024 * 1024;

// Spec §5.3: version drives migration. V1 projects are version 1. When the
// schema for a tool changes, register a migration here so old exports remain
// importable instead of being rejected.
const MIGRATIONS: Record<string, Record<number, (data: unknown) => unknown>> = {};
const SUPPORTED_VERSIONS = [1];

/** Migrate project data to the latest version (no-op for current version). */
export function migrateProject(toolId: string, data: unknown, fromVersion: number): unknown {
  let out = data;
  const chain = MIGRATIONS[toolId];
  if (chain) {
    for (const v of Object.keys(chain)
      .map(Number)
      .sort((a, b) => a - b)) {
      if (v > fromVersion) out = chain[v](out);
    }
  }
  return out;
}

export interface ImportResult {
  ok: boolean;
  error?: string;
  project?: Project;
}

/** Validate an imported JSON file before it touches the database (spec §6). */
export function validateImport(raw: unknown, expectedToolId?: string): ImportResult {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    return fail("File project tidak dapat dibaca atau dibuat oleh SiapinAja.");
  }
  const obj = raw as Record<string, unknown>;

  const app = obj.app;
  if (app !== EXPORT_APP && !LEGACY_EXPORT_APPS.includes(String(app))) {
    return fail("File project tidak dapat dibaca atau dibuat oleh SiapinAja.");
  }

  const tool = obj.tool;
  if (typeof tool !== "string" || !tool) {
    return fail("File project tidak dapat dibaca atau dibuat oleh SiapinAja.");
  }
  if (expectedToolId && tool !== expectedToolId) {
    return fail(
      "File ini bukan project untuk tool yang sedang dibuka. Buka tool yang sesuai lalu coba lagi.",
    );
  }

  const version = obj.version;
  if (typeof version !== "number" || !Number.isInteger(version) || version < 1 || !SUPPORTED_VERSIONS.includes(version)) {
    return fail("Versi file project tidak didukung.");
  }

  if (typeof obj.data !== "object" || obj.data === null) {
    return fail("Isi project dalam file tidak valid.");
  }

  const depthCheck = checkValues(obj.data, 0);
  if (!depthCheck) return fail("File project tidak dapat dibaca atau dibuat oleh SiapinAja.");
  if (!checkFileUrls(obj.data)) {
    return fail("File project tidak dapat dibaca atau dibuat oleh SiapinAja.");
  }

  return { ok: true };
}

function checkValues(value: unknown, depth: number): boolean {
  if (depth > 12) return false;
  if (value === null) return true;
  if (typeof value === "number") return Number.isFinite(value);
  if (typeof value === "string") return value.length <= MAX_STRING_LENGTH;
  if (typeof value === "boolean") return true;
  if (Array.isArray(value)) return value.every((v) => checkValues(v, depth + 1));
  if (typeof value === "object") {
    return Object.values(value as Record<string, unknown>).every((v) =>
      checkValues(v, depth + 1),
    );
  }
  return false;
}

/** Spec §6 item 7: file/URL values must be well-formed (data:, http(s), or empty). */
function checkFileUrls(value: unknown, depth = 0): boolean {
  if (depth > 12) return true;
  if (typeof value === "string") {
    const s = value.trim().toLowerCase();
    if (s.length === 0) return true;
    if (s.startsWith("data:")) {
      if (!/^data:image\/(png|jpeg|webp|gif);base64,[a-z0-9+/=\s]+$/i.test(s)) return false;
    } else if (s.includes("://") || s.startsWith("blob:")) {
      if (!/^https?:\/\//i.test(s) && !s.startsWith("blob:")) return false;
    }
    return true;
  }
  if (Array.isArray(value)) return value.every((v) => checkFileUrls(v, depth + 1));
  if (value !== null && typeof value === "object") {
    return Object.values(value as Record<string, unknown>).every((v) => checkFileUrls(v, depth + 1));
  }
  return true;
}

function fail(error: string): ImportResult {
  return { ok: false, error };
}

/** Parse text, validate, and persist as a new project only when valid. */
export async function importProjectFromText(
  text: string,
  expectedToolId?: string,
): Promise<ImportResult> {
  let parsed: unknown;
  try {
    if (text.length > MAX_PROJECT_SIZE) {
      return fail("File project terlalu besar. Batas ukuran adalah 20 MB.");
    }
    parsed = JSON.parse(text);
  } catch {
    return fail("File project tidak dapat dibaca atau dibuat oleh SiapinAja.");
  }
  const check = validateImport(parsed, expectedToolId);
  if (!check.ok) return check;
  const obj = parsed as Record<string, unknown>;
  const toolId = obj.tool as string;
  const name = (typeof obj.name === "string" && obj.name ? obj.name : toolId) as string;
  const version = typeof obj.version === "number" ? obj.version : 1;
  const data = migrateProject(toolId, obj.data, version);
  try {
    const project = makeProject(toolId, name, data);
    if (typeof obj.projectId === "string" && /^[a-zA-Z0-9_\-]+$/.test(obj.projectId)) {
      project.id = obj.projectId;
    }
    await saveProject(project);
    return { ok: true, project };
  } catch (e) {
    if (e instanceof StorageError) return { ok: false, error: e.message };
    return fail("Project gagal disimpan ke penyimpanan lokal.");
  }
}