import Link from "next/link";
import Image from "next/image";
import { CATEGORIES, TOOLS } from "@/lib/registry";
import { Icon } from "@/components/icons";
import { EarlyAccessNotice } from "@/components/landing/early-access-notice";
import { LegalFooter } from "@/components/legal/legal-footer";

export default function LandingPage() {
  return (
    <div className="relative flex min-h-screen flex-col">
      <EarlyAccessNotice />

      {/* top nav */}
      <header className="sticky top-0 z-20 border-b border-border bg-bg/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 lg:px-8">
          <Link href="/" className="flex items-center gap-2">
            <span className="flex size-8 items-center justify-center rounded-md bg-accent"><Icon name="tools" className="size-4 text-white" /></span>
            <span className="flex flex-col leading-tight"><span className="text-base font-bold tracking-tight text-ink">Siapin<span className="text-accent-strong">Aja</span></span><span className="text-[9px] font-semibold uppercase tracking-[0.12em] text-ink-faint">Early Access</span></span>
          </Link>
          <nav className="hidden items-center gap-6 text-sm text-ink-secondary md:flex"><a href="#kategori" className="hover:text-ink">Kategori</a><a href="#cara-kerja" className="hover:text-ink">Cara kerja</a><Link href="/pricing" prefetch={false} className="hover:text-ink">Harga</Link></nav>
          <div className="flex items-center gap-2"><Link href="/login" prefetch={false} className="hidden rounded-md px-3 py-2 text-sm font-medium text-ink hover:bg-surface-muted sm:block">Masuk</Link><Link href="/login" prefetch={false} className="rounded-md border border-accent bg-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-strong">Mulai Gratis</Link></div>
        </div>
      </header>

      <section className="mx-auto w-full max-w-6xl px-4 py-16 lg:px-8 lg:py-24"><div className="grid items-center gap-12 lg:grid-cols-2"><div><p className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-accent/30 bg-accent-soft px-3 py-1 text-xs font-medium text-accent-ink"><Icon name="spark" className="size-3.5" />Toolbox untuk freelancer & UMKM Indonesia</p><h1 className="text-4xl font-extrabold leading-tight tracking-tight text-ink lg:text-5xl">Siapin apa aja.</h1><p className="mt-4 max-w-md text-base leading-relaxed text-ink-secondary">Hitung harga, kelola order, buat dokumen, dan siapkan materi jualan - langsung di browser, dari HP atau laptop. Tidak perlu pindah aplikasi.</p><div className="mt-7 flex flex-wrap items-center gap-3"><Link href="/login" prefetch={false} className="rounded-md border border-accent bg-accent px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-accent-strong">Coba Sekarang</Link><Link href="/tools/umkm" className="rounded-md border border-border bg-surface px-5 py-3 text-sm font-semibold text-ink hover:bg-surface-muted">Lihat Tools</Link></div><p className="mt-4 text-xs text-ink-faint">100% diproses di browser - data kerja kamu tidak dikirim ke server.</p></div><div className="relative mx-auto w-full max-w-md lg:max-w-none"><Image src="/asset 1.png" alt="SiapinAja - alat kerja untuk UMKM dan freelancer" width={1536} height={1024} priority className="h-auto w-full" /></div></div></section>

      <section id="kategori" className="border-y border-border bg-surface"><div className="mx-auto max-w-6xl px-4 py-14 lg:px-8"><h2 className="text-2xl font-bold tracking-tight text-ink">Tiga kategori. Semua kebutuhan kerja.</h2><div className="mt-8 grid gap-4 md:grid-cols-3">{CATEGORIES.map((c) => <Link key={c.id} href={`/tools/${c.id}`} className="group rounded-lg border border-border bg-bg p-6 transition-colors hover:border-accent/50"><span className="flex size-10 items-center justify-center rounded-lg bg-accent-soft text-accent-strong"><Icon name={c.icon} className="size-5" /></span><h3 className="mt-4 text-lg font-bold text-ink">{c.name}</h3><p className="mt-1.5 text-sm leading-relaxed text-ink-secondary">{c.callout}</p><p className="mt-4 flex items-center gap-1 text-sm font-semibold text-accent-strong">Buka kategori<Icon name="chevron" className="size-3.5 transition-transform group-hover:translate-x-0.5" /></p></Link>)}</div></div></section>

      <section id="cara-kerja" className="mx-auto max-w-6xl px-4 py-14 lg:px-8"><h2 className="text-2xl font-bold tracking-tight text-ink">Buka tool. Isi data. Selesai.</h2><div className="mt-8 grid gap-4 md:grid-cols-3">{[{ icon: "search" as const, title: "1. Pilih tool", desc: "Dari HPP makanan sampai JualanKit - semua ada di satu tempat." },{ icon: "calculator" as const, title: "2. Isi datanya", desc: "Angka, bahan, atau foto produk. Semua diproses di browser." },{ icon: "download" as const, title: "3. Ambil hasilnya", desc: "Unduh PDF, PNG, atau ZIP langsung - siap print dan kirim." }].map((s) => <div key={s.title} className="rounded-lg border border-border bg-surface p-6"><span className="flex size-10 items-center justify-center rounded-lg bg-surface-muted text-ink-secondary"><Icon name={s.icon} className="size-5" /></span><h3 className="mt-4 font-bold text-ink">{s.title}</h3><p className="mt-1.5 text-sm leading-relaxed text-ink-secondary">{s.desc}</p></div>)}</div></section>

      <section className="border-t border-border bg-surface"><div className="mx-auto max-w-6xl px-4 py-14 lg:px-8"><h2 className="text-2xl font-bold tracking-tight text-ink">Tools yang benar-benar kepakai</h2><p className="mt-2 text-sm text-ink-secondary">{TOOLS.length} tools siap dipakai - contohnya ini:</p><div className="mt-8 grid gap-4 md:grid-cols-3">{["hpp", "invoice", "jualankit"].map((id) => { const t = TOOLS.find((x) => x.toolId === id); if (!t) return null; return <div key={id} className="overflow-hidden rounded-lg border border-border"><div className="border-b border-border bg-surface-muted px-4 py-3"><div className="flex items-center gap-2"><Icon name={t.icon} className="size-4 text-accent-strong" /><span className="text-sm font-semibold text-ink">{t.name}</span></div></div><div className="h-44 bg-bg p-4"><MockUI kind={id} /></div></div>; })}</div></div></section>

      <section className="mx-auto max-w-6xl px-4 py-16 text-center lg:px-8"><h2 className="text-3xl font-extrabold tracking-tight text-ink">Mulai siapin sekarang.</h2><p className="mx-auto mt-2 max-w-md text-sm text-ink-secondary">Gratis untuk coba semua tool. Data kamu ada di perangkatmu sendiri.</p><Link href="/login" prefetch={false} className="mt-6 inline-block rounded-md border border-accent bg-accent px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-accent-strong">Coba Sekarang</Link></section>

      <LegalFooter returnTo="/" />
    </div>
  );
}

