// Idempotent seed (Backend_v3 §2.23): 3 packages, 27 tools, package→tool
// mapping. Safe to run repeatedly - uses onConflictDoNothing per row.
// Run with: npm run db:seed  (needs DATABASE_URL in .env.local)

import { config } from "dotenv";
config({ path: ".env.local" });

import { db } from "./index";
import { packages, tools, packageTools } from "./schema";

const TOOL_SEED = [
  // UMKM
  ["hpp", "HPP Makanan", "umkm"],
  ["selling-price", "Kalkulator Harga Jual", "umkm"],
  ["profit-analyzer", "Profit Analyzer", "umkm"],
  ["bep", "Break-Even Point", "umkm"],
  ["business-capital", "Kalkulator Modal Usaha", "umkm"],
  ["order-sheet", "Order Sheet", "umkm"],
  ["po-manager", "PO Manager", "umkm"],
  ["invoice", "Invoice", "umkm"],
  ["receipt", "Kwitansi", "umkm"],
  ["delivery-note", "Surat Jalan", "umkm"],
  ["packing-list", "Packing List", "umkm"],
  ["shipping-packaging", "Ongkir & Packaging", "umkm"],
  // Freelancer
  ["freelancer-price", "Kalkulator Harga Jasa", "freelancer"],
  ["project-cost", "Project Cost Calculator", "freelancer"],
  ["target-income", "Target Income Calculator", "freelancer"],
  ["price-package", "Price Package Builder", "freelancer"],
  ["quotation", "Quotation", "freelancer"],
  // Creator / Seller
  ["image-compressor", "Image Compressor", "creator-seller"],
  ["image-resizer", "Image Resizer", "creator-seller"],
  ["product-photo", "Product Photo Processor", "creator-seller"],
  ["mockup", "Mockup Generator", "creator-seller"],
  ["a4-layout", "A4 Layout", "creator-seller"],
  ["price-label", "Label Harga Generator", "creator-seller"],
  ["passport-photo", "Pas Foto Generator", "creator-seller"],
  ["jualankit", "JualanKit", "creator-seller"],
] as const;

// canonical shared tools live under both packages
const PACKAGE_TOOLS: Record<string, string[]> = {
  umkm: [
    "hpp",
    "selling-price",
    "profit-analyzer",
    "bep",
    "business-capital",
    "order-sheet",
    "po-manager",
    "invoice",
    "receipt",
    "delivery-note",
    "packing-list",
    "shipping-packaging",
  ],
  freelancer: ["freelancer-price", "project-cost", "target-income", "price-package", "quotation", "invoice", "receipt"],
  creator: ["image-compressor", "image-resizer", "product-photo", "mockup", "a4-layout", "price-label", "passport-photo", "jualankit"],
};

const PACKAGES = [
  { slug: "umkm", name: "Paket UMKM", description: "Kelola jualan, hitung harga, dan bereskan operasional.", price: 0, durationDays: 30 },
  { slug: "freelancer", name: "Paket Freelancer", description: "Tentukan harga, siapkan penawaran, dan bereskan project.", price: 0, durationDays: 30 },
  { slug: "creator", name: "Creator / Seller", description: "Olah foto dan siapkan materi jualan siap pakai.", price: 0, durationDays: 30 },
] as const;

export async function seed() {
  for (const [slug, name, category] of TOOL_SEED) {
    await db
      .insert(tools)
      .values({ slug, name, category, status: "active", description: name })
      .onConflictDoNothing({ target: tools.slug });
  }
  console.log(`tools: ${TOOL_SEED.length} upserted`);

  for (const p of PACKAGES) {
    await db
      .insert(packages)
      .values({ slug: p.slug, name: p.name, description: p.description, price: p.price, currency: "IDR", durationDays: p.durationDays, status: "active" })
      .onConflictDoNothing({ target: packages.slug });
  }
  console.log(`packages: ${PACKAGES.length} upserted`);

  const toolRows = await db.select({ id: tools.id, slug: tools.slug }).from(tools);
  const toolIdBySlug = new Map(toolRows.map((t) => [t.slug, t.id]));
  const packageRows = await db.select({ id: packages.id, slug: packages.slug }).from(packages);
  const packageIdBySlug = new Map(packageRows.map((p) => [p.slug, p.id]));

  let mappings = 0;
  for (const [pkgSlug, toolSlugs] of Object.entries(PACKAGE_TOOLS)) {
    const packageId = packageIdBySlug.get(pkgSlug);
    if (!packageId) continue;
    for (const toolSlug of toolSlugs) {
      const toolId = toolIdBySlug.get(toolSlug);
      if (!toolId) continue;
      await db
        .insert(packageTools)
        .values({ packageId, toolId })
        .onConflictDoNothing();
      mappings++;
    }
  }
  console.log(`package_tools: ${mappings} upserted`);
}

if (process.argv[1]?.replaceAll("\\", "/").endsWith("lib/db/seed.ts")) {
  seed()
    .then(() => {
      console.log("Seed selesai.");
      process.exit(0);
    })
    .catch((err) => {
      console.error("Seed gagal:", err);
      process.exit(1);
    });
}

