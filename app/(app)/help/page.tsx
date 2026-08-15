import Link from "next/link";
import { CATEGORIES } from "@/lib/registry";
import { Icon } from "@/components/icons";

const FAQ = [
  {
    q: "Apakah data saya aman?",
    a: "Ya. Semua project tersimpan lokal di perangkatmu (IndexedDB), tidak dikirim ke server. Kamu bisa mengekspor project sebagai file JSON kapan saja untuk cadangan atau dipindah ke perangkat lain.",
  },
  {
    q: "Bagaimana cara menyimpan project?",
    a: "Setiap tool dengan project punya tombol Simpan. Setelah tersimpan, project muncul di halaman Proyek Saya. Di sana kamu bisa membuka, menduplikasi, mengganti nama, mengekspor, atau menghapus project.",
  },
  {
    q: "Kenapa ada tool yang terkunci saat offline?",
    a: "Tool premium hanya bisa dibuka saat koneksi ke internet aktif, karena status paket diverifikasi lewat jaringan. Saat offline, tool premium tetap terkunci demi keamanan - tool lain yang tidak butuh verifikasi tetap bisa dipakai.",
  },
  {
    q: "Bagaimana cara memindahkan project ke perangkat lain?",
    a: "Di Proyek Saya, gunakan tombol Export JSON untuk tiap project. Pindahkan file-nya, lalu di perangkat tujuan buka tool yang sama dan gunakan Import JSON.",
  },
  {
    q: "Apakah bisa mengubah paket?",
    a: "Buka halaman Paket & Billing untuk melihat paket yang tersedia. Paket aktif (UMKM, Freelancer, Creator, atau All) menentukan tools mana saja yang bisa kamu akses.",
  },
  {
    q: "Kenapa hasil perhitungan bisa berbeda dari kalkulator biasa?",
    a: "Semua perhitungan uang memakai pembulatan Rupiah yang konsisten. Fee marketplace dihitung dari harga jual, bukan dari modal - jadi urutan perhitungan dibuat sejelas mungkin di setiap breakdown.",
  },
];

export default function HelpPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-10">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-ink">Pusat Bantuan</h1>
        <p className="mt-1 text-sm text-ink-secondary">
          Jawaban untuk pertanyaan umum seputar data, project, dan paket SiapinAja.
        </p>
      </header>

      <section>
        <h2 className="mb-3 text-[13px] font-semibold uppercase tracking-wide text-ink-secondary">Mulai dari sini</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          {CATEGORIES.map((c) => (
            <Link
              key={c.id}
              href={`/tools/${c.id}`}
              className="group rounded-lg border border-border bg-surface p-4 transition-colors hover:border-accent/50 hover:bg-accent-soft/40"
            >
              <span className="flex size-9 items-center justify-center rounded-lg bg-accent-soft text-accent-strong">
                <Icon name={c.icon} className="size-5" />
              </span>
              <h3 className="mt-3 font-semibold text-ink">{c.name}</h3>
              <p className="mt-0.5 text-[12px] leading-relaxed text-ink-secondary">{c.callout}</p>
            </Link>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-[13px] font-semibold uppercase tracking-wide text-ink-secondary">Tanya Jawab</h2>
        <div className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-surface">
          {FAQ.map((item) => (
            <details key={item.q} className="group px-4 py-3.5">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-[15px] font-semibold text-ink">
                {item.q}
                <Icon name="chevron" className="size-4 shrink-0 rotate-90 text-ink-faint transition-transform group-open:rotate-180" />
              </summary>
              <p className="mt-2 text-[13px] leading-relaxed text-ink-secondary">{item.a}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="rounded-lg border border-border bg-surface p-5">
        <h2 className="text-[13px] font-semibold uppercase tracking-wide text-ink-secondary">Masih bingung?</h2>
        <p className="mt-1 text-sm text-ink-secondary">
          Sampaikan pertanyaanmu lewat email, kami bantu secepatnya.
        </p>
        <a
          href="mailto:halo@siapinaja.id"
          className="mt-3 inline-flex items-center gap-2 rounded-md bg-accent px-4 py-2 text-[13px] font-semibold text-white hover:bg-accent-strong"
        >
          <Icon name="help" className="size-4" />
          halo@siapinaja.id
        </a>
      </section>
    </div>
  );
}
