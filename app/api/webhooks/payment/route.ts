import { NextResponse } from "next/server";

/**
 * TEMPORARY SOCIABUZZ WEBHOOK DIAGNOSTIC
 *
 * This endpoint intentionally performs NO payment, subscription, or database
 * mutations. It is only used to discover how SociaBuzz sends its webhook
 * authentication and payload during "Test Notification".
 *
 * Remove this diagnostic handler and restore the production webhook handler
 * after the SociaBuzz request format has been confirmed.
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

  const headerPresence = {
    authorization: headers.has("authorization"),
    xWebhookSignature: headers.has("x-webhook-signature"),
    xWebhookToken: headers.has("x-webhook-token"),
    webhookToken: headers.has("webhook-token"),
    xSociaBuzzToken: headers.has("x-sociabuzz-token"),
    contentType: headers.get("content-type"),
  };

  const bodyKeys =
    body && typeof body === "object" && !Array.isArray(body)
      ? Object.keys(body as Record<string, unknown>)
      : [];

  return NextResponse.json({
    ok: true,
    diagnostic: true,
    message: "SociaBuzz webhook diterima. Tidak ada data pembayaran yang diproses.",
    method: req.method,
    headerPresence,
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
