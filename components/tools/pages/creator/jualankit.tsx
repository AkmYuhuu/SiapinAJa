"use client";

import { useEffect, useRef, useState } from "react";
import { Button, IconButton } from "@/components/ui/button";
import { Field, Input, MoneyInput, Select, Textarea, PhoneInput } from "@/components/ui/fields";
import { SectionTitle } from "@/components/ui/card";
import { ProgressBar } from "@/components/ui/empty";
import { Icon } from "@/components/icons";
import { Dropzone } from "@/components/media/dropzone";
import { FORMAT_EXT, canvasToBlob, canvasToDataURL, getDimensions, loadImage, renderToCanvas } from "@/lib/image";
import type { ImageFormat } from "@/lib/image";
import { downloadBlob, makeZip } from "@/lib/export";
import { formatCurrency } from "@/lib/format";
import { useToast } from "@/components/ui/toast";
import { useProject } from "@/components/tools/use-project";
import { ProjectActions } from "@/components/tools/tool-shell";

type OutputId = "marketplace" | "instagram-post" | "instagram-story" | "whatsapp" | "price-card" | "mini-catalog";

const OUTPUTS: { id: OutputId; label: string; w: number; h: number }[] = [
  { id: "marketplace", label: "Marketplace", w: 1080, h: 1080 },
  { id: "instagram-post", label: "Instagram Post", w: 1080, h: 1080 },
  { id: "instagram-story", label: "Instagram Story", w: 1080, h: 1920 },
  { id: "whatsapp", label: "WhatsApp", w: 1080, h: 1080 },
  { id: "price-card", label: "Kartu Harga", w: 1080, h: 1350 },
  { id: "mini-catalog", label: "Katalog Mini", w: 1080, h: 1080 },
];

interface MasterData {
  name: string;
  price: number;
  oldPrice: number;
  category: string;
  sku: string;
  description: string;
  whatsapp: string;
  brand: string;
  promo: string;
  image: string;
  logo: string;
  imageName: string;
  logoName: string;
}

const blankMaster = (): MasterData => ({
  name: "",
  price: 0,
  oldPrice: 0,
  category: "",
  sku: "",
  description: "",
  whatsapp: "",
  brand: "",
  promo: "",
  image: "",
  logo: "",
  imageName: "",
  logoName: "",
});

const INK = "#2b2823";
const MUTED = "#6f6a5e";
const ACCENT = "#e8620c";

