import { forwardRef, useId, useState } from "react";
import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";

const baseField =
  "w-full h-9 rounded-md border border-border bg-surface px-3 text-sm text-ink placeholder:text-ink-faint focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/25 transition-shadow disabled:opacity-50 disabled:bg-surface-muted";

export interface FieldProps {
  label?: string;
  error?: string;
  hint?: string;
  required?: boolean;
  className?: string;
  children: ReactNode;
}

export function Field({ label, error, hint, required, className = "", children }: FieldProps) {
  const id = useId();
  return (
    <div className={`flex flex-col gap-1.5 min-w-0 ${className}`}>
      {label && (
        <label htmlFor={id} className="text-xs font-medium text-ink">
          {label}
          {required && <span className="text-danger"> *</span>}
        </label>
      )}
      {children}
      {error ? (
        <p className="text-xs text-danger">{error}</p>
      ) : hint ? (
        <p className="text-xs text-ink-faint">{hint}</p>
      ) : null}
    </div>
  );
}

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className = "", ...rest }, ref) {
    return <input ref={ref} className={`${baseField} ${className}`} {...rest} />;
  },
);

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  function Textarea({ className = "", ...rest }, ref) {
    return (
      <textarea
        ref={ref}
        className={`${baseField} h-auto min-h-20 py-2 leading-relaxed resize-y ${className}`}
        {...rest}
      />
    );
  },
);

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(
  function Select({ className = "", children, ...rest }, ref) {
    return (
      <select ref={ref} className={`${baseField} appearance-none bg-no-repeat cursor-pointer pr-8 ${className}`} {...rest}>
        {children}
      </select>
    );
  },
);

const formatForDisplay = (v: number) =>
  new Intl.NumberFormat("id-ID").format(Number.isFinite(v) ? v : 0);

/** Money input: stores a number, shows Indonesian thousands separator. */
export function MoneyInput({
  value,
  onChange,
  className = "",
  placeholder = "0",
  ...rest
}: Omit<InputHTMLAttributes<HTMLInputElement>, "value" | "onChange" | "type"> & {
  value: number;
  onChange: (v: number) => void;
  allowNegative?: boolean;
}) {
  const [editing, setEditing] = useState<string | null>(null);
  const display = editing ?? formatForDisplay(value);

  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-ink-faint">
        Rp
      </span>
      <input
        type="text"
        inputMode="numeric"
        className={`${baseField} pl-9 text-right tabular ${className}`}
        value={display === "0" && !editing ? "" : display}
        placeholder={placeholder}
        onFocus={(e) => {
          setEditing(String(value));
          e.currentTarget.select();
        }}
        onChange={(e) => {
          const raw = e.target.value.replace(/[^\d,.-]/g, "");
          setEditing(raw);
          const n = Number(raw.replace(/\./g, "").replace(",", "."));
          if (raw && Number.isFinite(n)) onChange(n);
          else if (!raw) onChange(0);
        }}
        onBlur={() => setEditing(null)}
        aria-label={rest["aria-label"]}
        {...rest}
      />
    </div>
  );
}

/** Extract the local Indonesian digits from a stored phone value. */
function phoneLocalDigits(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 15);
  if (digits.startsWith("62") && digits.length > 2) return digits.slice(2);
  if (digits.startsWith("0")) return digits.slice(1);
  return digits;
}

/** Phone input with a fixed +62 (Indonesia) prefix that cannot be removed. */
export function PhoneInput({
  value,
  onChange,
  className = "",
  ...rest
}: Omit<InputHTMLAttributes<HTMLInputElement>, "value" | "onChange"> & {
  value: string;
  onChange: (v: string) => void;
}) {
  const [editing, setEditing] = useState<string | null>(null);
  const local = editing ?? phoneLocalDigits(value);

  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm font-medium text-ink-faint">
        +62
      </span>
      <input
        type="tel"
        inputMode="tel"
        className={`${baseField} pl-[52px] tabular ${className}`}
        value={local}
        placeholder="812-3456-7890"
        onFocus={(e) => {
          setEditing(phoneLocalDigits(value));
          e.currentTarget.select();
        }}
        onChange={(e) => {
          const raw = e.target.value.replace(/[^\d]/g, "").slice(0, 15);
          setEditing(raw);
          const digits = phoneLocalDigits(raw);
          onChange(digits ? `+62${digits}` : "");
        }}
        onBlur={() => setEditing(null)}
        {...rest}
      />
    </div>
  );
}

/** Percent input: number 0..limit. */
export function PercentInput({
  value,
  onChange,
  max = 100,
  className = "",
}: {
  value: number;
  onChange: (v: number) => void;
  max?: number;
  className?: string;
}) {
  return (
    <div className="relative">
      <input
        type="number"
        inputMode="decimal"
        min={0}
        max={max}
        className={`${baseField} pr-7 text-right tabular ${className}`}
        value={Number.isFinite(value) ? value : ""}
        onChange={(e) => {
          const n = Number(e.target.value);
          if (Number.isFinite(n)) onChange(Math.min(max, Math.max(0, n)));
        }}
      />
      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-ink-faint">
        %
      </span>
    </div>
  );
}