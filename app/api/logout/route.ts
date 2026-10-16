import { endAttendeeSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST() {
  await endAttendeeSession();
  return Response.json({ ok: true });
}
