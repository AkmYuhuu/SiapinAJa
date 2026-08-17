export default function ToolLoading() {
  return (
    <div className="space-y-6" aria-label="Menyiapkan tool" role="status">
      <div className="h-4 w-36 animate-pulse rounded bg-surface-muted" />
      <div className="rounded-xl border border-border bg-surface p-6">
        <div className="mx-auto max-w-3xl space-y-4">
          <div className="h-7 w-64 animate-pulse rounded bg-surface-muted" />
          <div className="h-4 w-full max-w-xl animate-pulse rounded bg-surface-muted" />
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="h-12 animate-pulse rounded-lg bg-surface-muted" />
            <div className="h-12 animate-pulse rounded-lg bg-surface-muted" />
          </div>
          <div className="h-28 animate-pulse rounded-lg bg-surface-muted" />
        </div>
      </div>
      <span className="sr-only">Menyiapkan tool…</span>
    </div>
  );
}
