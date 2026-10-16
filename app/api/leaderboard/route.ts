import { getCurrentAttendee } from "@/lib/auth";
import { getBoard } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const attendee = await getCurrentAttendee();
  return Response.json(getBoard(attendee?.id ?? null), {
    headers: { "cache-control": "no-store" },
  });
}
