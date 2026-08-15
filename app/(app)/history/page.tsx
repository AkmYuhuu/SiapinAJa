"use client";

import { useEffect, useState } from "react";
import { getToolByRoute } from "@/lib/registry";
import { getToolHistory, clearHistory } from "@/lib/local-prefs";
import { ToolCard } from "@/components/tools/tool-card";
import { EmptyState } from "@/components/ui/empty";
import { Icon } from "@/components/icons";
import { Button } from "@/components/ui/button";

export default function HistoryPage() {
  const [ids, setIds] = useState<string[]>(() => getToolHistory());

  useEffect(() => {
    const onFocus = () => setIds(getToolHistory());
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, []);

  const tools = ids.map((id) => getToolByRoute(id)).filter((t): t is NonNullable<typeof t> => Boolean(t));

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-ink">Riwayat</h1>
          <p className="mt-1 text-sm text-ink-secondary">Tools yang baru saja kamu buka.</p>
        </div>
        {tools.length > 0 && (
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              clearHistory();
              setIds([]);
            }}
          >
            <Icon name="trash" className="size-3.5" />
            Bersihkan
          </Button>
        )}
      </header>

      {tools.length === 0 ? (
        <EmptyState icon={<Icon name="history" className="size-5" />} title="Riwayat kosong" description="Tools yang kamu buka akan muncul di sini." />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {tools.map((t) => (
            <ToolCard key={t.toolId} tool={t} />
          ))}
        </div>
      )}
    </div>
  );
}