# SiapinAja

Toolkit berbasis web untuk UMKM, freelancer, dan creator/seller. Tool berjalan di browser, sedangkan autentikasi, entitlement, pembayaran, Early Access, dan support ditangani melalui Next.js API routes dan Supabase.

## Tech Stack

- Next.js 16 App Router + TypeScript + Turbopack
- Supabase Auth + PostgreSQL + RLS
- Drizzle ORM + Drizzle Kit untuk schema dan migration
- IndexedDB untuk project dan preferensi lokal
- jsPDF, ExcelJS, JSZip, html-to-image untuk fitur ekspor dan pengolahan file
- Tailwind CSS + komponen UI sendiri

## Struktur

```text
app/
  (app)/            Halaman utama aplikasi dan tools
  admin/            Dashboard admin dan support inbox
  api/              Route handler auth, account, admin, support, redeem, Early Access, webhook, dan cron
  login/            Halaman masuk
  register/         Halaman pendaftaran
  redeem/           Aktivasi kode
  terms/            Syarat & Ketentuan
  privacy/          Kebijakan Privasi
components/
  admin/            Komponen admin support dan redemption
  auth/             AuthProvider dan entitlement gate
  brand/            BrandMark bersama
  documents/        Workspace dan preview dokumen
  early-access/     UI Early Access
  landing/          Komponen landing page
  layout/           App shell dan sidebar
  support/          Support widget realtime
  tools/            Shell, registry UI, dan halaman setiap tool
  ui/               Komponen UI generik
lib/
  api/              API client dan type contract frontend
  auth/             Validasi auth tambahan
  db/               Drizzle connection, schema, relations, RLS, seed
  documents/        Model dan export dokumen
  supabase/         Client, server, proxy, dan service client
  *.ts              Registry, entitlement, storage lokal, kalkulasi, format, export, dan utilitas domain
public/
  brand/            Asset brand SiapinAja
  asset 1.png       Asset visual landing

drizzle/
  *.sql              Migration SQL
  meta/              Snapshot dan journal Drizzle
```

## Performance

Tool routes memakai lazy loading dan mematikan eager route prefetch pada kartu tool supaya browser tidak mengunduh banyak chunk tool sebelum dipilih. Halaman tool juga memiliki loading boundary lokal agar navigasi segera memberikan feedback visual ketika pemeriksaan akses server dan chunk tool masih berjalan.

## Scripts

```bash
npm run dev        # development server
npm run build      # production build
npm run typecheck  # tsc --noEmit
npm run lint       # eslint .
npm run db:generate
npm run db:migrate
npm run db:push
npm run db:seed
npm run db:rls
```

## Database

Supabase adalah source of truth untuk auth, profile, entitlement, subscription, Early Access, support, redemption code, dan webhook event. Migration yang menjadi source kontrol ada di `drizzle/`.

## Registry Tool

Daftar tool terpusat di `lib/registry.ts`. Identitas `toolId` harus konsisten dengan permission dan entitlement backend.

## Environment

Salin `.env.example` ke `.env.local`, lalu isi kredensial Supabase dan secret server-side. Jangan commit secret produksi.
