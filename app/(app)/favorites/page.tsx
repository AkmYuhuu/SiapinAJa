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

  const refresh = () => setIds(getFavorites());

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
              <div key={t.route} onClick={refresh}>
                <ToolCard tool={t} />
              </div>
            ))}
          </div>
          <p className="text-[13px] text-ink-faint">{favTools.length} tool difavoritkan.</p>
        </>
      )}
    </div>
  );
}