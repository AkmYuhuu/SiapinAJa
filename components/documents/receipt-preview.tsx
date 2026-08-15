"use client";

// Monochrome thermal "nota" (receipt) print layout, shared by all document
// tools (spec §12). Scaled to 80mm or 58mm receipt printers; colors are
// intentionally ignored - thermal printing is black & white.

import type { CSSProperties } from "react";
import { DocModel, docTotals } from "@/lib/documents/model";
import { docKindTitle } from "@/lib/documents/pdf";
import { formatCurrency } from "@/lib/format";
import { terbilangRupiah } from "@/lib/terbilang";

export function ReceiptDoc({ model, width }: { model: DocModel; width: number }) {
  const totals = docTotals(model);
  const kind = model.$kind;
  const contact = [model.business.phone, model.business.email].filter(Boolean).join(" • ");

  return (
    <div className="receipt" style={{ "--rs": width / 80, width: `${width}mm` } as CSSProperties}>
      <div className="r-center">
        <p className="r-name">{model.business.name || "Bisnis Saya"}</p>
        {model.business.address && <p className="r-small">{model.business.address}</p>}
        {contact && <p className="r-small">{contact}</p>}
      </div>

      <p className="r-title">{docKindTitle(kind)}</p>
      <p className="r-small r-center">{model.number}</p>
      <p className="r-small r-center">
        {model.date}
        {model.dueDate
          ? `  •  ${kind === "quotation" ? "Berlaku s/d" : "Jatuh tempo"} ${model.dueDate}`
          : ""}
      </p>
      <div className="r-dash" />

      {kind === "kwitansi" ? (
        <KwitansiReceipt model={model} totals={totals} />
      ) : (
        <InvoiceReceipt model={model} totals={totals} />
      )}

      <div className="r-dash" />
      {model.footer && <p className="r-small r-center">{model.footer}</p>}
      <p className="r-small r-center">Dibuat dengan SiapinAja</p>
    </div>
  );
}

function InvoiceReceipt({ model, totals }: { model: DocModel; totals: ReturnType<typeof docTotals> }) {
  return (
    <>
      {model.customer.name && (
        <div className="r-row">
          <span>Pelanggan</span>
          <span>{model.customer.company ? `${model.customer.company} (${model.customer.name})` : model.customer.name}</span>
        </div>
      )}
      <div className="r-dash" />
      {(model.lines ?? []).map((line) => (
        <div key={line.id} className="r-item">
          <p>
            {line.name || "-"}
            {line.description ? <span className="r-small"> — {line.description}</span> : null}
          </p>
          <div className="r-row">
            <span className="r-small">
              {formatCurrency(line.price)}
              {line.qty > 1 ? ` × ${line.qty}` : ""}
            </span>
            <span>{formatCurrency(line.qty * line.price)}</span>
          </div>
        </div>
      ))}
      {!model.lines?.length && <p className="r-small r-center">Tidak ada item.</p>}
      <div className="r-dash" />
      <div className="r-row">
        <span>Subtotal</span>
        <span>{formatCurrency(totals.subtotal)}</span>
      </div>
      {totals.discount > 0 && (
        <div className="r-row">
          <span>Diskon</span>
          <span>-{formatCurrency(totals.discount)}</span>
        </div>
      )}
      {totals.tax > 0 && (
        <div className="r-row">
          <span>
            {model.taxLabel || "Pajak"} ({model.taxPct}%)
          </span>
          <span>{formatCurrency(totals.tax)}</span>
        </div>
      )}
      {totals.shipping > 0 && (
        <div className="r-row">
          <span>Ongkir</span>
          <span>{formatCurrency(totals.shipping)}</span>
        </div>
      )}
      <div className="r-total">
        <span>Total</span>
        <span>{formatCurrency(totals.total)}</span>
      </div>
      {model.paymentMethod && (
        <div className="r-row r-small">
          <span>Bayar</span>
          <span>{model.paymentMethod}</span>
        </div>
      )}
      {model.terms && <p className="r-small r-center">{model.terms}</p>}
      {model.note && <p className="r-small r-center">— {model.note} —</p>}
    </>
  );
}

function KwitansiReceipt({ model, totals }: { model: DocModel; totals: ReturnType<typeof docTotals> }) {
  const rows: Array<[string, string]> = [
    ["Diterima dari", model.receivedFrom || model.customer.name || "-"],
    ["Untuk", model.forPayment || "-"],
    ["Metode", model.paymentMethod || "-"],
  ];
  return (
    <>
      {rows.map(([k, v]) => (
        <div key={k} className="r-row">
          <span>{k}</span>
          <span>{v}</span>
        </div>
      ))}
      <div className="r-dash" />
      <div className="r-total">
        <span>Jumlah pembayaran</span>
        <span>{formatCurrency(totals.total)}</span>
      </div>
      <p className="r-small r-center">{terbilangRupiah(totals.total)}</p>
      {model.note && <p className="r-small r-center">— {model.note} —</p>}
    </>
  );
}