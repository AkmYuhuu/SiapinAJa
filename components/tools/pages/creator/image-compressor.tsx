"use client";

// Image Compressor - media utility (spec §10.1). Reference implementation for
// the media interaction model: upload → preview/queue → transform → export.
// 100% client-side; batch processing with a real progress queue.

import { useMemo, useRef, useState } from "react";
import { Dropzone } from "@/components/media/dropzone";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/fields";
import { Icon } from "@/components/icons";
import { ProgressBar } from "@/components/ui/empty";
import { compressImage } from "@/lib/image";
import { formatBytes } from "@/lib/format";
import { downloadBlob, makeZip } from "@/lib/export";
import { useToast } from "@/components/ui/toast";

interface QueueItem {
  file: File;
  previewUrl: string;
  done: boolean;
  error?: string;
  outBlob?: Blob;
  outSize?: number;
  width: number;
  height: number;
}

export default function ImageCompressorTool() {
  const [items, setItems] = useState<QueueItem[]>([]);
  const [quality, setQuality] = useState(0.8);
  const [format, setFormat] = useState<"image/jpeg" | "image/png" | "image/webp">("image/jpeg");
  const [maxSizeMB, setMaxSizeMB] = useState(0);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const { toast } = useToast();
  const revokeRef = useRef<string[]>([]);

  const addFiles = (files: File[]) => {
    const limit = maxSizeMB > 0 ? maxSizeMB * 1024 * 1024 : 0;
    const rejected = limit > 0 ? files.filter((f) => f.size > limit) : [];
    const accepted = limit > 0 ? files.filter((f) => f.size <= limit) : files;
    if (rejected.length > 0) {
      toast(`${rejected.length} file lebih besar dari ${maxSizeMB} MB dan dilewati.`, "error");
    }
    if (accepted.length === 0) return;
    const next: QueueItem[] = accepted.map((file) => ({
      file,
      previewUrl: URL.createObjectURL(file),
      done: false,
      width: 0,
      height: 0,
    }));
    revokeRef.current.push(...next.map((n) => n.previewUrl));
    setItems((prev) => [...prev, ...next]);
    process(accepted);
  };

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
            const { blob, width, height } = await compressImage(file, format, quality);
            setItems((prev) =>
              prev.map((it) =>
                it.file === file
                  ? { ...it, done: true, outBlob: blob, outSize: blob.size, width, height }
                  : it,
              ),
            );
          } catch (e) {
            setItems((prev) =>
              prev.map((it) =>
                it.file === file ? { ...it, done: true, error: e instanceof Error ? e.message : "Gagal diproses" } : it,
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

  const ready = items.filter((i) => i.done && !i.error);
  const stats = useMemo(() => {
    const before = ready.reduce((s, i) => s + i.file.size, 0);
    const after = ready.reduce((s, i) => s + (i.outSize ?? 0), 0);
    const pct = before > 0 ? Math.round(((before - after) / before) * 100) : 0;
    return { before, after, pct };
  }, [ready]);

  const downloadOne = (item: QueueItem) => {
    if (!item.outBlob) return;
    downloadBlob(item.outBlob, outputName(item.file.name, format));
  };

  const downloadAll = async () => {
    const files = ready.map((i) => ({
      name: outputName(i.file.name, format),
      blob: i.outBlob as Blob,
    }));
    await makeZip(files, "siapinaja-compressed.zip");
    toast("ZIP siap diunduh.");
  };

  const clearAll = () => {
    revokeRef.current.forEach((u) => URL.revokeObjectURL(u));
    revokeRef.current = [];
    setItems([]);
    setProgress(0);
  };

  return (
    <div className="space-y-4">
      {/* controls */}
      <div className="flex flex-wrap items-end gap-3 rounded-lg border border-border bg-surface p-4">
        <Field label="Kualitas" hint={(quality * 100).toFixed(0) + "%"}>
          <input
            type="range"
            min={0.1}
            max={1}
            step={0.05}
            value={quality}
            onChange={(e) => setQuality(Number(e.target.value))}
            className="w-40 accent-[#e8620c]"
            aria-label="Kualitas kompresi"
          />
        </Field>
        <Field label="Format output">
          <Select value={format} onChange={(e) => setFormat(e.target.value as typeof format)} className="w-28">
            <option value="image/jpeg">JPG</option>
            <option value="image/png">PNG</option>
            <option value="image/webp">WebP</option>
          </Select>
        </Field>
        <Field label="Maks. ukuran file (MB)" hint={maxSizeMB > 0 ? "File lebih besar akan dilewati" : "0 = tanpa batas"}>
          <Input
            type="number"
            min={0}
            step={1}
            value={maxSizeMB || ""}
            onChange={(e) => setMaxSizeMB(Math.max(0, Number(e.target.value)))}
            className="w-24 text-right"
            placeholder="0"
            aria-label="Batas ukuran file dalam MB"
          />
        </Field>
        <span className="flex-1" />
        {items.length > 0 && (
          <>
            <Button variant="secondary" size="sm" onClick={() => process(items.filter((i) => !i.done).map((i) => i.file))}>
              <Icon name="refresh" className="size-3.5" />
              Proses Ulang
            </Button>
            <Button variant="ghost" size="sm" onClick={clearAll}>
              <Icon name="trash" className="size-3.5" />
              Bersihkan
            </Button>
          </>
        )}
      </div>

      {items.length === 0 ? (
        <Dropzone
          onFiles={addFiles}
          accept="image/*"
          title="Drop gambar di sini"
          hint="Kompres banyak gambar sekaligus. Tidak ada yang diunggah ke server."
          icon="image"
        />
      ) : (
        <div className="space-y-4">
          {/* queue summary */}
          <div className="rounded-lg border border-border bg-surface p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm font-semibold text-ink">
                {items.length} file
                {stats.before > 0 && (
                  <span className="ml-2 text-ink-secondary tabular">
                    {formatBytes(stats.before)} → {formatBytes(stats.after)} · Hemat{" "}
                    <strong className="text-success">{stats.pct}%</strong>
                  </span>
                )}
              </p>
              <Button size="sm" onClick={downloadAll} disabled={ready.length === 0 || busy}>
                <Icon name="download" className="size-3.5" />
                Download Semua
              </Button>
            </div>
            {busy && <ProgressBar value={progress} className="mt-3" />}
          </div>

          {/* queue table */}
          <div className="overflow-x-auto rounded-lg border border-border bg-surface">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b border-border bg-surface-muted text-left text-[11px] uppercase tracking-wide text-ink-faint">
                  <th className="px-4 py-2.5 font-semibold">File</th>
                  <th className="px-4 py-2.5 text-right font-semibold">Ukuran awal</th>
                  <th className="px-4 py-2.5 text-right font-semibold">Ukuran hasil</th>
                  <th className="px-4 py-2.5 text-right font-semibold">Hemat</th>
                  <th className="px-4 py-2.5 text-right font-semibold">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.file.name + item.previewUrl} className="border-b border-border last:border-0">
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-3">
                        <img src={item.previewUrl} alt={item.file.name} className="size-10 rounded object-cover" />
                        <div className="min-w-0">
                          <p className="truncate font-medium text-ink">{item.file.name}</p>
                          <p className="text-[11px] text-ink-faint">
                            {item.width > 0 ? `${item.width} × ${item.height}px` : "proses…"}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-right tabular text-ink-secondary">{formatBytes(item.file.size)}</td>
                    <td className="px-4 py-2.5 text-right tabular">{item.error ? "-" : item.outSize ? formatBytes(item.outSize) : "…"}</td>
                    <td className="px-4 py-2.5 text-right">
                      {item.error ? (
                        <span className="text-[12px] text-danger">{item.error}</span>
                      ) : item.outSize ? (
                        <span className="font-semibold tabular text-success">
                          {item.file.size > 0 ? `−${Math.round(((item.file.size - item.outSize) / item.file.size) * 100)}%` : "0%"}
                        </span>
                      ) : (
                        <span className="text-ink-faint">…</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      {item.done && item.outBlob && (
                        <Button size="sm" variant="secondary" onClick={() => downloadOne(item)}>
                          <Icon name="download" className="size-3.5" />
                          Unduh
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function outputName(original: string, format: "image/jpeg" | "image/png" | "image/webp"): string {
  const base = original.replace(/\.[^.]+$/, "");
  const ext = format === "image/jpeg" ? "jpg" : format === "image/png" ? "png" : "webp";
  return `${base}-compressed.${ext}`;
}