export default function JualanKitTool() {
  const [master, setMaster] = useState<MasterData>(blankMaster());
  const [output, setOutput] = useState<OutputId>("marketplace");
  const [format, setFormat] = useState<ImageFormat>("image/png");
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const { toast } = useToast();

  const imageInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const previewRef = useRef<HTMLCanvasElement>(null);

  const project = useProject({
    toolId: "jualankit",
    getData: () => ({ ...master }),
  });

  const [loadedId, setLoadedId] = useState<string | null>(null);
  const current = project.current;
  if (current && current.id !== loadedId) {
    setLoadedId(current.id);
    const data = current.data as MasterData | null | undefined;
    if (data && typeof data === "object") {
      setMaster({
        name: typeof data.name === "string" ? data.name : "",
        price: typeof data.price === "number" ? data.price : 0,
        oldPrice: typeof data.oldPrice === "number" ? data.oldPrice : 0,
        category: typeof data.category === "string" ? data.category : "",
        sku: typeof data.sku === "string" ? data.sku : "",
        description: typeof data.description === "string" ? data.description : "",
        whatsapp: typeof data.whatsapp === "string" ? data.whatsapp : "",
        brand: typeof data.brand === "string" ? data.brand : "",
        promo: typeof data.promo === "string" ? data.promo : "",
        image: typeof data.image === "string" ? data.image : "",
        logo: typeof data.logo === "string" ? data.logo : "",
        imageName: typeof data.imageName === "string" ? data.imageName : "",
        logoName: typeof data.logoName === "string" ? data.logoName : "",
      });
    }
  }

  useEffect(() => {
    const canvas = previewRef.current;
    if (!canvas) return;
    let cancelled = false;
    (async () => {
      try {
        const o = OUTPUTS.find((x) => x.id === output);
        if (!o) return;
        canvas.width = o.w;
        canvas.height = o.h;
        await drawOutput(canvas, o.id, master);
      } catch {
        if (!cancelled) toast("Pratinjau gagal dibuat.", "error");
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [output, master]);

  const handleNew = () => setMaster(blankMaster());

  const handleFile = async (files: File[], kind: "image" | "logo") => {
    const f = files[0];
    if (!f) return;
    if (!f.type.startsWith("image/")) {
      toast("File harus berupa gambar.", "error");
      return;
    }
    try {
      if (kind === "image") {
        const url = await fileToDataUrl(f, 1080, "image/jpeg", 0.85, "#ffffff");
        setMaster((m) => ({ ...m, image: url, imageName: f.name }));
        toast("Foto produk ditambahkan.");
      } else {
        const url = await fileToDataUrl(f, 320, "image/png", 0.9, undefined);
        setMaster((m) => ({ ...m, logo: url, logoName: f.name }));
        toast("Logo ditambahkan.");
      }
    } catch (e) {
      toast(e instanceof Error ? e.message : "Gambar gagal diproses.", "error");
    }
  };

  const downloadCurrent = async () => {
    const o = OUTPUTS.find((x) => x.id === output);
    if (!o) return;
    try {
      const canvas = document.createElement("canvas");
      canvas.width = o.w;
      canvas.height = o.h;
      await drawOutput(canvas, o.id, master);
      const blob = await canvasToBlob(canvas, format, 0.92);
      downloadBlob(blob, `siapinaja-${o.id}.${FORMAT_EXT[format]}`);
      toast("Gambar siap diunduh.");
    } catch (e) {
      toast(e instanceof Error ? e.message : "Gambar gagal dibuat.", "error");
    }
  };

  const downloadZip = async () => {
    setBusy(true);
    setProgress(0);
    try {
      const files: Array<{ name: string; blob: Blob }> = [];
      for (let i = 0; i < OUTPUTS.length; i++) {
        const canvas = document.createElement("canvas");
        canvas.width = OUTPUTS[i].w;
        canvas.height = OUTPUTS[i].h;
        await drawOutput(canvas, OUTPUTS[i].id, master);
        const blob = await canvasToBlob(canvas, format, 0.92);
        files.push({ name: `siapinaja-${OUTPUTS[i].id}.${FORMAT_EXT[format]}`, blob });
        setProgress(Math.round(((i + 1) / OUTPUTS.length) * 100));
      }
      await makeZip(files, "siapinaja-materi-jualan.zip");
      toast("ZIP siap diunduh.");
    } catch (e) {
      toast(e instanceof Error ? e.message : "ZIP gagal dibuat.", "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <ProjectActions
        project={project}
        onSave={() => {
          project.save();
        }}
        onDuplicate={() => {
          project.dupe();
        }}
        onDelete={() => {
          project.remove();
        }}
        onExportJson={() => {
          project.exportJson();
        }}
        onImportFile={(f) => {
          project.importJsonFile(f);
        }}
        onNew={handleNew}
      />

      <p className="text-sm font-medium text-ink">Satu produk. Semua materi jualan.</p>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] xl:items-start">
        <section className="min-w-0 space-y-4">
          <div className="space-y-4 rounded-lg border border-border bg-surface p-4">
            <SectionTitle>Data Produk</SectionTitle>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Nama produk" required>
                <Input
                  value={master.name}
                  onChange={(e) => setMaster({ ...master, name: e.target.value })}
                  placeholder="Contoh: Kaos Polos Premium"
                />
              </Field>
              <Field label="Harga">
                <MoneyInput value={master.price} onChange={(v) => setMaster({ ...master, price: v })} />
              </Field>
              <Field label="Harga coret (opsional)" hint="Tampil dicoret sebagai penawaran">
                <MoneyInput value={master.oldPrice} onChange={(v) => setMaster({ ...master, oldPrice: v })} />
              </Field>
              <Field label="Kategori">
                <Input
                  value={master.category}
                  onChange={(e) => setMaster({ ...master, category: e.target.value })}
                  placeholder="Fashion, Aksesoris, …"
                />
              </Field>
              <Field label="SKU (opsional)">
                <Input
                  value={master.sku}
                  onChange={(e) => setMaster({ ...master, sku: e.target.value })}
                  placeholder="SKU-001"
                />
              </Field>
            </div>
          </div>

          <div className="space-y-4 rounded-lg border border-border bg-surface p-4">
            <SectionTitle>Detail</SectionTitle>
            <Field label="Deskripsi">
              <Textarea
                value={master.description}
                onChange={(e) => setMaster({ ...master, description: e.target.value })}
                rows={3}
                placeholder="Bahan, ukuran, keunggulan, dst."
              />
            </Field>
            <Field label="Nomor WhatsApp (opsional)" hint="Ditampilkan di materi agar mudah dihubungi">
              <PhoneInput value={master.whatsapp} onChange={(v) => setMaster({ ...master, whatsapp: v })} />
            </Field>
          </div>

          <div className="space-y-4 rounded-lg border border-border bg-surface p-4">
            <SectionTitle>Branding</SectionTitle>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Nama brand (opsional)">
                <Input
                  value={master.brand}
                  onChange={(e) => setMaster({ ...master, brand: e.target.value })}
                  placeholder="Merek / nama toko"
                />
              </Field>
              <Field label="Teks promo (opsional)">
                <Input
                  value={master.promo}
                  onChange={(e) => setMaster({ ...master, promo: e.target.value })}
                  placeholder="Contoh: Gratis ongkir se-Jabodetabek"
                />
              </Field>
            </div>
            <Field label="Logo brand (opsional)">
              {master.logo ? (
                <div className="flex items-center gap-3 rounded-md border border-border bg-surface-muted p-2">
                  <img src={master.logo} alt="Logo" className="size-10 rounded object-contain" />
                  <p className="min-w-0 truncate text-[13px] text-ink">{master.logoName || "logo.png"}</p>
                  <span className="flex-1" />
                  <IconButton label="Ganti logo" onClick={() => logoInputRef.current?.click()}>
                    <Icon name="refresh" className="size-4" />
                  </IconButton>
                  <IconButton
                    label="Hapus logo"
                    className="text-ink-faint hover:text-danger"
                    onClick={() => setMaster({ ...master, logo: "", logoName: "" })}
                  >
                    <Icon name="trash" className="size-4" />
                  </IconButton>
                </div>
              ) : (
                <Button variant="secondary" size="sm" onClick={() => logoInputRef.current?.click()}>
                  <Icon name="upload" className="size-3.5" />
                  Unggah logo
                </Button>
              )}
              <input
                ref={logoInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files?.[0]) handleFile([e.target.files[0]], "logo");
                  e.target.value = "";
                }}
              />
            </Field>
          </div>

          <div className="space-y-4 rounded-lg border border-border bg-surface p-4">
            <SectionTitle>Foto Produk</SectionTitle>
            {master.image ? (
              <div className="flex items-start gap-3">
                <img src={master.image} alt="Produk" className="h-20 w-20 rounded-lg object-cover" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] text-ink">{master.imageName || "foto-produk.jpg"}</p>
                  <div className="mt-2 flex gap-2">
                    <Button size="sm" variant="secondary" onClick={() => imageInputRef.current?.click()}>
                      <Icon name="refresh" className="size-3.5" />
                      Ganti
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setMaster({ ...master, image: "", imageName: "" })}
                    >
                      <Icon name="trash" className="size-3.5" />
                      Hapus
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <Dropzone
                onFiles={(files) => handleFile(files, "image")}
                accept="image/*"
                title="Upload foto produk"
                hint="Satu foto cukup - dipakai untuk semua materi."
                icon="image"
              />
            )}
            <input
              ref={imageInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                if (e.target.files?.[0]) handleFile([e.target.files[0]], "image");
                e.target.value = "";
              }}
            />
          </div>
        </section>

        <section className="xl:sticky xl:top-20 xl:self-start min-w-0 space-y-3">
          <div className="rounded-lg border border-border bg-surface p-4">
            <div className="flex flex-wrap items-end gap-3">
              <Field label="Jenis materi">
                <Select value={output} onChange={(e) => setOutput(e.target.value as OutputId)} className="w-56">
                  {OUTPUTS.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.label} · {o.w}×{o.h}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Format output">
                <Select value={format} onChange={(e) => setFormat(e.target.value as ImageFormat)} className="w-28">
                  <option value="image/png">PNG</option>
                  <option value="image/jpeg">JPG</option>
                  <option value="image/webp">WebP</option>
                </Select>
              </Field>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Button size="sm" onClick={downloadCurrent}>
                <Icon name="download" className="size-3.5" />
                Unduh Gambar
              </Button>
              <Button size="sm" variant="secondary" onClick={downloadZip} disabled={busy}>
                <Icon name="boxes" className="size-3.5" />
                Unduh Semua (ZIP)
              </Button>
              {busy && <ProgressBar value={progress} className="w-36" />}
            </div>
            <div className="mt-4 flex justify-center rounded-lg border border-border bg-surface-muted p-3">
              <canvas
                ref={previewRef}
                className="max-h-[70vh] w-auto max-w-full rounded shadow-[0_8px_24px_rgba(43,40,35,0.1)]"
              />
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

async function fileToDataUrl(
  file: File,
  maxDim: number,
  format: ImageFormat,
  quality: number,
  background?: string,
): Promise<string> {
  const img = await loadImage(file);
  const { width, height } = getDimensions(img);
  const scale = Math.min(1, maxDim / Math.max(width, height));
  const canvas = renderToCanvas(img, {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
    format,
    quality,
    background,
    fit: "stretch",
  });
  return canvasToDataURL(canvas, format, quality);
}

async function drawOutput(canvas: HTMLCanvasElement, output: OutputId, master: MasterData): Promise<void> {
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas tidak tersedia di browser ini.");
  const W = canvas.width;
  const H = canvas.height;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, W, H);

  const img = master.image ? await loadImage(master.image) : null;
  const logo = master.logo ? await loadImage(master.logo) : null;
  const price = formatCurrency(master.price);
  const oldPrice = master.oldPrice > master.price ? formatCurrency(master.oldPrice) : "";
  const label = master.name || "Nama produk";

  if (output === "marketplace") {
    drawCoverArea(ctx, img, 0, 0, W, H, "Foto produk");
    if (logo) {
      const lh = 72;
      const lw = Math.round((logo.width / logo.height) * lh);
      ctx.drawImage(logo, 48, 48, Math.max(1, lw), lh);
    } else if (master.brand) {
      drawBrandTag(ctx, master.brand, 48, 100);
    }
    const cardH = 420;
    const cardX = 36;
    const cardW = W - 72;
    const cardY = H - cardH - 36;
    ctx.fillStyle = "rgba(255,255,255,0.95)";
    roundRect(ctx, cardX, cardY, cardW, cardH, 28);
    ctx.fill();
    ctx.strokeStyle = "#e3e0d8";
    ctx.lineWidth = 3;
    ctx.stroke();
    const pad = 44;
    const nameS = fitFont(ctx, label, cardW - pad * 2, 44, 22, "700");
    let y = cardY + pad + 20;
    if (master.category) {
      const cs = fitFont(ctx, master.category.toUpperCase(), cardW - pad * 2, 22, 15, "600");
      ctx.font = `600 ${cs}px Inter, sans-serif`;
      ctx.fillStyle = ACCENT;
      ctx.fillText(master.category.toUpperCase(), cardX + pad, y);
      y += Math.max(cs * 1.3, nameS * 0.8);
    }
    ctx.font = `700 ${nameS}px Inter, sans-serif`;
    ctx.fillStyle = INK;
    ctx.fillText(label, cardX + pad, y);
    y += nameS * 1.2;
    if (master.sku) {
      ctx.font = "500 22px Inter, sans-serif";
      ctx.fillStyle = MUTED;
      ctx.fillText(`SKU: ${master.sku}`, cardX + pad, y);
      y += 28;
    }
    if (master.promo) {
      const ps = fitFont(ctx, master.promo, cardW - pad * 2, 24, 15, "500");
      ctx.font = `500 ${ps}px Inter, sans-serif`;
      ctx.fillStyle = ACCENT;
      ctx.fillText(master.promo, cardX + pad, y);
      y += ps * 1.3;
    }
    if (master.description) {
      ctx.font = "500 22px Inter, sans-serif";
      ctx.fillStyle = MUTED;
      const lines = wrapCanvasText(ctx, master.description, cardW - pad * 2, 2);
      lines.forEach((l, i) => ctx.fillText(l, cardX + pad, y + i * 27));
      y += lines.length * 27;
    }
    const priceW = cardW - pad * 2 - (master.whatsapp ? 340 : 0);
    drawPriceBlock(ctx, master, price, oldPrice, cardX + pad, cardY + cardH - pad - 10, priceW, 56);
    if (master.whatsapp) {
      ctx.font = "600 28px Inter, sans-serif";
      ctx.fillStyle = MUTED;
      const waText = `WA ${master.whatsapp}`;
      ctx.fillText(waText, cardX + cardW - pad - ctx.measureText(waText).width, cardY + cardH - pad - 8);
    }
  } else if (output === "instagram-post") {
    const imgH = 640;
    drawCoverArea(ctx, img, 0, 0, W, imgH, "Foto produk");
    if (master.brand) drawBrandTag(ctx, master.brand, 48, 96);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, imgH, W, H - imgH);
    const nameS = fitFont(ctx, label, W - 120, 44, 22, "700");
    let y = imgH + 56;
    if (master.category) {
      const cs = fitFont(ctx, master.category.toUpperCase(), W - 120, 24, 16, "600");
      ctx.font = `600 ${cs}px Inter, sans-serif`;
      ctx.fillStyle = ACCENT;
      ctx.fillText(master.category.toUpperCase(), 60, y);
      y += Math.max(cs * 1.3, nameS * 0.8);
    }
    ctx.font = `700 ${nameS}px Inter, sans-serif`;
    ctx.fillStyle = INK;
    ctx.fillText(label, 60, y);
    y += nameS * 1.2;
    if (master.sku) {
      ctx.font = "500 22px Inter, sans-serif";
      ctx.fillStyle = MUTED;
      ctx.fillText(`SKU: ${master.sku}`, 60, y);
      y += 28;
    }
    if (master.promo) {
      const ps = fitFont(ctx, master.promo, W - 120, 24, 15, "500");
      ctx.font = `500 ${ps}px Inter, sans-serif`;
      ctx.fillStyle = ACCENT;
      ctx.fillText(master.promo, 60, y);
      y += ps * 1.3;
    }
    if (master.description) {
      ctx.font = "500 22px Inter, sans-serif";
      ctx.fillStyle = MUTED;
      const lines = wrapCanvasText(ctx, master.description, W - 120, 2);
      lines.forEach((l, i) => ctx.fillText(l, 60, y + i * 27));
      y += lines.length * 27;
    }
    const priceW = W - 120 - (master.whatsapp ? 360 : 0);
    drawPriceBlock(ctx, master, price, oldPrice, 60, H - 80, priceW, 56);
    if (master.whatsapp) {
      ctx.font = "600 30px Inter, sans-serif";
      ctx.fillStyle = MUTED;
      const waText = `WA ${master.whatsapp}`;
      ctx.fillText(waText, W - 60 - ctx.measureText(waText).width, H - 54);
    }
  } else if (output === "instagram-story") {
    const imgH = 1220;
    drawCoverArea(ctx, img, 0, 0, W, imgH, "Foto produk");
    if (master.brand) drawBrandTag(ctx, master.brand, 64, 128);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, imgH, W, H - imgH);
    const nameS = fitFont(ctx, label, W - 140, 50, 26, "700");
    let y = imgH + 110;
    if (master.category) {
      const cs = fitFont(ctx, master.category.toUpperCase(), W - 140, 30, 18, "600");
      ctx.font = `600 ${cs}px Inter, sans-serif`;
      ctx.fillStyle = ACCENT;
      ctx.fillText(master.category.toUpperCase(), 70, y);
      y += Math.max(cs * 1.3, nameS * 0.8);
    }
    if (master.sku) {
      ctx.font = "500 30px Inter, sans-serif";
      ctx.fillStyle = MUTED;
      ctx.fillText(`SKU: ${master.sku}`, 70, y);
      y += Math.max(36, nameS * 0.8);
    }
    ctx.font = `700 ${nameS}px Inter, sans-serif`;
    ctx.fillStyle = INK;
    ctx.fillText(label, 70, y);
    y += nameS * 1.2;
    if (master.promo) {
      const ps = fitFont(ctx, master.promo, W - 140, 28, 18, "500");
      ctx.font = `500 ${ps}px Inter, sans-serif`;
      ctx.fillStyle = ACCENT;
      ctx.fillText(master.promo, 70, y);
      y += ps * 1.3;
    }
    if (master.description) {
      ctx.font = "500 24px Inter, sans-serif";
      ctx.fillStyle = MUTED;
      const lines = wrapCanvasText(ctx, master.description, W - 140, 2);
      lines.forEach((l, i) => ctx.fillText(l, 70, y + i * 30));
      y += lines.length * 30;
    }
    drawPriceBlock(ctx, master, price, oldPrice, 70, H - 230, W - 140, 64);
    if (master.whatsapp) {
      drawPill(ctx, `Order via WhatsApp ${master.whatsapp}`, 70, H - 110, W - 140, 44, "#25d366", "#ffffff");
    }
    if (master.brand) {
      ctx.font = "600 38px Inter, sans-serif";
      ctx.fillStyle = MUTED;
      ctx.fillText(master.brand, W - 70 - ctx.measureText(master.brand).width, H - 60);
    }
  } else if (output === "whatsapp") {
    const imgW = 540;
    drawCoverArea(ctx, img, 0, 0, imgW, H, "Foto produk");
    if (master.brand) drawBrandTag(ctx, master.brand, 40, 92);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(imgW, 0, W - imgW, H);
    const pad = 56;
    const cw = W - imgW - pad * 2;
    let y = 150;
    const nameS = fitFont(ctx, label, cw, 44, 20, "700");
    ctx.font = `700 ${nameS}px Inter, sans-serif`;
    ctx.fillStyle = INK;
    ctx.fillText(label, imgW + pad, y);
    y += nameS * 1.2;
    if (master.category) {
      const cs = fitFont(ctx, master.category, cw, 24, 15, "600");
      ctx.font = `600 ${cs}px Inter, sans-serif`;
      ctx.fillStyle = ACCENT;
      ctx.fillText(master.category, imgW + pad, y);
      y += cs * 1.3;
    }
    if (master.sku) {
      ctx.font = "500 22px Inter, sans-serif";
      ctx.fillStyle = MUTED;
      ctx.fillText(`SKU: ${master.sku}`, imgW + pad, y);
      y += 26;
    }
    if (master.promo) {
      const ps = fitFont(ctx, master.promo, cw, 24, 15, "500");
      ctx.font = `500 ${ps}px Inter, sans-serif`;
      ctx.fillStyle = ACCENT;
      ctx.fillText(master.promo, imgW + pad, y);
      y += ps * 1.3;
    }
    if (master.description) {
      ctx.font = "500 22px Inter, sans-serif";
      ctx.fillStyle = MUTED;
      const lines = wrapCanvasText(ctx, master.description, cw, 3);
      lines.forEach((l, i) => ctx.fillText(l, imgW + pad, y + i * 27));
      y += lines.length * 27;
    }
    drawPriceBlock(ctx, master, price, oldPrice, imgW + pad, H - 240, cw, 52);
    if (master.whatsapp) {
      drawPill(ctx, `WA ${master.whatsapp}`, imgW + pad, H - 110, cw, 44, "#25d366", "#ffffff");
    }
  } else if (output === "price-card") {
    const imgH = 700;
    drawCoverArea(ctx, img, 0, 0, W, imgH, "Foto produk");
    if (master.brand) drawBrandTag(ctx, master.brand, 64, 130);
    const nameS = fitFont(ctx, label, W - 120, 54, 26, "700");
    let y = imgH + 80;
    if (master.category) {
      const cs = fitFont(ctx, master.category.toUpperCase(), W - 120, 32, 18, "600");
      ctx.font = `600 ${cs}px Inter, sans-serif`;
      ctx.fillStyle = ACCENT;
      ctx.fillText(master.category.toUpperCase(), 60, y);
      y += Math.max(cs * 1.3, nameS * 0.8);
    }
    ctx.font = `700 ${nameS}px Inter, sans-serif`;
    ctx.fillStyle = INK;
    ctx.fillText(label, 60, y);
    y += nameS * 1.2;
    if (master.sku) {
      ctx.font = "500 28px Inter, sans-serif";
      ctx.fillStyle = MUTED;
      ctx.fillText(`SKU: ${master.sku}`, 60, y);
      y += 34;
    }
    if (master.promo) {
      const ps = fitFont(ctx, master.promo, W - 120, 28, 16, "500");
      ctx.font = `500 ${ps}px Inter, sans-serif`;
      ctx.fillStyle = ACCENT;
      ctx.fillText(master.promo, 60, y);
      y += ps * 1.3;
    }
    if (master.description) {
      ctx.font = "500 26px Inter, sans-serif";
      ctx.fillStyle = MUTED;
      const lines = wrapCanvasText(ctx, master.description, W - 120, 3);
      lines.forEach((l, i) => ctx.fillText(l, 60, y + i * 31));
      y += lines.length * 31;
    }
    drawPriceBlock(ctx, master, price, oldPrice, 60, H - 150, W - 120, 84);
    if (master.whatsapp) {
      ctx.font = "600 28px Inter, sans-serif";
      ctx.fillStyle = MUTED;
      const waText = `WA ${master.whatsapp}`;
      ctx.fillText(waText, W - 60 - ctx.measureText(waText).width, H - 56);
    }
  } else {
    const imgH = 660;
    drawCoverArea(ctx, img, 0, 0, W, imgH, "Foto produk");
    let y = imgH + 64;
    const nameS = fitFont(ctx, label, W - 100, 40, 20, "700");
    ctx.font = `700 ${nameS}px Inter, sans-serif`;
    ctx.fillStyle = INK;
    ctx.fillText(label, 50, y);
    y += nameS * 1.2;
    const meta = [master.category, master.sku ? `SKU ${master.sku}` : ""].filter(Boolean).join(" • ");
    if (meta) {
      const ms = fitFont(ctx, meta, W - 100, 24, 15, "500");
      ctx.font = `500 ${ms}px Inter, sans-serif`;
      ctx.fillStyle = MUTED;
      ctx.fillText(meta, 50, y);
      y += ms * 1.3;
    }
    if (master.promo) {
      const ps = fitFont(ctx, master.promo, W - 100, 24, 15, "500");
      ctx.font = `500 ${ps}px Inter, sans-serif`;
      ctx.fillStyle = ACCENT;
      ctx.fillText(master.promo, 50, y);
      y += ps * 1.3;
    }
    if (master.description) {
      ctx.font = "500 22px Inter, sans-serif";
      ctx.fillStyle = MUTED;
      const lines = wrapCanvasText(ctx, master.description, W - 100, 2);
      lines.forEach((l, i) => ctx.fillText(l, 50, y + i * 27));
      y += lines.length * 27;
    }
    drawPriceBlock(ctx, master, price, oldPrice, 50, H - 80, W - 100, 50);
  }
}