function MockUI({ kind }: { kind: string }) {
  if (kind === "hpp") return <div className="flex h-full flex-col justify-center"><div className="rounded-md border border-border bg-surface p-3"><p className="text-[10px] font-semibold text-ink">Tepung</p><p className="mt-1 text-[10px] text-ink-secondary">500 gram · Rp14.000</p><p className="mt-2 text-[10px] font-semibold text-ink">Telur</p><p className="mt-1 text-[10px] text-ink-secondary">10 pcs · Rp20.000</p><div className="mt-3 flex items-center justify-between border-t border-border pt-2"><span className="text-[9px] text-ink-faint">Total batch</span><span className="text-xs font-bold tabular text-accent-strong">Rp61.000</span></div></div></div>;
  if (kind === "invoice") return <div className="flex h-full flex-col justify-center"><div className="mx-auto w-40 rounded-sm border border-border bg-surface p-3 shadow-sm"><div className="flex items-center justify-between"><p className="text-[9px] font-bold text-ink">INVOICE</p><p className="text-[8px] text-ink-faint">INV-2026-0001</p></div><div className="mt-2 space-y-1"><div className="h-1.5 w-full rounded bg-surface-muted" /><div className="h-1.5 w-3/4 rounded bg-surface-muted" /></div><div className="mt-2 flex justify-between border-t border-border pt-1.5 text-[9px]"><span className="text-ink-faint">Total</span><span className="font-bold tabular text-ink">Rp185.000</span></div></div></div>;
  return <div className="flex h-full flex-col justify-center"><div className="mx-auto flex max-w-xs flex-col items-center gap-2"><div className="flex gap-2"><div className="h-20 w-16 rounded border border-border bg-surface" /><div className="h-20 w-16 rounded border border-border bg-surface" /><div className="h-20 w-16 rounded border border-border bg-surface" /></div><p className="text-[10px] font-semibold text-ink">1 produk → semua materi jualan</p></div></div>;
}
