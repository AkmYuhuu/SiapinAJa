"use client";

import { useEffect, useRef, useState } from "react";
import { Dropzone } from "@/components/media/dropzone";
import { Button, IconButton } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/fields";
import { SectionTitle, Divider } from "@/components/ui/card";
import { Icon } from "@/components/icons";
import { ProgressBar } from "@/components/ui/empty";
import {
  addWatermark,
  canvasToBlob,
  fileToDataURL,
  loadImage,
  renderToCanvas,
} from "@/lib/image";
import type { ImageFormat, WatermarkOptions } from "@/lib/image";
import { FORMAT_EXT } from "@/lib/image";
import { downloadBlob, makeZip } from "@/lib/export";
import { useToast } from "@/components/ui/toast";

interface CropRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface OutPreset {
  id: string;
  label: string;
  w: number;
  h: number;
}

const OUT_PRESETS: OutPreset[] = [
  { id: "marketplace", label: "Marketplace · 1080×1080", w: 1080, h: 1080 },
  { id: "ig-post", label: "Instagram Post · 1080×1080", w: 1080, h: 1080 },
  { id: "ig-story", label: "Instagram Story · 1080×1920", w: 1080, h: 1920 },
  { id: "wa", label: "WhatsApp · 800×800", w: 800, h: 800 },
  { id: "catalog", label: "Katalog · 1200×1500", w: 1200, h: 1500 },
];

const RATIO: Record<string, number> = {
  "11": 1,
  "45": 4 / 5,
  "916": 9 / 16,
  "169": 16 / 9,
};

const POSITIONS: Array<{ value: WatermarkOptions["position"]; label: string }> = [
  { value: "bottom-right", label: "Kanan bawah" },
  { value: "bottom-left", label: "Kiri bawah" },
  { value: "top-right", label: "Kanan atas" },
  { value: "top-left", label: "Kiri atas" },
  { value: "center", label: "Tengah" },
];

interface OutputItem {
  id: string;
  file: File;
  presetLabel: string;
  presetId: string;
  url: string;
  blob: Blob;
  size: number;
  width: number;
  height: number;
}

