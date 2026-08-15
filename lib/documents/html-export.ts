// HTML capture export: mirrors the on-screen document preview (spec §23).
// The .doc-page node is captured directly (instead of a parallel vector
// renderer) so the PDF / PNG / JPEG output matches the preview pixel-for-pixel.
// html-to-image and jsPDF are dynamic-imported (spec §21.3) to stay out of the
// initial bundle.

import { downloadBlob } from "../export";

export const DOC_NODE_SELECTOR = ".doc-page";

const A4_W = 210;
const A4_H = 297;

export function getDocNode(): HTMLElement | null {
  return document.querySelector<HTMLElement>(DOC_NODE_SELECTOR);
}

/** All .doc-page nodes in DOM order (multi-page sheets like label-harga). */
export function getDocNodes(): HTMLElement[] {
  return Array.from(document.querySelectorAll<HTMLElement>(DOC_NODE_SELECTOR));
}

/** Capture the .doc-page node into a canvas, stripping preview-only chrome. */
export async function captureDocNode(
  node: HTMLElement,
  pixelRatio = 3,
): Promise<HTMLCanvasElement> {
  const { toCanvas } = await import("html-to-image");
  if (typeof document !== "undefined" && document.fonts?.ready) {
    await document.fonts.ready;
  }
  const prevBorder = node.style.border;
  const prevShadow = node.style.boxShadow;
  node.style.border = "none";
  node.style.boxShadow = "none";
  try {
    return await toCanvas(node, { pixelRatio, backgroundColor: "#ffffff" });
  } finally {
    node.style.border = prevBorder;
    node.style.boxShadow = prevShadow;
  }
}

/** Download the document as PNG or JPEG. */
export async function exportDocImage(
  node: HTMLElement,
  format: "png" | "jpeg",
  filename: string,
): Promise<void> {
  const canvas = await captureDocNode(node);
  const mime = format === "jpeg" ? "image/jpeg" : "image/png";
  await new Promise<void>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("Image export gagal"));
          return;
        }
        downloadBlob(blob, `${filename}.${format}`);
        resolve();
      },
      mime,
      format === "jpeg" ? 0.92 : undefined,
    );
  });
}

/** Download the document as a PDF whose pages match the A4 preview. */
export async function exportDocPdf(
  node: HTMLElement,
  filename: string,
): Promise<void> {
  return exportNodePdf(node, filename, A4_W, A4_H);
}

/**
 * Download a node as a PDF laid out on `pageWmm × pageHmm` pages.
 * The captured canvas is assumed to be `pageWmm` wide (e.g. the on-screen
 * preview of a 210mm A4 page, or a custom a4-layout page). Pages are sliced
 * from the captured height so a multi-page sheet flows correctly.
 */
export async function exportNodePdf(
  node: HTMLElement,
  filename: string,
  pageWmm = A4_W,
  pageHmm = A4_H,
): Promise<void> {
  const { jsPDF } = await import("jspdf");
  const canvas = await captureDocNode(node);
  const orientation: "portrait" | "landscape" = pageWmm >= pageHmm ? "landscape" : "portrait";
  const doc = new jsPDF({ unit: "mm", format: [pageWmm, pageHmm], orientation, compress: true });

  // The captured canvas is pageWmm wide at pixelRatio scale.
  const pageWpx = canvas.width;
  const pageHpx = pageWpx * (pageHmm / pageWmm);
  // Ignore a sub-page sliver (e.g. sub-pixel rounding) so a nearly full page
  // does not produce a second, blank page.
  const pages = Math.max(1, Math.ceil((canvas.height - pageHpx * 0.02) / pageHpx));

  for (let i = 0; i < pages; i++) {
    if (i > 0) doc.addPage([pageWmm, pageHmm], orientation);
    const sy = i * pageHpx;
    const sh = Math.min(pageHpx, canvas.height - sy);
    const pageCanvas = document.createElement("canvas");
    pageCanvas.width = Math.round(pageWpx);
    pageCanvas.height = Math.round(sh);
    const ctx = pageCanvas.getContext("2d");
    if (!ctx) continue;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
    ctx.drawImage(canvas, 0, sy, canvas.width, sh, 0, 0, pageCanvas.width, sh);
    doc.addImage(pageCanvas.toDataURL("image/jpeg", 0.92), "JPEG", 0, 0, pageWmm, pageHmm);
  }
  doc.save(`${filename}.pdf`);
}

/** Download several full A4 nodes as a single multi-page PDF. */
export async function exportDocPagesPdf(
  nodes: HTMLElement[],
  filename: string,
): Promise<void> {
  return exportNodePagesPdf(nodes, filename, A4_W, A4_H);
}

/**
 * Download several nodes, each placed on a full page of `pageWmm × pageHmm`,
 * as a single PDF. Used for non-A4 sheets (e.g. landscape a4-layout pages).
 */
export async function exportNodePagesPdf(
  nodes: HTMLElement[],
  filename: string,
  pageWmm: number,
  pageHmm: number,
): Promise<void> {
  if (nodes.length === 0) throw new Error("Tidak ada halaman untuk diekspor.");
  const { jsPDF } = await import("jspdf");
  const orientation: "portrait" | "landscape" = pageWmm >= pageHmm ? "landscape" : "portrait";
  const doc = new jsPDF({ unit: "mm", format: [pageWmm, pageHmm], orientation, compress: true });
  for (let i = 0; i < nodes.length; i++) {
    if (i > 0) doc.addPage([pageWmm, pageHmm], orientation);
    const canvas = await captureDocNode(nodes[i]);
    doc.addImage(canvas.toDataURL("image/jpeg", 0.92), "JPEG", 0, 0, pageWmm, pageHmm);
  }
  doc.save(`${filename}.pdf`);
}