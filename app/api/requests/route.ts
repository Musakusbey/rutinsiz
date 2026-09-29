import { insertServiceRequest } from "@/lib/requests";
import { validateServiceRequest } from "@/lib/validation";

const MAX_BODY_BYTES = 10 * 1024;
// Hidden form field that real users never see; bots tend to fill every input.
const HONEYPOT_FIELD = "website";

function json(status: number, body: unknown): Response {
  return Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request): Promise<Response> {
  // Requiring JSON also means a cross-site <form> cannot post here without a CORS preflight.
  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().startsWith("application/json")) {
    return json(415, { error: "İstek application/json biçiminde gönderilmeli." });
  }

  const tooLarge = { error: "İstek gövdesi çok büyük." };
  if (Number(request.headers.get("content-length")) > MAX_BODY_BYTES) {
    return json(413, tooLarge);
  }

  let raw: string;
  try {
    raw = await request.text();
  } catch {
    return json(400, { error: "İstek gövdesi okunamadı." });
  }
  // Content-Length can be missing (chunked) or wrong, so measure what actually arrived.
  if (Buffer.byteLength(raw, "utf8") > MAX_BODY_BYTES) {
    return json(413, tooLarge);
  }

  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return json(400, { error: "İstek gövdesi geçerli bir JSON değil." });
  }
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return json(400, { error: "İstek gövdesi bir JSON nesnesi olmalı." });
  }

  // No fake success for bots: a success response must always mean a stored record.
  const honeypot = (body as Record<string, unknown>)[HONEYPOT_FIELD];
  if (honeypot !== undefined && honeypot !== "") {
    console.warn("[api/requests] honeypot filled, request rejected");
    return json(400, { error: "İstek işlenemedi." });
  }

  const result = validateServiceRequest(body);
  if (!result.success) {
    return json(422, { error: "Lütfen işaretli alanları düzeltin.", errors: result.errors });
  }

  try {
    const created = await insertServiceRequest(result.data);
    return json(201, created);
  } catch (error) {
    // Log enough to debug, but never the submitted personal data, and never send internals to the client.
    console.error("[api/requests] insert failed", describeError(error));
    return json(500, {
      error: "Talebiniz şu anda kaydedilemedi. Lütfen biraz sonra tekrar deneyin.",
    });
  }
}

function describeError(error: unknown) {
  if (error instanceof Error) {
    return { name: error.name, message: error.message, code: (error as { code?: string }).code };
  }
  return { value: String(error) };
}
