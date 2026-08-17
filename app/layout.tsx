import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";
import { EntryLoading } from "@/components/ui/entry-loading";
import { PageTransition } from "@/components/ui/page-transition";

const plusJakarta = Plus_Jakarta_Sans({
  variable: "--font-plus-jakarta",
  subsets: ["latin"],
  display: "swap",
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "SiapinAja - Siapin apa aja.",
  description:
    "Toolbox untuk freelancer dan UMKM Indonesia: hitung harga, kelola order, buat dokumen, dan siapkan materi jualan.",
  icons: {
    icon: "/brand/siapinaja-logo.svg",
    shortcut: "/brand/siapinaja-logo.svg",
    apple: "/brand/siapinaja-logo.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="id"
      className={`${plusJakarta.variable} ${inter.variable} h-full antialiased`}
    >
      <body className="min-h-full">
        <Providers>
          <EntryLoading />
          <PageTransition>{children}</PageTransition>
        </Providers>
      </body>
    </html>
  );
}
