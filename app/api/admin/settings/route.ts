import { isAdmin } from "@/lib/auth";
import { normalizeBaseUrl, setSetting } from "@/lib/db";
import { asString, jsonError, readJson } from "@/lib/http";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!(await isAdmin())) return jsonError("The badge desk is locked.", 401);

  const body = await readJson(request);
  const normalized = normalizeBaseUrl(asString(body?.baseUrl));
  if (normalized == null) {
    return jsonError("Use a full link, like https://icebreaker.example.com.", 400);
  }

  await setSetting("baseUrl", normalized);
  return Response.json({ baseUrl: normalized });
}
