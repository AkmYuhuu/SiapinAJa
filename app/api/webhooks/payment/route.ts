import { NextResponse } from "next/server";

/**
 * TEMPORARY SOCIABUZZ WEBHOOK DIAGNOSTIC
 *
 * This endpoint intentionally performs NO payment, subscription, or database
 * mutations. It discovers how SociaBuzz sends authentication and payload data.
 *
 * IMPORTANT: Do not return raw request values here. The diagnostic response
 * exposes only field/header names, primitive types, and a small allowlist of
 * non-sensitive transaction metadata.
 */
function describeValue(value: unknown): string {
  if (value === null) return "null";
  if (Array.isArray(value)) return "array";
  return typeof value;
}

function collectObjectShape(value: unknown, depth = 0): unknown {
  if (depth > 2 || value === null || typeof value !== "object") {
    return describeValue(value);
  }

  if (Array.isArray(value)) {
    return {
      type: "array",
      length: value.length,
      itemShape: value.length > 0 ? collectObjectShape(value[0], depth + 1) : null,
    };
  }

  const record = value as Record<string, unknown>;
  return Object.fromEntries(
    Object.entries(record).map(([key, child]) => [
      key,
      collectObjectShape(child, depth + 1),
    ]),
  );
}

export async function POST(req: Request) {
  const headers = req.headers;
  const rawBody = await req.text();

  let body: unknown = null;
  try {
    body = rawBody ? JSON.parse(rawBody) : null;
  } catch {
    body = null;
  }

  const bodyRecord =
    body && typeof body === "object" && !Array.isArray(body)
      ? (body as Record<string, unknown>)
      : null;

  const bodyKeys = bodyRecord ? Object.keys(bodyRecord).sort() : [];

  const sensitiveKeyPattern =
    /(token|secret|signature|sign|authorization|auth|password|api.?key|webhook)/i;

  const possibleAuthFields = bodyRecord
    ? bodyKeys.filter((key) => sensitiveKeyPattern.test(key))
    : [];

  const bodyTypes = bodyRecord
    ? Object.fromEntries(
        bodyKeys.map((key) => [key, describeValue(bodyRecord[key])]),
      )
    : {};

  const safeMetadataKeys = [
    "id",
    "item_id",
    "title",
    "amount",
    "amount_settled",
    "currency",
    "currency_settled",
    "price",
    "type_product",
    "created_at",
  ];

  const safeMetadata = bodyRecord
    ? Object.fromEntries(
        safeMetadataKeys
          .filter((key) => key in bodyRecord)
          .map((key) => [key, bodyRecord[key]]),
      )
    : {};

  const url = new URL(req.url);
  const queryKeys = Array.from(url.searchParams.keys()).sort();

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
    bodyTypes,
    possibleAuthFields,
    bodyShape: collectObjectShape(body),
    safeMetadata,
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