export default function ProductPhotoTool() {
  const [files, setFiles] = useState<File[]>([]);
  const [selected, setSelected] = useState(0);
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [imgW, setImgW] = useState(0);
  const [imgH, setImgH] = useState(0);
  const [crop, setCrop] = useState<CropRect>({ x: 0, y: 0, w: 0, h: 0 });
  const [aspect] = useState("free");
  const [bgOn, setBgOn] = useState(false);
  const [bgColor, setBgColor] = useState("#ffffff");
  const [wmText, setWmText] = useState("");
  const [wmPos, setWmPos] = useState<WatermarkOptions["position"]>("bottom-right");
  const [wmOpacity, setWmOpacity] = useState(0.7);
  const [logoData, setLogoData] = useState<string | null>(null);
  const [logoName, setLogoName] = useState("");
  const [format, setFormat] = useState<ImageFormat>("image/jpeg");
  const [quality, setQuality] = useState(0.9);
  const [selectedOutputs, setSelectedOutputs] = useState<string[]>(OUT_PRESETS.map((p) => p.id));
  const [outputs, setOutputs] = useState<OutputItem[]>([]);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dragRef = useRef<{ x: number; y: number } | null>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const outUrlsRef = useRef<string[]>([]);
  const { toast } = useToast();

  if (files.length === 0 && (img !== null || imgW !== 0 || imgH !== 0)) {
    setImg(null);
    setImgW(0);
    setImgH(0);
  }

  useEffect(() => {
    if (files.length === 0) return;
    let cancelled = false;
    const file = files[Math.min(selected, files.length - 1)];
    loadImage(file)
      .then((im) => {
        if (cancelled) return;
        setImg(im);
        setImgW(im.naturalWidth);
        setImgH(im.naturalHeight);
        setCrop({ x: 0, y: 0, w: im.naturalWidth, h: im.naturalHeight });
      })
      .catch(() => {
        if (!cancelled) setImg(null);
      });
    return () => {
      cancelled = true;
    };
  }, [files, selected]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !img || imgW === 0 || imgH === 0) return;
    const maxW = 720;
    const scale = Math.min(1, maxW / imgW);
    const dw = Math.max(1, Math.round(imgW * scale));
    const dh = Math.max(1, Math.round(imgH * scale));
    canvas.width = dw;
    canvas.height = dh;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, dw, dh);
    ctx.drawImage(img, 0, 0, dw, dh);
    const sx = crop.x * (dw / imgW);
    const sy = crop.y * (dh / imgH);
    const sw = Math.min(crop.w * (dw / imgW), dw - sx);
    const sh = Math.min(crop.h * (dh / imgH), dh - sy);
    ctx.fillStyle = "rgba(20,18,15,0.5)";
    ctx.beginPath();
    ctx.rect(0, 0, dw, dh);
    ctx.rect(sx, sy, sw, sh);
    ctx.fill("evenodd");
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 2;
    ctx.strokeRect(sx, sy, sw, sh);
    ctx.font = "600 13px Inter, sans-serif";
    ctx.fillStyle = "rgba(0,0,0,0.65)";
    ctx.fillRect(sx, sy - 22, 150, 20);
    ctx.fillStyle = "#ffffff";
    ctx.fillText(`${Math.round(crop.w)} × ${Math.round(crop.h)}px`, sx + 6, sy - 7);
  }, [img, imgW, imgH, crop]);

  const toImagePos = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const dx = (e.clientX - rect.left) * (canvas.width / rect.width);
    const dy = (e.clientY - rect.top) * (canvas.height / rect.height);
    return {
      x: Math.round(dx * (imgW / canvas.width)),
      y: Math.round(dy * (imgH / canvas.height)),
    };
  };

  const updateFromDrag = (start: { x: number; y: number }, cur: { x: number; y: number }) => {
    const ratio = aspect !== "free" ? RATIO[aspect] : 0;
    let x = Math.min(start.x, cur.x);
    let y = Math.min(start.y, cur.y);
    let w = Math.abs(cur.x - start.x);
    let h = Math.abs(cur.y - start.y);
    if (ratio > 0) {
      if (w / Math.max(h, 1) > ratio) h = w / ratio;
      else w = h * ratio;
    }
    x = Math.max(0, Math.min(x, imgW));
    y = Math.max(0, Math.min(y, imgH));
    w = Math.max(8, Math.min(w, imgW - x));
    h = Math.max(8, Math.min(h, imgH - y));
    setCrop({ x: Math.round(x), y: Math.round(y), w: Math.round(w), h: Math.round(h) });
  };

  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!img) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = toImagePos(e);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!dragRef.current || !img) return;
    updateFromDrag(dragRef.current, toImagePos(e));
  };

  const onPointerUp = () => {
    dragRef.current = null;
  };

  const setCropField = (key: "x" | "y" | "w" | "h", value: number) => {
    const next = { ...crop, [key]: Math.max(0, Math.round(value)) };
    const ratio = aspect !== "free" ? RATIO[aspect] : 0;
    if (ratio > 0) {
      if (key === "w") next.h = Math.round(next.w / ratio);
      if (key === "h") next.w = Math.round(next.h * ratio);
    }
    next.x = Math.min(next.x, Math.max(0, imgW - 1));
    next.y = Math.min(next.y, Math.max(0, imgH - 1));
    next.w = Math.min(next.w, Math.max(1, imgW - next.x));
    next.h = Math.min(next.h, Math.max(1, imgH - next.y));
    setCrop(next);
  };

  const addFiles = (incoming: File[]) => {
    const accepted = incoming.filter((f) => f.type.startsWith("image/"));
    if (accepted.length !== incoming.length) toast("Beberapa file bukan gambar dan dilewati.", "error");
    if (accepted.length === 0) return;
    outUrlsRef.current.forEach((u) => URL.revokeObjectURL(u));
    outUrlsRef.current = [];
    setOutputs([]);
    setFiles((prev) => [...prev, ...accepted]);
  };

  const toggleOutput = (id: string) => {
    setSelectedOutputs((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id],
    );
  };

  const handleLogo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    try {
      const data = await fileToDataURL(f);
      setLogoData(data);
      setLogoName(f.name);
    } catch {
      toast("Logo gagal dibaca.", "error");
    }
  };

  const processOne = async (file: File, preset: OutPreset): Promise<OutputItem> => {
    const im = await loadImage(file);
    const cx = Math.min(crop.x, Math.max(0, im.naturalWidth - 1));
    const cy = Math.min(crop.y, Math.max(0, im.naturalHeight - 1));
    const cw = Math.max(1, Math.min(crop.w, im.naturalWidth - cx));
    const ch = Math.max(1, Math.min(crop.h, im.naturalHeight - cy));
    const cropCanvas = document.createElement("canvas");
    cropCanvas.width = cw;
    cropCanvas.height = ch;
    const ctx = cropCanvas.getContext("2d");
    if (!ctx) throw new Error("Canvas tidak tersedia di browser ini.");
    if (bgOn) {
      ctx.fillStyle = bgColor;
      ctx.fillRect(0, 0, cw, ch);
    }
    ctx.drawImage(im, cx, cy, cw, ch, 0, 0, cw, ch);
    let canvas = renderToCanvas(cropCanvas, {
      width: preset.w,
      height: preset.h,
      format,
      quality,
      background: bgOn ? bgColor : undefined,
      fit: bgOn ? "contain" : "cover",
    });
    if (wmText.trim().length > 0) {
      let logo: HTMLImageElement | null = null;
      if (logoData) {
        try {
          logo = await loadImage(logoData);
        } catch {
          logo = null;
        }
      }
      canvas = addWatermark(canvas, {
        text: wmText.trim(),
        position: wmPos,
        opacity: wmOpacity,
        logo,
      });
    }
    const blob = await canvasToBlob(canvas, format, quality);
    const url = URL.createObjectURL(blob);
    return {
      id: `${file.name}-${preset.id}-${Date.now()}`,
      file,
      presetId: preset.id,
      presetLabel: preset.label,
      url,
      blob,
      size: blob.size,
      width: preset.w,
      height: preset.h,
    };
  };

  const processAll = async () => {
    if (busy || files.length === 0 || selectedOutputs.length === 0) return;
    setBusy(true);
    setProgress(0);
    const tasks: Array<{ file: File; preset: OutPreset }> = [];
    for (const f of files) {
      for (const pid of selectedOutputs) {
        const preset = OUT_PRESETS.find((p) => p.id === pid);
        if (preset) tasks.push({ file: f, preset });
      }
    }
    const results: OutputItem[] = [];
    let doneCount = 0;
    try {
      const CONCURRENCY = 2;
      let cursor = 0;
      const worker = async () => {
        while (cursor < tasks.length) {
          const i = cursor++;
          try {
            results.push(await processOne(tasks[i].file, tasks[i].preset));
          } catch {
            toast(`Gagal memproses ${tasks[i].file.name}.`, "error");
          } finally {
            doneCount++;
            setProgress(Math.round((doneCount / tasks.length) * 100));
          }
        }
      };
      await Promise.all(Array.from({ length: Math.min(CONCURRENCY, tasks.length) }, () => worker()));
      outUrlsRef.current.forEach((u) => URL.revokeObjectURL(u));
      outUrlsRef.current = results.map((r) => r.url);
      setOutputs(results);
      toast(`${results.length} output siap diunduh.`);
    } finally {
      setBusy(false);
    }
  };

  const downloadOne = (item: OutputItem) => {
    downloadBlob(item.blob, outputName(item.file.name, item.presetId, format));
  };

  const downloadAll = async () => {
    if (outputs.length === 0) return;
    const zips = outputs.map((o) => ({
      name: outputName(o.file.name, o.presetId, format),
      blob: o.blob,
    }));
    await makeZip(zips, "siapinaja-product-photo.zip");
    toast("ZIP siap diunduh.");
  };

  const clearAll = () => {
    outUrlsRef.current.forEach((u) => URL.revokeObjectURL(u));
    outUrlsRef.current = [];
    setFiles([]);
    setOutputs([]);
    setProgress(0);
  };

  const activeStep = files.length === 0 ? 1 : outputs.length > 0 ? 4 : 3;
  const steps = ["1 Upload", "2 Crop", "3 Branding", "4 Export"];

  return (
    <div className="space-y-4">
      {files.length === 0 ? (
        <Dropzone
          onFiles={addFiles}
          accept="image/*"
          title="Drop foto produk di sini"
          hint="Satu foto bisa jadi banyak ukuran: crop, resize, latar, dan watermark sekaligus."
          icon="image"
        />
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-surface p-3.5">
            <div className="flex flex-wrap items-center gap-1.5">
              {steps.map((s, i) => (
                <span key={s} className="flex items-center gap-1.5">
                  {i > 0 && <span className="text-ink-faint">→</span>}
                  <span
                    className={`rounded-md px-2 py-1 text-xs font-medium ${
                      i + 1 === activeStep
                        ? "bg-accent-surface text-accent-ink"
                        : i + 1 < activeStep
                          ? "text-success"
                          : "text-ink-faint"
                    }`}
                  >
                    {i + 1 < activeStep ? "✓ " : ""}
                    {s}
                  </span>
                </span>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="ghost" onClick={clearAll}>
                <Icon name="trash" className="size-3.5" />
                Bersihkan
              </Button>
              <Button size="sm" onClick={downloadAll} disabled={outputs.length === 0}>
                <Icon name="download" className="size-3.5" />
                Unduh ZIP
              </Button>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-[1fr_300px]">
            <div className="space-y-4">
              <div className="rounded-lg border border-border bg-surface p-4">
                <SectionTitle className="mb-3">Crop</SectionTitle>
                <div className="flex items-center justify-center overflow-hidden rounded-lg bg-surface-muted">
                  <canvas
                    ref={canvasRef}
                    className="max-h-[560px] w-full touch-none cursor-crosshair"
                    onPointerDown={onPointerDown}
                    onPointerMove={onPointerMove}
                    onPointerUp={onPointerUp}
                    onPointerLeave={onPointerUp}
                    aria-label="Area crop foto"
                  />
                </div>
                <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <Field label="X">
                    <Input
                      type="number"
                      min={0}
                      value={crop.x || ""}
                      onChange={(e) => setCropField("x", Number(e.target.value))}
                      aria-label="Posisi crop X"
                    />
                  </Field>
                  <Field label="Y">
                    <Input
                      type="number"
                      min={0}
                      value={crop.y || ""}
                      onChange={(e) => setCropField("y", Number(e.target.value))}
                      aria-label="Posisi crop Y"
                    />
                  </Field>
                  <Field label="Lebar">
                    <Input
                      type="number"
                      min={1}
                      value={crop.w || ""}
                      onChange={(e) => setCropField("w", Number(e.target.value))}
                      aria-label="Lebar crop"
                    />
                  </Field>
                  <Field label="Tinggi">
                    <Input
                      type="number"
                      min={1}
                      value={crop.h || ""}
                      onChange={(e) => setCropField("h", Number(e.target.value))}
                      aria-label="Tinggi crop"
                    />
                  </Field>
                </div>
                <p className="mt-3 text-xs leading-relaxed text-ink-faint">
                  Seret pada gambar untuk memilih area. Crop ini diterapkan ke semua foto.
                </p>
              </div>

              {files.length > 1 && (
                <div className="rounded-lg border border-border bg-surface p-4">
                  <SectionTitle className="mb-3">File ({files.length})</SectionTitle>
                  <div className="grid grid-cols-3 gap-2 sm:grid-cols-5 md:grid-cols-7">
                    {files.map((f, i) => (
                      <button
                        key={f.name + i}
                        type="button"
                        onClick={() => setSelected(i)}
                        aria-label={`Pilih ${f.name}`}
                        className={`cursor-pointer overflow-hidden rounded-lg border transition-colors ${
                          selected === i ? "border-accent ring-2 ring-accent/30" : "border-border hover:border-accent/40"
                        }`}
                      >
                        <img src={URL.createObjectURL(f)} alt={f.name} className="aspect-square w-full object-cover" />
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-4 rounded-lg border border-border bg-surface p-4">
              <div>
                <SectionTitle className="mb-2">Branding</SectionTitle>
                <Field label="Warna latar (opsional)" hint="Isi warna agar foto dijejalkan tanpa terpotong">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setBgOn((v) => !v)}
                      aria-pressed={bgOn}
                      className={`size-9 shrink-0 rounded-md border ${bgOn ? "border-accent ring-2 ring-accent/30" : "border-border"}`}
                      style={{ backgroundColor: bgColor }}
                      aria-label="Aktifkan warna latar"
                    />
                    <input
                      type="color"
                      value={bgColor}
                      onChange={(e) => setBgColor(e.target.value)}
                      className="size-9 cursor-pointer rounded-md border border-border bg-surface"
                      aria-label="Pilih warna latar"
                    />
                    <Input
                      type="text"
                      value={bgColor}
                      onChange={(e) => setBgColor(e.target.value)}
                      aria-label="Warna latar hex"
                    />
                  </div>
                </Field>
                <Field label="Teks watermark">
                  <Input
                    type="text"
                    value={wmText}
                    onChange={(e) => setWmText(e.target.value)}
                    placeholder="cth. @toko.saya"
                    aria-label="Teks watermark"
                  />
                </Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Posisi">
                    <Select value={wmPos} onChange={(e) => setWmPos(e.target.value as WatermarkOptions["position"])}>
                      {POSITIONS.map((p) => (
                        <option key={p.value} value={p.value}>
                          {p.label}
                        </option>
                      ))}
                    </Select>
                  </Field>
                  <Field label="Opacity" hint={Math.round(wmOpacity * 100) + "%"}>
                    <input
                      type="range"
                      min={0.1}
                      max={1}
                      step={0.05}
                      value={wmOpacity}
                      onChange={(e) => setWmOpacity(Number(e.target.value))}
                      className="w-full accent-[#e8620c]"
                      aria-label="Opacity watermark"
                    />
                  </Field>
                </div>
                <div className="mt-3 flex items-center gap-2">
                  {logoData && (
                    <img src={logoData} alt="Logo watermark" className="size-9 rounded border border-border object-contain" />
                  )}
                  <Button size="sm" variant="secondary" onClick={() => logoInputRef.current?.click()}>
                    <Icon name="image" className="size-3.5" />
                    {logoName ? "Ganti Logo" : "Logo (opsional)"}
                  </Button>
                  {logoData && (
                    <IconButton
                      label="Hapus logo"
                      onClick={() => {
                        setLogoData(null);
                        setLogoName("");
                      }}
                    >
                      <Icon name="trash" className="size-3.5" />
                    </IconButton>
                  )}
                  <input ref={logoInputRef} type="file" accept="image/*" className="hidden" onChange={handleLogo} />
                </div>
              </div>

              <Divider />

              <div>
                <SectionTitle className="mb-2">Export</SectionTitle>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Format">
                    <Select value={format} onChange={(e) => setFormat(e.target.value as ImageFormat)}>
                      <option value="image/jpeg">JPG</option>
                      <option value="image/png">PNG</option>
                      <option value="image/webp">WebP</option>
                    </Select>
                  </Field>
                  <Field label="Kualitas" hint={Math.round(quality * 100) + "%"}>
                    <input
                      type="range"
                      min={0.3}
                      max={1}
                      step={0.05}
                      value={quality}
                      onChange={(e) => setQuality(Number(e.target.value))}
                      className="w-full accent-[#e8620c]"
                      aria-label="Kualitas output"
                    />
                  </Field>
                </div>
                <Field label="Ukuran output" hint="Pilih minimal satu">
                  <div className="flex flex-wrap gap-1.5">
                    {OUT_PRESETS.map((p) => {
                      const on = selectedOutputs.includes(p.id);
                      return (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => toggleOutput(p.id)}
                          aria-pressed={on}
                          className={`rounded-md border px-2 py-1.5 text-[11px] font-medium transition-colors cursor-pointer ${
                            on
                              ? "border-accent bg-accent-soft text-accent-ink"
                              : "border-border bg-surface text-ink-secondary hover:border-border-strong"
                          }`}
                        >
                          {p.label}
                        </button>
                      );
                    })}
                  </div>
                </Field>
                <Button className="mt-3 w-full" onClick={processAll} disabled={busy || selectedOutputs.length === 0} loading={busy}>
                  <Icon name="refresh" className="size-4" />
                  Proses Semua
                </Button>
              </div>
            </div>
          </div>

          {busy && <ProgressBar value={progress} />}

          {outputs.length > 0 && (
            <div className="rounded-lg border border-border bg-surface p-4">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-sm font-semibold text-ink">{outputs.length} output siap</p>
                <Button size="sm" onClick={downloadAll}>
                  <Icon name="download" className="size-3.5" />
                  Download Semua (ZIP)
                </Button>
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                {outputs.map((o) => (
                  <div key={o.id} className="overflow-hidden rounded-lg border border-border bg-surface-muted">
                    <div className="flex aspect-square items-center justify-center overflow-hidden bg-surface">
                      <img src={o.url} alt={o.presetLabel} className="max-h-full max-w-full object-contain" />
                    </div>
                    <div className="space-y-1 p-2.5">
                      <p className="truncate text-xs font-medium text-ink">{o.file.name}</p>
                      <p className="text-[11px] text-ink-secondary">{o.presetLabel}</p>
                      <p className="text-[10px] text-ink-faint tabular">
                        {o.width} × {o.height}px · {(o.size / 1024).toFixed(1)} KB
                      </p>
                      <Button size="sm" variant="secondary" className="w-full" onClick={() => downloadOne(o)}>
                        <Icon name="download" className="size-3.5" />
                        Unduh
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function outputName(original: string, presetId: string, format: ImageFormat): string {
  const base = original.replace(/\.[^.]+$/, "");
  return `${base}-${presetId}.${FORMAT_EXT[format]}`;
}