// Shared client-side image engine (spec §14). No uploads.

export type ImageFormat = "image/jpeg" | "image/png" | "image/webp";

export const FORMAT_EXT: Record<ImageFormat, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export const FORMAT_LABEL: Record<ImageFormat, string> = {
  "image/jpeg": "JPG",
  "image/png": "PNG",
  "image/webp": "WebP",
};

export function fileExtLabel(file: File): string {
  const m = /\.([a-zA-Z0-9]+)$/.exec(file.name);
  return (m ? m[1] : "file").toUpperCase();
}

export function loadImage(src: string | Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    let objectUrl: string | null = null;
    const cleanup = () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
    img.onload = () => {
      cleanup();
      resolve(img);
    };
    img.onerror = () => {
      cleanup();
      reject(new Error("Gambar tidak dapat dibaca. File mungkin rusak."));
    };
    if (typeof src === "string") {
      img.src = src;
    } else {
      objectUrl = URL.createObjectURL(src);
      img.src = objectUrl;
    }
  });
}

export function getDimensions(img: HTMLImageElement): { width: number; height: number } {
  return { width: img.naturalWidth || img.width, height: img.naturalHeight || img.height };
}

export interface ResizeOptions {
  width?: number;
  height?: number;
  fit?: "contain" | "cover" | "stretch";
  lockAspect?: boolean;
}

export function resizeDimensions(
  imgW: number,
  imgH: number,
  opts: ResizeOptions,
): { width: number; height: number } {
  const { width, height, fit = "contain", lockAspect = true } = opts;
  if (!width && !height) return { width: imgW, height: imgH };
  if (width && height && !lockAspect) {
    return { width: Math.max(1, Math.round(width)), height: Math.max(1, Math.round(height)) };
  }
  const ratio = imgW / imgH;
  let w = width ?? Math.round((height ?? imgH) * ratio);
  let h = height ?? Math.round((width ?? imgW) / ratio);
  if (fit === "contain") {
    if (width && h > (height || Infinity)) {
      h = height ?? h;
      w = Math.round(h * ratio);
    }
    if (height && w > (width || Infinity)) {
      w = width ?? w;
      h = Math.round(w / ratio);
    }
    if (width && w > width) {
      w = width;
      h = Math.round(w / ratio);
    }
    if (height && h > height) {
      h = height;
      w = Math.round(h * ratio);
    }
  }
  return { width: Math.max(1, Math.round(w)), height: Math.max(1, Math.round(h)) };
}

export interface DrawOptions {
  width: number;
  height: number;
  format: ImageFormat;
  quality?: number; // 0..1 for lossy formats
  background?: string; // fill background (used with cover/jpeg)
  fit?: "contain" | "cover" | "stretch";
  lockAspect?: boolean;
}

/** Render an image to canvas at target dimensions (spec §14 renderCanvas). */
export function renderCanvas(
  img: HTMLImageElement | HTMLCanvasElement,
  opts: DrawOptions,
): HTMLCanvasElement {
  return renderToCanvas(img, opts);
}

export function renderToCanvas(img: HTMLImageElement | HTMLCanvasElement, opts: DrawOptions): HTMLCanvasElement {
  const { width, height, background } = opts;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas tidak tersedia di browser ini.");
  if (background) {
    ctx.fillStyle = background;
    ctx.fillRect(0, 0, width, height);
  }
  const fit = opts.fit ?? "contain";
  const lock = opts.lockAspect ?? true;
  if (fit === "cover") {
    const ratio = Math.max(width / img.width, height / img.height);
    const dw = img.width * ratio;
    const dh = img.height * ratio;
    drawImageScaled(ctx, img, (width - dw) / 2, (height - dh) / 2, dw, dh);
  } else if (fit === "stretch") {
    drawImageScaled(ctx, img, 0, 0, width, height);
  } else {
    const dims = resizeDimensions(img.width, img.height, {
      width,
      height,
      fit: "contain",
      lockAspect: lock,
    });
    drawImageScaled(ctx, img, (width - dims.width) / 2, (height - dims.height) / 2, dims.width, dims.height);
  }
  return canvas;
}

