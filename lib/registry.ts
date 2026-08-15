import type { IconName } from "@/components/icons";

// Canonical registry (Backend_v3 §2.18 + CODEBASE_CLEANUP §11-13):
// toolId = permission identity (must match backend exactly)
// route  = navigation identity (may differ from toolId)
// Never hardcode tool names/routes in multiple files - use this registry.

export type CategoryId = "umkm" | "freelancer" | "creator-seller";
export type ToolModel = "calculator" | "document" | "workflow" | "media";
export type PackageId = "umkm" | "freelancer" | "creator";
export type ToolStatus = "active" | "coming_soon" | "disabled";

export interface ToolDef {
  /** Canonical tool_id (permission identity) - matches backend registry. */
  toolId: string;
  /** URL slug (navigation identity). */
  slug: string;
  name: string;
  description: string;
  category: CategoryId;
  group: string;
  model: ToolModel;
  pack: PackageId;
  icon: IconName;
  status: ToolStatus;
  /** tool has projects that live in IndexedDB */
  hasProjects: boolean;
  route: string;
}

export interface CategoryMeta {
  id: CategoryId;
  name: string;
  callout: string;
  subtitle: string;
  personality: string;
  icon: IconName;
  groups: { label: string; toolIds: string[] }[];
}

export const CATEGORIES: CategoryMeta[] = [
  {
    id: "umkm",
    name: "UMKM",
    callout: "Kelola jualan, hitung harga, dan bereskan operasional.",
    subtitle: "Jualan, hitung, dan bereskan operasional.",
    personality: "Praktis, padat, dan terpercaya.",
    icon: "store",
    groups: [
      {
        label: "Harga & Profit",
        toolIds: ["hpp", "selling-price", "profit-analyzer", "bep", "business-capital"],
      },
      {
        label: "Operasional",
        toolIds: ["order-sheet", "po-manager", "invoice", "receipt", "delivery-note", "packing-list", "shipping-packaging"],
      },
    ],
  },
  {
    id: "freelancer",
    name: "Freelancer",
    callout: "Hitung tarif, buat dokumen, dan siapkan project.",
    subtitle: "Tentukan harga, siapkan penawaran, dan bereskan project.",
    personality: "Tepat, profesional, dan rapi.",
    icon: "briefcase",
    groups: [
      {
        label: "Harga Project",
        toolIds: ["freelancer-price", "project-cost", "target-income", "price-package"],
      },
      {
        label: "Dokumen",
        toolIds: ["quotation", "invoice", "receipt"],
      },
    ],
  },
  {
    id: "creator-seller",
    name: "Creator / Seller",
    callout: "Olah foto, siapkan materi jualan, dan buat output siap pakai.",
    subtitle: "Siapkan foto dan materi jualan tanpa workflow yang ribet.",
    personality: "Visual, taktil, dan preview-driven.",
    icon: "camera",
    groups: [
      {
        label: "Foto",
        toolIds: ["image-compressor", "image-resizer", "product-photo"],
      },
      {
        label: "Visual",
        toolIds: ["mockup", "a4-layout"],
      },
      {
        label: "Jualan",
        toolIds: ["price-label", "passport-photo", "jualankit"],
      },
    ],
  },
];

