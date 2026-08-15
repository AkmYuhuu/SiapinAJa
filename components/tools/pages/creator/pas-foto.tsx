"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/fields";
import { EmptyState, ProgressBar } from "@/components/ui/empty";
import { Note } from "@/components/tools/tool-shell";
import { Icon } from "@/components/icons";
import { Dropzone } from "@/components/media/dropzone";
import { FORMAT_EXT, canvasToBlob, loadImage, renderToCanvas } from "@/lib/image";
import type { ImageFormat } from "@/lib/image";
import { downloadBlob } from "@/lib/export";
import { useToast } from "@/components/ui/toast";
import { PrintMenu } from "@/components/documents/print-menu";
import { exportDocPagesPdf, getDocNodes } from "@/lib/documents/html-export";

const MARGIN_X = 12;
const MARGIN_Y = 14;

const PAS_SIZES = [
  { id: "2x3", label: "2 × 3 cm", wCm: 2, hCm: 3, wPx: 236, hPx: 354 },
  { id: "3x4", label: "3 × 4 cm", wCm: 3, hCm: 4, wPx: 354, hPx: 472 },
  { id: "4x6", label: "4 × 6 cm", wCm: 4, hCm: 6, wPx: 472, hPx: 709 },
] as const;

const BG_PRESETS = [
  { id: "none", label: "Tanpa isi (transparan)", value: "" },
  { id: "white", label: "Putih", value: "#ffffff" },
  { id: "red", label: "Merah", value: "#ce1126" },
  { id: "blue", label: "Biru", value: "#003399" },
  { id: "custom", label: "Warna kustom", value: "__custom__" },
];

interface Processed {
  blob: Blob;
  canvas: HTMLCanvasElement;
  url: string;
}

