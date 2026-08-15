"use client";

import { DocModel, docTotals } from "@/lib/documents/model";
import { docKindTitle } from "@/lib/documents/pdf";
import { formatCurrency } from "@/lib/format";
import { terbilangRupiah } from "@/lib/terbilang";

/** HTML preview of the shared document model - looks like the printed PDF. */
export function DocPreview({ model }: { model: DocModel }) {
  const totals = docTotals(model);
  const kind = model.$kind;

  return (
    <div className="doc-page border border-border shadow-[0_8px_24px_rgba(43,40,35,0.08)]">
      {/* header */}
      <div className="flex items-start justify-between gap-6">
        <div className="flex items-center gap-3">
          {model.business.logo && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={model.business.logo} alt="Logo" className="h-12 w-12 rounded object-contain" />
          )}
          <div>
            <p className="text-[16px] font-bold" style={{ fontFamily: "var(--font-plus-jakarta)" }}>
              {model.business.name || "Bisnis Saya"}
            </p>
            {model.business.address && <p className="text-[10px] text-[#6f6a5e]">{model.business.address}</p>}
            {model.business.phone || model.business.email ? (
              <p className="text-[10px] text-[#6f6a5e]">
                {[model.business.phone, model.business.email].filter(Boolean).join(" • ")}
              </p>
            ) : null}
          </div>
        </div>
        <div className="text-right">
          <p className="text-[15px] font-bold tracking-wide" style={{ fontFamily: "var(--font-plus-jakarta)" }}>
            {docKindTitle(kind)}
          </p>
          <p className="text-[11px] text-[#6f6a5e]">{model.number}</p>
          <p className="mt-1 text-[10px]">
            Tanggal: <span className="font-medium">{model.date || "-"}</span>
            {model.dueDate && (
              <>
                <br />
                {kind === "quotation" ? "Berlaku s/d" : "Jatuh tempo"}:{" "}
                <span className="font-medium">{model.dueDate}</span>
              </>
            )}
          </p>
          {model.status && model.status !== "draft" && (
            <p
              className={`mt-2 inline-block rounded border px-1.5 py-0.5 text-[9px] font-semibold uppercase ${
                model.status === "paid"
                  ? "border-[#2f7d4f]/30 bg-[#e7f3ec] text-[#2f7d4f]"
                  : model.status === "overdue"
                    ? "border-[#bf3e30]/30 bg-[#fbeae7] text-[#bf3e30]"
                    : "border-[#e3e0d8] bg-[#f1efe9] text-[#6f6a5e]"
              }`}
            >
              {statusText(model.status)}
            </p>
          )}
        </div>
      </div>

      <div className="mt-5 border-t-2 border-[#e8620c]" />

      {kind === "kwitansi" ? (
        <KwitansiBody model={model} totals={totals} />
      ) : kind === "surat-jalan" ? (
        <SuratJalanBody model={model} />
      ) : kind === "packing-list" ? (
        <PackingListBody model={model} />
      ) : kind === "price-list" ? (
        <PriceListBody model={model} />
      ) : (
        <InvoiceLikeBody model={model} totals={totals} />
      )}

      {model.footer && <p className="mt-6 border-t border-[#e3e0d8] pt-2 text-[8.5px] text-[#9a9488]">{model.footer}</p>}
    </div>
  );
}

function statusText(s: DocModel["status"]): string {
  return s === "draft" ? "Draft" : s === "sent" ? "Dikirim" : s === "paid" ? "Lunas" : "Jatuh tempo";
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-1.5 mt-4 text-[9px] font-bold uppercase tracking-wider text-[#e8620c]">{children}</p>
  );
}

