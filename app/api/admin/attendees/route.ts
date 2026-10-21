import { requireChurch } from "@/lib/churches";
import { isAdmin } from "@/lib/auth";
import { addAttendee } from "@/lib/db";
import { asString, jsonError, readJson } from "@/lib/http";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!(await isAdmin())) return jsonError("The badge desk is locked.", 401);

  const body = await readJson(request);
  const name = asString(body?.name);
  if (!name.trim()) return jsonError("A name is required.", 400);

  try {
    const attendee = await addAttendee({
      name,
      company: asString(body?.company),
      title: asString(body?.title),
      church: requireChurch(asString(body?.church)),
      funFact: asString(body?.funFact),
    });
    return Response.json({ attendee });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Couldn't add that attendee.";
    return jsonError(message, 400);
  }
}
