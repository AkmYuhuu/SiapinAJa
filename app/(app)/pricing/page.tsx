"use client";

import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/auth-provider";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/icons";

const PLANS = [
  {
    id: "umkm",
    name: "Paket UMKM",
    icon: "store" as const,
    price: "Rp49.000",
    period: "/bulan",
    desc: "Untuk yang jualan: harga, order, dan dokumen operasional.",
    features: ["12 tools UMKM", "Invoice & kwitansi PDF", "Order Sheet & PO Manager", "Export & import JSON project"],
    highlight: false,
  },
  {
    id: "freelancer",
    name: "Paket Freelancer",
    icon: "briefcase" as const,
    price: "Rp49.000",
    period: "/bulan",
    desc: "Untuk yang menawarkan jasa: tarif dan dokumen penawaran.",
    features: ["7 tools freelancer", "Price Package Builder", "Quotation & invoice jasa", "Milestone & DP tracking"],
    highlight: false,
  },
  {
    id: "creator",
    name: "Paket Creator",
    icon: "camera" as const,
    price: "Rp49.000",
    period: "/bulan",
    desc: "Untuk seller & creator: foto produk dan materi jualan.",
    features: ["8 tools creator/seller", "Image batch processor", "Label harga & pas foto", "JualanKit - 1 produk semua materi"],
    highlight: false,
  },
  {
    id: "all",
    name: "Paket Semua",
    icon: "spark" as const,
    price: "Rp99.000",
    period: "/bulan",
    desc: "Semua tools, semua kategori. Cocok buat yang serba bisa.",
    features: ["Semua 27 tools", "Semua paket di atas", "Prioritas pembaruan fitur", "Dukungan email lebih cepat"],
    highlight: true,
  },
];

export default function PricingPage() {
  const { session } = useAuth();
  const router = useRouter();

  return (
    <div className="space-y-8">
      <header className="max-w-2xl">
        <h1 className="text-2xl font-bold tracking-tight text-ink">Paket & Billing</h1>
        <p className="mt-2 text-sm leading-relaxed text-ink-secondary">
          Satu akun, semua data kerja di perangkatmu. Pilih paket untuk membuka tools terkunci.
        </p>
      </header>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {PLANS.map((p) => (
          <div
            key={p.id}
            className={`relative flex flex-col rounded-lg border bg-surface p-5 ${
              p.highlight ? "border-accent shadow-[0_8px_24px_rgba(232,98,12,0.15)]" : "border-border"
            }`}
          >
            {p.highlight && (
              <span className="absolute -top-2.5 left-4 rounded-full bg-accent px-2.5 py-0.5 text-[11px] font-semibold text-white">
                Paling lengkap
              </span>
            )}
            <span className="flex size-9 items-center justify-center rounded-lg bg-accent-soft text-accent-strong">
              <Icon name={p.icon} className="size-4.5" />
            </span>
            <h2 className="mt-3 font-bold text-ink">{p.name}</h2>
            <p className="mt-0.5 text-[12px] leading-relaxed text-ink-secondary">{p.desc}</p>
            <p className="mt-4">
              <span className="text-2xl font-extrabold tabular text-ink">{p.price}</span>
              <span className="text-[13px] text-ink-faint">{p.period}</span>
            </p>
            <ul className="mt-4 flex-1 space-y-2">
              {p.features.map((f) => (
                <li key={f} className="flex items-start gap-2 text-[13px] text-ink-secondary">
                  <Icon name="check" className="mt-0.5 size-3.5 shrink-0 text-success" />
                  {f}
                </li>
              ))}
            </ul>
            <div className="mt-5">
              {session ? (
                <Button className="w-full" variant={p.highlight ? "primary" : "secondary"}>
                  Aktifkan Paket
                </Button>
              ) : (
                <Button className="w-full" variant={p.highlight ? "primary" : "secondary"} onClick={() => router.push("/login")}>
                  Masuk untuk Mengaktifkan
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-lg border border-border bg-surface p-5 text-sm text-ink-secondary">
        <p className="font-semibold text-ink">Catatan penting</p>
        <p className="mt-1.5 leading-relaxed">
          Status pembayaran dan masa aktif selalu diverifikasi ke server. Tidak ada cara lain untuk membuka
          tools premium - perangkatmu tidak pernah menjadi sumber kebenaran status berlangganan.
        </p>
        <p className="mt-2 leading-relaxed">
          Harga paket di atas belum termasuk pajak. Sesuai ketentuan pajak di Indonesia tahun ini, tarif PPN
          sebesar 12% berlaku atas layanan digital dan ditambahkan saat pembayaran.
        </p>
      </div>
    </div>
  );
}