/** High-quality resampling that keeps enlargements sharp instead of blurry.
 *  Uses the best browser smoothing, and upscales in small steps (max 2x per
 *  pass) which preserves more detail than a single large jump. */
function drawImageScaled(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement | HTMLCanvasElement,
  dx: number,
  dy: number,
  dw: number,
  dh: number,
): void {
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  const srcW = img.width || 1;
  const srcH = img.height || 1;
  if (dw <= srcW && dh <= srcH) {
    ctx.drawImage(img, dx, dy, dw, dh);
    return;
  }
  let cur: HTMLCanvasElement | HTMLImageElement = img;
  let cw = srcW;
  let ch = srcH;
  while (cw < dw || ch < dh) {
    const nextW = Math.max(1, Math.min(dw, Math.ceil(cw * 2)));
    const nextH = Math.max(1, Math.min(dh, Math.ceil(ch * 2)));
    const step = document.createElement("canvas");
    step.width = nextW;
    step.height = nextH;
    const stepCtx = step.getContext("2d");
    if (stepCtx) {
      stepCtx.imageSmoothingEnabled = true;
      stepCtx.imageSmoothingQuality = "high";
      stepCtx.drawImage(cur, 0, 0, nextW, nextH);
    }
    cur = step;
    cw = nextW;
    ch = nextH;
  }
  ctx.drawImage(cur, dx, dy, dw, dh);
}

export function canvasToBlob(canvas: HTMLCanvasElement, format: ImageFormat, quality = 0.85): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("Gambar gagal diproses."))),
      format,
      format === "image/png" ? undefined : quality,
    );
  });
}

/** Compress: decode -> canvas -> blob (spec §10.1 behavior). */
export async function compressImage(
  file: File,
  format: ImageFormat,
  quality = 0.8,
  maxDimension?: number,
): Promise<{ blob: Blob; width: number; height: number }> {
  const img = await loadImage(file);
  let { width, height } = getDimensions(img);
  if (maxDimension) {
    const scale = Math.min(1, maxDimension / Math.max(width, height));
    width = Math.max(1, Math.round(width * scale));
    height = Math.max(1, Math.round(height * scale));
  }
  const canvas = renderToCanvas(img, {
    width,
    height,
    format,
    quality,
    fit: "stretch",
  });
  const blob = await canvasToBlob(canvas, format, quality);
  return { blob, width, height };
}

export async function resizeImageFile(
  file: File,
  opts: { width?: number; height?: number; format: ImageFormat; quality?: number; lockAspect?: boolean; background?: string },
): Promise<{ blob: Blob; width: number; height: number; canvas: HTMLCanvasElement }> {
  const img = await loadImage(file);
  const dims = resizeDimensions(img.width, img.height, opts);
  const canvas = renderToCanvas(img, {
    width: dims.width,
    height: dims.height,
    format: opts.format,
    quality: opts.quality ?? 0.9,
    background: opts.background,
    fit: "contain",
    lockAspect: opts.lockAspect,
  });
  const blob = await canvasToBlob(canvas, opts.format, opts.quality ?? 0.9);
  return { blob, width: dims.width, height: dims.height, canvas };
}

/** Spec §14 alias: resize an image file to target dimensions. */
export async function resizeImage(
  file: File,
  opts: { width?: number; height?: number; format: ImageFormat; quality?: number; lockAspect?: boolean; background?: string },
): Promise<{ blob: Blob; width: number; height: number; canvas: HTMLCanvasElement }> {
  return resizeImageFile(file, opts);
}

/** Crop a rectangular region out of an image file (spec §14 cropImage). */
export async function cropImage(
  file: File,
  crop: { x: number; y: number; width: number; height: number },
  opts: { format: ImageFormat; quality?: number; background?: string },
): Promise<{ blob: Blob; width: number; height: number; canvas: HTMLCanvasElement }> {
  const img = await loadImage(file);
  const w = Math.max(1, Math.round(crop.width));
  const h = Math.max(1, Math.round(crop.height));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas tidak tersedia di browser ini.");
  if (opts.background) {
    ctx.fillStyle = opts.background;
    ctx.fillRect(0, 0, w, h);
  }
  ctx.drawImage(img, crop.x, crop.y, w, h, 0, 0, w, h);
  const blob = await canvasToBlob(canvas, opts.format, opts.quality ?? 0.9);
  return { blob, width: w, height: h, canvas };
}

