import Link from "next/link";

export function BrandMark({ className = "size-8" }: { className?: string }) {
  return <img src="/brand/siapinaja-logo.svg" alt="SiapinAja" className={`${className} object-contain`} />;
}

export function BrandWordmark({ className = "" }: { className?: string }) {
  return (
    <Link href="/dashboard" className={`flex items-center gap-2 ${className}`} aria-label="SiapinAja">
      <BrandMark className="size-8 shrink-0" />
      <span className="flex flex-col leading-tight">
        <span className="text-[15px] font-bold tracking-tight text-ink">
          Siapin<span className="text-accent-strong">Aja</span>
        </span>
        <span className="text-[8px] font-semibold uppercase tracking-[0.11em] text-ink-faint">Early Access</span>
      </span>
    </Link>
  );
}
