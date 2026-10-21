import { isAdmin } from "@/lib/auth";
import { clearMeetings, resetEvent } from "@/lib/db";
import { asString, jsonError, readJson } from "@/lib/http";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!(await isAdmin())) return jsonError("The badge desk is locked.", 401);

  const body = await readJson(request);
  const scope = asString(body?.scope);
  if (scope === "meetings") {
    await clearMeetings();
    return Response.json({ ok: true });
  }
  if (scope === "all") {
    await resetEvent();
    return Response.json({ ok: true });
  }
  return jsonError("Choose what to clear.", 400);
}
