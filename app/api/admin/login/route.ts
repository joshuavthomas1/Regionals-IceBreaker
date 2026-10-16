import { adminPassword, passwordsMatch, startAdminSession } from "@/lib/auth";
import { asString, jsonError, readJson } from "@/lib/http";
import { clientKey, hitLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (hitLimit(`admin:${clientKey(request)}`, 10, 60_000)) {
    return jsonError("Too many password tries. Wait a minute.", 429);
  }

  const body = await readJson(request);
  const password = asString(body?.password);
  if (!password || !passwordsMatch(password, adminPassword())) {
    return jsonError("That password doesn't open the badge desk.", 401);
  }

  await startAdminSession(request);
  return Response.json({ ok: true });
}
