// Indonesian number-to-words ("terbilang") for kwitansi/invoice documents.
// Handles values up to trillions, two-digit decimals for sen.

const SATUAN = ["", "satu", "dua", "tiga", "empat", "lima", "enam", "tujuh", "delapan", "sembilan", "sepuluh", "sebelas"];

function belasan(n: number): string {
  if (n < 12) return SATUAN[n];
  if (n < 20) return `${SATUAN[n - 10]} belas`;
  return "";
}

function ratusan(n: number): string {
  if (n < 20) return belasan(n);
  const r = Math.floor(n / 100);
  const sisa = n % 100;
  let out = "";
  if (r > 0) out += r === 1 ? "seratus" : `${SATUAN[r]} ratus`;
  if (sisa > 0) out += ` ${belasan(sisa) || ratusanBase(sisa)}`;
  return out.trim();
}

function ratusanBase(n: number): string {
  if (n < 20) return belasan(n);
  const puluh = Math.floor(n / 10);
  const satu = n % 10;
  let out = "";
  if (puluh > 1) out += `${SATUAN[puluh]} puluh`;
  if (satu > 0) out += ` ${SATUAN[satu]}`;
  return out.trim();
}

function kelompok(n: number): string {
  const p = Math.floor(n / 1000);
  const sisa = n % 1000;
  if (p === 0) return sisa === 0 ? "" : ratusan(sisa);
  let out = "";
  if (p === 1) out = "seribu";
  else if (p < 1000) out = `${ratusan(p)} ribu`;
  else {
    const j = Math.floor(p / 1000);
    const sisaJuta = p % 1000;
    out = `${kelompok(j)} juta`;
    if (sisaJuta > 0) out += ` ${ratusan(sisaJuta)} ribu`;
  }
  if (sisa > 0) out += ` ${ratusan(sisa)}`;
  return out.trim();
}

/** Convert an integer (Rupiah unit) into Indonesian words. */
export function terbilangInteger(value: number): string {
  if (!Number.isFinite(value)) return "";
  const n = Math.trunc(Math.abs(value));
  if (n === 0) return "nol";
  const miliar = Math.floor(n / 1_000_000_000);
  const juta = Math.floor((n % 1_000_000_000) / 1_000_000);
  const ribu = Math.floor((n % 1_000_000) / 1000);
  const sisa = n % 1000;
  let out = "";
  if (miliar > 0) out += `${kelompok(miliar)} miliar`;
  if (juta > 0) out += ` ${kelompok(juta)} juta`;
  if (ribu > 0) out += ` ${kelompokRibu(ribu)}`;
  if (sisa > 0) out += ` ${ratusan(sisa)}`;
  return out.trim();
}

function kelompokRibu(ribu: number): string {
  if (ribu === 1) return "seribu";
  return `${ratusan(ribu)} ribu`;
}

/** Full "terbilang rupiah" for a money value including sen. */
export function terbilangRupiah(value: number): string {
  if (!Number.isFinite(value)) return "";
  const neg = value < 0;
  const cents = Math.round(Math.abs(value) * 100);
  const utama = Math.floor(cents / 100);
  const sen = cents % 100;
  let out = terbilangInteger(utama);
  if (sen > 0) {
    out += ` koma ${terbilangInteger(sen)}`;
  }
  out += " rupiah";
  return (neg ? "minus " : "") + out;
}