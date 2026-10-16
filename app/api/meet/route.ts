import { getCurrentAttendee } from "@/lib/auth";
import { recordMeeting } from "@/lib/db";
import { asString, jsonError, readJson } from "@/lib/http";
import { extractCode } from "@/lib/codes";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const attendee = await getCurrentAttendee();
  if (!attendee) {
    return jsonError("Check in with your badge first.", 401, { needCheckIn: true });
  }

  const body = await readJson(request);
  const code = extractCode(asString(body?.code));
  if (!code) return jsonError("That badge code didn't read. Try the scan again.", 400);

  return Response.json(recordMeeting(attendee.id, code));
}
