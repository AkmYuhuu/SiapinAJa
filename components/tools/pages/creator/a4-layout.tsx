"use client";

import { useMemo, useRef, useState } from "react";
import { Dropzone } from "@/components/media/dropzone";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/fields";
import { SegmentedControl } from "@/components/ui/tabs";
import { SectionTitle, Divider } from "@/components/ui/card";
import { Icon } from "@/components/icons";
import { loadImage } from "@/lib/image";
import { useToast } from "@/components/ui/toast";
import { PrintMenu } from "@/components/documents/print-menu";
import { exportNodePagesPdf } from "@/lib/documents/html-export";

interface ImgItem {
  file: File;
  url: string;
  w: number;
  h: number;
  dataUrl?: string;
}

interface PageCell {
  fileIndex: number;
  xMm: number;
  yMm: number;
}

interface Page {
  index: number;
  cells: PageCell[];
}

interface ItemPreset {
  id: string;
  label: string;
  w: number;
  h: number;
  gap: number;
  margin: number;
}

const ITEM_PRESETS: ItemPreset[] = [
  { id: "foto", label: "Foto · 35×45mm", w: 35, h: 45, gap: 5, margin: 10 },
  { id: "kartu", label: "Kartu · 85.6×54mm", w: 85.6, h: 54, gap: 5, margin: 10 },
  { id: "label", label: "Label · 60×40mm", w: 60, h: 40, gap: 6, margin: 10 },
  { id: "nametag", label: "Name Tag · 90×55mm", w: 90, h: 55, gap: 5, margin: 10 },
  { id: "sticker", label: "Stiker · 50×50mm", w: 50, h: 50, gap: 5, margin: 10 },
];

const MM2PX = 96 / 25.4;
const MAX_IMAGES = 60;

