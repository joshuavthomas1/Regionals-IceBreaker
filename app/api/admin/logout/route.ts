import { endAdminSession, isAdmin } from "@/lib/auth";
import { jsonError } from "@/lib/http";

export const dynamic = "force-dynamic";

export async function POST() {
  if (!(await isAdmin())) return jsonError("The badge desk is locked.", 401);
  await endAdminSession();
  return Response.json({ ok: true });
}
