"use client";

import { useMemo, useRef, useState } from "react";
import { Dropzone } from "@/components/media/dropzone";
import { Button, IconButton } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/fields";
import { SegmentedControl } from "@/components/ui/tabs";
import { Icon } from "@/components/icons";
import { ProgressBar } from "@/components/ui/empty";
import { FORMAT_EXT, FORMAT_LABEL, loadImage, resizeImageFile } from "@/lib/image";
import type { ImageFormat } from "@/lib/image";
import { downloadBlob, makeZip } from "@/lib/export";
import { formatBytes } from "@/lib/format";
import { useToast } from "@/components/ui/toast";

interface Preset {
  id: string;
  label: string;
  w: number | null;
  h: number | null;
}

const PRESETS: Preset[] = [
  { id: "11", label: "1:1", w: 1080, h: 1080 },
  { id: "45", label: "4:5", w: 1080, h: 1350 },
  { id: "916", label: "9:16", w: 1080, h: 1920 },
  { id: "169", label: "16:9", w: 1920, h: 1080 },
  { id: "a4", label: "A4", w: 1240, h: 1754 },
  { id: "market", label: "Marketplace", w: 1080, h: 1080 },
  { id: "custom", label: "Custom", w: null, h: null },
];

interface QueueItem {
  file: File;
  previewUrl: string;
  outUrl?: string;
  done: boolean;
  error?: string;
  outBlob?: Blob;
  outSize?: number;
  origW: number;
  origH: number;
  width: number;
  height: number;
}