function drawCoverArea(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement | null,
  x: number,
  y: number,
  w: number,
  h: number,
  placeholder: string,
) {
  if (img) {
    const r = Math.max(w / img.width, h / img.height);
    const dw = img.width * r;
    const dh = img.height * r;
    ctx.drawImage(img, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh);
    return;
  }
  ctx.fillStyle = "#f1efe9";
  ctx.fillRect(x, y, w, h);
  ctx.font = "500 42px Inter, sans-serif";
  ctx.fillStyle = "#9a9488";
  ctx.fillText(placeholder, x + w / 2 - ctx.measureText(placeholder).width / 2, y + h / 2);
}

function fitFont(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxW: number,
  start: number,
  min: number,
  weight: string,
): number {
  let size = start;
  ctx.font = `${weight} ${size}px Inter, sans-serif`;
  while (size > min && ctx.measureText(text).width > maxW) {
    size -= 2;
    ctx.font = `${weight} ${size}px Inter, sans-serif`;
  }
  return size;
}

function drawPriceBlock(
  ctx: CanvasRenderingContext2D,
  master: MasterData,
  price: string,
  oldPrice: string,
  x: number,
  y: number,
  maxW: number,
  size: number,
) {
  const s = fitFont(ctx, price, maxW, size, Math.max(18, size * 0.5), "700");
  ctx.font = `700 ${s}px Inter, sans-serif`;
  ctx.fillStyle = ACCENT;
  ctx.fillText(price, x, y);
  if (oldPrice) {
    const fs = Math.round(s * 0.42);
    const os = fitFont(ctx, oldPrice, maxW, fs, Math.max(11, fs * 0.5), "500");
    const oy = y - s * 1.12;
    ctx.font = `500 ${os}px Inter, sans-serif`;
    ctx.fillStyle = "#8a8478";
    ctx.fillText(oldPrice, x, oy);
    const w = ctx.measureText(oldPrice).width;
    const asc = ctx.measureText(oldPrice).actualBoundingBoxAscent || os;
    ctx.strokeStyle = "#bf3e30";
    ctx.lineWidth = Math.max(2, os * 0.1);
    ctx.beginPath();
    ctx.moveTo(x - 2, oy - asc * 0.45);
    ctx.lineTo(x + w + 2, oy - asc * 0.45);
    ctx.stroke();
  }
}