function ItemsTable({
  model,
  includePrice,
  includeAmount,
  packed,
}: {
  model: DocModel;
  includePrice: boolean;
  includeAmount: boolean;
  packed?: boolean;
}) {
  return (
    <table className="w-full border-collapse text-[10px]">
      <thead>
        <tr className="bg-[#f7f5f0] text-[#6f6a5e]">
          {packed && <th className="w-8 px-1.5 py-1.5 text-left font-bold">OK</th>}
          <th className="px-1.5 py-1.5 text-left font-bold">Deskripsi</th>
          <th className="w-16 px-1.5 py-1.5 text-right font-bold">Qty</th>
          {includePrice && <th className="w-24 px-1.5 py-1.5 text-right font-bold">Harga</th>}
          {includeAmount && <th className="w-28 px-1.5 py-1.5 text-right font-bold">Jumlah</th>}
        </tr>
      </thead>
      <tbody>
        {(model.lines ?? []).map((line) => (
          <tr key={line.id} className="border-b border-[#e3e0d8] align-top">
            {packed && (
              <td className="px-1.5 py-1.5">
                <span className={`inline-flex size-3.5 items-center justify-center border ${model.packed?.[line.id] ? "border-[#e8620c] bg-[#e8620c] text-white" : "border-[#cfcac0]"}`}>
                  {model.packed?.[line.id] && (
                    <svg viewBox="0 0 12 12" className="size-2.5" fill="none" aria-hidden>
                      <path d="M2 6.5L4.5 9L10 3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                    </svg>
                  )}
                </span>
              </td>
            )}
            <td className="px-1.5 py-1.5">
              <p className="font-medium text-[#2b2823]">{line.name || "-"}</p>
              {line.description && <p className="text-[9px] text-[#6f6a5e]">{line.description}</p>}
            </td>
            <td className="px-1.5 py-1.5 text-right tabular">{line.qty}</td>
            {includePrice && <td className="px-1.5 py-1.5 text-right tabular">{formatCurrency(line.price)}</td>}
            {includeAmount && <td className="px-1.5 py-1.5 text-right font-semibold tabular">{formatCurrency(line.qty * line.price)}</td>}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function TotalsBlock({
  totals,
  taxLabel,
  taxPct,
}: {
  totals: ReturnType<typeof docTotals>;
  taxLabel: string;
  taxPct: number;
}) {
  const rows: Array<{ label: string; value: string; strong?: boolean }> = [
    { label: "Subtotal", value: formatCurrency(totals.subtotal) },
  ];
  if (totals.discount > 0) rows.push({ label: "Diskon", value: `-${formatCurrency(totals.discount)}` });
  if (taxPct > 0) rows.push({ label: `${taxLabel || "Pajak"} (${taxPct}%)`, value: formatCurrency(totals.tax) });
  if (totals.shipping > 0) rows.push({ label: "Ongkir", value: formatCurrency(totals.shipping) });
  return (
    <div className="ml-auto w-64 space-y-1 text-[10px]">
      {rows.map((r) => (
        <div key={r.label} className="flex justify-between text-[#6f6a5e]">
          <span>{r.label}</span>
          <span className="tabular">{r.value}</span>
        </div>
      ))}
      <div className="flex justify-between border-t-2 border-[#e8620c] pt-1.5 text-[12px] font-bold text-[#2b2823]">
        <span>Total</span>
        <span className="tabular">{formatCurrency(totals.total)}</span>
      </div>
    </div>
  );
}

function InvoiceLikeBody({ model, totals }: { model: DocModel; totals: ReturnType<typeof docTotals> }) {
  return (
    <>
      <div className="mt-1">
        <p className="text-[9px] font-bold uppercase tracking-wider text-[#e8620c]">Kepada</p>
        <p className="text-[12px] font-semibold">{model.customer.company ? `${model.customer.company} (${model.customer.name})` : model.customer.name || "-"}</p>
        {model.customer.address && <p className="text-[9.5px] text-[#6f6a5e]">{model.customer.address}</p>}
        {model.customer.phone || model.customer.email ? (
          <p className="text-[9.5px] text-[#6f6a5e]">{[model.customer.phone, model.customer.email].filter(Boolean).join(" • ")}</p>
        ) : null}
      </div>
      <SectionLabel>Rincian</SectionLabel>
      <ItemsTable model={model} includePrice includeAmount />
      <div className="mt-3">
        <TotalsBlock totals={totals} taxLabel={model.taxLabel} taxPct={model.taxPct} />
      </div>

      {typeof model.dp === "number" && model.dp > 0 && (
        <>
          <SectionLabel>Pembayaran</SectionLabel>
          <div className="grid grid-cols-2 gap-3 text-[10px]">
            <div className="rounded border border-[#e3e0d8] bg-[#f7f5f0] px-2.5 py-2">
              <p className="text-[#6f6a5e]">DP diterima</p>
              <p className="mt-0.5 text-[12px] font-bold tabular text-[#2b2823]">{formatCurrency(model.dp)}</p>
            </div>
            <div className="rounded border border-[#e8620c] bg-[#fdf6ee] px-2.5 py-2">
              <p className="text-[#6f6a5e]">Sisa pembayaran</p>
              <p className="mt-0.5 text-[12px] font-bold tabular text-[#e8620c]">
                {formatCurrency(Math.max(0, totals.total - model.dp))}
              </p>
            </div>
          </div>
        </>
      )}

      {(model.paymentMethod || model.business.paymentInfo) && (
        <>
          <SectionLabel>Info pembayaran</SectionLabel>
          <div className="space-y-1 text-[10px] text-[#6f6a5e]">
            {model.paymentMethod && (
              <p>
                Metode: <span className="text-[#2b2823]">{model.paymentMethod}</span>
              </p>
            )}
            {model.business.paymentInfo && (
              <p>
                Rekening: <span className="text-[#2b2823]">{model.business.paymentInfo}</span>
              </p>
            )}
          </div>
        </>
      )}
      {model.note && (
        <>
          <SectionLabel>Catatan</SectionLabel>
          <p className="text-[10px] text-[#6f6a5e]">{model.note}</p>
        </>
      )}
      {model.signatures && model.signatures.length > 0 && (
        <div className="mt-14 grid grid-cols-2 gap-8 text-[10px]">
          {model.signatures.map((sig, i) => (
            <div key={i} className="text-center">
              <div className="h-14 border-b border-[#9a9488]" />
              <p className="mt-1.5">{sig.name || "…"}</p>
              <p className="text-[#9a9488]">{sig.label}</p>
            </div>
          ))}
        </div>
      )}
      {model.terms && (
        <>
          <SectionLabel>Ketentuan</SectionLabel>
          <p className="whitespace-pre-line text-[10px] text-[#6f6a5e]">{model.terms}</p>
        </>
      )}
    </>
  );
}

function KwitansiBody({ model, totals }: { model: DocModel; totals: ReturnType<typeof docTotals> }) {
  const payer = model.customer;
  const rows: Array<[string, string]> = [
    ["Telah diterima dari", model.receivedFrom || model.customer.name || "-"],
    ["Untuk pembayaran", model.forPayment || "-"],
    ["Metode pembayaran", model.paymentMethod || "-"],
    ["Keterangan jasa", model.lines[0]?.name || "-"],
    ["Tanggal", model.date || "-"],
  ];
  return (
    <>
      <div className="mt-1">
        <p className="text-[9px] font-bold uppercase tracking-wider text-[#e8620c]">Pemberi pembayaran</p>
        <p className="text-[12px] font-semibold">
          {payer.company ? `${payer.company} (${payer.name})` : payer.name || "-"}
        </p>
        {payer.address && <p className="text-[9.5px] text-[#6f6a5e]">{payer.address}</p>}
        {payer.phone || payer.email ? (
          <p className="text-[9.5px] text-[#6f6a5e]">{[payer.phone, payer.email].filter(Boolean).join(" • ")}</p>
        ) : null}
      </div>
      <div className="mt-3 space-y-2 text-[11px]">
        {rows.map(([k, v]) => (
          <div key={k} className="flex gap-4">
            <span className="w-36 shrink-0 text-[#6f6a5e]">{k}</span>
            <span className="font-medium">{v || "-"}</span>
          </div>
        ))}
      </div>
      <div className="mt-4 rounded border-2 border-[#e8620c] bg-[#f7f5f0] px-3 py-2.5">
        <p className="text-[13px] font-bold text-[#e8620c]">Jumlah pembayaran: {formatCurrency(totals.total)}</p>
      </div>
      <SectionLabel>Terbilang</SectionLabel>
      <p className="font-semibold uppercase tracking-wide">{terbilangRupiah(totals.total)}</p>
      <div className="mt-2 border-b border-[#e3e0d8]" />
      {model.note && <p className="mt-3 text-[10px] text-[#6f6a5e]">Catatan: {model.note}</p>}
      <div className="mt-20 flex justify-end">
        <div className="w-56 text-center text-[10px]">
          <p className="mb-14 border-b border-[#9a9488]" />
          <p className="font-semibold">{model.business.name || "…"}</p>
          <p className="text-[#9a9488]">Penerima</p>
        </div>
      </div>
    </>
  );
}

function SuratJalanBody({ model }: { model: DocModel }) {
  const rows: Array<[string, string]> = [
    ["Pengirim", model.shipper || model.business.name || "-"],
    ["Penerima", model.customer.name || "-"],
    ["Alamat tujuan", model.customer.address || "-"],
    ["Kendaraan / kurir", model.vehicle || "-"],
    ["No. order", model.orderNumber || "-"],
  ];
  return (
    <>
      <div className="mt-3 grid grid-cols-2 gap-x-8 gap-y-3 text-[11px]">
        {rows.map(([k, v]) => (
          <div key={k}>
            <p className="text-[9px] font-semibold uppercase text-[#6f6a5e]">{k}</p>
            <p className="font-medium">{v || "-"}</p>
          </div>
        ))}
      </div>
      <SectionLabel>Daftar Barang</SectionLabel>
      <ItemsTable model={model} includePrice={false} includeAmount={false} />
      {model.note && <p className="mt-2 text-[10px] text-[#6f6a5e]">Catatan: {model.note}</p>}
      {model.signatures && model.signatures.length >= 2 && (
        <div className="mt-16 grid grid-cols-2 gap-8 text-[10px]">
          {model.signatures.slice(0, 2).map((sig, i) => (
            <div key={i} className="text-center">
              <div className="h-14 border-b border-[#9a9488]" />
              <p className="mt-1.5">{sig.name || "…"}</p>
              <p className="text-[#9a9488]">{sig.label}</p>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

function PackingListBody({ model }: { model: DocModel }) {
  return (
    <>
      <div className="mt-3 grid grid-cols-2 gap-x-8 gap-y-1 text-[11px]">
        <p>No. order: <span className="font-medium">{model.orderNumber || "-"}</span></p>
        <p>Customer: <span className="font-medium">{model.customer.name || "-"}</span></p>
      </div>
      <SectionLabel>Checklist Packing</SectionLabel>
      <ItemsTable model={model} includePrice={false} includeAmount={false} packed />
      {model.note && <p className="mt-2 text-[10px] text-[#6f6a5e]">Catatan: {model.note}</p>}
      {model.signatures && model.signatures.length === 1 && (
        <div className="mt-16 w-72 text-center text-[10px]">
          <div className="h-14 border-b border-[#9a9488]" />
          <p className="mt-1.5">{model.signatures[0].name || "…"}</p>
          <p className="text-[#9a9488]">{model.signatures[0].label}</p>
        </div>
      )}
    </>
  );
}

function PriceListBody({ model }: { model: DocModel }) {
  return (
    <>
      {model.priceListTitle && (
        <p className="mt-3 border-b-2 border-[#e8620c] pb-2 text-[14px] font-bold">{model.priceListTitle}</p>
      )}
      <SectionLabel>{model.number}</SectionLabel>
      <table className="w-full border-collapse text-[10px]">
        <thead>
          <tr className="bg-[#f7f5f0] text-[#6f6a5e]">
            <th className="px-1.5 py-1.5 text-left font-bold">Paket</th>
            <th className="w-16 px-1.5 py-1.5 text-right font-bold">Qty</th>
            <th className="w-32 px-1.5 py-1.5 text-right font-bold">Harga</th>
          </tr>
        </thead>
        <tbody>
          {(model.lines ?? []).map((line) => (
            <tr key={line.id} className="border-b border-[#e3e0d8]">
              <td className="px-1.5 py-1.5">
                <p className="font-medium">{line.name || "-"}</p>
                {line.description && <p className="text-[9px] text-[#6f6a5e]">{line.description}</p>}
              </td>
              <td className="px-1.5 py-1.5 text-right tabular">{line.qty || 1}</td>
              <td className="px-1.5 py-1.5 text-right font-semibold tabular">{formatCurrency(line.price)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {model.customer.name && (
        <p className="mt-3 text-[10px] text-[#6f6a5e]">
          Disiapkan untuk: <span className="font-medium text-[#2b2823]">{model.customer.name}</span>
        </p>
      )}
      {model.terms && (
        <>
          <SectionLabel>Ketentuan</SectionLabel>
          <p className="whitespace-pre-line text-[10px] text-[#6f6a5e]">{model.terms}</p>
        </>
      )}
    </>
  );
}