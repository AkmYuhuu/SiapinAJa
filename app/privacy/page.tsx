"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { LegalFooter } from "@/components/legal/legal-footer";

export default function PrivacyPage() {
  const params = useSearchParams();
  const rawReturnTo = params.get("returnTo") || "/";
  const returnTo = rawReturnTo.startsWith("/") ? rawReturnTo : "/";
  const termsHref = `/terms?returnTo=${encodeURIComponent(returnTo)}`;

  return (
    <div className="min-h-screen bg-bg text-ink">
      <header className="border-b border-border bg-surface">
        <div className="mx-auto flex h-16 max-w-4xl items-center justify-between px-4">
          <Link href={returnTo} className="text-sm font-semibold text-ink-secondary hover:text-ink">← Kembali</Link>
          <Link href="/" className="text-base font-bold tracking-tight text-ink">Siapin<span className="text-accent-strong">Aja</span></Link>
          <Link href={termsHref} className="text-sm font-medium text-accent-strong hover:underline">Syarat & Ketentuan</Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-10 lg:py-14">
        <p className="text-xs font-semibold uppercase tracking-wider text-accent-strong">Dokumen Legal</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight">Kebijakan Privasi</h1>
        <p className="mt-2 text-sm text-ink-faint">Berlaku mulai 16 Agustus 2026</p>

        <div className="mt-8 space-y-8 text-sm leading-7 text-ink-secondary">
          <section><h2 className="font-semibold text-ink">1. Ruang lingkup</h2><p className="mt-2">Kebijakan ini menjelaskan data apa yang diproses saat kamu menggunakan SiapinAja, mengapa data tersebut digunakan, bagaimana data dilindungi, serta pilihan dan hak yang tersedia bagi kamu.</p></section>
          <section><h2 className="font-semibold text-ink">2. Data yang dapat kami proses</h2><p className="mt-2">Untuk akun, kami dapat memproses nama, alamat email, identitas akun, status autentikasi, informasi paket dan entitlement, serta catatan yang diperlukan untuk keamanan dan administrasi layanan. Saat pembayaran atau aktivasi manual digunakan, informasi transaksi yang relevan juga dapat diproses.</p></section>
          <section><h2 className="font-semibold text-ink">3. Data kerja dan project</h2><p className="mt-2">Banyak tool SiapinAja memproses data kerja langsung di browser dan menyimpan project pada perangkat pengguna. Jangan memasukkan data yang tidak perlu atau data sangat sensitif ke dalam tool. Fitur tertentu dapat berkomunikasi dengan server ketika diperlukan untuk autentikasi, entitlement, keamanan, atau layanan yang memang membutuhkan koneksi.</p></section>
          <section><h2 className="font-semibold text-ink">4. Tujuan pemrosesan</h2><p className="mt-2">Data digunakan untuk membuat dan menjaga akun, mengautentikasi pengguna, mengatur akses tool dan paket, mencegah penyalahgunaan, menjaga keamanan, menyediakan dukungan, memproses administrasi transaksi, memenuhi kewajiban hukum, dan meningkatkan keandalan layanan.</p></section>
          <section><h2 className="font-semibold text-ink">5. Dasar pemrosesan</h2><p className="mt-2">Bergantung pada konteks, pemrosesan dapat didasarkan pada persetujuan pengguna, kebutuhan untuk menjalankan perjanjian atau permintaan pengguna, kewajiban hukum, kepentingan yang sah, atau dasar lain yang diperbolehkan oleh hukum yang berlaku.</p></section>
          <section><h2 className="font-semibold text-ink">6. Penyedia layanan</h2><p className="mt-2">SiapinAja dapat menggunakan penyedia infrastruktur dan layanan pihak ketiga untuk hosting, autentikasi, database, keamanan, email, analitik, atau pembayaran. Penyedia tersebut hanya diberi akses sesuai kebutuhan layanan dan ketentuan mereka masing-masing. Untuk transaksi melalui pihak ketiga, pemrosesan data juga tunduk pada kebijakan privasi penyedia tersebut.</p></section>
          <section><h2 className="font-semibold text-ink">7. Penyimpanan dan retensi</h2><p className="mt-2">Data disimpan selama diperlukan untuk tujuan pemrosesan, keamanan, administrasi akun, penyelesaian sengketa, dan kewajiban hukum. Data kerja yang tersimpan lokal berada di perangkatmu dan dapat dihapus melalui perangkat atau browser. Data akun dan catatan server dapat memiliki masa retensi berbeda sesuai kebutuhan layanan dan kewajiban yang berlaku.</p></section>
          <section><h2 className="font-semibold text-ink">8. Keamanan</h2><p className="mt-2">Kami menerapkan langkah teknis dan organisatoris yang wajar untuk mencegah akses, penggunaan, perubahan, pengungkapan, atau penghapusan yang tidak sah. Tidak ada sistem internet yang dapat dijamin 100% aman, sehingga pengguna juga wajib menjaga kredensial dan perangkatnya.</p></section>
          <section><h2 className="font-semibold text-ink">9. Hak pengguna</h2><p className="mt-2">Sesuai hukum yang berlaku, pengguna dapat memiliki hak untuk memperoleh informasi tentang pemrosesan, mengakses dan memperbaiki data, meminta pembatasan atau penghapusan dalam kondisi tertentu, menarik kembali persetujuan, serta menggunakan hak lain yang relevan. Permintaan dapat diajukan melalui <a href="mailto:halo@siapinaja.id" className="font-medium text-accent-strong hover:underline">halo@siapinaja.id</a>.</p></section>
          <section><h2 className="font-semibold text-ink">10. Perubahan kebijakan</h2><p className="mt-2">Kebijakan ini dapat diperbarui ketika layanan, praktik pemrosesan, atau ketentuan hukum berubah. Versi terbaru akan dipublikasikan pada halaman ini beserta tanggal berlakunya.</p></section>
          <section><h2 className="font-semibold text-ink">11. Kontak</h2><p className="mt-2">Pertanyaan atau permintaan terkait privasi dapat dikirim ke <a href="mailto:halo@siapinaja.id" className="font-medium text-accent-strong hover:underline">halo@siapinaja.id</a>.</p></section>
        </div>
      </main>
      <LegalFooter returnTo={returnTo} />
    </div>
  );
}