function drawPill(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxW: number,
  fontSize: number,
  fill: string,
  textColor: string,
) {
  const s = fitFont(ctx, text, maxW - 36, fontSize, Math.max(14, fontSize * 0.45), "600");
  ctx.font = `600 ${s}px Inter, sans-serif`;
  const tw = ctx.measureText(text).width;
  const h = Math.round(s * 1.9);
  const w = tw + 36;
  roundRect(ctx, x, y - h, w, h, h / 2);
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.fillStyle = textColor;
  ctx.fillText(text, x + 18, y - h / 2 + s * 0.36);
}

function drawBrandTag(ctx: CanvasRenderingContext2D, brand: string, x: number, y: number) {
  const s = fitFont(ctx, brand, 700, 34, 18, "600");
  ctx.font = `600 ${s}px Inter, sans-serif`;
  const tw = ctx.measureText(brand).width;
  const h = 54;
  roundRect(ctx, x, y - h, tw + 40, h, h / 2);
  ctx.fillStyle = "rgba(0,0,0,0.45)";
  ctx.fill();
  ctx.fillStyle = "#ffffff";
  ctx.fillText(brand, x + 20, y - h / 2 + s * 0.36);
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

function wrapCanvasText(ctx: CanvasRenderingContext2D, text: string, maxW: number, maxLines: number): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let cur = "";
  for (const word of words) {
    const t = cur ? `${cur} ${word}` : word;
    if (ctx.measureText(t).width > maxW && cur) {
      lines.push(cur);
      cur = word;
      if (lines.length >= maxLines) return lines;
    } else {
      cur = t;
    }
  }
  if (cur) lines.push(cur);
  return lines.slice(0, maxLines);
}