export default function A4LayoutTool() {
  const [imgs, setImgs] = useState<ImgItem[]>([]);
  const [orientation, setOrientation] = useState<"portrait" | "landscape">("portrait");
  const [itemPreset, setItemPreset] = useState("foto");
  const [itemW, setItemW] = useState(35);
  const [itemH, setItemH] = useState(45);
  const [gap, setGap] = useState(5);
  const [margin, setMargin] = useState(10);
  const [copies, setCopies] = useState(1);
  const [busy, setBusy] = useState(false);
  const urlsRef = useRef<string[]>([]);
  const { toast } = useToast();

  const pageW = orientation === "portrait" ? 210 : 297;
  const pageH = orientation === "portrait" ? 297 : 210;

  const layout = useMemo(() => {
    const usableW = Math.max(0, pageW - margin * 2);
    const usableH = Math.max(0, pageH - margin * 2);
    const cellW = itemW + gap;
    const cellH = itemH + gap;
    const cols = Math.max(1, Math.floor((usableW + gap) / cellW));
    const rows = Math.max(1, Math.floor((usableH + gap) / cellH));
    const perPage = cols * rows;
    const total = imgs.length * copies;
    const pageCount = imgs.length === 0 ? 1 : Math.max(1, Math.ceil(total / perPage));
    const sequence: number[] = [];
    for (let c = 0; c < copies; c++) {
      for (let f = 0; f < imgs.length; f++) sequence.push(f);
    }
    const pages: Page[] = [];
    for (let p = 0; p < pageCount; p++) {
      const cells: PageCell[] = [];
      for (let i = 0; i < perPage; i++) {
        const idx = p * perPage + i;
        if (idx >= sequence.length) break;
        const row = Math.floor(i / cols);
        const col = i % cols;
        cells.push({
          fileIndex: sequence[idx],
          xMm: margin + col * cellW,
          yMm: margin + row * cellH,
        });
      }
      pages.push({ index: p, cells });
    }
    return { usableW, usableH, cols, rows, perPage, pageCount, pages };
  }, [pageW, pageH, margin, itemW, itemH, gap, copies, imgs.length]);

  const addFiles = (incoming: File[]) => {
    const accepted = incoming.filter((f) => f.type.startsWith("image/"));
    if (accepted.length !== incoming.length) toast("Beberapa file bukan gambar dan dilewati.", "error");
    if (accepted.length === 0) return;
    const remaining = MAX_IMAGES - imgs.length;
    const take = accepted.slice(0, Math.max(0, remaining));
    if (take.length < accepted.length) toast(`Maksimal ${MAX_IMAGES} gambar dalam satu sesi.`, "error");
    if (take.length === 0) return;
    const next: ImgItem[] = take.map((f) => ({
      file: f,
      url: URL.createObjectURL(f),
      w: 0,
      h: 0,
    }));
    urlsRef.current.push(...next.map((n) => n.url));
    setImgs((prev) => [...prev, ...next]);
    Promise.all(
      take.map(async (f) => {
        try {
          const im = await loadImage(f);
          setImgs((prev) =>
            prev.map((it) => (it.file === f ? { ...it, w: im.naturalWidth, h: im.naturalHeight } : it)),
          );
        } catch {
          toast(`${f.name} tidak dapat dibaca.`, "error");
        }
      }),
    );
  };

  const applyPreset = (id: string) => {
    setItemPreset(id);
    const p = ITEM_PRESETS.find((x) => x.id === id);
    if (p) {
      setItemW(p.w);
      setItemH(p.h);
      setGap(p.gap);
      setMargin(p.margin);
    }
  };

  const exportPDF = async () => {
    if (imgs.length === 0 || busy) return;
    setBusy(true);
    try {
      const nodes = Array.from(document.querySelectorAll<HTMLElement>(".a4-page"));
      if (nodes.length === 0) throw new Error("Tidak ada halaman.");
      await exportNodePagesPdf(nodes, "siapinaja-a4-layout", pageW, pageH);
      toast("PDF siap diunduh.");
    } catch {
      toast("Gagal membuat PDF.", "error");
    } finally {
      setBusy(false);
    }
  };

  const clearAll = () => {
    urlsRef.current.forEach((u) => URL.revokeObjectURL(u));
    urlsRef.current = [];
    setImgs([]);
  };

  const printStyle = `
    @page { size: A4 ${orientation}; margin: 0; }
  `;

  return (
    <div className="space-y-4">
      <style>{printStyle}</style>
      {imgs.length === 0 ? (
        <Dropzone
          onFiles={addFiles}
          accept="image/*"
          title="Drop gambar di sini"
          hint="Susun banyak gambar atau kartu di halaman A4, lalu cetak atau unduh sebagai PDF."
          icon="upload"
        />
      ) : (
        <>
          <div className="grid gap-4 lg:grid-cols-[1fr_300px]">
            <div className="space-y-4">
              <div className="print-clean overflow-auto rounded-lg border border-border bg-surface-muted p-4">
                <div className="print-area space-y-3">
                  {layout.pages.map((page) => (
                    <div key={page.index}>
                      <p className="mb-1 text-xs text-ink-faint print-hide">Halaman {page.index + 1}</p>
                      <div
                        className="a4-page relative bg-white shadow-[0_6px_24px_rgba(43,40,35,0.18)]"
                        style={{ width: pageW * MM2PX, height: pageH * MM2PX }}
                      >
                        <div
                          className="absolute border border-dashed border-ink-faint/40"
                          style={{
                            left: margin * MM2PX,
                            top: margin * MM2PX,
                            width: layout.usableW * MM2PX,
                            height: layout.usableH * MM2PX,
                          }}
                        />
                        {page.cells.map((cell, i) => {
                          const item = imgs[cell.fileIndex];
                          return (
                            <div
                              key={i}
                              className="absolute overflow-hidden"
                              style={{
                                left: cell.xMm * MM2PX,
                                top: cell.yMm * MM2PX,
                                width: itemW * MM2PX,
                                height: itemH * MM2PX,
                              }}
                            >
                              <div className="absolute inset-0 rounded-[2px] border border-ink-faint/30" />
                              {item && item.w > 0 ? (
                                <img
                                  src={item.url}
                                  alt={item.file.name}
                                  className="absolute inset-0 h-full w-full object-contain"
                                />
                              ) : (
                                <div className="flex h-full w-full items-center justify-center text-[10px] text-ink-faint">
                                  …
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-4 rounded-lg border border-border bg-surface p-4 print-hide">
              <div className="flex items-center justify-between">
                <SectionTitle className="mb-0">Layout A4</SectionTitle>
                <Button size="sm" variant="ghost" onClick={clearAll}>
                  <Icon name="trash" className="size-3.5" />
                  Bersihkan
                </Button>
              </div>

              <div>
                <SectionTitle className="mb-2">Item</SectionTitle>
                <Field label="Preset ukuran">
                  <Select value={itemPreset} onChange={(e) => applyPreset(e.target.value)}>
                    {ITEM_PRESETS.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.label}
                      </option>
                    ))}
                  </Select>
                </Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Lebar item (mm)">
                    <Input
                      type="number"
                      min={1}
                      value={itemW || ""}
                      onChange={(e) => setItemW(Math.max(1, Number(e.target.value)))}
                      aria-label="Lebar item dalam mm"
                    />
                  </Field>
                  <Field label="Tinggi item (mm)">
                    <Input
                      type="number"
                      min={1}
                      value={itemH || ""}
                      onChange={(e) => setItemH(Math.max(1, Number(e.target.value)))}
                      aria-label="Tinggi item dalam mm"
                    />
                  </Field>
                </div>
              </div>

              <Divider />

              <div>
                <SectionTitle className="mb-2">Halaman</SectionTitle>
                <Field label="Orientasi">
                  <SegmentedControl
                    options={[
                      { value: "portrait", label: "Portrait" },
                      { value: "landscape", label: "Landscape" },
                    ]}
                    value={orientation}
                    onChange={setOrientation}
                  />
                </Field>
                <div className="grid grid-cols-3 gap-3">
                  <Field label="Jarak (mm)">
                    <Input
                      type="number"
                      min={0}
                      value={gap || ""}
                      onChange={(e) => setGap(Math.max(0, Number(e.target.value)))}
                      aria-label="Jarak antar item dalam mm"
                    />
                  </Field>
                  <Field label="Margin (mm)">
                    <Input
                      type="number"
                      min={0}
                      value={margin || ""}
                      onChange={(e) => setMargin(Math.max(0, Number(e.target.value)))}
                      aria-label="Margin halaman dalam mm"
                    />
                  </Field>
                  <Field label="Salinan">
                    <Input
                      type="number"
                      min={1}
                      value={copies}
                      onChange={(e) => setCopies(Math.max(1, Math.floor(Number(e.target.value))))}
                      aria-label="Jumlah salinan"
                    />
                  </Field>
                </div>
                <p className="mt-2 text-xs leading-relaxed text-ink-faint">
                  {imgs.length} gambar × {copies} salinan = {imgs.length * copies} item · {layout.pageCount} halaman ·{" "}
                  {layout.cols} × {layout.rows} per halaman.
                </p>
              </div>

              <Divider />

              <div>
                <Button className="w-full" onClick={exportPDF} disabled={busy || imgs.length === 0} loading={busy}>
                  <Icon name="download" className="size-4" />
                  Unduh PDF
                </Button>
                <PrintMenu className="mt-2 w-full" disabled={imgs.length === 0} nota={false} />
                <p className="mt-2 text-xs leading-relaxed text-ink-faint">
                  PDF dihasilkan dari pratinjau halaman A4 sehingga sesuai dengan tampilan. Cetak memakai dialog printer browser.
                </p>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}