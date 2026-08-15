import { NextResponse } from "next/server";

/**
 * TEMPORARY SOCIABUZZ WEBHOOK DIAGNOSTIC
 *
 * This endpoint intentionally performs NO payment, subscription, or database
 * mutations. It discovers how SociaBuzz sends authentication and payload data.
 */
export async function POST(req: Request) {
  const headers = req.headers;
  const rawBody = await req.text();

  let body: unknown = null;
  try {
    body = rawBody ? JSON.parse(rawBody) : null;
  } catch {
    body = null;
  }

  const bodyKeys =
    body && typeof body === "object" && !Array.isArray(body)
      ? Object.keys(body as Record<string, unknown>)
      : [];

  const url = new URL(req.url);
  const queryKeys = Array.from(url.searchParams.keys());

  return NextResponse.json({
    ok: true,
    diagnostic: true,
    message:
      "SociaBuzz webhook diterima. Tidak ada data pembayaran yang diproses.",
    method: req.method,
    contentType: headers.get("content-type"),
    headerNames: Array.from(headers.keys()).sort(),
    queryKeys,
    bodyKeys,
    bodyIsJson: body !== null,
    bodyLength: rawBody.length,
  });
}

export async function GET() {
  return NextResponse.json(
    { ok: false, error: "Method Not Allowed" },
    { status: 405 },
  );
}