export default function ImageResizerTool() {
  const [items, setItems] = useState<QueueItem[]>([]);
  const [selected, setSelected] = useState(0);
  const [format, setFormat] = useState<ImageFormat>("image/jpeg");
  const [preset, setPreset] = useState("market");
  const [width, setWidth] = useState(1080);
  const [height, setHeight] = useState(1080);
  const [lockAspect, setLockAspect] = useState(true);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const { toast } = useToast();
  const urlsRef = useRef<string[]>([]);

  const ready = items.filter((i) => i.done && !i.error);
  const sel = items.length > 0 ? items[Math.min(selected, items.length - 1)] : null;

  const stats = useMemo(() => {
    const before = ready.reduce((s, i) => s + i.file.size, 0);
    const after = ready.reduce((s, i) => s + (i.outSize ?? 0), 0);
    const pct = before > 0 ? Math.round(((before - after) / before) * 100) : 0;
    return { before, after, pct };
  }, [ready]);

  const process = async (files: File[]) => {
    if (busy) return;
    setBusy(true);
    setProgress(0);
    const total = files.length;
    let doneCount = 0;
    try {
      const CONCURRENCY = 3;
      let cursor = 0;
      const worker = async () => {
        while (cursor < total) {
          const i = cursor++;
          const file = files[i];
          try {
            const img = await loadImage(file);
            const origW = img.naturalWidth;
            const origH = img.naturalHeight;
            const w = width > 0 ? width : undefined;
            const h = height > 0 ? height : undefined;
            const res = await resizeImageFile(file, {
              width: w,
              height: h,
              format,
              quality: 0.9,
              lockAspect,
            });
            const outUrl = URL.createObjectURL(res.blob);
            urlsRef.current.push(outUrl);
            setItems((prev) =>
              prev.map((it) =>
                it.file === file
                  ? {
                      ...it,
                      done: true,
                      outBlob: res.blob,
                      outUrl,
                      outSize: res.blob.size,
                      origW,
                      origH,
                      width: res.width,
                      height: res.height,
                    }
                  : it,
              ),
            );
          } catch (e) {
            setItems((prev) =>
              prev.map((it) =>
                it.file === file
                  ? { ...it, done: true, error: e instanceof Error ? e.message : "Gagal diproses" }
                  : it,
              ),
            );
          } finally {
            doneCount++;
            setProgress(Math.round((doneCount / total) * 100));
          }
        }
      };
      await Promise.all(Array.from({ length: Math.min(CONCURRENCY, total) }, () => worker()));
    } finally {
      setBusy(false);
      toast("Foto sudah diproses.");
    }
  };

  const addFiles = (files: File[]) => {
    const accepted = files.filter((f) => f.type.startsWith("image/"));
    if (accepted.length !== files.length) toast("Beberapa file bukan gambar dan dilewati.", "error");
    if (accepted.length === 0) return;
    const next: QueueItem[] = accepted.map((file) => ({
      file,
      previewUrl: URL.createObjectURL(file),
      done: false,
      origW: 0,
      origH: 0,
      width: 0,
      height: 0,
    }));
    urlsRef.current.push(...next.map((n) => n.previewUrl));
    setItems((prev) => [...prev, ...next]);
    process(accepted);
  };

  const applyPreset = (id: string) => {
    setPreset(id);
    const p = PRESETS.find((x) => x.id === id);
    if (p && p.w && p.h) {
      setWidth(p.w);
      setHeight(p.h);
      setLockAspect(true);
    }
  };

  const reprocess = () => {
    if (items.length === 0) return;
    process(items.map((i) => i.file));
  };

  const downloadOne = (item: QueueItem) => {
    if (!item.outBlob) return;
    downloadBlob(item.outBlob, outputName(item.file.name, item.width, item.height, format));
  };

  const downloadAll = async () => {
    if (ready.length === 0) return;
    const files = ready.map((i) => ({
      name: outputName(i.file.name, i.width, i.height, format),
      blob: i.outBlob as Blob,
    }));
    await makeZip(files, "siapinaja-resized.zip");
    toast("ZIP siap diunduh.");
  };

  const clearAll = () => {
    urlsRef.current.forEach((u) => URL.revokeObjectURL(u));
    urlsRef.current = [];
    setItems([]);
    setSelected(0);
    setProgress(0);
  };

  return (
    <div className="space-y-4">
      {items.length === 0 ? (
        <Dropzone
          onFiles={addFiles}
          accept="image/*"
          title="Drop gambar di sini"
          hint="Ubah dimensi banyak gambar sekaligus. Preset siap pakai untuk marketplace dan sosial media."
          icon="image"
        />
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-surface p-4">
            <p className="text-sm font-semibold text-ink">
              {items.length} file · {ready.length} selesai
              {stats.before > 0 && (
                <span className="ml-2 text-ink-secondary tabular">
                  {formatBytes(stats.before)} → {formatBytes(stats.after)} · Hemat{" "}
                  <strong className="text-success">{stats.pct}%</strong>
                </span>
              )}
            </p>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="secondary" onClick={reprocess} disabled={busy}>
                <Icon name="refresh" className="size-3.5" />
                Proses Ulang
              </Button>
              <Button size="sm" variant="ghost" onClick={clearAll}>
                <Icon name="trash" className="size-3.5" />
                Bersihkan
              </Button>
              <Button size="sm" onClick={downloadAll} disabled={ready.length === 0 || busy}>
                <Icon name="download" className="size-3.5" />
                Download Semua
              </Button>
            </div>
          </div>
          {busy && <ProgressBar value={progress} />}

          <div className="grid gap-4 lg:grid-cols-[1fr_300px]">
            <div className="rounded-lg border border-border bg-surface p-4">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-sm font-semibold text-ink">Pratinjau</p>
                <p className="truncate text-xs text-ink-faint">{sel?.file.name}</p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-ink-secondary">Sebelum</p>
                  <div className="flex aspect-square items-center justify-center overflow-hidden rounded-lg bg-surface-muted">
                    {sel && (
                      <img src={sel.previewUrl} alt={sel.file.name} className="max-h-full max-w-full object-contain" />
                    )}
                  </div>
                  <p className="mt-2 text-xs text-ink-secondary tabular">
                    {sel && (sel.origW > 0 ? `${sel.origW} × ${sel.origH}px` : "proses…")} ·{" "}
                    {sel ? formatBytes(sel.file.size) : ""}
                  </p>
                </div>
                <div>
                  <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-ink-secondary">Sesudah</p>
                  <div className="flex aspect-square items-center justify-center overflow-hidden rounded-lg bg-surface-muted">
                    {sel?.outUrl ? (
                      <img src={sel.outUrl} alt={`${sel.file.name} hasil`} className="max-h-full max-w-full object-contain" />
                    ) : (
                      <p className="text-xs text-ink-faint">{sel?.error ?? "proses…"}</p>
                    )}
                  </div>
                  <p className="mt-2 text-xs text-ink-secondary tabular">
                    {sel && sel.done && sel.outBlob
                      ? `${sel.width} × ${sel.height}px · ${formatBytes(sel.outSize ?? 0)}`
                      : sel?.error ?? ""}
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-4 rounded-lg border border-border bg-surface p-4">
              <Field label="Preset">
                <SegmentedControl
                  options={PRESETS.map((p) => ({ value: p.id, label: p.label }))}
                  value={preset}
                  onChange={applyPreset}
                  className="flex-wrap"
                />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Lebar (px)">
                  <Input
                    type="number"
                    min={1}
                    value={width || ""}
                    onChange={(e) => setWidth(Math.max(0, Number(e.target.value)))}
                    aria-label="Lebar target dalam pixel"
                  />
                </Field>
                <Field label="Tinggi (px)">
                  <Input
                    type="number"
                    min={1}
                    value={height || ""}
                    onChange={(e) => setHeight(Math.max(0, Number(e.target.value)))}
                    aria-label="Tinggi target dalam pixel"
                  />
                </Field>
              </div>
              <button
                type="button"
                onClick={() => setLockAspect((v) => !v)}
                aria-pressed={lockAspect}
                className="flex w-full items-center justify-center gap-2 rounded-md border border-border bg-surface px-3 py-2 text-xs font-medium text-ink transition-colors hover:bg-surface-muted cursor-pointer"
              >
                <Icon name={lockAspect ? "lock" : "resize"} className="size-3.5" />
                {lockAspect ? "Rasio asli dipertahankan" : "Rasio bebas (stretch)"}
              </button>
              <Field label="Format output">
                <Select value={format} onChange={(e) => setFormat(e.target.value as ImageFormat)}>
                  {Object.entries(FORMAT_LABEL).map(([v, l]) => (
                    <option key={v} value={v}>
                      {l}
                    </option>
                  ))}
                </Select>
              </Field>
              <Button className="w-full" onClick={reprocess} disabled={busy}>
                <Icon name="refresh" className="size-4" />
                Terapkan & Proses
              </Button>
              <p className="text-xs leading-relaxed text-ink-faint">
                Hasil disesuaikan agar tidak terpotong dan tetap proporsional. Kosongkan lebar atau tinggi untuk
                mengikuti salah satu sisi.
              </p>
            </div>
          </div>

          <div className="rounded-lg border border-border bg-surface p-4">
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-ink-secondary">Semua file</p>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-5 md:grid-cols-7">
              {items.map((item, i) => (
                <div key={item.previewUrl} className="relative">
                  <button
                    type="button"
                    onClick={() => setSelected(i)}
                    aria-label={`Pilih ${item.file.name}`}
                    className={`block w-full cursor-pointer overflow-hidden rounded-lg border transition-colors ${
                      selected === i ? "border-accent ring-2 ring-accent/30" : "border-border hover:border-accent/40"
                    }`}
                  >
                    <img src={item.previewUrl} alt={item.file.name} className="aspect-square w-full object-cover" />
                  </button>
                  <p className="mt-1 truncate text-[11px] text-ink-secondary">{item.file.name}</p>
                  <p className="truncate text-[10px] text-ink-faint tabular">
                    {item.done && !item.error
                      ? `${item.width} × ${item.height}px`
                      : item.error ?? "proses…"}
                  </p>
                  {item.done && item.outBlob && (
                    <IconButton
                      label={`Unduh ${item.file.name}`}
                      className="absolute right-1 top-1 size-7 bg-surface/90"
                      onClick={() => downloadOne(item)}
                    >
                      <Icon name="download" className="size-3.5" />
                    </IconButton>
                  )}
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function outputName(original: string, w: number, h: number, format: ImageFormat): string {
  const base = original.replace(/\.[^.]+$/, "");
  const dim = w > 0 && h > 0 ? `-${w}x${h}` : "";
  return `${base}${dim}.${FORMAT_EXT[format]}`;
}