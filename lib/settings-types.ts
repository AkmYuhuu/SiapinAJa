export type PaperSize = "a4" | "a5" | "letter";
export type Orientation = "portrait" | "landscape";

export interface AppSettings {
  theme: "light";
  language: "id";
  locale: "id-ID";
  currency: "IDR";
  defaultPaperSize: PaperSize;
  defaultOrientation: Orientation;
  defaultMarginMM: number;
  lastOpenedTool: string | null;
}

export const DEFAULT_SETTINGS: AppSettings = {
  theme: "light",
  language: "id",
  locale: "id-ID",
  currency: "IDR",
  defaultPaperSize: "a4",
  defaultOrientation: "portrait",
  defaultMarginMM: 10,
  lastOpenedTool: null,
};