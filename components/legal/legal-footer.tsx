import Link from "next/link";

export function LegalFooter({ returnTo = "/" }: { returnTo?: string }) {
  const safeReturnTo = returnTo.startsWith("/") ? returnTo : "/";
  const params = `?returnTo=${encodeURIComponent(safeReturnTo)}`;

  return (
    <footer className="border-t border-border">
      <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-5 text-xs text-ink-faint sm:flex-row sm:items-center sm:justify-between lg:px-8">
        <p>© 2026 SiapinAja. Semua hak dilindungi.</p>
        <nav className="flex flex-wrap items-center gap-x-4 gap-y-1">
          <Link href={`/terms${params}`} className="hover:text-ink-secondary hover:underline">
            Syarat & Ketentuan
          </Link>
          <Link href={`/privacy${params}`} className="hover:text-ink-secondary hover:underline">
            Kebijakan Privasi
          </Link>
        </nav>
      </div>
    </footer>
  );
}
