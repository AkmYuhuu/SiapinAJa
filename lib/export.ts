// Shared export utilities: download, copy, ZIP.
// Heavy libraries (jsPDF, JSZip) are dynamic-imported lazily.

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

export function downloadText(text: string, filename: string, mime = "text/plain"): void {
  downloadBlob(new Blob([text], { type: mime }), filename);
}

export function downloadJSON(value: unknown, filename: string): void {
  downloadBlob(
    new Blob([JSON.stringify(value, null, 2)], { type: "application/json" }),
    filename,
  );
}

export function downloadCanvas(canvas: HTMLCanvasElement, filename: string, type = "image/png"): void {
  canvas.toBlob((blob) => {
    if (blob) downloadBlob(blob, filename);
  }, type);
}

export async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // fall through to legacy path
  }
  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand("copy");
    ta.remove();
    return ok;
  } catch {
    return false;
  }
}

export interface ZipFile {
  name: string;
  blob: Blob;
}

export async function makeZip(files: ZipFile[], zipName: string): Promise<void> {
  const JSZip = (await import("jszip")).default;
  const zip = new JSZip();
  for (const f of files) zip.file(f.name, f.blob);
  const blob = await zip.generateAsync({ type: "blob" });
  downloadBlob(blob, zipName);
}