export const TOOLS: ToolDef[] = [
  // ===== UMKM =====
  {
    toolId: "hpp",
    slug: "hpp",
    name: "HPP Makanan",
    description: "Hitung biaya produksi nyata per porsi sebelum menentukan harga jual.",
    category: "umkm",
    group: "Harga & Profit",
    model: "calculator",
    pack: "umkm",
    icon: "calculator",
    status: "active",
    hasProjects: true,
    route: "/tools/umkm/hpp",
  },
  {
    toolId: "selling-price",
    slug: "harga-jual",
    name: "Kalkulator Harga Jual",
    description: "Tentukan harga jual dari modal, fee marketplace, dan target profit.",
    category: "umkm",
    group: "Harga & Profit",
    model: "calculator",
    pack: "umkm",
    icon: "pricetag",
    status: "active",
    hasProjects: true,
    route: "/tools/umkm/harga-jual",
  },
  {
    toolId: "profit-analyzer",
    slug: "profit-analyzer",
    name: "Profit Analyzer",
    description: "Cek keuntungan bersih satu produk atau banyak produk sekaligus.",
    category: "umkm",
    group: "Harga & Profit",
    model: "calculator",
    pack: "umkm",
    icon: "chart",
    status: "active",
    hasProjects: true,
    route: "/tools/umkm/profit-analyzer",
  },
  {
    toolId: "bep",
    slug: "bep",
    name: "Break-Even Point",
    description: "Cari tahu berapa unit terjual agar balik modal.",
    category: "umkm",
    group: "Harga & Profit",
    model: "calculator",
    pack: "umkm",
    icon: "target",
    status: "active",
    hasProjects: true,
    route: "/tools/umkm/bep",
  },
  {
    toolId: "business-capital",
    slug: "modal-usaha",
    name: "Kalkulator Modal Usaha",
    description: "Rinci modal awal: equipment, bahan, operasional, sampai dana cadangan.",
    category: "umkm",
    group: "Harga & Profit",
    model: "calculator",
    pack: "umkm",
    icon: "scale",
    status: "active",
    hasProjects: true,
    route: "/tools/umkm/modal-usaha",
  },
  {
    toolId: "order-sheet",
    slug: "order-sheet",
    name: "Order Sheet",
    description: "Ubah data pesanan jadi lembar kerja siap proses dan print.",
    category: "umkm",
    group: "Operasional",
    model: "workflow",
    pack: "umkm",
    icon: "clipboard",
    status: "active",
    hasProjects: true,
    route: "/tools/umkm/order-sheet",
  },
  {
    toolId: "po-manager",
    slug: "po-manager",
    name: "PO Manager",
    description: "Kelola pre-order dari DP sampai selesai.",
    category: "umkm",
    group: "Operasional",
    model: "workflow",
    pack: "umkm",
    icon: "boxes",
    status: "active",
    hasProjects: true,
    route: "/tools/umkm/po-manager",
  },
  {
    toolId: "invoice",
    slug: "invoice",
    name: "Invoice",
    description: "Buat invoice UMKM dan unduh PDF.",
    category: "umkm",
    group: "Operasional",
    model: "document",
    pack: "umkm",
    icon: "receipt",
    status: "active",
    hasProjects: true,
    route: "/tools/umkm/invoice",
  },
  {
    toolId: "receipt",
    slug: "kwitansi",
    name: "Kwitansi",
    description: "Buat kwitansi dengan terbilang otomatis, siap print.",
    category: "umkm",
    group: "Operasional",
    model: "document",
    pack: "umkm",
    icon: "stamp",
    status: "active",
    hasProjects: true,
    route: "/tools/umkm/kwitansi",
  },
  {
    toolId: "delivery-note",
    slug: "surat-jalan",
    name: "Surat Jalan",
    description: "Dokumen pengiriman barang dengan tanda terima.",
    category: "umkm",
    group: "Operasional",
    model: "document",
    pack: "umkm",
    icon: "truck",
    status: "active",
    hasProjects: true,
    route: "/tools/umkm/surat-jalan",
  },
  {
    toolId: "packing-list",
    slug: "packing-list",
    name: "Packing List",
    description: "Checklist packing barang siap cetak.",
    category: "umkm",
    group: "Operasional",
    model: "workflow",
    pack: "umkm",
    icon: "checklist",
    status: "active",
    hasProjects: true,
    route: "/tools/umkm/packing-list",
  },
  {
    toolId: "shipping-packaging",
    slug: "ongkir-packaging",
    name: "Ongkir & Packaging",
    description: "Hitung ongkir, kemasan, dan siapa yang menanggung.",
    category: "umkm",
    group: "Operasional",
    model: "calculator",
    pack: "umkm",
    icon: "package",
    status: "active",
    hasProjects: true,
    route: "/tools/umkm/ongkir-packaging",
  },
  // ===== Freelancer =====
  {
    toolId: "freelancer-price",
    slug: "harga-jasa",
    name: "Kalkulator Harga Jasa",
    description: "Tentukan tarif dari waktu, kompleksitas, revisi, dan deadline.",
    category: "freelancer",
    group: "Harga Project",
    model: "calculator",
    pack: "freelancer",
    icon: "coins",
    status: "active",
    hasProjects: true,
    route: "/tools/freelancer/harga-jasa",
  },
  {
    toolId: "project-cost",
    slug: "project-cost",
    name: "Project Cost Calculator",
    description: "Rinci biaya project - bedakan cost dan harga jual.",
    category: "freelancer",
    group: "Harga Project",
    model: "calculator",
    pack: "freelancer",
    icon: "file",
    status: "active",
    hasProjects: true,
    route: "/tools/freelancer/project-cost",
  },
  {
    toolId: "target-income",
    slug: "target-income",
    name: "Target Income Calculator",
    description: "Berapa tarif yang harus dipasang untuk capai target pendapatan.",
    category: "freelancer",
    group: "Harga Project",
    model: "calculator",
    pack: "freelancer",
    icon: "piggy",
    status: "active",
    hasProjects: true,
    route: "/tools/freelancer/target-income",
  },
  {
    toolId: "price-package",
    slug: "price-package",
    name: "Price Package Builder",
    description: "Buat paket jasa bertingkat: Basic, Standard, Premium.",
    category: "freelancer",
    group: "Harga Project",
    model: "calculator",
    pack: "freelancer",
    icon: "layers",
    status: "active",
    hasProjects: true,
    route: "/tools/freelancer/price-package",
  },
  {
    toolId: "quotation",
    slug: "quotation",
    name: "Quotation",
    description: "Penawaran harga resmi siap kirim ke klien.",
    category: "freelancer",
    group: "Dokumen",
    model: "document",
    pack: "freelancer",
    icon: "send",
    status: "active",
    hasProjects: true,
    route: "/tools/freelancer/quotation",
  },
  {
    toolId: "invoice",
    slug: "invoice",
    name: "Invoice",
    description: "Invoice jasa dengan milestone dan pembayaran bertahap.",
    category: "freelancer",
    group: "Dokumen",
    model: "document",
    pack: "freelancer",
    icon: "receipt",
    status: "active",
    hasProjects: true,
    route: "/tools/freelancer/invoice",
  },
  {
    toolId: "receipt",
    slug: "kwitansi",
    name: "Kwitansi",
    description: "Kwitansi jasa: DP, termin, pelunasan.",
    category: "freelancer",
    group: "Dokumen",
    model: "document",
    pack: "freelancer",
    icon: "stamp",
    status: "active",
    hasProjects: true,
    route: "/tools/freelancer/kwitansi",
  },
  // ===== Creator / Seller =====
  {
    toolId: "image-compressor",
    slug: "image-compressor",
    name: "Image Compressor",
    description: "Kecilkan ukuran gambar tanpa naik ke server.",
    category: "creator-seller",
    group: "Foto",
    model: "media",
    pack: "creator",
    icon: "compress",
    status: "active",
    hasProjects: false,
    route: "/tools/creator-seller/image-compressor",
  },
  {
    toolId: "image-resizer",
    slug: "image-resizer",
    name: "Image Resizer",
    description: "Ubah dimensi gambar dengan preset marketplace dan sosial.",
    category: "creator-seller",
    group: "Foto",
    model: "media",
    pack: "creator",
    icon: "resize",
    status: "active",
    hasProjects: false,
    route: "/tools/creator-seller/image-resizer",
  },
  {
    toolId: "product-photo",
    slug: "product-photo",
    name: "Product Photo Processor",
    description: "Satu tool menyiapkan foto produk: crop, resize, watermark.",
    category: "creator-seller",
    group: "Foto",
    model: "media",
    pack: "creator",
    icon: "camera",
    status: "active",
    hasProjects: false,
    route: "/tools/creator-seller/product-photo",
  },
  {
    toolId: "mockup",
    slug: "mockup",
    name: "Mockup Generator",
    description: "Masukkan screenshot ke frame device siap pamer.",
    category: "creator-seller",
    group: "Visual",
    model: "media",
    pack: "creator",
    icon: "device",
    status: "active",
    hasProjects: false,
    route: "/tools/creator-seller/mockup",
  },
  {
    toolId: "a4-layout",
    slug: "a4-layout",
    name: "A4 Layout",
    description: "Susun banyak gambar atau kartu di halaman A4.",
    category: "creator-seller",
    group: "Visual",
    model: "media",
    pack: "creator",
    icon: "grid",
    status: "active",
    hasProjects: false,
    route: "/tools/creator-seller/a4-layout",
  },
  {
    toolId: "price-label",
    slug: "label-harga",
    name: "Label Harga Generator",
    description: "Sheet A4 berisi label harga siap potong.",
    category: "creator-seller",
    group: "Jualan",
    model: "media",
    pack: "creator",
    icon: "tag",
    status: "active",
    hasProjects: true,
    route: "/tools/creator-seller/label-harga",
  },
  {
    toolId: "passport-photo",
    slug: "pas-foto",
    name: "Pas Foto Generator",
    description: "2x3, 3x4, 4x6 di lembar A4 siap cetak.",
    category: "creator-seller",
    group: "Jualan",
    model: "media",
    pack: "creator",
    icon: "idcard",
    status: "active",
    hasProjects: false,
    route: "/tools/creator-seller/pas-foto",
  },
  {
    toolId: "jualankit",
    slug: "jualankit",
    name: "JualanKit",
    description: "Satu produk. Semua materi jualan. Sekali input.",
    category: "creator-seller",
    group: "Jualan",
    model: "media",
    pack: "creator",
    icon: "spark",
    status: "active",
    hasProjects: true,
    route: "/tools/creator-seller/jualankit",
  },
];

/** Resolve a tool by its canonical toolId (permission identity). */
export function getTool(toolId: string): ToolDef | undefined {
  return TOOLS.find((t) => t.toolId === toolId);
}

/** Resolve a tool by its canonical route, e.g. "/tools/umkm/invoice". */
export function getToolByRoute(route: string): ToolDef | undefined {
  return TOOLS.find((t) => t.route === route);
}

export function getCategory(id: string): CategoryMeta | undefined {
  return CATEGORIES.find((c) => c.id === id);
}

export function toolsByCategory(category: CategoryId): ToolDef[] {
  return TOOLS.filter((t) => t.category === category);
}

export function categoryHref(category: CategoryId): string {
  return `/tools/${category}`;
}

export function searchTools(q: string): ToolDef[] {
  const query = q.trim().toLowerCase();
  if (!query) return TOOLS;
  return TOOLS.filter(
    (t) =>
      t.name.toLowerCase().includes(query) ||
      t.description.toLowerCase().includes(query) ||
      t.category.includes(query) ||
      t.group.toLowerCase().includes(query),
  );
}
