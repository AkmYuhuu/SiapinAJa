"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { LegalFooter } from "@/components/legal/legal-footer";

export default function TermsPage() {
  const params = useSearchParams();
  const rawReturnTo = params.get("returnTo") || "/";
  const returnTo = rawReturnTo.startsWith("/") ? rawReturnTo : "/";
  const privacyHref = `/privacy?returnTo=${encodeURIComponent(returnTo)}`;

  return (
    <div className="min-h-screen bg-bg text-ink">
      <header className="border-b border-border bg-surface">
        <div className="mx-auto flex h-16 max-w-4xl items-center justify-between px-4">
          <Link href={returnTo} className="text-sm font-semibold text-ink-secondary hover:text-ink">← Kembali</Link>
          <Link href="/" className="text-base font-bold tracking-tight text-ink">Siapin<span className="text-accent-strong">Aja</span></Link>
          <Link href={privacyHref} className="text-sm font-medium text-accent-strong hover:underline">Privasi</Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-10 lg:py-14">
        <p className="text-xs font-semibold uppercase tracking-wider text-accent-strong">Dokumen Legal</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight">Syarat & Ketentuan</h1>
        <p className="mt-2 text-sm text-ink-faint">Berlaku mulai 16 Agustus 2026</p>

        <div className="mt-8 space-y-8 text-sm leading-7 text-ink-secondary">
          <section><h2 className="font-semibold text-ink">1. Tentang SiapinAja</h2><p className="mt-2">SiapinAja adalah toolkit berbasis web untuk membantu pengguna mengerjakan kebutuhan praktis seperti perhitungan, dokumen, dan materi kerja. Layanan saat ini berada pada fase Early Access sehingga fitur, tampilan, alur, dan ketersediaan tool dapat berubah.</p></section>
          <section><h2 className="font-semibold text-ink">2. Akun dan keamanan</h2><p className="mt-2">Pengguna bertanggung jawab menjaga kredensial akun, menggunakan informasi yang benar, dan segera memberi tahu pengelola apabila menduga terjadi akses tidak sah. Satu akun tidak boleh digunakan untuk tindakan yang melanggar hukum atau mengganggu layanan.</p></section>
          <section><h2 className="font-semibold text-ink">3. Penggunaan layanan</h2><p className="mt-2">Layanan hanya boleh digunakan untuk tujuan yang sah. Dilarang menyalahgunakan, membebani, mencoba melewati kontrol akses, mengeksploitasi kerentanan, melakukan scraping berlebihan, atau menggunakan layanan untuk membuat, menyebarkan, atau memfasilitasi tindakan yang melanggar hukum.</p></section>
          <section><h2 className="font-semibold text-ink">4. Tool, hasil, dan tanggung jawab pengguna</h2><p className="mt-2">Hasil kalkulasi, dokumen, dan output lain adalah alat bantu dan tidak menggantikan penilaian profesional, kewajiban hukum, perpajakan, akuntansi, atau keputusan bisnis pengguna. Pengguna wajib memeriksa hasil sebelum digunakan untuk transaksi, keputusan keuangan, atau dokumen resmi.</p></section>
          <section><h2 className="font-semibold text-ink">5. Paket, akses, dan pembayaran</h2><p className="mt-2">Sebagian tool dapat memerlukan paket tertentu atau status entitlement aktif. Akses diberikan berdasarkan status yang tercatat di server. Untuk pembayaran atau aktivasi manual, bukti pembayaran dan kode aktivasi dapat digunakan sesuai prosedur yang ditetapkan pengelola. Kode aktivasi bersifat sekali pakai dan tunduk pada masa berlaku yang ditentukan.</p></section>
          <section><h2 className="font-semibold text-ink">6. Early Access</h2><p className="mt-2">Selama Early Access, layanan dapat mengalami bug, perubahan perilaku, downtime, penghapusan atau perubahan fitur, dan pembaruan berkala. Pengguna memahami bahwa versi Early Access belum menjamin ketersediaan atau kesempurnaan setiap fitur.</p></section>
          <section><h2 className="font-semibold text-ink">7. Kepemilikan dan konten pengguna</h2><p className="mt-2">Pengguna tetap bertanggung jawab atas data, teks, gambar, dan materi yang dimasukkan ke dalam tool. SiapinAja tidak mengambil kepemilikan atas materi pengguna hanya karena materi tersebut diproses melalui layanan, kecuali sejauh diperlukan untuk menjalankan fitur yang diminta pengguna.</p></section>
          <section><h2 className="font-semibold text-ink">8. Perubahan layanan dan ketentuan</h2><p className="mt-2">Ketentuan dapat diperbarui untuk menyesuaikan perubahan layanan, keamanan, atau kewajiban hukum. Versi terbaru akan dipublikasikan pada halaman ini dengan tanggal berlaku yang diperbarui.</p></section>
          <section><h2 className="font-semibold text-ink">9. Penghentian akses</h2><p className="mt-2">Pengelola dapat membatasi atau menghentikan akses yang digunakan untuk melanggar ketentuan, menyalahgunakan layanan, atau menimbulkan risiko keamanan. Pengguna dapat berhenti menggunakan layanan kapan saja.</p></section>
          <section><h2 className="font-semibold text-ink">10. Hubungi kami</h2><p className="mt-2">Untuk pertanyaan mengenai ketentuan ini, hubungi <a href="mailto:halo@siapinaja.id" className="font-medium text-accent-strong hover:underline">halo@siapinaja.id</a>.</p></section>
        </div>
      </main>
      <LegalFooter returnTo={returnTo} />
    </div>
  );
}
