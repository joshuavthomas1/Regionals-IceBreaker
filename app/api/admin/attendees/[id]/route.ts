import { isAdmin } from "@/lib/auth";
import { requireChurch } from "@/lib/churches";
import { deleteAttendee, updateAttendee } from "@/lib/db";
import { asString, jsonError, readJson } from "@/lib/http";

export const dynamic = "force-dynamic";

type Context = { params: Promise<{ id: string }> };

function parseId(raw: string) {
  const id = Number(raw);
  if (!Number.isInteger(id) || id <= 0) return null;
  return id;
}

export async function PATCH(request: Request, { params }: Context) {
  if (!(await isAdmin())) return jsonError("The badge desk is locked.", 401);
  const id = parseId((await params).id);
  if (!id) return jsonError("That attendee is missing.", 404);

  const body = await readJson(request);
  try {
    const attendee = updateAttendee(id, {
      name: asString(body?.name),
      company: asString(body?.company),
      title: asString(body?.title),
      church: requireChurch(asString(body?.church)),
      funFact: asString(body?.funFact),
    });
    if (!attendee) return jsonError("That attendee is missing.", 404);
    return Response.json({ attendee });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Couldn't update that attendee.";
    return jsonError(message, 400);
  }
}

export async function DELETE(_request: Request, { params }: Context) {
  if (!(await isAdmin())) return jsonError("The badge desk is locked.", 401);
  const id = parseId((await params).id);
  if (!id) return jsonError("That attendee is missing.", 404);
  if (!deleteAttendee(id)) return jsonError("That attendee is already gone.", 404);
  return Response.json({ ok: true });
}
