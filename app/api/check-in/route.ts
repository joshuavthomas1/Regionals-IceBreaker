import { startAttendeeSession } from "@/lib/auth";
import { findAttendeeByCode, recordMeeting } from "@/lib/db";
import { asString, jsonError, readJson } from "@/lib/http";
import { clientKey, hitLimit } from "@/lib/rate-limit";
import { extractCode } from "@/lib/codes";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (hitLimit(`checkin:${clientKey(request)}`, 30, 60_000)) {
    return jsonError("Too many tries. Wait a minute and try the code again.", 429);
  }

  const body = await readJson(request);
  const code = extractCode(asString(body?.code));
  if (!code) return jsonError("Enter the code printed under your QR.", 400);

  const attendee = findAttendeeByCode(code);
  if (!attendee) return jsonError("That code is not on the list.", 404);

  await startAttendeeSession(attendee.id, request);

  const meetCode = asString(body?.meetCode).trim();
  const meeting = meetCode ? recordMeeting(attendee.id, meetCode) : null;

  return Response.json({
    attendee: {
      id: attendee.id,
      name: attendee.name,
      company: attendee.company,
      title: attendee.title,
    },
    meeting,
  });
}
