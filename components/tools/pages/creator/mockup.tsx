"use client";

import { useEffect, useRef, useState } from "react";
import { Dropzone } from "@/components/media/dropzone";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/fields";
import { SectionTitle, Divider } from "@/components/ui/card";
import { Icon } from "@/components/icons";
import { canvasToBlob, loadImage } from "@/lib/image";
import type { ImageFormat } from "@/lib/image";
import { FORMAT_EXT } from "@/lib/image";
import { downloadBlob } from "@/lib/export";
import { useToast } from "@/components/ui/toast";

type Device = "phone" | "laptop" | "browser";

const SIZES = [
  { id: "1080", label: "1080 × 1080", w: 1080, h: 1080 },
  { id: "1080x1350", label: "1080 × 1350 (4:5)", w: 1080, h: 1350 },
  { id: "1200x630", label: "1200 × 630 (link)", w: 1200, h: 630 },
];

export default function MockupTool() {
  const [file, setFile] = useState<File | null>(null);
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [device, setDevice] = useState<Device>("phone");
  const [bgMode, setBgMode] = useState<"color" | "transparent">("color");
  const [bgColor, setBgColor] = useState("#eae6df");
  const [shadowOn, setShadowOn] = useState(true);
  const [shadowBlur, setShadowBlur] = useState(28);
  const [radius, setRadius] = useState(26);
  const [padding, setPadding] = useState(56);
  const [sizeId, setSizeId] = useState("1080");
  const [format, setFormat] = useState<ImageFormat>("image/png");
  const [busy, setBusy] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const size = SIZES.find((s) => s.id === sizeId) ?? SIZES[0];

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    canvas.width = size.w;
    canvas.height = size.h;
    ctx.clearRect(0, 0, size.w, size.h);
    const fill = bgMode === "color" ? bgColor : format === "image/jpeg" ? "#ffffff" : null;
    if (fill) {
      ctx.fillStyle = fill;
      ctx.fillRect(0, 0, size.w, size.h);
    }
    const area = { x: padding, y: padding, w: size.w - padding * 2, h: size.h - padding * 2 };
    if (device === "phone") drawPhone(ctx, img, area, radius, shadowOn, shadowBlur);
    else if (device === "laptop") drawLaptop(ctx, img, area, radius, shadowOn, shadowBlur);
    else drawBrowser(ctx, img, area, radius, shadowOn, shadowBlur);
  }, [file, img, device, bgMode, bgColor, shadowOn, shadowBlur, radius, padding, sizeId, format, size.w, size.h]);

  const addFile = (incoming: File[]) => {
    const f = incoming.find((x) => x.type.startsWith("image/"));
    if (!f) {
      toast("File bukan gambar.", "error");
      return;
    }
    setFile(f);
    loadImage(f)
      .then((im) => setImg(im))
      .catch(() => {
        setImg(null);
        toast("Gambar tidak dapat dibaca.", "error");
      });
  };

  const exportMockup = async () => {
    const canvas = canvasRef.current;
    if (!canvas || !file || busy) return;
    setBusy(true);
    try {
      const blob = await canvasToBlob(canvas, format, 0.92);
      downloadBlob(blob, `mockup-${device}-${sizeId}.${FORMAT_EXT[format]}`);
      toast("Mockup berhasil diunduh.");
    } catch {
      toast("Gagal membuat mockup.", "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      {!file ? (
        <Dropzone
          onFiles={addFile}
          accept="image/*"
          multiple={false}
          title="Drop screenshot di sini"
          hint="Masukkan gambar ke frame device, sesuaikan gaya, lalu unduh dalam satu klik."
          icon="image"
        />
      ) : (
        <div className="grid gap-4 lg:grid-cols-[1fr_300px]">
          <div className="rounded-lg border border-border bg-surface-muted p-4">
            <div className="flex items-center justify-center overflow-hidden rounded-lg bg-[radial-gradient(circle,#d9d4cc_1px,transparent_1px)] bg-[size:14px_14px]">
              <canvas
                ref={canvasRef}
                className="max-h-[640px] max-w-full rounded-md shadow-[0_10px_40px_rgba(43,40,35,0.18)]"
                aria-label="Pratinjau mockup"
              />
            </div>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
              <p className="truncate text-xs text-ink-faint">{file.name}</p>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="primary"
                  onClick={exportMockup}
                  disabled={busy}
                  loading={busy}
                >
                  <Icon name="download" className="size-3.5" />
                  Unduh Mockup
                </Button>
                <Button size="sm" variant="secondary" onClick={() => inputRef.current?.click()}>
                  Ganti Gambar
                </Button>
                <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={(e) => {
                  const files = Array.from(e.target.files ?? []);
                  e.target.value = "";
                  if (files.length) addFile(files);
                }} />
              </div>
            </div>
          </div>

          <div className="space-y-4 rounded-lg border border-border bg-surface p-4">
            <div>
              <SectionTitle className="mb-2">Device</SectionTitle>
              <div className="grid grid-cols-3 gap-1.5">
                {(
                  [
                    { id: "phone", label: "HP" },
                    { id: "laptop", label: "Laptop" },
                    { id: "browser", label: "Browser" },
                  ] as Array<{ id: Device; label: string }>
                ).map((d) => (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => setDevice(d.id)}
                    aria-pressed={device === d.id}
                    className={`rounded-md border px-2 py-2 text-xs font-medium transition-colors cursor-pointer ${
                      device === d.id
                        ? "border-accent bg-accent-soft text-accent-ink"
                        : "border-border bg-surface text-ink-secondary hover:border-border-strong"
                    }`}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
            </div>

            <Divider />

            <div>
              <SectionTitle className="mb-2">Background</SectionTitle>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setBgMode(bgMode === "color" ? "transparent" : "color")}
                  aria-pressed={bgMode === "color"}
                  className={`size-9 shrink-0 rounded-md border ${bgMode === "color" ? "border-accent ring-2 ring-accent/30" : "border-border"}`}
                  style={{ backgroundColor: bgColor }}
                  aria-label="Mode latar warna"
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
              <button
                type="button"
                onClick={() => setBgMode(bgMode === "transparent" ? "color" : "transparent")}
                aria-pressed={bgMode === "transparent"}
                className="mt-2 flex w-full items-center justify-center gap-2 rounded-md border border-border bg-surface px-3 py-2 text-xs font-medium text-ink transition-colors hover:bg-surface-muted cursor-pointer"
              >
                <Icon name="image" className="size-3.5" />
                {bgMode === "transparent" ? "Latar transparan" : "Ganti ke transparan"}
              </button>
            </div>

            <Divider />

            <div>
              <SectionTitle className="mb-2">Gaya Frame</SectionTitle>
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-ink" htmlFor="mockup-shadow">
                  Bayangan
                </label>
                <input
                  id="mockup-shadow"
                  type="checkbox"
                  checked={shadowOn}
                  onChange={(e) => setShadowOn(e.target.checked)}
                  className="size-4 accent-[#e8620c]"
                />
              </div>
              <Field label="Kekuatan bayangan" hint={String(shadowBlur)}>
                <input
                  type="range"
                  min={0}
                  max={80}
                  value={shadowBlur}
                  onChange={(e) => {
                    setShadowOn(true);
                    setShadowBlur(Number(e.target.value));
                  }}
                  className="w-full accent-[#e8620c]"
                  aria-label="Kekuatan bayangan"
                />
              </Field>
              <Field label="Radius sudut (px)" hint={String(radius)}>
                <input
                  type="range"
                  min={0}
                  max={60}
                  value={radius}
                  onChange={(e) => setRadius(Number(e.target.value))}
                  className="w-full accent-[#e8620c]"
                  aria-label="Radius sudut"
                />
              </Field>
              <Field label="Padding (px)" hint={String(padding)}>
                <input
                  type="range"
                  min={16}
                  max={160}
                  value={padding}
                  onChange={(e) => setPadding(Number(e.target.value))}
                  className="w-full accent-[#e8620c]"
                  aria-label="Padding"
                />
              </Field>
            </div>

            <Divider />

            <div>
              <SectionTitle className="mb-2">Export</SectionTitle>
              <Field label="Ukuran canvas">
                <Select value={sizeId} onChange={(e) => setSizeId(e.target.value)}>
                  {SIZES.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.label}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Format">
                <Select value={format} onChange={(e) => setFormat(e.target.value as ImageFormat)}>
                  <option value="image/png">PNG (transparan)</option>
                  <option value="image/jpeg">JPG</option>
                </Select>
              </Field>
              <Button className="mt-3 w-full" onClick={exportMockup} disabled={busy} loading={busy}>
                <Icon name="download" className="size-4" />
                Unduh Mockup
              </Button>
              <p className="mt-2 text-xs leading-relaxed text-ink-faint">
                Semua dibuat di browser kamu - tidak ada yang diunggah ke server.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const rr = Math.max(0, Math.min(r, w / 2, h / 2));
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

function withShadow(ctx: CanvasRenderingContext2D, on: boolean, blur: number, draw: () => void) {
  ctx.save();
  if (on && blur > 0) {
    ctx.shadowColor = "rgba(20,18,15,0.4)";
    ctx.shadowBlur = blur;
    ctx.shadowOffsetY = blur * 0.4;
  }
  draw();
  ctx.restore();
}

function drawImageCover(ctx: CanvasRenderingContext2D, img: HTMLImageElement | null, x: number, y: number, w: number, h: number, r: number) {
  ctx.save();
  roundRect(ctx, x, y, w, h, r);
  ctx.clip();
  if (img) {
    const ratio = Math.max(w / img.width, h / img.height);
    const dw = img.width * ratio;
    const dh = img.height * ratio;
    ctx.drawImage(img, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh);
  } else {
    ctx.fillStyle = "rgba(255,255,255,0.55)";
    ctx.fillRect(x, y, w, h);
  }
  ctx.restore();
}

function drawPhone(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement | null,
  area: { x: number; y: number; w: number; h: number },
  radius: number,
  shadowOn: boolean,
  shadowBlur: number,
) {
  const ratio = 9 / 19.5;
  let sw: number;
  let sh: number;
  if (area.w / area.h > ratio) {
    sh = area.h;
    sw = sh * ratio;
  } else {
    sw = area.w;
    sh = sw / ratio;
  }
  const bezel = Math.round(Math.min(sw, sh) * 0.03);
  const fw = sw + bezel * 2;
  const fh = sh + bezel * 2;
  const fx = area.x + (area.w - fw) / 2;
  const fy = area.y + (area.h - fh) / 2;
  withShadow(ctx, shadowOn, shadowBlur, () => {
    ctx.fillStyle = "#17181c";
    roundRect(ctx, fx, fy, fw, fh, Math.max(8, radius + 14));
    ctx.fill();
  });
  const sx = fx + bezel;
  const sy = fy + bezel;
  drawImageCover(ctx, img, sx, sy, sw, sh, Math.max(6, radius));
  ctx.fillStyle = "#0c0d0f";
  roundRect(ctx, sx + sw / 2 - sw * 0.21, sy + sh * 0.015, sw * 0.42, sh * 0.018, 20);
  ctx.fill();
  ctx.fillStyle = "#26282e";
  roundRect(ctx, sx + sw / 2 - sw * 0.07, sy + sh * 0.99, sw * 0.14, sh * 0.012, 10);
  ctx.fill();
}

function drawLaptop(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement | null,
  area: { x: number; y: number; w: number; h: number },
  radius: number,
  shadowOn: boolean,
  shadowBlur: number,
) {
  const ratio = 16 / 10;
  let sw: number;
  let sh: number;
  if (area.w / area.h > ratio) {
    sh = area.h;
    sw = sh * ratio;
  } else {
    sw = area.w;
    sh = sw / ratio;
  }
  const bezel = Math.round(Math.min(sw, sh) * 0.016);
  const fw = sw + bezel * 2;
  const fh = sh + bezel * 2;
  const fx = area.x + (area.w - fw) / 2;
  const deckH = Math.max(18, fw * 0.05);
  const fy = area.y + Math.max(0, (area.h - (fh + deckH)) / 2);
  withShadow(ctx, shadowOn, shadowBlur, () => {
    ctx.fillStyle = "#17181c";
    roundRect(ctx, fx, fy, fw, fh, Math.max(6, radius));
    ctx.fill();
  });
  drawImageCover(ctx, img, fx + bezel, fy + bezel, fw - bezel * 2, fh - bezel * 2, Math.max(4, radius - 8));
  ctx.fillStyle = "#3a3d44";
  ctx.beginPath();
  ctx.arc(fx + fw / 2, fy + bezel * 0.5, bezel * 0.26, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#232529";
  roundRect(ctx, fx - fw * 0.02, fy + fh - 2, fw * 1.04, deckH, Math.max(4, radius * 0.5));
  ctx.fill();
  ctx.fillStyle = "#141519";
  roundRect(ctx, fx - fw * 0.02, fy + fh + deckH * 0.35, fw * 1.04, deckH * 0.18, deckH * 0.09);
  ctx.fill();
}

function drawBrowser(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement | null,
  area: { x: number; y: number; w: number; h: number },
  radius: number,
  shadowOn: boolean,
  shadowBlur: number,
) {
  const ratio = 16 / 9;
  let bw: number;
  let bh: number;
  if (area.w / area.h > ratio) {
    bh = area.h;
    bw = bh * ratio;
  } else {
    bw = area.w;
    bh = bw / ratio;
  }
  const fx = area.x + (area.w - bw) / 2;
  const fy = area.y + (area.h - bh) / 2;
  const barH = Math.max(26, bw * 0.07);
  withShadow(ctx, shadowOn, shadowBlur, () => {
    ctx.fillStyle = "#232529";
    roundRect(ctx, fx, fy, bw, bh, Math.max(6, radius));
    ctx.fill();
  });
  ctx.fillStyle = "#eceef1";
  roundRect(ctx, fx, fy, bw, barH, Math.max(6, radius));
  ctx.fillRect(fx, fy + barH / 2, bw, barH / 2);
  const dot = barH * 0.14;
  const dotY = fy + barH / 2;
  ctx.fillStyle = "#ff5f57";
  ctx.beginPath();
  ctx.arc(fx + barH * 0.32, dotY, dot, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#febc2e";
  ctx.beginPath();
  ctx.arc(fx + barH * 0.55, dotY, dot, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#28c840";
  ctx.beginPath();
  ctx.arc(fx + barH * 0.78, dotY, dot, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#ffffff";
  roundRect(ctx, fx + barH * 1.25, fy + barH * 0.24, bw - barH * 2.4, barH * 0.52, barH * 0.26);
  ctx.fill();
  ctx.fillStyle = "#c9ccd1";
  ctx.font = `600 ${Math.max(8, barH * 0.22)}px Inter, sans-serif`;
  ctx.fillText("siapinaja", fx + barH * 1.6, fy + barH * 0.62);
  drawImageCover(ctx, img, fx, fy + barH, bw, bh - barH, 0);
}