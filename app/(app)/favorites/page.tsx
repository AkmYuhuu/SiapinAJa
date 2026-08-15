"use client";

import { useState } from "react";
import { getToolByRoute } from "@/lib/registry";
import { getFavorites, toggleFavorite } from "@/lib/local-prefs";
import { ToolCard } from "@/components/tools/tool-card";
import { EmptyState } from "@/components/ui/empty";
import { Icon } from "@/components/icons";

export default function FavoritesPage() {
  const [ids, setIds] = useState<string[]>(() => getFavorites());

  const favTools = ids.map((id) => getToolByRoute(id)).filter((t): t is NonNullable<typeof t> => Boolean(t));

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-xl font-bold text-ink">Favorit</h1>
        <p className="mt-1 text-sm text-ink-secondary">Tools yang kamu tandai sebagai favorit.</p>
      </header>

      {favTools.length === 0 ? (
        <EmptyState
          icon={<Icon name="star" className="size-5" />}
          title="Belum ada favorit"
          description="Tandai tools favoritmu lewat tombol bintang di halaman tool."
        />
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {favTools.map((t) => (
              <div key={t.toolId} className="relative">
                <ToolCard tool={t} />
                <IconButtonOnCard
                  onToggle={() => toggleFavorite(t.route)}
                  onRemoved={() => setIds(getFavorites())}
                />
              </div>
            ))}
          </div>
          <p className="text-[13px] text-ink-faint">{favTools.length} tool difavoritkan.</p>
        </>
      )}
    </div>
  );
}

function IconButtonOnCard({ onToggle, onRemoved }: { onToggle: () => boolean; onRemoved: () => void }) {
  const star = () => {
    onToggle();
    onRemoved();
  };
  return (
    <button
      onClick={star}
      aria-label="Hapus dari favorit"
      title="Hapus dari favorit"
      className="absolute right-2.5 top-2.5 flex size-7 items-center justify-center rounded text-warning hover:bg-warning-soft"
    >
      <svg className="size-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
        <path d="m12 3.5 2.6 5.3 5.9.9-4.2 4.1 1 5.8-5.3-2.8-5.3 2.8 1-5.8-4.2-4.1 5.9-.9L12 3.5Z" />
      </svg>
    </button>
  );
}