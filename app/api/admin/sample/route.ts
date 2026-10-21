import { isAdmin } from "@/lib/auth";
import { loadSampleAttendees } from "@/lib/db";
import { jsonError } from "@/lib/http";

export const dynamic = "force-dynamic";

export async function POST() {
  if (!(await isAdmin())) return jsonError("The badge desk is locked.", 401);
  const added = await loadSampleAttendees();
  return Response.json({ added });
}
