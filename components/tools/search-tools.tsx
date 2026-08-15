"use client";

import { useMemo, useState } from "react";
import { searchTools } from "@/lib/registry";
import { ToolCard } from "./tool-card";
import { Icon } from "@/components/icons";
import { EmptyState } from "@/components/ui/empty";

export function SearchTools({ autoFocus = false }: { autoFocus?: boolean }) {
  const [q, setQ] = useState("");

  const results = useMemo(() => searchTools(q), [q]);

  return (
    <div>
      <div className="relative">
        <Icon name="search" className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-ink-faint" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Cari tools…"
          autoFocus={autoFocus}
          aria-label="Cari tools"
          className="h-12 w-full rounded-lg border border-border bg-surface pl-10 pr-10 text-[15px] placeholder:text-ink-faint focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/25"
        />
        {q && (
          <button
            onClick={() => setQ("")}
            className="absolute right-3 top-1/2 flex size-6 -translate-y-1/2 items-center justify-center rounded text-ink-faint hover:text-ink"
            aria-label="Bersihkan pencarian"
          >
            <svg className="size-3.5" viewBox="0 0 16 16" fill="none" aria-hidden>
              <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        )}
      </div>
      {q && (
        <div className="mt-4">
          {results.length === 0 ? (
            <EmptyState compact title="Tidak ada tool yang cocok" description='Coba kata kunci lain, misalnya "harga" atau "foto".' />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {results.map((t) => (
                <ToolCard key={t.toolId} tool={t} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}