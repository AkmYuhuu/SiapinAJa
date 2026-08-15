# SiapinAja

Toolkit berbasis web untuk UMKM, freelancer, dan creator/seller. Semua tool berjalan 100% di browser (client-side), hasil kerja tersimpan di perangkat (IndexedDB), dan bisa diekspor sebagai file JSON untuk dipindahkan atau diimpor kembali.

## Tech Stack

- Next.js 16 (App Router) + TypeScript + Turbopack
- IndexedDB (proyek, prefs) via `lib/db.ts` & `lib/projects.ts`
- jsPDF / html2canvas untuk ekspor PDF dan gambar
- Antarmuka: Tailwind CSS, komponen sendiri di `components/ui`

## Struktur

```
app/(app)/          Halaman aplikasi (dashboard, tools, projects, favorit, riwayat)
components/tools    UI shell + halaman tool per kategori (umkm, freelancer, creator-seller)
lib/                Registry tool, storage proyek, logika kalkulasi, ekspor
lib/api/            Klien API & mock untuk sesi/entitlement (pratinjau backend)
```

## Scripts

```bash
npm run dev        # development server (http://localhost:3000)
npm run build      # production build
npm run typecheck  # tsc --noEmit
npm run lint       # eslint .
```

## Registry Tool

Daftar tool (id, kategori, rute) terpusat di `lib/registry.ts`. `tool_id` di sini harus sama persis dengan registry backend (`Backend_v3.md`) — rute URL tidak boleh berubah, sedangkan `toolId` menjadi identitas permission/entitlement.

## Environment

Salin `.env.example` menjadi `.env` saat mengisi variabel backend (Supabase, payment webhook). Tanpa env, app berjalan dalam mode pratinjau dengan mock API.