/** Spec §14 alias: convert an existing canvas to a Blob in another format. */
export async function convertFormat(
  canvas: HTMLCanvasElement,
  format: ImageFormat,
  quality = 0.9,
): Promise<Blob> {
  return canvasToBlob(canvas, format, quality);
}

/** Spec §14 alias: export a canvas as a Blob. */
export async function exportBlob(
  canvas: HTMLCanvasElement,
  format: ImageFormat,
  quality = 0.9,
): Promise<Blob> {
  return canvasToBlob(canvas, format, quality);
}

export interface WatermarkOptions {
  text: string;
  position?: "bottom-right" | "bottom-left" | "top-right" | "top-left" | "center";
  fontSizeRatio?: number;
  opacity?: number;
  color?: string;
  /** Optional logo image drawn next to the text (spec §10.3). */
  logo?: HTMLImageElement | HTMLCanvasElement | null;
  logoSizeRatio?: number;
}

/** Draw watermark text (+ optional logo) onto a canvas (destructive copy). */
export function addWatermark(
  src: HTMLCanvasElement,
  opts: WatermarkOptions,
): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = src.width;
  canvas.height = src.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas tidak tersedia.");
  ctx.drawImage(src, 0, 0);
  const pad = Math.round(src.width * 0.03);
  const logoSize = opts.logo
    ? Math.max(16, Math.round(src.width * (opts.logoSizeRatio ?? 0.08)))
    : 0;
  let textX = 0;
  if (opts.logo) {
    const logoY = opts.position?.endsWith("top")
      ? pad
      : opts.position === "center"
        ? (src.height - logoSize) / 2
        : src.height - pad - logoSize;
    ctx.globalAlpha = opts.opacity ?? 0.7;
    ctx.drawImage(opts.logo, pad, logoY, logoSize, logoSize);
    ctx.globalAlpha = 1;
    textX = pad + logoSize + Math.round(src.width * 0.01);
  }
  const fontSize = Math.max(12, Math.round(src.width * (opts.fontSizeRatio ?? 0.03)));
  ctx.font = `600 ${fontSize}px Inter, sans-serif`;
  ctx.fillStyle = opts.color ?? "rgba(255,255,255,0.8)";
  ctx.globalAlpha = opts.opacity ?? 0.7;
  const metrics = ctx.measureText(opts.text);
  const measureX = textX || pad;
  const x = opts.position?.startsWith("bottom")
    ? src.width - metrics.width - pad
    : opts.position?.startsWith("top")
      ? measureX
      : opts.logo
        ? measureX
        : (src.width - metrics.width) / 2;
  const y = opts.position?.endsWith("top")
    ? pad + fontSize
    : opts.position === "center"
      ? (src.height + fontSize / 2) / 2
      : src.height - pad;
  ctx.fillText(opts.text, x, y);
  ctx.globalAlpha = 1;
  return canvas;
}

export async function fileToDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = () => reject(new Error("File tidak dapat dibaca."));
    r.readAsDataURL(file);
  });
}

export function canvasToDataURL(canvas: HTMLCanvasElement, format: ImageFormat, quality = 0.9): string {
  return canvas.toDataURL(format, format === "image/png" ? undefined : quality);
}

export const ACCEPTED_IMAGE = "image/jpeg,image/png,image/webp,image/gif";

export function isImageFile(file: File): boolean {
  return file.type.startsWith("image/");
}

/** Queue processor with real progress (spec §10.1 batch). */
export async function processQueue<T>(
  items: T[],
  worker: (item: T, index: number) => Promise<void>,
  onProgress?: (done: number, total: number) => void,
): Promise<void> {
  const total = items.length;
  let done = 0;
  const CONCURRENCY = 3;
  let cursor = 0;
  const runners = Array.from({ length: Math.min(CONCURRENCY, total) }, async () => {
    while (cursor < total) {
      const i = cursor++;
      try {
        await worker(items[i], i);
      } finally {
        done++;
        onProgress?.(done, total);
      }
    }
  });
  await Promise.all(runners);
}