export default function PasFotoTool() {
  const [file, setFile] = useState<File | null>(null);
  const [srcUrl, setSrcUrl] = useState<string | null>(null);
  const [sizeId, setSizeId] = useState("2x3");
  const [bgPreset, setBgPreset] = useState("white");
  const [customColor, setCustomColor] = useState("#f4e2d3");
  const [format, setFormat] = useState<ImageFormat>("image/jpeg");
  const [count, setCount] = useState(64);
  const [removeBg, setRemoveBg] = useState(false);
  const [bgKeyColor, setBgKeyColor] = useState("#00a651");
  const [tolerance, setTolerance] = useState(30);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [processed, setProcessed] = useState<Processed | null>(null);
  const { toast } = useToast();

  const srcUrlRef = useRef<string | null>(null);
  const processedUrlRef = useRef<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(
    () => () => {
      if (srcUrlRef.current) URL.revokeObjectURL(srcUrlRef.current);
      if (processedUrlRef.current) URL.revokeObjectURL(processedUrlRef.current);
    },
    [],
  );

  const size = PAS_SIZES.find((s) => s.id === sizeId) ?? PAS_SIZES[0];

  const bg = useMemo(() => {
    const preset = BG_PRESETS.find((b) => b.id === bgPreset);
    if (!preset) return "";
    return preset.id === "custom" ? customColor : preset.value;
  }, [bgPreset, customColor]);

  const transparent = bg === "";

  const grid = useMemo(() => {
    const wMm = size.wCm * 10;
    const hMm = size.hCm * 10;
    const gap = 2;
    const usableW = 210 - MARGIN_X * 2;
    const usableH = 297 - MARGIN_Y * 2;
    const cols = Math.max(1, Math.floor((usableW + gap) / (wMm + gap)));
    const rows = Math.max(1, Math.floor((usableH + gap) / (hMm + gap)));
    return { cols, rows, perPage: cols * rows, wMm, hMm, gap };
  }, [size]);

  const pages = useMemo(() => {
    const per = grid.perPage;
    const total = Math.min(1000, Math.max(1, Math.round(count) || 1));
    const out: number[] = [];
    for (let i = 0; i < total; i += per) out.push(Math.min(per, total - i));
    return out;
  }, [grid.perPage, count]);

  useEffect(() => {
    if (!file || !removeBg) return;
    let cancelled = false;
    (async () => {
      try {
        const img = await loadImage(file);
        if (cancelled) return;
        const canvas = document.createElement("canvas");
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        ctx.drawImage(img, 0, 0);
        const px = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
        const pick = (x: number, y: number) => {
          const i = (y * canvas.width + x) * 4;
          const toHex = (v: number) => v.toString(16).padStart(2, "0");
          return `#${toHex(px[i])}${toHex(px[i + 1])}${toHex(px[i + 2])}`;
        };
        setBgKeyColor(pick(4, 4));
      } catch {
        /* abaikan */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [file, removeBg]);

  if (!file && processed !== null) {
    setProcessed(null);
  }

  useEffect(() => {
    if (!file) return;
    const outFormat: ImageFormat = transparent ? "image/png" : format;
    let cancelled = false;
    (async () => {
      setBusy(true);
      try {
        const img = await loadImage(file);
        let source: HTMLImageElement | HTMLCanvasElement = img;
        if (removeBg) {
          source = removeBackground(img, bgKeyColor, tolerance);
        }
        const canvas = renderToCanvas(source, {
          width: size.wPx,
          height: size.hPx,
          format: outFormat,
          quality: 0.92,
          background: transparent ? undefined : bg,
          fit: "cover",
        });
        const blob = await canvasToBlob(canvas, outFormat, 0.92);
        if (cancelled) return;
        if (processedUrlRef.current) URL.revokeObjectURL(processedUrlRef.current);
        const url = URL.createObjectURL(blob);
        processedUrlRef.current = url;
        setProcessed({ blob, canvas, url });
      } catch (e) {
        if (!cancelled) toast(e instanceof Error ? e.message : "Foto gagal diproses.", "error");
      } finally {
        if (!cancelled) setBusy(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [file, sizeId, bg, transparent, format, removeBg, bgKeyColor, tolerance]);

  const handleFiles = (files: File[]) => {
    const f = files[0];
    if (!f) return;
    if (!f.type.startsWith("image/")) {
      toast("File harus berupa gambar.", "error");
      return;
    }
    if (srcUrlRef.current) URL.revokeObjectURL(srcUrlRef.current);
    const url = URL.createObjectURL(f);
    srcUrlRef.current = url;
    setSrcUrl(url);
    setFile(f);
  };

  const clearAll = () => {
    if (srcUrlRef.current) URL.revokeObjectURL(srcUrlRef.current);
    srcUrlRef.current = null;
    if (processedUrlRef.current) URL.revokeObjectURL(processedUrlRef.current);
    processedUrlRef.current = null;
    setSrcUrl(null);
    setFile(null);
    setProcessed(null);
    setProgress(0);
  };

  const effFormat: ImageFormat = transparent ? "image/png" : format;

  const downloadPhoto = () => {
    if (!processed) return;
    downloadBlob(processed.blob, `pas-foto-${size.id}.${FORMAT_EXT[effFormat]}`);
  };

  const exportPdf = async () => {
    if (!processed) return;
    const nodes = getDocNodes();
    if (nodes.length === 0) {
      toast("Pratinjau lembar A4 belum siap. Coba lagi.", "error");
      return;
    }
    setBusy(true);
    setProgress(0);
    try {
      await exportDocPagesPdf(nodes, `pas-foto-${size.id}-a4`);
      toast("PDF siap diunduh.");
    } catch (e) {
      toast(e instanceof Error ? e.message : "PDF gagal dibuat. Coba lagi.", "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
      <section className="min-w-0 space-y-4 print-hide">
        {!file ? (
          <Dropzone
            onFiles={handleFiles}
            accept="image/*"
            multiple={false}
            title="Upload satu foto"
            hint="Pilih satu foto untuk diubah jadi pas foto. Diproses di browser - tidak diunggah."
            icon="image"
          />
        ) : (
          <div className="rounded-lg border border-border bg-surface p-4">
            <div className="flex items-center gap-3">
              {srcUrl && <img src={srcUrl} alt="Foto asli" className="size-16 rounded-lg object-cover" />}
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-ink">{file.name}</p>
                <p className="text-xs text-ink-faint">Foto asli - akan dipotong sesuai rasio ukuran pilihan.</p>
              </div>
              <span className="flex-1" />
              <Button size="sm" variant="secondary" onClick={() => fileInputRef.current?.click()}>
                <Icon name="upload" className="size-3.5" />
                Ganti
              </Button>
              <Button size="sm" variant="ghost" onClick={clearAll}>
                <Icon name="trash" className="size-3.5" />
                Hapus
              </Button>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                if (e.target.files?.[0]) handleFiles([e.target.files[0]]);
                e.target.value = "";
              }}
            />
          </div>
        )}

        <div className="space-y-4 rounded-lg border border-border bg-surface p-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Ukuran pas foto">
              <Select value={sizeId} onChange={(e) => setSizeId(e.target.value)}>
                {PAS_SIZES.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Jumlah foto" hint={`Maks ${grid.perPage} per lembar`}>
              <Input
                type="number"
                min={1}
                max={1000}
                value={count}
                onChange={(e) => {
                  const n = Math.round(Number(e.target.value));
                  setCount(Number.isFinite(n) && n > 0 ? Math.min(1000, n) : 1);
                }}
                aria-label="Jumlah foto"
              />
            </Field>
            <Field label="Latar belakang">
              <Select
                value={bgPreset}
                onChange={(e) => {
                  setBgPreset(e.target.value);
                  if (e.target.value === "none") setFormat("image/png");
                }}
              >
                {BG_PRESETS.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Format output" hint={transparent ? "Transparan memakai PNG" : undefined}>
              <Select
                value={effFormat}
                onChange={(e) => setFormat(e.target.value as ImageFormat)}
                disabled={transparent}
              >
                <option value="image/jpeg">JPG</option>
                <option value="image/png">PNG</option>
              </Select>
            </Field>
            {bgPreset === "custom" && (
              <Field label="Warna kustom">
                <div className="flex h-9 items-center gap-2 rounded-md border border-border bg-surface px-2">
                  <input
                    type="color"
                    value={customColor}
                    onChange={(e) => setCustomColor(e.target.value)}
                    className="h-6 w-8 cursor-pointer rounded border-0 bg-transparent p-0"
                    aria-label="Pilih warna latar"
                  />
                  <span className="text-[13px] uppercase tabular text-ink-secondary">{customColor}</span>
                </div>
              </Field>
            )}
            <div className="sm:col-span-2">
              <div className="flex items-center justify-between rounded-md border border-border bg-surface px-3 py-2">
                <div>
                  <p className="text-[13px] font-medium text-ink">Hapus background foto</p>
                  <p className="text-[12px] text-ink-faint">
                    Background harus 1 warna (disarankan hijau). Area yang mirip warna itu akan dibuang dan diganti
                    latar pilihan.
                  </p>
                </div>
                <input
                  id="pas-foto-remove-bg"
                  type="checkbox"
                  checked={removeBg}
                  onChange={(e) => setRemoveBg(e.target.checked)}
                  className="size-4 accent-[#e8620c]"
                />
              </div>
              {removeBg && (
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <Field label="Warna background" hint="Terisi otomatis dari pojok kiri atas foto">
                    <div className="flex h-9 items-center gap-2 rounded-md border border-border bg-surface px-2">
                      <input
                        type="color"
                        value={bgKeyColor}
                        onChange={(e) => setBgKeyColor(e.target.value)}
                        className="h-6 w-8 cursor-pointer rounded border-0 bg-transparent p-0"
                        aria-label="Pilih warna background yang akan dibuang"
                      />
                      <span className="text-[13px] uppercase tabular text-ink-secondary">{bgKeyColor}</span>
                    </div>
                  </Field>
                  <Field label="Toleransi" hint={`${tolerance}%`}>
                    <input
                      type="range"
                      min={5}
                      max={90}
                      value={tolerance}
                      onChange={(e) => setTolerance(Number(e.target.value))}
                      className="mt-2 w-full accent-[#e8620c]"
                      aria-label="Toleransi warna background"
                    />
                  </Field>
                </div>
              )}
            </div>
          </div>

          <div className="rounded-md border border-border bg-surface-muted px-3 py-2 text-[13px] text-ink-secondary">
            Ukuran cetak {size.wCm} × {size.hCm} cm · {size.wPx} × {size.hPx}px (300 dpi) · {grid.perPage} foto per
            lembar A4 · {pages.length} lembar
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button onClick={downloadPhoto} disabled={!processed}>
              <Icon name="download" className="size-4" />
              Unduh Foto
            </Button>
            <Button variant="secondary" onClick={exportPdf} disabled={!processed || busy}>
              <Icon name="download" className="size-4" />
              Unduh Sheet A4 (PDF)
            </Button>
            <PrintMenu disabled={!processed} nota={false} />
            {busy && <ProgressBar value={progress} className="w-36" />}
          </div>

          <Note tone="warning">Hasil belum tentu memenuhi standar institusi tertentu - periksa persyaratan instansi tujuan.</Note>
        </div>
      </section>

      <section className="print-area xl:sticky xl:top-20 xl:self-start min-w-0">
        <div className="mb-3 flex items-center justify-between print-hide">
          <p className="text-xs font-medium text-ink-faint">
            <Icon name="image" className="mr-1 inline size-3.5" />
            Pratinjau lembar A4
          </p>
        </div>
        {!processed ? (
          <EmptyState
            icon={<Icon name="idcard" className="size-5" />}
            title="Upload foto dulu"
            description="Pilih satu foto dan tentukan ukurannya untuk melihat susunan lembar A4."
          />
        ) : (
          <div className="overflow-x-auto">
            <div className="min-w-[794px] space-y-6">
              {pages.map((pageSize, pi) => (
                <div key={pi} className="space-y-1.5">
                  {pages.length > 1 && (
                    <p className="text-[11px] text-ink-faint print-hide">
                      Halaman {pi + 1} · {pageSize} foto
                    </p>
                  )}
                  <div className="doc-page relative border border-border shadow-[0_8px_24px_rgba(43,40,35,0.08)]">
                    {Array.from({ length: pageSize }).map((_, i) => {
                      const col = i % grid.cols;
                      const row = Math.floor(i / grid.cols);
                      return (
                        <div
                          key={i}
                          className="absolute overflow-hidden border border-dashed border-[#cfcac0] bg-white p-[0.8mm]"
                          style={{
                            left: `${MARGIN_X + col * (grid.wMm + grid.gap)}mm`,
                            top: `${MARGIN_Y + row * (grid.hMm + grid.gap)}mm`,
                            width: `${grid.wMm}mm`,
                            height: `${grid.hMm}mm`,
                          }}
                        >
                          <img src={processed.url} alt="Pas foto" className="h-full w-full object-cover" />
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const m = hex.replace("#", "");
  const full = m.length === 3 ? m.split("").map((c) => c + c).join("") : m;
  const n = parseInt(full.slice(0, 6), 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

/** Buang area berwarna solid (mis. background hijau) dari gambar dengan
 *  toleransi + tepi halus, lalu kembalikan sebagai canvas transparan. */
function removeBackground(
  img: HTMLImageElement,
  keyColor: string,
  tolerance: number,
): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas tidak tersedia di browser ini.");
  ctx.drawImage(img, 0, 0);
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;
  const key = hexToRgb(keyColor);
  const tol = Math.min(1, Math.max(0, tolerance / 100));
  const feather = 0.06;
  for (let i = 0; i < data.length; i += 4) {
    const dr = data[i] - key.r;
    const dg = data[i + 1] - key.g;
    const db = data[i + 2] - key.b;
    const dist = Math.sqrt(dr * dr + dg * dg + db * db) / Math.sqrt(3 * 255 * 255);
    if (dist <= tol) {
      data[i + 3] = 0;
    } else if (dist < tol + feather) {
      data[i + 3] = Math.round(255 * ((dist - tol) / feather));
    }
  }
  ctx.putImageData(imageData, 0, 0);
  return canvas;
}