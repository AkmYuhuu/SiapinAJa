import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    {
      error: {
        code: "MANUAL_PAYMENT_V1",
        message: "Pembayaran V1 menggunakan verifikasi manual dan kode aktivasi.",
      },
    },
    { status: 410 },
  );
}

export async function GET() {
  return NextResponse.json(
    { error: { code: "METHOD_NOT_ALLOWED", message: "Gunakan alur pembayaran manual V1." } },
    { status: 405 },
  );
}
