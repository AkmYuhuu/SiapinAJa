import { promises as dns } from "node:dns";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type EmailValidation =
  | { ok: true; email: string; domain: string }
  | { ok: false; message: string };

/**
 * Validates syntax and verifies that the email domain has working DNS.
 * This does not prove the mailbox exists; Supabase email confirmation is the
 * authoritative ownership check.
 */
export async function validateEmailAddress(raw: string): Promise<EmailValidation> {
  const email = raw.trim();
  if (!email || !EMAIL_RE.test(email)) {
    return { ok: false, message: "Format email tidak valid." };
  }
  if (email.length > 254) {
    return { ok: false, message: "Email terlalu panjang." };
  }

  const at = email.lastIndexOf("@");
  const domain = email.slice(at + 1).toLowerCase();
  if (!domain || domain.length > 253) {
    return { ok: false, message: "Domain email tidak valid." };
  }

  try {
    const mx = await dns.resolveMx(domain);
    if (mx.length > 0) return { ok: true, email, domain };
  } catch {
    // Some valid mail domains rely on A/AAAA fallback instead of MX.
  }

  try {
    await Promise.any([dns.resolve4(domain), dns.resolve6(domain)]);
    return { ok: true, email, domain };
  } catch {
    return { ok: false, message: "Domain email tidak dapat ditemukan. Periksa kembali alamat emailmu." };
  }
}
